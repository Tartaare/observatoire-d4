import {query} from './dom.js';
import {apiFetch} from './session.js';
import {hosted} from './runtime.js';

/** @param {HTMLElement} root @param {() => Promise<void>} onUpdated */
export function setupSync(root, onUpdated) {
  const button = query(root, '[data-sync]', HTMLButtonElement);
  const force = query(root, '[data-sync-force]', HTMLInputElement);
  const message = query(root, '[data-sync-message]', HTMLElement);
  const coverage = query(root, '[data-sync-coverage]', HTMLElement);
  const progress = query(root, '[data-sync-progress]', HTMLProgressElement);
  const errors = query(root, '[data-sync-errors]', HTMLDetailsElement);
  const errorList = query(root, '[data-sync-error-list]', HTMLUListElement);
  const dateFormat = new Intl.DateTimeFormat('fr-FR', {dateStyle: 'short', timeStyle: 'short'});
  let wasRunning = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null;

  /** @param {import('../server/collection-types.js').SyncStatus & {coverage: import('./types.js').Coverage}} state */
  function render(state) {
    button.disabled = state.running;
    force.disabled = state.running;
    button.textContent = state.running ? 'Mise à jour en cours…' : 'Mettre à jour';
    progress.hidden = !state.running;
    progress.max = Math.max(1, state.total);
    if (state.total) progress.value = state.done; else progress.removeAttribute('value');
    progress.setAttribute('aria-valuetext', `${state.done} sur ${state.total}`);
    const last = state.lastSuccess ? `MAJ ${dateFormat.format(new Date(state.lastSuccess))}` : 'Aucune mise à jour complète';
    const text = state.running ? `${state.phase}${hosted ? ' · Gardez cet onglet ouvert ; reprise à sa réouverture' : ''}` : `${state.phase} · ${last}`;
    if (message.textContent !== text) message.textContent = text;
    const c = state.coverage;
    coverage.textContent = c.expected
      ? `Calendrier ${c.calendar.discovered}${c.calendar.expected === null ? '' : '/' + c.calendar.expected} · D4 ${c.d4.published}/${c.d4.expected} · Tous niveaux ${c.published}/${c.expected} · ${c.partial} partielles · ${c.missing} absentes · ${c.uncollected} à récupérer · ${c.players} noms${c.retained ? ` · ${c.retained} archives conservées` : ''}`
      : hosted ? 'Première utilisation : lancez une mise à jour pour archiver les compositions.'
      : 'Première utilisation : connectez-vous à Internet puis lancez une mise à jour. Les archives seront ensuite disponibles hors ligne.';
    coverage.title = 'Calendrier : rencontres découvertes/attendues. D4 et tous niveaux : compositions complètes/attendues. Noms : entrées publiées sur les feuilles, pas des personnes distinctes.';
    errors.hidden = state.errors.length === 0;
    errorList.replaceChildren(...state.errors.map(error => {
      const row = document.createElement('li');
      row.textContent = `${error.url} — ${error.message}`;
      return row;
    }));
  }

  async function refresh() {
    try {
      const response = await apiFetch('/api/sync', {signal: AbortSignal.timeout(hosted ? 30000 : 8000)});
      if (!response.ok) throw new Error('État des archives indisponible.');
      let state = await response.json();
      const observedRunning = state.running;
      if (hosted && state.running) {
        const step = await apiFetch('/api/sync/step', {method: 'POST', headers: {'X-Observatoire-Sync': '1'}, signal: AbortSignal.timeout(65000)});
        if (!step.ok && step.status !== 409) throw new Error('Collecte interrompue.');
        state = await step.json();
      }
      render(state);
      if ((wasRunning || observedRunning) && !state.running) await onUpdated();
      wasRunning = state.running;
      timer = setTimeout(refresh, state.running ? 2000 : 30000);
    } catch {
      message.textContent = hosted ? 'Connexion aux archives interrompue. Nouvelle tentative automatique ; les archives sont conservées.'
        : 'Le serveur local est indisponible. Relancez-le pour accéder aux archives et à la synchronisation.';
      button.disabled = false;
      force.disabled = false;
      button.textContent = 'Réessayer la mise à jour';
      progress.hidden = true;
      timer = setTimeout(refresh, 10000);
    }
  }

  button.addEventListener('click', async () => {
    if (timer !== null) clearTimeout(timer);
    button.disabled = true;
    force.disabled = true;
    message.textContent = 'Démarrage de la mise à jour…';
    try {
      const response = await apiFetch(`/api/sync${force.checked ? '?force=1' : ''}`, {
        method: 'POST', headers: {'X-Observatoire-Sync': '1'}, signal: AbortSignal.timeout(hosted ? 65000 : 8000),
      });
      if (!response.ok && response.status !== 409) throw new Error('Synchronisation indisponible.');
      const state = await response.json();
      render(state);
      wasRunning = state.running;
      timer = setTimeout(refresh, 1000);
    } catch {
      message.textContent = 'Impossible de démarrer la mise à jour. Les données affichées sont conservées.';
      button.disabled = false;
      force.disabled = false;
      timer = setTimeout(refresh, 10000);
    }
  });
  void refresh();
}
