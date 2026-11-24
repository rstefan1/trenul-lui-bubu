/**
 * @file Painters for every kind of railway car.
 *
 * A painter draws the static body of one car in car coordinates (x from 0
 * at the rear to `length` at the front, y = 0 on the rail, negative upwards)
 * and returns its geometry: where the windows are (lit at night), where
 * Bubu sits, where the bogies and the headlights are. The renderer uses the
 * geometry to draw the moving and glowing parts every frame.
 */

import { LOADS, drawLoad } from '../gfx/cargo.js';
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
 * @property {Partial<Record<LocoPart, Rect[]>>} [parts]  where the parts of a locomotive are
 *                                         (the driver checks them before leaving)
 */

/** @typedef {'headlights' | 'wheels' | 'brakes' | 'sandbox' | 'fuel' | 'horn'} LocoPart */

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
 */
function drawWindow(c, [x, y, w, h]) {
  fillRoundRect(c, x - 3, y - 3, w + 6, h + 6, 9, '#3a4352');
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
    drawWindow(c, r);
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
    drawWindow(c, r);
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
  // a wooden crate holds the tree well above the deck
  fillRoundRect(c, cx - 34, -92, 68, 42, 5, '#a1887f');
  c.fillStyle = '#795548';
  c.fillRect(cx - 34, -76, 68, 5);
  const base = -88;
  const h = 160;
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

/*
 * The diesel freight locomotive: a long body with a cab at each end, two
 * bogies of three axles, the fuel tank hanging between them, a sandbox above
 * the front bogie, a horn on the roof and the air hose of the brakes at the
 * back, where the wagons are coupled.
 */
/** Wheels of a bogie with three axles. */
const AXLE = 38;
/** Where the parts of the diesel locomotive are, for a length L (car coordinates). */
const dieselLayout = (/** @type {number} */ L) => ({
  wheels: [38, 38 + AXLE, 38 + 2 * AXLE, L - 38 - 2 * AXLE, L - 38 - AXLE, L - 38],
  tank: /** @type {Rect} */ ([128, -36, L - 256, 28]),
  sandbox: /** @type {Rect} */ ([L - 78, -66, 34, 26]),
});

/** @type {CarPainter} */
function dieselLoco(c, car, pos) {
  const L = car.length;
  const top = -176;
  const col = car.colors;
  const { wheels, tank, sandbox } = dieselLayout(L);
  // bogie frames, each over three wheels
  for (const [a, b] of [[wheels[0], wheels[2]], [wheels[3], wheels[5]]]) {
    fillRoundRect(c, a - 24, -WHEEL_R - 12, b - a + 48, 16, 6, '#3b4250');
  }
  drawBuffers(c, L, 1);
  drawBuffers(c, 0, -1);

  // the fuel tank between the bogies, with its filler cap and a level gauge
  fillRoundRect(c, tank[0], tank[1], tank[2], tank[3], 8, '#2f3540');
  c.fillStyle = 'rgba(255,255,255,0.12)';
  c.fillRect(tank[0] + 6, tank[1] + 4, tank[2] - 12, 4);
  fillRoundRect(c, tank[0] + 10, tank[1] - 5, 16, 8, 3, '#59606c');
  fillRoundRect(c, tank[0] + tank[2] - 40, tank[1] + 9, 28, 11, 3, '#e8edf2');
  c.fillStyle = '#2e9d57';
  c.fillRect(tank[0] + tank[2] - 37, tank[1] + 12, 17, 5);

  // body with rounded cab ends
  c.fillStyle = col.body;
  c.beginPath();
  c.moveTo(0, BODY_BOTTOM);
  c.lineTo(0, -126);
  c.quadraticCurveTo(0, top, 26, top);
  c.lineTo(L - 26, top);
  c.quadraticCurveTo(L, top, L, -126);
  c.lineTo(L, BODY_BOTTOM);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(0,0,0,0.12)';
  c.fillRect(0, -62, L, 32);
  c.fillStyle = '#2f3540';
  c.fillRect(4, BODY_BOTTOM - 2, L - 8, 8);
  c.fillStyle = col.band;
  c.fillRect(0, -100, L, 10);
  // yellow and black warning stripes on both ends
  c.save();
  c.beginPath();
  c.rect(0, -62, 34, 22);
  c.rect(L - 34, -62, 34, 22);
  c.clip();
  c.fillStyle = col.accent || '#ffd23f';
  c.fillRect(0, -62, L, 22);
  c.fillStyle = '#1d1d24';
  for (let x = -30; x < L + 30; x += 18) {
    c.beginPath();
    c.moveTo(x, -40);
    c.lineTo(x + 9, -40);
    c.lineTo(x + 31, -62);
    c.lineTo(x + 22, -62);
    c.closePath();
    c.fill();
  }
  c.restore();

  // roof: the exhaust stack and two big cooling fans
  fillRoundRect(c, 22, top - 8, L - 44, 12, 6, col.roof);
  fillRoundRect(c, L * 0.36, top - 26, 18, 22, 3, '#3b4250');
  c.fillStyle = '#23272f';
  c.fillRect(L * 0.36 + 3, top - 28, 12, 4);
  for (const fx of [L * 0.5, L * 0.62]) {
    fillRoundRect(c, fx - 24, top - 14, 48, 10, 4, '#6c7685');
  }
  // the horn on the roof of the front cab, its bell facing forward
  const hx = L - 70;
  c.fillStyle = '#c9ced6';
  c.fillRect(hx, top - 18, 8, 12);
  c.beginPath();
  c.moveTo(hx - 6, top - 22);
  c.lineTo(hx + 22, top - 22);
  c.lineTo(hx + 34, top - 30);
  c.lineTo(hx + 34, top - 6);
  c.lineTo(hx + 22, top - 14);
  c.lineTo(hx - 6, top - 14);
  c.closePath();
  c.fill();

  // cab windows at both ends: the front one is the driver's (Bubu's) window
  /** @type {Rect} */
  const cab = [L - 76, -156, 44, 46];
  drawWindow(c, cab);
  drawWindow(c, [30, -156, 38, 42]);
  // windscreens on the noses
  c.fillStyle = '#5d86b6';
  fillRoundRect(c, L - 16, -158, 12, 40, 4, '#5d86b6');
  fillRoundRect(c, 4, -158, 12, 40, 4, '#5d86b6');
  // cab doors, and the radiator grilles of the engine room between the cabs
  c.strokeStyle = 'rgba(0,0,0,0.25)';
  c.lineWidth = 2;
  c.strokeRect(L - 112, -158, 28, 106);
  c.strokeRect(76, -158, 26, 106);
  c.fillStyle = 'rgba(0,0,0,0.2)';
  for (let x = 116; x < L - 128; x += 10) c.fillRect(x, -156, 5, 44);
  if (!car.plain) drawLadybugEmblem(c, L * 0.5, -128, 14);
  // handrails along the body
  c.strokeStyle = '#d8dde4';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(40, -74);
  c.lineTo(L - 40, -74);
  c.stroke();

  // the sandbox above the front bogie, and its pipe down to the rail
  fillRoundRect(c, sandbox[0], sandbox[1], sandbox[2], sandbox[3], 4, '#d9b46a');
  c.fillStyle = '#8d6e3f';
  c.fillRect(sandbox[0], sandbox[1], sandbox[2], 5);
  c.strokeStyle = '#59606c';
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(sandbox[0] + sandbox[2] - 6, sandbox[1] + sandbox[3]);
  c.lineTo(wheels[5] + WHEEL_R + 6, -4);
  c.stroke();

  // the air hose of the brakes, hanging at the back next to the coupler
  c.strokeStyle = '#1d1d24';
  c.lineWidth = 6;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(-2, -44);
  c.quadraticCurveTo(-14, -28, -6, -16);
  c.stroke();
  c.fillStyle = '#c62828';
  fillCircle(c, -6, -16, 5);

  // lamps: two below, one on top of the front
  c.fillStyle = '#fff8dc';
  fillCircle(c, L - 8, -52, 6);
  fillCircle(c, L - 10, -168, 5);
  c.fillStyle = '#c62828';
  fillCircle(c, 6, -52, 4);

  return {
    windows: [],
    bubuWindow: cab,
    wheels,
    headlight: pos.leading ? { x: L - 6, y: -52 } : null,
    taillight: pos.trailing ? { x: 4, y: -52 } : null,
    roofY: top,
    parts: {
      headlights: [[L - 22, -66, 30, 28], [L - 24, -182, 28, 26]],
      wheels: [[wheels[0] - 22, -34, wheels[2] - wheels[0] + 44, 36], [wheels[3] - 22, -34, wheels[5] - wheels[3] + 44, 36]],
      fuel: [[tank[0] - 4, tank[1] - 10, tank[2] + 8, tank[3] + 14]],
      sandbox: [[sandbox[0] - 8, sandbox[1] - 8, sandbox[2] + 16, sandbox[3] + 14]],
      horn: [[hx - 14, top - 44, 58, 44]],
      brakes: [[-26, -62, 34, 60]],
    },
  };
}

/** @type {CarPainter} A flat wagon for goods: a wooden deck with stakes along the sides, and its load (if any). */
function platform(c, car, pos) {
  const L = car.length;
  const wheels = [L * 0.16, L * 0.16 + 46, L * 0.84 - 46, L * 0.84];
  drawBogies(c, wheels);
  drawBuffers(c, L, 1);
  drawBuffers(c, 0, -1);
  // steel frame and the wooden deck on it
  fillRoundRect(c, 0, -46, L, 16, 3, car.colors.body);
  c.fillStyle = car.colors.band;
  c.fillRect(0, -58, L, 12);
  c.strokeStyle = 'rgba(62,39,35,0.35)';
  c.lineWidth = 2;
  c.beginPath();
  for (let x = 16; x < L; x += 22) {
    c.moveTo(x, -57);
    c.lineTo(x, -47);
  }
  c.stroke();
  // the stakes that hold the load, and the number of the wagon
  c.fillStyle = car.colors.roof;
  for (let x = 8; x < L; x += (L - 22) / 4) c.fillRect(x, -92, 6, 36);
  if (car.number !== undefined) {
    c.fillStyle = '#ffffff';
    c.font = '800 13px "Baloo 2", system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(String(car.number), L / 2, -38);
  }
  const load = car.cargo ? LOADS[car.cargo] : null;
  if (load) drawLoad(c, load);
  return { windows: [], bubuWindow: null, wheels, headlight: null, taillight: pos.trailing ? { x: 4, y: -40 } : null, roofY: -60 };
}

/** @type {Readonly<Record<import('./specs.js').CarSpec['kind'], CarPainter>>} */
export const CAR_PAINTERS = Object.freeze({
  electricLoco,
  dieselLoco,
  platform,
  coach,
  railcarFront: (c, car, pos) => railcar(c, car, pos, true),
  railcarRear: (c, car, pos) => railcar(c, car, pos, false),
  flatcar,
});
