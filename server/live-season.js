import {getMeta, collectionCoverage} from './collection-store.js';
import {normalizeName} from './source.js';

/** @param {import('node:sqlite').DatabaseSync} db @param {number} seasonStart @returns {import('../src/types.js').SeasonData | null} */
export function readLiveSeason(db, seasonStart) {
  /** @type {import('./collection-types.js').Standing[]} */
  const standings = getMeta(db, `standings:${seasonStart}`, []);
  if (!standings.length) return null;
  const fixtures = db.prepare('SELECT * FROM collected_fixtures WHERE season=? ORDER BY round,url').all(seasonStart);
  const d4 = fixtures.filter(row => row.division === 'D4');
  if (!d4.length) return null;
  const sheets = db.prepare(`SELECT s.* FROM collected_sheets s JOIN collected_fixtures f ON f.url=s.match_url WHERE f.season=?`).all(seasonStart);
  const participants = db.prepare(`SELECT p.*,s.club_url,f.division,f.date,f.url FROM collected_players p
    JOIN collected_sheets s ON s.match_url=p.match_url AND s.side=p.side
    JOIN collected_fixtures f ON f.url=p.match_url WHERE f.season=? AND f.status='Terminé'
    ORDER BY f.date DESC,p.ordinal`).all(seasonStart);
  const sheetMap = new Map(sheets.map(sheet => [`${sheet.match_url}:${sheet.side}`, sheet]));
  /** @type {Map<string, typeof participants>} */
  const rosterMap = new Map(), historyMap = new Map();
  for (const player of participants) {
    const key = `${player.match_url}:${player.side}`;
    if (!rosterMap.has(key)) rosterMap.set(key, []);
    rosterMap.get(key).push(player);
    if (player.division !== 'D4' && player.status !== 'unverified' && player.date && player.club_url) {
      const name = `${player.club_url}\0${player.name_key}`;
      if (!historyMap.has(name)) historyMap.set(name, []);
      historyMap.get(name).push(player);
    }
  }
  const rounds = Math.max(...d4.map(row => Number(row.round)));
  const lastPlayed = Math.max(-1, ...d4.filter(row => row.status === 'Terminé').map(row => Number(row.round) - 1));
  const dates = Array.from({length: rounds}, (_, day) => {
    const values = d4.filter(row => Number(row.round) === day + 1 && row.date).map(row => String(row.date)).sort();
    return values[0] ?? null;
  });
  /** @type {import('../src/types.js').SeasonData['clubs']} */
  const clubs = {a: [], b: []};
  /** @type {Record<string, import('../src/types.js').LiveMatch>} */
  const matches = {};
  for (const standing of [...standings].sort((a, b) => a.rank - b.rank)) {
    const team = clubs[standing.pool].length;
    /** @type {(number | null)[]} */
    const counts = Array.from({length: rounds}, () => null);
    const initials = standing.name.split(/[\s.-]+/).filter(Boolean).slice(0, 2).map(word => word[0]).join('').toUpperCase();
    clubs[standing.pool].push([standing.name, initials, counts]);
    for (const fixture of d4.filter(row => [row.home, row.away].some(name => normalizeName(String(name)) === normalizeName(standing.name)))) {
      const day = Number(fixture.round) - 1;
      const side = normalizeName(String(fixture.home)) === normalizeName(standing.name) ? 0 : 1;
      const sheet = sheetMap.get(`${fixture.url}:${side}`);
      const players = rosterMap.get(`${fixture.url}:${side}`) ?? [];
      const roster = players.map(player => {
        const historyKey = sheet?.club_url ? `${sheet.club_url}\0${player.name_key}` : null;
        const history = (historyKey ? historyMap.get(historyKey) ?? [] : []).filter(previous =>
          fixture.date && String(previous.date) < String(fixture.date) && previous.url !== fixture.url);
        const unique = [...new Map(history.map(item => [String(item.url), item])).values()];
        return {name: String(player.name), status: /** @type {import('../src/types.js').RosterPlayer['status']} */ (player.status),
          shirt: player.shirt === null ? null : Number(player.shirt), entry: player.entry ? String(player.entry) : null,
          exit: player.exit ? String(player.exit) : null,
          history: unique.map(previous => ({date: String(previous.date), division: String(previous.division),
            team: String(sheetMap.get(`${previous.url}:${previous.side}`)?.name ?? ''), sourceURL: String(previous.url)}))};
      });
      const candidates = new Set(roster.filter(player => player.status !== 'unverified' && player.history.length).map(player => normalizeName(player.name)));
      const count = sheet?.state === 'published' && fixture.status === 'Terminé' ? candidates.size : null;
      counts[day] = count;
      const key = `${standing.pool}:${team}:${day}`;
      if (matches[key]) throw new Error('Plusieurs rencontres pour une équipe sur une même journée : calendrier à vérifier.');
      matches[key] = {count, score: String(fixture.score ?? '—'), home: String(fixture.home), away: String(fixture.away),
        players: [], featured: false, realSheet: false, sourceURL: String(fixture.url),
        matchDate: fixture.date ? String(fixture.date) : null, statusLabel: String(fixture.status),
        sheetState: sheet ? /** @type {'published' | 'partial' | 'missing'} */ (sheet.state) : 'uncollected',
        retained: Boolean(sheet && sheet.latest_state !== sheet.state), roster};
    }
  }
  return {mode: 'live', seasonStart, lastPlayed, dates, clubs, matches, coverage: collectionCoverage(db, seasonStart),
    examplePlayers: [], exampleURL: 'https://leonzelotois.fr/division/d4/', exampleSources: {}, mockNames: []};
}
