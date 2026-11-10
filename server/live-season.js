import {getMeta, collectionCoverage} from './collection-store.js';
import {projectSeason} from './season-projection.js';

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
  return projectSeason(seasonStart, standings, fixtures, sheets, participants, collectionCoverage(db, seasonStart));
}
