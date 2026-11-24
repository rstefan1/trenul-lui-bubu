/**
 * @file Travel mission "hot tea": on the last climb, high in the mountains,
 * it is cold in the coaches. One child after another shivers at the window
 * ("Brr!"), and the child playing touches that window: Bubu brings a mug of
 * hot tea, and the little one warms their hands on it.
 *
 * One child at a time; a ring and a "Brr!" bubble show which window. A
 * touch on another window does nothing (no mistakes). A mug brought within
 * a few seconds earns a star. The train keeps its own pace.
 *
 * Configuration (besides id/title/text):
 *   seats   the window seats of the children (see TrainRenderer.passengerWindows)
 *   fact    shown after the last mug
 */

import { drawTouchNote } from '../gfx/hints.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { fillRoundRect } from '../gfx/shapes.js';
import { Mission } from './mission.js';

/** @typedef {import('./mission.js').MissionConfig & {seats: number[], fact: string}} TeaConfig */

/** Seconds before the first child shivers, and between a mug and the next child. */
const FIRST = 1.2;
const NEXT = 1.4;
/** A mug brought within this many seconds earns a star. */
const QUICK = 4;
/** How close to a window a touch must be (stage units). */
const REACH = 46;

export class TeaMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {TeaConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    // the children shiver in a mixed order, not window after window
    /** @type {number[]} */
    this.queue = config.seats.slice().sort(() => Math.random() - 0.5);
    /** @type {number | null} the seat of the child shivering now */
    this.cold = null;
    this.coldT = 0;
    this.wait = FIRST;
    /** @type {Set<number>} seats that have their mug */
    this.served = new Set();
    this.quick = 0;
    this.time = 0;
    this.endT = 0;
    this.particles = new Particles();
  }

  /** @param {{duration?: number, window?: {from: number, to: number}}} hints */
  start(hints) {
    super.start(hints);
    this.ctx.hud.setCounter('☕', 0, this.config.seats.length);
  }

  /**
   * Where the window of a seat is, on the stage (its middle).
   * @private
   * @param {number} seat
   */
  windowAt(seat) {
    const train = this.ctx.world.train;
    const w = train.passengerWindows[seat];
    if (!w) return null;
    const p = this.ctx.world.trainToStage(w);
    return { x: p.x + train.ride.dx, y: p.y + train.ride.dy };
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    if (this.cold === null) return;
    const w = this.windowAt(this.cold);
    if (!w || Math.abs(p.x - w.x) > REACH || Math.abs(p.y - w.y) > REACH + 20) return;
    if (this.coldT <= QUICK) this.quick += 1;
    this.served.add(this.cold);
    this.particles.burst(w.x, w.y - 10, SPARKS, 14, 160);
    this.sound('collect', w.x);
    this.cold = null;
    this.wait = NEXT;
    this.ctx.hud.setCounter('☕', this.served.size, this.config.seats.length);
    if (!this.queue.length) this.ctx.hud.announce('Toți copiii s-au încălzit!', this.config.fact, 'Misiune', 4);
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    if (this.cold !== null) this.coldT += dt;
    else if (this.queue.length && this.phase === 'running' && (this.wait -= dt) <= 0) {
      this.cold = /** @type {number} */ (this.queue.shift());
      this.coldT = 0;
      this.sound('gust');
    }
    const done = !this.queue.length && this.cold === null;
    this.endT = done ? this.endT + dt : 0;
    if (this.endT > 2 || (this.phase === 'wrapping' && this.cold === null)) this.finishMission();
  }

  /** @private */
  finishMission() {
    if (this.phase === 'finished') return;
    this.ctx.hud.hideCounter();
    const n = this.config.seats.length;
    const all = this.served.size >= n;
    this.complete(all && this.quick >= n ? 3 : all && this.quick >= n - 1 ? 2 : 1, all
      ? 'Bravo! Cu ceai cald, copiilor nu le mai e frig.'
      : 'Am ajuns sus, la Paltin!');
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    // the mugs of tea in the windows of the children who have one
    for (const seat of this.served) {
      const w = this.windowAt(seat);
      if (w) drawMug(c, w.x + 12, w.y + 10, this.time + seat);
    }
    if (this.cold !== null) {
      const w = this.windowAt(this.cold);
      if (w) {
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 6);
        c.strokeStyle = `rgba(255,214,90,${0.5 + 0.5 * pulse})`;
        c.lineWidth = 5;
        c.strokeRect(w.x - 32 - pulse * 3, w.y - 34 - pulse * 3, 64 + pulse * 6, 60 + pulse * 6);
        drawBrr(c, w.x + 20, w.y - 64 + Math.sin(this.time * 20) * 1.5);
        if (this.served.size === 0 || this.coldT > QUICK) drawTouchNote(c, this.ctx.stage, w.x, w.y - 92, 'Dă-i un ceai cald! ☕');
      }
    }
    this.particles.draw(c);
  }

  dispose() {
    this.ctx.hud.hideCounter();
  }
}

/**
 * A mug of hot tea, with steam curling up.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x  middle of the mug
 * @param {number} y  its bottom
 * @param {number} t  seconds (for the steam)
 */
function drawMug(c, x, y, t) {
  c.strokeStyle = '#ffffff';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(x + 9, y - 9, 5, -Math.PI / 2, Math.PI / 2);
  c.stroke();
  fillRoundRect(c, x - 9, y - 18, 18, 18, 4, '#ffffff');
  c.fillStyle = '#e53935';
  c.fillRect(x - 9, y - 12, 18, 4);
  c.strokeStyle = 'rgba(255,255,255,0.75)';
  c.lineWidth = 2;
  c.beginPath();
  for (const dx of [-4, 3]) {
    const wob = Math.sin(t * 3 + dx) * 3;
    c.moveTo(x + dx, y - 21);
    c.quadraticCurveTo(x + dx + wob, y - 28, x + dx, y - 34);
  }
  c.stroke();
}

/**
 * The "Brr!" bubble of a child who is cold.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 */
function drawBrr(c, x, y) {
  fillRoundRect(c, x - 38, y - 20, 76, 40, 18, '#ffffff');
  c.fillStyle = '#ffffff';
  c.beginPath();
  c.moveTo(x - 22, y + 16);
  c.lineTo(x - 30, y + 32);
  c.lineTo(x - 8, y + 18);
  c.closePath();
  c.fill();
  c.fillStyle = '#1e88e5';
  c.font = '800 24px "Baloo 2", system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('Brr! ❄', x, y + 1);
}
