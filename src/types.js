/**
 * @typedef {'a' | 'b'} PoolId
 * @typedef {'rank' | 'name' | 'total'} SortMode
 * @typedef {[name: string, initials: string, counts: (number | null)[]]} Club
 * @typedef {[date: string, division: string, context: string]} HistoryEntry
 * @typedef {[name: string, status: string, history: HistoryEntry[]]} Player
 * @typedef {{lastPlayed: number, dates: string[], clubs: Record<PoolId, Club[]>,
 *   examplePlayers: Player[], exampleURL: string, exampleSources: Record<string, string>,
 *   mockNames: string[]}} SeasonData
 * @typedef {{pool: PoolId, sort: SortMode, day: number,
 *   selected: {day: number, team: number} | null,
 *   timer: ReturnType<typeof setInterval> | null}} AppState
 */
export {};
