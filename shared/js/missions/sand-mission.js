/**
 * @file Travel mission "the climb with sand": on the long ramp up to a
 * mountain pass the rails are icy, and now and then the wheels of the
 * locomotive slip: they spin and throw sparks, and the train almost stops.
 * The child sands the rails ("Nisip!", or a tap on the sandbox of the
 * locomotive): sand pours in front of the wheels, they grip again and the
 * train climbs on.
 *
 * Help, so that no child is left guessing: while the wheels slip, the big
 * button pulses and a "Pune nisip!" note points at the sandbox. Sand thrown
 * while the wheels grip well is only a gentle remark (a driver saves it for
 * when it is needed). A quick answer (within a few seconds) earns a star in
 * the counter.
 *
 * The slips are spread over the whole climb, so the mission lasts until the
 * top of the ramp. The mission takes the controls of the train and gives
 * them back at the end.
 *
 * Configuration (besides id/title/text):
 *   slips   how many times the wheels slip
 */

import { Particles } from '../gfx/particles.js';
import { drawTouchNote } from '../gfx/hints.js';
import { el } from '../ui/dom.js';
import { leave } from '../ui/panel.js';
import { Mission } from './mission.js';

/** @typedef {import('./mission.js').MissionConfig & {slips: number}} SandConfig */

/** Speed up the ramp, and while the wheels slip (stage units/s). */
const CLIMB_SPEED = 300;
const SLIP_SPEED = 35;
/** Seconds before the first slip, and at least between sand and the next slip. */
const FIRST_AFTER = 1.5;
const PAUSE = 2.5;
/** The last slip comes this far before the end of the mission's window (stage units). */
const LAST_BEFORE_END = 700;
/** Sand within this many seconds of a slip is quick enough for a star. */
const QUICK = 3.5;
/** Room around the sandbox that still counts as touching it (stage units). */
const TOUCH_MARGIN = 30;
const SAND = ['#d9b46a', '#c9a063', '#e8d29a'];
const SPARK = ['#ffd54f', '#ffffff', '#ff9800'];

export class SandMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {SandConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** Slips already sanded; whether the wheels slip now; seconds in the current state. */
    this.fixed = 0;
    this.slipping = false;
    this.t = -FIRST_AFTER;
    this.quick = 0;
    this.wasted = 0;
    this.time = 0;
    this.sparkT = 0;
    /** @type {import('../journey/journey.js').Controls | null} */
    this.controls = null;
    /** @type {HTMLButtonElement | null} */
    this.button = null;
    this.particles = new Particles();
    /** @type {(e: KeyboardEvent) => void} */
    this.onKey = e => {
      if (e.code !== 'Space' || this.ctx.hud.paused) return;
      e.preventDefault();
      this.sand();
    };
  }

  /** @param {{duration?: number, window?: {from: number, to: number}}} hints */
  start(hints) {
    super.start(hints);
    const j = this.ctx.journey;
    this.controls = j.takeControl();
    if (this.controls) this.controls.target = CLIMB_SPEED;
    // the slips are spread over the whole climb (up to the end of the window),
    // so the mission lasts until the top and the ride never goes quiet
    const n = this.config.slips;
    const end = hints.window ? j.segment.start + hints.window.to * j.segment.length - LAST_BEFORE_END : j.distance + n * 2000;
    const first = j.distance + FIRST_AFTER * CLIMB_SPEED;
    /** @type {number[]} world positions of the front of the train where the wheels slip */
    this.slipAt = Array.from({ length: n }, (_, i) => first + (n > 1 ? (i * (end - first)) / (n - 1) : 0));
    this.button = /** @type {HTMLButtonElement} */ (el('button', { class: 'brake-btn sand-btn', type: 'button' }, ['Nisip!']));
    this.button.addEventListener('pointerdown', e => {
      e.preventDefault();
      this.sand();
    });
    // keyboard users: Enter/Space produce a click without pointer events
    this.button.addEventListener('click', e => { if (e.detail === 0) this.sand(); });
    document.body.append(this.button);
    window.addEventListener('keydown', this.onKey);
    this.ctx.hud.setCounter('⭐', 0, this.config.slips);
  }

  /**
   * Where the sandbox of the locomotive is, and where its pipe pours the
   * sand (in front of the front wheels), on the stage.
   * @private
   */
  sandbox() {
    const w = this.ctx.world;
    const [x, y, rw, rh] = w.train.locoParts.sandbox?.[0] ?? [-60, -66, 34, 26];
    const box = w.trainToStage({ x, y });
    const wheels = w.train.locoParts.wheels?.[1];
    const pour = w.trainToStage({ x: wheels ? wheels[0] + wheels[2] : x + rw, y: -4 });
    return { x: box.x, y: box.y, w: rw, h: rh, pour };
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    const b = this.sandbox();
    if (p.x > b.x - TOUCH_MARGIN && p.x < b.x + b.w + TOUCH_MARGIN && p.y > b.y - TOUCH_MARGIN && p.y < b.y + b.h + TOUCH_MARGIN) this.sand();
  }

  /** @private The child sands the rails. */
  sand() {
    if (this.phase === 'finished') return;
    const b = this.sandbox();
    this.particles.burst(b.pour.x, b.pour.y - 6, SAND, 26, 120);
    this.sound('brush', b.pour.x);
    if (!this.slipping) {
      this.wasted += 1;
      this.ctx.hud.announce('Urcușul cu nisip', 'Roțile țin bine acum. Păstrăm nisipul pentru când patinează!', 'Misiune', 2.5);
      return;
    }
    if (this.t <= QUICK) this.quick += 1;
    this.slipping = false;
    this.fixed += 1;
    this.t = -PAUSE;
    this.sound('ding', b.pour.x);
    this.ctx.hud.setCounter('⭐', this.quick, this.config.slips);
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.t += dt;
    this.particles.update(dt);
    const done = this.fixed >= this.config.slips;
    const at = this.slipAt?.[this.fixed] ?? -Infinity;
    if (!this.slipping && !done && this.t >= 0 && this.ctx.journey.distance >= at && this.phase === 'running') {
      this.slipping = true;
      this.t = 0;
      this.sound('whoosh');
    }
    if (this.controls) this.controls.target = this.slipping ? SLIP_SPEED : CLIMB_SPEED;
    // the slipping wheels throw sparks on the rail
    if (this.slipping && (this.sparkT -= dt) <= 0) {
      this.sparkT = 0.12;
      const wheels = this.ctx.world.train.locoParts.wheels ?? [];
      for (const [x, , w] of wheels) {
        const p = this.ctx.world.trainToStage({ x: x + w / 2, y: 0 });
        this.particles.burst(p.x + (Math.random() - 0.5) * w, p.y - 4, SPARK, 3, 160);
      }
    }
    if (this.button) {
      this.button.classList.toggle('is-urgent', this.slipping);
      this.button.textContent = this.slipping ? 'Nisip! Roțile patinează!' : 'Nisip!';
    }
    if ((done && this.t > -PAUSE + 1) || (this.phase === 'wrapping' && (!this.slipping || this.t > QUICK))) this.finishMission();
  }

  /** @private */
  finishMission() {
    if (this.phase === 'finished') return;
    if (this.controls) {
      this.controls = null;
      this.ctx.journey.releaseControl();
    }
    this.ctx.hud.hideCounter();
    const total = this.config.slips;
    const n = this.quick;
    this.complete(n >= total && this.wasted <= 1 ? 3 : n >= total - 1 ? 2 : 1, n >= total
      ? 'Bravo! Cu nisip pe șine, trenul a urcat până la pasul Mestecăniș.'
      : 'Am urcat! Nisipul a ajutat roțile să nu mai patineze.');
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    if (this.slipping) {
      const b = this.sandbox();
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 6);
      c.save();
      c.strokeStyle = `rgba(255,214,90,${0.5 + 0.5 * pulse})`;
      c.lineWidth = 5;
      c.strokeRect(b.x - 8 - pulse * 3, b.y - 8 - pulse * 3, b.w + 16 + pulse * 6, b.h + 16 + pulse * 6);
      c.restore();
      drawTouchNote(c, this.ctx.stage, b.x + b.w / 2, b.y - 14 - pulse * 6, 'Pune nisip!');
      // the spinning wheels: little motion arcs over them
      c.save();
      c.strokeStyle = 'rgba(255,255,255,0.85)';
      c.lineWidth = 3;
      for (const [x, , w] of this.ctx.world.train.locoParts.wheels ?? []) {
        const p = this.ctx.world.trainToStage({ x: x + w / 2, y: -15 });
        const a = this.time * 20;
        c.beginPath();
        c.arc(p.x, p.y, w / 2 + 6, a, a + 1.2);
        c.stroke();
      }
      c.restore();
    }
    this.particles.draw(c);
  }

  dispose() {
    if (this.controls) this.ctx.journey.releaseControl();
    this.ctx.hud.hideCounter();
    leave(this.button);
    window.removeEventListener('keydown', this.onKey);
  }
}
