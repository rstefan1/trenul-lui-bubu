/**
 * @file The smoke of the steam locomotive: soft puffs from its chimney.
 *
 * The locomotive puffs faster the faster it goes, and slowly while it waits
 * at a station. The puffs rise, grow and fade, and the moving train leaves
 * them behind. Missions can make the smoke black for a moment (too much wood
 * on the fire) or blow a jet of steam from the whistle.
 *
 * The puffs live in a small fixed pool of typed arrays: nothing is allocated
 * while the game runs, and every puff is a single filled circle.
 */

import { TAU, clamp } from '../core/math.js';

/** At most this many puffs at once. */
const MAX = 40;

export class SteamPlume {
  constructor() {
    this.x = new Float32Array(MAX);
    this.y = new Float32Array(MAX);
    this.vx = new Float32Array(MAX);
    this.vy = new Float32Array(MAX);
    this.age = new Float32Array(MAX);
    this.life = new Float32Array(MAX);
    this.size = new Float32Array(MAX);
    /** 0 = white steam, 1 = black smoke (per puff). */
    this.soot = new Float32Array(MAX);
    /** Puffs alive (the first `count` slots). */
    this.count = 0;
    /** Seconds until the next puff. */
    this.next = 0;
    /** How black the new puffs are now (0..1); missions set it and it fades by itself. */
    this.dark = 0;
    /** How bright the smoke looks (1 by day, darker at night, when only the lamps light it). */
    this.shade = 1;
  }

  /**
   * Adds one puff.
   * @private
   * @param {number} x
   * @param {number} y
   * @param {number} vx
   * @param {number} vy
   * @param {number} size
   * @param {number} life
   * @param {number} soot
   */
  add(x, y, vx, vy, size, life, soot) {
    if (this.count >= MAX) return;
    const i = this.count++;
    this.x[i] = x;
    this.y[i] = y;
    this.vx[i] = vx;
    this.vy[i] = vy;
    this.age[i] = 0;
    this.life[i] = life;
    this.size[i] = size;
    this.soot[i] = soot;
  }

  /**
   * A jet of white steam (the whistle, or the safety valve).
   * @param {number} x  stage x
   * @param {number} y
   */
  jet(x, y) {
    for (let k = 0; k < 5; k++) this.add(x, y, -20 + Math.random() * 40, -160 - Math.random() * 80, 10 + k * 3, 0.9, 0);
  }

  /**
   * @param {number} dt
   * @param {{x: number, y: number} | null} chimney  stage position of the top of the chimney
   *        (null: no steam locomotive on screen)
   * @param {number} speed  of the train (the world moves left as fast)
   */
  update(dt, chimney, speed) {
    if (dt <= 0) return;
    this.dark = Math.max(0, this.dark - dt * 0.6);
    // the moving world leaves the puffs behind
    for (let i = this.count - 1; i >= 0; i--) {
      this.age[i] += dt;
      if (this.age[i] >= this.life[i]) {
        // the last puff takes the place of the finished one
        const j = --this.count;
        this.x[i] = this.x[j];
        this.y[i] = this.y[j];
        this.vx[i] = this.vx[j];
        this.vy[i] = this.vy[j];
        this.age[i] = this.age[j];
        this.life[i] = this.life[j];
        this.size[i] = this.size[j];
        this.soot[i] = this.soot[j];
        continue;
      }
      this.x[i] += (this.vx[i] - speed) * dt;
      this.y[i] += this.vy[i] * dt;
      this.vy[i] *= 1 - 0.8 * dt;
    }
    if (!chimney) return;
    this.next -= dt;
    if (this.next <= 0) {
      // a chuff: more often the faster the wheels turn
      this.next = clamp(0.7 - speed / 900, 0.16, 0.7);
      const soot = this.dark;
      this.add(chimney.x, chimney.y, -10 + Math.random() * 20, -90 - Math.random() * 40 - speed * 0.05,
        14 + Math.random() * 6 + soot * 8, 1.6 + Math.random() * 0.6 + soot * 0.8, soot);
    }
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const shade = this.shade;
    for (let i = 0; i < this.count; i++) {
      const k = this.age[i] / this.life[i];
      const r = this.size[i] * (1 + k * 2.4);
      const s = this.soot[i];
      // white steam turns grey and black with soot; everything darker at night
      const v = Math.round((238 - s * 190) * shade);
      c.globalAlpha = (1 - k) * (0.75 - k * 0.2);
      c.fillStyle = `rgb(${v},${v},${Math.min(255, v + 6)})`;
      c.beginPath();
      c.arc(this.x[i], this.y[i], r, 0, TAU);
      c.fill();
    }
    c.globalAlpha = 1;
  }
}
