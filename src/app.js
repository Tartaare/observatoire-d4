import {startObservatory} from './controller.js';
import {query} from './dom.js';
import {validateSeason} from './season.js';
import {setupSync} from './sync-panel.js';

const root = query(document, '#observatoire-d4', HTMLElement);
const main = query(root, 'main', HTMLElement);
const status = query(root, '[data-status]', HTMLElement);
const message = query(root, '[data-status-message]', HTMLElement);
const content = query(root, '[data-content]', HTMLElement);
const retry = query(root, '[data-retry]', HTMLButtonElement);
/** @type {(() => void) | null} */
let dispose = null;

async function loadSeason() {
  retry.hidden = true;
  main.setAttribute('aria-busy', 'true');
  status.setAttribute('role', 'status');
  message.textContent = 'Chargement de la saison…';
  try {
    const response = await fetch('/api/season', {signal: AbortSignal.timeout(8000)});
    if (!response.ok) throw new Error(`Lecture impossible (${response.status}).`);
    const data = validateSeason(await response.json());
    if (Object.values(data.clubs).every(teams => teams.length === 0)) {
      message.textContent = 'Aucune équipe disponible pour cette saison.';
      return;
    }
    dispose?.();
    query(root, '[data-pool]', HTMLSelectElement).value = 'a';
    query(root, '[data-sort]', HTMLSelectElement).value = 'rank';
    content.hidden = false;
    dispose = startObservatory(root, data);
    query(root, '[data-mode-label]', HTMLElement).textContent = data.mode === 'live' ? 'Archives locales' : 'Démonstration';
    if (data.mode === 'live') {
      query(root, '[data-season-label]', HTMLElement).textContent = `SAISON ${data.seasonStart}–${Number(data.seasonStart) + 1}`;
      query(root, '[data-intro-description]', HTMLElement).textContent = 'Seniors masculins · repérages en division supérieure au sein du même club, à confirmer.';
      query(root, '[data-legend-label]', HTMLElement).textContent = 'Repérages connus';
    } else {
      query(root, '[data-intro-description]', HTMLElement).textContent = 'Données de démonstration. Lancez une mise à jour pour afficher les feuilles réelles.';
    }
    status.hidden = true;
  } catch (error) {
    content.hidden = true;
    status.hidden = false;
    status.setAttribute('role', 'alert');
    message.textContent = location.protocol === 'file:'
      ? 'Lancez npm start, puis ouvrez http://127.0.0.1:3000 pour accéder à la saison.'
      : 'La saison est indisponible. Vérifiez le serveur local puis réessayez.';
    retry.hidden = false;
    console.error('Chargement de la saison :', error);
  } finally {
    main.setAttribute('aria-busy', 'false');
  }
}

retry.addEventListener('click', loadSeason);
loadSeason();
setupSync(root, loadSeason);
