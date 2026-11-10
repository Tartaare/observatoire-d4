import {hosted} from './runtime.js';
import {restoreSession, signIn, signOut, apiFetch} from './session.js';

/** @param {HTMLElement} root */
export async function requireSession(root) {
  if (!hosted) return;
  const panel = document.createElement('section');
  panel.className = 'od-login';
  panel.setAttribute('aria-labelledby', 'od-login-title');
  panel.innerHTML = `<div class="od-login-body"><p class="od-eyebrow">OBSERVATOIRE D4 · ACCÈS PRIVÉ</p>
    <h1 id="od-login-title">Retrouver vos archives</h1>
    <p>Connectez-vous avec les identifiants de l’application.</p>
    <form><label for="od-email">Adresse e-mail</label><input id="od-email" name="email" type="email" autocomplete="username" required>
    <label for="od-password">Mot de passe</label><input id="od-password" name="password" type="password" autocomplete="current-password" required>
    <button class="od-play" type="submit">Se connecter</button><p role="status" aria-live="polite"></p></form></div>`;
  document.body.append(panel);
  root.hidden = true;
  const form = /** @type {HTMLFormElement} */ (panel.querySelector('form'));
  const button = /** @type {HTMLButtonElement} */ (form.querySelector('button'));
  const message = /** @type {HTMLParagraphElement} */ (form.querySelector('[role=status]'));
  const verify = async () => {
    const response = await apiFetch('/api/sync', {signal: AbortSignal.timeout(15000)});
    if (!response.ok) throw new Error(response.status === 403 ? 'Ce compte n’a pas accès à cet observatoire.' : 'Archives indisponibles. Réessayez dans un instant.');
  };
  if (restoreSession()) {
    message.textContent = 'Vérification de la connexion…';
    try { await verify(); panel.remove(); root.hidden = false; addLogout(root); return; }
    catch (error) { message.textContent = error instanceof Error ? error.message : 'Reconnectez-vous.'; }
  }
  await new Promise(resolve => {
    form.addEventListener('submit', async event => {
      event.preventDefault(); button.disabled = true; form.setAttribute('aria-busy', 'true');
      message.textContent = 'Connexion en cours…';
      const values = new FormData(form);
      try {
        await signIn(String(values.get('email') ?? '').trim(), String(values.get('password') ?? ''));
        await verify(); form.reset(); panel.remove(); root.hidden = false; addLogout(root); resolve(undefined);
      } catch (error) { message.textContent = error instanceof Error ? error.message : 'Connexion impossible.'; }
      finally { button.disabled = false; form.setAttribute('aria-busy', 'false'); }
    });
  });
}

/** @param {HTMLElement} root */
function addLogout(root) {
  const button = document.createElement('button');
  button.type = 'button'; button.className = 'od-arrow od-signout'; button.textContent = 'Déconnexion';
  button.addEventListener('click', () => { button.disabled = true; void signOut(); });
  root.querySelector('.od-header-actions')?.append(button);
  window.addEventListener('od-session-expired', () => location.reload(), {once: true});
}
