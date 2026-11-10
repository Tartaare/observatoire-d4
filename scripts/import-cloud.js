import {DatabaseSync} from 'node:sqlite';
import {fileURLToPath} from 'node:url';
import {initialState, projectSnapshot, coverageOf} from '../artifacts/cloud.mjs';
import {readLiveSeason} from '../server/live-season.js';
import {getMeta} from '../server/collection-store.js';
import {isDeepStrictEqual} from 'node:util';

const args = process.argv.slice(2);
if (args.some(arg => arg !== '--check')) throw new Error('Seule l’option --check est acceptée.');
const check = args.includes('--check');
const url = process.env.SUPABASE_URL;
const secret = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!check && (!url || !/^https:\/\/[a-z0-9]+\.supabase\.co$/.test(url) || !secret)) {
  throw new Error('Définir SUPABASE_URL et SUPABASE_SERVICE_ROLE_KEY dans l’environnement, ou utiliser --check sans envoi.');
}
const db = new DatabaseSync(fileURLToPath(new URL('../data/observatoire.sqlite', import.meta.url)), {readOnly: true});
try {
  // Une transaction de lecture fige un instantané cohérent si le serveur local reste actif.
  db.exec('BEGIN');
  const payloads = [];
  const seasons = db.prepare('SELECT DISTINCT season FROM collected_fixtures ORDER BY season').all();
  if (!seasons.length) throw new Error('Aucune saison archivée à importer.');
  for (const row of seasons) {
    const season = Number(row.season);
    const fixtures = db.prepare('SELECT * FROM collected_fixtures WHERE season=?').all(season);
    const snapshot = {fixtures: fixtures.map(f => ({url: f.url, division: f.division, round: f.round,
      status: f.status, home: f.home, away: f.away, date: f.date, score: f.score})),
    matches: fixtures.filter(f => f.read_at).map(f => ({url: f.url, division: f.division, round: f.round,
      date: f.date, score: f.score, status: f.status,
      sheets: db.prepare('SELECT * FROM collected_sheets WHERE match_url=? ORDER BY side').all(f.url).map(s => ({
        name: s.name, clubURL: s.club_url, state: s.state, latestState: s.latest_state,
        players: db.prepare('SELECT name,name_key AS key,shirt,status,entry,exit FROM collected_players WHERE match_url=? AND side=? ORDER BY ordinal').all(f.url, s.side),
      }))}))};
    const state = {...initialState(), ...getMeta(db, `sync:${season}`, {}), running: false, stage: 'finished', queue: [],
      standings: getMeta(db, `standings:${season}`, []), rounds: getMeta(db, `rounds:${season}`, 0)};
    state.coverage = coverageOf(snapshot, state);
    if (!isDeepStrictEqual(projectSnapshot(season, snapshot, state), readLiveSeason(db, season))) {
      throw new Error(`Projection différente pour la saison ${season} : import interrompu.`);
    }
    payloads.push({p_season: season, p_state: state, p_snapshot: snapshot});
    console.log(`Saison ${season} : ${fixtures.length} rencontres, ${snapshot.matches.length} archives ; résultats identiques à SQLite.`);
  }
  db.exec('COMMIT');
  for (const payload of payloads) {
    if (check) continue;
    const response = await fetch(`${url}/rest/v1/rpc/od_import`, {method: 'POST',
      headers: {apikey: secret, Authorization: `Bearer ${secret}`, 'Content-Type': 'application/json'},
      body: JSON.stringify(payload), signal: AbortSignal.timeout(60000)});
    if (!response.ok) throw new Error(`Import refusé (HTTP ${response.status}). Vérifier les migrations, les droits et l’absence de saison distante déjà utilisée.`);
    console.log(`Saison ${payload.p_season} importée dans Supabase.`);
  }
  if (check) console.log('Contrôle terminé sans écriture locale ni envoi réseau.');
} finally { db.close(); }
