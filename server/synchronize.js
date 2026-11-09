import {parseClub, parseDirectory, parseMatch, parseStandings, parseRoundCount, ORIGIN} from './source.js';
import {getMeta, putMeta, saveFixtures, saveMatch, collectionCoverage} from './collection-store.js';
import {createReader, SourceError} from './source-reader.js';
import {randomUUID} from 'node:crypto';

/** @param {number} pid */
function processExists(pid) {
  try { process.kill(pid, 0); return true; }
  catch (error) { return !(error instanceof Error && 'code' in error && error.code === 'ESRCH'); }
}

/** @param {Date} [date] */
export function currentSeason(date = new Date()) {
  return date.getUTCMonth() >= 6 ? date.getUTCFullYear() : date.getUTCFullYear() - 1;
}

/** @param {import('node:sqlite').DatabaseSync} db @param {{seasonStart?: number, fetcher?: typeof fetch, interval?: number}} [options] */
export function createSynchronizer(db, {seasonStart = currentSeason(), fetcher, interval} = {}) {
  if (!Number.isInteger(seasonStart) || seasonStart < 2000 || seasonStart > 2100) throw new RangeError('Saison invalide.');
  /** @type {import('./collection-types.js').SyncStatus} */
  let state = getMeta(db, `sync:${seasonStart}`, {running: false, phase: 'Prêt', done: 0, total: 0,
    startedAt: null, finishedAt: null, lastSuccess: null, errors: [], requests: 0, cached: 0});
  const owner = randomUUID();
  /** @type {Promise<void> | null} */
  let job = null;
  let closed = false;
  const abort = new AbortController();
  const status = () => {
    const latest = job ? state : getMeta(db, `sync:${seasonStart}`, state);
    const lock = db.prepare('SELECT pid FROM collection_locks WHERE season=?').get(seasonStart);
    if (latest.running && (!lock || !processExists(Number(lock.pid)))) {
      latest.running = false;
      latest.phase = 'Synchronisation interrompue ; reprise possible';
    }
    return {...latest, seasonStart, coverage: collectionCoverage(db, seasonStart)};
  };
  const persist = () => putMeta(db, `sync:${seasonStart}`, state);

  /** @param {boolean} [force] */
  function start(force = false) {
    if (closed || job) return false;
    db.exec('BEGIN IMMEDIATE');
    try {
      const lock = db.prepare('SELECT pid FROM collection_locks WHERE season=?').get(seasonStart);
      if (lock && processExists(Number(lock.pid))) { db.exec('ROLLBACK'); return false; }
      db.prepare('DELETE FROM collection_locks WHERE season=?').run(seasonStart);
      db.prepare('INSERT INTO collection_locks VALUES(?,?,?)').run(seasonStart, owner, process.pid);
      db.exec('COMMIT');
    } catch (error) { db.exec('ROLLBACK'); throw error; }
    state = getMeta(db, `sync:${seasonStart}`, state);
    state = {...state, running: true, phase: 'Lecture des calendriers', done: 0, total: 0,
      startedAt: new Date().toISOString(), finishedAt: null, errors: [], requests: 0, cached: 0};
    persist();
    job = run(force).finally(() => { job = null; });
    return true;
  }

  /** @param {boolean} force */
  async function run(force) {
    const reader = createReader(db, {fetcher, interval, signal: abort.signal});
    const indexAge = force ? 0 : 15 * 60_000;
    /** @param {string} url @param {() => Promise<void>} action */
    async function attempt(url, action) {
      try { await action(); }
      catch (error) {
        state.errors.push({url, message: error instanceof Error ? error.message : 'Erreur de collecte.'});
        if (error instanceof SourceError && error.fatal || abort.signal.aborted) throw error;
      } finally {
        state.done++;
        Object.assign(state, reader.stats);
        persist();
      }
    }
    try {
      const d4URL = `${ORIGIN}/division/d4/`;
      const d4Page = await reader.read(d4URL, indexAge);
      const standings = parseStandings(d4Page);
      putMeta(db, `standings:${seasonStart}`, standings);
      const rounds = parseRoundCount(d4Page);
      if (rounds) putMeta(db, `rounds:${seasonStart}`, rounds);
      const clubs = new Set([...parseDirectory(await reader.read(`${ORIGIN}/clubs/`, indexAge)), ...standings.map(team => team.clubURL)]);
      state.total = clubs.size;
      for (const club of clubs) await attempt(club, async () => {
        const fixtures = parseClub(await reader.read(club, indexAge), seasonStart);
        saveFixtures(db, seasonStart, fixtures);
      });
      const matches = db.prepare("SELECT url,division,round,home,away FROM collected_fixtures WHERE season=? AND status='Terminé' ORDER BY division='D4' DESC,round,url").all(seasonStart);
      state.phase = 'Archivage des compositions';
      state.done = 0;
      state.total = matches.length;
      persist();
      for (const fixture of matches) await attempt(String(fixture.url), async () => {
        const sheets = db.prepare('SELECT state,latest_state FROM collected_sheets WHERE match_url=?').all(fixture.url);
        const complete = sheets.length === 2 && sheets.every(sheet => sheet.state === 'published' && sheet.latest_state === 'published');
        const html = await reader.read(String(fixture.url), force ? 0 : complete ? 24 * 60 * 60_000 : 60 * 60_000);
        const match = parseMatch(html, String(fixture.url), seasonStart);
        if (match.division !== fixture.division || match.round !== fixture.round ||
          match.sheets[0].name !== fixture.home || match.sheets[1].name !== fixture.away) throw new Error('La feuille ne correspond pas au calendrier découvert.');
        saveMatch(db, seasonStart, match);
      });
      state.phase = state.errors.length ? 'Mise à jour partielle ; erreurs à reprendre' : 'Archives à jour';
      if (!state.errors.length) state.lastSuccess = new Date().toISOString();
    } catch (error) {
      if (!state.errors.some(item => item.message === (error instanceof Error ? error.message : ''))) {
        state.errors.push({url: ORIGIN, message: error instanceof Error ? error.message : 'Synchronisation interrompue.'});
      }
      state.phase = 'Mise à jour interrompue ; archives conservées';
    } finally {
      Object.assign(state, reader.stats);
      state.running = false;
      state.finishedAt = new Date().toISOString();
      persist();
      db.prepare('DELETE FROM collection_locks WHERE season=? AND owner=?').run(seasonStart, owner);
    }
  }
  return {start, status, idle: () => job ?? Promise.resolve(),
    close: async () => { closed = true; abort.abort(); await job; }};
}
