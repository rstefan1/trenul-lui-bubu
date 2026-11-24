/**
 * @file Travel mission "the straps of the load": in the curves of the valley
 * the load on a flat wagon starts to shift, and the child tightens its strap
 * before anything falls off.
 *
 * One good at a time starts to wobble on the wagon, with a loose strap
 * flapping and a "Strânge chinga!" note pointing at it; a tap tightens the
 * strap. Nothing can fall: the good waits until it is tapped, and a quick
 * tap (within a few seconds) earns a star in the counter.
 *
 * Configuration (besides id/title/text):
 *   load     the load on the wagon (a key of LOADS)
 *   wagon    which flat wagon (0 = the first behind the locomotive)
 *   shakes   the goods that wobble, in order (indexes in the load)
 */

import { clamp } from '../core/math.js';
import { LOADS, drawCargoItem } from '../gfx/cargo.js';
import { drawTouchNote } from '../gfx/hints.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { Mission } from './mission.js';

/**
 * @typedef {import('./mission.js').MissionConfig & {load: string, wagon: number, shakes: number[]}} StrapsConfig
 */

/** Seconds before the first good wobbles, and between a tightened strap and the next wobble. */
const FIRST_AFTER = 1.5;
const PAUSE = 2.5;
/** A tap within this many seconds is quick enough for a star. */
const QUICK = 4;
/** Room around a good that still counts as touching it (stage units). */
const TOUCH_MARGIN = 30;

export class StrapsMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {StrapsConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    this.load = LOADS[config.load];
    /** Index (in `shakes`) of the good wobbling now, or of the next one. */
    this.current = 0;
    /** True while the current good wobbles; seconds it has been wobbling, or until the next one. */
    this.wobbling = false;
    this.t = -FIRST_AFTER;
    this.quick = 0;
    this.time = 0;
    this.particles = new Particles();
  }

  /** @param {{duration?: number, window?: {from: number, to: number}}} hints */
  start(hints) {
    super.start(hints);
    this.ctx.hud.setCounter('⭐', 0, this.config.shakes.length);
  }

  /** @private The wagon carrying the load (laid out by the train renderer). */
  wagonCar() {
    const wagons = this.ctx.world.train.cars.filter(c => c.spec.kind === 'platform');
    return wagons[Math.min(this.config.wagon, wagons.length - 1)];
  }

  /**
   * The good wobbling now, and where it is on the stage (bottom centre).
   * @private
   */
  wobbler() {
    if (!this.wobbling) return null;
    const slot = this.load[this.config.shakes[this.current]];
    const p = this.ctx.world.trainToStage({ x: this.wagonCar().left + slot.x, y: slot.bottom });
    return { slot, x: p.x, y: p.y };
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    const w = this.wobbler();
    if (!w) return;
    const inside = Math.abs(p.x - w.x) < w.slot.w / 2 + TOUCH_MARGIN
      && p.y > w.y - w.slot.h - TOUCH_MARGIN && p.y < w.y + TOUCH_MARGIN;
    if (!inside) return;
    if (this.t <= QUICK) this.quick += 1;
    this.particles.burst(w.x, w.y - w.slot.h / 2, SPARKS, 16, 200);
    this.sound('ding', w.x);
    this.ctx.hud.setCounter('⭐', this.quick, this.config.shakes.length);
    this.wobbling = false;
    this.current += 1;
    this.t = -PAUSE;
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.t += dt;
    this.particles.update(dt);
    const done = this.current >= this.config.shakes.length;
    if (!this.wobbling && !done && this.t >= 0 && this.phase === 'running') {
      this.wobbling = true;
      this.t = 0;
      this.sound('whoosh');
    }
    if ((done && this.t > -PAUSE + 1) || (this.phase === 'wrapping' && !this.wobbling)) this.finishMission();
    else if (this.phase === 'wrapping' && this.t > QUICK) this.finishMission();
  }

  /** @private */
  finishMission() {
    if (this.phase === 'finished') return;
    this.ctx.hud.hideCounter();
    const total = this.config.shakes.length;
    const n = this.quick;
    this.complete(n >= total ? 3 : n >= total - 1 ? 2 : 1, n >= total
      ? 'Ai strâns toate chingile la timp. Încărcătura a ajuns întreagă!'
      : 'Bravo! Încărcătura e bine legată.');
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const w = this.wobbler();
    if (w) {
      const { slot } = w;
      // the good jiggles and leans (drawn over its place on the wagon)
      const shake = Math.sin(this.time * 28) * 3;
      const lean = Math.sin(this.time * 9) * 0.06;
      c.save();
      c.translate(w.x + shake, w.y);
      c.rotate(lean);
      drawCargoItem(c, slot.item, 0, 0, slot.w, slot.h);
      c.restore();
      // the loose strap, flapping in the wind behind the good
      const top = w.y - slot.h;
      c.strokeStyle = '#f08a24';
      c.lineWidth = 4;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(w.x - slot.w / 2, top + 4);
      for (let k = 1; k <= 4; k++) {
        c.lineTo(w.x - slot.w / 2 - k * 16, top + 4 + Math.sin(this.time * 14 + k) * 10 * (k / 4));
      }
      c.stroke();
      // "!" above it, then the note pointing at it
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 6);
      c.save();
      c.strokeStyle = `rgba(255,214,90,${0.5 + 0.5 * pulse})`;
      c.lineWidth = 5;
      c.beginPath();
      c.ellipse(w.x, w.y - slot.h / 2, slot.w / 2 + 14 + pulse * 4, slot.h / 2 + 14 + pulse * 4, 0, 0, Math.PI * 2);
      c.stroke();
      c.restore();
      drawTouchNote(c, this.ctx.stage, w.x, clamp(top - 22 - pulse * 6, this.ctx.stage.viewTop + 120, Infinity), 'Strânge chinga!');
    }
    this.particles.draw(c);
  }

  dispose() {
    this.ctx.hud.hideCounter();
  }
}
