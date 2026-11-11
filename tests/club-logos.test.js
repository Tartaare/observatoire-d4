import assert from 'node:assert/strict';
import {test} from 'node:test';
import {once} from 'node:events';
import {readFile} from 'node:fs/promises';
import {clubLogos, clubLogoURL, clubBadge} from '../src/club-logos.js';
import {createApp} from '../server/index.js';

test('les vingt clubs possèdent un logo local, sans rapprochement approximatif', async () => {
  assert.equal(clubLogos.length, 20);
  assert.equal(new Set(clubLogos.map(club => club.id)).size, 20);
  for (const {name, id} of clubLogos) {
    assert.equal(clubLogoURL(name), `./assets/clubs/BC${id}.jpg`);
    const bytes = await readFile(new URL(`../assets/clubs/BC${id}.jpg`, import.meta.url));
    assert.equal(bytes.readUInt16BE(), 0xffd8, name);
  }
  assert.equal(clubLogoURL('US Béduer-Faycelles'), './assets/clubs/BC565091.jpg');
  assert.equal(clubLogoURL('ELAN MARIVALOIS 2'), './assets/clubs/BC581896.jpg');
  assert.equal(clubLogoURL('Club inconnu'), null);
  assert.equal(clubLogoURL('Faux Élan Marivalois'), null);
  assert.ok(!clubBadge('Club inconnu', '<X>').includes('<img'));
  assert.ok(clubBadge('Club inconnu', '<X>').includes('&lt;X&gt;'));
});

test('le serveur expose uniquement les logos répertoriés avec une CSP locale', async () => {
  const server = createApp({databasePath: ':memory:'});
  server.listen(0, '127.0.0.1');
  await once(server, 'listening');
  const address = server.address();
  assert.ok(address && typeof address !== 'string');
  const origin = `http://127.0.0.1:${address.port}`;
  try {
    for (const {id} of clubLogos) {
      const response = await fetch(`${origin}/assets/clubs/BC${id}.jpg`);
      assert.equal(response.status, 200);
      assert.match(response.headers.get('content-type'), /^image\/jpeg/);
      assert.match(response.headers.get('content-security-policy'), /img-src 'self' data:;/);
      assert.ok((await response.arrayBuffer()).byteLength > 0);
    }
    assert.equal((await fetch(`${origin}/assets/clubs/BC000000.jpg`)).status, 404);
    assert.equal((await fetch(`${origin}/src/club-logos.js`)).status, 200);
  } finally {
    server.close();
    await once(server, 'close');
  }
});
