/**
 * @file The look of the boxes the missions draw on the canvas, the same as
 * the HTML ones (see shared/css/tokens.css):
 * a dark blue "glass" box with a thin white line and a solid shadow under
 * it. A box can be "active" (waiting for the child): its line turns green
 * and thicker.
 */

import { roundRectPath } from './shapes.js';

export const UI = Object.freeze({
  glass: 'rgba(19,41,90,0.85)',
  line: 'rgba(255,255,255,0.9)',
  lineWidth: 3,
  active: '#b9f6ca',
  activeWidth: 5,
  shadow: 'rgba(0,0,0,0.25)',
  shadowDrop: 4,
  radius: 24,
});

/**
 * Draws a glass box.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {{radius?: number, active?: boolean}} [o]
 */
export function drawGlassBox(c, x, y, w, h, o = {}) {
  const r = o.radius ?? UI.radius;
  // the solid shadow: the same shape, a little lower (no blur: cheap)
  c.fillStyle = UI.shadow;
  c.beginPath();
  roundRectPath(c, x, y + UI.shadowDrop, w, h, r);
  c.fill();
  c.fillStyle = UI.glass;
  c.beginPath();
  roundRectPath(c, x, y, w, h, r);
  c.fill();
  c.strokeStyle = o.active ? UI.active : UI.line;
  c.lineWidth = o.active ? UI.activeWidth : UI.lineWidth;
  c.stroke();
}

/**
 * Draws something enlarged `k` times around the point (x, y): a box and
 * everything in it can be drawn in its usual units and still come out big
 * enough on a phone (see Stage#ui). Pair it with {@link unzoom} for touches.
 * @param {CanvasRenderingContext2D} c
 * @param {number} k
 * @param {number} x
 * @param {number} y
 * @param {() => void} draw
 */
export function zoomed(c, k, x, y, draw) {
  if (k === 1) {
    draw();
    return;
  }
  c.save();
  c.translate(x, y);
  c.scale(k, k);
  c.translate(-x, -y);
  draw();
  c.restore();
}

/**
 * The point that a touch at `p` falls on, in the units of something drawn
 * with {@link zoomed} (same `k`, x and y).
 * @param {{x: number, y: number}} p
 * @param {number} k
 * @param {number} x
 * @param {number} y
 * @returns {{x: number, y: number}}
 */
export function unzoom(p, k, x, y) {
  return { x: x + (p.x - x) / k, y: y + (p.y - y) / k };
}
