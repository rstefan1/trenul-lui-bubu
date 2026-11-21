/**
 * @file Christmas ornaments drawn on the canvas: baubles and garlands.
 *
 * The same drawings are used for the ornaments flying in the sky (missions)
 * and for those hanging on the train, so what the child catches is exactly
 * what appears on the train.
 */

import { TAU } from '../core/math.js';
import { fillCircle } from './shapes.js';

/** Bauble colours (bright, distinguishable). */
export const BAUBLE_COLORS = ['#e53935', '#fbc02d', '#1e88e5', '#8e44ad', '#43a047', '#ec407a', '#fb8c00'];

/**
 * A glass bauble with a metal cap, a hanging loop and a highlight.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x  centre of the ball
 * @param {number} y
 * @param {number} r  radius
 * @param {string} color
 * @param {boolean} [stripe=true]  a decorative band (skipped when tiny)
 */
export function drawBauble(c, x, y, r, color, stripe = true) {
  // loop and cap
  c.strokeStyle = '#c9a227';
  c.lineWidth = Math.max(1, r * 0.1);
  c.beginPath();
  c.arc(x, y - r * 1.12, r * 0.18, 0, TAU);
  c.stroke();
  c.fillStyle = '#e0b83a';
  c.fillRect(x - r * 0.28, y - r * 1.05, r * 0.56, r * 0.26);
  // ball
  c.fillStyle = color;
  fillCircle(c, x, y, r);
  if (stripe && r > 10) {
    c.fillStyle = 'rgba(255,255,255,0.35)';
    c.beginPath();
    c.ellipse(x, y + r * 0.1, r * 0.98, r * 0.2, 0, 0, TAU);
    c.fill();
  }
  c.fillStyle = 'rgba(255,255,255,0.7)';
  c.beginPath();
  c.ellipse(x - r * 0.38, y - r * 0.38, r * 0.22, r * 0.14, -0.7, 0, TAU);
  c.fill();
}

/**
 * A fir garland hanging between hooks (a series of swags).
 * @param {CanvasRenderingContext2D} c
 * @param {Array<{x: number, y: number}>} hooks  left to right
 * @param {number} sag  how far the garland hangs down between hooks
 */
export function drawGarland(c, hooks, sag) {
  if (hooks.length < 2) return;
  c.lineCap = 'round';
  for (const [width, color] of [[9, '#1f5c3d'], [5, '#2f7a52']]) {
    c.strokeStyle = color;
    c.lineWidth = width;
    c.beginPath();
    c.moveTo(hooks[0].x, hooks[0].y);
    for (let i = 1; i < hooks.length; i++) {
      const a = hooks[i - 1];
      const b = hooks[i];
      c.quadraticCurveTo((a.x + b.x) / 2, (a.y + b.y) / 2 + sag * 2, b.x, b.y);
    }
    c.stroke();
  }
  // little red bows on the hooks
  c.fillStyle = '#d32f2f';
  for (const h of hooks) fillCircle(c, h.x, h.y, 4);
}

/**
 * A wrapped gift box with a ribbon and a bow, centred at (x, y).
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} s       width of the box
 * @param {string} color
 * @param {number} [tilt=0]
 */
export function drawGift(c, x, y, s, color, tilt = 0) {
  const ribbon = color === '#fbc02d' || color === '#ffd54f' ? '#e53935' : '#ffd54f';
  c.save();
  c.translate(x, y);
  if (tilt) c.rotate(tilt);
  const h = s * 0.8;
  c.fillStyle = color;
  c.fillRect(-s / 2, -h / 2 + s * 0.12, s, h - s * 0.12);
  c.fillStyle = 'rgba(0,0,0,0.12)';
  c.fillRect(0, -h / 2 + s * 0.12, s / 2, h - s * 0.12);
  c.fillStyle = color;
  c.fillRect(-s * 0.56, -h / 2 - s * 0.06, s * 1.12, s * 0.2);
  c.fillStyle = ribbon;
  c.fillRect(-s * 0.08, -h / 2 - s * 0.06, s * 0.16, h + s * 0.06);
  c.beginPath();
  c.ellipse(-s * 0.16, -h / 2 - s * 0.14, s * 0.17, s * 0.1, -0.5, 0, TAU);
  c.ellipse(s * 0.16, -h / 2 - s * 0.14, s * 0.17, s * 0.1, 0.5, 0, TAU);
  c.fill();
  c.restore();
}

/** Gift wrapping colours. */
export const GIFT_COLORS = ['#e53935', '#1e88e5', '#43a047', '#8e44ad', '#fbc02d', '#ec407a'];
