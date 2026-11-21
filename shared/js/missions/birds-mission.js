/**
 * @file Travel mission "winter birds".
 *
 * In the morning the little regional train passes gardens where bird
 * feeders hang on posts. Some are empty, with hungry birds waiting on the
 * post next to them; touching an empty feeder fills it with seeds and the
 * birds fly down to eat. Feeders that are already full need nothing.
 *
 * Configuration (besides id/title/text):
 *   feeders   how many feeders pass by
 *   full      how many of them are already full (nothing to do there)
 *   pace      optional {far, slow}: the train crawls while hungry birds wait
 *             on screen and goes fast between the gardens (see TrainPace)
 */

import { TAU, clamp, lerp } from '../core/math.js';
import { Particles } from '../gfx/particles.js';
import { fillCircle, fillRoundRect, glow } from '../gfx/shapes.js';
import { TRACK_Y } from '../world/track.js';
import { Mission } from './mission.js';
import { TrainPace } from './pace.js';

/** Ground of the gardens in front of the track (stage units). */
const GARDEN_Y = TRACK_Y + 115;
/** Height of a feeder's post. */
const POST = 150;
/** Bird colours: robin, blue tit, bullfinch. */
const BIRDS = [
  { body: '#8d6e63', breast: '#ff7043' },
  { body: '#5c8fd6', breast: '#ffd54f' },
  { body: '#455a64', breast: '#e53935' },
];

/**
 * @typedef {object} Feeder
 * @property {number} worldX
 * @property {boolean} full
 * @property {boolean} hungry   birds wait here (an empty feeder)
 * @property {number} fedT      seconds since it was filled (−1 = not yet)
 * @property {number[]} birds   kinds of the birds around it
 *
 * @typedef {import('./mission.js').MissionConfig & {feeders: number, full: number, pace?: import('./pace.js').PaceOptions}} BirdsConfig
 */

/** Where the front of the train stands during the mission (share of the screen's width). */
const LOOK_AHEAD = 0.55;

export class BirdsMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {BirdsConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {Feeder[]} */
    this.feeders = [];
    this.fed = 0;
    this.mistakes = 0;
    this.time = 0;
    this.particles = new Particles();
  }

  /** @param {{duration?: number, window?: {from: number, to: number}}} hints */
  start(hints) {
    super.start(hints);
    const j = this.ctx.journey;
    const seg = j.segment;
    const end = seg.start + (hints.window ? hints.window.to : 0.85) * seg.length;
    const first = j.distance + 1600;
    const n = this.config.feeders;
    const spacing = (end - first) / n;
    // full feeders are spread out, never the first one
    const full = new Set();
    while (full.size < Math.min(this.config.full, n - 1)) full.add(1 + Math.floor(Math.random() * (n - 1)));
    this.feeders = Array.from({ length: n }, (_, i) => ({
      worldX: first + spacing * (i + 0.3 + Math.random() * 0.4),
      full: full.has(i),
      hungry: !full.has(i),
      fedT: -1,
      birds: [i % 3, (i + 1) % 3, (i + 2) % 3].slice(0, 2 + (i % 2)),
    }));
    /** @type {TrainPace | null} */
    this.pace = this.config.pace ? new TrainPace(j, this.config.pace) : null;
    this.ctx.hud.setCounter('🐦', 0, this.hungryCount);
  }

  get hungryCount() {
    return this.feeders.filter(f => f.hungry).length;
  }

  /** Screen x of a world position. */
  toScreen(/** @type {number} */ x) {
    return x - this.ctx.journey.distance + this.ctx.world.anchorX;
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    const cam = this.ctx.world.cameraY;
    const reach = Math.max(80, 50 / this.ctx.stage.scale);
    for (const f of this.feeders) {
      const x = this.toScreen(f.worldX);
      const y = GARDEN_Y - POST - 20 - cam;
      if (Math.hypot(p.x - x, p.y - y) > reach) continue;
      if (f.hungry && f.fedT < 0) {
        f.fedT = 0;
        this.fed += 1;
        this.particles.burst(x, y, ['#d7b46a', '#f3dfa2', '#8d6e63'], 16, 160);
        this.ctx.hud.setCounter('🐦', this.fed, this.hungryCount);
      } else if (f.full) {
        this.mistakes += 1;
      }
      return;
    }
  }

  /** @param {number} dt */
  update(dt) {
    // the train moves to the middle of the screen: what comes is seen early
    this.ctx.world.lookAhead(this.phase === 'finished' ? null : LOOK_AHEAD);
    this.time += dt;
    this.particles.update(dt);
    if (this.pace) {
      const stage = this.ctx.stage;
      this.pace.slowNear(this.feeders.filter(f => f.hungry && f.fedT < 0).map(f => this.toScreen(f.worldX)), { left: stage.viewLeft, right: stage.viewRight });
    }
    for (const f of this.feeders) if (f.fedT >= 0) f.fedT += dt;
    // over when every hungry feeder is filled (and the birds have flown down),
    // or when the last feeder has gone by
    const left = this.ctx.stage.viewLeft - 200;
    const allFed = this.feeders.every(f => !f.hungry || f.fedT > 1.2);
    const lastGone = this.toScreen(this.feeders[this.feeders.length - 1].worldX) < left;
    if (allFed || lastGone || this.phase === 'wrapping') this.finishMission();
  }

  /** @private */
  finishMission() {
    if (this.phase === 'finished') return;
    this.ctx.hud.hideCounter();
    this.pace?.release();
    const total = this.hungryCount;
    const k = this.fed / total;
    this.complete(k >= 1 ? (this.mistakes <= 1 ? 3 : 2) : k >= 0.5 ? 2 : 1,
      k >= 1 ? 'Toate păsărelele au primit semințe!' : `Ai hrănit păsările de la ${this.fed} căsuțe din ${total}.`);
  }

  /**
   * A clear hint over a hungry feeder: a pulsing golden ring, a bouncing
   * arrow and the words "Atinge aici!".
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {number} x
   * @param {number} top  top of the post
   */
  drawHint(c, x, top) {
    const pulse = (this.time * 1.4) % 1;
    c.save();
    c.strokeStyle = `rgba(255,214,90,${1 - pulse})`;
    c.lineWidth = 6;
    c.beginPath();
    c.arc(x, top - 32, 50 + pulse * 40, 0, TAU);
    c.stroke();
    const bob = Math.abs(Math.sin(this.time * 4)) * 14;
    c.fillStyle = '#ffd23f';
    c.strokeStyle = '#7a5a00';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x, top - 96 + bob);
    c.lineTo(x - 22, top - 128 + bob);
    c.lineTo(x - 9, top - 128 + bob);
    c.lineTo(x - 9, top - 156 + bob);
    c.lineTo(x + 9, top - 156 + bob);
    c.lineTo(x + 9, top - 128 + bob);
    c.lineTo(x + 22, top - 128 + bob);
    c.closePath();
    c.fill();
    c.stroke();
    c.font = '800 24px "Baloo 2", system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.lineWidth = 6;
    c.strokeStyle = 'rgba(27,36,64,0.85)';
    c.strokeText('Atinge aici!', x, top - 180 + bob);
    c.fillStyle = '#ffffff';
    c.fillText('Atinge aici!', x, top - 180 + bob);
    c.restore();
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const stage = this.ctx.stage;
    const cam = this.ctx.world.cameraY;
    // the first two hungry feeders show very clearly what to do
    const hints = new Set(this.feeders.filter(f => f.hungry).slice(0, 2).filter(f => f.fedT < 0));
    for (const f of this.feeders) {
      const x = this.toScreen(f.worldX);
      if (x < stage.viewLeft - 160 || x > stage.viewRight + 160) continue;
      const ground = GARDEN_Y - cam;
      const top = ground - POST;
      // snow mound, post and feeder
      c.fillStyle = '#eef3fb';
      c.beginPath();
      c.ellipse(x, ground, 60, 14, 0, 0, TAU);
      c.fill();
      c.fillStyle = '#6d4c41';
      c.fillRect(x - 5, top, 10, POST);
      const filled = f.full || f.fedT >= 0;
      if (f.hungry && f.fedT < 0) glow(c, x, top - 20, 70, `rgba(255,236,150,${0.35 + 0.15 * Math.sin(this.time * 5)})`, 'rgba(255,236,150,0)');
      if (hints.has(f)) this.drawHint(c, x, top);
      fillRoundRect(c, x - 40, top - 14, 80, 16, 4, '#8d6e63');          // tray
      fillRoundRect(c, x - 30, top - 52, 60, 40, 4, '#a1887f');          // box
      c.fillStyle = '#5d4037';
      c.beginPath();
      c.moveTo(x - 46, top - 50);
      c.lineTo(x, top - 82);
      c.lineTo(x + 46, top - 50);
      c.closePath();
      c.fill();
      c.fillStyle = '#f4f8ff';
      c.beginPath();
      c.moveTo(x - 46, top - 50);
      c.lineTo(x, top - 82);
      c.lineTo(x + 46, top - 50);
      c.lineTo(x + 40, top - 46);
      c.lineTo(x, top - 74);
      c.lineTo(x - 40, top - 46);
      c.closePath();
      c.fill();
      c.fillStyle = '#3e2723';
      fillCircle(c, x, top - 32, 11);
      if (filled) {
        c.fillStyle = '#d7b46a';
        for (let k = 0; k < 9; k++) fillCircle(c, x - 30 + k * 7.5, top - 15 + (k % 2) * 2, 3);
      }
      // the birds: waiting on the post (hungry) or eating on the tray
      f.birds.forEach((kind, i) => {
        const side = i % 2 ? 1 : -1;
        const wait = { x: x + side * 22, y: top + 30 + i * 32 };
        const eat = { x: x + (i - 1) * 24, y: top - 22 };
        const k = f.full ? 1 : f.fedT >= 0 ? clamp(f.fedT / 0.8, 0, 1) : 0;
        const bx = lerp(wait.x, eat.x, k);
        const by = lerp(wait.y, eat.y, k) - Math.sin(k * Math.PI) * 40;
        const peck = k >= 1 ? Math.abs(Math.sin(this.time * 6 + i)) * 4 : 0;
        drawBird(c, bx, by + peck, 13, BIRDS[kind], side, k > 0 && k < 1 ? this.time : null);
      });
    }
    this.particles.draw(c);
  }

  dispose() {
    super.dispose();
    this.pace?.release();
    this.ctx.world.lookAhead(null);
  }
}

/**
 * A small round bird.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {{body: string, breast: string}} col
 * @param {number} facing  1 = right, −1 = left
 * @param {number | null} flap  time, while flying (wings beat)
 */
function drawBird(c, x, y, r, col, facing, flap) {
  c.save();
  c.translate(x, y);
  c.scale(facing, 1);
  c.fillStyle = col.body;
  c.beginPath();
  c.ellipse(0, 0, r * 1.2, r, 0, 0, TAU);
  c.fill();
  c.fillStyle = col.breast;
  c.beginPath();
  c.ellipse(r * 0.4, r * 0.25, r * 0.7, r * 0.6, 0, 0, TAU);
  c.fill();
  fillCircle(c, r * 0.9, -r * 0.55, r * 0.62);
  c.fillStyle = col.body;
  fillCircle(c, r * 0.95, -r * 0.7, r * 0.55);
  c.fillStyle = '#1b1b1b';
  fillCircle(c, r * 1.15, -r * 0.75, r * 0.12);
  c.fillStyle = '#f9a825';
  c.beginPath();
  c.moveTo(r * 1.45, -r * 0.65);
  c.lineTo(r * 1.85, -r * 0.55);
  c.lineTo(r * 1.45, -r * 0.42);
  c.fill();
  // wing
  c.fillStyle = 'rgba(0,0,0,0.25)';
  c.beginPath();
  const lift = flap === null ? 0 : Math.sin(flap * 30) * r * 0.8;
  c.ellipse(-r * 0.2, -r * 0.1 - lift * 0.5, r * 0.75, r * 0.45 + Math.abs(lift) * 0.3, -0.3, 0, TAU);
  c.fill();
  // tail
  c.fillStyle = col.body;
  c.beginPath();
  c.moveTo(-r * 1.1, -r * 0.1);
  c.lineTo(-r * 1.9, -r * 0.5);
  c.lineTo(-r * 1.8, r * 0.2);
  c.fill();
  c.restore();
}
