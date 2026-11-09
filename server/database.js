import {DatabaseSync} from 'node:sqlite';
import {mkdirSync} from 'node:fs';
import {dirname} from 'node:path';
import {demo} from './demo.js';
import {migrateCollection} from './collection-store.js';

/** @param {string} filename */
export function openDatabase(filename) {
  if (filename !== ':memory:') mkdirSync(dirname(filename), {recursive: true});
  const db = new DatabaseSync(filename);
  try {
    db.exec(`
      PRAGMA foreign_keys = ON;
      PRAGMA busy_timeout = 5000;
      CREATE TABLE IF NOT EXISTS season (
        id INTEGER PRIMARY KEY CHECK (id = 1),
        dates TEXT NOT NULL CHECK (json_valid(dates)),
        last_played INTEGER NOT NULL CHECK (last_played >= 0),
        examples TEXT NOT NULL CHECK (json_valid(examples))
      ) STRICT;
      CREATE TABLE IF NOT EXISTS pools (
        id TEXT PRIMARY KEY CHECK (id IN ('a', 'b'))
      ) STRICT;
      CREATE TABLE IF NOT EXISTS teams (
        id INTEGER PRIMARY KEY,
        pool_id TEXT NOT NULL REFERENCES pools(id),
        position INTEGER NOT NULL CHECK (position >= 0),
        name TEXT NOT NULL,
        initials TEXT NOT NULL,
        UNIQUE (pool_id, position)
      ) STRICT;
      CREATE TABLE IF NOT EXISTS appearances (
        team_id INTEGER NOT NULL REFERENCES teams(id),
        day INTEGER NOT NULL CHECK (day >= 0),
        count INTEGER CHECK (count >= 0),
        PRIMARY KEY (team_id, day)
      ) STRICT;
    `);
    migrateCollection(db);
    if (!db.prepare('SELECT id FROM season WHERE id = 1').get()) seedDatabase(db);
    return db;
  } catch (error) {
    db.close();
    throw error;
  }
}

/** @param {DatabaseSync} db */
function seedDatabase(db) {
  // Les exemples documentaires restent un document JSON ; équipes et volumes sont relationnels.
  const {lastPlayed, dates, clubs, ...examples} = demo;
  db.exec('BEGIN IMMEDIATE');
  try {
    db.prepare('INSERT INTO season VALUES (1, ?, ?, ?)')
      .run(JSON.stringify(dates), lastPlayed, JSON.stringify(examples));
    const poolInsert = db.prepare('INSERT INTO pools VALUES (?)');
    const teamInsert = db.prepare('INSERT INTO teams (pool_id, position, name, initials) VALUES (?, ?, ?, ?)');
    const countInsert = db.prepare('INSERT INTO appearances VALUES (?, ?, ?)');
    for (const [pool, teams] of Object.entries(clubs)) {
      poolInsert.run(pool);
      teams.forEach(([name, initials, counts], position) => {
        const {lastInsertRowid} = teamInsert.run(pool, position, name, initials);
        counts.forEach((count, day) => countInsert.run(lastInsertRowid, day, count));
      });
    }
    db.exec('COMMIT');
  } catch (error) {
    db.exec('ROLLBACK');
    throw error;
  }
}

/** @param {DatabaseSync} db @returns {import('../src/types.js').SeasonData} */
export function readSeason(db) {
  const season = db.prepare('SELECT dates, last_played, examples FROM season WHERE id = 1').get();
  if (!season) throw new Error('Saison absente de la base.');
  /** @type {import('../src/types.js').SeasonData['clubs']} */
  const clubs = {a: [], b: []};
  const counts = db.prepare('SELECT count FROM appearances WHERE team_id = ? ORDER BY day');
  for (const team of db.prepare('SELECT * FROM teams ORDER BY pool_id, position').all()) {
    const pool = /** @type {import('../src/types.js').PoolId} */ (team.pool_id);
    clubs[pool].push([String(team.name), String(team.initials),
      counts.all(team.id).map(row => row.count === null ? null : Number(row.count))]);
  }
  return {dates: JSON.parse(String(season.dates)), lastPlayed: Number(season.last_played),
    clubs, ...JSON.parse(String(season.examples))};
}
