/** @typedef {import('node:sqlite').DatabaseSync} Database */

/** @param {Database} db */
export function migrateCollection(db) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS collection_meta (key TEXT PRIMARY KEY, value TEXT NOT NULL CHECK(json_valid(value))) STRICT;
    CREATE TABLE IF NOT EXISTS collection_locks (season INTEGER PRIMARY KEY, owner TEXT NOT NULL, pid INTEGER NOT NULL) STRICT;
    CREATE TABLE IF NOT EXISTS source_pages (
      url TEXT PRIMARY KEY, body TEXT NOT NULL, etag TEXT, modified TEXT, fetched_at TEXT NOT NULL
    ) STRICT;
    CREATE TABLE IF NOT EXISTS collected_fixtures (
      url TEXT PRIMARY KEY, season INTEGER NOT NULL, division TEXT NOT NULL,
      round INTEGER NOT NULL CHECK(round > 0), status TEXT NOT NULL,
      home TEXT NOT NULL, away TEXT NOT NULL, date TEXT, score TEXT, read_at TEXT
    ) STRICT;
    CREATE INDEX IF NOT EXISTS fixtures_season ON collected_fixtures(season, division, date);
    CREATE TABLE IF NOT EXISTS collected_sheets (
      match_url TEXT NOT NULL REFERENCES collected_fixtures(url), side INTEGER NOT NULL CHECK(side IN (0,1)),
      name TEXT NOT NULL, club_url TEXT, state TEXT NOT NULL CHECK(state IN ('published','partial','missing')),
      latest_state TEXT NOT NULL CHECK(latest_state IN ('published','partial','missing')), updated_at TEXT NOT NULL,
      PRIMARY KEY(match_url, side)
    ) STRICT;
    CREATE TABLE IF NOT EXISTS collected_players (
      match_url TEXT NOT NULL, side INTEGER NOT NULL, ordinal INTEGER NOT NULL,
      name TEXT NOT NULL, name_key TEXT NOT NULL, shirt INTEGER,
      status TEXT NOT NULL CHECK(status IN ('starter','entered','unverified')), entry TEXT, exit TEXT,
      PRIMARY KEY(match_url, side, ordinal),
      FOREIGN KEY(match_url, side) REFERENCES collected_sheets(match_url, side)
    ) STRICT;
    CREATE INDEX IF NOT EXISTS players_name ON collected_players(name_key);
  `);
}

/** @param {Database} db @param {string} key @param {unknown} value */
export function putMeta(db, key, value) {
  db.prepare('INSERT INTO collection_meta VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value=excluded.value').run(key, JSON.stringify(value));
}

/** @template T @param {Database} db @param {string} key @param {T} fallback @returns {T} */
export function getMeta(db, key, fallback) {
  const row = db.prepare('SELECT value FROM collection_meta WHERE key=?').get(key);
  return row ? JSON.parse(String(row.value)) : fallback;
}

/** @param {Database} db @param {number} season @param {import('./collection-types.js').Fixture[]} fixtures */
export function saveFixtures(db, season, fixtures) {
  const insert = db.prepare(`INSERT INTO collected_fixtures(url,season,division,round,status,home,away,date,score)
    VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(url) DO UPDATE SET
    season=excluded.season, division=excluded.division, round=excluded.round, status=excluded.status,
    home=excluded.home, away=excluded.away, date=COALESCE(excluded.date,collected_fixtures.date)`);
  db.exec('BEGIN IMMEDIATE');
  try {
    for (const fixture of fixtures) insert.run(fixture.url, season, fixture.division, fixture.round,
      fixture.status, fixture.home, fixture.away, fixture.date, fixture.score);
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

/** @param {Database} db @param {number} season @param {import('./collection-types.js').MatchDocument} match */
export function saveMatch(db, season, match) {
  const now = new Date().toISOString();
  const quality = {missing: 0, partial: 1, published: 2};
  db.exec('BEGIN IMMEDIATE');
  try {
    saveMatchHeader(db, season, match, now);
    match.sheets.forEach((sheet, side) => {
      const old = db.prepare('SELECT state FROM collected_sheets WHERE match_url=? AND side=?').get(match.url, side);
      // Une disparition de composition côté source ne doit pas détruire une archive plus complète.
      if (old && quality[String(old.state)] > quality[sheet.state]) {
        db.prepare('UPDATE collected_sheets SET latest_state=? WHERE match_url=? AND side=?').run(sheet.state, match.url, side);
        return;
      }
      db.prepare(`INSERT INTO collected_sheets VALUES(?,?,?,?,?,?,?) ON CONFLICT(match_url,side) DO UPDATE SET
        name=excluded.name,club_url=excluded.club_url,state=excluded.state,latest_state=excluded.latest_state,updated_at=excluded.updated_at`)
        .run(match.url, side, sheet.name, sheet.clubURL, sheet.state, sheet.state, now);
      db.prepare('DELETE FROM collected_players WHERE match_url=? AND side=?').run(match.url, side);
      const insert = db.prepare('INSERT INTO collected_players VALUES(?,?,?,?,?,?,?,?,?)');
      sheet.players.forEach((player, ordinal) => insert.run(match.url, side, ordinal, player.name, player.key,
        player.shirt, player.status, player.entry, player.exit));
    });
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}

/** @param {Database} db @param {number} season @param {import('./collection-types.js').MatchDocument} match @param {string} now */
function saveMatchHeader(db, season, match, now) {
  db.prepare(`INSERT INTO collected_fixtures VALUES(?,?,?,?,?,?,?,?,?,?) ON CONFLICT(url) DO UPDATE SET
    division=excluded.division,round=excluded.round,status=excluded.status,home=excluded.home,away=excluded.away,
    date=excluded.date,score=excluded.score,read_at=excluded.read_at`).run(match.url, season, match.division,
    match.round, match.status, match.sheets[0].name, match.sheets[1].name, match.date, match.score, now);
}

/** @param {Database} db @param {number} season */
export function collectionCoverage(db, season) {
  const total = db.prepare("SELECT count(*) AS n FROM collected_fixtures WHERE season=? AND status='Terminé'").get(season);
  const groups = db.prepare(`SELECT f.division,s.state,count(*) AS n FROM collected_sheets s
    JOIN collected_fixtures f ON f.url=s.match_url WHERE f.season=? AND f.status='Terminé' GROUP BY f.division,s.state`).all(season);
  const count = (/** @type {string} */ state, d4 = false) => groups.filter(row => row.state === state && (!d4 || row.division === 'D4')).reduce((sum, row) => sum + Number(row.n), 0);
  const archived = count('published') + count('partial') + count('missing');
  const d4 = db.prepare("SELECT count(*) AS n FROM collected_fixtures WHERE season=? AND division='D4' AND status='Terminé'").get(season);
  const players = db.prepare(`SELECT count(*) AS n FROM collected_players p JOIN collected_fixtures f ON f.url=p.match_url WHERE f.season=? AND f.status='Terminé'`).get(season);
  const retained = db.prepare(`SELECT count(*) AS n FROM collected_sheets s JOIN collected_fixtures f ON f.url=s.match_url
    WHERE f.season=? AND s.state != s.latest_state`).get(season);
  const d4Calendar = db.prepare("SELECT count(*) AS n FROM collected_fixtures WHERE season=? AND division='D4'").get(season);
  const rounds = getMeta(db, `rounds:${season}`, 0);
  const standings = getMeta(db, `standings:${season}`, []);
  const calendarExpected = rounds ? ['a', 'b'].reduce((sum, pool) => sum + Math.floor(standings.filter(team => team.pool === pool).length / 2) * rounds, 0) : null;
  return {calendar: {discovered: Number(d4Calendar.n), expected: calendarExpected}, matches: Number(total.n), expected: Number(total.n) * 2, published: count('published'), partial: count('partial'),
    missing: count('missing'), uncollected: Math.max(0, Number(total.n) * 2 - archived), players: Number(players.n),
    retained: Number(retained.n), d4: {expected: Number(d4.n) * 2, published: count('published', true), partial: count('partial', true), missing: count('missing', true)}};
}

/** @param {Database} db @param {string} url */
export function readArchive(db, url) {
  const fixture = db.prepare('SELECT * FROM collected_fixtures WHERE url=? AND read_at IS NOT NULL').get(url);
  if (!fixture) return null;
  const sheets = db.prepare('SELECT * FROM collected_sheets WHERE match_url=? ORDER BY side').all(url);
  const players = db.prepare('SELECT name,status,shirt,entry,exit FROM collected_players WHERE match_url=? AND side=? ORDER BY ordinal');
  return {division: fixture.division, date: fixture.date, score: fixture.score,
    sheets: sheets.map(sheet => ({name: sheet.name, state: sheet.state, retained: sheet.state !== sheet.latest_state,
      players: players.all(url, sheet.side)}))};
}
