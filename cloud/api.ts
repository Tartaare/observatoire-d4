import {demo} from '../server/demo.js';
import {sourceURL} from '../server/source.js';
import {initialState, publicStatus, advance} from './collector.ts';
import {projectSnapshot} from './projection.ts';
import type {Store} from './types.ts';

export function createHandler(store: Store, authenticate: (token: string) => Promise<string | null>, fetcher: typeof fetch = fetch) {
  const reply = (data: unknown, status = 200) => Response.json(data, {status,
    headers: {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}});
  return async (request: Request): Promise<Response> => {
    try {
      const token = request.headers.get('Authorization') ?? '';
      if (!/^Bearer \S+$/.test(token)) return reply({error: 'Connexion requise.'}, 401);
      const user = await authenticate(token);
      if (!user) return reply({error: 'Session expirée. Reconnectez-vous.'}, 401);
      if (!await store.member(user)) return reply({error: 'Ce compte n’a pas accès à cet observatoire.'}, 403);
      const url = new URL(request.url);
      const route = url.pathname.replace(/^.*\/observatoire(?=\/|$)/, '') || '/';
      const now = new Date();
      const season = now.getUTCMonth() >= 6 ? now.getUTCFullYear() : now.getUTCFullYear() - 1;
      const state = {...initialState(), ...await store.state(season)};
      if (request.method === 'POST' && ['/sync', '/sync/step'].includes(route)) {
        if (request.headers.get('X-Observatoire-Sync') !== '1' || (await request.text()).length) return reply({error: 'Requête de synchronisation invalide.'}, 400);
        const result = await advance(store, season, route === '/sync', url.searchParams.get('force') === '1', fetcher);
        return reply(publicStatus(result.state, season), result.busy ? 409 : 200);
      }
      if (request.method !== 'GET') return reply({error: 'Méthode non autorisée.'}, 405);
      if (route === '/sync') return reply(publicStatus(state, season));
      if (route === '/season') return reply(projectSnapshot(season, await store.snapshot(season), state) ?? demo);
      if (route === '/sheet') {
        let matchURL: string;
        try {
          matchURL = sourceURL(url.searchParams.get('url') ?? '');
          if (!new URL(matchURL).pathname.startsWith('/matchs/')) throw new Error();
        } catch { return reply({error: 'URL de feuille invalide.'}, 400); }
        const archive = (await store.snapshot(season)).matches.find(m => m.url === matchURL);
        return archive ? reply({...archive, sheets: archive.sheets.map(s => ({...s, retained: s.state !== s.latestState}))})
          : reply({error: 'Feuille non archivée.'}, 404);
      }
      return reply({error: 'Ressource introuvable.'}, 404);
    } catch {
      return reply({error: 'Service temporairement indisponible. Les archives sont conservées.'}, 503);
    }
  };
}
