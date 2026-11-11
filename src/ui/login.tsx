import {useEffect, useState, type FormEvent} from 'react';
import {ArrowRight, LockKeyhole} from 'lucide-react';
import {apiFetch, restoreSession, signIn} from '../session.js';
import {Button} from '../appearance/ui/button';
import {Input} from '../appearance/ui/input';
import {Spinner} from '../appearance/ui/primitives';

export function Login({onReady}: {onReady: () => void}) {
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const verify = async () => {
    const response = await apiFetch('/api/sync', {signal: AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error(response.status === 403 ? 'Ce compte n’a pas accès à cet observatoire.' : 'Archives indisponibles. Réessayez dans un instant.');
  };
  useEffect(() => {
    if (!restoreSession()) return;
    let active = true; setBusy(true); setMessage('Vérification de la connexion…');
    void verify().then(() => { if (active) onReady(); }).catch(error => { if (active) setMessage(error instanceof Error ? error.message : 'Reconnectez-vous.'); })
      .finally(() => { if (active) setBusy(false); });
    return () => { active = false; };
  }, [onReady]);
  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault(); if (busy) return;
    const values = new FormData(event.currentTarget); setBusy(true); setMessage('Connexion en cours…');
    try { await signIn(String(values.get('email') ?? '').trim(), String(values.get('password') ?? '')); await verify(); onReady(); }
    catch (error) { setMessage(error instanceof Error ? error.message : 'Connexion impossible.'); }
    finally { setBusy(false); }
  }
  return <main className="od-login"><section className="od-login-body" aria-labelledby="od-login-title"><span className="od-login-mark"><LockKeyhole aria-hidden="true" /></span>
    <p className="od-eyebrow">OBSERVATOIRE D4 · ACCÈS PRIVÉ</p><h1 id="od-login-title">Retrouver vos archives</h1><p>Connectez-vous avec les identifiants de l’application.</p>
    <form onSubmit={submit} aria-busy={busy}><label htmlFor="od-email">Adresse e-mail</label><Input id="od-email" name="email" type="email" autoComplete="username" required disabled={busy} />
      <label htmlFor="od-password">Mot de passe</label><Input id="od-password" name="password" type="password" autoComplete="current-password" required disabled={busy} />
      <Button type="submit" disabled={busy}>{busy ? <Spinner /> : <ArrowRight aria-hidden="true" />}Se connecter</Button><p role="status" aria-live="polite">{message}</p></form>
  </section></main>;
}
