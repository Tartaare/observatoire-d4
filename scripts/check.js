import {readdir, readFile, access} from 'node:fs/promises';
import {join, dirname, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';

const root = fileURLToPath(new URL('../', import.meta.url));
/** @param {string} directory @returns {Promise<string[]>} */
async function modulesIn(directory) {
  const entries = await readdir(directory, {withFileTypes: true});
  return (await Promise.all(entries.map(entry => entry.isDirectory()
    ? modulesIn(join(directory, entry.name))
    : Promise.resolve(entry.name.endsWith('.js') ? [join(directory, entry.name)] : [])))).flat();
}

let checked = 0;
for (const directory of ['src', 'server', 'scripts', 'tests']) {
  for (const filename of await modulesIn(join(root, directory))) {
    const result = spawnSync(process.execPath, [...process.execArgv, '--check', filename], {encoding: 'utf8'});
    if (result.status !== 0) throw new Error(result.stderr || result.error?.message || `Syntaxe invalide : ${filename}`);
    const source = await readFile(filename, 'utf8');
    for (const match of source.matchAll(/from\s+['"](\.[^'"]+)['"]/g)) await access(resolve(dirname(filename), match[1]));
    checked++;
  }
}
const page = await readFile(join(root, 'observatoire-d4.html'), 'utf8');
if (/<style\b|<script(?![^>]*\bsrc=)[^>]*>/i.test(page)) throw new Error('La page doit utiliser des styles et scripts externes.');
for (const match of page.matchAll(/(?:src|href)="(\.\/[^"#]+)"/g)) await access(resolve(root, match[1]));
console.log(`Validation réussie : ${checked} modules JavaScript, imports et ressources HTML.`);
