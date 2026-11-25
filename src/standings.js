import {createSeason, matchResult, scoreGoals, teamKey} from './season.js';

/** @typedef {{opponent: number, points: number, difference: number, goals: number}} TeamResult */
/** @typedef {{team: number, rank: number, points: number}} Position */
/** @typedef {{day: number, positions: Position[]}} RoundStanding */

/** @param {TeamResult[][]} results @returns {Position[]} */
function rankTeams(results) {
  const totals = results.map(games => games.reduce((sum, game) => ({
    points: sum.points + game.points, difference: sum.difference + game.difference, goals: sum.goals + game.goals
  }), {points: 0, difference: 0, goals: 0}));
  const rows = totals.map((total, team) => {
    const headToHead = results[team].filter(game => totals[game.opponent].points === total.points);
    return {team, points: total.points, directPoints: headToHead.reduce((sum, game) => sum + game.points, 0),
      directDifference: headToHead.reduce((sum, game) => sum + game.difference, 0),
      difference: total.difference, goals: total.goals};
  });
  /** @param {typeof rows[number]} a @param {typeof rows[number]} b */
  const compare = (a, b) => b.points - a.points || b.directPoints - a.directPoints ||
    b.directDifference - a.directDifference || b.difference - a.difference || b.goals - a.goals;
  rows.sort(compare);
  let rank = 1;
  return rows.map((row, index) => {
    if (index && compare(row, rows[index - 1])) rank = index + 1;
    return {team: row.team, rank, points: row.points};
  });
}

/** @param {import('./types.js').SeasonData} data @param {import('./types.js').PoolId} pool @returns {RoundStanding[]} */
export function standingsHistory(data, pool) {
  const teams = data.clubs[pool];
  const indices = new Map(teams.map(([name], index) => [teamKey(name), index]));
  const demo = data.mode === 'live' ? null : createSeason(data);
  /** @type {TeamResult[][]} */
  const results = teams.map(() => []);
  /** @type {RoundStanding[]} */
  const history = [];
  for (let day = 0; day < data.dates.length; day++) {
    const seen = new Set();
    for (let team = 0; team < teams.length; team++) {
      if (seen.has(team)) continue;
      const archive = data.matches?.[`${pool}:${team}:${day}`];
      const match = demo && day <= data.lastPlayed ? demo.matchAt(day, team, pool) : archive;
      if (!match) continue;
      const home = indices.get(teamKey(match.home)), away = indices.get(teamKey(match.away));
      if (home === undefined || away === undefined || home === away || team !== home && team !== away) continue;
      const outcome = matchResult(match, match.home);
      if (!outcome) continue;
      const [homeGoals, awayGoals] = scoreGoals(match.score) ?? [0, 0];
      const forfeited = /^Forfait\b/i.test(archive?.statusLabel ?? '');
      const homePoints = outcome.code === 'V' ? 3 : outcome.code === 'N' ? 1 : outcome.code === 'F' ? -1 : 0;
      const awayPoints = outcome.code === 'V' ? (forfeited ? -1 : 0) : outcome.code === 'N' ? 1 : 3;
      results[home].push({opponent: away, points: homePoints, difference: homeGoals - awayGoals, goals: homeGoals});
      results[away].push({opponent: home, points: awayPoints, difference: awayGoals - homeGoals, goals: awayGoals});
      seen.add(home);
      seen.add(away);
    }
    if (seen.size) history.push({day, positions: rankTeams(results)});
  }
  return history;
}
