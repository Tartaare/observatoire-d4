import {createView} from "./view.js";
import {query} from './dom.js';

/** @param {HTMLElement} root @param {import("./types.js").SeasonData} data */
export function startObservatory(root, data) {
  const {clubs, dates, lastPlayed} = data;
  /** @type {import("./types.js").AppState} */
  const state = {pool:"a",sort:"rank",day:lastPlayed,selected:null,timer:null};
  /** @param {string} selector */
  const find = (selector) => query(root, selector, HTMLElement);
  const body = find('tbody'), scroll = find('.od-scroll');
  const range = query(root, '.od-range', HTMLInputElement);
  const play = query(root, '[data-play]', HTMLButtonElement);
  const prev = query(root, '[data-prev]', HTMLButtonElement), next = query(root, '[data-next]', HTMLButtonElement);
  const pool = query(root, '[data-pool]', HTMLSelectElement), sort = query(root, '[data-sort]', HTMLSelectElement);
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
    if (announce) find("[data-announcement]").textContent = range.getAttribute("aria-valuetext");
  }

  function stop() {
    if (state.timer !== null) clearInterval(state.timer);
    state.timer = null;
    find("[data-play-icon]").textContent = "▶";
    find("[data-play-label]").textContent = "Lecture";
    play.setAttribute('aria-pressed', 'false');
  }
  play.addEventListener("click", () => {
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
  prev.addEventListener("click", () => { stop(); setDay(state.day - 1, true); });
  next.addEventListener("click", () => { stop(); setDay(state.day + 1, true); });
  range.addEventListener("input", () => { stop(); setDay(Number(range.value)); });
  pool.addEventListener("change", () => {
    stop();
    if (pool.value !== 'a' && pool.value !== 'b') return;
    state.pool = pool.value;
    state.day = lastPlayed;
    state.selected = null;
    renderBoard();
    keepDayVisible(state.day);
    find("[data-announcement]").textContent = pool.selectedOptions[0].textContent + ", " + clubs[state.pool].length + " équipes.";
  });
  sort.addEventListener("change", () => {
    stop();
    const positions = new Map(Array.from(body.querySelectorAll("[data-row]"), (row) => [row.getAttribute('data-row'),row.getBoundingClientRect().top]));
    if (!['rank', 'name', 'total'].includes(sort.value)) return;
    state.sort = /** @type {import('./types.js').SortMode} */ (sort.value);
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
    renderDetail();
    query(body, '[data-team="' + team + '"][data-day="' + day + '"]', HTMLButtonElement).focus({preventScroll:true});
  }
  root.addEventListener("click", (event) => {
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
      renderDetail(event.detail === 0);
    }
    if (button.hasAttribute("data-close")) closeDetail();
  });
  root.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && state.selected) closeDetail();
  });
  document.addEventListener('visibilitychange', () => { if (document.hidden) stop(); });

  new ResizeObserver(() => root.style.setProperty("--od-view", scroll.clientWidth + "px")).observe(scroll);
  renderBoard();
  requestAnimationFrame(() => keepDayVisible(state.day));
}
