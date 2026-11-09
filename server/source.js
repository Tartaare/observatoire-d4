import {load} from 'cheerio/slim';

export const ORIGIN = 'https://leonzelotois.fr';
export const DIVISIONS = new Set(['L1', 'L2', 'N1', 'N2', 'N3', 'R1', 'R2', 'R3', 'D1', 'D2', 'D3', 'D4']);
/** @param {string} value */
export const normalizeName = value => value.normalize('NFKC').toLocaleLowerCase('fr').replace(/[’']/g, "'").replace(/\s+/g, ' ').trim();
/** @param {string} value */
const clean = value => value.replace(/\s+/g, ' ').trim();

/** @param {string} value @returns {string} */
export function sourceURL(value) {
  const url = new URL(value, ORIGIN);
  if (url.origin !== ORIGIN || url.username || url.password || url.port ||
    !/^\/(?:clubs\/|club\/[a-z0-9-]+\/|matchs\/[a-z0-9-]+\/|division\/d4\/)$/.test(url.pathname)) {
    throw new TypeError('URL source hors périmètre.');
  }
  const keys = [...url.searchParams.keys()];
  if (keys.length && (url.pathname !== '/division/d4/' || new Set(keys).size !== keys.length ||
    keys.some(key => !['journee', 'avenir'].includes(key) || !/^[1-9]\d?$/.test(url.searchParams.get(key) ?? '')))) {
    throw new TypeError('Paramètres source hors périmètre.');
  }
  url.hash = '';
  url.searchParams.sort();
  return url.href;
}

/** @param {string} text @param {number} seasonStart */
function cardDate(text, seasonStart) {
  const match = text.match(/\b(\d{2})\/(\d{2})\b/);
  if (!match) return null;
  const year = Number(match[2]) >= 7 ? seasonStart : seasonStart + 1;
  const date = `${year}-${match[2]}-${match[1]}`;
  return validDate(date) ? date : null;
}

/** @param {string} date */
export const validDate = date => /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date).toISOString().slice(0, 10) === date;

/** @param {string} html @param {number} seasonStart @returns {import('./collection-types.js').Fixture[]} */
export function parseClub(html, seasonStart) {
  const $ = load(html);
  /** @type {Map<string, import('./collection-types.js').Fixture>} */
  const fixtures = new Map();
  const pageLevels = $('.club-divs a').map((_, node) => clean($(node).text())).get();
  const singleLevel = !$('.club-sec-div').length && pageLevels.length === 1 && DIVISIONS.has(pageLevels[0]) ? pageLevels[0] : null;
  $('section').each((_, section) => {
    const scope = $(section);
    const level = clean(scope.find('.club-sec-div').first().text()) || singleLevel;
    if (!DIVISIONS.has(level)) return;
    scope.find('a.mc').each((_, node) => {
      const card = $(node);
      const division = clean(card.find('.div').first().clone().children().remove().end().text());
      const round = Number(card.find('.div-round').text().match(/^(\d+)(?:re|e|ème)\s+journée$/i)?.[1]);
      if (division !== level || !round || round > 99) return;
      const teams = card.find('.team-name').map((_, team) => clean($(team).text())).get();
      if (teams.length !== 2 || teams.some(name => !name)) throw new Error('Équipes du calendrier incomplètes.');
      const url = sourceURL(card.attr('href') ?? '');
      if (!new URL(url).pathname.startsWith('/matchs/')) throw new Error('Lien de rencontre invalide.');
      const status = clean(card.find('.ft').text());
      fixtures.set(url, {url, division, round, status, home: teams[0], away: teams[1],
        date: cardDate(status, seasonStart), score: null});
    });
  });
  if (!fixtures.size) {
    const levels = $('a.mc .div').map((_, node) => clean($(node).clone().children().remove().end().text())).get();
    if (!levels.length || levels.some(level => DIVISIONS.has(level))) throw new Error('Structure de calendrier senior non reconnue.');
  }
  return [...fixtures.values()];
}

/** @param {string} html */
export function parseRoundCount(html) {
  const $ = load(html);
  return Math.max(0, ...$('#resultats .journee-puce, #avenir .journee-puce')
    .map((_, node) => Number(clean($(node).text()).match(/^J(\d+)$/)?.[1] ?? 0)).get());
}

/** @param {string} html */
export function parseDirectory(html) {
  const $ = load(html);
  const urls = new Set();
  $('.club-card').each((_, node) => {
    const card = $(node);
    if (!(card.attr('data-div') ?? '').split(/\s+/).some(level => DIVISIONS.has(level.toUpperCase()))) return;
    urls.add(sourceURL(card.find('a.club-card-lien').attr('href') ?? ''));
  });
  if (!urls.size) throw new Error('Annuaire des clubs non reconnu.');
  return [...urls];
}

/** @param {string} html @returns {import('./collection-types.js').Standing[]} */
export function parseStandings(html) {
  const $ = load(html);
  /** @type {import('./collection-types.js').Standing[]} */
  const rows = [];
  $('#classement > div').each((_, node) => {
    const group = $(node);
    const pool = clean(group.children('h2').text()).match(/POULE\s+([AB])$/)?.[1].toLowerCase();
    if (pool !== 'a' && pool !== 'b') return;
    group.find('tbody > tr').each((_, node) => {
      const row = $(node);
      const rank = Number(clean(row.find('.rk').text()));
      const name = clean(row.find('.team-name').text());
      if (!name || !Number.isInteger(rank) || rank < 1) throw new Error('Classement D4 incomplet.');
      rows.push({pool, rank, name, clubURL: sourceURL(row.find('a.crest-lien').attr('href') ?? '')});
    });
  });
  if (!rows.some(row => row.pool === 'a') || !rows.some(row => row.pool === 'b')) throw new Error('Poules D4 non reconnues.');
  return rows;
}

/** @param {string} html @param {string} url @param {number} seasonStart @returns {import('./collection-types.js').MatchDocument} */
export function parseMatch(html, url, seasonStart) {
  const $ = load(html);
  const head = $('header.match-head').first();
  const division = clean(head.find('.htag').text());
  const meta = clean(head.find('.single-meta').text());
  const rawDate = meta.match(/\b(\d{2})\/(\d{2})\/(\d{4})\b/);
  const date = rawDate ? `${rawDate[3]}-${rawDate[2]}-${rawDate[1]}` : '';
  const round = Number(meta.match(/\b(\d+)(?:re|e|ème)\s+journée\b/i)?.[1]);
  if (!DIVISIONS.has(division) || !round || !meta.startsWith('Terminé ·') || !validDate(date) ||
    date < `${seasonStart}-07-01` || date >= `${seasonStart + 1}-07-01`) throw new Error('Rencontre terminée de championnat senior masculin de la saison attendue introuvable.');
  const score = clean(head.find('.mt-score').text());
  if (!/^\d+\s*[–—-]\s*\d+$/.test(score)) throw new Error('Score de rencontre non reconnu.');
  /** @type {import('./collection-types.js').Sheet[]} */
  const sheets = [];
  head.find('.mt-team').each((_, node) => {
    const team = $(node), name = clean(team.find('.mt-name').text());
    if (!name) throw new Error('Nom d’équipe absent.');
    const link = team.find('a.crest-lien').attr('href');
    const clubURL = link ? sourceURL(link) : null;
    const columns = $('.compo-col').filter((_, column) => clean($(column).find('.compo-team').text()) === name);
    /** @type {import('./collection-types.js').Participant[]} */
    const players = [];
    let incomplete = columns.length !== 1;
    columns.first().find('ol.compo-list').each((_, node) => {
      const list = $(node), substitute = list.hasClass('compo-list--subs');
      list.children('li').each((_, node) => {
        const row = $(node), playerName = clean(row.find('.compo-nom').text());
        if (!playerName) { incomplete = true; return; }
        const entryText = clean(row.find('.compo-mvt--in').text());
        const exitText = clean(row.find('.compo-mvt--out').text());
        const shirtText = clean(row.find('.num').text());
        players.push({name: playerName, key: normalizeName(playerName),
          shirt: /^\d+$/.test(shirtText) ? Number(shirtText) : null,
          status: !substitute ? 'starter' : entryText || exitText ? 'entered' : 'unverified',
          entry: entryText.match(/\d+(?:\s*\+\s*\d+)?/)?.[0].replace(/\s/g, '') ?? null,
          exit: exitText.match(/\d+(?:\s*\+\s*\d+)?/)?.[0].replace(/\s/g, '') ?? null});
      });
    });
    const duplicate = new Set(players.map(player => player.key)).size !== players.length;
    const state = players.length === 0 ? 'missing' : incomplete || duplicate || players.filter(player => player.status === 'starter').length !== 11 ? 'partial' : 'published';
    sheets.push({name, clubURL, state, players});
  });
  if (sheets.length !== 2 || sheets[0].name === sheets[1].name) throw new Error('Deux équipes distinctes attendues.');
  return {url: sourceURL(url), division, round, date, score, status: 'Terminé', sheets};
}
