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

/** A wooden church with a tall spire (like those of Maramureș), base at (x, y). */
function church(/** @type {number} */ x, /** @type {number} */ y) {
  return `<g>`
    + `<rect x="${x - 42}" y="${y - 46}" width="84" height="46" fill="#8a5a3b"/>`
    + `<path d="M${x - 54} ${y - 40} L${x - 30} ${y - 82} L${x + 30} ${y - 82} L${x + 54} ${y - 40}Z" fill="#5b3a26"/>`
    + `<rect x="${x - 14}" y="${y - 118}" width="28" height="40" fill="#8a5a3b"/>`
    + `<path d="M${x - 20} ${y - 114} L${x} ${y - 210} L${x + 20} ${y - 114}Z" fill="#5b3a26"/>`
    + `<path d="M${x} ${y - 210} V${y - 232} M${x - 8} ${y - 224} H${x + 8}" stroke="#e8b923" stroke-width="4" stroke-linecap="round"/>`
    + `<rect x="${x - 8}" y="${y - 24}" width="16" height="24" rx="8" fill="#3b2617"/>`
    + `<rect x="${x - 6}" y="${y - 108}" width="12" height="16" rx="6" fill="#3b2617"/>`
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

/** A kite in the sky at (x, y), with its tail. */
function kite(/** @type {number} */ x, /** @type {number} */ y) {
  return `<g>`
    + `<path d="M${x} ${y + 52} q-18 26 4 46 q20 20 -4 48" stroke="#e53935" stroke-width="3" fill="none"/>`
    + `<path d="M${x - 10} ${y + 80} l20 6 M${x - 8} ${y + 112} l20 4" stroke="#ffcf3f" stroke-width="7" stroke-linecap="round"/>`
    + `<path d="M${x} ${y - 46} L${x + 34} ${y} L${x} ${y + 52} L${x - 34} ${y}Z" fill="#e53935"/>`
    + `<path d="M${x} ${y - 46} L${x + 34} ${y} L${x} ${y}Z M${x} ${y} L${x - 34} ${y} L${x} ${y + 52}Z" fill="#ffcf3f"/>`
    + `<path d="M${x} ${y - 46} V${y + 52} M${x - 34} ${y} H${x + 34}" stroke="#7a5235" stroke-width="2"/>`
    + `</g>`;
}

/* ---------------------------------------------------------------------------
 * The railway and the train
 * ------------------------------------------------------------------------ */

/** The track along the whole picture, on its embankment, with telegraph poles behind it. */
function railway() {
  let sleepers = '';
  for (let x = LX0 + 4; x < LX1; x += 20) sleepers += `<rect x="${x}" y="${RAIL + 4}" width="12" height="8" rx="2"/>`;
  let poles = '';
  let wires = '';
  const poleXs = [80, 300];
  for (const x of poleXs) {
    poles += `<path d="M${x} ${RAIL + 2} V${RAIL - 120} M${x - 16} ${RAIL - 110} H${x + 16}" stroke="#6b4a32" stroke-width="6" stroke-linecap="round"/>`;
  }
  for (let i = 0; i < poleXs.length - 1; i++) {
    const a = poleXs[i];
    const b = poleXs[i + 1];
    wires += `<path d="M${a - 14} ${RAIL - 112} Q${(a + b) / 2} ${RAIL - 88} ${b - 14} ${RAIL - 112} M${a + 14} ${RAIL - 112} Q${(a + b) / 2} ${RAIL - 88} ${b + 14} ${RAIL - 112}" stroke="#4a4f5a" stroke-width="1.6" fill="none"/>`;
  }
  return `<g>${wires}${poles}</g>`
    + `<path d="M${LX0} ${RAIL + 4} H${LX1} V${RAIL + 44} H${LX0}Z" fill="#a89580"/>`
    + `<path d="M${LX0} ${RAIL + 30} H${LX1} V${RAIL + 44} H${LX0}Z" fill="#8c7a66"/>`
    + `<g fill="#6b4a32">${sleepers}</g>`
    + `<rect x="${LX0}" y="${RAIL - 4}" width="${LX1 - LX0}" height="8" fill="#5b616c"/>`
    + `<rect x="${LX0}" y="${RAIL - 4}" width="${LX1 - LX0}" height="2.5" fill="#c8ced8"/>`;
}

/** The little station at the right. */
function station() {
  const x = 1440;
  const y = RAIL - 10;
  return `<g>`
    + `<rect x="${x - 150}" y="${y - 6}" width="300" height="12" fill="#b9b3a8"/>`
    + `<rect x="${x - 110}" y="${y - 96}" width="220" height="90" fill="#fdf1d6"/>`
    + `<path d="M${x - 130} ${y - 92} L${x - 90} ${y - 140} L${x + 90} ${y - 140} L${x + 130} ${y - 92}Z" fill="#b5452b"/>`
    + `<rect x="${x - 90}" y="${y - 76}" width="34" height="44" rx="4" fill="#3b6fb6" stroke="#fff" stroke-width="3"/>`
    + `<rect x="${x + 56}" y="${y - 76}" width="34" height="44" rx="4" fill="#3b6fb6" stroke="#fff" stroke-width="3"/>`
    + `<rect x="${x - 20}" y="${y - 70}" width="40" height="64" rx="4" fill="#8a5a3b"/>`
    + `<circle cx="${x}" cy="${y - 118}" r="13" fill="#fff" stroke="#2b2f38" stroke-width="3"/>`
    + `<path d="M${x} ${y - 118} V${y - 127} M${x} ${y - 118} H${x + 7}" stroke="#2b2f38" stroke-width="2.5" stroke-linecap="round"/>`
    + `</g>`;
}

/** The shading of the train (gradients, defined once). */
function trainDefs() {
  const v = (/** @type {string} */ id, /** @type {string[]} */ stops) =>
    `<linearGradient id="${id}" x1="0" y1="0" x2="0" y2="1">${stops.map((c, i) => `<stop offset="${r1(i / (stops.length - 1))}" stop-color="${c}"/>`).join('')}</linearGradient>`;
  return `<defs>`
    + v('tr-roof', ['#6b7480', '#3a4049'])
    + v('tr-glass', ['#eef8ff', '#bfdff2'])
    + v('tr-cab', ['#e2463f', '#c62d26', '#9c1f19'])
    + v('tr-boiler', ['#2f8a5e', '#1f6e4a', '#164f35', '#1f6e4a'])
    + v('tr-smokebox', ['#4a525c', '#2b3038', '#3a4049'])
    + v('tr-brass', ['#f7dc8c', '#d4a43c', '#a87a22'])
    + v('tr-steel', ['#e3e7ec', '#9aa3ad'])
    + v('tr-smoke', ['#ffffff', '#dfe7ef'])
    + `</defs>`;
}

/** A car wheel (small, solid, with its tyre), centred at (x, y). */
function carWheel(/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ r) {
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#2b3038"/>`
    + `<circle cx="${x}" cy="${y}" r="${r1(r * 0.72)}" fill="#59606b"/>`
    + `<circle cx="${x}" cy="${y}" r="${r1(r * 0.28)}" fill="#c8ced8"/>`;
}

/** A driving wheel of the engine, with fine spokes and a counterweight, centred at (x, y). */
function driveWheel(/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ r) {
  let spokes = '';
  for (let i = 0; i < 12; i++) {
    const a = (i * Math.PI) / 6;
    spokes += `M${r1(x + Math.cos(a) * r * 0.24)} ${r1(y + Math.sin(a) * r * 0.24)} L${r1(x + Math.cos(a) * r * 0.8)} ${r1(y + Math.sin(a) * r * 0.8)} `;
  }
  const cw = r * 0.8;
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="#2b3038"/>`
    + `<circle cx="${x}" cy="${y}" r="${r1(r * 0.84)}" fill="#b8261f"/>`
    + `<path d="${spokes}" stroke="#2b3038" stroke-width="2.4"/>`
    + `<path d="M${r1(x - cw * 0.87)} ${r1(y - cw * 0.5)} A${r1(cw)} ${r1(cw)} 0 0 1 ${r1(x + cw * 0.87)} ${r1(y - cw * 0.5)} Q${x} ${r1(y - cw * 0.2)} ${r1(x - cw * 0.87)} ${r1(y - cw * 0.5)}Z" fill="#8f1c16"/>`
    + `<circle cx="${x}" cy="${y}" r="${r1(r * 0.2)}" fill="url(#tr-steel)" stroke="#2b3038" stroke-width="1.5"/>`;
}

/** The steam engine, its cab's left side at x (it goes to the right). */
function engine(/** @type {number} */ x) {
  const X = (/** @type {number} */ dx) => r1(x + dx);
  const Y = (/** @type {number} */ dy) => r1(RAIL - dy);
  return `<g>`
    // wheels and frame
    + carWheel(X(36), RAIL - 17, 17)
    + carWheel(X(226), RAIL - 14, 14)
    + `<rect x="${X(10)}" y="${Y(52)}" width="232" height="14" rx="3" fill="#2b3038"/>`
    + driveWheel(X(104), RAIL - 30, 30)
    + driveWheel(X(170), RAIL - 30, 30)
    // cylinder, rods
    + `<rect x="${X(196)}" y="${Y(66)}" width="48" height="24" rx="5" fill="#3a4049"/><rect x="${X(196)}" y="${Y(62)}" width="48" height="4" fill="#6b7480"/>`
    + `<path d="M${X(170)} ${Y(18)} L${X(208)} ${Y(52)}" stroke="url(#tr-steel)" stroke-width="6" stroke-linecap="round"/>`
    + `<rect x="${X(100)}" y="${Y(21)}" width="74" height="6" rx="3" fill="url(#tr-steel)" stroke="#59606b" stroke-width="1"/>`
    + `<circle cx="${X(104)}" cy="${Y(18)}" r="3.5" fill="#2b3038"/><circle cx="${X(170)}" cy="${Y(18)}" r="3.5" fill="#2b3038"/>`
    // running board with its red valance
    + `<rect x="${X(76)}" y="${Y(76)}" width="170" height="6" fill="#2b3038"/>`
    + `<rect x="${X(76)}" y="${Y(70)}" width="170" height="6" fill="#b8261f"/>`
    // boiler with brass bands and a handrail
    + `<rect x="${X(80)}" y="${Y(138)}" width="138" height="62" fill="url(#tr-boiler)"/>`
    + [104, 140, 178].map(d => `<rect x="${X(d)}" y="${Y(138)}" width="4" height="62" fill="url(#tr-brass)"/>`).join('')
    + `<path d="M${X(84)} ${Y(120)} H${X(214)}" stroke="#d4a43c" stroke-width="2"/>`
    // domes and chimney
    + `<path d="M${X(116)} ${Y(137)} Q${X(116)} ${Y(152)} ${X(124)} ${Y(152)} Q${X(132)} ${Y(152)} ${X(132)} ${Y(137)}Z" fill="url(#tr-boiler)"/>`
    + `<path d="M${X(148)} ${Y(137)} Q${X(148)} ${Y(162)} ${X(160)} ${Y(162)} Q${X(172)} ${Y(162)} ${X(172)} ${Y(137)}Z" fill="url(#tr-brass)"/>`
    + `<path d="M${X(212)} ${Y(140)} L${X(214)} ${Y(170)} L${X(207)} ${Y(180)} H${X(237)} L${X(230)} ${Y(170)} L${X(232)} ${Y(140)}Z" fill="url(#tr-smokebox)"/>`
    + `<rect x="${X(206)}" y="${Y(184)}" width="32" height="6" rx="2" fill="url(#tr-brass)"/>`
    // smokebox, its door and the lamp
    + `<rect x="${X(214)}" y="${Y(142)}" width="30" height="68" rx="4" fill="url(#tr-smokebox)"/>`
    + `<ellipse cx="${X(244)}" cy="${Y(108)}" rx="5" ry="32" fill="#2b3038"/>`
    + `<rect x="${X(236)}" y="${Y(158)}" width="14" height="14" rx="3" fill="#2b3038"/><circle cx="${X(249)}" cy="${Y(151)}" r="5" fill="#fff4b0"/>`
    // buffer beam and pilot
    + `<rect x="${X(240)}" y="${Y(68)}" width="12" height="18" fill="#b8261f"/><rect x="${X(252)}" y="${Y(64)}" width="8" height="8" rx="2" fill="#59606b"/>`
    + `<path d="M${X(240)} ${Y(50)} L${X(262)} ${Y(6)} H${X(222)} L${X(232)} ${Y(50)}Z" fill="#3a4049"/>`
    + `<path d="M${X(238)} ${Y(46)} L${X(232)} ${Y(8)} M${X(246)} ${Y(40)} L${X(244)} ${Y(8)} M${X(254)} ${Y(24)} L${X(254)} ${Y(8)}" stroke="#2b3038" stroke-width="2"/>`
    // the cab, with Bubu at the window
    + `<rect x="${X(0)}" y="${Y(172)}" width="84" height="118" rx="3" fill="url(#tr-cab)"/>`
    + `<rect x="${X(8)}" y="${Y(102)}" width="68" height="34" rx="3" fill="none" stroke="#f0c75e" stroke-width="2"/>`
    + `<svg x="${X(14)}" y="${Y(156)}" width="48" height="44"><rect width="48" height="44" fill="url(#tr-glass)"/><image href="shared/assets/bubu.webp" x="-2" y="1" width="52" height="52"/></svg>`
    + `<rect x="${X(14)}" y="${Y(156)}" width="48" height="44" rx="4" fill="none" stroke="#7a1a15" stroke-width="3"/>`
    + `<path d="M${X(-8)} ${Y(170)} Q${X(-6)} ${Y(186)} ${X(12)} ${Y(186)} H${X(76)} Q${X(94)} ${Y(186)} ${X(94)} ${Y(170)}Z" fill="url(#tr-roof)"/>`
    + `<rect x="${X(0)}" y="${Y(60)}" width="84" height="6" fill="#2b3038"/>`
    + `</g>`;
}

/** The steam of the engine, left behind it (still, like in a photo). */
function smoke(/** @type {number} */ x) {
  const puffs = [[222, 194, 16, 12], [200, 204, 21, 15], [170, 210, 25, 16], [134, 212, 25, 15], [100, 210, 20, 12]];
  return `<g fill="url(#tr-smoke)" opacity=".9">${puffs.map(([dx, dy, rx, ry]) => `<ellipse cx="${x + dx}" cy="${RAIL - dy}" rx="${rx}" ry="${ry}"/>`).join('')}</g>`;
}

/**
 * The engine with Bubu, at the left of the village (on wide screens it goes
 * further left, see .land-engine in home/home.css), so the village shows.
 */
function train() {
  const x = 500;
  return trainDefs() + `<g class="land-engine">${smoke(x)}${engine(x)}</g>`;
}

/* ---------------------------------------------------------------------------
 * The seasons
 * ------------------------------------------------------------------------ */

/**
 * What a season adds to the landscape, layer by layer.
 * @typedef {object} SeasonThings
 * @property {(p: Palette) => string} sky         in the sky, behind the mountains (clouds ...)
 * @property {(p: Palette) => string} fields      between the village and the railway
 * @property {(p: Palette) => string} foreground  in front of everything (children, flowers, a kite ...)
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
      // haystacks on the field under the village
      let out = haystack(640, 756, 0.5) + haystack(720, 762, 0.45);
      return out;
    },
    foreground: () => {
      const rnd = seeded(11);
      let out = flowers(rnd, 50, ['#e53935', '#ffffff', '#ffcf3f', '#5c6bc0'], 850, 120, LX0, LX1);
      // a boy with a kite, at the right (its string goes up past the station)
      out += kite(1400, 450) + `<path d="M1404 858 Q1380 700 1400 502" stroke="#fff" stroke-width="2" fill="none"/>`;
      out += child(1382, 975, { shirt: '#26a69a', hair: '#c0612b', pose: 'up', s: 1.1 });
      // a girl waving at the train
      out += child(700, 960, { shirt: '#ec407a', hair: '#5b3a26', pose: 'wave', girl: true, s: 1.05 });
      // a boy kicking a ball
      out += child(900, 965, { shirt: '#ff7043', hair: '#2b2f38', pose: 'kick', s: 1.05 });
      out += `<circle cx="985" cy="925" r="17" fill="#fff" stroke="#2b2f38" stroke-width="3"/><path d="M973 917 q12 6 24 0 M978 937 q8 -10 16 -2" stroke="#e53935" stroke-width="4" fill="none" stroke-linecap="round"/>`;
      // a big haystack and two tall sunflowers at the right
      out += haystack(1540, 935, 1.05);
      out += sunflower(1160, H + 10, 165, -6) + sunflower(1200, H + 10, 135, 6);
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

  // the village on its hill: houses, trees and the wooden church in the middle
  const roofs = ['#b5452b', '#8f3a24', '#c0612b'];
  let village = '';
  const homes = [-420, -260, 500, 640, 990, 1130, 1880, 2040];
  for (const [i, x] of homes.entries()) {
    village += tree(x - 40, villageTop(x - 40) + 24, 62 + rnd() * 20, p);
    village += house(x, villageTop(x) + 26, 0.9 + rnd() * 0.25, roofs[i % roofs.length], '#fdf8ee');
  }
  village += church(810, villageTop(810) + 22) + tree(1230, villageTop(1230) + 30, 80, p)
    + tree(-60, villageTop(-60) + 30, 78, p) + tree(1690, villageTop(1690) + 30, 84, p);

  return `
    <svg viewBox="${LX0} 0 ${LX1 - LX0} ${H - 30}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
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
      ${village}
      ${railway()}
      ${station()}
      ${train()}
      <path d="M${LX0} ${RAIL + 44} H${LX1} V${H} H${LX0}Z" fill="url(#land-meadow)"/>
      ${things.foreground(p)}
    </svg>`;
}
