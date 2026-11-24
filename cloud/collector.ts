import {ORIGIN, parseStandings, parseRoundCount, parseDirectory, parseClub, parseMatch} from '../server/source.js';
import {coverageOf, preserveMatch} from './projection.ts';
import {readSource, SourceFailure} from './reader.ts';
import {logSync} from '../server/sync-log.js';
import {calendarAge, fixtureKey, isFresh, matchAge} from '../server/refresh-policy.js';
import type {Store, State, Commit, Snapshot, Fixture} from './types.ts';

export function initialState(): State {
  return {running: false, phase: 'Prêt', done: 0, total: 0, startedAt: null, finishedAt: null, lastSuccess: null,
    errors: [], requests: 0, cached: 0, stage: 'finished', queue: [], standings: [], rounds: 0, force: false,
    nextRequestAt: 0, verified: {}, coverage: coverageOf({fixtures: [], matches: []}, {standings: [], rounds: 0})};
}

export function publicStatus(state: State, season: number) {
  const {stage, queue, standings, rounds, force, nextRequestAt, verified, ...status} = state;
  return {...status, seasonStart: season};
}

function putFixtures(snapshot: Snapshot, fixtures: Fixture[]) {
  const map = new Map(snapshot.fixtures.map(f => [f.url, f]));
  for (const f of fixtures) map.set(f.url, f);
  snapshot.fixtures = [...map.values()];
}

export async function advance(store: Store, season: number, start: boolean, force: boolean, fetcher: typeof fetch = fetch) {
  const lease = await store.claim(season, start, force);
  if (!lease) return {busy: true, state: {...initialState(), ...await store.state(season)}};
  const state: State = {...initialState(), ...lease.state};
  const snapshot = await store.snapshot(season);
  const change: Commit = {state};
  const stage = state.stage;
  const errorsBefore = state.errors.length;
  if (start) logSync(season, state, force ? 'start-forced' : 'start');
  const url = stage === 'standings' ? `${ORIGIN}/division/d4/` : stage === 'directory' ? `${ORIGIN}/clubs/` : state.queue[0];
  try {
    if (url) {
      const old = snapshot.matches.find(m => m.url === url);
      const complete = old?.sheets.length === 2 && old.sheets.every(s => s.state === 'published' && s.latestState === 'published');
      const previous = state.verified[url];
      const age = state.force || previous === null || stage === 'matches' && previous !== undefined
        ? 0 : stage === 'matches' ? matchAge(old?.date ?? null, complete) : calendarAge;
      const page = await readSource(store, state, url, age, fetcher);
      change.page = page.page;
      if (stage === 'standings') {
        state.standings = parseStandings(page.body);
        state.rounds = parseRoundCount(page.body) || state.rounds;
        state.stage = 'directory';
      } else if (stage === 'directory') {
        state.queue = [...new Set([...parseDirectory(page.body), ...state.standings.map(t => t.clubURL)])];
        state.stage = 'clubs'; state.total = state.queue.length; state.done = 0;
        if (!state.force && state.queue.every(club => isFresh(state.verified[club]))) {
          state.cached += state.queue.length;
          state.queue = [];
        }
      } else if (stage === 'clubs') {
        change.fixtures = parseClub(page.body, season).map(f => {
          const old = snapshot.fixtures.find(o => o.url === f.url);
          return {...f, date: f.date ?? old?.date ?? null, score: old?.score ?? f.score};
        });
        putFixtures(snapshot, change.fixtures);
        state.verified[url] = {key: '', until: page.fetchedAt + calendarAge};
      } else if (stage === 'matches') {
        const f = snapshot.fixtures.find(f => f.url === url);
        const match = parseMatch(page.body, url, season);
        if (!f || match.division !== f.division || match.round !== f.round || match.sheets[0].name !== f.home || match.sheets[1].name !== f.away) {
          throw new Error('La feuille ne correspond pas au calendrier découvert.');
        }
        change.match = preserveMatch(match, old);
        const age = matchAge(match.date, match.sheets.every(s => s.state === 'published'));
        state.verified[url] = {key: fixtureKey(f), until: page.fetchedAt + age};
        snapshot.matches = [...snapshot.matches.filter(m => m.url !== url), change.match];
        change.fixtures = [{...f, date: match.date, score: match.score, status: match.status}];
        putFixtures(snapshot, change.fixtures);
      }
    }
  } catch (error) {
    if (url && (stage === 'clubs' || stage === 'matches')) state.verified[url] = null;
    state.errors.push({url: url ?? ORIGIN, message: error instanceof Error ? error.message : 'Erreur de collecte.'});
    if (stage === 'standings' || stage === 'directory' || error instanceof SourceFailure && error.fatal) {
      state.running = false; state.phase = 'Mise à jour interrompue ; archives conservées';
    }
  }
  if (state.running && (stage === 'clubs' || stage === 'matches')) { state.queue.shift(); state.done++; }
  if (state.running && state.stage === 'clubs' && !state.queue.length) {
    const finished = snapshot.fixtures.filter(f => f.status === 'Terminé');
    state.queue = finished.filter(f => state.force || !isFresh(state.verified[f.url], fixtureKey(f)))
      .sort((a, b) => Number(b.division === 'D4') - Number(a.division === 'D4') || a.round - b.round || a.url.localeCompare(b.url)).map(f => f.url);
    state.cached += finished.length - state.queue.length;
    state.stage = 'matches'; state.phase = 'Archivage des compositions'; state.done = 0; state.total = state.queue.length;
  }
  if (state.running && state.stage === 'matches' && !state.queue.length) {
    state.running = false; state.stage = 'finished';
    state.phase = state.errors.length ? 'Mise à jour partielle ; erreurs à reprendre' : 'Archives à jour';
    if (!state.errors.length) state.lastSuccess = new Date().toISOString();
  }
  if (!state.running) state.finishedAt = new Date().toISOString();
  state.coverage = coverageOf(snapshot, state);
  await store.commit(season, lease.owner, change);
  logSync(season, state, stage, url, state.errors[errorsBefore]?.message);
  if (!state.running) logSync(season, state, 'finish');
  return {busy: false, state};
}
