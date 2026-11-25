/**
 * @file The decorations the child put on a locomotive in the depot, drawn
 * in car coordinates (x from 0 at the rear to `length` at the front, y = 0
 * on the rail, negative upwards), the same in the depot and on the journeys.
 *
 * The still parts (the garland with its baubles, the bow, the stickers)
 * are painted once with the body of the train; the string of lights is
 * drawn every frame, because it twinkles (and glows at night).
 */

import { TAU } from '../core/math.js';
import { drawBauble, drawGarland } from '../gfx/ornaments.js';
import { fillCircle, fillStar, glow } from '../gfx/shapes.js';
import { BAUBLE_SETS, LIGHT_SETS } from '../depot/style.js';

/**
 * Where the decorations go on a kind of locomotive.
 * @typedef {object} DecorLayout
 * @property {[number, number, number]} garland  from x, to x (from the front: length − x), at y
 * @property {[number, number, number]} lights   from x, to x (from the front), at y
 * @property {[number, number]} bow              x from the front, y
 * @property {Array<[number, number]>} stickers  centres, left to right
 * @property {number} stickerR                   radius of a sticker
 */

/** @type {Readonly<Record<string, (length: number) => DecorLayout>>} */
const LAYOUTS = Object.freeze({
  // the electric locomotive: roof at −182, stickers between the two doors, under the band
  electricLoco: L => ({
    garland: [22, 22, -174],
    lights: [26, 58, -192],
    bow: [30, -196],
    stickers: [[L * 0.35, -58], [L * 0.49, -58], [L * 0.63, -58]],
    stickerR: 17,
  }),
});

/** Distance between two hooks of the garland, and how far it sags. */
const HOOK_SPACING = 50;
const SAG = 6;
/** Radius of a bauble, and of a light bulb. */
const BAUBLE_R = 8;
const BULB_R = 4.2;
/** Distance between two bulbs. */
const BULB_SPACING = 21;

/**
 * Whether this kind of locomotive can be decorated.
 * @param {string} kind
 */
export const canDecorate = kind => kind in LAYOUTS;

/**
 * The bulbs of the string of lights, rear to front, in car coordinates
 * (none without lights).
 * @param {import('./specs.js').CarSpec} car
 * @param {import('../depot/style.js').LocoStyle | null} style
 * @returns {Array<{x: number, y: number}>}
 */
export function decorBulbs(car, style) {
  const layout = LAYOUTS[car.kind]?.(car.length);
  if (!layout || !style?.lights) return [];
  const [from, back, y] = layout.lights;
  const to = car.length - back;
  const n = Math.max(2, Math.round((to - from) / BULB_SPACING) + 1);
  const step = (to - from) / (n - 1);
  return Array.from({ length: n }, (_, i) => ({ x: from + i * step, y: y + (i % 2) * 4 }));
}

/**
 * The still decorations: garland and baubles, stickers and the bow.
 * @param {CanvasRenderingContext2D} c
 * @param {import('./specs.js').CarSpec} car
 * @param {import('../depot/style.js').LocoStyle | null} style
 */
export function paintDecor(c, car, style) {
  const layout = LAYOUTS[car.kind]?.(car.length);
  if (!layout || !style) return;
  const L = car.length;
  style.stickers.forEach((id, i) => {
    const at = layout.stickers[i];
    if (at) drawSticker(c, id, at[0], at[1], layout.stickerR);
  });
  const set = style.baubles ? BAUBLE_SETS[style.baubles] : null;
  if (set) {
    const [from, back, y] = layout.garland;
    const to = L - back;
    const n = Math.max(2, Math.round((to - from) / HOOK_SPACING) + 1);
    const step = (to - from) / (n - 1);
    const hooks = Array.from({ length: n }, (_, i) => ({ x: from + i * step, y }));
    drawGarland(c, hooks, SAG);
    for (let i = 0; i < n - 1; i++) {
      const x = hooks[i].x + step / 2;
      const by = y + SAG + 12;
      c.strokeStyle = '#c9a227';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(x, y + SAG);
      c.lineTo(x, by - BAUBLE_R);
      c.stroke();
      drawBauble(c, x, by, BAUBLE_R, set.colors[i % set.colors.length], false);
    }
  }
  if (style.bow) drawBow(c, L - layout.bow[0], layout.bow[1], style.bow);
}

/**
 * The string of lights: the wire and the bulbs; with `glowing`, the glow
 * around the lit bulbs (drawn on top of the night's tint).
 * @param {CanvasRenderingContext2D} c
 * @param {Array<{x: number, y: number}>} bulbs
 * @param {import('../depot/style.js').LocoStyle | null} style
 * @param {number} time   seconds (the bulbs twinkle)
 * @param {boolean} glowing
 */
export function drawDecorLights(c, bulbs, style, time, glowing) {
  const set = style?.lights ? LIGHT_SETS[style.lights] : null;
  if (!set || !bulbs.length) return;
  if (!glowing) {
    c.strokeStyle = '#2d3a2f';
    c.lineWidth = 1.5;
    c.beginPath();
    bulbs.forEach((b, i) => (i ? c.lineTo(b.x, b.y - BULB_R) : c.moveTo(b.x, b.y - BULB_R)));
    c.stroke();
  }
  const n = bulbs.length;
  bulbs.forEach((b, i) => {
    // twinkling softly, or (the chasing lights) a bright wave running to the front
    const on = set.chase
      ? 0.35 + 0.65 * Math.max(0, Math.cos(((i / n) * 3 - time * 1.6) * TAU)) ** 2
      : 0.6 + 0.4 * Math.sin(time * 3 + i * 1.7);
    const color = set.colors[i % set.colors.length];
    c.globalAlpha = glowing ? on : 1;
    if (glowing) glow(c, b.x, b.y, 13, 'rgba(255,240,180,0.55)', 'rgba(255,240,180,0)');
    c.fillStyle = color;
    fillCircle(c, b.x, b.y, BULB_R);
    if (!glowing) {
      c.fillStyle = 'rgba(255,255,255,0.6)';
      fillCircle(c, b.x - 1.3, b.y - 1.3, 1.3);
    }
  });
  c.globalAlpha = 1;
}

/**
 * A big ribbon bow: two loops, two tails and the knot.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x  centre of the knot
 * @param {number} y
 * @param {string} color
 */
export function drawBow(c, x, y, color) {
  c.save();
  c.lineJoin = 'round';
  c.strokeStyle = 'rgba(0,0,0,0.28)';
  c.lineWidth = 2;
  c.fillStyle = color;
  // the tails
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + s * 9, y + 20);
    c.lineTo(x + s * 4, y + 17);
    c.lineTo(x + s * 2, y + 22);
    c.closePath();
    c.fill();
    c.stroke();
  }
  // the loops
  for (const s of [-1, 1]) {
    c.beginPath();
    c.moveTo(x, y);
    c.bezierCurveTo(x + s * 10, y - 16, x + s * 26, y - 12, x + s * 22, y);
    c.bezierCurveTo(x + s * 26, y + 12, x + s * 10, y + 12, x, y);
    c.fill();
    c.stroke();
  }
  // shine on the loops and the knot
  c.fillStyle = 'rgba(255,255,255,0.35)';
  for (const s of [-1, 1]) {
    c.beginPath();
    c.ellipse(x + s * 13, y - 4, 5, 2.4, s * -0.4, 0, TAU);
    c.fill();
  }
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, y, 5.5, 6.5, 0, 0, TAU);
  c.fill();
  c.stroke();
  c.restore();
}

/**
 * A sticker: a white round backing with a thin edge, and its picture.
 * @param {CanvasRenderingContext2D} c
 * @param {string} id   a key of STICKERS
 * @param {number} x    centre
 * @param {number} y
 * @param {number} r    radius
 */
export function drawSticker(c, id, x, y, r) {
  c.save();
  c.fillStyle = 'rgba(0,0,0,0.18)';
  fillCircle(c, x + 1, y + 2, r);
  c.fillStyle = '#ffffff';
  fillCircle(c, x, y, r);
  c.strokeStyle = 'rgba(0,0,0,0.12)';
  c.lineWidth = 1;
  c.beginPath();
  c.arc(x, y, r - 0.5, 0, TAU);
  c.stroke();
  const s = r * 0.72;   // the picture, inside the backing
  c.lineCap = 'round';
  c.lineJoin = 'round';
  switch (id) {
    case 'star':
      c.fillStyle = '#ffc928';
      fillStar(c, x, y + s * 0.05, s, s * 0.45);
      break;
    case 'heart':
      c.fillStyle = '#e53935';
      c.beginPath();
      c.moveTo(x, y + s * 0.8);
      c.bezierCurveTo(x - s * 1.2, y - s * 0.1, x - s * 0.55, y - s * 0.95, x, y - s * 0.35);
      c.bezierCurveTo(x + s * 0.55, y - s * 0.95, x + s * 1.2, y - s * 0.1, x, y + s * 0.8);
      c.fill();
      break;
    case 'fir':
      c.fillStyle = '#6d4c41';
      c.fillRect(x - s * 0.12, y + s * 0.55, s * 0.24, s * 0.35);
      c.fillStyle = '#2e7d46';
      for (const [top, half, bottom] of [[-0.95, 0.42, -0.2], [-0.55, 0.6, 0.2], [-0.15, 0.78, 0.6]]) {
        c.beginPath();
        c.moveTo(x, y + top * s);
        c.lineTo(x + half * s, y + bottom * s);
        c.lineTo(x - half * s, y + bottom * s);
        c.closePath();
        c.fill();
      }
      c.fillStyle = '#ffc928';
      fillStar(c, x, y - s * 0.95, s * 0.22, s * 0.1);
      break;
    case 'snowflake':
      c.strokeStyle = '#42a5f5';
      c.lineWidth = Math.max(1.5, s * 0.14);
      c.beginPath();
      for (let k = 0; k < 6; k++) {
        const a = (k * TAU) / 6 - Math.PI / 2;
        const [cx, cy] = [Math.cos(a), Math.sin(a)];
        c.moveTo(x, y);
        c.lineTo(x + cx * s * 0.9, y + cy * s * 0.9);
        // two little branches halfway along every arm
        const [bx, by] = [x + cx * s * 0.5, y + cy * s * 0.5];
        for (const d of [-1, 1]) {
          const b = a + d * 0.7;
          c.moveTo(bx, by);
          c.lineTo(bx + Math.cos(b) * s * 0.3, by + Math.sin(b) * s * 0.3);
        }
      }
      c.stroke();
      break;
    case 'sun':
      c.strokeStyle = '#ffa000';
      c.lineWidth = Math.max(1.5, s * 0.14);
      c.beginPath();
      for (let k = 0; k < 8; k++) {
        const a = (k * TAU) / 8;
        c.moveTo(x + Math.cos(a) * s * 0.6, y + Math.sin(a) * s * 0.6);
        c.lineTo(x + Math.cos(a) * s * 0.92, y + Math.sin(a) * s * 0.92);
      }
      c.stroke();
      c.fillStyle = '#ffc928';
      fillCircle(c, x, y, s * 0.45);
      break;
    case 'moon':
      c.fillStyle = '#ffc928';
      c.beginPath();
      c.arc(x, y, s * 0.8, 0.35 * Math.PI, 1.65 * Math.PI);
      c.arc(x + s * 0.38, y - s * 0.1, s * 0.62, 1.5 * Math.PI, 0.5 * Math.PI, true);
      c.closePath();
      c.fill();
      break;
    case 'flower':
      c.fillStyle = '#ec407a';
      for (let k = 0; k < 5; k++) {
        const a = (k * TAU) / 5 - Math.PI / 2;
        fillCircle(c, x + Math.cos(a) * s * 0.48, y + Math.sin(a) * s * 0.48, s * 0.36);
      }
      c.fillStyle = '#ffc928';
      fillCircle(c, x, y, s * 0.3);
      break;
    case 'ladybug':
      c.fillStyle = '#1d1d24';
      fillCircle(c, x, y - s * 0.6, s * 0.36);
      c.fillStyle = '#e53935';
      fillCircle(c, x, y + s * 0.12, s * 0.72);
      c.fillStyle = '#1d1d24';
      c.fillRect(x - s * 0.05, y - s * 0.55, s * 0.1, s * 1.35);
      for (const [dx, dy] of [[-0.38, -0.12], [0.38, -0.12], [-0.34, 0.42], [0.34, 0.42]]) fillCircle(c, x + dx * s, y + dy * s, s * 0.14);
      break;
    default:
      break;
  }
  c.restore();
}
