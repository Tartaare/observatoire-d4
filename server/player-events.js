/** @typedef {import('./collection-types.js').Participant} Participant */
/** @typedef {import('./collection-types.js').PlayerEvents} PlayerEvents */

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
  const cardsDocumented = timeline.find('.tl-row .tl-type').length > 0;
  /** @type {Map<string, {index: number, goals: number, timelineGoals: number, yellows: number, reds: number}>} */
  const byName = new Map();
  players.forEach((player, index) => {
    const tally = byName.get(player.key) ?? {index, goals: 0, timelineGoals: 0, yellows: 0, reds: 0};
    tally.goals += goalsInLineup[index];
    byName.set(player.key, tally);
  });
  let ownGoals = 0, yellowsComplete = cardsDocumented, redsComplete = cardsDocumented;
  timeline.find(side === 0 ? '.tl-side--home' : '.tl-side--away').each((_, node) => {
    const event = $(node), name = normalize(event.find('.tl-player').text()), player = byName.get(name);
    if (event.find('.tl-ev--but').length) {
      if (/contre son camp|\bcsc\b/i.test(name) || event.find('.tl-ev--but--csc').length) ownGoals++;
      else if (player) player.timelineGoals++;
    }
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
  players.forEach((player, index) => {
    // La chronologie nomme le joueur sans numéro de maillot, même en cas d’homonymie.
    const tally = byName.get(player.key);
    const first = tally?.index === index;
    player.events = {goals: first ? tally.goals : 0, yellows: first ? tally.yellows : 0,
      reds: first ? tally.reds : 0, goalsComplete: accounted === score, yellowsComplete, redsComplete};
  });
}
