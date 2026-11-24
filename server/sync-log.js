/** @param {number} season @param {import('./collection-types.js').SyncStatus} state
 * @param {string} event @param {string} [url] @param {string} [error] */
export function logSync(season, state, event, url, error) {
  const entry = {service: 'observatoire-sync', season, startedAt: state.startedAt, event, phase: state.phase,
    done: state.done, total: state.total, requests: state.requests, cached: state.cached,
    errors: state.errors.length, url, error};
  if (error) console.warn(JSON.stringify(entry));
  else console.info(JSON.stringify(entry));
}
