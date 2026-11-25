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
import { DEPOT_LOCOS } from '../shared/js/depot/locos.js';

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
 * The drawing of the depot's ticket: the brick depot with its arched door,
 * a locomotive peeking out, and a painter's palette.
 */
const DEPOT = sky('pic-depot', '#7cc4f2', '#d8f0ff')
  + `<path d="M6 30 L40 14 L74 30 V64 H6Z" fill="#a5543a"/><path d="M2 32 L40 12 L78 32 L74 34 L40 17 L6 34Z" fill="#5e3a1c"/>`
  + `<g fill="#8a4430">${[38, 44, 50, 56].map(y => `<rect x="8" y="${y}" width="64" height="1"/>`).join('')}</g>`
  + `<path d="M18 64 V42 a14 14 0 0 1 28 0 V64Z" fill="#2c3550"/><path d="M18 64 V42 a14 14 0 0 1 28 0 V64" fill="none" stroke="#fbeed2" stroke-width="2"/>`
  + `<circle cx="40" cy="25" r="4.5" fill="#fbeed2"/><circle cx="40" cy="25" r="2.6" fill="#1f4f9c"/>`
  // the locomotive peeking out of the door, decorated with a bow
  + `<rect x="21" y="44" width="22" height="18" rx="4" fill="#d8382f"/><rect x="21" y="53" width="22" height="2.5" fill="#fbeed2"/>`
  + `<rect x="25" y="47" width="14" height="5" rx="1.5" fill="#d7efff"/><circle cx="32" cy="58.5" r="2" fill="#fff3b0"/>`
  + `<path d="M32 44 l-5 -3 v6Z M32 44 l5 -3 v6Z" fill="#ff6fa8"/><circle cx="32" cy="44" r="1.6" fill="#e04585"/>`
  + `<rect y="62" width="80" height="18" fill="#9aa4b1"/><rect y="64" width="80" height="2.5" fill="#6d6258"/>`
  // the palette, with its blobs of paint
  + `<path d="M56 50 c8 -6 20 -2 20 6 c0 6 -6 4 -7 8 c-1 4 -9 4 -13 0 c-3 -4 -4 -10 0 -14Z" fill="#f6e6c2" stroke="#8a7448" stroke-width="1"/>`
  + `<circle cx="61" cy="53" r="2" fill="#e53935"/><circle cx="67" cy="51" r="2" fill="#ffd23f"/><circle cx="72" cy="55" r="2" fill="#2e9d57"/><circle cx="62" cy="59" r="2" fill="#40c4ff"/>`;

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
 * @typedef {object} TicketParts
 * @property {string} itemClass     classes of the list item
 * @property {Record<string, string>} [itemAttrs]
 * @property {string} cardClass     classes of the ticket itself (a link)
 * @property {string} href
 * @property {[string, string]} head   the band at the top: what ticket it is, and its number
 * @property {string} picture       the SVG of the small picture (fixed values only)
 * @property {string} title
 * @property {Node} way             the line under the title
 * @property {Array<{label: string, value: Node | string, cls?: string}>} fields  printed below, each with its label
 * @property {Array<Node | false>} stub  what the stub shows under "Control"
 */

/**
 * A train ticket, printed like a real one: a band at the top, then inside a
 * thin printed frame the picture, the name and the way, and a row of fields
 * with small labels (as on a ticket: date, class…); after the perforation,
 * the stub that the controller stamps, with the button.
 * @param {TicketParts} t
 */
function ticket(t) {
  const picture = el('div', { class: 'ticket-pic' });
  // the SVG is built from fixed values (no text from outside goes into it)
  picture.innerHTML = t.picture;
  return el('li', { class: t.itemClass, ...t.itemAttrs }, [
    el('a', { class: `route-card ${t.cardClass}`, href: t.href }, [
      el('div', { class: 'ticket-main' }, [
        el('p', { class: 'ticket-head' }, [el('span', {}, [t.head[0]]), el('span', {}, [t.head[1]])]),
        el('div', { class: 'ticket-body' }, [
          el('div', { class: 'ticket-row' }, [
            picture,
            el('div', { class: 'ticket-words' }, [el('h2', { class: 'route-title' }, [t.title]), t.way]),
          ]),
          el('dl', { class: 'ticket-fields' }, t.fields.map(f =>
            el('div', { class: `ticket-field ${f.cls || ''}` }, [el('dt', {}, [f.label]), el('dd', {}, [f.value])]))),
        ]),
      ]),
      el('div', { class: 'ticket-stub' }, [el('span', { class: 'ticket-control', 'aria-hidden': 'true' }, ['Control']), ...t.stub]),
    ]),
  ]);
}

/** The months as they are shortened on tickets. */
const MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie', 'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];

/**
 * The days of a journey with the month shortened, as printed on a ticket
 * ("24–25 decembrie" → "24–25 dec.").
 * @param {string} when
 */
const shortDate = when => MONTHS.reduce((s, m) => (m.length > 4 ? s.replace(m, `${m.slice(0, 3)}.`) : s), when);

/**
 * One journey's ticket: its name, its two stations, its days, its season
 * and how many missions wait on it; on the stub, a stamp that tells whether
 * the journey was done, and the button.
 * @param {import('./routes.js').RouteInfo} route
 */
function routeCard(route) {
  const p = progressOf(route.saveKey);
  const season = SEASONS[route.season];
  // the missions are counted when their list is read (the field shows when known)
  const missions = el('span', {}, ['🎯 …']);
  missionCount(route).then(n => { missions.textContent = n ? `🎯 ${n}` : '🎯'; });
  return ticket({
    itemClass: `route-item season--${route.season} is-${p.status}`,
    itemAttrs: { 'data-season': route.season },
    cardClass: '',
    href: route.path,
    head: ['🚂 Bilet de tren', `Ruta ${route.number}`],
    picture: thumb(route),
    title: route.title,
    // the two ends of the journey, joined like on a railway map
    way: el('p', { class: 'route-way' }, [
      el('span', {}, [route.from]),
      el('span', { class: 'route-line', 'aria-hidden': 'true' }),
      el('span', { class: 'sr-only' }, [' → ']),
      el('span', {}, [route.to]),
    ]),
    fields: [
      { label: 'Data', value: shortDate(route.when) },
      { label: 'Anotimp', value: `${season.icon} ${season.name}` },
      { label: 'Misiuni', value: missions, cls: 'ticket-field--missions' },
    ],
    stub: [
      el('span', { class: 'ticket-stamp' }, [el('span', { class: 'sr-only' }, ['Călătoria: ']), STATUS[p.status].stamp]),
      p.stars > 0 && el('span', { class: 'route-stars' }, [`★ ${p.stars}`]),
      el('span', { class: 'route-go' }, [STATUS[p.status].button]),
    ],
  });
}

/**
 * The ticket to Bubu's depot, after the journeys (whatever season is
 * shown): there the child picks a locomotive and decorates it.
 */
function depotCard() {
  return ticket({
    itemClass: 'route-item depot-item',
    cardClass: 'depot-card',
    href: 'depot/',
    head: ['🔧 Bilet spre depou', 'Atelier'],
    picture: `<svg viewBox="0 0 80 80" aria-hidden="true" focusable="false">${DEPOT}</svg>`,
    title: 'Depoul lui Bubu',
    way: el('p', { class: 'route-way' }, ['Decorează-ți locomotiva!']),
    fields: [
      { label: 'Intrare', value: 'Liberă' },
      { label: 'Atelier', value: '🎨 Decor' },
      { label: 'Trenuri', value: `🚂 ${DEPOT_LOCOS.length}`, cls: 'ticket-field--missions' },
    ],
    stub: [
      el('span', { class: 'ticket-stamp', 'aria-hidden': 'true' }, ['🎨']),
      el('span', { class: 'route-go' }, ['Intră']),
    ],
  });
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
list.after(depotCard());


/*
 * The "Vezi toate călătoriile ↓" button at the bottom of the screen (like
 * the one of lumea-lui-bubu): shown only while the page is at the top and a
 * journey's card is not fully seen; a tap jumps to that card. Nothing moves:
 * it simply shows or hides, and the page jumps without sliding.
 */
const hint = /** @type {HTMLButtonElement} */ (document.getElementById('scroll-hint'));
/** the first card (a journey or the depot) whose bottom, with its button, is below the screen */
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
