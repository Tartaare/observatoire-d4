import {escapeHTML as escape} from './dom.js';

const dateFormat = new Intl.DateTimeFormat('fr-FR', {day: 'numeric', month: 'short', timeZone: 'UTC'});
/** @param {string | null} value */
const dateLabel = value => value ? dateFormat.format(new Date(value)) : 'Date à confirmer';
/** @param {'starter' | 'entered' | 'unverified'} status */
const statusLabel = status => ({starter: 'Titulaire', entered: 'Entrée en jeu attestée', unverified: 'Remplaçant · participation non attestée'})[status];

/** @param {import('./types.js').LiveMatch} match */
export function liveDetail(match) {
  const description = /^Forfait\b/i.test(match.statusLabel) ? `${match.statusLabel}. Aucune participation jouée retenue.`
    : match.sheetState === 'uncollected' ? 'Feuille non encore archivée.' : match.sheetState === 'missing'
    ? 'Composition non publiée par la source.' : match.sheetState === 'partial' ? 'Composition partielle : le total reste inconnu.'
      : `${match.count} repérage${match.count === 1 ? '' : 's'} à confirmer parmi les participations attestées.`;
  const roster = match.roster.map(player => {
    const history = player.history.map(item => `<li>${escape(dateLabel(item.date))} · <b>${escape(item.division)}</b> · ${escape(item.team)}
      <span class="od-evidence">Même club</span>
      <details data-archive-url="${escape(item.sourceURL)}"><summary class="cursor-interaction">Composition archivée</summary><div data-archive-content></div></details>
      <a href="${escape(item.sourceURL)}" target="_blank" rel="noopener noreferrer">Source en ligne ↗</a></li>`).join('');
    const movement = [player.entry ? `Entrée ${player.entry}′` : '', player.exit ? `Sortie ${player.exit}′` : ''].filter(Boolean).join(' · ');
    return `<details><summary class="cursor-interaction"><strong>${escape(player.name)}</strong><span class="od-player-status">${escape(statusLabel(player.status))}</span>
      ${history && player.status !== 'unverified' ? '<span class="od-division">À confirmer</span>' : ''}</summary>
      ${movement ? `<p>${escape(movement)}</p>` : ''}${history ? `<ul>${history}</ul>` : '<p>Aucune correspondance antérieure dans les feuilles archivées.</p>'}</details>`;
  }).join('');
  return `<div class="od-detail-head"><div><div class="od-match-kicker">${escape(dateLabel(match.matchDate))} · ARCHIVE LOCALE</div>
    <h3 id="od-match-title">${escape(match.home)} ${escape(match.score)} ${escape(match.away)}</h3><p>${escape(description)}</p></div>
    <button type="button" class="od-arrow cursor-interaction" data-close aria-label="Fermer le détail">×</button></div>
    ${match.retained ? '<p class="od-archive-note">La dernière lecture était incomplète. La composition précédente est conservée.</p>' : ''}
    <p class="od-archive-note">Noms abrégés : une correspondance ne certifie pas l’identité. Les feuilles manquantes peuvent masquer des antécédents.</p>
    ${roster ? `<div class="od-detail-list">${roster}</div>` : ''}
    <a href="${escape(match.sourceURL)}" target="_blank" rel="noopener noreferrer">Feuille source en ligne ↗</a>`;
}

/** @param {HTMLElement} root @param {AbortSignal} signal */
export function bindArchives(root, signal) {
  root.addEventListener('toggle', async event => {
    const detail = event.target;
    if (!(detail instanceof HTMLDetailsElement) || !detail.open || !detail.dataset.archiveUrl || detail.dataset.loaded) return;
    const content = detail.querySelector('[data-archive-content]');
    if (!content) return;
    detail.dataset.loaded = 'loading';
    content.setAttribute('role', 'status');
    content.textContent = 'Lecture de l’archive locale…';
    try {
      const response = await fetch(`/api/sheet?url=${encodeURIComponent(detail.dataset.archiveUrl)}`, {signal: AbortSignal.any([signal, AbortSignal.timeout(8000)])});
      if (!response.ok) throw new Error('Archive indisponible.');
      const archive = await response.json();
      const fragment = document.createDocumentFragment();
      for (const sheet of archive.sheets) {
        const heading = document.createElement('p');
        heading.textContent = `${sheet.name} · ${sheet.state === 'published' ? 'Composition publiée' : sheet.state === 'partial' ? 'Composition partielle' : 'Composition manquante'}`;
        const list = document.createElement('ul');
        for (const player of sheet.players) {
          const row = document.createElement('li');
          row.textContent = `${player.name} · ${statusLabel(player.status)}`;
          list.append(row);
        }
        fragment.append(heading, list);
      }
      content.replaceChildren(fragment);
      content.removeAttribute('role');
      detail.dataset.loaded = 'true';
    } catch {
      content.textContent = 'Lecture locale impossible. Fermez puis rouvrez ce détail pour réessayer.';
      delete detail.dataset.loaded;
    }
  }, {capture: true, signal});
}
