import {mkdir, readdir, readFile, writeFile, copyFile, lstat, realpath, rm} from 'node:fs/promises';
import {fileURLToPath} from 'node:url';
import {dirname, resolve} from 'node:path';
import {clubLogos} from '../src/club-logos.js';

// Liste fermée : aucune archive, clé, dépendance ou source serveur dans le site public.
const root = new URL('../', import.meta.url);
const output = new URL('../dist/', import.meta.url);
const target = resolve(fileURLToPath(output));
if (dirname(target) !== resolve(fileURLToPath(root))) throw new Error('Dossier de publication hors du projet.');
const existing = await lstat(target).catch(error => { if (error.code === 'ENOENT') return null; throw error; });
if (existing) {
  if (existing.isSymbolicLink() || await realpath(target) !== await realpath(fileURLToPath(root)) + `${process.platform === 'win32' ? '\\' : '/'}dist`) {
    throw new Error('Le dossier de publication doit être un dossier réel du projet.');
  }
  await rm(target, {recursive: true});
}
await mkdir(output, {recursive: true});
for (const directory of ['src', 'assets/css', 'assets/generated']) {
  await mkdir(new URL(`${directory}/`, output), {recursive: true});
  for (const entry of await readdir(new URL(`${directory}/`, root), {withFileTypes: true})) {
    if (!entry.isFile() || !/\.(js|css)$/.test(entry.name)) continue;
    await copyFile(new URL(`${directory}/${entry.name}`, root), new URL(`${directory}/${entry.name}`, output));
  }
}
await mkdir(new URL('assets/clubs/', output), {recursive: true});
for (const {id} of clubLogos) {
  const filename = `assets/clubs/BC${id}.jpg`;
  await copyFile(new URL(filename, root), new URL(filename, output));
}
await writeFile(new URL('src/runtime.js', output), 'export const hosted = true;\n');
const html = await readFile(new URL('observatoire-d4.html', root), 'utf8');
await writeFile(new URL('index.html', output), html.replace('Archives locales des compositions', 'Archives des compositions'));
await writeFile(new URL('404.html', output), '<!doctype html><html lang="fr"><meta charset="utf-8"><title>Page introuvable</title><h1>Page introuvable</h1><a href="/">Revenir à l’Observatoire D4</a></html>');
await writeFile(new URL('_headers', output), `/*
  X-Content-Type-Options: nosniff
  Referrer-Policy: no-referrer
  X-Frame-Options: DENY
  Cache-Control: no-cache
  Content-Security-Policy: default-src 'none'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'
`);
await writeFile(new URL('_routes.json', output), JSON.stringify({version: 1, include: ['/api/*'], exclude: []}));
console.log(`Site Pages prêt : ${fileURLToPath(output)}`);
