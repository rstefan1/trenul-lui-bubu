/**
 * @file The big landscape at the top of the home page: a train passing
 * through a Romanian village, with hills, forests and mountains behind it
 * and children playing in front. The same landscape is drawn in the colours
 * and with the things of the season home/season.js chose.
 *
 * It is one SVG, drawn once and never again: nothing moves on the home page.
 *
 * The picture is 2800 × 970 (x from -600 to 2200) and is cut to fit the
 * screen (the bottom is always shown): on a tall phone only the middle
 * (x 300–1300) is seen, on a wide and low strip the top of the sky is cut
 * away. So the engine, the children and the season's main things stay in
 * the middle and in the lower part; the two sides (x < 0, x > 1600) are
 * mostly meadow, forest and mountains, for wide screens.
 *
 * The scenery under the landscape (ground()) is 2000 wide (x from -200 to
 * 1800).
 */

/** @typedef {'winter' | 'spring' | 'summer' | 'autumn'} Season */

const H = 1000;
/** the landscape, much wider than its middle (0–1600) at both sides */
const LX0 = -600;
const LX1 = 2200;
/** the scenery under the landscape */
const X0 = -200;
const X1 = 1800;
/** the top of the rails */
const RAIL = 798;

/**
 * The colours of a season.
 * @typedef {object} Palette
 * @property {[string, string]} sky
 * @property {string} sun
 * @property {[string, string, string]} mountains  far, light face, forested ridge
 * @property {[string, string]} hills             village hill, its shade
 * @property {string} meadow
 * @property {string} meadowDark
 * @property {string} conifer
 * @property {[string, string]} leaves            crown, its light side
 */

/** @type {Record<Season, Palette>} */
const PALETTES = {
  summer: {
    sky: ['#3d9be9', '#c4ecff'],
    sun: '#ffe04a',
    mountains: ['#7f9fc4', '#a9c2de', '#3f7d4f'],
    hills: ['#7cc35a', '#5fa94a'],
    meadow: '#8fd16a',
    meadowDark: '#6cb851',
    conifer: '#2d6a3a',
    leaves: ['#3f923c', '#68b84e'],
  },
};

/* ---------------------------------------------------------------------------
 * Small helpers
 * ------------------------------------------------------------------------ */

/** A random number generator that always gives the same numbers (the picture never changes). */
function seeded(seed = 7) {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** @param {number} n */
const r1 = n => Math.round(n * 10) / 10;

/** The top line of a ridge, as the points of a closed shape down to `bottom`. */
function ridge(/** @type {(x: number) => number} */ top, /** @type {number} */ bottom, x0 = X0, x1 = X1, step = 20) {
  let d = `M${x0} ${bottom} L${x0} ${r1(top(x0))}`;
  for (let x = x0 + step; x <= x1; x += step) d += ` L${x} ${r1(top(x))}`;
  return `${d} L${x1} ${bottom}Z`;
}

/** the forested ridge in front of the mountains */
const forestTop = (/** @type {number} */ x) => 590 + 20 * Math.sin(x / 130) + 12 * Math.sin(x / 57 + 1);
/** the hill of the village (highest in the middle) */
const villageTop = (/** @type {number} */ x) =>
  650 + 26 * Math.sin(x / 210 + 0.5) + 10 * Math.sin(x / 90) - 70 * Math.exp(-(((x - 800) / 260) ** 2));

/* ---------------------------------------------------------------------------
 * Things of the landscape
 * ------------------------------------------------------------------------ */

/** A fir tree standing at (x, y). */
function fir(/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ h, /** @type {string} */ color) {
  const w = h * 0.42;
  return `<path d="M${r1(x)} ${r1(y - h)} L${r1(x + w)} ${r1(y - h * 0.3)} L${r1(x + w * 0.55)} ${r1(y - h * 0.3)} L${r1(x + w * 1.15)} ${r1(y)} L${r1(x - w * 1.15)} ${r1(y)} L${r1(x - w * 0.55)} ${r1(y - h * 0.3)} L${r1(x - w)} ${r1(y - h * 0.3)}Z" fill="${color}"/>`;
}

/** A leafy tree standing at (x, y). */
function tree(/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ h, /** @type {Palette} */ p) {
  const r = h * 0.3;
  return `<g><rect x="${r1(x - h * 0.05)}" y="${r1(y - h * 0.5)}" width="${r1(h * 0.1)}" height="${r1(h * 0.5)}" fill="#7a5235"/>`
    + `<circle cx="${r1(x - r * 0.55)}" cy="${r1(y - h * 0.6)}" r="${r1(r * 0.8)}" fill="${p.leaves[0]}"/>`
    + `<circle cx="${r1(x + r * 0.55)}" cy="${r1(y - h * 0.6)}" r="${r1(r * 0.8)}" fill="${p.leaves[0]}"/>`
    + `<circle cx="${r1(x)}" cy="${r1(y - h * 0.78)}" r="${r1(r)}" fill="${p.leaves[0]}"/>`
    + `<circle cx="${r1(x + r * 0.3)}" cy="${r1(y - h * 0.85)}" r="${r1(r * 0.5)}" fill="${p.leaves[1]}"/></g>`;
}

/** A village house with its base at (x, y). */
function house(/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ s, /** @type {string} */ roof, /** @type {string} */ wall) {
  const w = 64 * s;
  const h = 38 * s;
  return `<g>`
    + `<rect x="${r1(x - w / 2)}" y="${r1(y - h)}" width="${r1(w)}" height="${r1(h)}" fill="${wall}"/>`
    + `<path d="M${r1(x - w / 2 - 8 * s)} ${r1(y - h + 2)} L${r1(x - w * 0.3)} ${r1(y - h - 30 * s)} L${r1(x + w * 0.3)} ${r1(y - h - 30 * s)} L${r1(x + w / 2 + 8 * s)} ${r1(y - h + 2)}Z" fill="${roof}"/>`
    + `<rect x="${r1(x - w * 0.34)}" y="${r1(y - h * 0.72)}" width="${r1(12 * s)}" height="${r1(12 * s)}" fill="#3b6fb6" stroke="#fff" stroke-width="${r1(2 * s)}"/>`
    + `<rect x="${r1(x + w * 0.1)}" y="${r1(y - h * 0.72)}" width="${r1(12 * s)}" height="${r1(12 * s)}" fill="#3b6fb6" stroke="#fff" stroke-width="${r1(2 * s)}"/>`
    + `<rect x="${r1(x + w * 0.36 - 10 * s)}" y="${r1(y - h * 0.62)}" width="${r1(10 * s)}" height="${r1(h * 0.62)}" fill="#8a5a3b"/>`
    + `</g>`;
}

/** A child standing with feet at (x, y), about 100 tall at scale 1. */
function child(/** @type {number} */ x, /** @type {number} */ y, /** @type {{shirt: string, hair: string, skin?: string, legs?: string, pose?: 'wave' | 'up' | 'catch' | 'kick' | 'sit', girl?: boolean, s?: number, flip?: boolean}} */ o) {
  const s = o.s ?? 1;
  const skin = o.skin ?? '#f6c9a0';
  const legs = o.legs ?? '#3a5ba8';
  const pose = o.pose ?? 'wave';
  const f = o.flip ? -1 : 1;
  const X = (/** @type {number} */ dx) => r1(x + dx * s * f);
  const Y = (/** @type {number} */ dy) => r1(y - dy * s);
  const hands = {
    wave: [[-20, 40], [26, 112]],
    up: [[-20, 40], [22, 108]],
    catch: [[-24, 96], [24, 96]],
    kick: [[-26, 70], [26, 62]],
    sit: [[-22, 40], [22, 40]],
  }[pose];
  const feet = pose === 'kick' ? [[-8, 0], [26, 16]] : [[-9, 0], [9, 0]];
  const line = (/** @type {number[]} */ a, /** @type {number[]} */ b, /** @type {string} */ c, /** @type {number} */ w) =>
    `<path d="M${X(a[0])} ${Y(a[1])} L${X(b[0])} ${Y(b[1])}" stroke="${c}" stroke-width="${r1(w * s)}" stroke-linecap="round"/>`;
  const body = o.girl
    ? `<path d="M${X(-11)} ${Y(76)} L${X(11)} ${Y(76)} L${X(20)} ${Y(32)} L${X(-20)} ${Y(32)}Z" fill="${o.shirt}" stroke="${o.shirt}" stroke-width="${r1(6 * s)}" stroke-linejoin="round"/>`
    : `<rect x="${r1(Math.min(X(-14), X(14)))}" y="${Y(78)}" width="${r1(28 * s)}" height="${r1(42 * s)}" rx="${r1(9 * s)}" fill="${o.shirt}"/>`;
  const tails = o.girl
    ? `<circle cx="${X(-17)}" cy="${Y(90)}" r="${r1(7 * s)}" fill="${o.hair}"/><circle cx="${X(17)}" cy="${Y(90)}" r="${r1(7 * s)}" fill="${o.hair}"/>`
    : '';
  return `<g>`
    + line([-7, 38], feet[0], o.girl ? skin : legs, 9)
    + line([7, 38], feet[1], o.girl ? skin : legs, 9)
    + `<ellipse cx="${X(feet[0][0] - 2)}" cy="${Y(feet[0][1] - 1)}" rx="${r1(8 * s)}" ry="${r1(4 * s)}" fill="#c0392b"/>`
    + `<ellipse cx="${X(feet[1][0] + 2)}" cy="${Y(feet[1][1] - 1)}" rx="${r1(8 * s)}" ry="${r1(4 * s)}" fill="#c0392b"/>`
    + line([-11, 72], hands[0], skin, 8)
    + line([11, 72], hands[1], skin, 8)
    + body
    + tails
    + `<circle cx="${X(0)}" cy="${Y(92)}" r="${r1(15 * s)}" fill="${skin}"/>`
    + `<path d="M${X(-15)} ${Y(92)} A${r1(15 * s)} ${r1(15 * s)} 0 0 ${f > 0 ? 1 : 0} ${X(15)} ${Y(92)} Q${X(4)} ${Y(98)} ${X(-15)} ${Y(92)}Z" fill="${o.hair}"/>`
    + `<circle cx="${X(-5)}" cy="${Y(90)}" r="${r1(1.8 * s)}" fill="#2b2f38"/><circle cx="${X(5)}" cy="${Y(90)}" r="${r1(1.8 * s)}" fill="#2b2f38"/>`
    + `<path d="M${X(-5)} ${Y(84)} Q${X(0)} ${Y(80)} ${X(5)} ${Y(84)}" stroke="#2b2f38" stroke-width="${r1(1.8 * s)}" fill="none" stroke-linecap="round"/>`
    + `</g>`;
}

/** A haystack (căpiță) with its base at (x, y). */
function haystack(/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ s) {
  const w = 52 * s;
  const h = 100 * s;
  return `<g>`
    + `<path d="M${r1(x)} ${r1(y - h - 16 * s)} V${r1(y - h + 10 * s)}" stroke="#7a5235" stroke-width="${r1(4 * s)}" stroke-linecap="round"/>`
    + `<path d="M${r1(x - w)} ${r1(y)} Q${r1(x - w * 1.1)} ${r1(y - h * 0.7)} ${r1(x)} ${r1(y - h)} Q${r1(x + w * 1.1)} ${r1(y - h * 0.7)} ${r1(x + w)} ${r1(y)}Z" fill="#e9c35b"/>`
    + `<path d="M${r1(x - w * 0.6)} ${r1(y - h * 0.15)} Q${r1(x - w * 0.5)} ${r1(y - h * 0.6)} ${r1(x - w * 0.1)} ${r1(y - h * 0.85)} M${r1(x)} ${r1(y - h * 0.1)} Q${r1(x + w * 0.1)} ${r1(y - h * 0.55)} ${r1(x + w * 0.3)} ${r1(y - h * 0.8)} M${r1(x + w * 0.6)} ${r1(y - h * 0.15)} Q${r1(x + w * 0.65)} ${r1(y - h * 0.45)} ${r1(x + w * 0.55)} ${r1(y - h * 0.55)}" stroke="#c99a35" stroke-width="${r1(3 * s)}" fill="none" stroke-linecap="round"/>`
    + `<path d="M${r1(x - w * 0.95)} ${r1(y - h * 0.3)} Q${r1(x)} ${r1(y - h * 0.4)} ${r1(x + w * 0.95)} ${r1(y - h * 0.3)}" stroke="#c99a35" stroke-width="${r1(3 * s)}" fill="none"/>`
    + `</g>`;
}

/** A sunflower whose stem starts at (x, y). */
function sunflower(/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ h, tilt = 0) {
  const hx = x + tilt;
  const hy = y - h;
  const r = h * 0.13;
  let petals = '';
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * Math.PI * 2;
    petals += `<ellipse cx="${r1(hx + Math.cos(a) * r * 1.35)}" cy="${r1(hy + Math.sin(a) * r * 1.35)}" rx="${r1(r * 0.62)}" ry="${r1(r * 0.28)}" transform="rotate(${r1((a * 180) / Math.PI)} ${r1(hx + Math.cos(a) * r * 1.35)} ${r1(hy + Math.sin(a) * r * 1.35)})" fill="#ffc41f"/>`;
  }
  return `<g>`
    + `<path d="M${x} ${y} Q${r1(x + tilt * 0.2)} ${r1(y - h * 0.5)} ${r1(hx)} ${r1(hy)}" stroke="#4e8f2f" stroke-width="${r1(h * 0.045)}" fill="none"/>`
    + `<ellipse cx="${r1(x - h * 0.1)}" cy="${r1(y - h * 0.42)}" rx="${r1(h * 0.12)}" ry="${r1(h * 0.05)}" transform="rotate(-25 ${r1(x - h * 0.1)} ${r1(y - h * 0.42)})" fill="#5ea83a"/>`
    + `<ellipse cx="${r1(x + h * 0.1)}" cy="${r1(y - h * 0.6)}" rx="${r1(h * 0.12)}" ry="${r1(h * 0.05)}" transform="rotate(25 ${r1(x + h * 0.1)} ${r1(y - h * 0.6)})" fill="#5ea83a"/>`
    + petals
    + `<circle cx="${r1(hx)}" cy="${r1(hy)}" r="${r1(r)}" fill="#6b3f1d"/>`
    + `<circle cx="${r1(hx - r * 0.3)}" cy="${r1(hy - r * 0.3)}" r="${r1(r * 0.35)}" fill="#8a5528"/>`
    + `</g>`;
}

/** Small flowers spread over the meadow. */
function flowers(/** @type {() => number} */ rnd, /** @type {number} */ count, /** @type {string[]} */ colors, top = 850, depth = 145, x0 = X0, x1 = X1) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = x0 + rnd() * (x1 - x0);
    const y = top + rnd() * depth;
    const k = 0.6 + (y - top) / depth;         // bigger in front
    const c = colors[Math.floor(rnd() * colors.length)];
    out += `<path d="M${r1(x)} ${r1(y)} v${r1(10 * k)}" stroke="#3f8f34" stroke-width="${r1(2 * k)}"/>`
      + `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(5 * k)}" fill="${c}"/>`
      + `<circle cx="${r1(x)}" cy="${r1(y)}" r="${r1(1.8 * k)}" fill="${c === '#ffffff' ? '#ffc41f' : '#3b2617'}"/>`;
  }
  return out;
}

/* ---------------------------------------------------------------------------
 * The railway and the train
 * ------------------------------------------------------------------------ */

/** the contact wire of the electric line, which the pantograph touches */
const WIRE = RAIL - 232;

/** The track along the whole picture, on its embankment, under the wires of the electric line. */
function railway() {
  let sleepers = '';
  for (let x = LX0 + 4; x < LX1; x += 20) sleepers += `<rect x="${x}" y="${RAIL + 4}" width="12" height="8" rx="2"/>`;
  // the masts, the wire that carries (it sags between two masts) and the droppers that hold the contact wire
  const masts = [];
  for (let x = LX0 + 60; x < LX1; x += 380) masts.push(x);
  let lines = '';
  for (const x of masts) {
    lines += `<rect x="${x - 5}" y="${RAIL - 266}" width="10" height="268" fill="#8a939e"/><rect x="${x - 5}" y="${RAIL - 266}" width="3" height="268" fill="#b3bac3"/>`
      + `<path d="M${x} ${RAIL - 254} H${x + 40} M${x} ${RAIL - 238} L${x + 40} ${RAIL - 248}" stroke="#6b737d" stroke-width="4"/>`
      + `<rect x="${x + 36}" y="${RAIL - 258}" width="6" height="12" rx="2" fill="#c96a3a"/>`;
  }
  let droppers = '';
  let carrier = '';
  for (let i = 0; i < masts.length - 1; i++) {
    const a = masts[i] + 40;
    const b = masts[i + 1] + 40;
    carrier += `M${a} ${RAIL - 252} Q${(a + b) / 2} ${RAIL - 226} ${b} ${RAIL - 252} `;
    for (let k = 1; k < 8; k++) {
      const t = k / 8;
      const y = (1 - t) * (1 - t) * (RAIL - 252) + 2 * t * (1 - t) * (RAIL - 226) + t * t * (RAIL - 252);
      droppers += `M${r1(a + (b - a) * t)} ${r1(y)} V${WIRE} `;
    }
  }
  return `<g>${lines}</g>`
    + `<path d="${carrier}" stroke="#4a4f5a" stroke-width="1.6" fill="none"/>`
    + `<path d="${droppers}" stroke="#6b737d" stroke-width="1"/>`
    + `<path d="M${LX0} ${WIRE} H${LX1}" stroke="#3a4049" stroke-width="2"/>`
    + `<path d="M${LX0} ${RAIL + 4} H${LX1} V${RAIL + 44} H${LX0}Z" fill="#a89580"/>`
    + `<path d="M${LX0} ${RAIL + 30} H${LX1} V${RAIL + 44} H${LX0}Z" fill="#8c7a66"/>`
    + `<g fill="#6b4a32">${sleepers}</g>`
    + `<rect x="${LX0}" y="${RAIL - 4}" width="${LX1 - LX0}" height="8" fill="#5b616c"/>`
    + `<rect x="${LX0}" y="${RAIL - 4}" width="${LX1 - LX0}" height="2.5" fill="#c8ced8"/>`;
}

/** The shading of the train (gradients, defined once). */
function trainDefs() {
  const v = (/** @type {string} */ id, /** @type {string[]} */ stops) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map((c, i) => `<stop offset="${r1(i / (stops.length - 1))}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  return `<defs>`
    + v('tr-coach', ['#3d74c4', '#2f5fa8', '#244a86'])
    + v('tr-loco', ['#ea4a40', '#d8382f', '#a6231c'])
    + v('tr-roof', ['#9aa3ae', '#6c7685'])
    + v('tr-glass', ['#cfe5f6', '#7fa6d4'])
    + `</defs>`;
}

/** A wheel (solid, with its tyre and hub), centred at (x, y). */
function wheel(/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ r) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#23272e"/>`
    + `<circle cx="${x}" cy="${y}" r="${r1(r * 0.74)}" fill="#4a5160"/>`
    + `<circle cx="${x}" cy="${y}" r="${r1(r * 0.3)}" fill="#a7b0bb"/>`;
}

/** A bogie centred at x: its frame, its springs and `axles` wheels of radius r. */
function bogie(/** @type {number} */ x, /** @type {number} */ axles, /** @type {number} */ r, /** @type {number} */ gap) {
  const half = ((axles - 1) * gap) / 2;
  let wheels = '';
  for (let i = 0; i < axles; i++) wheels += wheel(x - half + i * gap, RAIL - r, r);
  return `<rect x="${x - 7}" y="${RAIL - 2 * r - 22}" width="14" height="14" fill="#2d323c"/>`
    + wheels
    + `<rect x="${x - half - r - 4}" y="${RAIL - r - 9}" width="${2 * half + 2 * r + 8}" height="11" rx="3" fill="#3b4250"/>`
    + `<path d="M${x - 6} ${RAIL - r - 10} v-${r - 2} m6 0 v${r - 2} m6 0 v-${r - 2}" stroke="#7d8796" stroke-width="2.5"/>`;
}

/** A child's head and shoulders in a train window (drawn inside the window). */
function passenger(/** @type {number} */ w, /** @type {number} */ h, /** @type {string} */ hair, /** @type {string} */ shirt) {
  const cx = w / 2;
  return `<rect x="${cx - 8}" y="${h - 6}" width="16" height="10" rx="5" fill="${shirt}"/>`
    + `<circle cx="${cx}" cy="${h - 12}" r="6.5" fill="#f6c9a0"/>`
    + `<path d="M${cx - 6.5} ${h - 12} A6.5 6.5 0 0 1 ${cx + 6.5} ${h - 12} Q${cx} ${h - 15} ${cx - 6.5} ${h - 12}Z" fill="${hair}"/>`;
}

/** A window centred at (x, y), its glass, maybe a child, and the light on the glass. */
function trainWindow(/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ w, /** @type {number} */ h, /** @type {[string, string] | null} */ who, inside = '') {
  return `<svg x="${r1(x - w / 2)}" y="${r1(y - h / 2)}" width="${w}" height="${h}"><rect width="${w}" height="${h}" fill="url(#tr-glass)"/>${who ? passenger(w, h, who[0], who[1]) : ''}${inside}<path d="M0 ${h * 0.55} L${w * 0.55} 0 H${w * 0.8} L0 ${h * 0.85}Z" fill="#fff" opacity=".22"/></svg>`
    + `<rect x="${r1(x - w / 2)}" y="${r1(y - h / 2)}" width="${w}" height="${h}" rx="4" fill="none" stroke="#2d3542" stroke-width="2.5"/>`;
}

/**
 * A blue passenger coach (like the ones of the game) whose left end is at x.
 * @param {number} x
 * @param {number} L  its length
 * @param {Array<[string, string] | null>} people  the child in every window (null: an empty seat)
 */
function coach(x, L, people) {
  const top = RAIL - 150;
  const bottom = RAIL - 44;
  const n = people.length;
  const step = (L - 76) / (n - 1);
  let windows = '';
  people.forEach((who, i) => { windows += trainWindow(x + 38 + i * step, top + 38, 24, 26, who); });
  const door = (/** @type {number} */ dx) =>
    `<rect x="${dx}" y="${top + 10}" width="18" height="${bottom - top - 12}" rx="2" fill="none" stroke="#1c3c6c" stroke-width="1.6"/>`
    + `<rect x="${dx + 4}" y="${top + 18}" width="10" height="20" rx="2" fill="url(#tr-glass)" stroke="#2d3542" stroke-width="1.2"/>`;
  return `<g>`
    + bogie(x + 40, 2, 12, 34) + bogie(x + L - 40, 2, 12, 34)
    + `<rect x="${x + 6}" y="${bottom}" width="${L - 12}" height="8" fill="#2d323c"/>`
    + `<rect x="${x + L * 0.36}" y="${bottom + 6}" width="${L * 0.28}" height="14" rx="3" fill="#3b4250"/>`
    + `<rect x="${x}" y="${top}" width="${L}" height="${bottom - top}" rx="8" fill="url(#tr-coach)"/>`
    + `<rect x="${x}" y="${top + 20}" width="${L}" height="36" fill="#f6ecd6"/>`
    + `<rect x="${x}" y="${top + 58}" width="${L}" height="3" fill="#e0b84a"/>`
    + windows
    + door(x + 8) + door(x + L - 26)
    + `<path d="M${x - 2} ${top + 4} Q${x} ${top - 9} ${x + 16} ${top - 11} H${x + L - 16} Q${x + L} ${top - 9} ${x + L + 2} ${top + 4}Z" fill="url(#tr-roof)"/>`
    + `<rect x="${x + L * 0.3 - 9}" y="${top - 17}" width="18" height="7" rx="2" fill="#6c7685"/><rect x="${x + L * 0.7 - 9}" y="${top - 17}" width="18" height="7" rx="2" fill="#6c7685"/>`
    + `</g>`;
}

/** The red electric engine (like the one of the game), its left end at x, going to the right, with Bubu at the front. */
function locomotive(/** @type {number} */ x) {
  const L = 290;
  const top = RAIL - 158;
  const bottom = RAIL - 50;
  const px = x + L - 96;   // the raised pantograph
  let grilles = '';
  for (let i = 0; i < 4; i++) {
    const gx = x + 82 + i * 34;
    grilles += `<rect x="${gx}" y="${top + 16}" width="26" height="36" rx="3" fill="#b52a22"/>`
      + `<path d="M${gx + 5} ${top + 20} v28 m6 -28 v28 m6 -28 v28 m6 -28 v28" stroke="#8f1d17" stroke-width="2"/>`;
  }
  return `<g>`
    + bogie(x + 66, 3, 15, 34) + bogie(x + L - 66, 3, 15, 34)
    + `<rect x="${x + 8}" y="${bottom}" width="${L - 16}" height="10" fill="#2d323c"/>`
    + `<rect x="${x - 6}" y="${bottom - 6}" width="8" height="8" rx="2" fill="#59606b"/><rect x="${x + L - 2}" y="${bottom - 6}" width="8" height="8" rx="2" fill="#59606b"/>`
    // the pantographs: the front one raised to the wire, the back one lowered
    + `<path d="M${px - 22} ${top - 12} L${px + 12} ${r1((top - 12 + WIRE) / 2)} L${px - 8} ${WIRE + 3} M${px + 18} ${top - 12} L${px + 12} ${r1((top - 12 + WIRE) / 2)}" stroke="#4a5160" stroke-width="3" fill="none" stroke-linejoin="round"/>`
    + `<path d="M${px - 32} ${WIRE + 3} H${px + 16}" stroke="#2d323c" stroke-width="4" stroke-linecap="round"/>`
    + `<path d="M${x + 60} ${top - 14} L${x + 104} ${top - 20} L${x + 60} ${top - 22}" stroke="#4a5160" stroke-width="3" fill="none"/>`
    + `<rect x="${px - 28}" y="${top - 16}" width="52" height="7" rx="2" fill="#4a5160"/><rect x="${x + 52}" y="${top - 16}" width="56" height="7" rx="2" fill="#4a5160"/>`
    // the body with its sloping ends, the cream band and the yellow line
    + `<path d="M${x + 22} ${top} H${x + L - 22} L${x + L} ${top + 46} V${bottom} H${x} V${top + 46}Z" fill="url(#tr-loco)"/>`
    + `<rect x="${x}" y="${bottom - 30}" width="${L}" height="14" fill="#fbeed2"/>`
    + `<rect x="${x}" y="${bottom - 14}" width="${L}" height="4" fill="#ffd23f"/>`
    + grilles
    // the cab windows: Bubu drives at the front
    + `<path d="M${x + L - 20} ${top + 6} L${x + L - 3} ${top + 44} H${x + L - 14} L${x + L - 30} ${top + 6}Z" fill="#7fa6d4" stroke="#2d3542" stroke-width="2"/>`
    + trainWindow(x + L - 54, top + 30, 34, 34, null, `<image href="shared/assets/bubu.webp" x="-2" y="2" width="38" height="38"/>`)
    + trainWindow(x + 44, top + 30, 26, 30, null)
    + `<path d="M${x + 20} ${top + 6} L${x + 3} ${top + 44} H${x + 14} L${x + 30} ${top + 6}Z" fill="#7fa6d4" stroke="#2d3542" stroke-width="2"/>`
    + `<circle cx="${x + L - 7}" cy="${bottom - 38}" r="4.5" fill="#fff6b0" stroke="#2d323c" stroke-width="1.5"/>`
    + `<circle cx="${x + 7}" cy="${bottom - 38}" r="3.5" fill="#e53935"/>`
    + `<rect x="${x + L / 2 - 20}" y="${bottom - 46}" width="40" height="12" rx="2" fill="#fbeed2"/>`
    + `<text x="${x + L / 2}" y="${bottom - 36.5}" text-anchor="middle" font-family="'Baloo 2', sans-serif" font-weight="800" font-size="10" fill="#2d323c">BUBU</text>`
    + `</g>`;
}

/**
 * The whole train, long, in the colours of the game's train: the red
 * electric engine with Bubu, then five blue coaches full of children.
 */
function train() {
  const L = 240;
  const gap = 12;
  const engineX = 960;
  const kids = [['#5b3a26', '#ff8a3d'], ['#f2c14e', '#7e57c2'], ['#2b2f38', '#26a69a'], ['#c0612b', '#ec407a'], ['#3b2617', '#42a5f5'], ['#f2c14e', '#43a047'], ['#2b2f38', '#ffcf3f']];
  let coaches = '';
  let joints = '';
  for (let i = 0; i < 5; i++) {
    const x = engineX - gap - (i + 1) * L - i * gap;
    /** @type {Array<[string, string] | null>} */
    const people = [];
    for (let k = 0; k < 6; k++) people.push((i + k) % 3 === 1 ? null : /** @type {[string, string]} */ (kids[(i * 2 + k) % kids.length]));
    coaches += coach(x, L, people);
    joints += `<rect x="${x + L - 2}" y="${RAIL - 140}" width="${gap + 4}" height="86" rx="3" fill="#2d323c"/>`;
  }
  return trainDefs() + joints + coaches + locomotive(engineX);
}

/* ---------------------------------------------------------------------------
 * The seasons
 * ------------------------------------------------------------------------ */

/**
 * What a season adds to the landscape, layer by layer.
 * @typedef {object} SeasonThings
 * @property {(p: Palette) => string} sky         in the sky, behind the mountains (clouds ...)
 * @property {(p: Palette) => string} fields      between the village and the railway
 * @property {(p: Palette) => string} foreground  in front of everything (children, flowers ...)
 */

/** @type {Record<string, SeasonThings>} */
const THINGS = {
  summer: {
    sky: () => {
      const cloud = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ s) =>
        `<g fill="#fff"><ellipse cx="${x}" cy="${y}" rx="${70 * s}" ry="${24 * s}"/><circle cx="${x - 28 * s}" cy="${y - 14 * s}" r="${26 * s}"/><circle cx="${x + 18 * s}" cy="${y - 22 * s}" r="${34 * s}"/></g>`;
      return cloud(700, 200, 0.8) + cloud(1380, 360, 1.1);
    },
    fields: () => {
      return '';
    },
    foreground: () => {
      const rnd = seeded(11);
      let out = flowers(rnd, 50, ['#e53935', '#ffffff', '#ffcf3f', '#5c6bc0'], 852, 90, LX0, LX1);
      // children right under the track, waving at the train
      out += child(430, 932, { shirt: '#26a69a', hair: '#c0612b', pose: 'up', s: 0.88 });
      out += child(560, 934, { shirt: '#ec407a', hair: '#5b3a26', pose: 'wave', girl: true, s: 0.88 });
      out += child(700, 932, { shirt: '#ffcf3f', hair: '#2b2f38', pose: 'wave', s: 0.88, flip: true });
      out += child(860, 934, { shirt: '#7e57c2', hair: '#f2c14e', pose: 'catch', girl: true, s: 0.88 });
      out += `<circle cx="860" cy="${r1(934 - 120 * 0.88)}" r="13" fill="#fff" stroke="#2b2f38" stroke-width="2.5"/><path d="M851 ${r1(934 - 126 * 0.88)} q9 5 18 0" stroke="#e53935" stroke-width="3" fill="none" stroke-linecap="round"/>`;
      out += child(1010, 932, { shirt: '#ff7043', hair: '#3b2617', pose: 'wave', s: 0.88 });
      out += child(1150, 934, { shirt: '#42a5f5', hair: '#5b3a26', pose: 'up', girl: true, s: 0.88, flip: true });
      return out;
    },
  },
};

/**
 * The scenery behind the journeys' cards (2000 × 700, x from -200 to 1800),
 * so the meadow is not empty: the cards stand in the middle, a few things
 * at the sides. The picture is as tall as the cards, so it is cut from the
 * top: everything stands low, on y 600–720.
 * @type {Record<string, (p: Palette) => string>}
 */
const GROUND = {
  summer: p => {
    const rnd = seeded(41);
    let out = flowers(rnd, 30, ['#e53935', '#ffffff', '#ffcf3f', '#5c6bc0'], 480, 210);
    // at the left a house with its tree, at the right a haystack with two sunflowers
    out += tree(-120, 660, 150, p) + house(10, 670, 1.5, '#b5452b', '#fdf8ee');
    out += haystack(1450, 670, 1.1) + sunflower(1580, 720, 190, -6) + sunflower(1625, 720, 160, 6);
    return out;
  },
};

/**
 * The scenery behind the journeys' cards, as SVG markup (fixed values only).
 * @param {Season} season
 */
export function ground(season) {
  const p = PALETTES[season] ?? PALETTES.summer;
  const draw = GROUND[season] ?? GROUND.summer;
  return `<svg viewBox="${X0} 0 ${X1 - X0} 700" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">${draw(p)}</svg>`;
}

/* ---------------------------------------------------------------------------
 * The picture
 * ------------------------------------------------------------------------ */

/**
 * The landscape of a season, as SVG markup (built only from the fixed values
 * above: no text from outside goes into it).
 * @param {Season} season
 */
export function landscape(season) {
  const p = PALETTES[season] ?? PALETTES.summer;
  const things = THINGS[season] ?? THINGS.summer;
  const rnd = seeded(3);

  // the mountains, with a lighter face on the sunny side of every peak
  const peaks = [[-600, 500], [-490, 420], [-380, 505], [-290, 430], [-200, 470], [-90, 420], [0, 520], [110, 440], [190, 490], [330, 380], [450, 470], [560, 420], [690, 500], [820, 400], [930, 455], [1040, 360], [1180, 470], [1290, 410], [1420, 480], [1520, 420], [1600, 450], [1700, 390], [1800, 470], [1900, 400], [2000, 490], [2100, 420], [2200, 480]];
  const mountains = `M${LX0} 660 ${peaks.map(([x, y]) => `L${x} ${y}`).join(' ')} L${LX1} 660Z`;
  let faces = '';
  for (let i = 1; i < peaks.length - 1; i += 2) {
    const [px, py] = peaks[i];
    const [vx, vy] = peaks[i + 1];
    faces += `M${px} ${py} L${r1(px + (vx - px) * 0.75)} ${r1(py + (vy - py) * 0.75)} L${px + 20} ${py + 140}Z `;
  }

  // the forest on the ridge in front of the mountains
  let forest = '';
  for (let x = LX0 - 10; x < LX1 + 20; x += 13 + rnd() * 8) {
    forest += fir(x, forestTop(x) + 12 + rnd() * 10, 34 + rnd() * 22, p.conifer);
  }

  return `
    <svg viewBox="${LX0} 0 ${LX1 - LX0} ${H - 50}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="land-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${p.sky[0]}"/><stop offset=".62" stop-color="${p.sky[1]}"/>
        </linearGradient>
        <linearGradient id="land-meadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${p.meadow}"/><stop offset=".75" stop-color="${p.meadowDark}"/>
        </linearGradient>
      </defs>
      <rect x="${LX0}" width="${LX1 - LX0}" height="${H}" fill="url(#land-sky)"/>
      <circle cx="1040" cy="300" r="105" fill="${p.sun}" opacity=".22"/>
      <circle cx="1040" cy="300" r="78" fill="${p.sun}" opacity=".35"/>
      <circle cx="1040" cy="300" r="56" fill="${p.sun}"/>
      ${things.sky(p)}
      <path d="${mountains}" fill="${p.mountains[0]}"/>
      <path d="${faces}" fill="${p.mountains[1]}"/>
      <path d="${ridge(forestTop, 720, LX0, LX1)}" fill="${p.mountains[2]}"/>
      ${forest}
      <path d="${ridge(villageTop, RAIL, LX0, LX1)}" fill="${p.hills[0]}"/>
      <path d="${ridge(x => villageTop(x) + 40, RAIL, LX0, LX1)}" fill="${p.hills[1]}"/>
      ${things.fields(p)}
      ${railway()}
      ${train()}
      <path d="M${LX0} ${RAIL + 44} H${LX1} V${H} H${LX0}Z" fill="url(#land-meadow)"/>
      ${things.foreground(p)}
    </svg>`;
}
