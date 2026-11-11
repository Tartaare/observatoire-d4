import assert from 'node:assert/strict';
import test from 'node:test';
import {build} from 'esbuild';
import {demo} from '../server/demo.js';

test('le modèle UI distingue les états et conserve les règles de tri indépendantes du curseur', async () => {
  const output = await build({entryPoints: ['src/ui/model.ts'], bundle: true, write: false, format: 'esm', platform: 'node'});
  const {cellState, teamOrder} = await import(`data:text/javascript;base64,${Buffer.from(output.outputFiles[0].text).toString('base64')}`);
  const state = {pool: 'a', sort: 'rank', day: 5, selected: null};
  assert.equal(cellState(demo, state, 0, 0).value, '0');
  assert.equal(cellState(demo, state, 0, 0).disabled, false);
  assert.equal(cellState(demo, state, 4, 1).value, '?');
  assert.equal(cellState(demo, {...state, day: 0}, 0, 1).value, '·');
  assert.equal(cellState(demo, state, 0, 6).value, '—');
  assert.equal(cellState(demo, state, 0, 6).disabled, true);
  assert.deepEqual(teamOrder(demo, {...state, sort: 'total', day: 0}), teamOrder(demo, {...state, sort: 'total', day: 5}));
  const live = {...structuredClone(demo), mode: 'live', matches: {'a:0:0': {home: demo.clubs.a[0][0], away: 'Autre équipe', statusLabel: `Forfait ${demo.clubs.a[0][0]}`, score: '—'}}};
  live.clubs.a[0][2][0] = null;
  const forfeit = cellState(live, state, 0, 0);
  assert.equal(forfeit.value, '—');
  assert.equal(forfeit.disabled, false);
  assert.equal(forfeit.result.code, 'F');
  assert.equal(cellState(live, state, 0, 2).disabled, true);
});
