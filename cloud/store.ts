import type {Store, State, Snapshot, CachedPage, Commit} from './types.ts';

export function createStore(url: string, secret: string, fetcher: typeof fetch = fetch): Store {
  async function request<T>(path: string, body?: unknown): Promise<T> {
    const response = await fetcher(`${url}/rest/v1/${path}`, {
      method: body === undefined ? 'GET' : 'POST',
      headers: {apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json'},
      ...(body === undefined ? {} : {body: JSON.stringify(body)}), signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) throw new Error('Stockage des archives temporairement indisponible.');
    return response.json() as Promise<T>;
  }
  return {
    async state(season) {
      const rows = await request<{state: State}[]>(`od_seasons?season=eq.${season}&select=state`);
      return rows[0]?.state ?? null;
    },
    claim: (season, start, force) => request('rpc/od_claim', {p_season: season, p_start: start, p_force: force}),
    async commit(season: number, owner: string, change: Commit) {
      await request('rpc/od_commit', {p_season: season, p_owner: owner, p_change: change});
    },
    snapshot: season => request<Snapshot>('rpc/od_snapshot', {p_season: season}),
    async page(url) {
      const rows = await request<{data: CachedPage}[]>(`od_sources?url=eq.${encodeURIComponent(url)}&select=data`);
      return rows[0]?.data ?? null;
    },
    async member(userId) {
      const rows = await request<{user_id: string}[]>(`od_members?user_id=eq.${encodeURIComponent(userId)}&select=user_id`);
      return rows.length === 1;
    },
  };
}
