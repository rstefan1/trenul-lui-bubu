/**
 * @file Sparkle bursts, used as feedback when something is caught,
 * delivered or completed.
 *
 * Particles live in a fixed-size array (no allocation in steady state) and
 * fall with a little gravity while fading out.
 */

import { TAU } from '../core/math.js';
import { fillStar } from './shapes.js';

const MAX = 240;
const GRAVITY = 420;

/**
 * @typedef {object} Particle
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 * @property {number} life   seconds lived
 * @property {number} max    lifetime
 * @property {number} size
 * @property {string} color
 * @property {boolean} star
 */

export class Particles {
  constructor() {
    /** @type {Particle[]} */
    this.items = [];
  }

  /**
   * A burst of little stars and dots.
   * @param {number} x
   * @param {number} y
   * @param {ReadonlyArray<string>} colors
   * @param {number} [count=18]
   * @param {number} [speed=320]
   */
  burst(x, y, colors, count = 18, speed = 320) {
    for (let i = 0; i < count && this.items.length < MAX; i++) {
      const a = Math.random() * TAU;
      const s = (0.3 + Math.random() * 0.7) * speed;
      this.items.push({
        x, y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s - 90,
        life: 0,
        max: 0.6 + Math.random() * 0.5,
        size: 5 + Math.random() * 6,
        color: colors[i % colors.length],
        star: Math.random() < 0.55,
      });
    }
  }

  /** @param {number} dt */
  update(dt) {
    for (let i = this.items.length - 1; i >= 0; i--) {
      const p = this.items[i];
      p.life += dt;
      if (p.life >= p.max) {
        this.items[i] = this.items[this.items.length - 1];
        this.items.pop();
        continue;
      }
      p.vy += GRAVITY * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    for (const p of this.items) {
      c.globalAlpha = 1 - p.life / p.max;
      c.fillStyle = p.color;
      if (p.star) fillStar(c, p.x, p.y, p.size, p.size * 0.45);
      else {
        c.beginPath();
        c.arc(p.x, p.y, p.size * 0.5, 0, TAU);
        c.fill();
      }
    }
    c.globalAlpha = 1;
  }
}

/** Default sparkle colours. */
export const SPARKS = ['#ffd54f', '#ffffff', '#ff8a80', '#80d8ff', '#b9f6ca'];
