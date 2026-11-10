import {projectSeason} from '../server/season-projection.js';
import type {Snapshot, State, Coverage, Archive, MatchDocument} from './types.ts';

export function coverageOf(snapshot: Snapshot, state: Pick<State, 'standings' | 'rounds'>): Coverage {
  const finished = snapshot.fixtures.filter(f => f.status === 'Terminé');
  const urls = new Set(finished.map(f => f.url));
  const sheets = snapshot.matches.filter(m => urls.has(m.url)).flatMap(m => m.sheets.map(s => ({...s, division: m.division})));
  const count = (status: string, d4 = false) => sheets.filter(s => s.state === status && (!d4 || s.division === 'D4')).length;
  return {
    calendar: {discovered: snapshot.fixtures.filter(f => f.division === 'D4').length,
      expected: state.rounds ? ['a', 'b'].reduce((n, pool) => n + Math.floor(state.standings.filter(t => t.pool === pool).length / 2) * state.rounds, 0) : null},
    matches: finished.length, expected: finished.length * 2, published: count('published'), partial: count('partial'),
    missing: count('missing'), uncollected: Math.max(0, finished.length * 2 - sheets.length),
    players: sheets.reduce((n, s) => n + s.players.length, 0),
    retained: snapshot.matches.flatMap(m => m.sheets).filter(s => s.state !== s.latestState).length,
    d4: {expected: finished.filter(f => f.division === 'D4').length * 2, published: count('published', true),
      partial: count('partial', true), missing: count('missing', true)},
  };
}

export function preserveMatch(match: MatchDocument, old?: Archive): Archive {
  const quality = {missing: 0, partial: 1, published: 2};
  return {...match, sheets: match.sheets.map((sheet, side) => {
    const previous = old?.sheets[side];
    return {...(previous && quality[previous.state] > quality[sheet.state] ? previous : sheet), latestState: sheet.state};
  })};
}

export function projectSnapshot(season: number, snapshot: Snapshot, state: State) {
  const sheets: Record<string, string | number | null>[] = [];
  const participants: Record<string, string | number | null>[] = [];
  const fixtures = snapshot.fixtures.map(f => ({...f, season})).sort((a, b) => a.round - b.round || a.url.localeCompare(b.url));
  const byURL = new Map(fixtures.map(f => [f.url, f]));
  for (const match of snapshot.matches) {
    const fixture = byURL.get(match.url);
    match.sheets.forEach((sheet, side) => {
      sheets.push({match_url: match.url, side, name: sheet.name, club_url: sheet.clubURL,
        state: sheet.state, latest_state: sheet.latestState});
      if (fixture?.status !== 'Terminé') return;
      sheet.players.forEach((p, ordinal) => participants.push({match_url: match.url, side, ordinal,
        name: p.name, name_key: p.key, shirt: p.shirt, status: p.status, entry: p.entry, exit: p.exit,
        club_url: sheet.clubURL, division: fixture.division, date: fixture.date, url: match.url}));
    });
  }
  participants.sort((a, b) => String(b.date).localeCompare(String(a.date)) || Number(a.ordinal) - Number(b.ordinal));
  return projectSeason(season, state.standings, fixtures, sheets, participants, coverageOf(snapshot, state));
}
