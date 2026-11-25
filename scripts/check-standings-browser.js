import assert from 'node:assert/strict';
import {once} from 'node:events';
import {chromium} from 'playwright';
import {createApp} from '../server/index.js';
import {demo} from '../server/demo.js';
import {createSeason, matchResult, scoreGoals} from '../src/season.js';

const server = createApp({databasePath: ':memory:'});
server.listen(0, '127.0.0.1');
await once(server, 'listening');
let browser;
try {
  browser = await chromium.launch({headless:true, channel:process.env.BROWSER_CHANNEL ?? (process.platform === 'win32' ? 'msedge' : undefined)});
  const page = await browser.newPage({viewport:{width:1280, height:840}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto(`http://127.0.0.1:${server.address().port}`);
  await page.locator('.od-cell').first().waitFor();
  await page.locator('[data-view="chart"]').click();
  await page.locator('[data-tip][transform]').first().waitFor();
  const tips = page.locator('[data-tip]');
  assert.equal(await tips.count(), await page.locator('[data-follow]').count());
  const plot = page.locator('[data-rank-plot]');
  assert.ok((await page.locator('.od-chart-list').boundingBox()).x < (await plot.boundingBox()).x);
  assert.equal(await plot.locator('line[x1="0"][x2="0"], .od-rank-cursor').count(), 0);
  const cursorX = () => tips.first().evaluate(el => el.transform.baseVal[0].matrix.e);
  const metric = name => page.locator(`[data-metric="${name}"]`);
  const selected = await page.locator('[data-chart-name]').innerText();
  await metric('points').click();
  assert.equal(await metric('points').getAttribute('aria-pressed'), 'true');
  assert.equal(await page.locator('[data-chart-name]').innerText(), selected);
  const season = createSeason(demo);
  async function checkDay(day) {
    const grid = await plot.locator('.od-rank-axis[text-anchor="end"]').evaluateAll(nodes =>
      nodes.map(node => ({value:Number(node.textContent), y:Number(node.getAttribute('y')) - 4})));
    const top = grid[0], bottom = grid.at(-1);
    assert.ok(top.value > bottom.value, 'Les points augmentent vers le haut');
    for (const [team, [name]] of demo.clubs.a.entries()) {
      const tip = plot.locator(`[data-tip="${team}"]`);
      let points = 0;
      for (let round = 0; round <= day; round++) {
        const match = season.matchAt(round, team, 'a');
        const {code} = matchResult(match, name);
        points += {V:3, N:1, D:0}[code];
        if (round !== day) continue;
        const goals = scoreGoals(match.score);
        const expected = (match.home === name ? goals : goals.reverse()).join('–');
        assert.equal(await tip.locator('.od-tip-score').innerText(), expected);
        assert.equal(await tip.locator('.od-tip-score').getAttribute('data-result'), code);
      }
      const actualY = await tip.evaluate(el => el.transform.baseVal[0].matrix.f);
      assert.ok(Math.abs(actualY - (top.y + (bottom.y - top.y) * (points - top.value) / (bottom.value - top.value))) < 0.01);
    }
  }
  await checkDay(demo.lastPlayed);
  const go = control => page.locator(`[data-${control}]`).dispatchEvent('click');
  await page.clock.install({time:new Date('2026-11-25T12:00:00Z')});
  await page.clock.pauseAt(new Date('2026-11-25T12:01:00Z'));
  const end = await cursorX();
  await go('prev');
  await page.clock.runFor(180);
  const retreat = await cursorX();
  assert.ok(retreat < end, 'Le point doit déjà reculer');
  assert.ok(Math.abs(Number(await plot.locator('clipPath rect').getAttribute('width')) - retreat) < 0.001);
  await go('next');
  assert.equal(await cursorX(), retreat, 'Une inversion repart de la position visible');
  await page.clock.runFor(180);
  const forward = await cursorX();
  assert.ok(retreat < forward && forward < end, 'Avance progressive après inversion');
  await page.clock.runFor(700);
  assert.equal(await cursorX(), end);
  await page.emulateMedia({reducedMotion:'reduce'});
  await go('prev');
  const reduced = await cursorX();
  assert.ok(reduced < retreat, 'Position finale immédiate en mouvement réduit');
  await page.clock.runFor(200);
  assert.equal(await cursorX(), reduced);
  await page.setViewportSize({width:320, height:800});
  await page.clock.runFor(100);
  await page.locator('.od-range').evaluate(range => { range.value = '0'; range.dispatchEvent(new Event('input')); });
  await checkDay(0);
  const boxes = await tips.evaluateAll(groups => groups.map(group => {
    const rect = group.querySelector('.od-crest').getBoundingClientRect();
    const dot = group.querySelector('circle').getBoundingClientRect();
    const score = group.querySelector('.od-tip-score').getBoundingClientRect();
    if (score.left < rect.right) throw new Error('Score superposé à l’écusson');
    return {top:rect.top, bottom:rect.bottom, left:rect.left, dotRight:dot.right, right:score.right};
  }).sort((a,b) => a.top - b.top));
  for (const [i, box] of boxes.entries()) {
    assert.ok(box.left > box.dotRight && box.right <= 320);
    if (i) assert.ok(box.top >= boxes[i - 1].bottom - 0.5, 'Écussons séparés en J01');
  }
  const toggle = page.locator('.od-team-toggle');
  await toggle.dispatchEvent('click');
  assert.ok(await page.locator('[data-follow="1"] .od-team-name').isVisible());
  await page.locator('[data-follow="1"]').dispatchEvent('click');
  assert.equal(await toggle.getAttribute('aria-expanded'), 'false');
  assert.equal(await page.locator('[data-chart-name]').textContent(), await page.locator('[data-follow="1"] .od-team-name').textContent());
  await page.locator('.od-range').evaluate(range => { range.value = range.max; range.dispatchEvent(new Event('input')); });
  assert.ok((await plot.locator('.od-tip-score').allTextContents()).every(score => score === '—'));
  await metric('rank').dispatchEvent('click');
  assert.equal(await metric('rank').getAttribute('aria-pressed'), 'true');
  assert.match(await plot.locator('desc').textContent(), /rang/);
  assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth));
  assert.deepEqual(errors, []);
  console.log('Classement vérifié en avance, recul, inversion, mouvement réduit et portrait.');
} finally {
  await browser?.close();
  server.close();
}
