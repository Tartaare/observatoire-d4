import test from 'node:test';
import assert from 'node:assert/strict';
import {parseMatch} from '../server/source.js';
import {teamStats} from '../src/player-stats.js';

const url = 'https://leonzelotois.fr/matchs/exemple/';
const names = ['Nord', 'Sud'];
const header = `<header class="match-head"><b class="htag">D4</b><p class="single-meta">Terminé · 15/09/2026 · 1re journée</p>
  <b class="mt-score">3–1</b>${names.map(n => `<div class="mt-team"><span class="mt-name">${n}</span></div>`).join('')}</header>`;
const lists = names.map((n, i) => `<div class="compo-col"><b class="compo-team">${n}</b><ol class="compo-list">
  <li><span class="compo-nom">Noé T.</span>${i ? '' : '<span class="compo-but">×2<span>buts</span></span>'}</li></ol></div>`).join('');
const event = (side, type, name) => `<div class="tl-row"><div class="tl-side--${side}"><span class="tl-type tl-ev--${type}"></span><span class="tl-player">${name}</span></div></div>`;
test('les deux sources de buts, les CSC et les cartons restent attribués au bon côté', () => {
  const timeline = '<div class="timeline">' + event('home', 'but', 'Noé T.').repeat(2) + event('home', 'but', 'Contre son camp') +
    event('home', 'carton-jaune', 'Noé T.').repeat(2) + event('away', 'carton-rouge', 'Noé T.') + event('away', 'carton-jaune', '') + '</div>';
  const {sheets} = parseMatch(header + lists + timeline, url, 2026);
  assert.deepEqual(sheets[0].players[0].events, {goals: 2, yellows: 2, reds: 0, goalsComplete: true, yellowsComplete: true, redsComplete: true});
  assert.deepEqual(sheets[1].players[0].events, {goals: 0, yellows: 0, reds: 1, goalsComplete: false, yellowsComplete: false, redsComplete: true});
  assert.equal(parseMatch(header + lists, url, 2026).sheets[0].players[0].events.redsComplete, false);
});

test('le cumul déduplique les apparitions et suit équipe, journée, couverture et preuve d’entrée', () => {
  const events = {goals: 0, yellows: 0, reds: 0, goalsComplete: true, yellowsComplete: true, redsComplete: true};
  const starter = {name: 'Noé T.', status: 'starter', events};
  const bench = {name: 'Autre J.', status: 'unverified'};
  const sheet = {statusLabel: 'Terminé', sheetState: 'published', roster: [starter, {...starter, name: 'NOÉ T.'}, bench]};
  const data = {matches: {'a:0:0': sheet, 'a:0:1': {...sheet, roster: [{...starter, status: 'entered'}]},
    'a:0:2': {...sheet, statusLabel: 'Forfait Nord'}, 'a:0:3': {...sheet, roster: [], sheetState: 'missing'}, 'b:0:0': sheet}};
  const first = teamStats(data, 'a', 0, 0);
  assert.equal(first.rows.length, 2);
  assert.equal(first.rows[0].totals.appearances, 1);
  assert.equal(first.rows[0].unknown.size, 0);
  assert.deepEqual([...first.rows[1].unknown].sort(), ['appearances', 'entries', 'goals', 'reds', 'yellows']);
  const end = teamStats(data, 'a', 0, 3);
  assert.deepEqual([end.played, end.documented, end.partial], [3, 2, 1]);
  assert.deepEqual(end.rows[0].totals, {appearances: 2, starts: 1, entries: 1, goals: 0, yellows: 0, reds: 0});
  assert.equal(end.rows[0].unknown.size, 6);
  assert.deepEqual(teamStats(data, 'a', 1, 3).rows, []);
});
