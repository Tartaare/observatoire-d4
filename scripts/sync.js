import {fileURLToPath} from 'node:url';
import {openDatabase} from '../server/database.js';
import {createSynchronizer, currentSeason} from '../server/synchronize.js';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--force' && !/^--season=\d{4}$/.test(arg))) {
  throw new Error('Options acceptées : --force et --season=AAAA.');
}
const seasonStart = Number(args.find(arg => arg.startsWith('--season='))?.split('=')[1] ?? currentSeason());
const db = openDatabase(fileURLToPath(new URL('../data/observatoire.sqlite', import.meta.url)));
const sync = createSynchronizer(db, {seasonStart});
const report = () => {
  const state = sync.status();
  console.log(`${state.phase} : ${state.done}/${state.total} · ${state.requests} requêtes · ${state.cached} pages en cache`);
};
for (const signal of ['SIGINT', 'SIGTERM']) process.once(signal, () => { void sync.close(); });
if (!sync.start(args.includes('--force'))) {
  db.close();
  throw new Error('Une synchronisation est déjà en cours pour cette base et cette saison.');
}
report();
const timer = setInterval(report, 15000);
try {
  await sync.idle();
  const state = sync.status();
  report();
  console.log(JSON.stringify(state.coverage, null, 2));
  for (const error of state.errors) console.error(`${error.url} : ${error.message}`);
  if (state.errors.length) process.exitCode = 1;
} finally {
  clearInterval(timer);
  await sync.close();
  db.close();
}
