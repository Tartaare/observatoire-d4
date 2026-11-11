import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {createApp} from '../server/index.js';
import {demo} from '../server/demo.js';
import {clubLogos} from '../src/club-logos.js';

const server = createApp({databasePath: ':memory:'});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
const address = server.address();
if (!address || typeof address === 'string') throw new Error('Port indisponible.');
const origin = `http://127.0.0.1:${address.port}`;
const directory = new URL('../artifacts/appearance/', import.meta.url);
await mkdir(directory, {recursive: true});
// Saison synthétique : aucune lecture ni modification des archives personnelles.
const data = {...demo, mode: 'live', seasonStart: 2026, matches: {}, clubs: {
  a: clubLogos.slice(0, 10).map(({name}) => [name, 'FC', demo.dates.map(() => null)]),
  b: clubLogos.slice(10).map(({name}) => [name, 'FC', demo.dates.map(() => null)]),
}};
let browser;
try {
  browser = await chromium.launch({headless: true, channel: process.env.BROWSER_CHANNEL ?? 'msedge'});
  const page = await browser.newPage({viewport: {width: 1440, height: 900}, colorScheme: 'light'});
  const errors = [], external = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('request', request => { if (!request.url().startsWith(origin)) external.push(request.url()); });
  await page.addInitScript(() => {
    window.addEventListener('securitypolicyviolation', event => { throw new Error(`CSP : ${event.violatedDirective}`); });
  });
  await page.route('**/api/season', route => route.fulfill({json: data}));
  await page.goto(origin);
  for (const pool of ['a', 'b']) {
    await page.locator('[data-pool]').selectOption(pool);
    await page.waitForFunction(() => {
      const images = [...document.querySelectorAll('.od-crest img')];
      return images.length === 10 && images.every(image => image.complete && image.naturalWidth > 0);
    });
    for (const theme of ['light', 'dark']) {
      await page.emulateMedia({colorScheme: theme});
      await page.screenshot({path: fileURLToPath(new URL(`clubs-${pool}-${theme}.png`, directory))});
    }
  }
  await page.setViewportSize({width: 320, height: 844});
  await page.screenshot({path: fileURLToPath(new URL('clubs-mobile.png', directory))});
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.equal(await page.locator('.od-crest').first().evaluate(element => element.getBoundingClientRect().width), 28);
  // Une vraie erreur réseau doit retirer l'image et révéler les initiales.
  await page.route('**/BC565091.jpg', route => route.abort());
  await page.reload();
  await page.locator('[data-pool]').selectOption('b');
  const badge = page.locator('.od-club').filter({hasText: 'Béduer-Faycelles'}).locator('.od-crest');
  await badge.waitFor();
  await page.waitForFunction(() => !document.querySelector('img[src$="BC565091.jpg"]'));
  assert.equal(await badge.locator('.od-monogram').isVisible(), true);
  await page.locator('[data-sort]').selectOption('name');
  assert.equal(await page.locator('.od-crest').count(), 10);
  assert.deepEqual(errors, []);
  assert.deepEqual(external, []);
  console.log('20 logos chargés ; clair/sombre, portrait 320 px, tri, repli réseau et CSP validés.');
} finally {
  await browser?.close();
  server.close();
  await once(server, 'close');
}
