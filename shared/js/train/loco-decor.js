/**
 * @file The decorations the child put on a locomotive in the depot, drawn
 * in car coordinates (x from 0 at the rear to `length` at the front, y = 0
 * on the rail, negative upwards), the same in the depot and on the
 * journeys: a pattern on the lower side, the plate with the child's name,
 * stickers, a little flag on the roof and a bow on the front. They do not
 * move, so they are painted once, with the body of the train.
 */

import { TAU } from '../core/math.js';
import { fillCircle, fillRoundRect, fillStar } from '../gfx/shapes.js';

/**
 * Where the decorations go on a kind of locomotive.
 * @typedef {object} DecorLayout
 * @property {[number, number, number, number]} pattern  the painted panel: x, y, width, height
 * @property {[number, number]} plate             centre of the name plate
 * @property {number} plateWidth                  the widest the plate may be
 * @property {Array<[number, number]>} stickers   centres, in the order they are filled
 * @property {number} stickerR                    radius of a sticker
 * @property {[number, number]} flag              foot of the flagpole (x from the front, y on the roof)
 * @property {[number, number]} bow               x from the front, y
 */

/** @type {Readonly<Record<string, (length: number) => DecorLayout>>} */
const LAYOUTS = Object.freeze({
  // the electric locomotive: the panel under the band, between the two
  // doors the plate; stickers beside it and on the grilles around the emblem
  electricLoco: L => ({
    pattern: [4, -84, L - 8, 48],
    plate: [L / 2, -58],
    plateWidth: 76,
    stickers: [[119, -134], [L - 98, -134], [84, -58], [L - 90, -58]],
    stickerR: 15,
    flag: [74, -198],
    bow: [30, -196],
  }),
});

/**
 * Whether this kind of locomotive can be decorated.
 * @param {string} kind
 */
export const canDecorate = kind => kind in LAYOUTS;

/**
 * The decorations of a locomotive.
 * @param {CanvasRenderingContext2D} c
 * @param {import('./specs.js').CarSpec} car   with the colours of the style already applied
 * @param {import('../depot/style.js').LocoStyle | null} style
 */
export function paintDecor(c, car, style) {
  const layout = LAYOUTS[car.kind]?.(car.length);
  if (!layout || !style) return;
  const L = car.length;
  if (style.pattern) drawPattern(c, style.pattern, layout.pattern, car.colors.body);
  if (style.name) drawPlate(c, style.name, layout.plate[0], layout.plate[1], layout.plateWidth);
  style.stickers.forEach((id, i) => {
    const at = layout.stickers[i];
    if (at) drawSticker(c, id, at[0], at[1], layout.stickerR);
  });
  if (style.flag) drawFlag(c, style.flag, L - layout.flag[0], layout.flag[1]);
  if (style.bow) drawBow(c, L - layout.bow[0], layout.bow[1], style.bow);
}

/**
 * How light a colour is (0 black … 1 white), to paint a pattern that shows on it.
 * @param {string} hex  #rrggbb
 */
function lightness(hex) {
  const n = parseInt(hex.slice(1), 16);
  return (0.299 * (n >> 16) + 0.587 * ((n >> 8) & 255) + 0.114 * (n & 255)) / 255;
}

/**
 * A pattern painted on a panel of the body: light on a dark body, dark on
 * a light one.
 * @param {CanvasRenderingContext2D} c
 * @param {string} id     a key of PATTERNS
 * @param {[number, number, number, number]} panel
 * @param {string} body   the colour of the body
 */
export function drawPattern(c, id, [x, y, w, h], body) {
  c.save();
  c.beginPath();
  c.rect(x, y, w, h);
  c.clip();
  const ink = lightness(body) > 0.7 ? 'rgba(40,30,20,0.22)' : 'rgba(255,255,255,0.42)';
  c.fillStyle = ink;
  c.strokeStyle = ink;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  switch (id) {
    case 'dots':
      for (let row = 0; row * 14 < h + 14; row++) {
        for (let col = 0; col * 18 < w + 18; col++) fillCircle(c, x + col * 18 + (row % 2) * 9, y + 6 + row * 14, 4);
      }
      break;
    case 'stripes':
      c.lineWidth = 7;
      c.beginPath();
      for (let i = -h; i < w + h; i += 20) {
        c.moveTo(x + i, y + h);
        c.lineTo(x + i + h, y);
      }
      c.stroke();
      break;
    case 'zigzag':
      c.lineWidth = 4;
      for (const row of [0.3, 0.75]) {
        c.beginPath();
        for (let i = 0, up = true; i <= w + 12; i += 12, up = !up) c.lineTo(x + i, y + h * row + (up ? -6 : 6));
        c.stroke();
      }
      break;
    case 'stars':
      for (let row = 0; row * 16 < h + 16; row++) {
        for (let col = 0; col * 22 < w + 22; col++) fillStar(c, x + col * 22 + (row % 2) * 11, y + 7 + row * 16, 6, 2.6);
      }
      break;
    case 'hearts':
      for (let row = 0; row * 16 < h + 16; row++) {
        for (let col = 0; col * 22 < w + 22; col++) heart(c, x + col * 22 + (row % 2) * 11, y + 7 + row * 16, 5.5);
      }
      break;
    default:
      break;
  }
  c.restore();
}

/**
 * A small heart, centred at (x, y).
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} s
 */
function heart(c, x, y, s) {
  c.beginPath();
  c.moveTo(x, y + s * 0.8);
  c.bezierCurveTo(x - s * 1.2, y - s * 0.1, x - s * 0.55, y - s * 0.95, x, y - s * 0.35);
  c.bezierCurveTo(x + s * 0.55, y - s * 0.95, x + s * 1.2, y - s * 0.1, x, y + s * 0.8);
  c.fill();
}

/**
 * The plate with the child's name, like the name plates of real
 * locomotives: cream, with a dark edge and dark letters; a long name is
 * written smaller, to fit.
 * @param {CanvasRenderingContext2D} c
 * @param {string} name
 * @param {number} x       centre
 * @param {number} y
 * @param {number} widest  the widest the plate may be
 */
export function drawPlate(c, name, x, y, widest) {
  c.save();
  let size = 16;
  const font = () => `800 ${size}px "Baloo 2", "Comic Sans MS", sans-serif`;
  c.font = font();
  while (size > 9 && c.measureText(name).width > widest - 14) {
    size -= 1;
    c.font = font();
  }
  const w = Math.min(widest, c.measureText(name).width + 16);
  const h = 22;
  fillRoundRect(c, x - w / 2 - 2, y - h / 2 - 2, w + 4, h + 4, 6, '#3a2a1a');
  fillRoundRect(c, x - w / 2, y - h / 2, w, h, 4, '#fbeed2');
  c.fillStyle = '#3a2a1a';
  for (const dx of [-w / 2 + 4, w / 2 - 4]) fillCircle(c, x + dx, y, 1.4);   // the two rivets
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(name, x, y + 1);
  c.restore();
}

/**
 * A little flag on a pole standing on the roof, waving towards the back.
 * @param {CanvasRenderingContext2D} c
 * @param {string} id   a key of FLAGS
 * @param {number} x    foot of the pole
 * @param {number} y
 */
export function drawFlag(c, id, x, y) {
  const top = y - 44;
  const [w, h] = [32, 20];
  c.save();
  // the pole, with a golden knob
  c.fillStyle = '#5b6472';
  c.fillRect(x - 1.5, top, 3, y - top);
  c.fillStyle = '#e0b83a';
  fillCircle(c, x, top - 1, 3);
  // the cloth, waving: its outline, then what is painted on it inside
  const cloth = new Path2D();
  cloth.moveTo(x - 1, top + 2);
  cloth.bezierCurveTo(x - w * 0.35, top - 3, x - w * 0.65, top + 7, x - w, top + 2);
  cloth.lineTo(x - w, top + 2 + h);
  cloth.bezierCurveTo(x - w * 0.65, top + h + 7, x - w * 0.35, top + h - 3, x - 1, top + 2 + h);
  cloth.closePath();
  c.save();
  c.clip(cloth);
  const [x0, y0] = [x - w, top - 4];
  const band = (/** @type {string[]} */ colors) => colors.forEach((color, i) => {
    c.fillStyle = color;
    c.fillRect(x0 + (i * w) / colors.length, y0, w / colors.length + 0.5, h + 12);
  });
  switch (id) {
    case 'tricolor': band(['#1e4fa8', '#fcd116', '#ce1126']); break;
    case 'red': band(['#e53935']); break;
    case 'yellow': band(['#fdd835']); break;
    case 'green': band(['#43a047']); break;
    case 'blue': band(['#1e88e5']); break;
    case 'ladybug':
      band(['#e53935']);
      c.fillStyle = '#1d1d24';
      for (const [dx, dy] of [[0.25, 0.45], [0.55, 0.3], [0.5, 0.75], [0.8, 0.55]]) fillCircle(c, x0 + dx * w, top + 2 + dy * h, 2.6);
      break;
    case 'checkered':
      for (let i = 0; i < 6; i++) {
        for (let j = 0; j < 5; j++) {
          c.fillStyle = (i + j) % 2 ? '#1d1d24' : '#ffffff';
          c.fillRect(x0 + (i * w) / 6, y0 + j * 6, w / 6 + 0.5, 6.5);
        }
      }
      break;
    default:
      break;
  }
  // a fold of shadow in the waving cloth
  c.fillStyle = 'rgba(0,0,0,0.12)';
  c.fillRect(x - w * 0.55, y0, w * 0.12, h + 12);
  c.restore();
  c.strokeStyle = 'rgba(0,0,0,0.3)';
  c.lineWidth = 1;
  c.stroke(cloth);
  c.restore();
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
    case 'rainbow':
      c.lineWidth = s * 0.17;
      c.lineCap = 'butt';
      ['#e53935', '#fb8c00', '#fdd835', '#43a047', '#1e88e5'].forEach((color, k) => {
        c.strokeStyle = color;
        c.beginPath();
        c.arc(x, y + s * 0.45, s * (0.95 - k * 0.17), Math.PI, TAU);
        c.stroke();
      });
      // two little clouds at its feet
      c.fillStyle = '#e3eaf3';
      for (const d of [-1, 1]) {
        fillCircle(c, x + d * s * 0.7, y + s * 0.5, s * 0.22);
        fillCircle(c, x + d * s * 0.92, y + s * 0.55, s * 0.17);
      }
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
