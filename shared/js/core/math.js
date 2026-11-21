/**
 * @file Small numeric helpers shared by every module.
 *
 * All functions are pure and allocation-free so they can be called freely
 * from the per-frame rendering code.
 */

/** A full turn, in radians. */
export const TAU = Math.PI * 2;

/**
 * Restricts a value to the closed interval [lo, hi].
 * @param {number} v
 * @param {number} lo
 * @param {number} hi
 * @returns {number}
 */
export const clamp = (v, lo, hi) => (v < lo ? lo : v > hi ? hi : v);

/**
 * Linear interpolation between a and b.
 * @param {number} a
 * @param {number} b
 * @param {number} t  0 gives a, 1 gives b (not clamped)
 * @returns {number}
 */
export const lerp = (a, b, t) => a + (b - a) * t;

/**
 * Inverse of {@link lerp}: where v lies between a and b, clamped to [0, 1].
 * @param {number} a
 * @param {number} b
 * @param {number} v
 * @returns {number}
 */
export const progress = (a, b, v) => (a === b ? 1 : clamp((v - a) / (b - a), 0, 1));

/**
 * Hermite smoothstep: 0 below e0, 1 above e1, smooth in between.
 * @param {number} e0
 * @param {number} e1
 * @param {number} x
 * @returns {number}
 */
export function smoothstep(e0, e1, x) {
  const t = progress(e0, e1, x);
  return t * t * (3 - 2 * t);
}

/**
 * Frame-rate independent exponential approach of `current` towards `target`.
 * @param {number} current
 * @param {number} target
 * @param {number} rate  larger is faster (1/seconds)
 * @param {number} dt    elapsed seconds
 * @returns {number}
 */
export const approach = (current, target, rate, dt) => target + (current - target) * Math.exp(-rate * dt);

/** Quadratic ease-in-out on [0, 1]. @param {number} t */
export const easeInOut = t => (t < 0.5 ? 2 * t * t : 1 - (-2 * t + 2) ** 2 / 2);

/** Ease-out with a small overshoot, used for "pop" animations. @param {number} t */
export function easeOutBack(t) {
  const c = 1.70158;
  return 1 + (c + 1) * (t - 1) ** 3 + c * (t - 1) ** 2;
}

/**
 * Evaluates a piecewise-linear function given by its breakpoints.
 * Outside the breakpoints the first/last value is held.
 *
 * @param {ReadonlyArray<readonly [number, number]>} points  [x, y] pairs sorted by x
 * @param {number} x
 * @returns {number}
 */
export function piecewise(points, x) {
  if (points.length === 0) return 0;
  if (x <= points[0][0]) return points[0][1];
  for (let i = 1; i < points.length; i++) {
    const [x1, y1] = points[i];
    if (x <= x1) {
      const [x0, y0] = points[i - 1];
      return lerp(y0, y1, progress(x0, x1, x));
    }
  }
  return points[points.length - 1][1];
}
