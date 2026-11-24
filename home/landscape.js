/**
 * @file The big landscape at the top of the home page: a train passing
 * through a Romanian village, with hills, forests and mountains behind it
 * and children playing in front. The same landscape is drawn in the colours
 * and with the things of the season home/season.js chose.
 *
 * It is one SVG, drawn once and never again: nothing moves on the home page.
 *
 * The picture is 1600 × 1000 and is cut to fit the screen (the bottom is
 * always shown): on a tall phone only the middle (x 500–1100) is seen, on a
 * wide screen the top of the sky is cut away. So the train, the children
 * and the season's main things stay in the middle and in the lower part.
 */

/** @typedef {'winter' | 'spring' | 'summer' | 'autumn'} Season */

const W = 1600;
const H = 1000;
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
function ridge(/** @type {(x: number) => number} */ top, /** @type {number} */ bottom, step = 20) {
  let d = `M0 ${bottom} L0 ${r1(top(0))}`;
  for (let x = step; x <= W; x += step) d += ` L${x} ${r1(top(x))}`;
  return `${d} L${W} ${bottom}Z`;
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

/** A child's head and waving hand in a train window centred at (x, y). */
function passenger(/** @type {number} */ x, /** @type {number} */ y, /** @type {string} */ hair, /** @type {string} */ shirt, wave = false) {
  return `<g>`
    + `<rect x="${x - 10}" y="${y + 4}" width="20" height="12" rx="5" fill="${shirt}"/>`
    + `<circle cx="${x}" cy="${y - 2}" r="9" fill="#f6c9a0"/>`
    + `<path d="M${x - 9} ${y - 2} A9 9 0 0 1 ${x + 9} ${y - 2} Q${x} ${y - 6} ${x - 9} ${y - 2}Z" fill="${hair}"/>`
    + (wave ? `<path d="M${x + 9} ${y + 8} L${x + 20} ${y - 14}" stroke="#f6c9a0" stroke-width="6" stroke-linecap="round"/>` : '')
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
function flowers(/** @type {() => number} */ rnd, /** @type {number} */ count, /** @type {string[]} */ colors) {
  let out = '';
  for (let i = 0; i < count; i++) {
    const x = rnd() * W;
    const y = 850 + rnd() * 145;
    const k = 0.6 + (y - 850) / 145;           // bigger in front
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
  for (let x = 4; x < W; x += 20) sleepers += `<rect x="${x}" y="${RAIL + 4}" width="12" height="8" rx="2"/>`;
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
    + `<path d="M0 ${RAIL + 4} H${W} V${RAIL + 44} H0Z" fill="#a89580"/>`
    + `<path d="M0 ${RAIL + 30} H${W} V${RAIL + 44} H0Z" fill="#8c7a66"/>`
    + `<g fill="#6b4a32">${sleepers}</g>`
    + `<rect x="0" y="${RAIL - 4}" width="${W}" height="8" fill="#5b616c"/>`
    + `<rect x="0" y="${RAIL - 4}" width="${W}" height="2.5" fill="#c8ced8"/>`;
}

/** The little station at the right, with its name board. */
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
    + `<rect x="${x - 76}" y="${y - 176}" width="152" height="30" rx="6" fill="#1f4f9c" stroke="#fff" stroke-width="3"/>`
    + `<path d="M${x - 50} ${y - 146} V${y - 140} M${x + 50} ${y - 146} V${y - 140}" stroke="#2b2f38" stroke-width="4"/>`
    + `<text x="${x}" y="${y - 154}" text-anchor="middle" font-family="'Baloo 2', sans-serif" font-weight="800" font-size="20" fill="#fff">BUBULEȘTI</text>`
    + `</g>`;
}

/** A wheel with spokes, centred at (x, y). */
function wheel(/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ r, /** @type {string} */ color) {
  let spokes = '';
  for (let i = 0; i < 4; i++) {
    const a = (i * Math.PI) / 4;
    spokes += `M${r1(x - Math.cos(a) * r * 0.8)} ${r1(y - Math.sin(a) * r * 0.8)} L${r1(x + Math.cos(a) * r * 0.8)} ${r1(y + Math.sin(a) * r * 0.8)} `;
  }
  return `<circle cx="${x}" cy="${y}" r="${r}" fill="${color}" stroke="#2b2f38" stroke-width="5"/>`
    + `<path d="${spokes}" stroke="#2b2f38" stroke-width="3"/>`
    + `<circle cx="${x}" cy="${y}" r="${r1(r * 0.25)}" fill="#ffcf3f" stroke="#2b2f38" stroke-width="2"/>`;
}

/** A passenger car whose left end is at x. */
function car(/** @type {number} */ x, /** @type {number} */ w, /** @type {string} */ body, /** @type {string} */ roof, /** @type {string} */ people) {
  let windows = '';
  const n = 3;
  const gap = (w - n * 34) / (n + 1);
  for (let i = 0; i < n; i++) {
    windows += `<rect x="${r1(x + gap + i * (34 + gap))}" y="${RAIL - 124}" width="34" height="32" rx="6" fill="#d7efff"/>`;
  }
  return `<g>`
    + `<rect x="${x + 18}" y="${RAIL - 44}" width="${w - 36}" height="16" rx="4" fill="#2b2f38"/>`
    + `<rect x="${x}" y="${RAIL - 138}" width="${w}" height="84" rx="10" fill="${body}"/>`
    + `<rect x="${x - 4}" y="${RAIL - 150}" width="${w + 8}" height="18" rx="9" fill="${roof}"/>`
    + `<rect x="${x}" y="${RAIL - 80}" width="${w}" height="7" fill="#fdf1d6"/>`
    + windows
    + people
    + wheel(x + 30, RAIL - 16, 16, '#4a4f5a')
    + wheel(x + w - 30, RAIL - 16, 16, '#4a4f5a')
    + `</g>`;
}

/** The steam engine, its cab's left side at x (it goes to the right). */
function engine(/** @type {number} */ x) {
  const X = (/** @type {number} */ dx) => x + dx;
  const Y = (/** @type {number} */ dy) => RAIL - dy;
  return `<g>`
    + `<rect x="${X(0)}" y="${Y(64)}" width="232" height="18" rx="4" fill="#2b2f38"/>`
    + `<rect x="${X(70)}" y="${Y(120)}" width="160" height="60" rx="28" fill="#1f6e4a"/>`
    + `<rect x="${X(112)}" y="${Y(120)}" width="8" height="60" fill="#ffcf3f"/>`
    + `<rect x="${X(162)}" y="${Y(120)}" width="8" height="60" fill="#ffcf3f"/>`
    + `<path d="M${X(130)} ${Y(118)} a18 18 0 0 1 36 0Z" fill="#ffcf3f"/>`
    + `<rect x="${X(182)}" y="${Y(160)}" width="26" height="44" fill="#263238"/>`
    + `<rect x="${X(175)}" y="${Y(170)}" width="40" height="15" rx="5" fill="#263238"/>`
    + `<circle cx="${X(228)}" cy="${Y(90)}" r="30" fill="#263238"/>`
    + `<circle cx="${X(234)}" cy="${Y(110)}" r="10" fill="#fff6b0" stroke="#2b2f38" stroke-width="3"/>`
    + `<path d="M${X(230)} ${Y(64)} L${X(258)} ${Y(4)} L${X(222)} ${Y(4)}Z" fill="#d8382f" stroke="#2b2f38" stroke-width="3" stroke-linejoin="round"/>`
    + `<rect x="${X(-4)}" y="${Y(168)}" width="92" height="120" rx="8" fill="#d8382f"/>`
    + `<rect x="${X(-16)}" y="${Y(182)}" width="116" height="20" rx="8" fill="#8f231d"/>`
    + `<rect x="${X(12)}" y="${Y(150)}" width="60" height="50" rx="10" fill="#d7efff"/>`
    + `<image href="shared/assets/bubu.webp" x="${X(10)}" y="${Y(158)}" width="64" height="64" clip-path="url(#cab-window)"/>`
    + `<rect x="${X(12)}" y="${Y(150)}" width="60" height="50" rx="10" fill="none" stroke="#fff" stroke-width="4"/>`
    + `<rect x="${X(-4)}" y="${Y(80)}" width="92" height="8" fill="#ffcf3f"/>`
    + `<rect x="${X(130)}" y="${Y(36)}" width="78" height="8" rx="4" fill="#9aa3ad" stroke="#2b2f38" stroke-width="2"/>`
    + wheel(X(36), RAIL - 22, 22, '#c62828')
    + wheel(X(134), RAIL - 32, 32, '#c62828')
    + wheel(X(204), RAIL - 32, 32, '#c62828')
    + `<rect x="${X(130)}" y="${Y(36)}" width="78" height="8" rx="4" fill="#9aa3ad" stroke="#2b2f38" stroke-width="2"/>`
    + `</g>`
    + `<defs><clipPath id="cab-window"><rect x="${X(12)}" y="${Y(150)}" width="60" height="50" rx="10"/></clipPath></defs>`;
}

/** The smoke of the engine, left behind it (still, like in a photo). */
function smoke(/** @type {number} */ x) {
  const puffs = [[195, 190, 20], [168, 210, 24], [130, 224, 27], [88, 232, 24]];
  return `<g fill="#ffffff" opacity=".92">${puffs.map(([dx, dy, r]) => `<circle cx="${x + dx}" cy="${RAIL - dy}" r="${r}"/>`).join('')}</g>`
    + `<g fill="#e3ecf5">${puffs.map(([dx, dy, r]) => `<circle cx="${x + dx + r * 0.25}" cy="${RAIL - dy + r * 0.35}" r="${r1(r * 0.55)}"/>`).join('')}</g>`;
}

/** The whole train: two cars full of children and the engine with Bubu, in the middle of the picture. */
function train() {
  const carW = 150;
  const left = 508;
  const enginex = left + 2 * (carW + 12) + 4;
  const p1 = passenger(left + 30, RAIL - 108, '#5b3a26', '#ff8a3d') + passenger(left + 75, RAIL - 108, '#f2c14e', '#7e57c2', true) + passenger(left + 120, RAIL - 108, '#2b2f38', '#26a69a');
  const p2 = passenger(left + carW + 12 + 30, RAIL - 108, '#c0612b', '#ec407a', true) + passenger(left + carW + 12 + 120, RAIL - 108, '#3b2617', '#42a5f5', true);
  return smoke(enginex)
    + `<path d="M${left + carW - 4} ${RAIL - 62} h20 M${left + 2 * carW + 8} ${RAIL - 62} h20" stroke="#2b2f38" stroke-width="7"/>`
    + car(left, carW, '#2e7d4f', '#1d4f33', p1)
    + car(left + carW + 12, carW, '#2e7d4f', '#1d4f33', p2)
    + engine(enginex);
}

/* ---------------------------------------------------------------------------
 * The seasons
 * ------------------------------------------------------------------------ */

/**
 * What a season adds to the landscape, layer by layer.
 * @typedef {object} SeasonThings
 * @property {(p: Palette) => string} sky         in the sky, behind the mountains (clouds, birds ...)
 * @property {(p: Palette) => string} fields      between the village and the railway
 * @property {(p: Palette) => string} foreground  in front of everything (children, flowers, a kite ...)
 */

/** @type {Record<string, SeasonThings>} */
const THINGS = {
  summer: {
    sky: () => {
      const cloud = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ s) =>
        `<g fill="#fff"><ellipse cx="${x}" cy="${y}" rx="${70 * s}" ry="${24 * s}"/><circle cx="${x - 28 * s}" cy="${y - 14 * s}" r="${26 * s}"/><circle cx="${x + 18 * s}" cy="${y - 22 * s}" r="${34 * s}"/></g>`;
      const bird = (/** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ s) =>
        `<path d="M${x - 14 * s} ${y - 6 * s} Q${x - 6 * s} ${y - 10 * s} ${x} ${y} Q${x + 6 * s} ${y - 10 * s} ${x + 14 * s} ${y - 6 * s}" stroke="#2b3a55" stroke-width="${3 * s}" fill="none" stroke-linecap="round"/>`;
      return cloud(240, 440, 1) + cloud(700, 200, 0.8) + cloud(1380, 360, 1.1)
        + bird(560, 330, 1.2) + bird(610, 350, 0.9);
    },
    fields: () => {
      // wheat (gold, with its rows) and a mown field
      const strips = [
        { x0: 0, x1: 330, fill: '#9bd36f' },
        { x0: 330, x1: 560, fill: '#f0c64a', rows: '#d9a72f' },
        { x0: 560, x1: 760, fill: '#c9dc74' },
        { x0: 760, x1: 1000, fill: '#f0c64a', rows: '#d9a72f' },
        { x0: 1000, x1: 1600, fill: '#9bd36f' },
      ];
      const top = (/** @type {number} */ x) => villageTop(x) + 40;
      let out = '';
      for (const s of strips) {
        out += `<path d="M${s.x0} ${RAIL} L${s.x0} ${r1(top(s.x0))} L${s.x1} ${r1(top(s.x1))} L${s.x1} ${RAIL}Z" fill="${s.fill}"/>`;
        if (s.rows) {
          for (let y = 0; y < 6; y++) {
            const yy = r1(top(s.x0) + 14 + y * 18);
            out += `<path d="M${s.x0 + 6} ${yy} L${s.x1 - 6} ${r1(yy + top(s.x1) - top(s.x0))}" stroke="${s.rows}" stroke-width="3"/>`;
          }
        }
      }
      return out;
    },
    foreground: () => {
      const rnd = seeded(11);
      let out = flowers(rnd, 30, ['#e53935', '#ffffff', '#ffcf3f', '#5c6bc0']);
      // a boy with a kite (its string goes up to the kite in the sky, left of the train)
      out += kite(330, 450) + `<path d="M457 858 Q380 700 330 502" stroke="#fff" stroke-width="2" fill="none"/>`;
      out += child(435, 975, { shirt: '#26a69a', hair: '#c0612b', pose: 'up', s: 1.1 });
      // a girl waving at the train
      out += child(700, 960, { shirt: '#ec407a', hair: '#5b3a26', pose: 'wave', girl: true, s: 1.05 });
      // a boy kicking a ball
      out += child(900, 965, { shirt: '#ff7043', hair: '#2b2f38', pose: 'kick', s: 1.05 });
      out += `<circle cx="985" cy="925" r="17" fill="#fff" stroke="#2b2f38" stroke-width="3"/><path d="M973 917 q12 6 24 0 M978 937 q8 -10 16 -2" stroke="#e53935" stroke-width="4" fill="none" stroke-linecap="round"/>`;
      // two tall sunflowers at the right
      out += sunflower(1110, H + 10, 180, -6) + sunflower(1150, H + 10, 150, 6);
      return out;
    },
  },
};

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
  const peaks = [[0, 520], [110, 440], [190, 490], [330, 380], [450, 470], [560, 420], [690, 500], [820, 400], [930, 455], [1040, 360], [1180, 470], [1290, 410], [1420, 480], [1520, 420], [1600, 450]];
  const mountains = `M0 660 ${peaks.map(([x, y]) => `L${x} ${y}`).join(' ')} L${W} 660Z`;
  let faces = '';
  for (let i = 1; i < peaks.length - 1; i += 2) {
    const [px, py] = peaks[i];
    const [vx, vy] = peaks[i + 1];
    faces += `M${px} ${py} L${r1(px + (vx - px) * 0.75)} ${r1(py + (vy - py) * 0.75)} L${px + 20} ${py + 140}Z `;
  }

  // the forest on the ridge in front of the mountains
  let forest = '';
  for (let x = -10; x < W + 20; x += 13 + rnd() * 8) {
    forest += fir(x, forestTop(x) + 12 + rnd() * 10, 34 + rnd() * 22, p.conifer);
  }

  // the village on its hill: houses, trees and the wooden church in the middle
  const roofs = ['#b5452b', '#8f3a24', '#c0612b'];
  let village = '';
  const homes = [500, 640, 990, 1130];
  for (const [i, x] of homes.entries()) {
    village += tree(x - 40, villageTop(x - 40) + 24, 62 + rnd() * 20, p);
    village += house(x, villageTop(x) + 26, 0.9 + rnd() * 0.25, roofs[i % roofs.length], '#fdf8ee');
  }
  village += church(810, villageTop(810) + 22) + tree(1230, villageTop(1230) + 30, 80, p);

  return `
    <svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMax slice" aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="land-sky" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${p.sky[0]}"/><stop offset=".62" stop-color="${p.sky[1]}"/>
        </linearGradient>
        <linearGradient id="land-meadow" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stop-color="${p.meadow}"/><stop offset="1" stop-color="${p.meadowDark}"/>
        </linearGradient>
      </defs>
      <rect width="${W}" height="${H}" fill="url(#land-sky)"/>
      <circle cx="1040" cy="300" r="105" fill="${p.sun}" opacity=".22"/>
      <circle cx="1040" cy="300" r="78" fill="${p.sun}" opacity=".35"/>
      <circle cx="1040" cy="300" r="56" fill="${p.sun}"/>
      ${things.sky(p)}
      <path d="${mountains}" fill="${p.mountains[0]}"/>
      <path d="${faces}" fill="${p.mountains[1]}"/>
      <path d="${ridge(forestTop, 720)}" fill="${p.mountains[2]}"/>
      ${forest}
      <path d="${ridge(villageTop, RAIL)}" fill="${p.hills[0]}"/>
      <path d="${ridge(x => villageTop(x) + 40, RAIL)}" fill="${p.hills[1]}"/>
      ${things.fields(p)}
      ${village}
      ${railway()}
      ${station()}
      ${train()}
      <path d="M0 ${RAIL + 44} H${W} V${H} H0Z" fill="url(#land-meadow)"/>
      ${things.foreground(p)}
    </svg>`;
}
