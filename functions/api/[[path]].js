/**
 * @param {{request: Request, env: {SUPABASE_URL?: string, SUPABASE_PUBLISHABLE_KEY?: string}}} context
 */
export async function onRequest({request, env}) {
  const respond = (/** @type {unknown} */ data, status = 200) => Response.json(data, {status,
    headers: {'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}});
  const url = new URL(request.url);
  const path = url.pathname.slice('/api'.length);
  const auth = path === '/auth/token' || path === '/auth/logout';
  if (!['/season', '/sheet', '/sync', '/sync/step', '/auth/token', '/auth/logout'].includes(path)) return respond({error: 'Ressource introuvable.'}, 404);
  if (!['GET', 'POST'].includes(request.method) || (auth && request.method !== 'POST')) return respond({error: 'Méthode non autorisée.'}, 405);
  if (request.method === 'POST' && request.headers.get('Origin') !== url.origin) return respond({error: 'Origine non autorisée.'}, 403);
  if (!env.SUPABASE_URL || !env.SUPABASE_PUBLISHABLE_KEY) return respond({error: 'Hébergement non configuré.'}, 503);
  if (!/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(env.SUPABASE_URL)) return respond({error: 'Configuration invalide.'}, 503);
  const headers = new Headers({apikey: env.SUPABASE_PUBLISHABLE_KEY, 'Content-Type': 'application/json'});
  const authorization = request.headers.get('Authorization');
  if (authorization) headers.set('Authorization', authorization);
  if (request.headers.get('X-Observatoire-Sync') === '1') headers.set('X-Observatoire-Sync', '1');
  let target = auth ? `/auth/v1/${path.slice('/auth/'.length)}` : `/functions/v1/observatoire${path}`;
  const params = new URLSearchParams();
  if (path === '/auth/token') {
    const grant = url.searchParams.get('grant_type');
    if (!['password', 'refresh_token'].includes(grant ?? '')) return respond({error: 'Connexion invalide.'}, 400);
    params.set('grant_type', grant ?? '');
  }
  if (path === '/sheet') params.set('url', url.searchParams.get('url') ?? '');
  if (path === '/sync' && url.searchParams.get('force') === '1') params.set('force', '1');
  if (params.size) target += `?${params}`;
  try {
    let body;
    if (request.method === 'POST') {
      if (Number(request.headers.get('Content-Length') ?? 0) > 4096) return respond({error: 'Requête trop volumineuse.'}, 413);
      const reader = request.body?.getReader();
      const chunks = []; let size = 0;
      if (reader) while (true) {
        const part = await reader.read();
        if (part.done) break;
        size += part.value.length;
        if (size > 4096) { await reader.cancel(); return respond({error: 'Requête trop volumineuse.'}, 413); }
        chunks.push(part.value);
      }
      body = new Blob(chunks);
    }
    const upstream = await fetch(env.SUPABASE_URL + target, {method: request.method, headers, body,
      redirect: 'manual', signal: AbortSignal.timeout(60000)});
    if (upstream.status >= 300 && upstream.status < 400) {
      await upstream.body?.cancel();
      return respond({error: 'Redirection inattendue du service.'}, 502);
    }
    return new Response(upstream.body, {status: upstream.status, headers: {'Content-Type': 'application/json; charset=utf-8',
      'Cache-Control': 'no-store', 'X-Content-Type-Options': 'nosniff'}});
  } catch (error) {
    const message = error instanceof Error ? error.message.replace(/https?:\/\/\S+/g, '[URL]') : 'Erreur inconnue';
    console.error('Échec du relais Supabase', {route: path, message});
    return respond({error: 'Connexion au service interrompue. Réessayez.'}, 503);
  }
}
