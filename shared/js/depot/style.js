/**
 * @file How the child decorated the locomotives in Bubu's depot, and what
 * can be chosen there.
 *
 * Every locomotive has its own style: its three colours, a bow on its
 * front, baubles on a garland along the roof, a string of lights on the
 * roof and up to three stickers on its side. The styles are kept in the
 * browser (localStorage), apart from the journeys, so every journey
 * pulled by that locomotive shows it decorated.
 */

/** @typedef {import('./locos.js').LocoId} LocoId */

/**
 * @typedef {object} LocoStyle
 * @property {{body: string | null, band: string | null, roof: string | null}} colors  null: the colour it came with
 * @property {string | null} bow       colour of the bow on the front (null: no bow)
 * @property {string | null} baubles   the set of baubles on the roof (a key of BAUBLE_SETS)
 * @property {string | null} lights    the string of lights on the roof (a key of LIGHT_SETS)
 * @property {string[]} stickers       stickers on the side, left to right (keys of STICKERS), at most STICKER_SLOTS
 */

/** Where the styles are kept. */
const KEY = 'trenul-lui-bubu/depot';

/** How many stickers fit on the side of a locomotive. */
export const STICKER_SLOTS = 3;

/** The kind of car of every locomotive of the depot, and back. */
export const LOCO_OF_KIND = /** @type {Readonly<Record<string, LocoId>>} */ (Object.freeze({
  electricLoco: 'electric', dieselLoco: 'diesel', steamLoco: 'steam',
}));

/** @returns {LocoStyle} a locomotive as it came from the factory */
export const plainStyle = () => ({ colors: { body: null, band: null, roof: null }, bow: null, baubles: null, lights: null, stickers: [] });

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
    { color: '#f4f8ff', name: 'alb ca zăpada' },
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

/** The sets of baubles: their colours, repeated along the garland. */
export const BAUBLE_SETS = /** @type {Readonly<Record<string, {name: string, colors: string[]}>>} */ (Object.freeze({
  red: { name: 'Roșii', colors: ['#e53935', '#c62828'] },
  gold: { name: 'Aurii', colors: ['#fbc02d', '#e0a800'] },
  silver: { name: 'Argintii', colors: ['#cfd8dc', '#90caf9'] },
  mixed: { name: 'Colorate', colors: ['#e53935', '#fbc02d', '#1e88e5', '#43a047', '#ec407a', '#8e44ad'] },
}));

/** The strings of lights: their colours, and whether they twinkle in turn. */
export const LIGHT_SETS = /** @type {Readonly<Record<string, {name: string, colors: string[], chase?: boolean}>>} */ (Object.freeze({
  mixed: { name: 'Colorate', colors: ['#ff5252', '#ffd740', '#40c4ff', '#69f0ae'] },
  warm: { name: 'Calde', colors: ['#ffe08a'] },
  blue: { name: 'Albastre', colors: ['#7fd4ff', '#ffffff'] },
  chase: { name: 'Fugărite', colors: ['#ff5252', '#ffd740', '#69f0ae', '#40c4ff', '#e040fb'], chase: true },
}));

/** The stickers (drawn by train/loco-decor.js). */
export const STICKERS = /** @type {Readonly<Record<string, string>>} */ (Object.freeze({
  star: 'Stea',
  heart: 'Inimă',
  fir: 'Brăduț',
  snowflake: 'Fulg',
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
  if (BOWS.some(b => b.color === raw.bow)) style.bow = raw.bow;
  if (typeof raw.baubles === 'string' && raw.baubles in BAUBLE_SETS) style.baubles = raw.baubles;
  if (typeof raw.lights === 'string' && raw.lights in LIGHT_SETS) style.lights = raw.lights;
  if (Array.isArray(raw.stickers)) style.stickers = raw.stickers.filter(s => typeof s === 'string' && s in STICKERS).slice(0, STICKER_SLOTS);
  return style;
}

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
