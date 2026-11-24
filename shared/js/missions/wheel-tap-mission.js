/**
 * @file Station mission "the wheel tapper": before the train climbs on,
 * Bubu checks the wheels of the coaches the way railway workers really do,
 * by striking each one with a long hammer and listening. A good wheel rings
 * clearly ("ting!"); a cracked one gives a dull "bonc".
 *
 *   1. The child touches every wheel of the coaches. A good one rings and
 *      gets a chalk tick; a cracked one sounds dull (a thin crack can be
 *      seen on it) and gets no tick.
 *   2. Then the child touches the wheels that sounded dull, and Bubu
 *      changes them. Touching a good wheel now is a gentle mistake.
 *
 * Configuration (besides id/title/text):
 *   cracked   indexes of the cracked wheels (counted over all coaches, from the front)
 *   fact      shown at the end
 */

import { drawTouchNote } from '../gfx/hints.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { drawHammer } from './line-stop-mission.js';
import { Mission, starsForMistakes } from './mission.js';

/**
 * @typedef {import('./mission.js').MissionConfig & {cracked: number[], fact: string}} WheelConfig
 * @typedef {{x: number, cracked: boolean, tested: boolean, changed: boolean, t: number}} TappedWheel
 *          x in train coordinates; t: seconds since it was last struck
 */

/** How close to a wheel a touch must be (stage units). */
const REACH = 34;
/** The kinds of car whose wheels are checked. */
const COACHES = new Set(['forestCoach', 'coach']);

export class WheelTapMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {WheelConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {'test' | 'change' | 'done'} */
    this.step = 'test';
    /** @type {TappedWheel[]} */
    this.wheels = [];
    this.mistakes = 0;
    this.time = 0;
    this.doneT = 0;
    /** @type {{x: number, y: number, t: number}} the last stroke of the hammer */
    this.stroke = { x: 0, y: 0, t: -9 };
    /** @type {Array<{x: number, y: number, text: string, good: boolean, t: number}>} words rising from the struck wheels */
    this.words = [];
    this.particles = new Particles();
  }

  start() {
    super.start();
    const train = this.ctx.world.train;
    train.passengerWindows;   // makes sure the train's geometry is ready
    const cracked = new Set(this.config.cracked);
    let i = 0;
    for (const car of train.cars) {
      if (!COACHES.has(car.spec.kind)) continue;
      // from the front of the coach to its back
      for (const wx of [...car.geo.wheels].sort((a, b) => b - a)) {
        this.wheels.push({ x: car.left + wx, cracked: cracked.has(i), tested: false, changed: false, t: 9 });
        i += 1;
      }
    }
    this.ctx.hud.setCounter('🔨', 0, this.wheels.length);
  }

  /**
   * Stage position of the centre of a wheel.
   * @private
   * @param {TappedWheel} w
   */
  at(w) {
    return this.ctx.world.trainToStage({ x: w.x, y: -15 });
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    if (this.step === 'done') return;
    let best = null;
    let dist = REACH * 2;
    for (const w of this.wheels) {
      const c = this.at(w);
      const d = Math.hypot(c.x - p.x, (c.y - p.y) * 0.6);
      if (d < dist) {
        dist = d;
        best = w;
      }
    }
    if (!best) return;
    const c = this.at(best);
    this.stroke = { x: c.x, y: c.y, t: this.time };
    best.t = 0;
    if (this.step === 'test') {
      if (best.tested) return;
      best.tested = true;
      const dull = best.cracked;
      this.sound(dull ? 'thud' : 'ding', c.x);
      this.words.push({ x: c.x, y: c.y - 30, text: dull ? 'bonc' : 'ting!', good: !dull, t: 0 });
      const tested = this.wheels.filter(w => w.tested).length;
      this.ctx.hud.setCounter('🔨', tested, this.wheels.length);
      if (tested === this.wheels.length) {
        this.step = 'change';
        this.ctx.hud.setCounter('🛞', 0, this.config.cracked.length);
        this.ctx.hud.announce('Ce roți au sunat „bonc”?', 'Roțile bune au primit un semn cu creta. Atinge roțile fără semn: Bubu le schimbă.', 'Misiune', 4);
      }
      return;
    }
    // changing the cracked wheels
    if (!best.cracked || best.changed) {
      if (best.changed) return;
      this.mistakes += 1;
      this.oops();
      this.words.push({ x: c.x, y: c.y - 30, text: 'ting!', good: true, t: 0 });
      this.ctx.hud.announce('Roata asta e bună', 'A sunat limpede, „ting!”, și are semn cu creta. Caută roțile fără semn.', 'Misiune', 3);
      return;
    }
    best.changed = true;
    this.sound('collect', c.x);
    this.particles.burst(c.x, c.y, SPARKS, 18, 200);
    const changed = this.wheels.filter(w => w.changed).length;
    this.ctx.hud.setCounter('🛞', changed, this.config.cracked.length);
    if (changed >= this.config.cracked.length) {
      this.step = 'done';
      this.ctx.hud.announce('Roțile sunt bune!', this.config.fact, 'Misiune', 4);
    }
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    for (const w of this.wheels) w.t += dt;
    for (const word of this.words) word.t += dt;
    this.words = this.words.filter(w => w.t < 1.2);
    if (this.step === 'done') {
      this.doneT += dt;
      if (this.doneT > 2.5 && this.phase !== 'finished') {
        this.complete(starsForMistakes(this.mistakes, 1, 0), this.mistakes === 0
          ? 'Perfect! Ai auzit fiecare roată crăpată.'
          : 'Bravo! Roțile vagoanelor sunt bune pentru urcuș.');
      }
    }
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 6);
    for (const w of this.wheels) {
      const p = this.at(w);
      if (w.cracked && w.tested && !w.changed) {
        // a thin crack across the wheel
        c.strokeStyle = '#1d1d24';
        c.lineWidth = 2;
        c.beginPath();
        c.moveTo(p.x - 9, p.y - 8);
        c.lineTo(p.x - 2, p.y - 1);
        c.lineTo(p.x - 5, p.y + 4);
        c.lineTo(p.x + 3, p.y + 10);
        c.stroke();
      }
      if ((w.tested && !w.cracked) || w.changed) {
        // the chalk tick above the wheel
        c.strokeStyle = w.changed ? '#69f0ae' : '#ffffff';
        c.lineWidth = 4;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(p.x - 8, p.y - 34);
        c.lineTo(p.x - 2, p.y - 27);
        c.lineTo(p.x + 9, p.y - 42);
        c.stroke();
      }
      if (this.step === 'test' && !w.tested) {
        c.strokeStyle = `rgba(255,214,90,${0.45 + 0.5 * pulse})`;
        c.lineWidth = 4;
        c.beginPath();
        c.arc(p.x, p.y, 20 + pulse * 3, 0, Math.PI * 2);
        c.stroke();
      }
    }
    // the hammer, just after a stroke
    const since = this.time - this.stroke.t;
    if (since < 0.5) drawHammer(c, this.stroke.x + 26, this.stroke.y - 42, since < 0.15 ? 0.5 : -0.3);
    // the words rising from the wheels
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (const w of this.words) {
      c.globalAlpha = 1 - w.t / 1.2;
      c.font = `800 ${w.good ? 30 : 26}px "Baloo 2", system-ui, sans-serif`;
      c.lineWidth = 6;
      c.strokeStyle = '#1b2440';
      c.strokeText(w.text, w.x, w.y - w.t * 50);
      c.fillStyle = w.good ? '#b9f6ca' : '#c7beb5';
      c.fillText(w.text, w.x, w.y - w.t * 50);
    }
    c.globalAlpha = 1;
    this.particles.draw(c);
    const first = this.wheels.find(w => !w.tested);
    if (this.step === 'test' && first && this.wheels.every(w => !w.tested)) {
      const p = this.at(first);
      drawTouchNote(c, this.ctx.stage, p.x, p.y - 36, 'Lovește roata cu ciocanul!');
    }
  }

  dispose() {
    this.ctx.hud.hideCounter();
  }
}
