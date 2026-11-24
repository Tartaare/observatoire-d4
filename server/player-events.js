/** @typedef {import('./collection-types.js').Participant} Participant */

/** @param {import('cheerio').CheerioAPI} $ @param {import('cheerio').Cheerio<import('domhandler').Element>} row */
export function compositionGoals($, row) {
  return row.find('.compo-but').toArray().reduce((total, node) => {
    const marker = $(node), label = marker.text();
    if (/contre son camp|\bcsc\b/i.test(label) || marker.hasClass('compo-but--csc')) return total;
    return total + Number(label.match(/×\s*(\d+)/)?.[1] ?? 1);
  }, 0);
}

/**
 * @param {import('cheerio').CheerioAPI} $ @param {number} side @param {number} score
 * @param {Participant[]} players @param {number[]} goalsInLineup @param {(name: string) => string} normalize
 */
export function attachPlayerEvents($, side, score, players, goalsInLineup, normalize) {
  const timeline = $('.timeline');
  const cardsDocumented = timeline.find('.tl-row .tl-type').toArray().some(node =>
    !$(node).closest('.tl-side--home,.tl-side--away').find('.tl-ajout').length);
  /** @type {Map<string, {name: string, index: number, goals: number, timelineGoals: number, yellows: number, reds: number}>} */
  const byName = new Map();
  const newTally = (/** @type {string} */ name, /** @type {number} */ index) =>
    ({name, index, goals: 0, timelineGoals: 0, yellows: 0, reds: 0});
  players.forEach((player, index) => {
    const tally = byName.get(player.key) ?? newTally(player.name, index);
    tally.goals += goalsInLineup[index];
    byName.set(player.key, tally);
  });
  let ownGoals = 0, yellowsComplete = cardsDocumented, redsComplete = cardsDocumented;
  timeline.find(side === 0 ? '.tl-side--home' : '.tl-side--away').each((_, node) => {
    const event = $(node);
    if (!event.find('.tl-ev--but,.tl-ev--carton-jaune,.tl-ev--carton-rouge').length) return;
    const label = event.find('.tl-player').text().replace(/\s+/g, ' ').trim(), name = normalize(label);
    if (event.find('.tl-ev--but').length && (/contre son camp|\bcsc\b/i.test(name) || event.find('.tl-ev--but--csc').length)) {
      ownGoals++; return;
    }
    const named = /\p{L}/u.test(name) && !/^(?:inconnu|non (?:communiqué|renseigné|identifié)|(?:joueur|buteur) (?:inconnu|non (?:communiqué|renseigné|identifié)))$/i.test(name);
    const player = named ? byName.get(name) ?? newTally(label, -1) : null;
    if (player) byName.set(name, player);
    if (player && event.find('.tl-ev--but').length) player.timelineGoals++;
    if (event.find('.tl-ev--carton-jaune').length) {
      if (player) player.yellows++; else yellowsComplete = false;
    }
    if (event.find('.tl-ev--carton-rouge').length) {
      if (player) player.reds++; else redsComplete = false;
    }
  });
  let accounted = ownGoals;
  for (const tally of byName.values()) {
    tally.goals = Math.max(tally.goals, tally.timelineGoals);
    accounted += tally.goals;
  }
  const coverage = {goalsComplete: accounted === score, yellowsComplete, redsComplete};
  // Un homonyme supplémentaire dans la composition ne duplique pas la chronologie nominative.
  for (const p of players) p.events = {goals: 0, yellows: 0, reds: 0, ...coverage};
  /** @type {import('./collection-types.js').EventPlayer[]} */
  const eventOnly = [];
  for (const {index, name, goals, yellows, reds} of byName.values()) {
    const events = {goals, yellows, reds, ...coverage};
    if (index < 0) eventOnly.push({name, events});
    else players[index].events = events;
  }
  return eventOnly;
}
