/**
 * @file Colour helpers.
 *
 * Colours are kept as `[r, g, b]` triples (0–255) whenever they must be
 * interpolated, and converted to CSS strings only when drawing.
 */

import { clamp, lerp } from '../core/math.js';

/** @typedef {[number, number, number]} Rgb */

/**
 * Parses "#rgb" or "#rrggbb".
 * @param {string} hex
 * @returns {Rgb}
 */
export function hexToRgb(hex) {
  let h = hex.replace('#', '');
  if (h.length === 3) h = h.replace(/./g, c => c + c);
  const n = parseInt(h, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/**
 * Interpolates two colours component-wise.
 * @param {Rgb} a
 * @param {Rgb} b
 * @param {number} t
 * @returns {Rgb}
 */
export const mixRgb = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];

/**
 * CSS colour string.
 * @param {Rgb} c
 * @param {number} [alpha=1]
 * @returns {string}
 */
export function css(c, alpha = 1) {
  const r = Math.round(c[0]);
  const g = Math.round(c[1]);
  const b = Math.round(c[2]);
  return alpha >= 1 ? `rgb(${r},${g},${b})` : `rgba(${r},${g},${b},${clamp(alpha, 0, 1).toFixed(3)})`;
}

/**
 * Mixes two hex colours and returns a CSS string.
 * @param {string} a
 * @param {string} b
 * @param {number} t
 */
export const mixHex = (a, b, t) => css(mixRgb(hexToRgb(a), hexToRgb(b), t));

/**
 * Applies a translucent overlay to a colour, exactly as the compositor does
 * on the canvas (source-over blending). Used for flat fills that must match
 * tinted bitmaps.
 * @param {Rgb} base
 * @param {Rgb} overlay
 * @param {number} alpha
 * @returns {Rgb}
 */
export const overlayRgb = (base, overlay, alpha) => mixRgb(base, overlay, clamp(alpha, 0, 1));
