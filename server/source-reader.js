import {setTimeout as wait} from 'node:timers/promises';
import {sourceURL} from './source.js';

export class SourceError extends Error {
  /** @param {string} message @param {boolean} fatal */
  constructor(message, fatal = false) { super(message); this.fatal = fatal; }
}

/** @param {import('node:sqlite').DatabaseSync} db @param {{fetcher?: typeof fetch, interval?: number, signal?: AbortSignal}} [options] */
export function createReader(db, {fetcher = fetch, interval = 1000, signal} = {}) {
  let lastRequest = 0;
  const stats = {requests: 0, cached: 0};
  /** @param {string} value @param {number} maxAge */
  async function read(value, maxAge) {
    const url = sourceURL(value);
    const old = db.prepare('SELECT * FROM source_pages WHERE url=?').get(url);
    if (old && Date.now() - Date.parse(String(old.fetched_at)) < maxAge) {
      stats.cached++;
      return String(old.body);
    }
    await wait(Math.max(0, lastRequest + interval - Date.now()), undefined, {signal});
    lastRequest = Date.now();
    const headers = new Headers({'User-Agent': 'Observatoire-D4/1.0 (personal senior match-sheet archive)', Accept: 'text/html'});
    if (old?.etag) headers.set('If-None-Match', String(old.etag));
    if (old?.modified) headers.set('If-Modified-Since', String(old.modified));
    let response;
    stats.requests++;
    try {
      response = await fetcher(url, {headers, redirect: 'error', signal: signal
        ? AbortSignal.any([signal, AbortSignal.timeout(20000)]) : AbortSignal.timeout(20000)});
    } catch { throw new SourceError('Connexion à la source impossible. Les archives locales sont conservées.', true); }
    if (response.status === 304 && old) {
      db.prepare('UPDATE source_pages SET fetched_at=? WHERE url=?').run(new Date().toISOString(), url);
      stats.cached++;
      return String(old.body);
    }
    if (!response.ok) {
      await response.body?.cancel();
      throw new SourceError(`La source répond HTTP ${response.status}.`, [403, 429].includes(response.status));
    }
    if (!(response.headers.get('Content-Type') ?? '').includes('text/html')) {
      await response.body?.cancel();
      throw new SourceError('Réponse source non HTML.');
    }
    if (!response.body) throw new SourceError('Réponse source vide.');
    const reader = response.body.getReader();
    const chunks = [];
    let length = 0;
    try {
      while (true) {
        const {value, done} = await reader.read();
        if (done) break;
        length += value.length;
        if (length > 3_000_000) { await reader.cancel(); throw new SourceError('Page source trop volumineuse.'); }
        chunks.push(value);
      }
    } catch (error) {
      if (error instanceof SourceError) throw error;
      throw new SourceError('Lecture source interrompue. Les archives locales sont conservées.', true);
    }
    const body = Buffer.concat(chunks).toString('utf8');
    db.prepare(`INSERT INTO source_pages VALUES(?,?,?,?,?) ON CONFLICT(url) DO UPDATE SET
      body=excluded.body,etag=excluded.etag,modified=excluded.modified,fetched_at=excluded.fetched_at`)
      .run(url, body, response.headers.get('ETag'), response.headers.get('Last-Modified'), new Date().toISOString());
    return body;
  }
  return {read, stats};
}
