/**
 * @file Painters for every kind of railway car.
 *
 * A painter draws the static body of one car in car coordinates (x from 0
 * at the rear to `length` at the front, y = 0 on the rail, negative upwards)
 * and returns its geometry: where the windows are (lit at night), where
 * Bubu sits, where the bogies and the headlights are. The renderer uses the
 * geometry to draw the moving and glowing parts every frame.
 */

import { drawFir, fillCircle, fillRoundRect, fillStar, roundRectPath } from '../gfx/shapes.js';
import { TRACK_Y, WIRE_Y } from '../world/track.js';

/** Radius of a wheel. */
export const WHEEL_R = 15;
/** Bottom edge of car bodies. */
const BODY_BOTTOM = -30;
/** Height of the contact wire above the rail (pantograph reach). */
const WIRE_H = TRACK_Y - WIRE_Y;

/** @typedef {[number, number, number, number]} Rect  x, y, w, h */

/**
 * @typedef {object} CarGeometry
 * @property {Rect[]} windows              passenger windows (lit at night)
 * @property {Rect | null} bubuWindow      the window where Bubu sits
 * @property {number[]} wheels             x of every wheel centre
 * @property {{x: number, y: number} | null} headlight   only on the leading car
 * @property {{x: number, y: number} | null} taillight
 * @property {number} roofY                top edge of the body (garlands hang from it)
 */

/**
 * @callback CarPainter
 * @param {CanvasRenderingContext2D} c
 * @param {import('./specs.js').CarSpec} car
 * @param {{leading: boolean, trailing: boolean}} pos
 * @returns {CarGeometry}
 */

/**
 * Two bogies with two wheels each, near both ends of the car.
 * @param {number} length
 * @returns {number[]}
 */
const wheelsFor = length => [length * 0.13, length * 0.13 + 46, length * 0.87 - 46, length * 0.87];

/**
 * Bogie frames (static); the wheels themselves are drawn each frame.
 * @param {CanvasRenderingContext2D} c
 * @param {number[]} wheels
 */
function drawBogies(c, wheels) {
  c.fillStyle = '#3b4250';
  for (let i = 0; i < wheels.length; i += 2) {
    fillRoundRect(c, wheels[i] - 24, -WHEEL_R - 12, wheels[i + 1] - wheels[i] + 48, 16, 6, '#3b4250');
  }
}

/**
 * Buffers and coupler at one end of a car.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x     the end of the car
 * @param {1 | -1} dir   1 = front (pointing right), -1 = rear
 */
function drawBuffers(c, x, dir) {
  c.fillStyle = '#4a5160';
  c.fillRect(dir > 0 ? x : x - 10, -50, 10, 8);
  c.fillStyle = '#2d323c';
  c.fillRect(dir > 0 ? x + 8 : x - 12, -53, 4, 14);
}

/**
 * A window with a frame and a reflection.
 * @param {CanvasRenderingContext2D} c
 * @param {Rect} r
 * @param {boolean} [open=false]  Bubu's window is open: no glass, dark inside
 */
function drawWindow(c, [x, y, w, h], open = false) {
  fillRoundRect(c, x - 3, y - 3, w + 6, h + 6, 9, '#3a4352');
  if (open) {
    fillRoundRect(c, x, y, w, h, 7, '#4b3a3f');
    return;
  }
  const g = c.createLinearGradient(x, y, x + w, y + h);
  g.addColorStop(0, '#9fc3e6');
  g.addColorStop(1, '#5d86b6');
  c.fillStyle = g;
  c.beginPath();
  roundRectPath(c, x, y, w, h, 7);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.beginPath();
  c.moveTo(x + 6, y + h - 6);
  c.lineTo(x + w * 0.45, y + 5);
  c.lineTo(x + w * 0.65, y + 5);
  c.lineTo(x + 18, y + h - 6);
  c.closePath();
  c.fill();
}

/**
 * The little ladybug emblem painted on Bubu's trains.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} r
 */
function drawLadybugEmblem(c, x, y, r) {
  c.fillStyle = '#fff6e0';
  fillCircle(c, x, y, r + 4);
  c.fillStyle = '#e53935';
  fillCircle(c, x, y + 2, r);
  c.fillStyle = '#1d1d24';
  fillCircle(c, x, y - r + 3, r * 0.5);
  c.fillRect(x - 1.2, y - r * 0.6, 2.4, r * 1.6);
  for (const [dx, dy] of [[-0.45, 0.05], [0.45, 0.05], [-0.38, 0.55], [0.38, 0.55]]) {
    fillCircle(c, x + dx * r, y + dy * r, r * 0.17);
  }
}

/**
 * The car number on a white plate, as on real coaches (passengers find
 * their car by it).
 * @param {CanvasRenderingContext2D} c
 * @param {number} cx
 * @param {number} cy
 * @param {number} n
 */
function drawCarNumber(c, cx, cy, n) {
  fillRoundRect(c, cx - 24, cy - 19, 48, 38, 8, '#ffffff');
  c.strokeStyle = '#1b2440';
  c.lineWidth = 2;
  c.beginPath();
  roundRectPath(c, cx - 21, cy - 16, 42, 32, 6);
  c.stroke();
  c.fillStyle = '#1b2440';
  c.font = '800 30px "Baloo 2", system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(String(n), cx, cy + 2);
}

/** @type {CarPainter} */
function electricLoco(c, car, pos) {
  const L = car.length;
  const top = -182;
  const col = car.colors;
  const wheels = wheelsFor(L);
  drawBogies(c, wheels);
  drawBuffers(c, L, 1);
  drawBuffers(c, 0, -1);

  // body with slanted cab ends
  c.fillStyle = col.body;
  c.beginPath();
  c.moveTo(0, BODY_BOTTOM);
  c.lineTo(0, -120);
  c.quadraticCurveTo(2, top + 4, 22, top);
  c.lineTo(L - 22, top);
  c.quadraticCurveTo(L - 2, top + 4, L, -120);
  c.lineTo(L, BODY_BOTTOM);
  c.closePath();
  c.fill();
  // shading on the lower part, skirt and stripes
  c.fillStyle = 'rgba(0,0,0,0.12)';
  c.fillRect(0, -62, L, 32);
  c.fillStyle = '#2f3540';
  c.fillRect(4, BODY_BOTTOM - 2, L - 8, 8);
  c.fillStyle = col.band;
  c.fillRect(0, -98, L, 12);
  c.fillStyle = col.accent || '#ffd23f';
  c.fillRect(L - 40, -70, 40, 8);
  c.fillRect(0, -70, 40, 8);
  // roof
  fillRoundRect(c, 18, top - 8, L - 36, 12, 6, col.roof);
  fillRoundRect(c, L * 0.42, top - 20, 60, 14, 4, '#6c7685');
  fillRoundRect(c, L * 0.62, top - 16, 34, 10, 4, '#6c7685');

  // cab windows at both ends (the front one is larger)
  drawWindow(c, [L - 44, -160, 36, 44]);
  drawWindow(c, [8, -160, 30, 40]);
  // side windows and grilles in the middle
  drawWindow(c, [70, -152, 30, 26]);
  c.fillStyle = 'rgba(0,0,0,0.18)';
  for (let x = 116; x < L - 70; x += 9) c.fillRect(x, -158, 4, 46);
  // doors next to the cabs
  c.strokeStyle = 'rgba(0,0,0,0.25)';
  c.lineWidth = 2;
  c.strokeRect(L - 74, -160, 24, 108);
  c.strokeRect(44, -160, 22, 108);
  drawLadybugEmblem(c, L * 0.53, -128, 15);

  // pantograph (single arm), raised to the contact wire
  const px = L * 0.24;
  c.strokeStyle = '#2d323c';
  c.lineWidth = 4;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(px, top - 8);
  c.lineTo(px + 48, -(WIRE_H - 34));
  c.lineTo(px + 12, -WIRE_H + 6);
  c.stroke();
  c.lineWidth = 5;
  c.beginPath();
  c.moveTo(px - 12, -WIRE_H + 4);
  c.lineTo(px + 36, -WIRE_H + 4);
  c.stroke();
  fillRoundRect(c, px - 14, top - 14, 28, 8, 3, '#2d323c');

  // lamps
  c.fillStyle = '#fff8dc';
  fillCircle(c, L - 6, -50, 6);
  c.fillStyle = '#c62828';
  fillCircle(c, 5, -50, 4);

  return {
    windows: [],
    bubuWindow: null,
    wheels,
    headlight: pos.leading ? { x: L - 4, y: -50 } : null,
    taillight: pos.trailing ? { x: 4, y: -50 } : null,
    roofY: top,
  };
}

/** @type {CarPainter} */
function coach(c, car, pos) {
  const L = car.length;
  const top = -178;
  const col = car.colors;
  const wheels = wheelsFor(L);
  drawBogies(c, wheels);
  drawBuffers(c, L, 1);
  drawBuffers(c, 0, -1);

  c.fillStyle = col.body;
  c.beginPath();
  roundRectPath(c, 0, top, L, BODY_BOTTOM - top, 14);
  c.fill();
  c.fillStyle = col.band;
  c.fillRect(0, -164, L, 70);
  c.fillStyle = col.accent || '#e0b84a';
  c.fillRect(0, -92, L, 4);
  c.fillStyle = 'rgba(0,0,0,0.12)';
  c.fillRect(0, -60, L, 30);
  c.fillStyle = '#2f3540';
  c.fillRect(4, BODY_BOTTOM - 2, L - 8, 6);
  fillRoundRect(c, 10, top - 8, L - 20, 14, 7, col.roof);

  // doors at both ends
  for (const dx of [12, L - 48]) {
    c.fillStyle = 'rgba(0,0,0,0.14)';
    c.fillRect(dx, -158, 36, 124);
    drawWindow(c, [dx + 8, -150, 20, 34]);
  }

  // four windows between the doors, listed from the front
  const n = 4;
  const ww = 50;
  const wh = 48;
  const left = 60;
  const right = L - 60;
  const gap = (right - left - n * ww) / (n + 1);
  /** @type {Rect[]} */
  const windows = [];
  let bubuWindow = null;
  for (let i = 0; i < n; i++) {
    const x = right - gap - ww - i * (ww + gap);
    const isBubu = car.bubuWindow === i;
    /** @type {Rect} */
    const r = [x, -154, ww, wh];
    drawWindow(c, r, isBubu);
    if (isBubu) bubuWindow = r;
    else windows.push(r);
  }
  // door windows are lit too
  windows.push([20, -150, 20, 34], [L - 40, -150, 20, 34]);
  if (car.number !== undefined) drawCarNumber(c, L / 2, -62, car.number);

  return {
    windows,
    bubuWindow,
    wheels,
    headlight: null,
    taillight: pos.trailing ? { x: 3, y: -48 } : null,
    roofY: top,
  };
}

/**
 * The regional diesel railcar; `front` decides on which end the nose is.
 * @param {CanvasRenderingContext2D} c
 * @param {import('./specs.js').CarSpec} car
 * @param {{leading: boolean, trailing: boolean}} pos
 * @param {boolean} noseRight
 * @returns {CarGeometry}
 */
function railcar(c, car, pos, noseRight) {
  const L = car.length;
  const top = -176;
  const col = car.colors;
  const wheels = wheelsFor(L);
  c.save();
  if (!noseRight) {
    // draw the same car mirrored, then fix up geometry below
    c.translate(L, 0);
    c.scale(-1, 1);
  }
  drawBogies(c, wheels);
  drawBuffers(c, 0, -1);
  c.fillStyle = col.body;
  c.beginPath();
  c.moveTo(0, BODY_BOTTOM);
  c.lineTo(0, top + 12);
  c.quadraticCurveTo(0, top, 12, top);
  c.lineTo(L - 70, top);
  c.quadraticCurveTo(L - 10, top + 6, L, -86);
  c.lineTo(L, BODY_BOTTOM);
  c.closePath();
  c.fill();
  c.fillStyle = col.band;
  c.fillRect(0, -78, L, 26);
  c.fillStyle = col.accent || '#e53935';
  c.fillRect(0, -84, L - 2, 6);
  c.fillStyle = '#2f3540';
  c.fillRect(4, BODY_BOTTOM - 2, L - 8, 6);
  fillRoundRect(c, 20, top - 10, L - 110, 12, 6, col.roof);
  fillRoundRect(c, 60, top - 22, 70, 14, 5, '#7f8996');      // air conditioning
  fillRoundRect(c, L - 140, top - 30, 12, 24, 3, '#4a5160');  // exhaust stack
  // windscreen on the nose
  c.fillStyle = '#3a4352';
  c.beginPath();
  c.moveTo(L - 64, top + 8);
  c.quadraticCurveTo(L - 16, top + 12, L - 6, -104);
  c.lineTo(L - 54, -104);
  c.closePath();
  c.fill();
  c.fillStyle = '#7fa6d4';
  c.beginPath();
  c.moveTo(L - 60, top + 14);
  c.quadraticCurveTo(L - 20, top + 18, L - 12, -110);
  c.lineTo(L - 56, -110);
  c.closePath();
  c.fill();
  c.fillStyle = '#fff8dc';
  fillCircle(c, L - 10, -66, 6);
  c.restore();

  // side windows (not mirrored, so the reflections all lean the same way);
  // the front car has one window less, to make room for the ladybug emblem
  const n = noseRight ? 3 : 4;
  const ww = 50;
  const wh = 48;
  /** @type {Rect[]} */
  const windows = [];
  let bubuWindow = null;
  for (let i = 0; i < n; i++) {
    const x = noseRight ? L - 130 - i * 62 : 80 + (n - 1 - i) * 62;
    const isBubu = car.bubuWindow === i;
    /** @type {Rect} */
    const r = [x, -150, ww, wh];
    drawWindow(c, r, isBubu);
    if (isBubu) bubuWindow = r;
    else windows.push(r);
  }
  if (noseRight) drawLadybugEmblem(c, 40, -125, 15);
  return {
    windows,
    bubuWindow,
    wheels,
    headlight: pos.leading ? { x: L - 8, y: -66 } : null,
    taillight: pos.trailing ? { x: 8, y: -66 } : null,
    roofY: top,
  };
}

/** @type {CarPainter} A flat wagon carrying Bubu's Christmas tree, tied with ropes. */
function flatcar(c, car, pos) {
  const L = car.length;
  const wheels = [L * 0.2, L * 0.2 + 46, L * 0.8 - 46, L * 0.8];
  drawBogies(c, wheels);
  drawBuffers(c, L, 1);
  drawBuffers(c, 0, -1);
  fillRoundRect(c, 0, -52, L, 22, 4, car.colors.body);
  c.fillStyle = car.colors.band;
  c.fillRect(0, -52, L, 6);
  // stakes along the sides
  c.fillStyle = '#4e342e';
  for (let x = 14; x < L; x += 44) c.fillRect(x, -82, 6, 32);
  // the tree standing in the middle, tied to the stakes, with baubles and a star
  const cx = L * 0.5;
  const base = -52;
  const h = 170;
  drawFir(c, cx, base, h, { snowy: true });
  c.strokeStyle = '#c9a26b';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(18, -82);
  c.lineTo(cx - 12, base - h * 0.45);
  c.moveTo(L - 18, -82);
  c.lineTo(cx + 12, base - h * 0.45);
  c.stroke();
  const balls = [[-26, 0.3, '#e53935'], [22, 0.38, '#ffd23f'], [-12, 0.55, '#1e88e5'], [14, 0.66, '#e53935'], [-30, 0.18, '#ffd23f'], [32, 0.2, '#8e44ad']];
  for (const [dx, k, color] of balls) {
    c.fillStyle = /** @type {string} */ (color);
    fillCircle(c, cx + /** @type {number} */ (dx), base - h * /** @type {number} */ (k), 5.5);
  }
  c.fillStyle = '#ffd23f';
  fillStar(c, cx, base - h - 4, 12, 5);
  return { windows: [], bubuWindow: null, wheels, headlight: null, taillight: pos.trailing ? { x: 4, y: -44 } : null, roofY: -60 };
}

/** @type {Readonly<Record<import('./specs.js').CarSpec['kind'], CarPainter>>} */
export const CAR_PAINTERS = Object.freeze({
  electricLoco,
  coach,
  railcarFront: (c, car, pos) => railcar(c, car, pos, true),
  railcarRear: (c, car, pos) => railcar(c, car, pos, false),
  flatcar,
});
