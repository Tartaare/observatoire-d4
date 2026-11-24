import {parseMatch} from './source.js';

/** @param {import('node:sqlite').DatabaseSync} db */
export function migratePlayerEvents(db) {
  const migrated = () => db.prepare("SELECT 1 FROM pragma_table_info('collected_sheets') WHERE name='event_only'").get();
  if (migrated()) return;
  db.exec('BEGIN IMMEDIATE');
  try {
    if (!migrated()) {
      if (!db.prepare("SELECT 1 FROM pragma_table_info('collected_players') WHERE name='events'").get()) {
        db.exec('ALTER TABLE collected_players ADD COLUMN events TEXT CHECK(events IS NULL OR json_valid(events))');
      }
      db.exec('ALTER TABLE collected_sheets ADD COLUMN event_only TEXT CHECK(event_only IS NULL OR json_valid(event_only))');
      const saveExtra = db.prepare('UPDATE collected_sheets SET event_only=? WHERE match_url=? AND side=?');
      const pages = db.prepare(`SELECT f.*,p.body FROM collected_fixtures f JOIN source_pages p USING(url)
        WHERE f.division='D4' AND f.read_at IS NOT NULL`);
      const roster = db.prepare(`SELECT ordinal,name_key,shirt,status,entry,exit FROM collected_players
        WHERE match_url=? AND side=? ORDER BY ordinal`);
      const update = db.prepare('UPDATE collected_players SET events=? WHERE match_url=? AND side=? AND ordinal=?');
      for (const page of pages.iterate()) {
        let match;
        try { match = parseMatch(String(page.body), String(page.url), Number(page.season)); }
        catch { console.warn('Événements illisibles dans la page archivée', page.url); continue; }
        if (match.division !== page.division || match.round !== page.round || match.date !== page.date ||
          match.score !== page.score || match.sheets[0].name !== page.home || match.sheets[1].name !== page.away) continue;
        match.sheets.forEach((sheet, side) => {
          const rows = roster.all(match.url, side);
          if (rows.length !== sheet.players.length || rows.some((row, i) => {
            const p = sheet.players[i];
            return row.name_key !== p.key || row.shirt !== p.shirt || row.status !== p.status || row.entry !== p.entry || row.exit !== p.exit;
          })) return;
          saveExtra.run(JSON.stringify(sheet.eventOnly), match.url, side);
          sheet.players.forEach((p, i) => update.run(JSON.stringify(p.events), match.url, side, rows[i].ordinal));
        });
      }
    }
    db.exec('COMMIT');
  } catch (error) { db.exec('ROLLBACK'); throw error; }
}
