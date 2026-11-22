/**
 * @file Travel mission "the lights in order" (a memory game).
 *
 * Above the train, four big coloured bulbs light up one after another. The
 * child repeats the order by touching them (or with the keys 1–4). Every
 * round adds one more step; every round won lights another part of the
 * string of lights along the train. A mistake is not punished: the bulbs
 * simply show the order again.
 *
 * Configuration (besides id/title/text):
 *   rounds   number of rounds; the first round has `start` steps
 *   start    length of the first sequence
 */

import { Particles, SPARKS } from '../gfx/particles.js';
import { fillCircle, fillRoundRect, glow, roundRectPath } from '../gfx/shapes.js';
import { WIRE_Y } from '../world/track.js';
import { Mission, starsForMistakes } from './mission.js';

const BULBS = [
  { color: '#e53935', dim: '#6b2a2a', name: 'roșu', note: 'C5' },
  { color: '#fbc02d', dim: '#6b5a24', name: 'galben', note: 'E5' },
  { color: '#1e88e5', dim: '#22406b', name: 'albastru', note: 'G5' },
  { color: '#43a047', dim: '#244d2a', name: 'verde', note: 'C6' },
];
/** Seconds each bulb stays lit while the order is shown, and the pause after it. */
const SHOW_ON = 0.65;
const SHOW_OFF = 0.25;
/** Radius of a bulb on screen, and the touch tolerance. */
const BULB_R = 40;
const TOUCH_R = 62;

/**
 * @typedef {import('./mission.js').MissionConfig & {rounds: number, start: number}} SequenceConfig
 */

export class SequenceMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {SequenceConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {number[]} the order to remember */
    this.sequence = [];
    this.round = 0;
    /** @type {'pause' | 'show' | 'input' | 'won' | 'done'} */
    this.step = 'pause';
    this.stepT = 0;
    /** Position in the sequence (while showing or while the child repeats it). */
    this.index = 0;
    this.mistakes = 0;
    /** @type {number[]} seconds each bulb still glows (feedback) */
    this.flash = BULBS.map(() => 0);
    /** Index (in the shown order) of the last bulb that sang its note. */
    this.sung = -1;
    this.message = 'Privește cu atenție…';
    this.time = 0;
    this.particles = new Particles();
    /** @type {(e: KeyboardEvent) => void} */
    this.onKey = e => {
      const i = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(e.code);
      if (i >= 0) this.press(i);
    };
  }

  /** @param {{duration?: number}} hints */
  start(hints) {
    super.start(hints);
    for (let i = 0; i < this.config.start; i++) this.extend();
    this.stepT = -1.5;   // a moment to read the instructions
    this.ctx.hud.setCounter('💡', 0, this.config.rounds);
    window.addEventListener('keydown', this.onKey);
  }

  /** @private Adds one more step (never the same colour three times in a row). */
  extend() {
    const s = this.sequence;
    let next;
    do next = Math.floor(Math.random() * BULBS.length);
    while (s.length >= 2 && s[s.length - 1] === next && s[s.length - 2] === next);
    s.push(next);
  }

  /** Where the panel with the bulbs is (stage units). */
  get panel() {
    const stage = this.ctx.stage;
    const w = 470;
    const h = 170;
    const cardBottom = this.ctx.hud.cardBottom;
    const y = Math.max(cardBottom ? stage.toStage(0, cardBottom + 12).y : 0, WIRE_Y - 40 - h - this.ctx.world.cameraY);
    return { x: stage.width / 2 - w / 2, y, w, h };
  }

  /**
   * Centre of a bulb.
   * @param {number} i
   */
  bulbAt(i) {
    const p = this.panel;
    return { x: p.x + p.w * ((i + 0.5) / BULBS.length), y: p.y + 92 };
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    for (let i = 0; i < BULBS.length; i++) {
      const b = this.bulbAt(i);
      if (Math.hypot(p.x - b.x, p.y - b.y) < TOUCH_R) {
        this.press(i);
        return;
      }
    }
  }

  /**
   * The child touches a bulb.
   * @private
   * @param {number} i
   */
  press(i) {
    if (this.step !== 'input') return;
    this.flash[i] = 0.3;
    if (this.sequence[this.index] !== i) {
      playNote(this.ctx.audio, 'C4', { length: 0.3, level: 0.2 });   // a soft, low "oops"
      this.mistakes += 1;
      this.message = 'Hopa! Mai privește o dată…';
      this.step = 'pause';
      this.stepT = -0.6;
      return;
    }
    playNote(this.ctx.audio, BULBS[i].note);
    this.index += 1;
    if (this.index < this.sequence.length) return;
    // round won: another part of the string of lights on the train lights up
    this.round += 1;
    this.ctx.state.setLightBulbs(this.round / this.config.rounds);
    this.ctx.hud.setCounter('💡', this.round, this.config.rounds);
    const p = this.panel;
    this.particles.burst(p.x + p.w / 2, p.y + 80, SPARKS, 24, 260);
    if (this.round >= this.config.rounds) {
      this.step = 'done';
      this.message = 'Bravo! Toată ghirlanda trenului strălucește!';
      this.stepT = 0;
      return;
    }
    this.message = 'Bravo! Încă un beculeț…';
    this.extend();
    this.step = 'won';
    this.stepT = 0;
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    this.flash = this.flash.map(f => Math.max(0, f - dt));
    this.stepT += dt;

    if (this.step === 'pause' && this.stepT > 0.6) {
      this.step = 'show';
      this.sung = -1;
      this.stepT = 0;
      this.index = 0;
      this.message = 'Privește cu atenție…';
    } else if (this.step === 'won' && this.stepT > 1.1) {
      this.step = 'pause';
      this.stepT = 0;
    } else if (this.step === 'show') {
      const slot = SHOW_ON + SHOW_OFF;
      const i = Math.floor(this.stepT / slot);
      if (i >= this.sequence.length) {
        this.step = 'input';
        this.index = 0;
        this.message = 'Rândul tău! Atinge beculețele în aceeași ordine.';
      } else if (this.stepT % slot < SHOW_ON) {
        this.flash[this.sequence[i]] = Math.max(this.flash[this.sequence[i]], 0.05);
        // each bulb sings its note as it lights up (once per lighting)
        if (this.sung !== i) {
          this.sung = i;
          playNote(this.ctx.audio, BULBS[this.sequence[i]].note);
        }
      }
    } else if (this.step === 'done' && this.stepT > 1.5) {
      this.finishMission();
    }

    // the window is closing: keep what was won
    if (this.phase === 'wrapping' && this.step !== 'done') this.finishMission();
  }

  /** @private */
  finishMission() {
    if (this.phase === 'finished') return;
    this.ctx.hud.hideCounter();
    const all = this.round >= this.config.rounds;
    this.complete(all ? starsForMistakes(this.mistakes, 3, 1) : this.round > 0 ? 2 : 1,
      all ? 'Ai o memorie de campion! Ghirlanda trenului e aprinsă.' : `Ai aprins ${this.round} părți din ghirlanda trenului.`);
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const p = this.panel;
    fillRoundRect(c, p.x, p.y, p.w, p.h, 26, 'rgba(19,41,90,0.9)');
    c.strokeStyle = this.step === 'input' ? '#b9f6ca' : '#ffffff';
    c.lineWidth = this.step === 'input' ? 5 : 3;
    c.beginPath();
    roundRectPath(c, p.x, p.y, p.w, p.h, 26);
    c.stroke();
    c.fillStyle = '#ffffff';
    c.font = '700 20px "Baloo 2", system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    c.fillText(this.message, p.x + p.w / 2, p.y + 34);
    // the wire and the four bulbs
    c.strokeStyle = '#2d3a2f';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(p.x + 20, p.y + 54);
    for (let i = 0; i < BULBS.length; i++) {
      const b = this.bulbAt(i);
      c.quadraticCurveTo(b.x - 40, p.y + 66, b.x, p.y + 52);
    }
    c.lineTo(p.x + p.w - 20, p.y + 54);
    c.stroke();
    BULBS.forEach((bulb, i) => {
      const b = this.bulbAt(i);
      const on = this.flash[i] > 0;
      if (on) glow(c, b.x, b.y, BULB_R * 2.4, 'rgba(255,245,200,0.7)', 'rgba(255,245,200,0)');
      c.fillStyle = '#8a8f9c';
      c.fillRect(b.x - 12, b.y - BULB_R - 14, 24, 16);
      c.fillStyle = on ? bulb.color : bulb.dim;
      fillCircle(c, b.x, b.y, BULB_R * (on ? 1.08 : 1));
      c.fillStyle = 'rgba(255,255,255,0.45)';
      fillCircle(c, b.x - BULB_R * 0.35, b.y - BULB_R * 0.35, BULB_R * 0.22);
    });
    // progress through the sequence while the child repeats it
    if (this.step === 'input') {
      const n = this.sequence.length;
      for (let i = 0; i < n; i++) {
        c.fillStyle = i < this.index ? '#ffd23f' : 'rgba(255,255,255,0.3)';
        fillCircle(c, p.x + p.w / 2 + (i - (n - 1) / 2) * 20, p.y + p.h - 14, 6);
      }
    }
    this.particles.draw(c);
  }

  dispose() {
    window.removeEventListener('keydown', this.onKey);
  }
}
