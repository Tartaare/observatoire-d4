/**
 * @typedef {'a' | 'b'} PoolId
 * @typedef {'rank' | 'name' | 'total'} SortMode
 * @typedef {[name: string, initials: string, counts: (number | null)[]]} Club
 * @typedef {[date: string, division: string, context: string]} HistoryEntry
 * @typedef {[name: string, status: string, history: HistoryEntry[]]} Player
 * @typedef {{name: string, status: 'starter' | 'entered' | 'unverified', shirt: number | null,
 *   entry: string | null, exit: string | null, history: {date: string, division: string,
 *   team: string, sourceURL: string}[]}} RosterPlayer
 * @typedef {{count: number | null, score: string, home: string, away: string, players: Player[],
 *   featured: boolean, realSheet: boolean, sourceURL: string, matchDate: string | null,
 *   statusLabel: string, sheetState: 'published' | 'partial' | 'missing' | 'uncollected',
 *   retained: boolean, roster: RosterPlayer[]}} LiveMatch
 * @typedef {{calendar: {discovered: number, expected: number | null}, matches: number, expected: number, published: number, partial: number, missing: number,
 *   uncollected: number, retained: number, players: number,
 *   d4: {expected: number, published: number, partial: number, missing: number}}} Coverage
 * @typedef {{lastPlayed: number, dates: (string | null)[], clubs: Record<PoolId, Club[]>,
 *   examplePlayers: Player[], exampleURL: string, exampleSources: Record<string, string>,
 *   mockNames: string[], mode?: 'live', seasonStart?: number,
 *   matches?: Record<string, LiveMatch>, coverage?: Coverage}} SeasonData
 * @typedef {{pool: PoolId, sort: SortMode, day: number,
 *   selected: {day: number, team: number} | null,
 *   timer: ReturnType<typeof setInterval> | null}} AppState
 */
export {};
