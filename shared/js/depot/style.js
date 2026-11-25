/**
 * @file How the child decorated the locomotives in Bubu's depot, and what
 * can be chosen there.
 *
 * Every locomotive has its own style: its three colours, a pattern on its
 * side, a bow on its front, a little flag on its roof, stickers and the
 * child's name on a plate. Nothing is tied to a season: the same
 * locomotive pulls journeys of every season. The styles are kept in the
 * browser (localStorage), apart from the journeys, so every journey
 * pulled by that locomotive shows it decorated.
 */

/** @typedef {import('./locos.js').LocoId} LocoId */

/**
 * @typedef {object} LocoStyle
 * @property {{body: string | null, band: string | null, roof: string | null}} colors  null: the colour it came with
 * @property {string | null} pattern   painted on the lower side (a key of PATTERNS; null: plain)
 * @property {string | null} bow       colour of the bow on the front (null: no bow)
 * @property {string | null} flag      the little flag on the roof (a key of FLAGS; null: none)
 * @property {string[]} stickers       stickers on the side, in the order they were put (keys of STICKERS), at most STICKER_SLOTS
 * @property {string} name             written on the plate on the side ('' : no plate)
 */

/** Where the styles are kept. */
const KEY = 'trenul-lui-bubu/depot';

/** How many stickers fit on the side of a locomotive. */
export const STICKER_SLOTS = 4;

/** The longest name that fits on the plate. */
export const NAME_LENGTH = 12;

/** The kind of car of every locomotive of the depot, and back. */
export const LOCO_OF_KIND = /** @type {Readonly<Record<string, LocoId>>} */ (Object.freeze({
  electricLoco: 'electric', dieselLoco: 'diesel', steamLoco: 'steam',
}));

/** @returns {LocoStyle} a locomotive as it came from the factory */
export const plainStyle = () => ({ colors: { body: null, band: null, roof: null }, pattern: null, bow: null, flag: null, stickers: [], name: '' });

/*
 * What the child can choose. Every colour has a name, as the children say
 * it (read by screen readers and shown as a tooltip).
 */

/** @typedef {{color: string, name: string}} Swatch */

/** @type {Readonly<Record<'body' | 'band' | 'roof', readonly Swatch[]>>} */
export const PALETTES = Object.freeze({
  body: [
    { color: '#d8382f', name: 'roșu' },
    { color: '#f08a24', name: 'portocaliu' },
    { color: '#f2c12e', name: 'galben' },
    { color: '#2e8b57', name: 'verde' },
    { color: '#1fa5a0', name: 'turcoaz' },
    { color: '#2f6fd0', name: 'albastru' },
    { color: '#7e57c2', name: 'mov' },
    { color: '#e8559a', name: 'roz' },
    { color: '#f4f1ea', name: 'alb' },
    { color: '#2b2f38', name: 'negru' },
  ],
  band: [
    { color: '#fbeed2', name: 'crem' },
    { color: '#ffffff', name: 'alb' },
    { color: '#ffd23f', name: 'auriu' },
    { color: '#d8382f', name: 'roșu' },
    { color: '#2f6fd0', name: 'albastru' },
    { color: '#2e8b57', name: 'verde' },
    { color: '#ff9fc8', name: 'roz' },
    { color: '#2b2f38', name: 'negru' },
  ],
  roof: [
    { color: '#7d8796', name: 'gri' },
    { color: '#4a5160', name: 'gri închis' },
    { color: '#f4f8ff', name: 'alb' },
    { color: '#b71c1c', name: 'roșu închis' },
    { color: '#1f4f9c', name: 'albastru închis' },
    { color: '#c9a227', name: 'auriu' },
  ],
});

/** The colours of the bow. */
export const BOWS = Object.freeze([
  { color: '#e53935', name: 'roșie' },
  { color: '#ec407a', name: 'roz' },
  { color: '#ffc928', name: 'aurie' },
  { color: '#1e88e5', name: 'albastră' },
  { color: '#43a047', name: 'verde' },
  { color: '#8e44ad', name: 'mov' },
]);

/** The patterns painted on the lower side of the locomotive (drawn by train/loco-decor.js). */
export const PATTERNS = /** @type {Readonly<Record<string, string>>} */ (Object.freeze({
  dots: 'Buline',
  stripes: 'Dungi',
  zigzag: 'Zigzag',
  stars: 'Steluțe',
  hearts: 'Inimioare',
}));

/** The little flags on the roof (drawn by train/loco-decor.js). */
export const FLAGS = /** @type {Readonly<Record<string, string>>} */ (Object.freeze({
  tricolor: 'Tricolor',
  red: 'Roșu',
  yellow: 'Galben',
  green: 'Verde',
  blue: 'Albastru',
  ladybug: 'Cu buburuză',
  checkered: 'În carouri',
}));

/** The stickers (drawn by train/loco-decor.js). */
export const STICKERS = /** @type {Readonly<Record<string, string>>} */ (Object.freeze({
  star: 'Stea',
  heart: 'Inimă',
  fir: 'Brăduț',
  snowflake: 'Fulg',
  rainbow: 'Curcubeu',
  sun: 'Soare',
  moon: 'Lună',
  flower: 'Floare',
  ladybug: 'Buburuză',
}));

/**
 * Keeps only what is known (a style saved by an older game, or edited by
 * hand, never breaks the train).
 * @param {any} raw
 * @returns {LocoStyle}
 */
function clean(raw) {
  const style = plainStyle();
  if (!raw || typeof raw !== 'object') return style;
  for (const part of /** @type {const} */ (['body', 'band', 'roof'])) {
    const c = raw.colors?.[part];
    if (PALETTES[part].some(s => s.color === c)) style.colors[part] = c;
  }
  if (typeof raw.pattern === 'string' && raw.pattern in PATTERNS) style.pattern = raw.pattern;
  if (BOWS.some(b => b.color === raw.bow)) style.bow = raw.bow;
  if (typeof raw.flag === 'string' && raw.flag in FLAGS) style.flag = raw.flag;
  if (Array.isArray(raw.stickers)) style.stickers = raw.stickers.filter(s => typeof s === 'string' && s in STICKERS).slice(0, STICKER_SLOTS);
  if (typeof raw.name === 'string') style.name = cleanName(raw.name);
  return style;
}

/**
 * A name as it is written on the plate: letters, digits, spaces and a few
 * signs, at most NAME_LENGTH of them.
 * @param {string} name
 */
export const cleanName = name => name.replace(/[^\p{L}\p{N} .'-]/gu, '').replace(/\s+/g, ' ').trimStart().slice(0, NAME_LENGTH);

/** @returns {Record<string, any>} everything saved (nothing if the browser refuses storage) */
function readAll() {
  try {
    const data = JSON.parse(localStorage.getItem(KEY) || '{}');
    return data && typeof data === 'object' ? data : {};
  } catch {
    return {};
  }
}

/**
 * The style the child gave a locomotive (as it came, if none).
 * @param {LocoId} id
 * @returns {LocoStyle}
 */
export function loadStyle(id) {
  return clean(readAll()[id]);
}

/**
 * Keeps the style of a locomotive.
 * @param {LocoId} id
 * @param {LocoStyle} style
 */
export function saveStyle(id, style) {
  const all = readAll();
  all[id] = clean(style);
  try {
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch {
    // storage unavailable: the decorations last until the page is closed
  }
}

/**
 * The style of the locomotive that pulls a train (null for a car that is
 * not a locomotive of the depot, or a locomotive of another train).
 * @param {import('../train/specs.js').CarSpec} car
 * @returns {LocoStyle | null}
 */
export function styleOfCar(car) {
  const id = LOCO_OF_KIND[car.kind];
  return id && !car.plain ? loadStyle(id) : null;
}

/**
 * The car with the colours of a style (those not chosen stay as they were).
 * @param {import('../train/specs.js').CarSpec} car
 * @param {LocoStyle | null} style
 * @returns {import('../train/specs.js').CarSpec}
 */
export function paintedCar(car, style) {
  if (!style) return car;
  const { body, band, roof } = style.colors;
  return { ...car, colors: { ...car.colors, body: body ?? car.colors.body, band: band ?? car.colors.band, roof: roof ?? car.colors.roof } };
}

/**
 * The colour of a locomotive's body as the child painted it in the depot:
 * the colour a journey starts with (the child may change it there, for that
 * journey only).
 * @param {import('../train/specs.js').CarSpec} car
 */
export const depotBodyColor = car => styleOfCar(car)?.colors.body ?? car.colors.body;
