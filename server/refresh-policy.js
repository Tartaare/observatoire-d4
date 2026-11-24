const hour = 3_600_000;
const day = 24 * hour;
export const calendarAge = hour / 4;

/** @param {string | null} date @param {boolean} complete @param {number} [now] */
export function matchAge(date, complete, now = Date.now()) {
  if (!complete) return hour;
  return date && now - Date.parse(date) >= 14 * day ? 7 * day : day;
}

/** @typedef {{key: string, until: number}} Verification */
/** @param {{division: string, round: number, home: string, away: string}} fixture */
export const fixtureKey = fixture => JSON.stringify([fixture.division, fixture.round, fixture.home, fixture.away]);

/** @param {Verification | null | undefined} check @param {string} [key] */
export const isFresh = (check, key = '') => check?.key === key && check.until > Date.now();
