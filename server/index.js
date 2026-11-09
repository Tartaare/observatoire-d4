import {createServer} from 'node:http';
import {readFile} from 'node:fs/promises';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {resolve, join} from 'node:path';
import {openDatabase, readSeason} from './database.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const assets = new Map([
  ['/', ['observatoire-d4.html', 'text/html']],
  ['/observatoire-d4.html', ['observatoire-d4.html', 'text/html']],
  ['/assets/css/observatoire.css', ['assets/css/observatoire.css', 'text/css']],
  ...['app', 'controller', 'view', 'season', 'dom', 'types'].map(name =>
    [`/src/${name}.js`, [`src/${name}.js`, 'text/javascript']]),
]);

/** @param {{databasePath?: string}} [options] */
export function createApp({databasePath = join(root, 'data', 'observatoire.sqlite')} = {}) {
  const db = openDatabase(databasePath);
  const server = createServer(async (request, response) => {
    response.setHeader('X-Content-Type-Options', 'nosniff');
    response.setHeader('Referrer-Policy', 'no-referrer');
    response.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; style-src 'self'; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
    response.setHeader('Cache-Control', 'no-store');
    /** @param {number} status @param {string} message */
    const fail = (status, message) => {
      response.writeHead(status, {'Content-Type': 'application/json; charset=utf-8'});
      response.end(JSON.stringify({error: message}));
    };
    // Ce serveur personnel écoute uniquement en boucle locale et ne propose aucune écriture HTTP.
    if (!['GET', 'HEAD'].includes(request.method ?? '')) {
      response.setHeader('Allow', 'GET, HEAD');
      fail(405, 'Méthode non autorisée.');
      return;
    }
    try {
      const pathname = new URL(request.url ?? '/', 'http://localhost').pathname;
      if (pathname === '/api/season') {
        const payload = JSON.stringify(readSeason(db));
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
  server.on('close', () => db.close());
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
