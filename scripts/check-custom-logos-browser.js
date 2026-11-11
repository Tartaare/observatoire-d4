import assert from 'node:assert/strict';
import {once} from 'node:events';
import {fileURLToPath} from 'node:url';
import {mkdir} from 'node:fs/promises';
import {chromium} from 'playwright';
import {createApp} from '../server/index.js';

const server = createApp({databasePath: ':memory:'});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw Error('Port indisponible.');
const origin = `http://127.0.0.1:${address.port}`;
await mkdir(new URL('../artifacts/appearance/', import.meta.url), {recursive: true});
let browser;
try {
  browser = await chromium.launch({headless: true, channel: process.env.BROWSER_CHANNEL ?? 'msedge'});
  const context = await browser.newContext({viewport: {width: 1440, height: 900}, colorScheme: 'dark'});
  const page = await context.newPage();
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => {
    if (message.type() === 'error' && !message.location().url.endsWith('/favicon.ico')) errors.push(message.text() + ' ' + message.location().url);
  });
  await page.goto(origin);
  await page.locator('.od-crest img').first().waitFor();
  const second = await context.newPage();
  await second.goto(origin);
  await second.locator('.od-crest img').first().waitFor();
  await page.getByRole('button', {name: 'Paramètres d’apparence'}).click();
  await page.getByText('Logos des clubs', {exact: true}).click();
  await page.getByLabel('Club à personnaliser').selectOption('581896');
  // Image de test : centre rouge, bordure entièrement transparente.
  const png = await page.evaluate(() => {
    const canvas = document.createElement('canvas'); canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext('2d'); ctx.fillStyle = '#ff0000'; ctx.fillRect(100, 50, 300, 150);
    return canvas.toDataURL('image/png').split(',')[1];
  });
  const file = {name: 'logo.png', mimeType: 'image/png', buffer: Buffer.from(png, 'base64')};
  await page.getByLabel('Importer une image', {exact: true}).setInputFiles(file);
  const badge = '.od-crest[data-club-name="Élan Marivalois 4"]';
  await page.waitForFunction(selector => document.querySelector(selector + ' img')?.getAttribute('src')?.startsWith('data:image/png'), badge);
  await second.waitForFunction(selector => document.querySelector(selector + ' img')?.getAttribute('src')?.startsWith('data:image/png'), badge);
  const saved = await page.locator(badge + ' img').getAttribute('src');
  assert.deepEqual(await page.locator(badge + ' img').evaluate(async image => {
    await image.decode(); const canvas = document.createElement('canvas');
    canvas.width = image.naturalWidth; canvas.height = image.naturalHeight;
    const ctx = canvas.getContext('2d'); ctx.drawImage(image, 0, 0);
    return [image.naturalWidth, image.naturalHeight, ctx.getImageData(0, 0, 1, 1).data[3], getComputedStyle(image).backgroundColor,
      getComputedStyle(image.previousElementSibling).visibility];
  }), [256, 128, 0, 'rgba(0, 0, 0, 0)', 'hidden']);
  await page.getByLabel('Importer une image', {exact: true}).setInputFiles({name: 'bad.png', mimeType: 'image/png', buffer: Buffer.from('invalid')});
  await page.getByRole('alert').filter({hasText: 'illisible'}).waitFor();
  assert.equal(await page.locator(badge + ' img').getAttribute('src'), saved);
  await page.reload();
  await page.waitForFunction(selector => document.querySelector(selector + ' img')?.getAttribute('src')?.startsWith('data:image/png'), badge);
  await page.getByRole('button', {name: 'Paramètres d’apparence'}).click();
  await page.getByText('Logos des clubs', {exact: true}).click();
  await page.getByLabel('Club à personnaliser').selectOption('581896');
  await page.setViewportSize({width: 320, height: 844});
  await page.getByRole('button', {name: 'Restaurer le logo d’origine'}).scrollIntoViewIfNeeded();
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  await page.screenshot({path: fileURLToPath(new URL('../artifacts/appearance/custom-logos-mobile.png', import.meta.url))});
  await page.getByRole('button', {name: 'Restaurer le logo d’origine'}).click();
  await second.waitForFunction(selector => document.querySelector(selector + ' img')?.getAttribute('src')?.endsWith('BC581896.jpg'), badge);
  await page.evaluate(() => { Storage.prototype.setItem = () => { throw new DOMException('Full', 'QuotaExceededError'); }; });
  await page.getByLabel('Importer une image', {exact: true}).setInputFiles(file);
  await page.getByRole('alert').filter({hasText: 'stockage'}).waitFor();
  assert.ok((await page.locator(badge + ' img').getAttribute('src')).endsWith('BC581896.jpg'));
  await page.keyboard.press('Escape');
  await page.getByRole('dialog').waitFor({state: 'hidden'});
  await page.waitForFunction(() => document.activeElement?.getAttribute('aria-label') === 'Paramètres d’apparence');
  assert.equal(await page.getByRole('button', {name: 'Paramètres d’apparence'}).evaluate(element => element === document.activeElement), true);
  assert.deepEqual(errors, []);
  console.log('Import PNG transparent, dimensions, aperçu, matrice, persistance, multi-onglets, erreur, quota et mobile validés.');
} finally {
  await browser?.close(); server.close(); await once(server, 'close');
}
