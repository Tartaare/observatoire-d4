import {escapeHTML} from './dom.js';

const columns = /** @type {const} */ ({
  name: 'Joueur', appearances: 'Apparitions', starts: 'Titularisations', entries: 'Entrées en jeu',
  goals: 'Buts', yellows: 'Jaunes', reds: 'Rouges',
});
/** @typedef {keyof typeof columns} StatColumn */
/** @typedef {{team: number, column: StatColumn, ascending: boolean}} StatsSelection */
/** @typedef {Exclude<StatColumn, 'name'>} Metric */
/** @typedef {import('./types.js').RosterPlayer} RosterPlayer */
/** @typedef {{name: string, status: RosterPlayer['status'] | 'event', events?: RosterPlayer['events']}} PlayerEvidence */
/** @typedef {{name: string, partialSheets: number, totals: Record<Metric, number>, unknown: Set<Metric>}} PlayerRow */
/** @param {string} key @returns {key is StatColumn} */
export const isStatColumn = key => Object.hasOwn(columns, key);

/** @param {import('./types.js').SeasonData} data @param {import('./types.js').PoolId} pool @param {number} team @param {number} day */
export function teamStats(data, pool, team, day) {
  /** @type {Map<string, PlayerRow>} */
  const players = new Map();
  let played = 0, documented = 0, partial = 0;
  for (let i = 0; i <= day; i++) {
    const match = data.matches?.[`${pool}:${team}:${i}`];
    if (match?.statusLabel !== 'Terminé') continue;
    played++;
    const eventOnly = match.eventOnly ?? [];
    if (match.roster.length || eventOnly.length) documented++;
    if (match.sheetState !== 'published') partial++;
    /** @type {Map<string, PlayerEvidence[]>} */
    const names = new Map();
    /** @type {PlayerEvidence[]} */
    const evidence = [...match.roster,
      ...eventOnly.map(p => ({...p, status: /** @type {const} */ ('event')}))];
    for (const p of evidence) {
      const key = p.name.normalize('NFKC').toLocaleLowerCase('fr').replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
      const same = names.get(key);
      if (same) same.push(p); else names.set(key, [p]);
    }
    for (const [key, group] of names) {
      const row = players.get(key) ?? {name: group[0].name, partialSheets: 0, unknown: new Set(),
        totals: {appearances: 0, starts: 0, entries: 0, goals: 0, yellows: 0, reds: 0}};
      players.set(key, row);
      if (match.sheetState !== 'published') row.partialSheets++;
      const starter = group.some(p => p.status === 'starter');
      const entered = !starter && group.some(p => p.status === 'entered' || p.status === 'unverified' && (p.events?.goals ?? 0) > 0);
      const appeared = starter || entered || group.some(p => (p.events?.goals ?? 0) > 0);
      row.totals.starts += Number(starter);
      row.totals.entries += Number(entered);
      row.totals.appearances += Number(appeared);
      if (!appeared) row.unknown.add('appearances');
      if (!starter && !entered) row.unknown.add('entries');
      if (group.every(p => p.status === 'event')) row.unknown.add('starts');
      for (const p of group) {
        for (const metric of /** @type {const} */ (['goals', 'yellows', 'reds'])) {
          row.totals[metric] += p.events?.[metric] ?? 0;
          if (!p.events?.[`${metric}Complete`]) row.unknown.add(metric);
        }
      }
    }
  }
  if (partial) {
    for (const row of players.values()) {
      if (row.partialSheets === partial) continue;
      for (const key of Object.keys(row.totals)) row.unknown.add(/** @type {Metric} */ (key));
    }
  }
  return {rows: [...players.values()], played, documented, partial};
}

/** @param {PlayerRow} row @param {Metric} key */
function cell(row, key) {
  const n = row.totals[key];
  if (!row.unknown.has(key)) return String(n);
  return n ? `≥ ${n}` : '<span class="od-unknown" title="Donnée inconnue">?</span>';
}

/** @param {PlayerRow[]} rows @param {StatsSelection} selection */
function statsTable(rows, {column, ascending}) {
  rows.sort((a, b) => {
    const names = a.name.localeCompare(b.name, 'fr');
    if (column === 'name') return ascending ? names : -names;
    const unknown = (/** @type {PlayerRow} */ r) => Number(r.unknown.has(column) && !r.totals[column]);
    return unknown(a) - unknown(b) || (ascending ? 1 : -1) * (a.totals[column] - b.totals[column]) || names;
  });
  const keys = /** @type {StatColumn[]} */ (Object.keys(columns));
  const heads = keys.map(key => {
    const active = column === key;
    return `<th scope="col"${active ? ` aria-sort="${ascending ? 'ascending' : 'descending'}"` : ''}><button type="button" data-stat-sort="${key}">${columns[key]}<span aria-hidden="true">${active ? ascending ? '↑' : '↓' : '↕'}</span></button></th>`;
  });
  return `<div class="od-stats-scroll" tabindex="0" role="region" aria-label="Statistiques par joueur"><table aria-labelledby="od-stats-title"><thead><tr>${heads.join('')}</tr></thead><tbody>${rows.map(row =>
    '<tr>' + keys.map(k => k === 'name' ? `<th scope="row">${escapeHTML(row.name)}</th>` : `<td>${cell(row, k)}</td>`).join('') + '</tr>'
  ).join('')}</tbody></table></div>`;
}

/** @param {import('./types.js').SeasonData} data @param {import('./types.js').AppState} state @param {StatsSelection} selection */
export function statsPanel(data, state, selection) {
  const {team} = selection;
  const {rows, played, documented, partial} = teamStats(data, state.pool, team, state.day);
  const name = escapeHTML(data.clubs[state.pool][team][0]);
  const missing = played - documented;
  const coverage = `${documented} / ${played} matchs terminés documentés` +
    (partial > missing ? ` · ${partial - missing} sans composition complète` : '');
  const description = data.mode === 'live' ? coverage : 'Les compositions complètes sont disponibles avec les archives réelles.';
  return `<section id="od-stats-panel" class="od-detail od-stats" aria-labelledby="od-stats-title">
    <div class="od-detail-head"><div><div class="od-match-kicker">${name} · J1 à J${state.day + 1}</div>
    <h3 id="od-stats-title">Statistiques des joueurs</h3><p>${description}</p></div>
    <button type="button" class="od-arrow" data-close aria-label="Fermer les statistiques des joueurs">×</button></div>
    ${rows.length ? '<p class="od-stats-note">0 = zéro vérifié sur les feuilles · ? = inconnu · ≥ = minimum attesté. Les noms abrégés peuvent regrouper des homonymes.</p>' + statsTable(rows, selection) :
      data.mode === 'live' ? `<p class="od-stats-note">${played ? 'Aucun nom publié dans les feuilles disponibles.' : 'Aucun match de D4 terminé à cette journée.'}</p>` : ''}
    </section>`;
}
