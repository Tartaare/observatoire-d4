import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtempSync, unlinkSync, rmdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {load} from 'cheerio/slim';
import {parseClub, parseMatch, sourceURL, ORIGIN} from '../server/source.js';
import {openDatabase} from '../server/database.js';
import {saveMatch, readArchive, putMeta} from '../server/collection-store.js';
import {createReader} from '../server/source-reader.js';
import {createSynchronizer} from '../server/synchronize.js';
import {readLiveSeason} from '../server/live-season.js';
import {createApp} from '../server/index.js';
import {validateSeason} from '../src/season.js';
import {liveDetail} from '../src/detail.js';

const d4URL = `${ORIGIN}/matchs/d4-test/`, upperURL = `${ORIGIN}/matchs/d1-test/`;
const card = (url, division, home = 'Équipe A', away = 'Équipe B') => `<a class="mc" href="${url}"><div class="div">${division}<span class="div-round">1re journée</span></div><span class="team-name">${home}</span><span class="team-name">${away}</span><div class="ft">Terminé</div></a>`;
const club = `<section><h2><span class="club-sec-div">D4</span></h2>${card(d4URL, 'D4')}</section><section><h2><span class="club-sec-div">D1</span></h2>${card(upperURL, 'D1', 'Équipe supérieure', 'Autre équipe')}</section>`;
const standings = `<section id="classement">${['A', 'B'].map(pool => `<div><h2>Classement D4 · POULE ${pool}</h2><table><tbody><tr><td class="rk">1</td><td><a class="crest-lien" href="${ORIGIN}/club/test/"></a><span class="team-name">Équipe ${pool}</span></td></tr></tbody></table></div>`).join('')}</section>`;
const directory = `<li class="club-card" data-div="d1 d4"><a class="club-card-lien" href="${ORIGIN}/club/test/">Club</a></li>`;
function sheet(name, players = true) {
  return `<div class="compo-col"><h3 class="compo-team">${name}</h3>${players ? `<ol class="compo-list">${Array.from({length: 11}, (_, index) => `<li><span class="num">${index + 1}</span><span class="compo-nom">${index === 0 ? 'JOUEUR A.' : 'Joueur ' + index}</span></li>`).join('')}</ol><ol class="compo-list compo-list--subs"><li><span class="compo-nom">Entrant B.</span><span class="compo-mvt--in">Entré à la 45+2</span></li><li><span class="compo-nom">Sans preuve C.</span></li></ol>` : ''}</div>`;
}
function matchHTML(division = 'D4', date = '10/09/2026', players = true) {
  const names = division === 'D4' ? ['Équipe A', 'Équipe B'] : ['Équipe supérieure', 'Autre équipe'];
  return `<header class="match-head"><span class="htag">${division}</span><div class="single-meta">Terminé · ${date} à 15h00 · 1re journée</div><div class="mt-score">2–1</div>${names.map(name => `<div class="mt-team"><a class="crest-lien" href="${ORIGIN}/club/test/"></a><span class="mt-name">${name}</span></div>`).join('')}</header>${names.map(name => sheet(name, players)).join('')}`;
}
const response = body => new Response(body, {headers: {'Content-Type': 'text/html', ETag: 'test-v1'}});
function sourceFetch(calls, fail = false) {
  return async url => {
    calls.push(String(url));
    if (fail) throw new Error('offline');
    if (String(url) === `${ORIGIN}/division/d4/`) return response(standings);
    if (String(url) === `${ORIGIN}/clubs/`) return response(directory);
    if (String(url) === `${ORIGIN}/club/test/`) return response(club);
    if (String(url) === d4URL) return response(matchHTML());
    if (String(url) === upperURL) return response(matchHTML('D1', '02/09/2026'));
    throw new Error(`Requête inattendue : ${url}`);
  };
}

test('le parseur conserve tous les joueurs et distingue une participation non attestée', () => {
  const result = parseMatch(matchHTML(), d4URL, 2026);
  assert.equal(result.sheets[0].state, 'published');
  assert.equal(result.sheets[0].players.length, 13);
  assert.equal(result.sheets[0].players[11].entry, '45+2');
  assert.equal(result.sheets[0].players[11].status, 'entered');
  assert.equal(result.sheets[0].players[12].status, 'unverified');
  assert.equal(parseMatch(matchHTML('D4', '10/09/2026', false), d4URL, 2026).sheets[0].state, 'missing');
  assert.equal(parseMatch(matchHTML().replace('<span class="compo-nom">JOUEUR A.</span>', ''), d4URL, 2026).sheets[0].state, 'partial');
});

test('seuls les championnats seniors masculins autorisés de la saison sont retenus', () => {
  const other = `<section><h2><span class="club-sec-div">Féminines D1</span></h2>${card(`${ORIGIN}/matchs/feminin/`, 'D1')}</section>${card(`${ORIGIN}/matchs/coupe/`, 'Coupe')}`;
  assert.deepEqual(parseClub(club + other, 2026).map(item => item.url), [d4URL, upperURL]);
  const singleTeam = `<div class="club-divs"><a>D4</a></div><section><h2>Matchs</h2>${card(d4URL, 'D4')}${card(`${ORIGIN}/matchs/coupe/`, 'Coupe')}</section>`;
  assert.deepEqual(parseClub(singleTeam, 2026).map(item => item.url), [d4URL]);
  assert.deepEqual(parseClub(`<div class="club-divs"><a>D3</a></div><section>${card(`${ORIGIN}/matchs/feminin/`, 'Féminines à 8')}</section>`, 2026), []);
  assert.throws(() => parseClub('<main>Nouvelle structure de page</main>', 2026));
  for (const level of ['U18', 'R2 F', 'Coupe', 'D5']) assert.throws(() => parseMatch(matchHTML(level), d4URL, 2026));
  assert.throws(() => parseMatch(matchHTML('D4', '10/09/2025'), d4URL, 2026));
  assert.throws(() => parseMatch(matchHTML('D4', '30/02/2026'), d4URL, 2026));
  assert.throws(() => parseMatch(matchHTML().replace('Terminé ·', 'À venir ·'), d4URL, 2026));
  for (const value of ['https://example.com/club/test/', `${ORIGIN}/wp-admin/`, `${ORIGIN}/club/test/?x=1`, `${ORIGIN}/division/d4/?journee=1&journee=2`]) assert.throws(() => sourceURL(value));
});

test('le cache évite les téléchargements frais et utilise les validateurs HTTP', async () => {
  const db = openDatabase(':memory:');
  const headers = [];
  const reader = createReader(db, {interval: 0, fetcher: async (_, options) => {
    headers.push(new Headers(options.headers).get('If-None-Match'));
    return headers.length === 1 ? response('archive') : new Response(null, {status: 304});
  }});
  try {
    assert.equal(await reader.read(d4URL, 0), 'archive');
    assert.equal(await reader.read(d4URL, 60000), 'archive');
    assert.equal(await reader.read(d4URL, 0), 'archive');
    assert.deepEqual(headers, [null, 'test-v1']);
    assert.equal(reader.stats.requests, 2);
  } finally { db.close(); }
});

test('une feuille dégradée ne remplace pas une archive complète et une erreur annule la transaction', () => {
  const db = openDatabase(':memory:');
  try {
    const original = parseMatch(matchHTML(), d4URL, 2026);
    saveMatch(db, 2026, original);
    saveMatch(db, 2026, parseMatch(matchHTML('D4', '10/09/2026', false), d4URL, 2026));
    assert.equal(readArchive(db, d4URL).sheets[0].players.length, 13);
    assert.equal(readArchive(db, d4URL).sheets[0].retained, true);
    const invalid = structuredClone(original);
    invalid.sheets[1].players[0].status = 'invalid';
    assert.throws(() => saveMatch(db, 2026, invalid));
    assert.equal(readArchive(db, d4URL).sheets[0].retained, true);
  } finally { db.close(); }
});

test('la synchronisation déduplique, reprend depuis le cache et reste lisible sans Internet', async () => {
  const directory = mkdtempSync(join(tmpdir(), 'observatoire-collection-'));
  const filename = join(directory, 'offline.sqlite');
  let db = openDatabase(filename);
  const calls = [];
  const sync = createSynchronizer(db, {seasonStart: 2026, fetcher: sourceFetch(calls), interval: 0});
  try {
    assert.equal(sync.start(), true);
    assert.equal(sync.start(), false);
    const concurrent = createSynchronizer(db, {seasonStart: 2026, fetcher: sourceFetch([]), interval: 0});
    assert.equal(concurrent.start(), false);
    assert.equal(concurrent.status().running, true);
    await sync.idle();
    assert.equal(sync.status().errors.length, 0);
    assert.equal(sync.status().coverage.published, 4);
    assert.equal(sync.status().coverage.players, 52);
    assert.equal(calls.filter(url => url === d4URL).length, 1);
    const live = validateSeason(readLiveSeason(db, 2026));
    assert.equal(live.mode, 'live');
    assert.equal(live.matches['a:0:0'].roster.length, 13);
    assert.equal(live.matches['a:0:0'].count, 12);
    const previousCalls = calls.length;
    sync.start(); await sync.idle();
    assert.equal(calls.length, previousCalls);
    await sync.close();
    db.close();
    db = openDatabase(filename);
    const offline = createSynchronizer(db, {seasonStart: 2026, fetcher: sourceFetch([], true), interval: 0});
    offline.start(true); await offline.idle();
    assert.equal(offline.status().errors.length, 1);
    assert.deepEqual(readLiveSeason(db, 2026), live);
    assert.equal(readArchive(db, d4URL).sheets[0].players.length, 13);
    // Un match le même jour n’établit pas une antériorité sans preuve d’horaire.
    saveMatch(db, 2026, parseMatch(matchHTML('D1', '10/09/2026'), upperURL, 2026));
    assert.equal(readLiveSeason(db, 2026).matches['a:0:0'].count, 0);
  } finally { await sync.close(); db.close(); unlinkSync(filename); rmdirSync(directory); }
});

test('les rapprochements exigent le même club identifié sur les deux feuilles', () => {
  const db = openDatabase(':memory:');
  try {
    putMeta(db, 'standings:2026', [{pool: 'a', rank: 1, name: 'Équipe A', clubURL: `${ORIGIN}/club/test/`},
      {pool: 'b', rank: 1, name: 'Équipe B', clubURL: `${ORIGIN}/club/test/`}]);
    const d4 = parseMatch(matchHTML(), d4URL, 2026);
    const upper = parseMatch(matchHTML('D1', '02/09/2026'), upperURL, 2026);
    saveMatch(db, 2026, d4);
    saveMatch(db, 2026, upper);
    const matching = validateSeason(readLiveSeason(db, 2026)).matches['a:0:0'];
    assert.equal(matching.count, 12);
    assert.ok(matching.roster[0].history.length > 0);
    for (const clubURL of [`${ORIGIN}/club/autre-club/`, null]) {
      const other = structuredClone(upper);
      other.sheets.forEach(sheet => { sheet.clubURL = clubURL; });
      saveMatch(db, 2026, other);
      const excluded = readLiveSeason(db, 2026).matches['a:0:0'];
      assert.equal(excluded.count, 0);
      assert.ok(excluded.roster.every(player => player.history.length === 0));
      assert.equal(readArchive(db, upperURL).sheets[0].players.length, 13);
    }
    saveMatch(db, 2026, upper);
    d4.sheets.forEach(sheet => { sheet.clubURL = null; });
    saveMatch(db, 2026, d4);
    const unknown = readLiveSeason(db, 2026).matches['a:0:0'];
    assert.equal(unknown.count, 0);
    assert.ok(unknown.roster.every(player => player.history.length === 0));
  } finally { db.close(); }
});

test('le rendu des archives échappe les noms et donne accès aux compositions locales', () => {
  const html = liveDetail({count: 1, score: '2–1', home: '<img src=x onerror=alert(1)>', away: 'Équipe B',
    players: [], featured: false, realSheet: false, sourceURL: d4URL, matchDate: '2026-09-10',
    statusLabel: 'Terminé', sheetState: 'published', retained: false,
    roster: [{name: '<script>bad()</script>', status: 'starter', shirt: 1, entry: null, exit: null,
      history: [{date: '2026-09-02', division: 'D1', team: 'Équipe supérieure', sourceURL: upperURL}]}]});
  const dom = load(html);
  assert.equal(dom('script,img').length, 0);
  assert.ok(dom('h3').text().includes('<img'));
  assert.equal(dom('[data-archive-url]').attr('data-archive-url'), upperURL);
  assert.ok(dom('summary').text().includes('Titulaire'));
});

test('la synchronisation HTTP refuse les requêtes étrangères et sert les archives locales', async () => {
  const server = createApp({databasePath: ':memory:', syncOptions: {seasonStart: 2026, fetcher: sourceFetch([]), interval: 0}});
  server.listen(0, '127.0.0.1'); await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    assert.equal((await fetch(`${origin}/api/sync`, {method: 'POST'})).status, 403);
    assert.equal((await fetch(`${origin}/api/sync`, {method: 'POST', headers: {'X-Observatoire-Sync': '1', Origin: 'https://example.com'}})).status, 403);
    assert.equal((await fetch(`${origin}/api/sync`, {method: 'POST', headers: {'X-Observatoire-Sync': '1'}})).status, 202);
    for (let tries = 0; tries < 100; tries++) {
      const status = await (await fetch(`${origin}/api/sync`)).json();
      if (!status.running) break;
      await new Promise(resolve => setTimeout(resolve, 5));
    }
    assert.equal((await (await fetch(`${origin}/api/season`)).json()).mode, 'live');
    const archive = await fetch(`${origin}/api/sheet?url=${encodeURIComponent(d4URL)}`);
    assert.equal(archive.status, 200);
    assert.equal((await archive.json()).sheets[0].players.length, 13);
    assert.equal((await fetch(`${origin}/api/sheet?url=https://example.com/`)).status, 400);
  } finally { server.close(); await once(server, 'close'); }
});
