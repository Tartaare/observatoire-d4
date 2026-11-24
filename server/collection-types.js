/**
 * @typedef {'starter' | 'entered' | 'unverified'} ParticipationStatus
 * @typedef {'published' | 'partial' | 'missing'} SheetState
 * @typedef {{goals: number, yellows: number, reds: number, goalsComplete: boolean,
 *   yellowsComplete: boolean, redsComplete: boolean}} PlayerEvents
 * @typedef {{name: string, key: string, shirt: number | null, status: ParticipationStatus,
 *   entry: string | null, exit: string | null, events?: PlayerEvents | null}} Participant
 * @typedef {{name: string, events: PlayerEvents}} EventPlayer
 * @typedef {{name: string, clubURL: string | null, state: SheetState, players: Participant[], eventOnly?: EventPlayer[]}} Sheet
 * @typedef {{url: string, division: string, round: number, status: string,
 *   home: string, away: string, date: string | null, score: string | null}} Fixture
 * @typedef {{url: string, division: string, round: number, date: string,
 *   score: string, status: string, sheets: Sheet[]}} MatchDocument
 * @typedef {{pool: 'a' | 'b', rank: number, name: string, clubURL: string}} Standing
 * @typedef {{running: boolean, phase: string, done: number, total: number,
 *   startedAt: string | null, finishedAt: string | null, lastSuccess: string | null,
 *   errors: {url: string, message: string}[], requests: number, cached: number}} SyncStatus
 */
export {};
