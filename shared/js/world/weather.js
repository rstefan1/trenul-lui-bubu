/**
 * @file Falling snow.
 *
 * A fixed pool of flakes is allocated once; the intensity (0..1) decides how
 * many of them are visible, so snow can start gently, grow into a real
 * snowfall and stop again without allocating anything. Flakes drift
 * backwards relative to the moving train, which gives a strong feeling of
 * speed. All flakes are drawn as a single path (one fill per frame).
 */

import { TAU } from '../core/math.js';

/**
 * @typedef {object} Flake
 * @property {number} x
 * @property {number} y
 * @property {number} r       radius
 * @property {number} fall    vertical speed
 * @property {number} depth   0 (far, slow) .. 1 (near, fast)
 * @property {number} phase
 */

export class Snowfall {
  /**
   * @param {import('../core/stage.js').Stage} stage
   * @param {number} maxFlakes
   */
  constructor(stage, maxFlakes) {
    this.stage = stage;
    /** @type {Flake[]} */
    this.flakes = Array.from({ length: maxFlakes }, () => this.spawn(true));
    this.intensity = 0;
  }

  /**
   * @private
   * @param {boolean} anywhere  true: anywhere on screen; false: above the top
   * @returns {Flake}
   */
  spawn(anywhere) {
    const { viewTop, viewBottom, width } = this.stage;
    const depth = Math.random();
    return {
      x: Math.random() * (width + 400) - 200,
      y: anywhere ? viewTop + Math.random() * (viewBottom - viewTop) : viewTop - 10 - Math.random() * 60,
      r: 1.6 + depth * 3.8,
      fall: 40 + depth * 70,
      depth,
      phase: Math.random() * TAU,
    };
  }

  /**
   * @param {number} dt
   * @param {number} intensity  0..1
   * @param {number} trainSpeed world units per second (flakes drift backwards)
   * @param {number} time
   */
  update(dt, intensity, trainSpeed, time) {
    this.intensity = intensity;
    if (intensity <= 0.001) return;
    const { viewBottom, width } = this.stage;
    for (let i = 0; i < this.flakes.length; i++) {
      const f = this.flakes[i];
      f.y += f.fall * dt;
      f.x += (Math.sin(time * 0.9 + f.phase) * 16 - trainSpeed * (0.15 + 0.5 * f.depth)) * dt;
      if (f.y > viewBottom + 10) this.flakes[i] = this.spawn(false);
      else if (f.x < -220) f.x += width + 440;
      else if (f.x > width + 220) f.x -= width + 440;
    }
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const n = Math.round(this.flakes.length * this.intensity);
    if (n === 0) return;
    c.fillStyle = 'rgba(255,255,255,0.88)';
    c.beginPath();
    for (let i = 0; i < n; i++) {
      const f = this.flakes[i];
      c.moveTo(f.x + f.r, f.y);
      c.arc(f.x, f.y, f.r, 0, TAU);
    }
    c.fill();
  }
}
