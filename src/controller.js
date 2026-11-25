import {createView} from "./view.js";
import {createStandingsChart} from './standings-chart.js';
import {query} from './dom.js';
import {bindArchives} from './detail.js';
import {restoreNavigation, saveNavigation} from './navigation.js';
import {refreshClubLogos} from './club-logos.js';
import {LOGOS_EVENT, LOGOS_KEY} from './custom-logos.js';
import {isStatColumn} from './player-stats.js';

/** @param {HTMLElement} root @param {import("./types.js").SeasonData} data */
export function startObservatory(root, data) {
  const {clubs, dates, lastPlayed} = data;
  /** @type {import("./types.js").AppState} */
  const state = restoreNavigation(data);
  const persist = () => saveNavigation(data, state);
  const lifecycle = new AbortController();
  /** @template {keyof HTMLElementEventMap} K @param {HTMLElement} target @param {K} type @param {(event: HTMLElementEventMap[K]) => void} listener */
  const on = (target, type, listener) => target.addEventListener(type, listener, {signal: lifecycle.signal});
  /** @param {string} selector */
  const find = (selector) => query(root, selector, HTMLElement);
  const body = find('tbody'), scroll = find('.od-scroll');
  const range = query(root, '.od-range', HTMLInputElement);
  const play = query(root, '[data-play]', HTMLButtonElement);
  const prev = query(root, '[data-prev]', HTMLButtonElement), next = query(root, '[data-next]', HTMLButtonElement);
  const pool = query(root, '[data-pool]', HTMLSelectElement), sort = query(root, '[data-sort]', HTMLSelectElement);
  pool.value = state.pool;
  sort.value = state.sort;
  const {renderBoard, updateDay, renderDetail, keepDayVisible} = createView(root, data, state);
  const chart = createStandingsChart(root, data, state, lifecycle.signal);
  const playbackEnd = () => state.view === 'chart' ? chart.lastDay() : lastPlayed;
  function renderView() {
    const chartVisible = state.view === 'chart';
    for (const selector of ['.od-scroll', '.od-board-foot', '.od-legend', 'label:has([data-sort])']) find(selector).hidden = chartVisible;
    find('#od-chart').hidden = !chartVisible;
    root.querySelectorAll('[data-view]').forEach(button =>
      button.setAttribute('aria-pressed', String(button.getAttribute('data-view') === state.view)));
    find('[data-team-count]').textContent = clubs[state.pool].length + ' équipes';
    play.disabled = playbackEnd() < 1;
    if (chartVisible) { updateDay(); chart.render(); }
    else { renderBoard(); keepDayVisible(state.day); }
  }
  /** @param {number} day @param {boolean} announce */
  function setDay(day, announce = false) {
    const previous = state.day;
    state.day = Math.max(0,Math.min(day,dates.length - 1));
    if (state.selected && state.selected.day > state.day) {
      state.selected = null;
      if (state.view === 'matrix') renderDetail();
    }
    updateDay();
    if (state.view === 'chart') {
      if (state.day !== previous) chart.render(true);
    }
    else {
      if (state.stats) renderDetail();
      keepDayVisible(state.day);
    }
    persist();
    if (announce) find("[data-announcement]").textContent = range.getAttribute("aria-valuetext");
  }

  function stop() {
    if (state.timer !== null) clearInterval(state.timer);
    state.timer = null;
    find("[data-play-icon]").textContent = "▶";
    find("[data-play-label]").textContent = "Lecture";
    play.setAttribute('aria-pressed', 'false');
  }
  on(play, "click", () => {
    if (state.timer !== null) { stop(); return; }
    const end = playbackEnd();
    if (state.day >= end) setDay(0);
    find("[data-play-icon]").textContent = "Ⅱ";
    find("[data-play-label]").textContent = "Pause";
    play.setAttribute('aria-pressed', 'true');
    state.timer = setInterval(() => {
      setDay(state.day + 1);
      if (state.day >= end) {
        stop();
        find("[data-announcement]").textContent = "Lecture terminée à la journée " + (end + 1);
      }
    }, 780);
  });
  on(prev, "click", () => { stop(); setDay(state.day - 1, true); });
  on(next, "click", () => { stop(); setDay(state.day + 1, true); });
  on(range, "input", () => { stop(); setDay(Number(range.value)); });
  on(pool, "change", () => {
    stop();
    if (pool.value !== 'a' && pool.value !== 'b') return;
    state.pool = pool.value;
    delete state.stats;
    state.day = Math.max(0,playbackEnd());
    state.selected = null;
    persist();
    renderView();
    find("[data-announcement]").textContent = pool.selectedOptions[0].textContent + ", " + clubs[state.pool].length + " équipes.";
  });
  on(sort, "change", () => {
    stop();
    const positions = new Map(Array.from(body.querySelectorAll("[data-row]"), (row) => [row.getAttribute('data-row'),row.getBoundingClientRect().top]));
    if (!['rank', 'name', 'total'].includes(sort.value)) return;
    state.sort = /** @type {import('./types.js').SortMode} */ (sort.value);
    persist();
    renderBoard();
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    body.querySelectorAll("[data-row]").forEach((row) => {
      const delta = (positions.get(row.getAttribute('data-row')) ?? row.getBoundingClientRect().top) - row.getBoundingClientRect().top;
      if (delta) row.animate([{transform:"translateY(" + delta + "px)"},{transform:"translateY(0)"}], {duration:240,easing:"cubic-bezier(.2,.65,.3,1)"});
    });
  });
  function closeDetail() {
    if (state.stats) {
      const team = state.stats.team;
      delete state.stats;
      renderDetail();
      const trigger = query(body, `[data-stats-team="${team}"]`, HTMLButtonElement);
      trigger.focus({preventScroll:true});
      trigger.scrollIntoView({block:'nearest', inline:'nearest'});
      return;
    }
    if (!state.selected) return;
    const {team,day} = state.selected;
    state.selected = null;
    persist();
    renderDetail();
    query(body, '[data-team="' + team + '"][data-day="' + day + '"]', HTMLButtonElement).focus({preventScroll:true});
  }
  on(root, "click", (event) => {
    const button = event.target instanceof Element ? event.target.closest('button') : null;
    if (!button || button.disabled) return;
    const view = button.dataset.view;
    if (view === 'matrix' || view === 'chart') {
      if (state.view !== view) {
        stop();
        state.view = view;
        renderView();
        persist();
        find('[data-announcement]').textContent = button.textContent + ', journée ' + (state.day + 1);
      }
      return;
    }
    if (button.dataset.statsTeam !== undefined) {
      stop();
      const team = Number(button.dataset.statsTeam);
      if (state.stats?.team === team) { closeDetail(); return; }
      state.selected = null;
      state.stats = {team, column: 'appearances', ascending: false};
      persist();
      renderDetail(event.detail === 0);
      return;
    }
    const column = button.dataset.statSort;
    if (column && isStatColumn(column) && state.stats) {
      stop();
      state.stats.ascending = state.stats.column === column ? !state.stats.ascending : column === 'name';
      state.stats.column = column;
      renderDetail();
      query(body, `[data-stat-sort="${column}"]`, HTMLButtonElement).focus({preventScroll:true});
      return;
    }
    if (button.hasAttribute("data-jump")) {
      stop();
      setDay(Number(button.dataset.jump),true);
    }
    if (button.hasAttribute("data-team")) {
      stop();
      delete state.stats;
      const day = Number(button.dataset.day);
      const team = Number(button.dataset.team);
      if (state.selected?.day === day && state.selected?.team === team) { closeDetail(); return; }
      state.selected = {day,team};
      persist();
      renderDetail(event.detail === 0);
    }
    if (button.hasAttribute("data-close")) closeDetail();
  });
  on(root, "keydown", (event) => {
    if (state.view === 'matrix' && event.key === "Escape" && (state.selected || state.stats)) closeDetail();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }, {signal: lifecycle.signal});
  bindArchives(root, lifecycle.signal);
  window.addEventListener(LOGOS_EVENT, () => refreshClubLogos(root), {signal: lifecycle.signal});
  window.addEventListener('storage', event => {
    if (event.key === LOGOS_KEY || event.key === null) refreshClubLogos(root);
  }, {signal: lifecycle.signal});

  const resize = new ResizeObserver(() => root.style.setProperty("--od-view", scroll.clientWidth + "px"));
  resize.observe(scroll);
  renderView();
  const frame = requestAnimationFrame(() => { if (state.view === 'matrix') keepDayVisible(state.day); });
  return () => { stop(); lifecycle.abort(); resize.disconnect(); cancelAnimationFrame(frame); };
}
