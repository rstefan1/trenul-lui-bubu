/**
 * @file The home page: the list of journeys, each with how far the player
 * got (read from what the journey saved in this browser). When there are
 * journeys of more than one season, the child can show one season only.
 * Above them, the big landscape of the season of the year (home/season.js
 * chose it, home/landscape.js draws it).
 */

import { el } from '../shared/js/ui/dom.js';
import { ground, landscape, meadow } from './landscape.js';
import { ROUTES } from './routes.js';

/**
 * @typedef {import('./routes.js').Season} Season
 * @typedef {object} Progress
 * @property {'new' | 'started' | 'finished'} status
 * @property {number} stars
 */

/** The seasons, in the order of the year as children learn it at school (from autumn). */
const SEASONS = /** @type {const} */ ({
  autumn: { name: 'Toamnă', icon: '🍂' },
  winter: { name: 'Iarnă', icon: '❄️' },
  spring: { name: 'Primăvară', icon: '🌷' },
  summer: { name: 'Vară', icon: '☀️' },
});

/** What the ticket says about the journey: its stamp and its button. */
const STATUS = {
  new: { label: 'Neîncepută', stamp: 'Nouă', button: 'Pornește' },
  started: { label: 'În călătorie', stamp: 'În curs', button: 'Continuă' },
  finished: { label: 'Terminată', stamp: '✔ Făcută', button: 'Din nou' },
};

/**
 * What the player has done on a journey, from its save (nothing if the
 * browser does not allow storage or the save cannot be read).
 * @param {string} key
 * @returns {Progress}
 */
function progressOf(key) {
  try {
    const data = JSON.parse(localStorage.getItem(key) || 'null');
    if (!data || !data.state) return { status: 'new', stars: 0 };
    const stars = (data.state.stars || []).reduce((/** @type {number} */ sum, /** @type {[string, number]} */ [, s]) => sum + s, 0);
    return { status: data.finished ? 'finished' : 'started', stars };
  } catch {
    return { status: 'new', stars: 0 };
  }
}

/**
 * One journey's card: a train ticket. The main part has the journey's name,
 * its two stations, its season and its days; the stub, after the
 * perforation, has a stamp that tells whether the journey was done, and the
 * button.
 * @param {import('./routes.js').RouteInfo} route
 */
function routeCard(route) {
  const p = progressOf(route.saveKey);
  const season = SEASONS[route.season];
  return el('li', { class: `route-item season--${route.season} is-${p.status}`, 'data-season': route.season }, [
    el('a', { class: 'route-card', href: route.path }, [
      el('div', { class: 'ticket-main' }, [
        el('p', { class: 'ticket-head' }, [el('span', {}, ['Bilet de tren']), el('span', {}, [`Ruta ${route.number}`])]),
        el('h2', { class: 'route-title' }, [route.title]),
        // the two ends of the journey, joined like on a railway map
        el('p', { class: 'route-way' }, [
          el('span', {}, [route.from]),
          el('span', { class: 'route-line', 'aria-hidden': 'true' }),
          el('span', { class: 'sr-only' }, [' → ']),
          el('span', {}, [route.to]),
        ]),
        el('p', { class: 'ticket-meta' }, [`${season.icon} ${season.name} · ${route.when}`]),
      ]),
      el('div', { class: 'ticket-stub' }, [
        el('span', { class: 'ticket-stamp' }, [el('span', { class: 'sr-only' }, ['Călătoria: ']), STATUS[p.status].stamp]),
        p.stars > 0 && el('span', { class: 'route-stars' }, [`★ ${p.stars}`]),
        el('span', { class: 'route-go' }, [STATUS[p.status].button]),
      ]),
    ]),
  ]);
}

/**
 * The season buttons above the list (only when there are journeys of more
 * than one season). The choice is remembered for the next visit.
 * @param {HTMLElement} list
 */
function seasonFilter(list) {
  const present = Object.keys(SEASONS).filter(s => ROUTES.some(r => r.season === s));
  if (present.length < 2) return null;
  const KEY = 'trenul-lui-bubu/home-season';
  /** @param {string} chosen */
  const apply = chosen => {
    for (const item of list.children) {
      /** @type {HTMLElement} */ (item).hidden = chosen !== 'all' && /** @type {HTMLElement} */ (item).dataset.season !== chosen;
    }
    for (const b of bar.querySelectorAll('button')) b.setAttribute('aria-pressed', String(b.dataset.season === chosen));
    try { localStorage.setItem(KEY, chosen); } catch { /* not remembered */ }
  };
  const button = (/** @type {string} */ value, /** @type {string} */ label) =>
    el('button', { class: 'season-btn', type: 'button', 'data-season': value, onclick: () => apply(value) }, [label]);
  const bar = el('div', { class: 'season-bar', role: 'group', 'aria-label': 'Anotimpul' }, [
    button('all', 'Toate'),
    ...present.map(s => button(s, `${SEASONS[/** @type {Season} */ (s)].icon} ${SEASONS[/** @type {Season} */ (s)].name}`)),
  ]);
  let saved = 'all';
  try { saved = localStorage.getItem(KEY) || 'all'; } catch { /* first visit */ }
  apply(saved === 'all' || present.includes(saved) ? saved : 'all');
  return bar;
}

const list = /** @type {HTMLElement} */ (document.getElementById('routes'));
list.replaceChildren(...[...ROUTES].sort((a, b) => a.number - b.number).map(routeCard));
const filter = seasonFilter(list);
if (filter) list.before(filter);


/*
 * The "Vezi toate călătoriile ↓" button at the bottom of the screen (like
 * the one of lumea-lui-bubu): shown only while the page is at the top and a
 * journey's card is not fully seen; a tap jumps to that card. Nothing moves:
 * it simply shows or hides, and the page jumps without sliding.
 */
const hint = /** @type {HTMLButtonElement} */ (document.getElementById('scroll-hint'));
/** the first card whose bottom (with its button) is below the screen */
const firstHidden = () => [...list.querySelectorAll('.route-card')]
  .find(card => !(/** @type {HTMLElement} */ (card.closest('.route-item'))).hidden && card.getBoundingClientRect().bottom > window.innerHeight - 8);
const updateHint = () => { hint.hidden = window.scrollY > 40 || !firstHidden(); };
hint.addEventListener('click', () => {
  const card = firstHidden();
  if (card) window.scrollTo({ top: card.getBoundingClientRect().top + window.scrollY - 12, behavior: 'instant' });
});
let waiting = false;
const later = () => {
  if (waiting) return;
  waiting = true;
  requestAnimationFrame(() => { waiting = false; updateHint(); });
};
addEventListener('scroll', later, { passive: true });
addEventListener('resize', later);
addEventListener('load', updateHint);   // after the fonts and the pictures, the sizes are final
updateHint();

const scenery = /** @type {HTMLElement} */ (document.getElementById('scene'));
// the SVGs are built from fixed values (no text from outside goes into them)
const season = /** @type {Season} */ (document.documentElement.dataset.season || 'summer');
scenery.innerHTML = landscape(season);
/** @type {HTMLElement} */ (document.getElementById('meadow')).innerHTML = meadow(season);
/** @type {HTMLElement} */ (document.getElementById('ground')).innerHTML = ground(season);
