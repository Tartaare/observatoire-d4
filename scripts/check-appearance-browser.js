import assert from 'node:assert/strict';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createApp} from '../server/index.js';
import {STORAGE_KEY} from '../src/appearance/theme.js';

// Profil de test isolé et données synthétiques : aucune préférence utilisateur ni collecte réelle.
const server = createApp({databasePath: ':memory:'});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Port de test indisponible.');
const origin = `http://127.0.0.1:${address.port}`;
const directory = new URL('../artifacts/appearance/', import.meta.url);
await mkdir(directory, {recursive: true});
let browser;
try {
  browser = await chromium.launch({headless: true,
    channel: process.env.BROWSER_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : undefined)});
  const context = await browser.newContext({viewport: {width: 1440, height: 900}, colorScheme: 'light'});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await page.goto(origin);
  await page.getByRole('button', {name: 'Paramètres d’apparence'}).waitFor();
  await page.locator('tbody tr').first().waitFor();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'light');
  await page.screenshot({path: fileURLToPath(new URL('desktop-light.png', directory))});
  await page.getByRole('button', {name: 'Activer le mode sombre'}).click();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.reload();
  await page.getByRole('button', {name: 'Activer le mode clair'}).waitFor();
  assert.equal(await page.locator('html').getAttribute('data-theme'), 'dark');
  await page.screenshot({path: fileURLToPath(new URL('desktop-dark.png', directory))});

  await page.getByRole('button', {name: 'Paramètres d’apparence'}).click();
  const dialog = page.getByRole('dialog', {name: 'Apparence'});
  await dialog.waitFor();
  assert.deepEqual(errors, [], 'Aucune erreur JS ou CSP à l’ouverture');
  await page.screenshot({path: fileURLToPath(new URL('settings-dark.png', directory))});
  for (let step = 0; step < 18; step++) {
    await page.keyboard.press('Tab');
    assert.equal(await page.evaluate(() => !!document.activeElement?.closest('[role=dialog]')), true, 'Focus confiné dans la modale');
  }
  await page.getByLabel('Couleur d’accent', {exact: true}).fill('#EA580C');
  await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--accent') === '#EA580C');
  await page.getByLabel('Couleur sombre', {exact: true}).fill('#252525');
  await page.waitForFunction(() => getComputedStyle(document.documentElement).getPropertyValue('--surface') === '#252525');
  await page.getByLabel('Couleur claire', {exact: true}).fill('#FFFFFF');
  await page.getByLabel('Couleur sombre', {exact: true}).fill('#FFFFFF');
  assert.match(await page.getByRole('alert').textContent(), /plus foncée/);
  assert.equal(await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--surface')), '#252525');
  await page.keyboard.press('Escape');
  await dialog.waitFor({state: 'hidden'});
  assert.equal(await page.getByRole('button', {name: 'Paramètres d’apparence'}).evaluate(element => element === document.activeElement), true);
  await page.reload();
  await page.getByRole('button', {name: 'Paramètres d’apparence'}).click();
  assert.equal(await page.getByLabel('Couleur sombre', {exact: true}).inputValue(), '#252525');
  assert.equal(await page.getByLabel('Couleur claire', {exact: true}).inputValue(), '#FFFFFF');
  assert.equal(await page.getByLabel('Couleur d’accent', {exact: true}).inputValue(), '#EA580C');

  await page.getByRole('radio', {name: 'Système', exact: true}).check();
  await page.emulateMedia({colorScheme: 'light'});
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'light');
  await page.emulateMedia({colorScheme: 'dark'});
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await page.getByRole('button', {name: 'Réinitialiser'}).click();
  assert.equal(await page.getByLabel('Couleur d’accent', {exact: true}).inputValue(), '#F97316');
  await page.getByRole('radio', {name: 'Clair', exact: true}).check();
  await page.screenshot({path: fileURLToPath(new URL('settings-light.png', directory))});
  await page.getByRole('button', {name: 'Terminé', exact: true}).click();

  const sibling = await context.newPage();
  await sibling.goto(origin);
  await sibling.getByRole('button', {name: 'Activer le mode sombre'}).click();
  await page.waitForFunction(() => document.documentElement.dataset.theme === 'dark');
  await sibling.close();
  const touchContext = await browser.newContext({viewport: {width: 390, height: 844},
    isMobile: true, hasTouch: true, colorScheme: 'dark'});
  const mobile = await touchContext.newPage();
  mobile.on('pageerror', error => errors.push(error.message));
  mobile.on('console', message => { if (message.type() === 'error') errors.push(message.text()); });
  await mobile.goto(origin);
  await mobile.getByRole('button', {name: 'Paramètres d’apparence'}).waitFor();
  await mobile.locator('tbody tr').first().waitFor();
  assert.ok((await mobile.locator('tbody tr').first().boundingBox()).height >= 48, 'Lignes tactiles de 48 px');
  for (const width of [390, 320]) {
    await mobile.setViewportSize({width, height: 844});
    assert.equal(await mobile.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true, `Page sans débordement à ${width}px`);
    await mobile.getByRole('button', {name: 'Paramètres d’apparence'}).click();
    const mobileDialog = mobile.getByRole('dialog', {name: 'Apparence'});
    await mobile.screenshot({path: fileURLToPath(new URL(`settings-${width}.png`, directory))});
    const bounds = await mobileDialog.boundingBox();
    assert.ok(bounds && bounds.x >= 0 && bounds.x + bounds.width <= width, JSON.stringify({width, bounds}));
    assert.ok(bounds.y >= 0 && bounds.y + bounds.height <= 844);
    await mobile.getByLabel('Couleur d’accent', {exact: true}).fill('#E97416');
    const doneBounds = await mobile.getByRole('button', {name: 'Terminé', exact: true}).boundingBox();
    assert.ok(doneBounds && doneBounds.height >= 44 && doneBounds.y >= 0 && doneBounds.y + doneBounds.height <= 844,
      'Le bouton Terminé reste visible et tactile dans la modale');
    await mobile.getByRole('button', {name: 'Terminé', exact: true}).click();
    await mobile.screenshot({path: fileURLToPath(new URL(`mobile-${width}.png`, directory)), fullPage: true});
    await mobile.getByRole('button', {name: 'Paramètres d’apparence'}).click();
    await mobile.screenshot({path: fileURLToPath(new URL(`settings-${width}.png`, directory))});
    await mobile.keyboard.press('Escape');
  }
  await touchContext.close();

  const blocked = await browser.newContext();
  await blocked.addInitScript(() => {
    Object.defineProperty(window, 'localStorage', {get() { throw new Error('Stockage bloqué pour le test'); }});
  });
  const blockedPage = await blocked.newPage();
  blockedPage.on('pageerror', error => errors.push(error.message));
  await blockedPage.goto(origin);
  await blockedPage.getByRole('button', {name: 'Paramètres d’apparence'}).click();
  await blockedPage.getByRole('radio', {name: 'Sombre', exact: true}).check();
  assert.match(await blockedPage.locator('.od-settings-feedback').textContent(), /stockage.*indisponible/);
  await blocked.close();

  await page.evaluate(key => localStorage.setItem(key, '{corrompu'), STORAGE_KEY);
  await page.reload();
  await page.getByRole('button', {name: 'Paramètres d’apparence'}).click();
  assert.equal(await page.getByLabel('Couleur d’accent', {exact: true}).inputValue(), '#F97316');
  assert.deepEqual(errors, [], 'Aucune erreur JS ou violation CSP');
  console.log('Parcours navigateur réussis : thèmes, palette, clavier, persistance, multi-onglets, stockage bloqué et portrait 320/390 px.');
} finally {
  await browser?.close();
  server.close();
  await once(server, 'close');
}
