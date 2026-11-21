/**
 * @file Drawing primitives in the flat, friendly style of the game.
 *
 * Everything is built from a few simple shapes (no outlines, soft colours,
 * a little shading on one side), which is cheap to draw and reads well on
 * small screens. Functions take the context first and never leave state
 * changed except `fillStyle`/`strokeStyle`.
 */

import { TAU } from '../core/math.js';

/**
 * Adds a rounded rectangle to the current path (does not fill).
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r  corner radius
 */
export function roundRectPath(c, x, y, w, h, r) {
  r = Math.min(r, w / 2, h / 2);
  c.moveTo(x + r, y);
  c.arcTo(x + w, y, x + w, y + h, r);
  c.arcTo(x + w, y + h, x, y + h, r);
  c.arcTo(x, y + h, x, y, r);
  c.arcTo(x, y, x + w, y, r);
  c.closePath();
}

/**
 * Fills a rounded rectangle.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} r
 * @param {string} color
 */
export function fillRoundRect(c, x, y, w, h, r, color) {
  c.fillStyle = color;
  c.beginPath();
  roundRectPath(c, x, y, w, h, r);
  c.fill();
}

/**
 * Fills a star.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} outer  outer radius
 * @param {number} inner  inner radius
 * @param {number} [points=5]
 */
export function fillStar(c, x, y, outer, inner, points = 5) {
  c.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / points;
    const r = i % 2 ? inner : outer;
    c.lineTo(x + Math.cos(a) * r, y + Math.sin(a) * r);
  }
  c.closePath();
  c.fill();
}

/**
 * Fills a circle.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} r
 */
export function fillCircle(c, x, y, r) {
  c.beginPath();
  c.arc(x, y, r, 0, TAU);
  c.fill();
}

/**
 * A soft radial glow (lamps, lit windows, the sun).
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {string} inner  colour at the centre
 * @param {string} outer  colour at the rim (usually fully transparent)
 */
export function glow(c, x, y, r, inner, outer) {
  const g = c.createRadialGradient(x, y, 0, x, y, r);
  g.addColorStop(0, inner);
  g.addColorStop(1, outer);
  c.fillStyle = g;
  c.fillRect(x - r, y - r, r * 2, r * 2);
}

/**
 * A fir tree standing on (x, groundY), made of stacked triangles.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} groundY
 * @param {number} h       total height
 * @param {object} [o]
 * @param {string} [o.color='#2f6e4f']
 * @param {string} [o.shade='#245a41']  right half, for a little volume
 * @param {boolean} [o.snowy=false]     white caps on every tier
 * @param {string} [o.snow='#f4f8ff']
 */
export function drawFir(c, x, groundY, h, o = {}) {
  const color = o.color || '#2f6e4f';
  const shade = o.shade || '#245a41';
  const w = h * 0.46;
  // trunk
  c.fillStyle = '#6b4a32';
  c.fillRect(x - h * 0.04, groundY - h * 0.14, h * 0.08, h * 0.14);
  const tiers = 3;
  for (let i = 0; i < tiers; i++) {
    const top = groundY - h + (i * h * 0.24);
    const bottom = groundY - h * 0.1 - (tiers - 1 - i) * h * 0.18;
    const half = w * (0.55 + i * 0.22);
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x, top);
    c.lineTo(x + half, bottom);
    c.lineTo(x - half, bottom);
    c.closePath();
    c.fill();
    c.fillStyle = shade;
    c.beginPath();
    c.moveTo(x, top);
    c.lineTo(x + half, bottom);
    c.lineTo(x, bottom);
    c.closePath();
    c.fill();
    if (o.snowy) {
      // a wavy snow cap on the upper part of the tier
      c.fillStyle = o.snow || '#f4f8ff';
      const capY = top + (bottom - top) * 0.42;
      const capHalf = half * 0.42;
      c.beginPath();
      c.moveTo(x, top);
      c.lineTo(x + capHalf, capY);
      c.quadraticCurveTo(x + capHalf * 0.5, capY + h * 0.03, x, capY - h * 0.005);
      c.quadraticCurveTo(x - capHalf * 0.5, capY + h * 0.03, x - capHalf, capY);
      c.closePath();
      c.fill();
    }
  }
}

/**
 * A leafless winter tree (lowlands), drawn with a few branches.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} groundY
 * @param {number} h
 * @param {string} color
 * @param {number} lean  -1..1, small random bend
 */
export function drawBareTree(c, x, groundY, h, color, lean = 0) {
  c.strokeStyle = color;
  c.lineCap = 'round';
  c.lineWidth = h * 0.07;
  c.beginPath();
  c.moveTo(x, groundY);
  c.quadraticCurveTo(x + lean * h * 0.08, groundY - h * 0.5, x + lean * h * 0.05, groundY - h);
  c.stroke();
  c.lineWidth = h * 0.035;
  c.beginPath();
  for (let i = 0; i < 4; i++) {
    const y = groundY - h * (0.45 + i * 0.13);
    const side = i % 2 ? 1 : -1;
    c.moveTo(x + lean * h * 0.04, y);
    c.lineTo(x + side * h * (0.28 - i * 0.05), y - h * 0.18);
  }
  c.stroke();
}

/**
 * A poplar (tall narrow tree typical of the western plain), in winter
 * colours.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} groundY
 * @param {number} h
 * @param {string} color
 */
export function drawPoplar(c, x, groundY, h, color) {
  c.fillStyle = '#6b4a32';
  c.fillRect(x - h * 0.025, groundY - h * 0.2, h * 0.05, h * 0.2);
  c.fillStyle = color;
  c.beginPath();
  c.ellipse(x, groundY - h * 0.58, h * 0.11, h * 0.42, 0, 0, TAU);
  c.fill();
}

/**
 * @typedef {object} HouseStyle
 * @property {string} wall
 * @property {string} roof
 * @property {boolean} [snowy]     snow on the roof
 * @property {boolean} [chimney]
 * @property {number} [windows]   number of windows on the front (default 2)
 */

/**
 * A small village house with a pitched roof, standing on (x, groundY);
 * x is the left wall. Returns the window rectangles so the caller can light
 * them at night.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} groundY
 * @param {number} w
 * @param {number} h   wall height (the roof adds ~0.6 h)
 * @param {HouseStyle} s
 * @returns {Array<[number, number, number, number]>} window rects [x, y, w, h]
 */
export function drawHouse(c, x, groundY, w, h, s) {
  const roofH = h * 0.65;
  c.fillStyle = s.wall;
  c.fillRect(x, groundY - h, w, h);
  c.fillStyle = 'rgba(0,0,0,0.08)';
  c.fillRect(x + w * 0.7, groundY - h, w * 0.3, h);
  if (s.chimney) {
    c.fillStyle = '#8a5a44';
    c.fillRect(x + w * 0.68, groundY - h - roofH * 0.85, w * 0.1, roofH * 0.6);
  }
  c.fillStyle = s.roof;
  c.beginPath();
  c.moveTo(x - w * 0.08, groundY - h);
  c.lineTo(x + w / 2, groundY - h - roofH);
  c.lineTo(x + w * 1.08, groundY - h);
  c.closePath();
  c.fill();
  if (s.snowy) {
    c.fillStyle = '#f4f8ff';
    c.beginPath();
    c.moveTo(x - w * 0.04, groundY - h - roofH * 0.15);
    c.lineTo(x + w / 2, groundY - h - roofH);
    c.lineTo(x + w * 1.04, groundY - h - roofH * 0.15);
    c.quadraticCurveTo(x + w * 0.75, groundY - h - roofH * 0.3, x + w / 2, groundY - h - roofH * 0.62);
    c.quadraticCurveTo(x + w * 0.25, groundY - h - roofH * 0.3, x - w * 0.04, groundY - h - roofH * 0.15);
    c.fill();
  }
  /** @type {Array<[number, number, number, number]>} */
  const rects = [];
  const n = s.windows ?? 2;
  const ww = w * 0.2;
  const wh = h * 0.34;
  for (let i = 0; i < n; i++) {
    const wx = x + (w * (i + 1)) / (n + 1) - ww / 2;
    const wy = groundY - h * 0.68;
    c.fillStyle = '#5b7aa6';
    c.fillRect(wx, wy, ww, wh);
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.fillRect(wx, wy, ww * 0.4, wh * 0.45);
    rects.push([wx, wy, ww, wh]);
  }
  return rects;
}

/**
 * Lights a set of window rectangles (for the night lights layer).
 * @param {CanvasRenderingContext2D} c
 * @param {Array<[number, number, number, number]>} rects
 * @param {number} [haloScale=1]  size of the soft halo around each window
 */
export function lightWindows(c, rects, haloScale = 1) {
  for (const [x, y, w, h] of rects) {
    glow(c, x + w / 2, y + h / 2, Math.max(w, h) * 1.5 * haloScale, 'rgba(255,210,110,0.45)', 'rgba(255,210,110,0)');
    c.fillStyle = '#ffd877';
    c.fillRect(x, y, w, h);
  }
}
