import {sourceURL} from '../server/source.js';
import type {CachedPage, State, Store, Commit} from './types.ts';

export class SourceFailure extends Error {
  constructor(message: string, public fatal = false) { super(message); }
}

export async function readSource(store: Store, state: State, input: string, maxAge: number,
  fetcher: typeof fetch = fetch): Promise<{body: string; page?: Commit['page']}> {
  const url = sourceURL(input);
  const old = await store.page(url);
  if (old && Date.now() - Date.parse(old.fetchedAt) < maxAge) {
    state.cached++;
    return {body: old.body};
  }
  await new Promise(resolve => setTimeout(resolve, Math.max(0, Math.min(1000, state.nextRequestAt - Date.now()))));
  state.nextRequestAt = Date.now() + 1000;
  state.requests++;
  const headers = new Headers({'User-Agent': 'Observatoire-D4/1.0 (personal senior match-sheet archive)', Accept: 'text/html'});
  if (old?.etag) headers.set('If-None-Match', old.etag);
  if (old?.modified) headers.set('If-Modified-Since', old.modified);
  try {
    const response = await fetcher(url, {headers, redirect: 'error', signal: AbortSignal.timeout(20000)});
    if (response.status === 304 && old) {
      await response.body?.cancel();
      state.cached++;
      return {body: old.body, page: {url, data: {...old, fetchedAt: new Date().toISOString()}}};
    }
    if (!response.ok || !response.headers.get('Content-Type')?.includes('text/html')) {
      await response.body?.cancel();
      throw new SourceFailure(`Source indisponible (HTTP ${response.status}) ou réponse non HTML.`, [403, 429].includes(response.status));
    }
    if (!response.body) throw new SourceFailure('Réponse source vide.');
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let size = 0, body = '';
    while (true) {
      const {value, done} = await reader.read();
      if (done) break;
      size += value.length;
      if (size > 3_000_000) { await reader.cancel(); throw new SourceFailure('Page source trop volumineuse.'); }
      body += decoder.decode(value, {stream: true});
    }
    body += decoder.decode();
    const data: CachedPage = {body, etag: response.headers.get('ETag'), modified: response.headers.get('Last-Modified'), fetchedAt: new Date().toISOString()};
    return {body, page: {url, data}};
  } catch (error) {
    if (error instanceof SourceFailure) throw error;
    throw new SourceFailure('Connexion source interrompue ; archives conservées.', true);
  }
}
