/**
 * @file Station mission "everyone on board?": the children get off for a
 * snowball fight by the snowmen of a forest station, and before the train
 * leaves, the conductor must know that all of them are back.
 *
 *   1. The children hop out of the coaches and play in the snow.
 *   2. "Toți în tren!": they climb back to their windows, all but one.
 *   3. The child counts the faces at the windows and chooses the number.
 *      The list has one more name: someone is missing!
 *   4. One of the snowmen hides the missing child; the child touches the
 *      snowmen until it is found (a wrong one only wobbles; after a wrong
 *      one, a mitten peeks out from behind the right one). The little one
 *      laughs, runs to the train and sits at the window.
 *
 * Configuration (besides id/title/text):
 *   children   [{emoji, seat}] — the children on the list, and their window seats
 *   hiding     index of the child who hides
 *   snowmen    how many snowmen stand in the snow
 *   hideIn     index of the snowman the child hides behind
 *   fact       shown at the end
 */

import { drawTouchNote } from '../gfx/hints.js';
import { fillCircle } from '../gfx/shapes.js';
import { TRACK_Y } from '../world/track.js';
import { el } from '../ui/dom.js';
import { leave } from '../ui/panel.js';
import { Mission, starsForMistakes } from './mission.js';

/**
 * @typedef {{emoji: string, seat: number}} ListedChild
 * @typedef {import('./mission.js').MissionConfig & {
 *   children: ListedChild[], hiding: number, snowmen: number, hideIn: number, fact: string,
 * }} HeadcountConfig
 */

/** The ground where the children play, in front of the train (the snowmen are small enough
 *  not to hide the windows, where the children are counted). */
const GROUND_Y = TRACK_Y + 104;
/** Size of the snowmen (1 = as tall as a child's arm can reach). */
const SNOWMAN = 0.62;
/** Seconds the children play before they can be called back. */
const PLAY = 2.6;
const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

export class HeadcountMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {HeadcountConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {'play' | 'call' | 'board' | 'count' | 'find' | 'found' | 'done'} */
    this.step = 'play';
    this.mistakes = 0;
    this.time = 0;
    this.stepT = 0;
    /** Children still playing in the snow (indexes in the list). */
    this.playing = config.children.map((_, i) => i).filter(i => i !== config.hiding);
    /** A snowman wobbling after a wrong touch: its index and when. */
    this.wobble = { index: -1, t: -9 };
    this.peek = false;
    /** @type {HTMLButtonElement | null} */
    this.button = null;
    /** @type {HTMLElement | null} */
    this.bar = null;
  }

  start() {
    super.start();
    // everybody out, to play in the snow
    this.ctx.world.train.leaveAll();
  }

  /** Stage x of a snowman. */
  snowmanX(/** @type {number} */ i) {
    const s = this.ctx.stage;
    return s.viewLeft + (s.viewRight - s.viewLeft) * (0.3 + (0.45 * i) / Math.max(1, this.config.snowmen - 1));
  }

  /** @private The bell: everybody back on the train. */
  call() {
    if (this.step !== 'call') return;
    leave(this.button);
    this.button = null;
    this.step = 'board';
    this.stepT = 0;
    this.sound('ding');
  }

  /** @private Asks how many children are at the windows. */
  ask() {
    this.step = 'count';
    const n = this.config.children.length - 1;
    const answers = [n - 1, n, n + 1].sort(() => Math.random() - 0.5);
    const buttons = answers.map(a => {
      const b = /** @type {HTMLButtonElement} */ (el('button', { class: 'signal-btn', type: 'button' }, [String(a)]));
      b.addEventListener('click', () => this.answer(a, b));
      return b;
    });
    this.bar = el('div', { class: 'signal-controls arches-controls', role: 'group', 'aria-label': 'Câți copii sunt la geamuri?' }, [
      el('span', { class: 'arches-question' }, ['Câți copii sunt la geamuri?']),
      ...buttons,
    ]);
    document.body.append(this.bar);
  }

  /**
   * @private
   * @param {number} a
   * @param {HTMLButtonElement} button
   */
  answer(a, button) {
    if (this.step !== 'count') return;
    const n = this.config.children.length - 1;
    if (a !== n) {
      this.mistakes += 1;
      this.oops();
      button.disabled = true;
      this.ctx.hud.announce('Mai numără o dată', 'Numără copiii de la geamurile vagoanelor, unul câte unul.', 'Misiune', 3);
      return;
    }
    leave(this.bar);
    this.bar = null;
    this.sound('ding');
    this.step = 'find';
    this.ctx.hud.announce('Lipsește un copil!', `Sunt ${n} copii la geamuri, dar pe listă sunt ${n + 1}. Unde s-a ascuns? Atinge oamenii de zăpadă!`, 'Misiune', 4.5);
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    if (this.step !== 'find') return;
    const y = GROUND_Y - this.ctx.world.cameraY;
    for (let i = 0; i < this.config.snowmen; i++) {
      const x = this.snowmanX(i);
      if (Math.abs(p.x - x) > 60 || p.y < y - 150 || p.y > y + 20) continue;
      if (i !== this.config.hideIn) {
        this.mistakes += 1;
        this.oops();
        this.wobble = { index: i, t: this.time };
        this.peek = true;
        return;
      }
      this.step = 'found';
      this.stepT = 0;
      this.sound('hop', x);
      return;
    }
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.stepT += dt;
    const train = this.ctx.world.train;
    if (this.step === 'play' && this.stepT > PLAY) {
      this.step = 'call';
      this.button = /** @type {HTMLButtonElement} */ (el('button', { class: 'brake-btn is-stopped is-urgent', type: 'button' }, ['🔔 Toți în tren!']));
      this.button.addEventListener('click', () => this.call());
      document.body.append(this.button);
    } else if (this.step === 'board') {
      // one after the other, back to their windows
      if (this.playing.length && this.stepT > 0.3) {
        this.stepT = 0;
        const i = /** @type {number} */ (this.playing.shift());
        const c = this.config.children[i];
        train.addPassenger(c.emoji, c.seat);
        this.sound('hop');
      } else if (!this.playing.length && this.stepT > 0.8) this.ask();
    } else if (this.step === 'found' && this.stepT > 1.6) {
      const c = this.config.children[this.config.hiding];
      train.addPassenger(c.emoji, c.seat);
      this.sound('collect');
      this.step = 'done';
      this.stepT = 0;
      this.ctx.hud.announce('Toți sunt în tren!', this.config.fact, 'Misiune', 4);
    } else if (this.step === 'done' && this.stepT > 2.5 && this.phase !== 'finished') {
      this.complete(starsForMistakes(this.mistakes, 1, 0), this.mistakes === 0
        ? 'Perfect! Ai numărat bine și ai găsit copilul ascuns.'
        : 'Bravo! Nimeni nu rămâne în urmă: toți copiii sunt în tren.');
    }
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const cam = this.ctx.world.cameraY;
    const y = GROUND_Y - cam;
    const s = this.ctx.stage;
    // the snowmen
    for (let i = 0; i < this.config.snowmen; i++) {
      const x = this.snowmanX(i);
      const since = this.time - this.wobble.t;
      const tilt = this.wobble.index === i && since < 0.6 ? Math.sin(since * 30) * 0.12 * (1 - since / 0.6) : 0;
      const hider = i === this.config.hideIn;
      if (hider && this.peek && this.step === 'find') {
        // a mitten peeks out from behind
        c.font = `34px ${EMOJI_FONT}`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('🧤', x + 36 + Math.sin(this.time * 4) * 4, y - 48);
      }
      drawSnowman(c, x, y, tilt, SNOWMAN);
      if (this.step === 'find') {
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 6 + i);
        c.strokeStyle = `rgba(255,214,90,${0.35 + 0.45 * pulse})`;
        c.lineWidth = 4;
        c.beginPath();
        c.ellipse(x, y - 52, 50 + pulse * 4, 76 + pulse * 4, 0, 0, Math.PI * 2);
        c.stroke();
      }
    }
    // the children playing, throwing snowballs
    c.font = `44px ${EMOJI_FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    // (they appear once they have hopped out of the coaches)
    if ((this.step === 'play' && this.stepT > 1.4) || this.step === 'call' || this.step === 'board') {
      this.playing.forEach((i, k) => {
        const x = s.viewLeft + (s.viewRight - s.viewLeft) * (0.32 + k * 0.1);
        const hop = Math.abs(Math.sin(this.time * 4 + k * 1.7)) * 14;
        c.fillText(this.config.children[i].emoji, x, y - 22 - hop);
        // a snowball flying between two of them
        const u = (this.time * 0.8 + k * 0.37) % 1;
        c.fillStyle = '#ffffff';
        fillCircle(c, x + u * 110, y - 44 - Math.sin(u * Math.PI) * 50, 7);
      });
    }
    // the hidden child jumps out laughing and runs to the train
    if (this.step === 'found') {
      const x0 = this.snowmanX(this.config.hideIn) + 50;
      const u = Math.min(1, this.stepT / 1.6);
      const hop = Math.abs(Math.sin(u * Math.PI * 4)) * 26;
      c.font = `44px ${EMOJI_FONT}`;
      c.fillText(this.config.children[this.config.hiding].emoji, x0 - u * 260, y - 30 - hop - u * 60);
      c.font = '800 26px "Baloo 2", system-ui, sans-serif';
      c.lineWidth = 6;
      c.strokeStyle = '#1b2440';
      c.strokeText('Aici sunt! Hi-hi!', x0, y - 110);
      c.fillStyle = '#fff6d8';
      c.fillText('Aici sunt! Hi-hi!', x0, y - 110);
    }
    if (this.step === 'find' && this.mistakes === 0) {
      drawTouchNote(c, s, this.snowmanX(0), y - 140, 'Cine se ascunde?');
    }
  }

  dispose() {
    leave(this.button);
    leave(this.bar);
  }
}

/**
 * A snowman with a hat, coal eyes and a carrot nose.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} groundY
 * @param {number} tilt
 * @param {number} size  1 = 226 stage units tall
 */
function drawSnowman(c, x, groundY, tilt, size) {
  c.save();
  c.translate(x, groundY);
  c.rotate(tilt);
  c.scale(size, size);
  c.fillStyle = 'rgba(80,100,140,0.18)';
  c.beginPath();
  c.ellipse(0, 0, 60, 12, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#f7faff';
  fillCircle(c, 0, -46, 50);
  fillCircle(c, 0, -118, 36);
  fillCircle(c, 0, -170, 26);
  c.fillStyle = 'rgba(150,175,210,0.35)';
  fillCircle(c, 14, -40, 34);
  // eyes, buttons and the carrot
  c.fillStyle = '#1d1d24';
  fillCircle(c, -9, -176, 4);
  fillCircle(c, 9, -176, 4);
  fillCircle(c, 0, -122, 4.5);
  fillCircle(c, 0, -104, 4.5);
  c.fillStyle = '#ff8f1f';
  c.beginPath();
  c.moveTo(0, -168);
  c.lineTo(26, -164);
  c.lineTo(0, -160);
  c.closePath();
  c.fill();
  // the hat
  c.fillStyle = '#2b2f38';
  c.fillRect(-28, -196, 56, 8);
  c.fillRect(-18, -226, 36, 32);
  c.fillStyle = '#c62828';
  c.fillRect(-18, -202, 36, 6);
  c.restore();
}
