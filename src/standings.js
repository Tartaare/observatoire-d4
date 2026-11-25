import {createSeason, matchResult, scoreGoals, teamKey} from './season.js';

/** @typedef {{opponent: number, points: number, difference: number, goals: number}} TeamResult */
/** @typedef {{team: number, rank: number, points: number}} Position */
/** @typedef {{text: string, code: 'V' | 'N' | 'D' | 'F', label: string}} TeamScore */
/** @typedef {{day: number, positions: Position[], scores: (TeamScore | null)[]}} RoundStanding */

const matchPoints = {V: 3, N: 1, D: 0, F: -1};

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
    /** @type {(TeamScore | null)[]} */
    const scores = teams.map(() => null);
    for (let team = 0; team < teams.length; team++) {
      if (scores[team]) continue;
      const archive = data.matches?.[`${pool}:${team}:${day}`];
      const match = demo && day <= data.lastPlayed ? demo.matchAt(day, team, pool) : archive;
      if (!match) continue;
      const home = indices.get(teamKey(match.home)), away = indices.get(teamKey(match.away));
      if (home === undefined || away === undefined || home === away || team !== home && team !== away) continue;
      const goals = scoreGoals(match.score);
      for (const [side, index, opponent] of [[0, home, away], [1, away, home]]) {
        const outcome = matchResult(match, teams[index][0]);
        if (!outcome) continue;
        const scored = goals?.[side] ?? 0, conceded = goals?.[1 - side] ?? 0;
        const text = goals ? `${scored}–${conceded}` : 'Forf.';
        scores[index] = {text, code: outcome.code, label: `${outcome.label} contre ${teams[opponent][0]}${goals ? ', ' + text : ', score non publié'}`};
        results[index].push({opponent, points: matchPoints[outcome.code], difference: scored - conceded, goals: scored});
      }
    }
    if (scores.some(Boolean)) history.push({day, positions: rankTeams(results), scores});
  }
  return history;
}
