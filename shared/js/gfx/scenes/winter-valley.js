/**
 * @file A night mountain landscape for full-screen scenes (the sleigh ride
 * and the fair at Vatra Dornei): snowy peaks far away, forested mountains,
 * a snowy valley with groves of firs, hills covered in firs and a snowy
 * slope in front. Only nature: Bubu's ride goes through the mountains.
 *
 * Every layer scrolls at its own speed (parallax), so a moving scene feels
 * deep. Everything is placed from fixed positions along each layer (not
 * from the screen), so nothing shimmers while it scrolls.
 */

import { drawFir } from '../shapes.js';

/**
 * @typedef {object} ValleyView
 * @property {number} left
 * @property {number} right
 * @property {number} top     top of the sky
 * @property {number} bottom  bottom of the picture
 *
 * @typedef {object} ValleyOptions
 * @property {boolean} [slope=true]  draw the snowy slope in front (the sleigh rides on it)
 */

/**
 * A repeatable pseudo-random number in [0, 1) for an integer.
 * @param {number} n
 */
function hash(n) {
  const x = Math.sin(n * 127.1 + 311.7) * 43758.5453;
  return x - Math.floor(x);
}

/**
 * Draws the whole landscape.
 * @param {CanvasRenderingContext2D} c
 * @param {ValleyView} v
 * @param {number} scroll  how far the scene has travelled (stage units)
 * @param {ValleyOptions} [o]
 */
export function drawWinterValley(c, v, scroll, o = {}) {
  const h = v.bottom - v.top;
  const y = (/** @type {number} */ f) => v.top + f * h;
  drawMountains(c, v, scroll * 0.08, { line: y(0.66), max: h * 0.42, spacing: 300, color: '#34477e', seed: 1 });
  drawMountains(c, v, scroll * 0.18, { line: y(0.72), max: h * 0.26, spacing: 230, color: '#4a5d96', seed: 2 });
  drawForestBand(c, v, scroll * 0.18, y(0.72), 30, '#1f3b45', '#1a3239', 3);
  drawValley(c, v, scroll * 0.3, y(0.75), h);
  drawHill(c, v, scroll * 0.55, { base: y(0.84), amp: h * 0.05, color: '#b8c6e2', firSize: Math.max(60, h * 0.1), spacing: 70, seed: 5 });
  if (o.slope !== false) {
    drawHill(c, v, scroll, { base: v.bottom - 24, amp: h * 0.025, color: '#e3eaf6', firSize: Math.max(110, h * 0.16), spacing: 230, seed: 6 });
  }
}

/**
 * A row of peaks with snow caps.
 * @param {CanvasRenderingContext2D} c
 * @param {ValleyView} v
 * @param {number} offset
 * @param {{line: number, max: number, spacing: number, color: string, seed: number}} m
 */
function drawMountains(c, v, offset, m) {
  const first = Math.floor((v.left + offset) / m.spacing) - 1;
  const last = Math.ceil((v.right + offset) / m.spacing) + 1;
  /** @type {Array<[number, number]>} */
  const pts = [];
  for (let i = first; i <= last; i++) {
    const peak = i % 2 === 0;
    const k = peak ? 0.7 + 0.3 * hash(i * 13 + m.seed) : 0.2 + 0.25 * hash(i * 7 + m.seed);
    pts.push([i * m.spacing - offset + (hash(i + m.seed * 31) - 0.5) * m.spacing * 0.4, m.line - m.max * k]);
  }
  c.fillStyle = m.color;
  c.beginPath();
  c.moveTo(pts[0][0], v.bottom);
  for (const [x, yy] of pts) c.lineTo(x, yy);
  c.lineTo(pts[pts.length - 1][0], v.bottom);
  c.closePath();
  c.fill();
  // snow caps on the peaks
  c.fillStyle = 'rgba(236,242,252,0.92)';
  for (let n = 1; n < pts.length - 1; n++) {
    if ((first + n) % 2 !== 0) continue;
    const [px, py] = pts[n];
    const [ax, ay] = pts[n - 1];
    const [bx, by] = pts[n + 1];
    const t = 0.24;
    c.beginPath();
    c.moveTo(px, py);
    c.lineTo(px + (bx - px) * t, py + (by - py) * t);
    c.lineTo(px + (bx - px) * t * 0.5, py + (by - py) * t * 0.75);
    c.lineTo(px, py + (ay - py) * t * 0.6);
    c.lineTo(px + (ax - px) * t * 0.5, py + (ay - py) * t * 0.75);
    c.lineTo(px + (ax - px) * t, py + (ay - py) * t);
    c.closePath();
    c.fill();
  }
}

/**
 * A dense band of small dark firs at the foot of the mountains.
 * @param {CanvasRenderingContext2D} c
 * @param {ValleyView} v
 * @param {number} offset
 * @param {number} line
 * @param {number} size
 * @param {string} color
 * @param {string} shade
 * @param {number} seed
 */
function drawForestBand(c, v, offset, line, size, color, shade, seed) {
  const spacing = size * 0.62;
  const first = Math.floor((v.left + offset) / spacing) - 1;
  const last = Math.ceil((v.right + offset) / spacing) + 1;
  for (let i = first; i <= last; i++) {
    const x = i * spacing - offset + (hash(i * 3 + seed) - 0.5) * spacing * 0.6;
    const s = size * (0.75 + 0.5 * hash(i * 5 + seed));
    drawFir(c, x, line + 4 + hash(i * 11 + seed) * 10, s, { color, shade });
  }
}

/**
 * The snowy valley floor with groves of firs of different sizes.
 * @param {CanvasRenderingContext2D} c
 * @param {ValleyView} v
 * @param {number} offset
 * @param {number} line
 * @param {number} h  height of the whole picture (for sizes)
 */
function drawValley(c, v, offset, line, h) {
  c.fillStyle = '#8193bf';
  c.fillRect(v.left, line, v.right - v.left, v.bottom - line);
  const spacing = 64;
  const first = Math.floor((v.left + offset) / spacing) - 1;
  const last = Math.ceil((v.right + offset) / spacing) + 1;
  const size = Math.max(40, h * 0.065);
  for (let i = first; i <= last; i++) {
    if (hash(i * 41 + 4) < 0.3) continue;   // clearings between the groves
    const x = i * spacing - offset + (hash(i * 17 + 4) - 0.5) * spacing * 0.8;
    const yy = line + 8 + hash(i * 23 + 4) * h * 0.04;
    drawFir(c, x, yy, size * (0.7 + 0.6 * hash(i * 7 + 4)), { color: '#24504a', shade: '#1d433e', snowy: true });
  }
}

/**
 * A rolling snowy hill with firs on it.
 * @param {CanvasRenderingContext2D} c
 * @param {ValleyView} v
 * @param {number} offset
 * @param {{base: number, amp: number, color: string, firSize: number, spacing: number, seed: number}} m
 */
function drawHill(c, v, offset, m) {
  const top = (/** @type {number} */ x) => {
    const u = (x + offset) / 420;
    return m.base - Math.sin(u + m.seed) * m.amp - Math.sin(u * 0.43 + m.seed * 2) * m.amp;
  };
  const step = 20;
  c.fillStyle = m.color;
  c.beginPath();
  c.moveTo(v.left, v.bottom + 10);
  const start = Math.floor((v.left + offset) / step) * step - offset;
  for (let x = start; x <= v.right + step; x += step) c.lineTo(x, top(x));
  c.lineTo(v.right + step, v.bottom + 10);
  c.closePath();
  c.fill();
  const first = Math.floor((v.left + offset) / m.spacing) - 1;
  const last = Math.ceil((v.right + offset) / m.spacing) + 1;
  for (let i = first; i <= last; i++) {
    const x = i * m.spacing - offset + (hash(i * 9 + m.seed) - 0.5) * m.spacing * 0.7;
    if (hash(i * 29 + m.seed) < 0.15) continue;   // a few gaps
    const s = m.firSize * (0.75 + 0.5 * hash(i * 31 + m.seed));
    drawFir(c, x, top(x) + s * 0.08, s, { snowy: true });
  }
}
