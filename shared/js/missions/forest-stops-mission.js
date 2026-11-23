/**
 * @file Travel mission "friends of the forest": the train stops at little
 * forest halts and the animals waiting there climb aboard.
 *
 * Long before a halt comes into view, a note high up on the right shows which
 * animal is waiting ahead, and the big button starts to pulse. When the
 * child presses "Oprește trenul", the train brakes by itself and stops right
 * at the halt, so there is no timing to get right: pressing any time before
 * passing the halt is enough. The animal hops into a coach window and rides
 * along; "Pornește trenul" sets off again.
 *
 * The mission takes the controls of the train and gives them back at the
 * end.
 *
 * Configuration (besides id/title/text):
 *   animals   [{emoji, stop}] — the animal and the name of its halt, in order
 */

import { clamp, easeInOut, lerp } from '../core/math.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { fillRoundRect, glow } from '../gfx/shapes.js';
import { TRACK_Y } from '../world/track.js';
import { el } from '../ui/dom.js';
import { zoomed } from '../gfx/ui-style.js';
import { Mission } from './mission.js';
import { leave } from '../ui/panel.js';

/** Cruising speed between the halts (stage units/s). */
const DRIVE_SPEED = 400;
/** Braking rate the automatic stop plans with (a little under the train's). */
const BRAKE = 240;
/** The note announcing a halt appears this far ahead of the train. */
const ANNOUNCE_AHEAD = 4200;
/** Where the front of the train stops, relative to the halt's sign. */
const STOP_OFFSET = -170;
/** Room the halt's sign needs beyond the stopped train's front. */
const SIGN_ROOM = 360;
/** Seconds of an animal's hop into the train. */
const HOP_TIME = 1.3;
const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

/**
 * @typedef {object} Halt
 * @property {number} worldX   where the sign stands
 * @property {string} emoji
 * @property {string} stop     name of the halt
 * @property {'waiting' | 'boarding' | 'aboard' | 'missed'} state
 * @property {number} t        seconds in the current state
 * @property {number} seat     index in the train's passenger windows
 *
 * @typedef {import('./mission.js').MissionConfig & {animals: Array<{emoji: string, stop: string}>}} ForestStopsConfig
 */

export class ForestStopsMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {ForestStopsConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {Halt[]} */
    this.halts = [];
    /** @type {'driving' | 'braking' | 'stopped'} */
    this.drive = 'driving';
    /** @type {Halt | null} the halt the train is braking for */
    this.target = null;
    /** @type {Halt | null} the halt the train is standing at */
    this.lastHalt = null;
    this.time = 0;
    this.doneT = 0;
    /** @type {import('../journey/journey.js').Controls | null} */
    this.controls = null;
    /** @type {HTMLButtonElement | null} */
    this.button = null;
    this.particles = new Particles();
    /** @type {(e: KeyboardEvent) => void} */
    this.onKey = e => {
      if (e.code !== 'Space' || this.ctx.hud.paused) return;
      e.preventDefault();
      this.press();
    };
  }

  /** @param {{duration?: number, window?: {from: number, to: number}}} hints */
  start(hints) {
    super.start(hints);
    const j = this.ctx.journey;
    this.controls = j.takeControl();
    if (this.controls) this.controls.target = DRIVE_SPEED;
    const seg = j.segment;
    const end = seg.start + (hints.window ? hints.window.to : 0.9) * seg.length - 900;
    const first = j.distance + 3200;
    const n = this.config.animals.length;
    const spacing = Math.max(2600, (end - first) / Math.max(1, n - 1));
    // seats from the front coach backwards, every other window
    const seats = this.ctx.world.train.passengerWindows.length;
    this.halts = this.config.animals.map((a, i) => ({
      worldX: first + i * spacing,
      emoji: a.emoji,
      stop: a.stop,
      state: 'waiting',
      t: 0,
      seat: Math.max(0, seats - 1 - i * 2),
    }));
    this.button = /** @type {HTMLButtonElement} */ (el('button', { class: 'brake-btn', type: 'button' }));
    this.button.addEventListener('pointerdown', e => {
      e.preventDefault();
      this.press();
    });
    document.body.append(this.button);
    window.addEventListener('keydown', this.onKey);
    this.refreshButton();
    this.ctx.hud.setCounter('🚂', 0, n);
  }

  /** The next halt still ahead with its animal waiting. */
  get nextHalt() {
    return this.halts.find(h => h.state === 'waiting') ?? null;
  }

  /** @private The big button: stop (at the next halt) or set off again. */
  press() {
    if (!this.controls) return;
    if (this.drive === 'stopped') {
      if (this.halts.some(h => h.state === 'boarding')) return;
      this.drive = 'driving';
      this.lastHalt = null;
      this.controls.target = DRIVE_SPEED;
      this.controls.stopIn = undefined;
    } else if (this.drive === 'driving') {
      const next = this.nextHalt;
      const gap = next ? next.worldX + STOP_OFFSET - this.ctx.journey.distance : Infinity;
      if (next && gap < ANNOUNCE_AHEAD) {
        this.drive = 'braking';
        this.target = next;
      } else {
        this.drive = 'stopped';
        this.controls.target = 0;
      }
    }
    this.refreshButton();
  }

  /** @private */
  refreshButton() {
    if (!this.button) return;
    const stopped = this.drive === 'stopped';
    const boarding = this.halts.some(h => h.state === 'boarding');
    this.button.textContent = stopped ? '▶ Pornește trenul' : this.drive === 'braking' ? 'Oprim la stație…' : '✋ Oprește trenul';
    this.button.classList.toggle('is-stopped', stopped);
    this.button.disabled = this.drive === 'braking' || boarding;
    const urgent = this.drive === 'driving' && !!this.nextHalt && this.nextHalt.worldX - this.ctx.journey.distance < ANNOUNCE_AHEAD;
    this.button.classList.toggle('is-urgent', urgent || (stopped && !boarding && !!this.nextHalt));
  }

  /** Screen x of a world position. */
  toScreen(/** @type {number} */ x) {
    return x - this.ctx.journey.distance + this.ctx.world.anchorX;
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    const j = this.ctx.journey;
    // while stopping at a halt, pan the view so its sign is fully on screen
    const w = this.ctx.world;
    const atHalt = this.drive === 'braking' || this.halts.some(h => h.state === 'boarding') || (this.drive === 'stopped' && !!this.lastHalt);
    w.panTarget = atHalt ? Math.max(0, w.baseAnchorX + SIGN_ROOM - this.ctx.stage.viewRight) : 0;
    if (this.drive === 'braking' && this.target && this.controls) {
      // plan the speed so the train stops right at the halt
      const gap = this.target.worldX + STOP_OFFSET - j.distance;
      this.controls.target = Math.min(DRIVE_SPEED, Math.sqrt(2 * BRAKE * Math.max(0, gap)));
      this.controls.stopIn = Math.max(0, gap);
      if (gap < 4 || j.speed < 3) {
        this.controls.target = 0;
        if (j.speed < 3) {
          this.drive = 'stopped';
          this.target.state = 'boarding';
          this.lastHalt = this.target;
          this.target.t = 0;
          this.target = null;
        }
      }
    }
    for (const h of this.halts) {
      h.t += dt;
      if (h.state === 'waiting' && j.distance > h.worldX + 140 && h !== this.target) {
        h.state = 'missed';
        h.t = 0;
      } else if (h.state === 'boarding' && h.t >= HOP_TIME) {
        h.state = 'aboard';
        h.t = 0;
        // from now on the animal rides with the train, and gets off at the next station
        this.ctx.world.train.addPassenger(h.emoji, h.seat);
        const seat = this.seatAt(h);
        this.particles.burst(seat.x, seat.y, SPARKS, 16, 200);
        this.sound('hop', seat.x);
        this.ctx.hud.setCounter('🚂', this.halts.filter(x => x.state === 'aboard').length, this.halts.length);
      }
    }
    this.refreshButton();
    const over = this.halts.every(h => h.state === 'aboard' || h.state === 'missed') && this.drive === 'driving';
    this.doneT = over ? this.doneT + dt : 0;
    if (this.doneT > 2.5 || this.phase === 'wrapping') this.finishMission();
  }

  /**
   * Screen position of an animal's seat in the train.
   * @param {Halt} h
   */
  seatAt(h) {
    const w = this.ctx.world;
    const windows = w.train.passengerWindows;
    return w.trainToStage(windows[clamp(h.seat, 0, windows.length - 1)] ?? w.train.bubuPosition);
  }

  /** @private */
  finishMission() {
    if (this.phase === 'finished') return;
    if (this.controls) {
      this.controls = null;
      this.ctx.journey.releaseControl();
    }
    this.ctx.hud.hideCounter();
    const n = this.halts.filter(h => h.state === 'aboard').length;
    const total = this.halts.length;
    this.complete(n >= total ? 3 : n >= Math.ceil(total / 2) ? 2 : 1,
      n >= total ? 'Toți prietenii pădurii au urcat în trenul lui Bubu!' : `Au urcat ${n} prieteni din ${total}.`);
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const stage = this.ctx.stage;
    const cam = this.ctx.world.cameraY;
    // the halts, in front of the track where they are easy to see
    c.save();
    c.translate(0, -cam);
    this.drawHalts(c);
    c.restore();
    for (const h of this.halts) {
      const x = this.toScreen(h.worldX);
      if (h.state === 'boarding') {
        const k = easeInOut(clamp(h.t / HOP_TIME, 0, 1));
        const seat = this.seatAt(h);
        const from = { x: x + 10, y: TRACK_Y + 4 - cam };
        this.drawAnimal(c, h.emoji, lerp(from.x, seat.x, k), lerp(from.y, seat.y, k) - Math.sin(Math.PI * k) * 170, lerp(64, 44, k));
      }
      if (h.state === 'missed' && h.t < 2 && x > stage.viewLeft - 100) {
        c.save();
        c.globalAlpha = 1 - h.t / 2;
        c.fillStyle = '#ffffff';
        c.font = `700 ${Math.round(20 * stage.ui)}px "Baloo 2", system-ui, sans-serif`;
        c.textAlign = 'center';
        c.fillText('Pa! Altă dată!', x + 10, TRACK_Y - 160 - cam);
        c.restore();
      }
    }
    // a note high up on the right, well above the line: who waits at the next halt
    const next = this.nextHalt;
    if (next) {
      const sx = this.toScreen(next.worldX);
      const gap = next.worldX - this.ctx.journey.distance;
      if (sx > stage.viewRight - 40 && gap < ANNOUNCE_AHEAD) {
        // (bigger on phones, from the top right corner)
        const k = stage.ui;
        const right = stage.viewRight - 20;
        const top = stage.toStage(0, this.ctx.hud.hudBottom).y + 24;
        const bx = right - 106;
        const by = top + 46;
        const bob = Math.sin(this.time * 4) * 3;
        zoomed(c, k, right, top, () => {
          glow(c, bx, by + bob, 90, 'rgba(255,230,140,0.45)', 'rgba(255,230,140,0)');
          fillRoundRect(c, bx - 100, by - 46 + bob, 200, 92, 22, '#fffaf0');
          this.drawAnimal(c, next.emoji, bx - 52, by + bob, 50);
          c.fillStyle = '#1b2440';
          c.font = '800 18px "Baloo 2", system-ui, sans-serif';
          c.textAlign = 'center';
          c.textBaseline = 'middle';
          c.fillText('te așteaptă', bx + 32, by - 12 + bob);
          c.fillText(`peste ${Math.max(1, Math.round(gap / 100)) * 10} m`, bx + 32, by + 14 + bob);
        });
      }
    }
    this.particles.draw(c);
  }

  /**
   * The halts on screen (world units, no camera offset).
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  drawHalts(c) {
    const stage = this.ctx.stage;
    for (const h of this.halts) {
      const x = this.toScreen(h.worldX);
      if (x > stage.viewLeft - 260 && x < stage.viewRight + 260) this.drawHalt(c, h, x);
    }
  }

  /**
   * A little forest halt in front of the track: a snowy wooden platform with
   * a lamp, a sign on two posts and, while it waits, the animal on it.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {Halt} h
   * @param {number} x  where the sign stands
   */
  drawHalt(c, h, x) {
    const top = TRACK_Y + 34;           // the platform's surface, just in front of the rails
    const front = TRACK_Y + 70;         // its front edge
    const x0 = x - 170;
    const x1 = x + 130;
    // the platform: planks with a stone edge and snow on top
    c.fillStyle = '#8d6e63';
    c.fillRect(x0, top, x1 - x0, front - top);
    c.fillStyle = '#9e9e9e';
    c.fillRect(x0, front - 8, x1 - x0, 8);
    c.strokeStyle = 'rgba(62,39,35,0.35)';
    c.lineWidth = 2;
    c.beginPath();
    for (let px = x0 + 30; px < x1; px += 30) {
      c.moveTo(px, top + 4);
      c.lineTo(px, front - 8);
    }
    c.stroke();
    c.fillStyle = '#f4f8ff';
    fillRoundRect(c, x0 - 4, top - 6, x1 - x0 + 8, 10, 5, '#f4f8ff');
    // a lamp at the end of the platform
    c.fillStyle = '#4a5568';
    c.fillRect(x1 - 30, top - 170, 6, 170);
    glow(c, x1 - 27, top - 172, 50, 'rgba(255,220,130,0.5)', 'rgba(255,220,130,0)');
    fillRoundRect(c, x1 - 38, top - 182, 22, 12, 4, '#fff3c0');
    // the sign on two posts standing on the platform
    c.fillStyle = '#6d4c41';
    c.fillRect(x - 64, top - 120, 8, 120);
    c.fillRect(x + 56, top - 120, 8, 120);
    fillRoundRect(c, x - 90, top - 160, 180, 52, 10, '#8d6e63');
    fillRoundRect(c, x - 84, top - 154, 168, 40, 8, '#fff3d6');
    fillRoundRect(c, x - 94, top - 166, 188, 12, 6, 'rgba(244,248,255,0.95)');
    c.fillStyle = '#4e342e';
    c.font = '800 19px "Baloo 2", system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(h.stop, x, top - 133);
    if (h.state === 'waiting' || h.state === 'missed') {
      const hop = h.state === 'waiting' ? Math.abs(Math.sin(this.time * 3)) * 8 : 0;
      this.drawAnimal(c, h.emoji, x + 10, top - 30 - hop, 64);
    }
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {string} emoji
   * @param {number} x
   * @param {number} y
   * @param {number} size
   */
  drawAnimal(c, emoji, x, y, size) {
    c.font = `${Math.round(size)}px ${EMOJI_FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(emoji, x, y);
  }

  dispose() {
    this.ctx.world.panTarget = 0;
    if (this.controls) this.ctx.journey.releaseControl();
    leave(this.button);
    window.removeEventListener('keydown', this.onKey);
  }
}
