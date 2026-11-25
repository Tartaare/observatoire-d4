import {escapeHTML, query} from './dom.js';
import {standingsHistory} from './standings.js';

/** @param {number} day */
const dayLabel = day => 'J' + String(day + 1).padStart(2, '0');
/** @param {number} rank */
const place = rank => rank === 1 ? '1er' : rank + 'e';

/** @param {HTMLElement} root @param {import('./types.js').SeasonData} data @param {import('./types.js').AppState} state
 * @param {AbortSignal} signal */
export function createStandingsChart(root, data, state, signal) {
  const panel = query(root, '#od-chart', HTMLElement);
  const plot = query(panel, '[data-rank-plot]', HTMLElement);
  const list = query(panel, '[data-chart-teams]', HTMLElement);
  const picker = query(panel, '[data-chart-team]', HTMLSelectElement);
  /** @type {import('./types.js').PoolId | undefined} */
  let pickerPool;
  const empty = query(panel, '[data-chart-empty]', HTMLElement);
  const layout = query(panel, '[data-chart-layout]', HTMLElement);
  /** @type {Partial<Record<import('./types.js').PoolId, import('./standings.js').RoundStanding[]>>} */
  const cache = {};
  /** @type {Partial<Record<import('./types.js').PoolId, number>>} */
  const followed = {};
  const history = () => cache[state.pool] ??= standingsHistory(data, state.pool);
  const lastDay = () => history().at(-1)?.day ?? -1;

  /** @param {boolean} [animate] */
  function draw(animate = false) {
    if (panel.hidden || layout.hidden) return;
    const width = plot.clientWidth, height = plot.clientHeight;
    if (!width || !height) return;
    const teams = data.clubs[state.pool];
    const rounds = history().filter(round => round.day <= state.day);
    const latest = rounds.at(-1);
    if (!latest) return;
    const selected = followed[state.pool];
    const end = lastDay();
    const left = 31, right = width - 17, top = 18, bottom = height - 28;
    /** @param {number} day */
    const x = day => left + (right - left) * day / Math.max(1, end);
    /** @param {number} rank */
    const y = rank => top + (bottom - top) * (rank - 1) / Math.max(1, teams.length - 1);
    const grid = teams.map((_, index) => {
      const at = y(index + 1);
      return `<line class="od-rank-grid" x1="${left}" x2="${right}" y1="${at}" y2="${at}"/><text class="od-rank-axis" x="${left - 9}" y="${at + 4}" text-anchor="end">${index + 1}</text>`;
    }).join('');
    const step = Math.max(1, Math.ceil(44 * end / (right - left)));
    const ticks = Array.from({length: end + 1}, (_, day) => {
      if (day !== end && (day % step || day > end - step && day !== 0)) return '';
      return `<text class="od-rank-axis" x="${x(day)}" y="${height - 5}" text-anchor="middle">${dayLabel(day)}</text>`;
    }).join('');
    const series = [...latest.positions].sort((a, b) => Number(a.team === selected) - Number(b.team === selected)).map(({team}) => {
      const active = team === selected;
      let previousDay = -2, previous = '', path = '', entering = '', marks = '';
      for (const round of rounds) {
        const position = round.positions.find(row => row.team === team);
        if (!position) continue;
        const cx = x(round.day), cy = y(position.rank), point = `${cx} ${cy}`;
        if (previousDay === round.day - 1 && animate && round === latest) {
          entering = `<path class="od-rank-line od-rank-enter" pathLength="1" d="M${previous}L${point}"/>`;
        } else path += (previousDay === round.day - 1 ? 'L' : 'M') + point;
        marks += `<circle cx="${cx}" cy="${cy}" r="${active ? 4.5 : 2.3}"/>`;
        previousDay = round.day;
        previous = point;
      }
      return `<g class="od-rank-series${active ? ' od-followed' : ''}"><title>${escapeHTML(teams[team][0])}</title><path class="od-rank-line" d="${path}"/>${entering}${marks}</g>`;
    }).join('');
    const description = rounds.map(round => `${dayLabel(round.day)}, rang ${round.positions.find(row => row.team === selected)?.rank}`).join('. ');
    const label = escapeHTML(teams[selected ?? 0][0]);
    plot.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="od-plot-title od-plot-desc"><title id="od-plot-title">Évolution du classement de ${label}</title><desc id="od-plot-desc">${description}.</desc>${grid}${ticks}<line class="od-rank-cursor" x1="${x(latest.day)}" x2="${x(latest.day)}" y1="${top}" y2="${bottom}"/>${series}</svg>`;
  }

  /** @param {boolean} [animate] */
  function render(animate = false) {
    const teams = data.clubs[state.pool];
    const round = history().filter(item => item.day <= state.day).at(-1);
    empty.hidden = !!round;
    layout.hidden = !round;
    if (!round) {
      empty.textContent = teams.length ? 'Aucun résultat disponible dans cette poule jusqu’à ' + dayLabel(state.day) + '.' : 'Aucune équipe dans cette poule.';
      return;
    }
    const selected = followed[state.pool] ??= round.positions[0].team;
    const current = round.positions.find(row => row.team === selected);
    if (!current) return;
    query(panel, '[data-chart-round]', HTMLElement).textContent = 'Classement reconstitué · ' + dayLabel(round.day);
    query(panel, '[data-chart-name]', HTMLElement).textContent = teams[selected][0];
    const tied = round.positions.some(row => row.team !== selected && row.rank === current.rank);
    query(panel, '[data-chart-value]', HTMLElement).textContent = `${place(current.rank)}${tied ? ' ex æquo' : ''} · ${current.points} pt${Math.abs(current.points) > 1 ? 's' : ''}`;
    const published = query(panel, '[data-published-rank]', HTMLElement);
    published.hidden = data.mode !== 'live' || round.day !== lastDay() || selected + 1 === current.rank;
    if (!published.hidden) published.textContent = 'Dernier rang publié · ' + place(selected + 1);
    const focused = document.activeElement instanceof HTMLButtonElement && list.contains(document.activeElement) ? document.activeElement.dataset.follow : null;
    list.innerHTML = round.positions.map(({team, rank, points}) =>
      `<button type="button" data-follow="${team}" aria-pressed="${team === selected}"><span aria-label="Rang ${rank}">${rank}</span><b>${escapeHTML(teams[team][0])}</b><small>${points} pts</small></button>`
    ).join('');
    if (focused != null) list.querySelector(`[data-follow="${focused}"]`)?.closest('button')?.focus({preventScroll:true});
    if (pickerPool !== state.pool) {
      picker.replaceChildren(...teams.map(([name], team) => new Option(name, String(team))));
      pickerPool = state.pool;
    }
    picker.value = String(selected);
    plot.style.minHeight = Math.max(250, teams.length * 18 + 44) + 'px';
    draw(animate);
  }
  picker.addEventListener('change', () => { followed[state.pool] = Number(picker.value); render(); }, {signal});
  list.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (button) { followed[state.pool] = Number(button.dataset.follow); render(); }
  }, {signal});
  const resize = new ResizeObserver(() => draw());
  resize.observe(plot);
  signal.addEventListener('abort', () => resize.disconnect(), {once:true});
  return {render, lastDay};
}
