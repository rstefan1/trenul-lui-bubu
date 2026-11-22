/**
 * @file Travel mission "catch the flying ornaments".
 *
 * Ornaments drift across the sky towards the back of the train, bobbing in
 * the wind. When the child touches one, Bubu throws her magic net from the
 * window: a golden line reaches the ornament, which then flies in an arc to
 * the train and hangs on its garland. Ornaments that are not caught simply
 * fly away. Later ornaments are a little faster and smaller, so the mission
 * stays interesting until the end.
 *
 * Configuration (besides id/title/text):
 *   count   how many ornaments appear, or "fill" for exactly as many as there
 *           are free places on the train (so the whole train can be decorated)
 *   goal    how many are needed for three stars, or a fraction (< 1) of count
 */

import { clamp, easeInOut, lerp } from '../core/math.js';
import { BAUBLE_COLORS, drawBauble } from '../gfx/ornaments.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { glow } from '../gfx/shapes.js';
import { HANGING_BAUBLE_R } from '../train/train-renderer.js';
import { Mission } from './mission.js';

/** Seconds for the net to reach the ornament. */
const NET_TIME = 0.22;
/** Seconds for the caught ornament to fly to the train. */
const FLY_TIME = 0.8;
/** Extra touch tolerance around an ornament (fingers are big). */
const TOUCH_SLACK = 46;
/**
 * Horizontal speed of the ornaments (stage units per second), from the first
 * to the last one. Slow enough that a child can comfortably touch them: an
 * ornament crosses a laptop screen in about ten seconds.
 */
const MIN_SPEED = 130;
const MAX_SPEED = 185;
/** Vertical band of the sky where ornaments fly (stage units). */
const SKY_TOP = 170;
const SKY_BOTTOM = 520;

/**
 * @typedef {object} Ornament
 * @property {number} x
 * @property {number} y
 * @property {number} baseY
 * @property {number} vx
 * @property {number} r
 * @property {number} phase
 * @property {string} color
 * @property {'free' | 'caught'} state
 * @property {number} t          seconds since caught
 * @property {number} cx         where it was caught
 * @property {number} cy
 * @property {number} slot       index of its slot on the train
 */

/**
 * @typedef {import('./mission.js').MissionConfig & {count: number | 'fill', goal: number}} CatchConfig
 */

export class CatchMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {CatchConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {Ornament[]} */
    this.ornaments = [];
    this.spawned = 0;
    this.caught = 0;
    this.count = 0;
    this.goal = 0;
    this.spawnEvery = 3;
    this.spawnTimer = 0.8;
    this.time = 0;
    this.particles = new Particles();
    /** @type {Array<{x: number, y: number, t: number}>} */
    this.misses = [];
  }

  /** @param {{duration?: number}} hints */
  start(hints) {
    super.start(hints);
    const duration = hints.duration ?? 36;
    // leave the last seconds free, so the last ornament can still be caught
    const { count, goal } = this.config;
    const free = this.ctx.world.train.baubleSlots.length - this.ctx.state.baubles.length;
    /** Number of ornaments that will appear. */
    this.count = count === 'fill' ? Math.max(1, free) : count;
    /** Ornaments needed for three stars. */
    this.goal = goal < 1 ? Math.ceil(this.count * goal) : Math.min(goal, this.count);
    this.spawnEvery = Math.max(1.4, (duration - 10) / this.count);
    this.ctx.hud.setCounter('🎄', 0, this.goal);
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    if (this.phase === 'running' && this.spawned < this.count) {
      this.spawnTimer -= dt;
      if (this.spawnTimer <= 0) {
        this.spawn();
        this.spawnTimer = this.spawnEvery;
      }
    }

    const left = this.ctx.stage.viewLeft - 80;
    for (let i = this.ornaments.length - 1; i >= 0; i--) {
      const o = this.ornaments[i];
      if (o.state === 'free') {
        o.x += o.vx * dt;
        o.y = o.baseY + Math.sin(this.time * 1.6 + o.phase) * 18;
        if (o.x < left) this.ornaments.splice(i, 1);
      } else {
        o.t += dt;
        if (o.t >= NET_TIME + FLY_TIME) {
          this.ctx.state.addBauble(o.color);
          const p = this.slotStage(o.slot);
          this.particles.burst(p.x, p.y, SPARKS, 14, 220);
          this.ornaments.splice(i, 1);
        }
      }
    }
    for (let i = this.misses.length - 1; i >= 0; i--) {
      if ((this.misses[i].t += dt) > 0.4) this.misses.splice(i, 1);
    }

    const allOut = this.spawned >= this.count && this.ornaments.length === 0;
    if ((this.phase === 'wrapping' && this.ornaments.length === 0) || (this.phase === 'running' && allOut)) {
      this.ctx.hud.hideCounter();
      this.complete(this.starsFor(this.caught), this.textFor(this.caught));
    }
  }

  /** @private Creates one ornament just beyond the right edge. */
  spawn() {
    const k = this.spawned / Math.max(1, this.count - 1);   // 0 → 1 along the mission
    const stage = this.ctx.stage;
    this.ornaments.push({
      x: stage.viewRight + 60,
      y: 0,
      baseY: lerp(SKY_TOP, SKY_BOTTOM, Math.random()),
      vx: -lerp(MIN_SPEED, MAX_SPEED, k) * (0.9 + Math.random() * 0.2),
      r: lerp(36, 31, k),
      phase: Math.random() * 6.28,
      color: BAUBLE_COLORS[this.spawned % BAUBLE_COLORS.length],
      state: 'free',
      t: 0,
      cx: 0,
      cy: 0,
      slot: 0,
    });
    this.spawned += 1;
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    let best = null;
    let bestDist = Infinity;
    for (const o of this.ornaments) {
      if (o.state !== 'free') continue;
      const d = Math.hypot(o.x - p.x, o.y - p.y);
      if (d < o.r + TOUCH_SLACK && d < bestDist) {
        best = o;
        bestDist = d;
      }
    }
    if (!best) {
      this.misses.push({ x: p.x, y: p.y, t: 0 });
      return;
    }
    const inFlight = this.ornaments.filter(o => o.state === 'caught').length;
    best.state = 'caught';
    best.t = 0;
    best.cx = best.x;
    best.cy = best.y;
    best.slot = this.ctx.state.baubles.length + inFlight;
    this.caught += 1;
    this.ctx.hud.setCounter('🎄', this.caught, this.goal);
    this.particles.burst(best.x, best.y, [best.color, '#ffffff', '#ffd54f'], 10, 180);
    this.sound('collect');
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const bubu = this.ctx.world.trainToStage(this.ctx.world.train.bubuPosition);
    for (const o of this.ornaments) {
      if (o.state === 'free') {
        const tw = 0.5 + 0.5 * Math.sin(this.time * 5 + o.phase);
        glow(c, o.x, o.y, o.r * 1.9, `rgba(255,240,170,${0.25 + 0.2 * tw})`, 'rgba(255,240,170,0)');
        drawBauble(c, o.x, o.y, o.r, o.color);
        continue;
      }
      if (o.t < NET_TIME) {
        // the magic net flies from Bubu to the ornament
        const k = o.t / NET_TIME;
        const tx = lerp(bubu.x, o.cx, k);
        const ty = lerp(bubu.y, o.cy, k);
        c.strokeStyle = 'rgba(255,215,90,0.95)';
        c.lineWidth = 4;
        c.setLineDash([10, 8]);
        c.beginPath();
        c.moveTo(bubu.x, bubu.y);
        c.quadraticCurveTo((bubu.x + tx) / 2, Math.min(bubu.y, ty) - 80, tx, ty);
        c.stroke();
        c.setLineDash([]);
        c.beginPath();
        c.arc(tx, ty, 16 + 20 * k, 0, Math.PI * 2);
        c.stroke();
        drawBauble(c, o.cx, o.cy, o.r, o.color);
      } else {
        // the ornament flies in an arc to its place on the train, shrinking
        const k = easeInOut(clamp((o.t - NET_TIME) / FLY_TIME, 0, 1));
        const to = this.slotStage(o.slot);
        const x = lerp(o.cx, to.x, k);
        const y = lerp(o.cy, to.y, k) - Math.sin(Math.PI * k) * 90;
        drawBauble(c, x, y, lerp(o.r, HANGING_BAUBLE_R, k), o.color, k < 0.6);
      }
    }
    for (const m of this.misses) {
      c.strokeStyle = `rgba(255,255,255,${0.7 * (1 - m.t / 0.4)})`;
      c.lineWidth = 3;
      c.beginPath();
      c.arc(m.x, m.y, 12 + m.t * 60, 0, Math.PI * 2);
      c.stroke();
    }
    this.particles.draw(c);
  }

  /**
   * Stage position of a bauble slot on the train.
   * @private
   * @param {number} index
   */
  slotStage(index) {
    const slots = this.ctx.world.train.baubleSlots;
    const s = slots[Math.min(index, slots.length - 1)];
    return this.ctx.world.trainToStage(s);
  }

  /** @private @param {number} n */
  starsFor(n) {
    const goal = this.goal;
    return n >= goal ? 3 : n >= Math.ceil(goal * 0.6) ? 2 : 1;
  }

  /** @private @param {number} n */
  textFor(n) {
    if (n >= this.goal) return `Super! Ai prins ${n} globuri și trenul s-a împodobit!`;
    if (n > 0) return `Ai prins ${n} ${n === 1 ? 'glob' : 'globuri'}. Trenul arată deja mai vesel!`;
    return 'Globurile au zburat… dar mai sunt multe de prins pe drum!';
  }
}
