import test from 'node:test';
import assert from 'node:assert/strict';
import {initialState, advance, preserveMatch, projectSnapshot, coverageOf, createHandler, readSource} from '../artifacts/cloud.mjs';
import {onRequest} from '../functions/api/[[path]].js';
import {openDatabase} from '../server/database.js';
import {putMeta, saveMatch} from '../server/collection-store.js';
import {readLiveSeason} from '../server/live-season.js';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const origin = 'https://leonzelotois.fr';
const player = {name: 'Joueur A.', key: 'joueur a.', status: 'starter', shirt: 1, entry: null, exit: null};
const match = (division, date) => ({url: `${origin}/matchs/${division.toLowerCase()}/`, division, round: 1, date,
  score: '2–1', status: 'Terminé', sheets: ['Équipe A', 'Équipe B'].map(name => ({name, clubURL: `${origin}/club/test/`, state: 'published', players: [player]}))});

function memoryStore() {
  let state = initialState(), locked = false, snapshot = {fixtures: [], matches: []};
  const pages = new Map();
  return {
    state: async () => structuredClone(state), snapshot: async () => structuredClone(snapshot), member: async id => id === 'owner',
    page: async url => pages.get(url) ?? null,
    async claim(_season, start, force) {
      if (locked || start && state.running || !start && !state.running) return null;
      if (start) state = {...state, running: true, stage: 'standings', force, queue: [], done: 0, total: 0, errors: []};
      locked = true;
      return {owner: 'lease', state: structuredClone(state)};
    },
    async commit(_season, owner, change) {
      assert.equal(owner, 'lease'); assert.equal(locked, true);
      state = structuredClone(change.state); locked = false;
      for (const f of change.fixtures ?? []) snapshot.fixtures = [...snapshot.fixtures.filter(old => old.url !== f.url), f];
      if (change.match) snapshot.matches = [...snapshot.matches.filter(m => m.url !== change.match.url), change.match];
      if (change.page) pages.set(change.page.url, change.page.data);
    },
    seed(next, data = snapshot) { state = next; snapshot = data; },
  };
}

test('la projection Supabase reproduit SQLite, y compris les archives dégradées', () => {
  const state = initialState();
  state.standings = ['a', 'b'].map((pool, i) => ({pool, rank: 1, name: `Équipe ${i ? 'B' : 'A'}`, clubURL: `${origin}/club/test/`}));
  const matches = [match('D4', '2026-09-10'), match('D1', '2026-09-02')];
  const snapshot = {matches: matches.map(m => preserveMatch(m)), fixtures: matches.map(m => ({...m, home: m.sheets[0].name, away: m.sheets[1].name}))};
  const db = openDatabase(':memory:');
  try {
    putMeta(db, 'standings:2026', state.standings);
    for (const m of matches) saveMatch(db, 2026, m);
    assert.deepEqual(projectSnapshot(2026, snapshot, state), readLiveSeason(db, 2026));
    const degraded = {...matches[0], sheets: matches[0].sheets.map(s => ({...s, state: 'missing', players: []}))};
    snapshot.matches[0] = preserveMatch(degraded, snapshot.matches[0]); saveMatch(db, 2026, degraded);
    assert.equal(snapshot.matches[0].sheets[0].players.length, 1);
    assert.deepEqual(projectSnapshot(2026, snapshot, state), readLiveSeason(db, 2026));
    snapshot.matches[1].sheets.forEach(s => { s.clubURL = `${origin}/club/autre/`; });
    assert.equal(projectSnapshot(2026, snapshot, state).matches['a:0:0'].count, 0);
  } finally { db.close(); }
});

test('une opération courte persiste sa progression, reprend et refuse deux lancements', async () => {
  const store = memoryStore();
  const standings = `<section id="classement">${['A', 'B'].map(pool => `<div><h2>Classement D4 · POULE ${pool}</h2><table><tbody><tr><td class="rk">1</td><td><a class="crest-lien" href="${origin}/club/test/"></a><span class="team-name">Équipe ${pool}</span></td></tr></tbody></table></div>`).join('')}</section>`;
  const fetcher = async () => new Response(standings, {headers: {'Content-Type': 'text/html'}});
  const started = await advance(store, 2026, true, false, fetcher);
  assert.equal(started.state.stage, 'directory'); assert.equal(started.state.requests, 1);
  assert.equal((await advance(store, 2026, true, true, fetcher)).busy, true);
  const resumed = await advance(store, 2026, false, false, async () => new Response('', {status: 429}));
  assert.equal(resumed.state.running, false); assert.equal(resumed.state.errors.length, 1);
  assert.equal(resumed.state.standings.length, 2);
  const restarted = await advance(store, 2026, true, false, async () => { throw new Error('Le cache devrait être utilisé'); });
  assert.equal(restarted.state.stage, 'directory'); assert.equal(restarted.state.cached, 1);
});

test('le cache conditionnel et les limites réseau protègent la collecte en ligne', async () => {
  const store = memoryStore(); const state = initialState();
  const cached = {body: 'archive', etag: 'version1', modified: null, fetchedAt: '2000-01-01'};
  store.page = async () => cached;
  const result = await readSource(store, state, `${origin}/clubs/`, 0, async (_url, options) => {
    assert.equal(options.headers.get('If-None-Match'), 'version1'); return new Response(null, {status: 304});
  });
  assert.equal(result.body, 'archive'); assert.equal(state.cached, 1);
  await assert.rejects(readSource(store, state, 'https://example.com/', 0), /hors périmètre/);
  state.nextRequestAt = 0;
  await assert.rejects(readSource(store, state, `${origin}/clubs/`, 0, async () => new Response('x'.repeat(3_000_001), {headers: {'Content-Type': 'text/html'}})), /volumineuse/);
});

test('le parcours par étapes termine les calendriers et les compositions avec un état persistant', async () => {
  const store = memoryStore();
  const state = initialState();
  state.running = true; state.stage = 'clubs'; state.queue = [`${origin}/club/test/`]; state.total = 1;
  state.standings = ['a', 'b'].map((pool, i) => ({pool, rank: 1, name: `Équipe ${i ? 'B' : 'A'}`, clubURL: `${origin}/club/test/`}));
  store.seed(state);
  const club = `<section><span class="club-sec-div">D4</span><a class="mc" href="${origin}/matchs/d4/"><div class="div">D4<span class="div-round">1re journée</span></div><span class="team-name">Équipe A</span><span class="team-name">Équipe B</span><span class="ft">Terminé</span></a></section>`;
  const teams = ['Équipe A', 'Équipe B'];
  const html = `<header class="match-head"><span class="htag">D4</span><div class="single-meta">Terminé · 10/09/2026 à 15h00 · 1re journée</div><div class="mt-score">2–1</div>${teams.map(name => `<div class="mt-team"><a class="crest-lien" href="${origin}/club/test/"></a><span class="mt-name">${name}</span></div>`).join('')}</header>${teams.map(name => `<div class="compo-col"><h3 class="compo-team">${name}</h3><ol class="compo-list">${Array.from({length: 11}, (_, i) => `<li><span class="num">${i + 1}</span><span class="compo-nom">Joueur ${i}</span></li>`).join('')}</ol></div>`).join('')}`;
  store.page = async url => ({body: url.includes('/club/') ? club : html, fetchedAt: new Date().toISOString(), etag: null, modified: null});
  const unexpectedNetwork = async () => { throw new Error('Aucun réseau attendu'); };
  const calendar = await advance(store, 2026, false, false, unexpectedNetwork);
  assert.equal(calendar.state.stage, 'matches'); assert.equal(calendar.state.total, 1);
  const completed = await advance(store, 2026, false, false, unexpectedNetwork);
  assert.equal(completed.state.running, false); assert.equal(completed.state.errors.length, 0);
  assert.equal(completed.state.coverage.players, 22); assert.equal(completed.state.coverage.published, 2);
  assert.ok(completed.state.lastSuccess);
  assert.equal(projectSnapshot(2026, await store.snapshot(), await store.state()).matches['a:0:0'].count, 0);
});

test('l’API vérifie la session et les membres avant toute lecture ou écriture', async () => {
  const store = memoryStore();
  const handler = createHandler(store, async token => token === 'Bearer valid' ? 'owner' : token === 'Bearer stranger' ? 'other' : null);
  const request = (path, token, options = {}) => new Request(`https://example.supabase.co/functions/v1/observatoire${path}`, {headers: token ? {Authorization: `Bearer ${token}`} : {}, ...options});
  assert.equal((await handler(request('/season'))).status, 401);
  assert.equal((await handler(request('/season', 'invalid'))).status, 401);
  assert.equal((await handler(request('/season', 'stranger'))).status, 403);
  assert.equal((await handler(request('/season', 'valid'))).status, 200);
  assert.equal((await handler(request('/sheet?url=https://example.com/', 'valid'))).status, 400);
  assert.equal((await handler(request('/sync', 'valid', {method: 'POST', headers: {Authorization: 'Bearer valid'}}))).status, 400);
  const status = await (await handler(request('/sync', 'valid'))).json();
  assert.equal('queue' in status, false); assert.equal('standings' in status, false);
});

test('le proxy Pages borne les routes, les origines et les corps sans exposer de clé serveur', async t => {
  const env = {SUPABASE_URL: 'https://sylibzlrejlwfarmbhyw.supabase.co', SUPABASE_PUBLISHABLE_KEY: 'public-test'};
  const request = (path, options) => new Request(`https://app.pages.dev/api${path}`, options);
  assert.equal((await onRequest({request: request('/unknown'), env})).status, 404);
  assert.equal((await onRequest({request: request('/sync', {method: 'POST', headers: {Origin: 'https://evil.test'}}), env})).status, 403);
  assert.equal((await onRequest({request: request('/auth/token?grant_type=client_credentials', {method: 'POST', headers: {Origin: 'https://app.pages.dev'}}), env})).status, 400);
  assert.equal((await onRequest({request: request('/auth/token?grant_type=password', {method: 'POST', headers: {Origin: 'https://app.pages.dev'}, body: 'x'.repeat(4097)}), env})).status, 413);
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    assert.equal(url, `${env.SUPABASE_URL}/functions/v1/observatoire/season`);
    assert.equal(options.headers.get('Authorization'), 'Bearer user-token');
    return Response.json({ok: true});
  });
  const result = await onRequest({request: request('/season', {headers: {Authorization: 'Bearer user-token'}}), env});
  assert.equal(result.status, 200); assert.equal(result.headers.get('Cache-Control'), 'no-store');
});

test('la fonction générée démarre avec les API Web, sans modules Node.js', async () => {
  let handler;
  const code = await readFile(new URL('../supabase/functions/observatoire/index.ts', import.meta.url), 'utf8');
  runInNewContext(code, {atob, URL, Response, Request, Headers, AbortSignal, TextDecoder, setTimeout,
    fetch: async () => { throw new Error('Aucun appel attendu sans authentification'); },
    Deno: {env: {get: name => name === 'SUPABASE_URL' ? 'https://example.supabase.co' : 'test-secret'},
      serve: callback => { handler = callback; }}}, {timeout: 5000});
  assert.equal((await handler(new Request('https://example.supabase.co/functions/v1/observatoire/season'))).status, 401);
});
