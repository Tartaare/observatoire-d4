import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdir} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {chromium} from 'playwright';
import {createApp} from '../server/index.js';
import {demo} from '../server/demo.js';

// Données synthétiques et API interceptée : aucune collecte ni modification des archives personnelles.
const server = createApp({databasePath: ':memory:'});
server.listen(0, '127.0.0.1'); await once(server, 'listening');
const origin = `http://127.0.0.1:${server.address().port}`;
const directory = new URL('../artifacts/appearance/', import.meta.url);
await mkdir(directory, {recursive: true});
const history = [{date: '2026-10-01', division: 'D1', team: 'Élan Marivalois 2', sourceURL: 'https://leonzelotois.fr/matchs/ui-history/'}];
const roster = [{name: 'Joueur A.', status: 'starter', shirt: 1, entry: null, exit: null, history},
  {name: 'Joueur B.', status: 'unverified', shirt: 12, entry: null, exit: null, history},
  {name: 'Joueur C.', status: 'entered', shirt: 14, entry: '65', exit: null, history: []}];
const data = {...structuredClone(demo), mode: 'live', seasonStart: 2026, matches: {}};
for (const teams of Object.values(data.clubs)) for (const team of teams) team[2] = demo.dates.map(() => null);
for (let day = 0; day < 6; day++) {
  const count = day === 0 ? 0 : day === 5 ? 1 : null;
  data.clubs.a[0][2][day] = count;
  data.matches[`a:0:${day}`] = {count, score: day === 4 ? '—' : '2–1', home: data.clubs.a[0][0], away: data.clubs.a[2][0],
    players: [], featured: false, realSheet: false, sourceURL: `https://leonzelotois.fr/matchs/ui-j${day + 1}/`, matchDate: demo.dates[day],
    statusLabel: day === 4 ? `Forfait ${data.clubs.a[0][0]}` : 'Terminé',
    sheetState: ['published', 'partial', 'missing', 'uncollected', 'uncollected', 'published'][day], retained: day === 5,
    roster: day === 5 ? roster : []};
}
const coverage = {calendar: {discovered: 6, expected: 112}, matches: 5, expected: 10, published: 2, partial: 1, missing: 1, uncollected: 6, players: 3, retained: 1,
  d4: {published: 2, expected: 10, partial: 1, missing: 1}};
let state = {seasonStart: 2026, running: false, phase: 'Archives à jour', done: 0, total: 6, lastSuccess: '2026-11-10T12:00:00Z', errors: [], coverage};
let polls = 0, forceSeen = false, failStart = false, archiveReads = 0;
let browser;
try {
  browser = await chromium.launch({headless: true, channel: process.env.BROWSER_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : undefined)});
  const context = await browser.newContext({viewport: {width: 1440, height: 900}, colorScheme: 'light'});
  const page = await context.newPage(); const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  page.on('console', message => { if (message.type() === 'error' && !message.location().url.endsWith('/favicon.ico')) errors.push(message.text()); });
  await page.addInitScript(() => window.addEventListener('securitypolicyviolation', event => { throw Error(`CSP : ${event.violatedDirective}`); }));
  await context.route('**/api/season', route => route.fulfill({json: data}));
  await context.route('**/api/sync*', async route => {
    if (route.request().method() === 'POST') {
      if (failStart) return route.fulfill({status: 503, json: {error: 'Indisponible'}});
      forceSeen = route.request().url().includes('force=1'); polls = 0;
      state = {...state, running: true, phase: 'Archivage des compositions', done: 1};
    } else if (state.running && ++polls >= 2) state = {...state, running: false, phase: 'Mise à jour partielle ; erreurs à reprendre', done: 6,
      errors: [{url: 'https://leonzelotois.fr/matchs/ui-error/', message: 'Feuille indisponible'}]};
    return route.fulfill({json: state});
  });
  await context.route('**/api/sheet?*', route => {
    archiveReads++; return route.fulfill({json: {sheets: [{name: 'Élan Marivalois 2', state: 'published', players: roster}]}});
  });
  await page.goto(origin); await page.locator('tbody tr').first().waitFor();
  assert.equal(await page.locator('.od-ui > header [data-sync]').count(), 1);
  assert.equal(await page.locator('footer [data-sync-message]').evaluate(element => element.closest('main') === null), true);
  assert.equal(await page.locator('.od-board + .od-replay').count(), 1);
  const cell = day => page.locator(`[data-team="0"][data-day="${day}"]`);
  assert.match(await cell(0).textContent(), /^0/);
  for (const day of [1, 2, 3]) assert.match(await cell(day).textContent(), /^\?/);
  assert.equal(await cell(4).isEnabled(), true); assert.match(await cell(4).textContent(), /F/);
  assert.equal(await cell(6).isDisabled(), true);
  await page.screenshot({path: fileURLToPath(new URL('interface-desktop.png', directory))});
  await cell(4).click(); assert.match(await page.locator('.od-match-panel').textContent(), /Aucune participation jouée retenue/);
  await page.getByRole('button', {name: 'Fermer le détail'}).click();
  await cell(5).focus(); await page.keyboard.press('Enter');
  await page.getByRole('button', {name: 'Fermer le détail'}).waitFor();
  assert.equal(await page.getByRole('button', {name: 'Fermer le détail'}).evaluate(element => element === document.activeElement), true);
  assert.match(await page.locator('.od-match-panel').textContent(), /composition précédente est conservée/);
  await page.getByRole('button', {name: /Joueur A\./}).click();
  await page.getByText('Composition archivée', {exact: true}).click();
  await page.getByRole('heading', {name: /Élan Marivalois 2 · Composition publiée/}).waitFor();
  assert.equal(archiveReads, 1);
  await page.getByRole('button', {name: /Joueur C\./}).click();
  assert.match(await page.locator('.od-match-panel').textContent(), /Entrée 65′/);
  assert.match(await page.locator('.od-match-panel').textContent(), /Aucune correspondance antérieure/);
  await page.screenshot({path: fileURLToPath(new URL('interface-history.png', directory))});
  await page.keyboard.press('Escape'); assert.equal(await cell(5).evaluate(element => element === document.activeElement), true);
  await page.locator('[data-jump="0"]').click(); assert.match(await cell(5).textContent(), /^·/);
  const slider = page.getByRole('slider', {name: 'Journée affichée'});
  await slider.focus(); await page.keyboard.press('End'); assert.equal(await slider.getAttribute('aria-valuenow'), '13');
  await page.locator('[data-jump="2"]').click(); await page.locator('[data-sort]').selectOption('name');
  await page.reload(); await page.locator('tbody tr').first().waitFor();
  assert.equal(await page.locator('[data-sort]').inputValue(), 'name'); assert.equal(await slider.getAttribute('aria-valuenow'), '2');
  await page.locator('[data-pool]').selectOption('b'); assert.equal(await slider.getAttribute('aria-valuenow'), '5');
  await page.locator('[data-pool]').selectOption('a'); await page.locator('[data-play]').click();
  await page.waitForFunction(() => document.querySelector('[role=slider]')?.getAttribute('aria-valuenow') === '1');
  await page.locator('[data-play]').click(); assert.equal(await page.locator('[data-play]').getAttribute('aria-pressed'), 'false');
  await page.locator('[data-sync-force]').check(); await page.locator('[data-sync]').click();
  await page.locator('[data-sync-progress]').waitFor(); assert.equal(forceSeen, true);
  await page.locator('[data-sync-errors] summary').waitFor();
  await page.locator('[data-sync-errors] summary').click(); assert.match(await page.locator('[data-sync-error-list]').textContent(), /Feuille indisponible/);
  await page.getByText('Méthode et limites', {exact: true}).click(); assert.equal(await page.locator('[data-method-note]').isVisible(), true);
  failStart = true; await page.locator('[data-sync]').click();
  await page.waitForFunction(() => document.querySelector('[data-sync-message]')?.textContent.includes('Impossible de démarrer'));
  assert.match(await page.locator('[data-sync-coverage]').textContent(), /112/); failStart = false;
  // Les réponses 503 ci-dessus sont volontaires ; elles ne doivent pas masquer des erreurs de rendu/CSP.
  assert.deepEqual(errors.filter(message => !message.includes('503')), []);
  for (const width of [320, 390, 768]) {
    await page.setViewportSize({width, height: 844});
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    await page.locator('[data-jump="5"]').click(); await cell(5).click();
    const panel = await page.locator('.od-match-panel').boundingBox();
    assert.ok(panel && panel.width <= width && panel.x >= 0);
    await page.screenshot({path: fileURLToPath(new URL(`interface-${width}.png`, directory)), fullPage: true});
    await page.getByRole('button', {name: 'Fermer le détail'}).click();
  }
  // Un clic pendant la lecture initiale du statut doit être exécuté ensuite, sans être perdu.
  const queuedContext = await browser.newContext(); const queuedPage = await queuedContext.newPage();
  let releaseStatus; const waitingStatus = new Promise(resolve => { releaseStatus = resolve; }); let starts = 0;
  await queuedContext.route('**/api/season', route => route.fulfill({json: data}));
  await queuedContext.route('**/api/sync*', async route => {
    if (route.request().method() === 'POST') starts++; else await waitingStatus;
    return route.fulfill({json: {...state, running: false}});
  });
  await queuedPage.goto(origin); await queuedPage.locator('tbody tr').first().waitFor();
  await queuedPage.locator('[data-sync]').click(); assert.equal(await queuedPage.locator('[data-sync]').isDisabled(), true);
  releaseStatus(); await queuedPage.waitForFunction(() => document.querySelector('[data-sync]')?.textContent === 'Mettre à jour');
  assert.equal(starts, 1); await queuedContext.close();
  // Variante hébergée : mode runtime externe, contrôle d'accès et reconnexion, sans service distant.
  const online = await browser.newContext(); const login = await online.newPage();
  await online.route('**/src/runtime.js', route => route.fulfill({contentType: 'text/javascript', body: 'export const hosted = true;'}));
  await online.route('**/api/auth/token?*', async route => {
    const body = route.request().postDataJSON();
    return body.password === 'correct' ? route.fulfill({json: {access_token: 'test', refresh_token: 'refresh', expires_in: 3600}})
      : route.fulfill({status: 400, json: {error: 'Refusé'}});
  });
  await online.route('**/api/auth/logout', route => route.fulfill({json: {}}));
  await online.route('**/api/sync*', route => route.fulfill({json: {...state, running: false}}));
  await online.route('**/api/season', route => route.fulfill({json: data}));
  await login.goto(origin); await login.getByRole('heading', {name: 'Retrouver vos archives'}).waitFor();
  assert.equal(await login.locator('table').count(), 0);
  await login.getByLabel('Adresse e-mail').fill('ui@example.test'); await login.getByLabel('Mot de passe').fill('incorrect');
  await login.getByRole('button', {name: 'Se connecter'}).click();
  await login.getByText('Connexion refusée. Vérifiez votre adresse et votre mot de passe.').waitFor();
  await login.getByLabel('Mot de passe').fill('correct'); await login.getByRole('button', {name: 'Se connecter'}).click();
  await login.locator('tbody tr').first().waitFor(); await login.locator('[data-team="0"][data-day="5"]').click();
  assert.match(await login.locator('.od-match-kicker').textContent(), /ARCHIVE EN LIGNE/);
  await login.getByRole('button', {name: 'Déconnexion'}).click(); await login.getByRole('heading', {name: 'Retrouver vos archives'}).waitFor();
  await online.close();
  const emptyContext = await browser.newContext(); const emptyPage = await emptyContext.newPage(); let seasonFailure = true;
  await emptyContext.route('**/api/sync*', route => route.fulfill({json: {...state, running: false}}));
  await emptyContext.route('**/api/season', route => seasonFailure ? route.fulfill({status: 503, json: {}}) : route.fulfill({json: {...demo, clubs: {a: [], b: []}}}));
  await emptyPage.goto(origin); await emptyPage.getByRole('alert').waitFor();
  assert.equal(await emptyPage.locator('footer [data-sync-message]').isVisible(), true);
  seasonFailure = false; await emptyPage.getByRole('button', {name: 'Réessayer', exact: true}).click();
  await emptyPage.getByRole('heading', {name: 'Aucune équipe disponible pour cette saison.'}).waitFor();
  await emptyContext.close();
  console.log('Interface validée : états réels, forfait, preuves, focus, curseur, persistance, lecture, synchronisation, erreurs, portrait et connexion hébergée simulée.');
} finally { await browser?.close(); server.close(); await once(server, 'close'); }
