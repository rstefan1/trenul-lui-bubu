/**
 * @file Fireworks over the night sky, light on the processor and memory.
 *
 * How it stays light:
 *   - every spark lives in one fixed pool of typed arrays, made once: nothing
 *     is allocated while the fireworks play (no garbage to collect);
 *   - there are never more than a few rockets and bursts at once;
 *   - the sparks of one burst share their colour and their fading, so a
 *     whole burst is drawn as one path of small squares and one fill (no
 *     shadows, no blur, no gradients per spark, no full-screen trails);
 *   - when the show is over nothing is left to update or draw.
 *
 * Burst shapes: "peony" (a ball of sparks), "ring", "heart" and "willow"
 * (golden sparks falling slowly, like branches).
 */

import { TAU } from '../core/math.js';
import { glow } from './shapes.js';

/** Sparks, bursts and rockets alive at once, at most. */
const MAX_SPARKS = 480;
const MAX_BURSTS = 8;
const MAX_ROCKETS = 4;
/** Gravity on the sparks and on the rockets (stage units/s²). */
const GRAVITY = 70;
const ROCKET_GRAVITY = 160;

/** @typedef {'peony' | 'ring' | 'heart' | 'willow'} BurstShape */

/**
 * @typedef {object} Burst
 * @property {boolean} on
 * @property {string} color
 * @property {number} x
 * @property {number} y
 * @property {number} age
 * @property {number} life
 * @property {number} drag    how quickly the sparks slow down (per second)
 */

/**
 * @typedef {object} Rocket
 * @property {boolean} on
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 * @property {string} color
 * @property {BurstShape} shape
 * @property {number} size
 */

export class Fireworks {
  /** @param {{sparks?: number}} [o]  fewer sparks on small or slow devices */
  constructor(o = {}) {
    this.maxSparks = Math.min(MAX_SPARKS, o.sparks ?? MAX_SPARKS);
    this.sx = new Float32Array(MAX_SPARKS);
    this.sy = new Float32Array(MAX_SPARKS);
    this.svx = new Float32Array(MAX_SPARKS);
    this.svy = new Float32Array(MAX_SPARKS);
    /** The burst every spark belongs to. */
    this.sb = new Uint8Array(MAX_SPARKS);
    this.sparks = 0;
    /** @type {Burst[]} */
    this.bursts = Array.from({ length: MAX_BURSTS }, () => ({ on: false, color: '#fff', x: 0, y: 0, age: 0, life: 1, drag: 1 }));
    /** @type {Rocket[]} */
    this.rockets = Array.from({ length: MAX_ROCKETS }, () => ({ on: false, x: 0, y: 0, vx: 0, vy: 0, color: '#fff', shape: /** @type {BurstShape} */ ('peony'), size: 1 }));
    /** Called when a rocket goes up and when it bursts (for the sounds). */
    /** @type {(what: 'launch' | 'burst', x: number) => void} */
    this.onEvent = () => {};
  }

  /** True while something still flies or glows. */
  get busy() {
    return this.sparks > 0 || this.rockets.some(r => r.on) || this.bursts.some(b => b.on);
  }

  /**
   * Sends a rocket up from the ground; it bursts at the top of its flight.
   * @param {number} x       where it starts
   * @param {number} y
   * @param {number} height  how high it bursts above its start (stage units)
   * @param {string} color
   * @param {BurstShape} [shape='peony']
   * @param {number} [size=1]  how wide the burst opens
   * @returns {boolean} false if too many rockets are in the air already
   */
  launch(x, y, height, color, shape = 'peony', size = 1) {
    const r = this.rockets.find(x => !x.on);
    if (!r) return false;
    r.on = true;
    r.x = x;
    r.y = y;
    // just fast enough to reach the height
    r.vy = -Math.sqrt(2 * ROCKET_GRAVITY * height);
    r.vx = (Math.random() - 0.5) * 30;
    r.color = color;
    r.shape = shape;
    r.size = size;
    this.onEvent('launch', x);
    return true;
  }

  /**
   * A burst of sparks.
   * @private
   * @param {Rocket} r
   */
  burst(r) {
    const slot = this.bursts.findIndex(b => !b.on);
    if (slot < 0) return;
    const b = this.bursts[slot];
    const willow = r.shape === 'willow';
    b.on = true;
    b.color = r.color;
    b.x = r.x;
    b.y = r.y;
    b.age = 0;
    b.life = willow ? 3 : 1.8;
    b.drag = willow ? 1.6 : 1.1;
    const n = Math.min(r.shape === 'heart' ? 70 : 64, this.maxSparks - this.sparks);
    const speed = (willow ? 170 : 260) * r.size;
    for (let k = 0; k < n; k++) {
      const a = (k / n) * TAU;
      let vx;
      let vy;
      if (r.shape === 'ring') {
        vx = Math.cos(a) * speed;
        vy = Math.sin(a) * speed;
      } else if (r.shape === 'heart') {
        // the heart curve, upright
        const hx = 16 * Math.sin(a) ** 3;
        const hy = 13 * Math.cos(a) - 5 * Math.cos(2 * a) - 2 * Math.cos(3 * a) - Math.cos(4 * a);
        vx = (hx / 16) * speed;
        vy = (-hy / 16) * speed;
      } else {
        const s = speed * (0.35 + Math.random() * 0.65);
        const aa = Math.random() * TAU;
        vx = Math.cos(aa) * s;
        vy = Math.sin(aa) * s;
      }
      const i = this.sparks++;
      this.sx[i] = r.x;
      this.sy[i] = r.y;
      this.svx[i] = vx;
      this.svy[i] = vy;
      this.sb[i] = slot;
    }
    this.onEvent('burst', r.x);
  }

  /** @param {number} dt */
  update(dt) {
    if (dt <= 0) return;
    for (const r of this.rockets) {
      if (!r.on) continue;
      r.vy += ROCKET_GRAVITY * dt;
      r.x += r.vx * dt;
      r.y += r.vy * dt;
      if (r.vy >= -20) {
        r.on = false;
        this.burst(r);
      }
    }
    for (const b of this.bursts) {
      if (!b.on) continue;
      b.age += dt;
      if (b.age >= b.life) b.on = false;
    }
    for (let i = this.sparks - 1; i >= 0; i--) {
      const b = this.bursts[this.sb[i]];
      if (!b.on) {
        // the burst has faded: the last spark takes this one's place
        const j = --this.sparks;
        this.sx[i] = this.sx[j];
        this.sy[i] = this.sy[j];
        this.svx[i] = this.svx[j];
        this.svy[i] = this.svy[j];
        this.sb[i] = this.sb[j];
        continue;
      }
      const slow = 1 - Math.min(1, b.drag * dt);
      this.svx[i] *= slow;
      this.svy[i] = this.svy[i] * slow + GRAVITY * dt;
      this.sx[i] += this.svx[i] * dt;
      this.sy[i] += this.svy[i] * dt;
    }
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    // the rockets: a bright head and a short trail
    c.lineWidth = 3;
    c.lineCap = 'round';
    for (const r of this.rockets) {
      if (!r.on) continue;
      c.strokeStyle = 'rgba(255,220,150,0.7)';
      c.beginPath();
      c.moveTo(r.x, r.y);
      c.lineTo(r.x - r.vx * 0.06, r.y - r.vy * 0.06);
      c.stroke();
      c.fillStyle = '#fff6d8';
      c.fillRect(r.x - 2.5, r.y - 2.5, 5, 5);
    }
    // the bursts: a flash at first, then all the sparks of the burst in one fill
    for (let slot = 0; slot < MAX_BURSTS; slot++) {
      const b = this.bursts[slot];
      if (!b.on) continue;
      const k = b.age / b.life;
      if (b.age < 0.25) glow(c, b.x, b.y, 120, `rgba(255,245,220,${0.5 * (1 - b.age / 0.25)})`, 'rgba(255,245,220,0)');
      // the sparks twinkle a little as they fade
      c.globalAlpha = Math.max(0, 1 - k * k) * (k > 0.6 ? 0.75 + 0.25 * Math.sin(b.age * 40) : 1);
      c.fillStyle = b.color;
      c.beginPath();
      const s = k < 0.5 ? 6 : 4;
      for (let i = 0; i < this.sparks; i++) {
        if (this.sb[i] === slot) c.rect(this.sx[i] - s / 2, this.sy[i] - s / 2, s, s);
      }
      c.fill();
    }
    c.globalAlpha = 1;
  }
}
