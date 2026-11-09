import test from 'node:test';
import assert from 'node:assert/strict';
import {demo} from '../server/demo.js';
import {restoreNavigation, saveNavigation} from '../src/navigation.js';

test('la navigation survit au rechargement et résiste aux changements de données et de stockage', () => {
  const descriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const entries = new Map();
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  }});
  try {
    const defaults = restoreNavigation(demo);
    assert.deepEqual(defaults, {pool: 'a', sort: 'rank', day: demo.lastPlayed, selected: null, timer: null});
    const state = {...defaults, pool: 'b', sort: 'total', day: 3, selected: {team: 1, day: 2}, timer: 42};
    saveNavigation(demo, state);
    assert.deepEqual(restoreNavigation(demo), {...state, timer: null});
    const key = [...entries.keys()][0];
    const reordered = structuredClone(demo);
    [reordered.clubs.b[0], reordered.clubs.b[1]] = [reordered.clubs.b[1], reordered.clubs.b[0]];
    assert.deepEqual(restoreNavigation(reordered).selected, {team: 0, day: 2});
    reordered.clubs.b.shift();
    assert.equal(restoreNavigation(reordered).selected, null);
    assert.equal(restoreNavigation({...demo, mode: 'live', seasonStart: 2026}).pool, 'a');
    entries.set(key, JSON.stringify({pool: 'bad', sort: 'bad', day: 999, selected: {teamName: demo.clubs.a[0][0], day: 999}}));
    assert.deepEqual(restoreNavigation(demo), {...defaults, day: demo.dates.length - 1});
    entries.set(key, JSON.stringify({pool: 'b', sort: 'name', day: -3, selected: {teamName: demo.clubs.b[0][0], day: 2}}));
    assert.deepEqual(restoreNavigation(demo), {...defaults, pool: 'b', sort: 'name', day: 0});
    for (const invalid of ['{broken', 'null', '[]', '42', '{"day":1.5}']) {
      entries.set(key, invalid);
      assert.deepEqual(restoreNavigation(demo), defaults);
    }
    const live = {...demo, mode: 'live', seasonStart: 2026, matches: {}};
    saveNavigation(live, state);
    assert.equal(restoreNavigation(live).selected, null);
    live.matches['b:1:2'] = {statusLabel: 'Terminé'};
    assert.deepEqual(restoreNavigation(live).selected, state.selected);
    live.matches['b:1:2'].statusLabel = 'Reporté';
    assert.equal(restoreNavigation(live).selected, null);
    live.matches['b:1:2'].statusLabel = 'Forfait Équipe';
    assert.deepEqual(restoreNavigation(live).selected, state.selected);
    assert.equal(restoreNavigation({...live, seasonStart: 2027}).pool, 'a');
    Object.defineProperty(globalThis, 'localStorage', {configurable: true, get() { throw new Error('Accès refusé'); }});
    assert.deepEqual(restoreNavigation(demo), defaults);
    assert.doesNotThrow(() => saveNavigation(demo, state));
    Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
      setItem() { throw new Error('Quota dépassé'); },
    }});
    assert.doesNotThrow(() => saveNavigation(demo, state));
  } finally {
    if (descriptor) Object.defineProperty(globalThis, 'localStorage', descriptor);
    else delete globalThis.localStorage;
  }
});
