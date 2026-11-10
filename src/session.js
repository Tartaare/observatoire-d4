import {hosted} from './runtime.js';

/** @typedef {{access_token: string, refresh_token: string, expires_at: number}} Session */
const key = 'observatoire-d4-session-v1';
/** @type {Session | null} */
let session = null;
/** @type {Promise<void> | null} */
let refreshing = null;

/** @param {unknown} value @returns {Session | null} */
function parseSession(value) {
  if (!value || typeof value !== 'object') return null;
  const s = /** @type {Record<string, unknown>} */ (value);
  return typeof s.access_token === 'string' && typeof s.refresh_token === 'string' && typeof s.expires_at === 'number'
    ? /** @type {Session} */ (s) : null;
}

/** @param {Session | null} value */
function save(value) {
  session = value;
  try { if (value) localStorage.setItem(key, JSON.stringify(value)); else localStorage.removeItem(key); }
  catch { /* Stockage bloqué : la connexion reste valable dans cet onglet. */ }
}

/** @param {'password' | 'refresh_token'} grant @param {Record<string, string>} body */
async function obtain(grant, body) {
  const response = await fetch(`/api/auth/token?grant_type=${grant}`, {method: 'POST',
    headers: {'Content-Type': 'application/json'}, body: JSON.stringify(body), signal: AbortSignal.timeout(15000)});
  if (!response.ok) throw new Error(response.status === 400 || response.status === 401
    ? 'Connexion refusée. Vérifiez votre adresse et votre mot de passe.' : 'Connexion indisponible. Réessayez dans un instant.');
  const data = await response.json();
  const next = parseSession({...data, expires_at: Date.now() / 1000 + Number(data.expires_in)});
  if (!next || !Number.isFinite(next.expires_at)) throw new Error('Réponse de connexion invalide.');
  save(next);
}

export function restoreSession() {
  try { session = parseSession(JSON.parse(localStorage.getItem(key) ?? 'null')); } catch { session = null; }
  return Boolean(session);
}

/** @param {string} email @param {string} password */
export const signIn = (email, password) => obtain('password', {email, password});

export async function signOut() {
  const token = session?.access_token;
  save(null);
  if (token) {
    try { await fetch('/api/auth/logout', {method: 'POST', headers: {Authorization: `Bearer ${token}`}, signal: AbortSignal.timeout(8000)}); }
    catch { /* La copie locale est supprimée même si le service est inaccessible. */ }
  }
  location.reload();
}

/** @param {string} path @param {RequestInit} [options] */
export async function apiFetch(path, options = {}) {
  if (!hosted) return fetch(path, options);
  if (session && session.expires_at < Date.now() / 1000 + 60) {
    refreshing ??= obtain('refresh_token', {refresh_token: session.refresh_token}).finally(() => { refreshing = null; });
    try { await refreshing; } catch (error) { save(null); window.dispatchEvent(new Event('od-session-expired')); throw error; }
  }
  if (!session) throw new Error('Connexion requise.');
  const headers = new Headers(options.headers);
  headers.set('Authorization', `Bearer ${session.access_token}`);
  const response = await fetch(path, {...options, headers});
  if (response.status === 401) { save(null); window.dispatchEvent(new Event('od-session-expired')); }
  return response;
}
