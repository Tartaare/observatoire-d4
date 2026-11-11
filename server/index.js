import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {resolve, join} from 'node:path';
import {openDatabase, readSeason} from './database.js';
import {readLiveSeason} from './live-season.js';
import {createSynchronizer} from './synchronize.js';
import {readArchive} from './collection-store.js';
import {sourceURL} from './source.js';
import {clubLogos} from '../src/club-logos.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const assets = new Map([
  ...clubLogos.map(({id}) => [`/assets/clubs/BC${id}.jpg`, [`assets/clubs/BC${id}.jpg`, 'image/jpeg']]),
  ['/', ['observatoire-d4.html', 'text/html']],
  ['/observatoire-d4.html', ['observatoire-d4.html', 'text/html']],
  ['/assets/css/observatoire.css', ['assets/css/observatoire.css', 'text/css']],
  ['/assets/css/auth.css', ['assets/css/auth.css', 'text/css']],
  ...['theme.js', 'appearance.js', 'appearance.css'].map(name =>
    [`/assets/generated/${name}`, [`assets/generated/${name}`, name.endsWith('.css') ? 'text/css' : 'text/javascript']]),
  ...['app', 'controller', 'view', 'club-logos', 'custom-logos', 'season', 'dom', 'types', 'detail', 'sync-panel', 'navigation', 'runtime', 'session', 'auth'].map(name =>
    [`/src/${name}.js`, [`src/${name}.js`, 'text/javascript']]),
]);

/** @param {{databasePath?: string, syncOptions?: Parameters<typeof createSynchronizer>[1]}} [options] */
export function createApp({databasePath = join(root, 'data', 'observatoire.sqlite'), syncOptions} = {}) {
  const db = openDatabase(databasePath);
  const sync = createSynchronizer(db, syncOptions);
  const server = createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    response.setHeader('Cache-Control', 'no-store');
    /** @param {number} status @param {string} message */
    const fail = (status, message) => {
      response.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'});
      response.end(JSON.stringify({error: message}));
    };
    const host = request.headers.host;
    const address = server.address();
    if (!address || typeof address === 'string' || ![`127.0.0.1:${address.port}`, `localhost:${address.port}`].includes(host ?? '')) {
      fail(403, 'Hôte local attendu.');
      return;
    }
    let url;
    try { url = new URL(request.url ?? '/', 'http://localhost'); }
    catch { fail(400, 'URL locale invalide.'); return; }
    if (url.pathname === '/api/sync' && request.method === 'POST') {
      if (request.headers['x-observatoire-sync'] !== '1' || request.headers.origin && request.headers.origin !== `http://${host}`) {
        fail(403, 'Synchronisation autorisée uniquement depuis cette application locale.');
        return;
      }
      if (Number(request.headers['content-length'] ?? 0) !== 0 || request.headers['transfer-encoding']) {
        fail(400, 'La synchronisation ne reçoit aucune donnée à importer.');
        return;
      }
      let started;
      try { started = sync.start(url.searchParams.get('force') === '1'); }
      catch { fail(503, 'Stockage temporairement indisponible. Réessayez.'); return; }
      response.writeHead(started ? 202 : 409, {'Content-Type': 'application/json; charset=utf-8'});
      response.end(JSON.stringify(sync.status()));
      return;
    }
    if (!['GET', 'HEAD'].includes(request.method ?? '')) {
      response.setHeader('Allow', 'GET, HEAD');
      fail(405, 'Méthode non autorisée.');
      return;
    }
    try {
      const pathname = url.pathname;
      if (pathname === '/api/sync') {
        response.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
        response.end(request.method === 'HEAD' ? undefined : JSON.stringify(sync.status()));
        return;
      }
      if (pathname === '/api/sheet') {
        let matchURL;
        try {
          matchURL = sourceURL(url.searchParams.get('url') ?? '');
          if (!new URL(matchURL).pathname.startsWith('/matchs/')) throw new Error('Lien de match attendu.');
        } catch { fail(400, 'URL de feuille invalide.'); return; }
        const archive = readArchive(db, matchURL);
        if (!archive) { fail(404, 'Feuille non archivée.'); return; }
        response.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
        response.end(request.method === 'HEAD' ? undefined : JSON.stringify(archive));
        return;
      }
      if (pathname === '/api/season') {
        const payload = JSON.stringify(readLiveSeason(db, sync.status().seasonStart) ?? readSeason(db));
        response.writeHead(200, {'Content-Type': 'application/json; charset=utf-8'});
        response.end(request.method === 'HEAD' ? undefined : payload);
        return;
      }
      const asset = assets.get(pathname);
      if (!asset) { fail(404, 'Ressource introuvable.'); return; }
      const [filename, mime] = asset;
      const body = await readFile(join(root, filename));
      response.writeHead(200, {'Content-Type': `${mime}; charset=utf-8`});
      response.end(request.method === 'HEAD' ? undefined : body);
    } catch (error) {
      console.error('Erreur de lecture :', error);
      fail(500, 'Impossible de lire les données de l’application.');
    }
  });
  server.on('close', () => { void sync.close().finally(() => db.close()); });
  return server;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  const port = Number(process.env.PORT ?? 3000);
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    console.error('PORT doit être un entier compris entre 1 et 65535.');
    process.exitCode = 1;
  } else {
    const server = createApp();
    server.on('error', error => {
      console.error(`Démarrage impossible : ${error.message}`);
      server.close();
      process.exitCode = 1;
    });
    server.listen(port, '127.0.0.1', () => console.log(`Observatoire D4 : http://127.0.0.1:${port}`));
    for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => server.close());
  }
}
