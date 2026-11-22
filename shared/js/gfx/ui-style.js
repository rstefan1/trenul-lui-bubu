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
