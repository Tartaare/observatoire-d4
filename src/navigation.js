/** @param {import('./types.js').SeasonData} data */
function storageKey(data) {
  return `observatoire-d4:navigation:v1:${data.mode ?? 'demo'}:${data.seasonStart ?? data.dates[0]}`;
}

/** @param {import('./types.js').SeasonData} data @returns {import('./types.js').AppState} */
export function restoreNavigation(data) {
  /** @type {import('./types.js').AppState} */
  const state = {pool: 'a', sort: 'rank', day: Math.max(0, data.lastPlayed), selected: null, timer: null};
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey(data)) ?? 'null');
    if (!saved || typeof saved !== 'object' || Array.isArray(saved)) return state;
    if (saved.pool === 'a' || saved.pool === 'b') state.pool = saved.pool;
    if (['rank', 'name', 'total'].includes(saved.sort)) state.sort = saved.sort;
    if (Number.isInteger(saved.day)) state.day = Math.max(0, Math.min(saved.day, data.dates.length - 1));
    const selection = saved.selected;
    if (selection && typeof selection.teamName === 'string' && Number.isInteger(selection.day)
      && selection.day >= 0 && selection.day <= state.day) {
      const team = data.clubs[state.pool].findIndex(([name]) => name === selection.teamName);
      const match = data.matches?.[`${state.pool}:${team}:${selection.day}`];
      const available = data.mode === 'live'
        ? !!match && (match.statusLabel === 'Terminé' || /^Forfait\b/i.test(match.statusLabel))
        : selection.day <= data.lastPlayed;
      if (team >= 0 && available) state.selected = {team, day: selection.day};
    }
  } catch {
    // Un stockage bloqué ou corrompu ne doit pas empêcher la consultation.
  }
  return state;
}

/** @param {import('./types.js').SeasonData} data @param {import('./types.js').AppState} state */
export function saveNavigation(data, state) {
  try {
    const {pool, sort, day, selected} = state;
    localStorage.setItem(storageKey(data), JSON.stringify({pool, sort, day, selected: selected
      ? {day: selected.day, teamName: data.clubs[pool][selected.team][0]} : null}));
  } catch {
    // La navigation reste utilisable si le navigateur refuse la persistance.
  }
}
