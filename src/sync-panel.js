import {query} from './dom.js';

/** @param {HTMLElement} root @param {() => Promise<void>} onUpdated */
export function setupSync(root, onUpdated) {
  const button = query(root, '[data-sync]', HTMLButtonElement);
  const force = query(root, '[data-sync-force]', HTMLInputElement);
  const message = query(root, '[data-sync-message]', HTMLElement);
  const coverage = query(root, '[data-sync-coverage]', HTMLElement);
  const progress = query(root, '[data-sync-progress]', HTMLProgressElement);
  const errors = query(root, '[data-sync-errors]', HTMLDetailsElement);
  const errorList = query(root, '[data-sync-error-list]', HTMLUListElement);
  const panel = query(root, '[data-sync-panel]', HTMLDetailsElement);
  const summary = query(root, '[data-sync-summary]', HTMLElement);
  const dateFormat = new Intl.DateTimeFormat('fr-FR', {dateStyle: 'short', timeStyle: 'short'});
  let wasRunning = false;
  let hadErrors = false;
  let connectionFailed = false;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null;

  /** @param {import('../server/collection-types.js').SyncStatus & {coverage: import('./types.js').Coverage}} state */
  function render(state) {
    connectionFailed = false;
    button.disabled = state.running;
    force.disabled = state.running;
    button.textContent = state.running ? 'Mise à jour en cours…' : 'Mettre à jour';
    summary.textContent = state.running ? 'En cours…' : state.errors.length ? 'Erreurs de collecte' : 'Suivi';
    if ((state.running && !wasRunning) || (state.errors.length > 0 && !hadErrors)) panel.open = true;
    hadErrors = state.errors.length > 0;
    progress.hidden = !state.running;
    progress.max = Math.max(1, state.total);
    if (state.total) progress.value = state.done; else progress.removeAttribute('value');
    progress.setAttribute('aria-valuetext', `${state.done} sur ${state.total}`);
    const last = state.lastSuccess ? `Dernière mise à jour complète : ${dateFormat.format(new Date(state.lastSuccess))}.` : 'Aucune synchronisation complète enregistrée.';
    const text = state.running ? state.phase : `${state.phase}. ${last}`;
    if (message.textContent !== text) message.textContent = text;
    const c = state.coverage;
    coverage.textContent = c.expected
      ? `Calendrier D4 : ${c.calendar.discovered}${c.calendar.expected === null ? '' : '/' + c.calendar.expected} rencontres · D4 : ${c.d4.published}/${c.d4.expected} compositions complètes · Tous niveaux : ${c.published}/${c.expected} · ${c.partial} partielles · ${c.missing} absentes · ${c.uncollected} à récupérer · ${c.players} noms sur feuilles${c.retained ? ` · ${c.retained} archives précédentes conservées` : ''}`
      : 'Première utilisation : connectez-vous à Internet puis lancez une mise à jour. Les archives seront ensuite disponibles hors ligne.';
    errors.hidden = state.errors.length === 0;
    errorList.replaceChildren(...state.errors.map(error => {
      const row = document.createElement('li');
      row.textContent = `${error.url} — ${error.message}`;
      return row;
    }));
  }

  async function refresh() {
    try {
      const response = await fetch('/api/sync', {signal: AbortSignal.timeout(8000)});
      if (!response.ok) throw new Error('État des archives indisponible.');
      const state = await response.json();
      render(state);
      if (wasRunning && !state.running) await onUpdated();
      wasRunning = state.running;
      timer = setTimeout(refresh, state.running ? 2000 : 30000);
    } catch {
      if (!connectionFailed) panel.open = true;
      connectionFailed = true;
      summary.textContent = 'Serveur indisponible';
      message.textContent = 'Le serveur local est indisponible. Relancez-le pour accéder aux archives et à la synchronisation.';
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
    panel.open = true;
    summary.textContent = 'Démarrage…';
    message.textContent = 'Démarrage de la mise à jour…';
    try {
      const response = await fetch(`/api/sync${force.checked ? '?force=1' : ''}`, {
        method: 'POST', headers: {'X-Observatoire-Sync': '1'}, signal: AbortSignal.timeout(8000),
      });
      if (!response.ok && response.status !== 409) throw new Error('Synchronisation indisponible.');
      const state = await response.json();
      render(state);
      wasRunning = state.running;
      timer = setTimeout(refresh, 1000);
    } catch {
      summary.textContent = 'Échec de la mise à jour';
      message.textContent = 'Impossible de démarrer la mise à jour. Les données affichées sont conservées.';
      button.disabled = false;
      force.disabled = false;
      timer = setTimeout(refresh, 10000);
    }
  });
  void refresh();
}
