import {query} from './dom.js';
import {apiFetch} from './session.js';
import {hosted} from './runtime.js';

export function createTimeEstimate() {
  let phase = '', firstDone = 0, firstTime = 0, lastDone = 0, label = '';
  /** @param {Pick<import('../server/collection-types.js').SyncStatus, 'startedAt'|'phase'|'running'|'total'|'done'>} state */
  return (state, now = performance.now()) => {
    if (!state.running) { phase = ''; return ''; }
    const key = JSON.stringify([state.startedAt, state.phase, state.total]);
    const calendars = state.phase === 'Lecture des calendriers';
    const prefix = calendars ? 'Calendriers' : 'Fin estimée';
    if (phase !== key || state.done < lastDone) {
      phase = key;
      firstDone = lastDone = state.done;
      firstTime = now;
      label = calendars ? 'Calendriers · estimation en cours…' : 'Durée restante en cours d’estimation…';
    } else if (state.done > lastDone && state.total > state.done) {
      const seconds = (now - firstTime) / 1000 * (state.total - state.done) / (state.done - firstDone);
      const duration = seconds < 60 ? `${Math.max(5, Math.ceil(seconds / 5) * 5)} s` : `${Math.ceil(seconds / 60)} min`;
      label = `${prefix} · encore environ ${duration}`;
      lastDone = state.done;
    }
    return label;
  };
}

/** @param {HTMLElement} root @param {() => Promise<void>} onUpdated */
export function setupSync(root, onUpdated) {
  const button = query(root, '[data-sync]', HTMLButtonElement);
  const force = query(root, '[data-sync-force]', HTMLInputElement);
  const message = query(root, '[data-sync-message]', HTMLElement);
  const coverage = query(root, '[data-sync-coverage]', HTMLElement);
  const progress = query(root, '[data-sync-progress]', HTMLProgressElement);
  const eta = query(root, '[data-sync-eta]', HTMLElement);
  const estimate = createTimeEstimate();
  const errors = query(root, '[data-sync-errors]', HTMLDetailsElement);
  const errorList = query(root, '[data-sync-error-list]', HTMLUListElement);
  const dateFormat = new Intl.DateTimeFormat('fr-FR', {dateStyle: 'short', timeStyle: 'short'});
  let wasRunning = false;
  let generation = 0;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let timer = null;

  /** @param {import('../server/collection-types.js').SyncStatus & {coverage: import('./types.js').Coverage}} state */
  function render(state) {
    eta.textContent = estimate(state);
    eta.hidden = !state.running;
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
    const current = generation;
    try {
      const step = hosted && wasRunning;
      const response = step
        ? await apiFetch('/api/sync/step', {method: 'POST', headers: {'X-Observatoire-Sync': '1'}, signal: AbortSignal.timeout(65000)})
        : await apiFetch('/api/sync', {signal: AbortSignal.timeout(hosted ? 30000 : 8000)});
      if (!response.ok && !(step && response.status === 409)) throw new Error('État des archives indisponible.');
      const state = await response.json();
      if (current !== generation) return;
      render(state);
      if (wasRunning && !state.running) await onUpdated();
      if (current !== generation) return;
      wasRunning = state.running;
      const delay = hosted && response.status !== 409 ? 0 : 2000;
      timer = setTimeout(refresh, state.running ? delay : 30000);
    } catch {
      if (current !== generation) return;
      message.textContent = hosted ? 'Connexion aux archives interrompue. Nouvelle tentative automatique ; les archives sont conservées.'
        : 'Le serveur local est indisponible. Relancez-le pour accéder aux archives et à la synchronisation.';
      button.disabled = false;
      force.disabled = false;
      button.textContent = 'Réessayer la mise à jour';
      progress.hidden = true;
      eta.hidden = true;
      timer = setTimeout(refresh, 10000);
    }
  }

  button.addEventListener('click', async () => {
    generation++;
    eta.textContent = 'Durée restante en cours d’estimation…';
    eta.hidden = false;
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
      timer = setTimeout(refresh, response.status === 409 ? 2000 : hosted ? 0 : 150);
    } catch {
      message.textContent = 'Impossible de démarrer la mise à jour. Les données affichées sont conservées.';
      eta.hidden = true;
      button.disabled = false;
      force.disabled = false;
      timer = setTimeout(refresh, 10000);
    }
  });
  void refresh();
}
