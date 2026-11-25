import {escapeHTML, query} from './dom.js';
import {standingsHistory} from './standings.js';
import {clubBadge, bindClubLogoFallbacks} from './club-logos.js';

/** @param {number} day */
const dayLabel = day => 'J' + String(day + 1).padStart(2, '0');
/** @param {number} rank */
const place = rank => rank === 1 ? '1er' : rank + 'e';
/** @param {number} a @param {number} b @param {number} t */
const mix = (a, b, t) => a + (b - a) * t;

/** @param {HTMLElement} plot @param {import('./types.js').Club[]} teams
 * @param {import('./standings.js').RoundStanding[]} rounds @param {number} selected */
function mountPlot(plot, teams, rounds, selected) {
  const width = plot.clientWidth, height = plot.clientHeight;
  const left = width < 350 ? 21 : 32, right = width - 45, top = 19, bottom = height - 36;
  const end = rounds[rounds.length - 1].day;
  /** @param {number} day */
  const x = day => left + (right - left) * day / Math.max(1, end);
  /** @param {number} rank */
  const y = rank => top + (bottom - top) * (rank - 1) / Math.max(1, teams.length - 1);

  // Les écussons occupent chacun 28 px. Seuls leurs centres sont décalés en cas d’égalité.
  const frames = rounds.map(round => {
    const centers = round.positions.map(row => y(row.rank));
    for (let i = 1; i < centers.length; i++) centers[i] = Math.max(centers[i], centers[i - 1] + 30);
    centers[centers.length - 1] = Math.min(centers[centers.length - 1], bottom);
    for (let i = centers.length - 2; i >= 0; i--) centers[i] = Math.min(centers[i], centers[i + 1] - 30);
    const points = round.positions.map((row, i) => ({team:row.team, y:y(row.rank), label:centers[i]})).sort((a,b) => a.team - b.team);
    return {day:round.day, points};
  });
  const grid = teams.map((_, i) => `<line class="od-rank-grid" x1="${left}" x2="${right}" y1="${y(i + 1)}" y2="${y(i + 1)}"/><text class="od-rank-axis" x="${left - 8}" y="${y(i + 1) + 4}" text-anchor="end">${i + 1}</text>`).join('');
  const step = Math.max(1, Math.ceil(36 * end / Math.max(1, right - left)));
  const ticks = Array.from({length:end + 1}, (_, day) => {
    if (day !== end && (day % step || day > end - step && day !== 0)) return '';
    return `<text class="od-rank-axis" x="${x(day)}" y="${height - 6}" text-anchor="middle">${dayLabel(day)}</text>`;
  }).join('');
  const order = teams.map((_, i) => i).filter(i => i !== selected).concat(selected);
  const trails = order.map(team => {
    let path = '', dots = '';
    for (const [i, frame] of frames.entries()) {
      const pointX = x(frame.day), pointY = frame.points[team].y;
      const previous = frames[i - 1];
      if (!previous || previous.day + 1 !== frame.day) path += `M${pointX} ${pointY}`;
      else {
        const dx = (pointX - x(previous.day)) / 3;
        path += `C${x(previous.day) + dx} ${previous.points[team].y} ${pointX - dx} ${pointY} ${pointX} ${pointY}`;
      }
      dots += `<circle cx="${pointX}" cy="${pointY}" r="${team === selected ? 3.5 : 2}"/>`;
    }
    return `<g class="od-rank-series${team === selected ? ' od-followed' : ''}"><path class="od-rank-line" d="${path}"/>${dots}</g>`;
  }).join('');
  const tips = order.map(team => {
    const [name, initials] = teams[team];
    return `<g class="od-rank-series od-rank-tip${team === selected ? ' od-followed' : ''}" data-tip="${team}"><title>${escapeHTML(name)}</title><path class="od-rank-link"/><circle r="${team === selected ? 5 : 3}"/><foreignObject x="13" width="28" height="28"><div xmlns="http://www.w3.org/1999/xhtml">${clubBadge(name, initials)}</div></foreignObject></g>`;
  }).join('');
  plot.innerHTML = `<svg viewBox="0 0 ${width} ${height}" role="img" aria-labelledby="od-plot-title od-plot-desc"><title id="od-plot-title">Évolution du classement de ${escapeHTML(teams[selected][0])}</title><desc id="od-plot-desc"></desc><defs><clipPath id="od-rank-reveal"><rect height="${height}"/></clipPath></defs>${grid}${ticks}<g clip-path="url(#od-rank-reveal)">${trails}</g><line class="od-rank-cursor" x1="0" x2="0" y1="${top}" y2="${bottom}"/>${tips}</svg>`;
  bindClubLogoFallbacks(plot);
  const clip = query(plot, 'clipPath rect', SVGRectElement);
  const cursor = query(plot, '.od-rank-cursor', SVGLineElement);
  const heads = Array.from(plot.querySelectorAll('[data-tip]'), group => ({
    team:Number(group.getAttribute('data-tip')), group, link:query(group, 'path', SVGPathElement),
    badge:query(group, 'foreignObject', SVGForeignObjectElement)
  }));
  return {
    describe(/** @type {number} */ day) {
      query(plot, 'desc', SVGDescElement).textContent = rounds.filter(round => round.day <= day)
        .map(round => `${dayLabel(round.day)}, rang ${round.positions.find(row => row.team === selected)?.rank}`).join('. ');
    },
    paint(/** @type {number} */ day) {
      let i = 0;
      while (i + 1 < frames.length && frames[i + 1].day <= day) i++;
      const from = frames[i], to = frames[i + 1] ?? from;
      const fraction = to.day === from.day + 1 ? Math.max(0, day - from.day) : 0;
      const blend = fraction * fraction * (3 - 2 * fraction);
      const cx = x(from.day + fraction);
      clip.setAttribute('width', String(cx));
      cursor.setAttribute('transform', `translate(${cx} 0)`);
      for (const {team, group, link, badge} of heads) {
        const cy = mix(from.points[team].y, to.points[team].y, blend);
        const offset = mix(from.points[team].label, to.points[team].label, blend) - cy;
        group.setAttribute('transform', `translate(${cx} ${cy})`);
        link.setAttribute('d', `M0 0 L12 ${offset}`);
        badge.setAttribute('y', String(offset - 14));
      }
    }
  };
}

/** @param {HTMLElement} root @param {import('./types.js').SeasonData} data @param {import('./types.js').AppState} state
 * @param {AbortSignal} signal */
export function createStandingsChart(root, data, state, signal) {
  const panel = query(root, '#od-chart', HTMLElement);
  const plot = query(panel, '[data-rank-plot]', HTMLElement);
  const list = query(panel, '[data-chart-teams]', HTMLElement);
  const toggle = query(panel, '.od-team-toggle', HTMLButtonElement);
  const empty = query(panel, '[data-chart-empty]', HTMLElement);
  const layout = query(panel, '[data-chart-layout]', HTMLElement);
  /** @type {Partial<Record<import('./types.js').PoolId, import('./standings.js').RoundStanding[]>>} */
  const cache = {};
  /** @type {Partial<Record<import('./types.js').PoolId, number>>} */
  const followed = {};
  const history = () => cache[state.pool] ??= standingsHistory(data, state.pool);
  const lastDay = () => history().at(-1)?.day ?? -1;
  const motion = matchMedia('(prefers-reduced-motion: reduce)');
  /** @type {ReturnType<typeof mountPlot> | undefined} */
  let scene;
  let geometry = '', listPool = '', frame = 0, displayed = 0, destination = -1;

  function stopMotion() { cancelAnimationFrame(frame); frame = 0; }
  /** @param {boolean} animate */
  function draw(animate) {
    const round = history().filter(item => item.day <= state.day).at(-1);
    const selected = followed[state.pool];
    if (panel.hidden || !round || selected === undefined || !plot.clientWidth || !plot.clientHeight) return;
    const key = [state.pool, selected, plot.clientWidth, plot.clientHeight].join(':');
    if (key !== geometry || !scene) {
      scene = mountPlot(plot, data.clubs[state.pool], history(), selected);
      geometry = key;
      if (animate && frame && destination === round.day) {
        scene.describe(destination);
        scene.paint(displayed);
        return;
      }
    } else if (animate && destination === round.day) return;
    stopMotion();
    destination = round.day;
    scene.describe(destination);
    if (!animate || motion.matches || displayed === destination) {
      displayed = destination;
      scene.paint(displayed);
      return;
    }
    const start = displayed, since = performance.now();
    const duration = Math.min(680, 500 + 42 * Math.abs(destination - start));
    /** @param {number} now */
    function tick(now) {
      if (panel.hidden || document.hidden) { stopMotion(); return; }
      const t = Math.min(1, Math.max(0, (now - since) / duration));
      // Courbe à vitesse nulle aux extrémités pour un départ et un arrêt sans à-coup.
      const ease = t * t * (3 - 2 * t);
      displayed = mix(start, destination, ease);
      scene?.paint(displayed);
      frame = t < 1 ? requestAnimationFrame(tick) : 0;
    }
    frame = requestAnimationFrame(tick);
  }

  /** @param {boolean} expanded */
  function expandList(expanded) {
    toggle.setAttribute('aria-expanded', String(expanded));
    toggle.setAttribute('aria-label', expanded ? 'Réduire la liste des équipes' : 'Afficher les noms des équipes');
  }
  /** @param {boolean} [animate] */
  function render(animate = false) {
    const teams = data.clubs[state.pool];
    const round = history().filter(item => item.day <= state.day).at(-1);
    empty.hidden = !!round;
    layout.hidden = !round;
    if (!round) {
      stopMotion();
      destination = -1;
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

    if (listPool !== state.pool) {
      list.innerHTML = teams.map(([name, initials], team) => `<button type="button" class="od-club od-chart-row" data-follow="${team}"><span class="od-rank"></span>${clubBadge(name, initials)}<span class="od-team-name">${escapeHTML(name)}</span><small></small></button>`).join('');
      bindClubLogoFallbacks(list);
      listPool = state.pool;
      expandList(false);
    }
    const focused = document.activeElement;
    for (const [index, {team, rank, points}] of round.positions.entries()) {
      const row = query(list, `[data-follow="${team}"]`, HTMLButtonElement);
      row.setAttribute('aria-pressed', String(team === selected));
      row.setAttribute('aria-label', `${teams[team][0]}, rang ${rank}, ${points} points`);
      query(row, '.od-rank', HTMLElement).textContent = String(rank);
      query(row, 'small', HTMLElement).textContent = points + ' pts';
      if (list.children[index] !== row) list.insertBefore(row, list.children[index]);
    }
    if (focused instanceof HTMLButtonElement && list.contains(focused) && document.activeElement !== focused) focused.focus({preventScroll:true});
    plot.style.minHeight = Math.max(250, (teams.length - 1) * 30 + 55) + 'px';
    draw(animate && destination >= 0);
  }
  toggle.addEventListener('click', () => expandList(toggle.getAttribute('aria-expanded') !== 'true'), {signal});
  root.addEventListener('pointerdown', event => {
    if (toggle.getAttribute('aria-expanded') === 'true' && event.target instanceof Element && !event.target.closest('.od-chart-rail')) expandList(false);
  }, {signal});
  panel.addEventListener('keydown', event => {
    if (event.key === 'Escape' && toggle.getAttribute('aria-expanded') === 'true') { expandList(false); toggle.focus(); }
  }, {signal});
  list.addEventListener('click', event => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (button) {
      followed[state.pool] = Number(button.dataset.follow);
      expandList(false);
      render();
    }
  }, {signal});
  const resize = new ResizeObserver(() => {
    if (geometry !== [state.pool, followed[state.pool], plot.clientWidth, plot.clientHeight].join(':')) draw(!!frame);
  });
  resize.observe(plot);
  motion.addEventListener('change', () => draw(false), {signal});
  document.addEventListener('visibilitychange', () => { if (document.hidden) { stopMotion(); } else draw(false); }, {signal});
  signal.addEventListener('abort', () => { stopMotion(); resize.disconnect(); }, {once:true});
  return {render, lastDay};
}
