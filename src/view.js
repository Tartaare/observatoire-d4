import {createSeason} from './season.js';
import {query, escapeHTML} from './dom.js';
import {liveDetail} from './detail.js';

/** @param {HTMLElement} root @param {import("./types.js").SeasonData} data @param {import("./types.js").AppState} state */
export function createView(root, data, state) {
  const {clubs, dates, lastPlayed, exampleSources, exampleURL} = data;
  const season = createSeason(data);
  /** @param {string} selector */
  const find = (selector) => query(root, selector, HTMLElement);
  const table = query(root, 'table', HTMLTableElement);
  const track = find('[data-track]'), head = find('thead'), body = find('tbody'), scroll = find('.od-scroll');
  const range = query(root, '.od-range', HTMLInputElement);
  const prev = query(root, '[data-prev]', HTMLButtonElement), next = query(root, '[data-next]', HTMLButtonElement);
  const longDate = new Intl.DateTimeFormat("fr-FR", {day:"numeric",month:"long",timeZone:"UTC"});
  const shortDate = new Intl.DateTimeFormat("fr-FR", {day:"numeric",month:"short",timeZone:"UTC"});
  /** @param {number} day */
  const dayLabel = (day) => "J" + String(day + 1).padStart(2, "0");
  /** @param {number} day @param {Intl.DateTimeFormat} format */
  const formatDate = (day, format) => dates[day] ? format.format(new Date(dates[day] ?? '')) : 'Date à confirmer';
  root.style.setProperty('--od-rounds', String(dates.length));
  range.max = String(dates.length - 1);
  find('.od-ticks').replaceChildren(...[0, Math.floor((dates.length - 1) / 2), dates.length - 1].map(day => {
    const tick = document.createElement('span');
    tick.textContent = dayLabel(day);
    return tick;
  }));
  track.replaceChildren(...dates.map(() => document.createElement("span")));
  function renderBoard() {
    const teams = clubs[state.pool];
    const order = teams.map((_, index) => index);
    /** @param {number} index */
    const total = (index) => teams[index][2].reduce((sum, value) => (sum ?? 0) + (value ?? 0), 0) ?? 0;
    if (state.sort === "name") order.sort((a,b) => teams[a][0].localeCompare(teams[b][0],"fr"));
    if (state.sort === "total") order.sort((a,b) => total(b) - total(a));
    find("[data-team-count]").textContent = teams.length + " équipes";
    head.innerHTML = '<tr><th scope="col" class="od-team">Équipe</th>' + dates.map((_, day) =>
      '<th scope="col" class="od-day" data-column="' + day + '"><button type="button" class="cursor-interaction" data-jump="' + day + '">' + dayLabel(day) + '<span>' + formatDate(day,shortDate) + '</span></button></th>'
    ).join("") + '</tr>';
    body.innerHTML = order.map((team) => {
      const [name, initials] = teams[team];
      const cells = dates.map((_, day) => '<td data-column="' + day + '"><button type="button" class="od-cell cursor-interaction" data-team="' + team + '" data-day="' + day + '"></button></td>').join("");
      return '<tr data-row="' + team + '"><th scope="row" class="od-team"><div class="od-club"><span class="od-rank" aria-label="Rang ' + (team + 1) + '">' + (team + 1) + '</span><span class="od-monogram" aria-hidden="true">' + escapeHTML(initials) + '</span><span>' + escapeHTML(name) + '</span></div></th>' + cells + '</tr>';
    }).join("");
    updateDay();
    renderDetail();
  }

  function updateDay() {
    range.value = String(state.day);
    range.setAttribute("aria-valuetext", "Journée " + (state.day + 1) + ", " + formatDate(state.day,longDate));
    find("[data-round-label]").textContent = "Journée " + (state.day + 1);
    find("[data-round-date]").textContent = formatDate(state.day,longDate);
    prev.disabled = state.day === 0;
    next.disabled = state.day === dates.length - 1;
    Array.from(track.children).forEach((segment,day) => {
      segment.className = day === state.day ? "od-now" : day < state.day && day <= lastPlayed ? "od-reached" : day <= lastPlayed ? "od-past" : "";
    });
    table.querySelectorAll("[data-column]").forEach((cell) => {
      const active = Number(cell.getAttribute('data-column')) === state.day;
      cell.classList.toggle("od-active", active);
      if (cell.tagName === "TH") cell.firstElementChild?.setAttribute("aria-pressed", String(active));
    });
    body.querySelectorAll('button.od-cell').forEach((element) => {
      const button = /** @type {HTMLButtonElement} */ (element);
      const day = Number(button.dataset.day);
      const team = Number(button.dataset.team);
      const [name,,counts] = clubs[state.pool][team];
      const count = counts[day];
      const match = data.matches?.[`${state.pool}:${team}:${day}`];
      const future = data.mode === 'live' ? !match || match.statusLabel !== 'Terminé' : day > lastPlayed;
      const hidden = !future && day > state.day;
      const missing = count === null && !hidden;
      const empty = future || hidden;
      button.disabled = empty;
      button.classList.toggle("od-missing", missing);
      button.classList.toggle("od-empty", empty);
      button.removeAttribute("data-tone");
      if (!empty && count !== null && count !== undefined) button.dataset.tone = String(Math.min(count,5));
      button.textContent = future ? "—" : hidden ? "·" : missing ? "?" : String(count);
      const description = future ? (match?.statusLabel ?? 'Rencontre non indexée') : hidden ? 'Après le curseur' : missing
        ? match?.sheetState === 'partial' ? 'Composition partielle' : 'Feuille manquante ou non archivée'
        : count + (data.mode === 'live' ? ' repérage(s) à confirmer' : ' joueur(s)');
      button.setAttribute("aria-label", name + ", journée " + (day + 1) + ", " + description);
    });
  }

  function renderDetail(returnFocus = false) {
    body.querySelector(".od-detail-row")?.remove();
    body.querySelectorAll(".od-cell").forEach((button) => {
      const picked = state.selected?.day === Number(button.getAttribute('data-day')) && state.selected?.team === Number(button.getAttribute('data-team'));
      button.classList.toggle("od-picked",picked);
      button.setAttribute("aria-expanded",String(picked));
    });
    if (!state.selected) return;
    const {day,team} = state.selected;
    if (data.mode === 'live') {
      const match = data.matches?.[`${state.pool}:${team}:${day}`];
      if (!match) return;
      const row = document.createElement('tr');
      row.className = 'od-detail-row';
      row.innerHTML = `<td colspan="${dates.length + 1}"><section class="od-detail" aria-labelledby="od-match-title">${liveDetail(match)}</section></td>`;
      query(body, `[data-row="${team}"]`, HTMLTableRowElement).after(row);
      find('[data-announcement]').textContent = `${match.home}, ${match.away}. Composition ${match.sheetState === 'published' ? 'publiée' : 'incomplète'}.`;
      if (returnFocus) query(row, '[data-close]', HTMLButtonElement).focus({preventScroll: true});
      return;
    }
    const {count,score,home,away,players,featured,realSheet} = season.matchAt(day,team,state.pool);
    const name = clubs[state.pool][team][0];
    const list = players.map(([player,status,history]) => {
      const levels = [...new Set(history.map((entry) => entry[1]))].sort((a,b) => ["R3","D1","D2","D3"].indexOf(a) - ["R3","D1","D2","D3"].indexOf(b));
      return '<details><summary class="cursor-interaction"><strong>' + escapeHTML(player) + '</strong>' +
        levels.map((level) => '<span class="od-division">' + escapeHTML(level) + '</span>').join("") + '</summary><ul>' +
        '<li>' + formatDate(day,shortDate) + ' · D4 · ' + escapeHTML(status) + '</li>' +
        history.map(([date,level,context]) => {
          const link = realSheet && exampleSources[date + "|" + level];
          return '<li>' + escapeHTML(date) + ' · ' + escapeHTML(level) + ' · ' + escapeHTML(context) + (link ? ' · <a href="' + escapeHTML(link) + '" target="_blank" rel="noopener noreferrer">Composition ↗</a>' : "") + '</li>';
        }).join("") + '</ul></details>';
    }).join("");
    const description = count === null ? "Composition indisponible pour cette équipe." :
      count === 0 ? "Aucun antécédent en division supérieure dans cet exemple." :
      count + " joueur" + (count === 1 ? "" : "s") + " repéré" + (count === 1 ? "" : "s") + " · " + name;
    const row = document.createElement("tr");
    row.className = "od-detail-row";
    row.innerHTML = '<td colspan="' + (dates.length + 1) + '"><section class="od-detail" aria-labelledby="od-match-title">' +
      '<div class="od-detail-head"><div><div class="od-match-kicker">' + dayLabel(day) + ' · ' + formatDate(day,longDate) + ' · ' + (realSheet ? "EXEMPLE DOCUMENTÉ" : "SIMULATION") +
      '</div><h3 id="od-match-title">' + escapeHTML(home) + ' ' + escapeHTML(score) + ' ' + escapeHTML(away) + '</h3><p>' + escapeHTML(description) +
      '</p></div><button type="button" class="od-arrow cursor-interaction" data-close aria-label="Fermer le détail">×</button></div>' +
      (list ? '<div class="od-detail-list">' + list + '</div>' : "") +
      (featured ? '<a href="' + escapeHTML(exampleURL) + '" target="_blank" rel="noopener noreferrer">Feuille du match FFF ↗</a>' : "") +
      '</section></td>';
    query(body, '[data-row="' + team + '"]', HTMLTableRowElement).after(row);
    find("[data-announcement]").textContent = name + ". " + description;
    if (returnFocus) query(row, '[data-close]', HTMLButtonElement).focus({preventScroll:true});
  }

  /** @param {number} day */
  function keepDayVisible(day) {
    const column = query(head, '[data-column="' + day + '"]', HTMLTableCellElement);
    const viewport = scroll.getBoundingClientRect();
    const stickyWidth = query(head, '.od-team', HTMLTableCellElement).offsetWidth;
    const position = column.getBoundingClientRect();
    const delta = position.right > viewport.right ? position.right - viewport.right :
      position.left < viewport.left + stickyWidth ? position.left - viewport.left - stickyWidth : 0;
    if (delta) scroll.scrollBy({left:delta,behavior:"instant"});
  }


  return {renderBoard, updateDay, renderDetail, keepDayVisible};
}
