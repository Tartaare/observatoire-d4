import test from 'node:test';
import assert from 'node:assert/strict';
import {once} from 'node:events';
import {mkdtempSync, unlinkSync, rmdirSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {demo} from '../server/demo.js';
import {openDatabase, readSeason} from '../server/database.js';
import {createApp} from '../server/index.js';
import {buildSchedule, createSeason, matchResult, validateSeason} from '../src/season.js';
import {escapeHTML} from '../src/dom.js';

test('les résultats suivent le côté de l’équipe, sans inventer de score pour les forfaits', () => {
  const match = {home: 'Équipe A', away: 'Équipe B', score: '2–1', statusLabel: 'Terminé'};
  assert.deepEqual(matchResult(match, 'Équipe A'), {code: 'V', label: 'Victoire'});
  assert.deepEqual(matchResult(match, 'Équipe B'), {code: 'D', label: 'Défaite'});
  for (const score of ['0–0', '12 - 12', '1—1']) {
    assert.equal(matchResult({...match, score}, 'Équipe B')?.code, 'N');
  }
  assert.equal(matchResult({...match, score: '—'}, 'Équipe A'), null);
  assert.equal(matchResult({...match, statusLabel: 'Reporté'}, 'Équipe A'), null);
  assert.equal(matchResult(match, 'Autre équipe'), null);
  const forfeit = {...match, score: '—', statusLabel: 'Forfait Équipe B'};
  assert.deepEqual(matchResult(forfeit, 'Équipe B'), {code: 'F', label: 'Forfait'});
  assert.deepEqual(matchResult(forfeit, 'Équipe A'), {code: 'V', label: 'Victoire par forfait'});
  assert.equal(matchResult({...forfeit, statusLabel: 'Forfait inconnu'}, 'Équipe A'), null);
  assert.equal(matchResult({...forfeit, statusLabel: 'Forfait Équipe A'}, 'Équipe A')?.code, 'F');
});

test('le calendrier comporte chaque aller et retour une seule fois', () => {
  for (const pool of ['a', 'b']) {
    const rounds = buildSchedule(demo.clubs[pool], pool === 'a', demo.lastPlayed);
    assert.equal(rounds.length, 14);
    const pairings = new Set();
    for (const games of rounds) {
      assert.equal(games.length, 4);
      assert.equal(new Set(games.flat()).size, 8);
      for (const [home, away] of games) {
        assert.notEqual(home, away);
        const key = `${home}-${away}`;
        assert.ok(!pairings.has(key), `Doublon : ${key}`);
        pairings.add(key);
      }
    }
    assert.equal(pairings.size, 56);
    if (pool === 'a') assert.ok(rounds[demo.lastPlayed].some(([home, away]) => home === 0 && away === 2));
  }
});

test('les fiches préservent les volumes, feuilles manquantes et exemple documenté', () => {
  const season = createSeason(demo);
  for (const pool of ['a', 'b']) {
    demo.clubs[pool].forEach(([, , counts], team) => counts.forEach((count, day) => {
      const match = season.matchAt(day, team, pool);
      assert.equal(match.count, count);
      assert.equal(match.players.length, count ?? 0);
    }));
  }
  const featured = season.matchAt(5, 0, 'a');
  assert.equal(featured.realSheet, true);
  assert.equal(featured.score, '2–2');
  assert.equal(featured.away, 'US Béduer-Faycelles');
  assert.equal(season.matchAt(1, 4, 'a').count, null);
  assert.equal(season.matchAt(0, 0, 'a').count, 0);
  assert.throws(() => season.matchAt(6, 0, 'a'), RangeError);
});

test('la frontière API refuse les données incohérentes et les liens dangereux', () => {
  assert.deepEqual(validateSeason(demo), demo);
  assert.doesNotThrow(() => validateSeason({...demo, clubs: {a: [], b: []}}));
  for (const change of [
    data => { data.dates[0] = '2026-02-30'; },
    data => { data.clubs.a[0][2][0] = -1; },
    data => { data.clubs.b.pop(); },
    data => { data.lastPlayed = 14; },
    data => { data.exampleURL = 'javascript:alert(1)'; },
    data => { data.exampleSources['source'] = 'https://example.com/'; },
  ]) {
    const malformed = structuredClone(demo);
    change(malformed);
    assert.throws(() => validateSeason(malformed), TypeError);
  }
  assert.equal(escapeHTML('<img src="x" onerror=\'alert(1)\'>&'), '&lt;img src=&quot;x&quot; onerror=&#39;alert(1)&#39;&gt;&amp;');
});

test('SQLite restitue la démonstration et conserve les modifications au redémarrage', () => {
  const directory = mkdtempSync(join(tmpdir(), 'observatoire-d4-test-'));
  const filename = join(directory, 'test.sqlite');
  let db;
  try {
    db = openDatabase(filename);
    assert.deepEqual(readSeason(db), demo);
    db.prepare('UPDATE teams SET name = ? WHERE pool_id = ? AND position = ?').run('Équipe personnelle', 'a', 0);
    assert.throws(() => db.prepare('UPDATE appearances SET count = -1').run());
    db.close();
    db = openDatabase(filename);
    assert.equal(readSeason(db).clubs.a[0][0], 'Équipe personnelle');
  } finally {
    db?.close();
    unlinkSync(filename);
    rmdirSync(directory);
  }
});

test('le serveur expose la page, ses modules et une API de lecture sans exposer la base', async () => {
  const server = createApp({databasePath: ':memory:'});
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const origin = `http://127.0.0.1:${server.address().port}`;
  try {
    const response = await fetch(`${origin}/api/season`);
    assert.equal(response.status, 200);
    assert.deepEqual(validateSeason(await response.json()), demo);
    assert.equal(response.headers.get('x-content-type-options'), 'nosniff');
    assert.ok(!response.headers.get('content-security-policy').includes('unsafe-inline'));
    for (const path of ['/', '/observatoire-d4.html', '/assets/css/observatoire.css',
      '/src/app.js', '/src/controller.js', '/src/view.js', '/src/season.js', '/src/dom.js', '/src/types.js', '/src/navigation.js',
      '/assets/generated/theme.js', '/assets/generated/appearance.js', '/assets/generated/appearance.css']) {
      const asset = await fetch(origin + path);
      assert.equal(asset.status, 200, path);
      assert.ok((await asset.text()).length > 0, path);
    }
    for (const path of ['/data/observatoire.sqlite', '/collecte_onze_lotois.py', '/server/demo.js', '/.git/config', '/absent']) {
      assert.equal((await fetch(origin + path)).status, 404, path);
    }
    assert.equal((await fetch(`${origin}/api/season`, {method: 'POST'})).status, 405);
    assert.equal(await (await fetch(origin, {method: 'HEAD'})).text(), '');
  } finally {
    server.close();
    await once(server, 'close');
  }
});
