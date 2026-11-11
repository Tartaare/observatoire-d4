import {createView} from "./view.js";
import {query} from './dom.js';
import {bindArchives} from './detail.js';
import {restoreNavigation, saveNavigation} from './navigation.js';
import {refreshClubLogos} from './club-logos.js';
import {LOGOS_EVENT, LOGOS_KEY} from './custom-logos.js';

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
  /** @param {number} day @param {boolean} announce */
  function setDay(day, announce = false) {
    state.day = Math.max(0,Math.min(day,dates.length - 1));
    if (state.selected && state.selected.day > state.day) {
      state.selected = null;
      renderDetail();
    }
    updateDay();
    keepDayVisible(state.day);
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
    if (state.day >= lastPlayed) setDay(0);
    find("[data-play-icon]").textContent = "Ⅱ";
    find("[data-play-label]").textContent = "Pause";
    play.setAttribute('aria-pressed', 'true');
    state.timer = setInterval(() => {
      setDay(state.day + 1);
      if (state.day >= lastPlayed) {
        stop();
        find("[data-announcement]").textContent = "Lecture terminée à la journée " + (lastPlayed + 1);
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
    state.day = Math.max(0,lastPlayed);
    state.selected = null;
    persist();
    renderBoard();
    keepDayVisible(state.day);
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
    if (button.hasAttribute("data-jump")) {
      stop();
      setDay(Number(button.dataset.jump),true);
    }
    if (button.hasAttribute("data-team")) {
      stop();
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
    if (event.key === "Escape" && state.selected) closeDetail();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); }, {signal: lifecycle.signal});
  bindArchives(root, lifecycle.signal);
  window.addEventListener(LOGOS_EVENT, () => refreshClubLogos(root), {signal: lifecycle.signal});
  window.addEventListener('storage', event => {
    if (event.key === LOGOS_KEY || event.key === null) refreshClubLogos(root);
  }, {signal: lifecycle.signal});

  const resize = new ResizeObserver(() => root.style.setProperty("--od-view", scroll.clientWidth + "px"));
  resize.observe(scroll);
  renderBoard();
  play.disabled = lastPlayed < 1;
  const frame = requestAnimationFrame(() => keepDayVisible(state.day));
  return () => { stop(); lifecycle.abort(); resize.disconnect(); cancelAnimationFrame(frame); };
}
