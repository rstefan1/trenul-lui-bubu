/**
 * @file The home page: the list of journeys, each with how far the player
 * got (read from what the journey saved in this browser). When there are
 * journeys of more than one season, the child can show one season only.
 * Above them, the big landscape of the season of the year (home/season.js
 * chose it, home/landscape.js draws it).
 */

import { el } from '../shared/js/ui/dom.js';
import { ground, landscape } from './landscape.js';
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

/*
 * The small drawings on the tickets, one for every journey (SVGs of 80×80,
 * built from fixed values only). The rail is at y = 64 in all of them.
 */

/** A fir tree standing on y, `h` tall, centred on x. */
const fir = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ h) =>
  `<path d="M${x} ${y - h} l${h * 0.36} ${h} h-${h * 0.72}Z"/>`;

/** The sky gradient of a picture (its id must be unique on the page). */
const sky = (/** @type {string} */ id, /** @type {string} */ top, /** @type {string} */ bottom) =>
  `<defs><linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="${top}"/><stop offset="1" stop-color="${bottom}"/></linearGradient></defs>`
  + `<rect width="80" height="80" fill="url(#${id})"/>`;

/** Small stars at fixed places. */
const stars = (/** @type {Array<[number, number]>} */ at) =>
  `<g fill="#fff6d8">${at.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.9"/>`).join('')}</g>`;

/** The snowy ground with the rail. */
const RAIL = `<rect y="62" width="80" height="18" fill="#ffffff"/><rect y="64" width="80" height="2.5" fill="#6d6258"/>`;

/**
 * Route 1, the Christmas night: the red electric locomotive under its
 * wire, pulling a blue coach with lit windows, beside a decorated
 * Christmas tree, under the moon.
 */
const CHRISTMAS = sky('pic-christmas', '#14306e', '#4a6fc0')
  + stars([[8, 10], [20, 6], [34, 14], [46, 7], [28, 24], [6, 26]])
  + `<circle cx="60" cy="15" r="8" fill="#fff6d8"/><circle cx="64" cy="12" r="7" fill="#1d3b80"/>`
  + `<path d="M0 54 Q20 40 40 50 T80 46 V80 H0Z" fill="#dfe8f7"/>`
  + RAIL
  // the overhead wire, with a pole
  + `<rect x="2" y="34" width="2" height="30" fill="#5b6472"/><rect y="37" width="62" height="1" fill="#2b2f38" opacity=".7"/>`
  // the blue coach
  + `<rect x="0" y="48" width="24" height="13" rx="2" fill="#2f5fa8"/><rect x="0" y="46.5" width="24" height="2.5" rx="1" fill="#7d8796"/>`
  + `<rect x="3" y="51" width="5" height="4" rx="1" fill="#ffe39a"/><rect x="10" y="51" width="5" height="4" rx="1" fill="#ffe39a"/><rect x="17" y="51" width="5" height="4" rx="1" fill="#ffe39a"/>`
  + `<circle cx="6" cy="62.5" r="2.4" fill="#263238"/><circle cx="18" cy="62.5" r="2.4" fill="#263238"/>`
  // the red electric locomotive, with its pantograph touching the wire
  + `<path d="M38 46 L44 38 L50 46" fill="none" stroke="#2b2f38" stroke-width="1.2"/><rect x="40" y="37.5" width="8" height="1.2" fill="#2b2f38"/>`
  + `<rect x="26" y="46" width="32" height="15" rx="3" fill="#d8382f"/><rect x="26" y="54" width="32" height="2" fill="#fbeed2"/>`
  + `<rect x="51" y="48.5" width="5" height="4.5" rx="1" fill="#d7efff"/><rect x="29" y="48.5" width="5" height="4.5" rx="1" fill="#d7efff"/>`
  + `<circle cx="57.5" cy="58" r="1.4" fill="#fff3b0"/>`
  + `<circle cx="31" cy="62.5" r="2.6" fill="#263238"/><circle cx="37" cy="62.5" r="2.6" fill="#263238"/><circle cx="47" cy="62.5" r="2.6" fill="#263238"/><circle cx="53" cy="62.5" r="2.6" fill="#263238"/>`
  // the Christmas tree, with its star and baubles
  + `<rect x="68.5" y="58" width="3" height="5" fill="#6d4c41"/>`
  + `<path d="M70 32 L77 46 H63Z M70 39 L79 54 H61Z M70 46 L80 60 H60Z" fill="#1f6e4a"/>`
  + `<path d="M70 27.5 l1.3 2.7 3 .4 -2.2 2 .6 2.9 -2.7-1.5 -2.7 1.5 .6-2.9 -2.2-2 3-.4Z" fill="#ffd23f"/>`
  + `<circle cx="68" cy="43" r="1.5" fill="#ff5252"/><circle cx="72.5" cy="50" r="1.5" fill="#40c4ff"/><circle cx="66" cy="55" r="1.5" fill="#ffd740"/><circle cx="74.5" cy="57" r="1.5" fill="#ff5252"/>`;

/**
 * Route 2, the freight train by day: the orange diesel locomotive pulling
 * two empty flat wagons, at the foot of high snowy mountains.
 */
const FREIGHT = sky('pic-freight', '#4a98e8', '#d8efff')
  + `<circle cx="14" cy="14" r="7" fill="#ffe27a"/>`
  + `<path d="M0 50 L16 32 L26 42 L44 18 L60 38 L68 30 L80 42 V80 H0Z" fill="#8fa3bf"/>`
  + `<path d="M16 32 L11.5 37 L15 36 L18 38 L20.5 36.5Z M44 18 L37.5 26.5 L42 25 L45 28 L50 25.5Z M68 30 L64 34.5 L67 33.5 L70 35 L72 34Z" fill="#ffffff"/>`
  + `<g fill="#1f5d3a">${fir(6, 62, 14)}${fir(30, 62, 11)}${fir(62, 62, 13)}${fir(74, 62, 16)}</g>`
  + RAIL
  + `<g transform="translate(4 48)">`
  + `<rect x="0" y="11" width="18" height="4" fill="#6d4c41"/><rect x="2" y="5" width="2" height="6" fill="#3b4250"/><rect x="14" y="5" width="2" height="6" fill="#3b4250"/>`
  + `<circle cx="4" cy="16.5" r="2.4" fill="#263238"/><circle cx="14" cy="16.5" r="2.4" fill="#263238"/>`
  + `<rect x="20" y="11" width="18" height="4" fill="#6d4c41"/><rect x="22" y="5" width="2" height="6" fill="#3b4250"/><rect x="34" y="5" width="2" height="6" fill="#3b4250"/>`
  + `<circle cx="24" cy="16.5" r="2.4" fill="#263238"/><circle cx="34" cy="16.5" r="2.4" fill="#263238"/>`
  + `<rect x="40" y="0" width="32" height="15" rx="4" fill="#e0662c"/><rect x="40" y="8" width="32" height="2" fill="#fbeed2"/>`
  + `<rect x="63" y="2.5" width="6" height="5" rx="1" fill="#d7efff"/><rect x="43" y="2.5" width="5" height="5" rx="1" fill="#d7efff"/><rect x="52" y="-3" width="3" height="4" fill="#3b4250"/>`
  + `<circle cx="45" cy="16.5" r="2.4" fill="#263238"/><circle cx="51" cy="16.5" r="2.4" fill="#263238"/><circle cx="61" cy="16.5" r="2.4" fill="#263238"/><circle cx="67" cy="16.5" r="2.4" fill="#263238"/>`
  + `</g>`;

/** A firework: rays around a centre, with a spark at the end of each. */
const burst = (/** @type {number} */ cx, /** @type {number} */ cy, /** @type {number} */ r, /** @type {string} */ color) => {
  let rays = '';
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * Math.PI * 2;
    const [c, s] = [Math.cos(a), Math.sin(a)];
    const f = (/** @type {number} */ v) => v.toFixed(1);
    rays += `<path d="M${f(cx + c * r * 0.35)} ${f(cy + s * r * 0.35)} L${f(cx + c * r)} ${f(cy + s * r)}"/>`
      + `<circle cx="${f(cx + c * r * 1.18)}" cy="${f(cy + s * r * 1.18)}" r="1" stroke="none" fill="${color}"/>`;
  }
  return `<g stroke="${color}" stroke-width="1.3" stroke-linecap="round">${rays}</g>`;
};

/**
 * Route 3, New Year's Eve on the Vaser valley: the little black steam
 * locomotive of the mocănița, puffing, with a green coach, between the
 * fir forests, under the midnight fireworks.
 */
const MOCANITA = sky('pic-mocanita', '#0b1638', '#2a3f7a')
  + stars([[6, 8], [40, 4], [74, 6], [30, 30], [70, 34]])
  + burst(20, 18, 9, '#ffd23f') + burst(56, 14, 8, '#ff6fa8') + burst(42, 32, 5.5, '#5ee0ff')
  + `<path d="M0 34 L22 56 H0Z" fill="#163a2c"/><path d="M80 38 L58 58 H80Z" fill="#163a2c"/>`
  + `<g fill="#1f5d3a">${fir(4, 50, 16)}${fir(12, 58, 14)}${fir(70, 58, 15)}${fir(77, 52, 17)}</g>`
  + RAIL
  // the green coach, children's lit windows
  + `<rect x="6" y="50" width="26" height="11" rx="2" fill="#2e7d46"/><rect x="5" y="48" width="28" height="2.5" rx="1" fill="#4a5160"/>`
  + `<rect x="9" y="52.5" width="5" height="4" rx="1" fill="#ffe39a"/><rect x="16.5" y="52.5" width="5" height="4" rx="1" fill="#ffe39a"/><rect x="24" y="52.5" width="5" height="4" rx="1" fill="#ffe39a"/>`
  + `<circle cx="11" cy="62.5" r="2" fill="#263238"/><circle cx="27" cy="62.5" r="2" fill="#263238"/>`
  // the black steam locomotive: cab, boiler with a red band, tall funnel, puffs of steam
  + `<circle cx="66" cy="38" r="3" fill="#e6ecf5" opacity=".85"/><circle cx="61" cy="33" r="3.8" fill="#e6ecf5" opacity=".7"/><circle cx="55" cy="29" r="4.4" fill="#e6ecf5" opacity=".5"/>`
  + `<rect x="36" y="45" width="12" height="16" rx="1.5" fill="#23252b"/><rect x="35" y="43.5" width="14" height="2.5" rx="1" fill="#16171b"/><rect x="39" y="47.5" width="6" height="5" rx="1" fill="#ffe39a"/>`
  + `<rect x="47" y="51" width="22" height="10" rx="4" fill="#23252b"/><rect x="47" y="54.5" width="22" height="2" fill="#c62828"/>`
  + `<rect x="63.5" y="42" width="4.5" height="10" fill="#23252b"/><rect x="62.5" y="40.5" width="6.5" height="2.5" rx="1" fill="#16171b"/>`
  + `<circle cx="56" cy="50.5" r="2" fill="#d9a640"/><circle cx="69.5" cy="57" r="1.3" fill="#fff3b0"/>`
  + `<circle cx="42" cy="62.5" r="2.2" fill="#263238"/><circle cx="53" cy="62.5" r="2.6" fill="#263238"/><circle cx="62" cy="62.5" r="2.6" fill="#263238"/>`;

/** @type {Record<import('./routes.js').Picture, string>} */
const PICTURES = { christmas: CHRISTMAS, freight: FREIGHT, mocanita: MOCANITA };

/**
 * The small picture on a ticket: the journey's own drawing.
 * @param {import('./routes.js').RouteInfo} route
 */
function thumb(route) {
  return `<svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">${PICTURES[route.picture]}</svg>`;
}

/**
 * The serial number printed along the stub, like on real tickets (the
 * journey's number gives it).
 * @param {number} n
 */
const serial = n => `Seria BB Nr. ${String(241200 + n * 37).padStart(7, '0')}`;

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
 * "1 misiune", "5 misiuni", "20 de misiuni": the way numbers are said in Romanian.
 * @param {number} n
 */
const missionsLabel = n => n === 1 ? '1 misiune' : n % 100 >= 20 || n % 100 === 0 ? `${n} de misiuni` : `${n} misiuni`;

/**
 * How many missions a journey has: read from its own list of missions (its
 * js/missions-data.js: the missions on the way and those in stations), so
 * the ticket always tells the truth. Null when the list cannot be read.
 * @param {import('./routes.js').RouteInfo} route
 * @returns {Promise<number | null>}
 */
async function missionCount(route) {
  try {
    const data = await import(`../${route.path}js/missions-data.js`);
    const plan = Object.values(data).find(v => v && Array.isArray(v.travel) && v.stations);
    return plan ? plan.travel.length + Object.keys(plan.stations).length : null;
  } catch {
    return null;
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
  const picture = el('div', { class: 'ticket-pic' });
  // the SVG is built here from fixed values (no text from outside goes into it)
  picture.innerHTML = thumb(route);
  // what waits on the journey: its missions (filled in when their list is read)
  const missions = el('p', { class: 'ticket-missions', hidden: true });
  missionCount(route).then(n => {
    if (!n) return;
    missions.textContent = `🎯 ${missionsLabel(n)} de făcut`;
    missions.hidden = false;
  });
  return el('li', { class: `route-item season--${route.season} is-${p.status}`, 'data-season': route.season }, [
    el('a', { class: 'route-card', href: route.path }, [
      el('div', { class: 'ticket-main' }, [
        el('p', { class: 'ticket-head' }, [el('span', {}, ['🚂 Bilet de tren']), el('span', {}, [`Ruta ${route.number}`])]),
        el('div', { class: 'ticket-row' }, [
          picture,
          el('div', { class: 'ticket-words' }, [
            el('h2', { class: 'route-title' }, [route.title]),
            // the two ends of the journey, joined like on a railway map
            el('p', { class: 'route-way' }, [
              el('span', {}, [route.from]),
              el('span', { class: 'route-line', 'aria-hidden': 'true' }),
              el('span', { class: 'sr-only' }, [' → ']),
              el('span', {}, [route.to]),
            ]),
            el('p', { class: 'ticket-meta' }, [`${season.icon} ${season.name} · ${route.when}`]),
            missions,
          ]),
        ]),
      ]),
      el('div', { class: 'ticket-stub' }, [
        el('span', { class: 'ticket-serial', 'aria-hidden': 'true' }, [serial(route.number)]),
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
const firstHidden = () => [...document.querySelectorAll('.home-main .route-card')]
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
/** @type {HTMLElement} */ (document.getElementById('ground')).innerHTML = ground(season);
