/** @param {import("./types.js").Club[]} teams @param {boolean} pinExample @param {number} lastPlayed @returns {[number, number][][]} */
export function buildSchedule(teams, pinExample, lastPlayed) {
  let rotation = teams.map((_, index) => index);
  /** @type {[number, number][][]} */
  const legs = [];
  for (let round = 0; round < teams.length - 1; round++) {
    /** @type {[number, number][]} */
    const games = [];
    for (let position = 0; position < teams.length / 2; position++) {
      /** @type {[number, number]} */
      const pair = [rotation[position], rotation[teams.length - 1 - position]];
      games.push(round % 2 ? [pair[1], pair[0]] : pair);
    }
    legs.push(games);
    rotation = [rotation[0], rotation[rotation.length - 1], ...rotation.slice(1, -1)];
  }
  if (pinExample) {
    const round = legs.findIndex((games) => games.some((pair) => pair.includes(0) && pair.includes(2)));
    [legs[round], legs[lastPlayed]] = [legs[lastPlayed], legs[round]];
    const example = legs[lastPlayed].findIndex((pair) => pair.includes(0));
    legs[lastPlayed][example] = [0, 2];
  }
  return [...legs, ...legs.map((games) => games.map(([home, away]) => /** @type {[number, number]} */ ([away, home])))];
}

/** @param {import("./types.js").SeasonData} data */
export function createSeason(data) {
  if (data.mode === 'live') {
    return {matchAt: (/** @type {number} */ day, /** @type {number} */ team, /** @type {import('./types.js').PoolId} */ pool) => {
      const match = data.matches?.[`${pool}:${team}:${day}`];
      if (!match || match.statusLabel !== 'Terminé') throw new RangeError('Feuille jouée non disponible.');
      return match;
    }};
  }
  const {dates, clubs, lastPlayed, examplePlayers, exampleSources, mockNames} = data;
  const shortDate = new Intl.DateTimeFormat("fr-FR", {day:"numeric",month:"short",timeZone:"UTC"});
  const schedules = {a:buildSchedule(clubs.a, true, lastPlayed), b:buildSchedule(clubs.b, false, lastPlayed)};
  /** @param {number} day @param {number} team @param {import("./types.js").PoolId} pool */
  function matchAt(day, team, pool) {
    const teams = clubs[pool];
    const fixture = schedules[pool][day]?.find((pair) => pair.includes(team));
    if (!fixture || day > lastPlayed) throw new RangeError('Match joué introuvable.');
    const [home, away] = fixture;
    const featured = pool === "a" && day === lastPlayed && home === 0 && away === 2;
    const realSheet = featured && team === 0;
    const count = teams[team][2][day];
    const score = featured ? "2–2" : ((home + day * 2) % 5) + "–" + ((away + day * 3) % 4);
    /** @type {import('./types.js').Player[]} */
    const players = realSheet ? examplePlayers : Array.from({length: count ?? 0}, (_, index) => {
      const prior = new Date(dates[day] ?? '');
      prior.setUTCDate(prior.getUTCDate() - 7 - index);
      const level = ["D3","D1","D3","R3"][(team + index) % 4];
      return [mockNames[(team * 3 + index) % mockNames.length], index % 3 ? "Remplaçant" : "Titulaire", [[shortDate.format(prior),level,"Feuille de championnat · simulation"]]];
    });
    return {count,score,home:teams[home][0],away:teams[away][0],players,featured,realSheet};
}


return {matchAt};
}

/** @param {unknown} value @returns {import('./types.js').SeasonData} */
export function validateSeason(value) {
  const invalid = () => { throw new TypeError('Format de saison invalide.'); };
  if (!value || typeof value !== 'object') return invalid();
  const data = /** @type {import('./types.js').SeasonData} */ (value);
  const strings = (/** @type {unknown} */ list) => Array.isArray(list) && list.every(item => typeof item === 'string' && item.length > 0);
  const live = data.mode === 'live';
  if (!Array.isArray(data.dates) || !data.dates.length || data.dates.length > 99 || (!live && data.dates.length !== 14) || !data.dates.every(date =>
    live && date === null || typeof date === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(date) &&
    Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date)) return invalid();
  if (!Number.isInteger(data.lastPlayed) || data.lastPlayed < (live ? -1 : 0) || data.lastPlayed >= (live ? data.dates.length : 7)) return invalid();
  if (!data.clubs || typeof data.clubs !== 'object') return invalid();
  const empty = Array.isArray(data.clubs.a) && Array.isArray(data.clubs.b) && data.clubs.a.length === 0 && data.clubs.b.length === 0;
  for (const pool of ['a', 'b']) {
    const teams = data.clubs[/** @type {import('./types.js').PoolId} */ (pool)];
    if (!Array.isArray(teams) || teams.length > 40 || (!live && !empty && teams.length !== 8)) return invalid();
    for (const team of teams) {
      if (!Array.isArray(team) || team.length !== 3 || !strings(team.slice(0, 2)) ||
        !Array.isArray(team[2]) || team[2].length !== (live ? data.dates.length : data.lastPlayed + 1) ||
        !team[2].every(count => count === null || (Number.isInteger(count) && count >= 0 && count <= 30))) return invalid();
    }
  }
  if (!strings(data.mockNames) || (!live && data.mockNames.length === 0) || !Array.isArray(data.examplePlayers)) return invalid();
  for (const player of data.examplePlayers) {
    if (!Array.isArray(player) || player.length !== 3 || !strings(player.slice(0, 2)) || !Array.isArray(player[2])) return invalid();
    for (const history of player[2]) if (!Array.isArray(history) || history.length !== 3 || !strings(history)) return invalid();
  }
  if (!data.exampleSources || typeof data.exampleSources !== 'object' || Array.isArray(data.exampleSources)) return invalid();
  for (const link of [data.exampleURL, ...Object.values(data.exampleSources)]) {
    if (typeof link !== 'string') return invalid();
    let url;
    try { url = new URL(link); } catch { return invalid(); }
    if (url.protocol !== 'https:' || url.username || url.password || !['leonzelotois.fr', 'epreuves.fff.fr'].includes(url.hostname)) return invalid();
  }
  if (live) validateLiveMatches(data);
  return data;
}

/** @param {import('./types.js').SeasonData} data */
function validateLiveMatches(data) {
  const invalid = () => { throw new TypeError('Format des feuilles archivées invalide.'); };
  if (!Number.isInteger(data.seasonStart) || !data.matches || typeof data.matches !== 'object' || Array.isArray(data.matches)) return invalid();
  const validText = (/** @type {unknown} */ value) => typeof value === 'string' && value.length > 0 && value.length <= 300;
  const validURL = (/** @type {unknown} */ value) => typeof value === 'string' && /^https:\/\/leonzelotois\.fr\/matchs\/[a-z0-9-]+\/$/.test(value);
  const validDate = (/** @type {unknown} */ value) => typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value) &&
    Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0, 10) === value;
  for (const [key, match] of Object.entries(data.matches)) {
    if (!/^[ab]:\d+:\d+$/.test(key) || !match || !validURL(match.sourceURL)) return invalid();
    const [pool, team, day] = key.split(':');
    if (!data.clubs[/** @type {import('./types.js').PoolId} */ (pool)][Number(team)] || Number(day) >= data.dates.length) return invalid();
    if (!validText(match.home) || !validText(match.away) || !validText(match.score) || !validText(match.statusLabel) ||
      match.matchDate !== null && !validDate(match.matchDate) ||
      !['published', 'partial', 'missing', 'uncollected'].includes(match.sheetState) || !Array.isArray(match.roster) || match.roster.length > 50) return invalid();
    if (match.count !== null && (!Number.isInteger(match.count) || match.count < 0 || match.count > 30)) return invalid();
    if (match.count !== data.clubs[/** @type {import('./types.js').PoolId} */ (pool)][Number(team)][2][Number(day)]) return invalid();
    for (const player of match.roster) {
      if (!validText(player.name) || !['starter', 'entered', 'unverified'].includes(player.status) || !Array.isArray(player.history)) return invalid();
      for (const history of player.history) {
        if (!validDate(history.date) || !['L1', 'L2', 'N1', 'N2', 'N3', 'R1', 'R2', 'R3', 'D1', 'D2', 'D3'].includes(history.division) ||
          !validText(history.team) || !validURL(history.sourceURL) ||
          !match.matchDate || history.date >= match.matchDate) return invalid();
      }
    }
  }
}
