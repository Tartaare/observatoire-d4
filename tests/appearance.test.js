import test from 'node:test';
import assert from 'node:assert/strict';
import {DEFAULT_APPEARANCE, STORAGE_KEY, normalizeHex, paletteError, contrast,
  buildTokens, readAppearance, saveAppearance, resolveTheme} from '../src/appearance/theme.js';

test('les préférences ignorent les données corrompues ou dangereuses et tolèrent un stockage bloqué', () => {
  for (const value of ['{', 'null', '[]', '{}',
    JSON.stringify({theme: 'night', palette: DEFAULT_APPEARANCE.palette}),
    JSON.stringify({theme: 'light', palette: {dark: '#18181B', light: '#FAFAFA', accent: 'url(https://example.com)'}}),
    JSON.stringify({theme: 'dark', palette: {dark: '#FAFAFA', light: '#FAFAFA', accent: '#F97316'}}),
  ]) {
    assert.deepEqual(readAppearance({getItem: () => value}), DEFAULT_APPEARANCE);
  }
  const blocked = {getItem() { throw new Error('Bloqué'); }, setItem() { throw new Error('Plein'); }};
  assert.deepEqual(readAppearance(blocked), DEFAULT_APPEARANCE);
  assert.equal(saveAppearance(DEFAULT_APPEARANCE, blocked), false);
  const memory = new Map();
  const storage = {getItem: key => memory.get(key), setItem: (key, value) => memory.set(key, value)};
  const chosen = {theme: 'dark', palette: {dark: '#101010', light: '#FFFFFF', accent: '#A855F7'}};
  assert.equal(saveAppearance(chosen, storage), true);
  assert.ok(memory.has(STORAGE_KEY));
  assert.deepEqual(readAppearance(storage), chosen);
});

test('la saisie hexadécimale est normalisée et les bases trop proches sont rejetées', () => {
  assert.equal(normalizeHex(' f97316 '), '#F97316');
  for (const value of ['#fff', '#FFFFFF00', 'red', 'url(x)', '<script>']) assert.equal(normalizeHex(value), null);
  assert.equal(paletteError(DEFAULT_APPEARANCE.palette), '');
  assert.match(paletteError({...DEFAULT_APPEARANCE.palette, dark: '#EEEEEE'}), /contraste/);
  assert.match(paletteError({...DEFAULT_APPEARANCE.palette, dark: '#FFFFFF'}), /plus foncée/);
  assert.equal(resolveTheme('system', true), 'dark');
  assert.equal(resolveTheme('system', false), 'light');
  assert.equal(resolveTheme('light', true), 'light');
});

test('les textes et commandes gardent leur contraste en clair et sombre, y compris avec des accents extrêmes', () => {
  for (const base of [DEFAULT_APPEARANCE.palette, {dark: '#404040', light: '#E0E0E0'},
    {dark: '#052E16', light: '#F0FDF4'}, {dark: '#172554', light: '#EFF6FF'}]) {
    for (const accent of ['#F97316', '#000000', '#FFFFFF', '#808080', '#0000FF', '#00FF00', '#FFFF00']) {
      const palette = {...base, accent};
      assert.equal(paletteError(palette), '');
      for (const theme of ['light', 'dark']) {
        const tokens = buildTokens(palette, theme);
        for (const bg of ['--surface', '--paper', '--quiet', '--selected']) {
          for (const ink of ['--ink', '--sub', '--accent-ink']) {
            assert.ok(contrast(tokens[bg], tokens[ink]) >= 4.5, `${theme}: ${bg}/${ink}`);
          }
          for (const ink of ['--focus', '--control-line']) assert.ok(contrast(tokens[bg], tokens[ink]) >= 3);
        }
        assert.ok(contrast(tokens['--accent'], tokens['--on-accent']) >= 4.5);
        for (let index = 0; index <= 5; index++) {
          assert.ok(contrast(tokens[`--tone${index}`], tokens[`--tone${index}-ink`]) >= 4.5);
        }
      }
    }
  }
});
