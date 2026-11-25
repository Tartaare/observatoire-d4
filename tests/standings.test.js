import assert from 'node:assert/strict';
import test from 'node:test';
import {demo} from '../server/demo.js';
import {standingsHistory} from '../src/standings.js';

test('positions cumulées par poule, confrontations directes, égalités et forfait sans score', () => {
  const names = ['A', 'B', 'C', 'D'];
  const clubs = names.map(name => [name, name, []]);
  const data = {mode: 'live', dates: Array(5).fill(null), clubs: {a: clubs, b: clubs}, matches: {}};
  function fixture(day, home, away, score, statusLabel = 'Terminé') {
    const match = {home: names[home], away: names[away], score, statusLabel};
    for (const team of [home, away]) data.matches[`a:${team}:${day}`] = match;
  }
  fixture(0, 0, 1, '1–0');
  fixture(0, 2, 3, '1–0');
  fixture(1, 1, 3, '6–0');
  fixture(1, 2, 0, '2–0');
  fixture(2, 0, 3, '—', 'Forfait A');
  fixture(3, 2, 1, '—');
  fixture(4, 0, 1, '4–0', 'Reporté');
  const history = standingsHistory(data, 'a');
  assert.deepEqual(history.map(round => round.day), [0, 1, 2]);
  assert.deepEqual(history[0].scores.slice(0, 2).map(({text, code}) => [text, code]), [['1–0', 'V'], ['0–1', 'D']]);
  assert.deepEqual(history[2].scores.map(score => score && [score.text, score.code]), [['Forf.', 'F'], null, null, ['Forf.', 'V']]);
  const ranking = day => history[day].positions.map(({team, rank, points}) => [names[team], rank, points]);
  assert.deepEqual(ranking(0), [['A', 1, 3], ['C', 1, 3], ['B', 3, 0], ['D', 3, 0]]);
  assert.deepEqual(ranking(1), [['C', 1, 6], ['A', 2, 3], ['B', 3, 3], ['D', 4, 0]]);
  assert.deepEqual(ranking(2), [['C', 1, 6], ['B', 2, 3], ['D', 3, 3], ['A', 4, 2]]);
  assert.deepEqual(standingsHistory(data, 'b'), []);
  fixture(3, 2, 1, '0–0');
  assert.deepEqual(standingsHistory(data, 'a').at(-1).scores[1], {code:'N', text:'0–0', label:'Match nul contre C, 0–0'});
  for (const pool of ['a', 'b']) {
    const demoHistory = standingsHistory(demo, pool);
    assert.equal(demoHistory.length, demo.lastPlayed + 1);
    assert.equal(demoHistory[0].positions.length, demo.clubs[pool].length);
  }
});
