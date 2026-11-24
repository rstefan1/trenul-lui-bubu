/**
 * @file Travel mission "the viaduct inspector": while the train crosses each
 * viaduct of the line (slowly, the view rising over the valley), the child
 * counts its stone arches and picks the right number.
 *
 * The question appears as the train starts across a viaduct, with three
 * answers; the view pans forward so the whole viaduct is seen. A right
 * answer numbers the arches one by one (1, 2, 3…), so the child sees the
 * count; a wrong one is a gentle mistake ("count again"), and so is a
 * viaduct left behind without an answer (the arches are numbered anyway).
 *
 * Configuration (besides id/title/text): none — every viaduct of the segment
 * gets its question.
 */

import { archCount } from '../world/features.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { fillCircle } from '../gfx/shapes.js';
import { TRACK_Y } from '../world/track.js';
import { el } from '../ui/dom.js';
import { leave } from '../ui/panel.js';
import { Mission } from './mission.js';

/**
 * @typedef {object} Viaduct
 * @property {number} x0
 * @property {number} x1
 * @property {number} arches
 * @property {'ahead' | 'asked' | 'right' | 'missed'} state
 * @property {number} t    seconds since it was answered
 */

/** Where the front of the train stands on screen during the mission (share of the width). */
const LOOK_AHEAD = 0.55;
/** The question appears when the front of the train is this far onto the viaduct. */
const ASK_AT = 60;
/** Seconds the arches take to be numbered, one after the other. */
const NUMBER_STEP = 0.18;

export class ArchesMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {import('./mission.js').MissionConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    /** @type {Viaduct[]} */
    this.viaducts = [];
    this.right = 0;
    this.mistakes = 0;
    this.time = 0;
    this.particles = new Particles();
    /** @type {HTMLElement | null} */
    this.bar = null;
  }

  /** @param {{duration?: number, window?: {from: number, to: number}}} hints */
  start(hints) {
    super.start(hints);
    const j = this.ctx.journey;
    const seg = j.segment;
    this.viaducts = j.route.features
      .filter(f => f.type === 'viaduct' && f.x0 >= seg.start && f.x1 <= seg.start + seg.length)
      .map(f => {
        const v = /** @type {import('../world/features.js').SpanFeature} */ (f);
        return { x0: v.x0, x1: v.x1, arches: archCount(v.x1 - v.x0), state: /** @type {const} */ ('ahead'), t: 0 };
      });
    this.ctx.world.lookAhead(LOOK_AHEAD);
    this.ctx.hud.setCounter('🌉', 0, this.viaducts.length);
  }

  /** The viaduct being asked about, if any. */
  get asked() {
    return this.viaducts.find(v => v.state === 'asked') ?? null;
  }

  /**
   * @private
   * @param {Viaduct} v
   */
  ask(v) {
    v.state = 'asked';
    const n = v.arches;
    const answers = [n, n - 1, n + 2].sort(() => Math.random() - 0.5);
    const buttons = answers.map(a => {
      const b = /** @type {HTMLButtonElement} */ (el('button', { class: 'signal-btn', type: 'button' }, [String(a)]));
      b.addEventListener('click', () => this.answer(v, a, b));
      return b;
    });
    this.bar = el('div', { class: 'signal-controls arches-controls', role: 'group', 'aria-label': 'Câte arcade are viaductul?' }, [
      el('span', { class: 'arches-question' }, ['Câte arcade are viaductul?']),
      ...buttons,
    ]);
    document.body.append(this.bar);
  }

  /**
   * @private
   * @param {Viaduct} v
   * @param {number} a
   * @param {HTMLButtonElement} button
   */
  answer(v, a, button) {
    if (v.state !== 'asked') return;
    if (a !== v.arches) {
      this.mistakes += 1;
      this.oops();
      button.disabled = true;
      this.ctx.hud.announce('Inspectorul de viaducte', 'Mai numără o dată! Arcadele sunt golurile rotunde de sub linie.', 'Misiune', 2.5);
      return;
    }
    this.right += 1;
    this.close(v, 'right');
    this.sound('ding');
    this.particles.burst(this.toScreen((v.x0 + v.x1) / 2), TRACK_Y + 40 - this.ctx.world.cameraY, SPARKS, 24, 240);
    this.ctx.hud.setCounter('🌉', this.right, this.viaducts.length);
  }

  /**
   * @private
   * @param {Viaduct} v
   * @param {'right' | 'missed'} state
   */
  close(v, state) {
    v.state = state;
    v.t = 0;
    leave(this.bar);
    this.bar = null;
  }

  /** Screen x of a world position. */
  toScreen(/** @type {number} */ x) {
    return x - this.ctx.journey.distance + this.ctx.world.anchorX;
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    const d = this.ctx.journey.distance;
    for (const v of this.viaducts) {
      v.t += dt;
      if (v.state === 'ahead' && d > v.x0 + ASK_AT && !this.asked && this.phase === 'running') this.ask(v);
      // the viaduct leaves the screen without an answer
      if (v.state === 'asked' && this.toScreen(v.x1) < this.ctx.stage.viewLeft + 60) {
        this.close(v, 'missed');
        this.ctx.hud.announce('Inspectorul de viaducte', `Viaductul avea ${v.arches} arcade.`, 'Misiune', 2.5);
      }
    }
    const over = this.viaducts.every(v => v.state === 'right' || v.state === 'missed');
    if ((over && this.viaducts.every(v => v.t > v.arches * NUMBER_STEP + 0.8)) || (this.phase === 'wrapping' && !this.asked)) this.finishMission();
  }

  /** @private */
  finishMission() {
    if (this.phase === 'finished') return;
    this.ctx.hud.hideCounter();
    const total = this.viaducts.length;
    const stars = this.right >= total && this.mistakes === 0 ? 3 : this.right >= total - 1 ? 2 : 1;
    this.complete(stars, stars === 3
      ? 'Ai numărat corect arcadele tuturor viaductelor!'
      : `Ai numărat corect ${this.right} viaducte din ${total}.`);
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const cam = this.ctx.world.cameraY;
    for (const v of this.viaducts) {
      if (v.state !== 'right' && v.state !== 'missed') continue;
      // the arches numbered one after the other
      const span = (v.x1 - v.x0) / v.arches;
      const shown = Math.min(v.arches, Math.floor(v.t / NUMBER_STEP) + 1);
      for (let i = 0; i < shown; i++) {
        const x = this.toScreen(v.x0 + (i + 0.5) * span);
        const y = TRACK_Y + 70 - cam;
        c.fillStyle = v.state === 'right' ? '#2e9d57' : '#1f4f9c';
        fillCircle(c, x, y, 17);
        c.fillStyle = '#ffffff';
        c.font = '800 20px "Baloo 2", system-ui, sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(String(i + 1), x, y + 1);
      }
    }
    this.particles.draw(c);
  }

  dispose() {
    this.ctx.world.lookAhead(null);
    this.ctx.hud.hideCounter();
    leave(this.bar);
  }
}
