import {createHandler} from './api.ts';
import {createStore} from './store.ts';

declare const Deno: {env: {get(name: string): string | undefined}; serve(handler: (request: Request) => Promise<Response>): void};
const url = Deno.env.get('SUPABASE_URL');
const secret = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
if (!url || !secret) throw new Error('Configuration Supabase absente.');
const store = createStore(url, secret);
Deno.serve(createHandler(store, async token => {
  const response = await fetch(`${url}/auth/v1/user`, {headers: {apikey: secret, Authorization: token}, signal: AbortSignal.timeout(10000)});
  if (!response.ok) return null;
  const user: {id?: string} = await response.json();
  return user.id ?? null;
}));
