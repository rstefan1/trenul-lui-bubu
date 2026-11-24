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

/** A butterfly flying at (x, y). */
function butterfly(/** @type {number} */ x, /** @type {number} */ y, /** @type {string} */ color) {
  return `<g>`
    + `<ellipse cx="${x - 11}" cy="${y - 8}" rx="12" ry="15" transform="rotate(-25 ${x - 11} ${y - 8})" fill="${color}"/>`
    + `<ellipse cx="${x + 11}" cy="${y - 8}" rx="12" ry="15" transform="rotate(25 ${x + 11} ${y - 8})" fill="${color}"/>`
    + `<ellipse cx="${x - 8}" cy="${y + 9}" rx="8" ry="9" fill="${color}" opacity=".85"/><ellipse cx="${x + 8}" cy="${y + 9}" rx="8" ry="9" fill="${color}" opacity=".85"/>`
    + `<circle cx="${x - 12}" cy="${y - 10}" r="4" fill="#fff" opacity=".7"/><circle cx="${x + 12}" cy="${y - 10}" r="4" fill="#fff" opacity=".7"/>`
    + `<rect x="${x - 2.5}" y="${y - 16}" width="5" height="32" rx="2.5" fill="#2b2f38"/>`
    + `<path d="M${x - 1} ${y - 15} q-6 -10 -10 -12 M${x + 1} ${y - 15} q6 -10 10 -12" stroke="#2b2f38" stroke-width="1.8" fill="none"/>`
    + `</g>`;
}

/** A slice of watermelon lying on the grass, its middle at (x, y). */
function watermelon(/** @type {number} */ x, /** @type {number} */ y) {
  let seeds = '';
  for (const [dx, dy] of [[-28, -12], [-12, -26], [8, -28], [26, -14], [-2, -12], [14, -18]]) seeds += `<ellipse cx="${x + dx}" cy="${y + dy}" rx="2.5" ry="4" fill="#2b2f38"/>`;
  return `<g>`
    + `<path d="M${x - 56} ${y} A56 56 0 0 1 ${x + 56} ${y}Z" fill="#3f8f34"/>`
    + `<path d="M${x - 50} ${y} A50 50 0 0 1 ${x + 50} ${y}Z" fill="#dff3b8"/>`
    + `<path d="M${x - 44} ${y} A44 44 0 0 1 ${x + 44} ${y}Z" fill="#ef4b4b"/>`
    + seeds
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

/** The track along the whole picture, on its embankment. */
function railway() {
  let sleepers = '';
  for (let x = LX0 + 4; x < LX1; x += 20) sleepers += `<rect x="${x}" y="${RAIL + 4}" width="12" height="8" rx="2"/>`;
  return `<path d="M${LX0} ${RAIL + 4} H${LX1} V${RAIL + 44} H${LX0}Z" fill="#a89580"/>`
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
    + v('tr-car', ['#e2463f', '#c62d26', '#9c1f19'])
    + v('tr-roof', ['#6b7480', '#3a4049'])
    + v('tr-glass', ['#eef8ff', '#bfdff2'])
    + v('tr-cab', ['#e2463f', '#c62d26', '#9c1f19'])
    + v('tr-boiler', ['#4a5363', '#2a3038', '#171b21', '#2a3038'])
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

/** A child's head and shoulders in a train window (drawn inside the window). */
function passenger(/** @type {number} */ w, /** @type {number} */ h, /** @type {string} */ hair, /** @type {string} */ shirt) {
  const cx = w / 2;
  return `<rect x="${cx - 9}" y="${h - 6}" width="18" height="10" rx="5" fill="${shirt}"/>`
    + `<circle cx="${cx}" cy="${h - 13}" r="7" fill="#f6c9a0"/>`
    + `<path d="M${cx - 7} ${h - 13} A7 7 0 0 1 ${cx + 7} ${h - 13} Q${cx} ${h - 16} ${cx - 7} ${h - 13}Z" fill="${hair}"/>`;
}

/**
 * A passenger car whose left end is at x.
 * @param {number} x
 * @param {number} w
 * @param {Array<[string, string] | null>} people  hair and shirt of the child in every window (null: empty)
 */
function car(x, w, people) {
  // low on its wheels, like a real car: the body ends just above the wheels
  const top = RAIL - 118;
  const bottom = RAIL - 30;
  const winW = 26;
  const winH = 24;
  const doorW = 14;
  const inner = w - 2 * (doorW + 8);
  const gap = (inner - people.length * winW) / (people.length + 1);
  let windows = '';
  people.forEach((who, i) => {
    const wx = r1(x + doorW + 8 + gap + i * (winW + gap));
    const wy = top + 14;
    windows += `<svg x="${wx}" y="${wy}" width="${winW}" height="${winH}"><rect width="${winW}" height="${winH}" fill="url(#tr-glass)"/>${who ? passenger(winW, winH, who[0], who[1]) : ''}<path d="M0 ${winH * 0.7} L${winW * 0.7} 0 H${winW} L0 ${winH}Z" fill="#fff" opacity=".18"/></svg>`
      + `<rect x="${wx}" y="${wy}" width="${winW}" height="${winH}" rx="3" fill="none" stroke="#6e1612" stroke-width="2.5"/>`;
  });
  const door = (/** @type {number} */ dx) =>
    `<rect x="${dx}" y="${top + 8}" width="${doorW}" height="${bottom - top - 10}" rx="2" fill="none" stroke="#6e1612" stroke-width="1.6"/>`
    + `<rect x="${dx + 3}" y="${top + 14}" width="${doorW - 6}" height="16" rx="2" fill="url(#tr-glass)" stroke="#6e1612" stroke-width="1.2"/>`;
  const bogie = (/** @type {number} */ bx) =>
    carWheel(bx - 16, RAIL - 13, 13) + carWheel(bx + 16, RAIL - 13, 13)
    + `<rect x="${bx - 30}" y="${RAIL - 19}" width="60" height="10" rx="3" fill="#3a4049"/>`
    + `<circle cx="${bx - 16}" cy="${RAIL - 13}" r="3" fill="#c8ced8"/><circle cx="${bx + 16}" cy="${RAIL - 13}" r="3" fill="#c8ced8"/>`;
  return `<g>`
    + bogie(x + 38) + bogie(x + w - 38)
    + `<rect x="${x - 6}" y="${bottom - 14}" width="8" height="6" rx="2" fill="#59606b"/><rect x="${x + w - 2}" y="${bottom - 14}" width="8" height="6" rx="2" fill="#59606b"/>`
    + `<rect x="${x}" y="${top}" width="${w}" height="${bottom - top}" rx="5" fill="url(#tr-car)"/>`
    + `<rect x="${x}" y="${top + 46}" width="${w}" height="3" fill="#f0c75e"/>`
    + `<rect x="${x}" y="${top + 52}" width="${w}" height="1.5" fill="#f0c75e" opacity=".7"/>`
    + `<rect x="${x}" y="${bottom - 6}" width="${w}" height="6" fill="#6e1612"/>`
    + door(x + 6) + door(x + w - 6 - doorW)
    + windows
    + `<path d="M${x - 3} ${top + 2} Q${x - 2} ${top - 12} ${x + 14} ${top - 13} H${x + w - 14} Q${x + w + 2} ${top - 12} ${x + w + 3} ${top + 2}Z" fill="url(#tr-roof)"/>`
    + `<rect x="${x + w * 0.3 - 7}" y="${top - 18}" width="14" height="6" rx="2" fill="#3a4049"/><rect x="${x + w * 0.7 - 7}" y="${top - 18}" width="14" height="6" rx="2" fill="#3a4049"/>`
    + `</g>`;
}

/** The coal tender behind the engine, its left end at x. */
function tender(/** @type {number} */ x) {
  const w = 66;
  const top = RAIL - 100;
  return `<g>`
    + carWheel(x + 17, RAIL - 13, 13) + carWheel(x + w - 17, RAIL - 13, 13)
    + `<rect x="${x + 2}" y="${RAIL - 19}" width="${w - 4}" height="10" rx="3" fill="#3a4049"/>`
    + `<path d="M${x + 6} ${top + 2} Q${x + 16} ${top - 14} ${x + 30} ${top - 8} Q${x + 44} ${top - 18} ${x + w - 6} ${top + 2}Z" fill="#2b2f38"/>`
    + `<rect x="${x}" y="${top}" width="${w}" height="${RAIL - 30 - top}" rx="4" fill="url(#tr-boiler)"/>`
    + `<rect x="${x + 7}" y="${top + 10}" width="${w - 14}" height="${RAIL - 54 - top}" rx="3" fill="none" stroke="#f0c75e" stroke-width="2"/>`
    + `<rect x="${x}" y="${RAIL - 38}" width="${w}" height="8" fill="#2b3038"/>`
    + `</g>`;
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
 * The whole train, long and bright on the green hills: four long red cars
 * full of children, the tender and the black steam engine with Bubu, going
 * to the right.
 */
function train() {
  const carW = 290;
  const engineX = 760;
  const tenderX = engineX - 72;
  const kids = [['#5b3a26', '#ff8a3d'], ['#f2c14e', '#7e57c2'], ['#2b2f38', '#26a69a'], ['#c0612b', '#ec407a'], ['#3b2617', '#42a5f5'], ['#f2c14e', '#43a047']];
  let cars = '';
  let couplers = `M${tenderX - 10} ${RAIL - 42} h10`;
  for (let i = 0; i < 4; i++) {
    const x = tenderX - 10 - (i + 1) * carW - i * 10;
    const who = [kids[(i * 2) % 6], i === 1 ? null : kids[(i * 2 + 1) % 6], kids[(i * 3 + 2) % 6], i === 2 ? null : kids[(i + 4) % 6], kids[(i + 1) % 6]];
    cars += car(x, carW, /** @type {Array<[string, string] | null>} */ (who));
    if (i < 3) couplers += ` M${x - 10} ${RAIL - 42} h10`;
  }
  return trainDefs()
    + smoke(engineX)
    + `<path d="${couplers}" stroke="#2b3038" stroke-width="6"/>`
    + cars
    + tender(tenderX)
    + engine(engineX);
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
      // children all along the line, right under the track, waving at the train:
      // in little groups, at uneven distances, some a little nearer (lower and bigger)
      const shirts = ['#26a69a', '#ec407a', '#ffcf3f', '#7e57c2', '#ff7043', '#42a5f5', '#43a047', '#e53935'];
      const hairs = ['#c0612b', '#5b3a26', '#2b2f38', '#f2c14e', '#3b2617'];
      const poses = /** @type {const} */ (['wave', 'up', 'wave', 'catch', 'wave', 'up', 'kick']);
      const kids = [];
      for (let x = LX0 + 60 + rnd() * 80; x < LX1 - 40;) {
        const group = 1 + Math.floor(rnd() * 3);                 // one, two or three together
        for (let k = 0; k < group && x < LX1 - 40; k++) {
          kids.push({ x, y: 922 + rnd() * 22 });
          x += 46 + rnd() * 40;                                  // close to each other in a group
        }
        x += 120 + rnd() * 260;                                  // then a gap
      }
      kids.sort((a, b) => a.y - b.y);                            // the nearer ones in front
      kids.forEach(({ x, y }, i) => {
        const k = Math.round(x * 7 + y) % 997;                   // the same child every time
        const pose = poses[k % poses.length];
        const sc = 0.8 + ((y - 922) / 22) * 0.14;
        out += child(r1(x), r1(y), { shirt: shirts[k % shirts.length], hair: hairs[(k >> 3) % hairs.length], pose, girl: k % 2 === 1, s: r1(sc * 100) / 100, flip: (k >> 2) % 2 === 1 });
        if (pose === 'catch') {
          out += `<circle cx="${r1(x)}" cy="${r1(y - 120 * sc)}" r="13" fill="#fff" stroke="#2b2f38" stroke-width="2.5"/><path d="M${r1(x - 9)} ${r1(y - 126 * sc)} q9 5 18 0" stroke="#e53935" stroke-width="3" fill="none" stroke-linecap="round"/>`;
        }
        if (pose === 'kick') {
          out += `<circle cx="${r1(x + 48 * sc * ((k >> 2) % 2 === 1 ? -1 : 1))}" cy="${r1(y - 10)}" r="11" fill="#fff" stroke="#2b2f38" stroke-width="2.5"/>`;
        }
      });
      return out;
    },
  },
};

/**
 * The scenery behind the journeys' cards (2000 × 700, x from -200 to 1800),
 * so the meadow is not empty: the cards stand in the middle, a few things
 * at the sides. The picture is as tall as the cards, so it is cut from the
 * top: everything stands low, between y 580 and 700.
 * @type {Record<string, (p: Palette) => string>}
 */
const GROUND = {
  summer: p => {
    const rnd = seeded(41);
    let out = flowers(rnd, 30, ['#e53935', '#ffffff', '#ffcf3f', '#5c6bc0'], 480, 210);
    // at the left sunflowers with butterflies, at the right a haystack and a slice of watermelon
    out += sunflower(-60, 712, 130, -5) + sunflower(-20, 712, 112, 4) + sunflower(20, 712, 136, 7);
    out += butterfly(120, 618, '#ff8a3d') + butterfly(-150, 600, '#42a5f5');
    out += haystack(1480, 692, 0.8) + watermelon(1630, 690) + butterfly(1720, 610, '#ec407a');
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
