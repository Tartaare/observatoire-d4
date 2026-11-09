import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {setImmediate as nextTurn} from 'node:timers/promises';
import {load} from 'cheerio';
import {setupSync} from '../src/sync-panel.js';

test('les actions restent dans l’en-tête et la lecture suit le tableau', async () => {
  const $ = load(await readFile(new URL('../observatoire-d4.html', import.meta.url), 'utf8'));
  for (const name of ['sync', 'sync-force', 'sync-panel', 'sync-message', 'sync-progress', 'sync-errors']) {
    assert.equal($(`header [data-${name}]`).length, 1, name);
  }
  assert.equal($('main .od-sync').length, 0);
  assert.equal($('.od-board').next().hasClass('od-replay'), true);
  assert.equal($('[data-intro-description], [data-mode-label]').length, 0);
  assert.equal($('[data-demo-label]').length, 1);
  assert.equal($('.od-footer details:not([open]) [data-method-note]').length, 1);
});

test('le suivi montre les transitions utiles sans imposer sa réouverture à chaque sondage', async t => {
  // Le contrat DOM minimal suffit ici : pas de moteur de rendu ni de dépendance ajoutée.
  class Element extends EventTarget {
    textContent = '';
    disabled = false;
    hidden = false;
    open = false;
    checked = false;
    attributes = new Map();
    children = [];
    setAttribute(name, value) { this.attributes.set(name, value); }
    removeAttribute(name) { this.attributes.delete(name); }
    replaceChildren(...children) { this.children = children; }
  }
  const elements = new Map(['sync', 'sync-force', 'sync-message', 'sync-coverage', 'sync-progress',
    'sync-errors', 'sync-error-list', 'sync-panel', 'sync-summary'].map(name => [`[data-${name}]`, new Element()]));
  const globals = {HTMLElement: Element, HTMLButtonElement: Element, HTMLInputElement: Element,
    HTMLProgressElement: Element, HTMLDetailsElement: Element, HTMLUListElement: Element,
    document: {createElement: () => new Element()}};
  const descriptors = new Map(Object.keys(globals).map(name => [name, Object.getOwnPropertyDescriptor(globalThis, name)]));
  for (const [name, value] of Object.entries(globals)) Object.defineProperty(globalThis, name, {configurable: true, value});
  const get = name => elements.get(`[data-${name}]`);
  let state = {running: false, phase: 'Prêt', done: 0, total: 2, lastSuccess: null, errors: [], coverage: {expected: 0}};
  const calls = [];
  let fail = false;
  t.mock.method(globalThis, 'fetch', async (url, options) => {
    calls.push({url, options});
    if (fail) throw new Error('Serveur coupé');
    return {ok: true, json: async () => state};
  });
  t.mock.timers.enable({apis: ['setTimeout']});
  let reloads = 0;
  try {
    setupSync({querySelector: selector => elements.get(selector)}, async () => { reloads++; });
    await nextTurn();
    assert.equal(get('sync-panel').open, false);
    assert.equal(get('sync-progress').hidden, true);
    state = {...state, running: true, phase: 'Collecte'};
    t.mock.timers.tick(30000);
    await nextTurn();
    assert.equal(get('sync-panel').open, true);
    assert.equal(get('sync').disabled, true);
    assert.equal(get('sync-force').disabled, true);
    assert.equal(get('sync-progress').hidden, false);
    get('sync-panel').open = false;
    t.mock.timers.tick(2000);
    await nextTurn();
    assert.equal(get('sync-panel').open, false);
    state = {...state, running: false, errors: [{url: '/match', message: 'Feuille indisponible'}]};
    t.mock.timers.tick(2000);
    await nextTurn();
    assert.equal(reloads, 1);
    assert.equal(get('sync-panel').open, true);
    assert.equal(get('sync-summary').textContent, 'Erreurs de collecte');
    assert.equal(get('sync-error-list').children[0].textContent, '/match — Feuille indisponible');
    get('sync-panel').open = false;
    t.mock.timers.tick(30000);
    await nextTurn();
    assert.equal(get('sync-panel').open, false);
    assert.equal(reloads, 1);
    fail = true;
    t.mock.timers.tick(30000);
    await nextTurn();
    assert.equal(get('sync-panel').open, true);
    assert.equal(get('sync-summary').textContent, 'Serveur indisponible');
    get('sync-panel').open = false;
    t.mock.timers.tick(10000);
    await nextTurn();
    assert.equal(get('sync-panel').open, false);
    get('sync-force').checked = true;
    get('sync').dispatchEvent(new Event('click'));
    assert.equal(get('sync-force').disabled, true);
    await nextTurn();
    assert.equal(calls.at(-1).url, '/api/sync?force=1');
    assert.equal(calls.at(-1).options.method, 'POST');
    assert.equal(get('sync-summary').textContent, 'Échec de la mise à jour');
    assert.equal(get('sync').disabled, false);
    assert.equal(get('sync-force').disabled, false);
  } finally {
    t.mock.timers.reset();
    for (const [name, descriptor] of descriptors) {
      if (descriptor) Object.defineProperty(globalThis, name, descriptor);
      else Reflect.deleteProperty(globalThis, name);
    }
  }
});
