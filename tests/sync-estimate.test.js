import test from 'node:test';
import assert from 'node:assert/strict';
import {createTimeEstimate} from '../src/sync-panel.js';

test('la durée utilise la cadence observée et repart au changement de phase', () => {
  const estimate = createTimeEstimate();
  const state = {running: true, startedAt: 'test', phase: 'Lecture des calendriers', done: 2, total: 12};
  assert.match(estimate(state, 0), /estimation/);
  assert.match(estimate({...state, done: 4}, 5000), /Calendriers.*20 s/);
  state.phase = 'Archivage des compositions';
  assert.match(estimate(state, 10000), /estimation/);
  assert.match(estimate({...state, done: 3}, 20000), /Fin estimée.*2 min/);
  assert.equal(estimate({...state, running: false}), '');
});
