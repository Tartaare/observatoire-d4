import assert from 'node:assert/strict';
import {test} from 'node:test';
import {LOGOS_KEY, readCustomLogos, saveCustomLogo} from '../src/custom-logos.js';

test('les logos personnalisés persistent, se restaurent et résistent aux données invalides', () => {
  const storageDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const windowDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'window');
  const entries = new Map();
  const events = [];
  Object.defineProperty(globalThis, 'window', {configurable: true, value: {dispatchEvent: event => events.push(event.type)}});
  Object.defineProperty(globalThis, 'localStorage', {configurable: true, value: {
    getItem: key => entries.get(key) ?? null,
    setItem: (key, value) => entries.set(key, value),
  }});
  const png = 'data:image/png;base64,iVBORw0KGgoAAA==';
  try {
    saveCustomLogo('565091', png);
    assert.equal(readCustomLogos()['565091'], png);
    assert.deepEqual(events, ['od:club-logos']);
    assert.throws(() => saveCustomLogo('565091', 'data:image/svg+xml,<svg/>'), /invalide/);
    assert.equal(readCustomLogos()['565091'], png);
    saveCustomLogo('565091', null);
    assert.deepEqual(readCustomLogos(), {});
    entries.set(LOGOS_KEY, '{');
    assert.deepEqual(readCustomLogos(), {});
    entries.set(LOGOS_KEY, JSON.stringify({'565091': png, '__bad': png, '581896': 'javascript:alert(1)'}));
    assert.deepEqual(readCustomLogos(), {'565091': png});
    Object.defineProperty(globalThis, 'localStorage', {configurable: true, get() { throw Error('blocked'); }});
    assert.deepEqual(readCustomLogos(), {});
    assert.throws(() => saveCustomLogo('565091', png), /stockage/);
  } finally {
    if (storageDescriptor) Object.defineProperty(globalThis, 'localStorage', storageDescriptor);
    else delete globalThis.localStorage;
    if (windowDescriptor) Object.defineProperty(globalThis, 'window', windowDescriptor);
    else delete globalThis.window;
  }
});
