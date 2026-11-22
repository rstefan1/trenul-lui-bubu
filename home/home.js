/**
 * @file The home page: the list of journeys, each with how far the player
 * got (read from what the journey saved in this browser). When there are
 * journeys of more than one season, the child can show one season only.
 */

import { el } from '../shared/js/ui/dom.js';
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

/**
 * The colours of a season's landscape (the card's picture).
 * @type {Record<Season, {sky: [string, string], light: string, night: boolean, hills: string, peaks: string | null, ground: string, trees: string, rail: string}>}
 */
const PALETTES = {
  winter: { sky: ['#0d1f4d', '#3a5aa6'], light: '#fff6d8', night: true, hills: '#c9d6ee', peaks: '#ffffff', ground: '#f4f8ff', trees: '#1f5d3a', rail: '#7d8796' },
  spring: { sky: ['#7cc4f2', '#d8f0ff'], light: '#fff3b0', night: false, hills: '#8fcf7a', peaks: null, ground: '#a5dd7f', trees: '#f6a5c0', rail: '#6d6258' },
  summer: { sky: ['#2f8fe0', '#bfe6ff'], light: '#ffe066', night: false, hills: '#5aa64a', peaks: null, ground: '#e9d27a', trees: '#2f7a3a', rail: '#6d6258' },
  autumn: { sky: ['#f2a65a', '#fde3b8'], light: '#fff1c9', night: false, hills: '#b97a3c', peaks: null, ground: '#c98f45', trees: '#d2491f', rail: '#6d5a4a' },
};

/**
 * The picture of a journey: a small landscape of its season, drawn in SVG
 * (static: nothing moves, nothing is redrawn).
 * @param {Season} season
 * @param {number} n   the journey's number (gives each picture its own gradient id)
 */
function scene(season, n) {
  const p = PALETTES[season];
  const id = `sky${n}`;
  const stars = p.night
    ? '<g fill="#fff"><circle cx="40" cy="30" r="1.6"/><circle cx="95" cy="18" r="1.2"/><circle cx="150" cy="40" r="1.4"/><circle cx="210" cy="22" r="1.2"/><circle cx="260" cy="48" r="1.5"/><circle cx="375" cy="70" r="1.2"/></g>'
    : '';
  const peaks = p.peaks ? `<path d="M60 70 L74 82 L48 82Z M170 55 L186 70 L154 70Z M290 75 L304 87 L276 87Z" fill="${p.peaks}"/>` : '';
  const tree = (/** @type {number} */ x, /** @type {number} */ h) => season === 'winter'
    ? `<path d="M${x} ${140} l${h * 0.4} -${h} l${h * 0.4} ${h}Z"/>`
    : `<rect x="${x + h * 0.36}" y="${140 - h * 0.45}" width="${h * 0.1}" height="${h * 0.45}" fill="#6d4c41"/><circle cx="${x + h * 0.4}" cy="${140 - h * 0.6}" r="${h * 0.32}"/>`;
  const windows = [8, 28, 48, 82, 102, 122].map(x => `<rect x="${x}" y="12" width="12" height="10" rx="2"/>`).join('');
  const wheels = [14, 56, 88, 130, 162, 196].map(x => `<circle cx="${x}" cy="36" r="5"/>`).join('');
  return `
    <svg viewBox="0 0 400 180" preserveAspectRatio="xMidYMid slice" aria-hidden="true">
      <defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${p.sky[0]}"/><stop offset="1" stop-color="${p.sky[1]}"/></linearGradient></defs>
      <rect width="400" height="180" fill="url(#${id})"/>
      <circle cx="330" cy="38" r="${p.night ? 16 : 22}" fill="${p.light}"/>
      ${stars}
      <path d="M0 120 L60 70 L110 110 L170 55 L230 112 L290 75 L350 115 L400 90 V180 H0Z" fill="${p.hills}"/>
      ${peaks}
      <g fill="${p.trees}">${tree(30, 26)}${tree(52, 20)}${tree(330, 26)}${tree(356, 20)}</g>
      <rect y="140" width="400" height="40" fill="${p.ground}"/>
      <rect y="148" width="400" height="3" fill="${p.rail}"/>
      <g transform="translate(120 112)">
        <rect x="0" y="6" width="70" height="28" rx="6" fill="#2e7d4f"/>
        <rect x="74" y="6" width="70" height="28" rx="6" fill="#2e7d4f"/>
        <rect x="148" y="2" width="62" height="32" rx="8" fill="#d8382f"/>
        <g fill="${p.night ? '#ffd77a' : '#cfe8ff'}">${windows}<rect x="190" y="9" width="14" height="11" rx="2"/></g>
        <g fill="#2b2f38">${wheels}</g>
      </g>
    </svg>`;
}

const STATUS = {
  new: { label: 'Neîncepută', button: '🚂 Pornește' },
  started: { label: 'În călătorie', button: '🚂 Continuă' },
  finished: { label: 'Terminată ✔', button: '🚂 Joacă din nou' },
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
 * One journey's card.
 * @param {import('./routes.js').RouteInfo} route
 */
function routeCard(route) {
  const p = progressOf(route.saveKey);
  const season = SEASONS[route.season];
  const picture = el('div', { class: 'route-pic' });
  // the SVG is built here from fixed values (no text from outside goes into it)
  picture.innerHTML = scene(route.season, route.number);
  return el('li', { class: `route-item season--${route.season}`, 'data-season': route.season }, [
    el('a', { class: 'route-card', href: route.path }, [
      picture,
      el('div', { class: 'route-body' }, [
        el('p', { class: 'route-kicker' }, [`Ruta ${route.number} · ${season.icon} ${season.name} · ${route.when}`]),
        el('h2', { class: 'route-title' }, [route.title]),
        el('p', { class: 'route-way' }, [`${route.from} → ${route.to}`]),
        el('p', { class: 'route-blurb' }, [route.blurb]),
        el('ul', { class: 'route-facts' }, [
          el('li', {}, [`📖 ${route.chapters} capitole`]),
          el('li', {}, [`🚉 ${route.stations} stații`]),
          el('li', { class: `route-status route-status--${p.status}` }, [STATUS[p.status].label]),
          p.stars > 0 && el('li', { class: 'route-stars' }, [`★ ${p.stars}`]),
        ]),
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
