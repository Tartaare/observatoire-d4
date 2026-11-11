import {createSeason, matchResult} from '../season.js';
import type {AppState, SeasonData, LiveMatch} from '../types.js';

export type {AppState, SeasonData, LiveMatch};
export type Navigation = Omit<AppState, 'timer'>;
export const dayLabel = (day: number) => `J${String(day + 1).padStart(2, '0')}`;
export function dateLabel(date: string | null | undefined, long = false) {
  return date ? new Intl.DateTimeFormat('fr-FR', {day: 'numeric', month: long ? 'long' : 'short', timeZone: 'UTC'}).format(new Date(date)) : 'Date à confirmer';
}
export function cellState(data: SeasonData, state: Navigation, team: number, day: number, season?: ReturnType<typeof createSeason>) {
  const [name, , counts] = data.clubs[state.pool][team];
  const match = data.matches?.[`${state.pool}:${team}:${day}`];
  const forfeit = !!match?.statusLabel.match(/^Forfait\b/i);
  const future = data.mode === 'live' ? !match || match.statusLabel !== 'Terminé' && !forfeit : day > data.lastPlayed;
  const hidden = !future && day > state.day;
  const missing = counts[day] == null && !forfeit;
  const disabled = future || hidden;
  const value = future || forfeit && !hidden ? '—' : hidden ? '·' : missing ? '?' : String(counts[day]);
  const result = disabled ? null : matchResult(match ?? (season ?? createSeason(data)).matchAt(day, team, state.pool), name);
  const description = future ? match?.statusLabel ?? 'Rencontre non indexée' : hidden ? 'Après le curseur' : forfeit ? 'Rencontre non jouée' : missing
    ? match?.sheetState === 'partial' ? 'Composition partielle' : 'Feuille manquante ou non archivée'
    : `${counts[day]} ${data.mode === 'live' ? 'repérage(s) à confirmer' : 'joueur(s)'}`;
  return {value, disabled, missing: missing && !disabled && !forfeit, tone: !disabled && !missing ? Math.min(counts[day]!, 5) : undefined,
    result, label: `${name}, journée ${day + 1}, ${description}${result ? `, ${result.label}` : ''}`};
}
export function teamOrder(data: SeasonData, state: Navigation) {
  const teams = data.clubs[state.pool];
  const total = (team: number) => teams[team][2].reduce<number>((sum, count) => sum + (count ?? 0), 0);
  return teams.map((_, index) => index).sort((a, b) => state.sort === 'name' ? teams[a][0].localeCompare(teams[b][0], 'fr')
    : state.sort === 'total' ? total(b) - total(a) : a - b);
}
