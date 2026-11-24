/**
 * @file Travel mission "the broken line": stones have fallen from the
 * mountain onto a forest railway, and one of the sleepers under the rail
 * has cracked.
 *
 * The train stops by itself before each place (see LineStopMission):
 *
 *   1. the stones on the rails: the child touches each one and it rolls
 *      down the slope;
 *   2. the cracked sleeper: the child touches it and Bubu pulls it out,
 *      touches the empty place and a new sleeper slides in, then touches
 *      the spikes that hold the rail to it, one hammer stroke each.
 *
 * Bubu gets off her train at each place and does the work herself: she
 * pushes the stones away and hammers the spikes, then climbs back in.
 *
 * A note shows what to touch at every step. Places cleared within a few
 * seconds of the stop count for the stars.
 *
 * Configuration (besides id/title/text):
 *   stones   how many stones lie on the rails
 *   spikes   how many spikes hold the rail to the new sleeper
 *   fact     shown when the line is mended
 */

import { drawTouchNote } from '../gfx/hints.js';
import { Particles } from '../gfx/particles.js';
import { fillRoundRect } from '../gfx/shapes.js';
import { TRACK_Y } from '../world/track.js';
import { BubuWorker } from './bubu-worker.js';
import { LineStopMission } from './line-stop-mission.js';

/**
 * @typedef {import('./mission.js').MissionConfig & {stones: number, spikes: number, fact: string}} TrackConfig
 *
 * @typedef {{x: number, r: number, t: number, gone: boolean}} Stone   x from the left end of the place
 * @typedef {{step: 'broken' | 'empty' | 'sliding' | 'spikes', t: number, spikes: number}} Sleeper
 */

/** Length of the place with the stones, and of the one with the sleeper (stage units). */
const STONES_W = 300;
const SLEEPER_W = 120;
/** A place cleared within this many seconds of the stop counts as quick. */
const QUICK = 12;
const DUST = ['#9a8f86', '#c7beb5', '#7b726b'];
const SPLINTERS = ['#c89a5e', '#8d5a2b', '#e6c08a'];

export class TrackRepairMission extends LineStopMission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {TrackConfig} config
   */
  constructor(ctx, config) {
    // once the view has moved forward to the first place, it stays there
    super(ctx, config, { speed: 300, firstAhead: 2400, spacing: 2600, stopBefore: 130, room: 150, holdView: true });
    this.config = config;
    this.particles = new Particles();
    this.quick = 0;
    this.worker = new BubuWorker(ctx);
  }

  /** @param {(i: number) => number} at */
  makePlaces(at) {
    const n = this.config.stones;
    /** @type {Stone[]} */
    const stones = Array.from({ length: n }, (_, i) => ({ x: 50 + (i * (STONES_W - 100)) / Math.max(1, n - 1), r: 30 + ((i * 7) % 3) * 6, t: 0, gone: false }));
    /** @type {Sleeper} */
    const sleeper = { step: 'broken', t: 0, spikes: 0 };
    return [this.place(at(0), STONES_W, { kind: 'stones', stones }), this.place(at(1), SLEEPER_W, { kind: 'sleeper', sleeper })];
  }

  /** @param {import('./line-stop-mission.js').LinePlace} p */
  onReached(p) {
    this.ctx.hud.setCounter('⭐', this.quick, this.places.length);
    // Bubu gets off and walks to the place
    this.worker?.getOff(p.worldX - 40);
  }

  /**
   * The place is clear: a star if it was quick.
   * @private
   * @param {import('./line-stop-mission.js').LinePlace} p
   * @param {string} title
   * @param {string} text
   */
  cleared(p, title, text) {
    this.markDone(p);
    if (p.reachedAt < 0 || this.time - p.reachedAt <= QUICK) this.quick += 1;
    this.ctx.hud.setCounter('⭐', this.quick, this.places.length);
    this.sound('ding');
    this.ctx.hud.announce(title, text, 'Misiune', 3.5);
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    const place = /** @type {any} */ (this.stoppedAt);
    if (!place) return;
    const x0 = this.toScreen(place.worldX);
    const y = TRACK_Y - this.ctx.world.cameraY;
    if (p.y < y - 150 || p.y > y + 110 || p.x < x0 - 60 || p.x > x0 + place.width + 60) return;
    if (place.kind === 'stones') {
      /** @type {Stone | null} */
      let best = null;
      let dist = 80;
      for (const s of /** @type {Stone[]} */ (place.stones)) {
        const d = Math.abs(x0 + s.x - p.x);
        if (!s.gone && d < dist) {
          dist = d;
          best = s;
        }
      }
      if (!best) return;
      this.worker?.goTo(place.worldX + best.x - best.r - 34);
      this.worker?.work('push');
      best.gone = true;
      best.t = 0;
      this.sound('thud', x0 + best.x);
      this.particles.burst(x0 + best.x, y - best.r, DUST, 10, 160);
      if (place.stones.every((/** @type {Stone} */ s) => s.gone)) {
        this.cleared(place, 'Linia e liberă!', 'Pietrele s-au rostogolit la vale. Mai departe!');
      }
      return;
    }
    /** @type {Sleeper} */
    const s = place.sleeper;
    const cx = x0 + SLEEPER_W / 2;
    this.worker?.goTo(place.worldX + SLEEPER_W / 2 - 44);
    this.worker?.work(s.step === 'spikes' ? 'hammer' : 'push');
    if (s.step === 'broken') {
      s.step = 'empty';
      s.t = 0;
      this.sound('crunch', cx);
      this.particles.burst(cx, y + 8, SPLINTERS, 12, 150);
    } else if (s.step === 'empty') {
      s.step = 'sliding';
      s.t = 0;
      this.sound('whoosh', cx);
    } else if (s.step === 'spikes') {
      s.spikes += 1;
      this.sound('thud', cx);
      this.particles.burst(cx + (s.spikes % 2 ? -22 : 22), y + 2, ['#c9ced6', '#ffffff'], 5, 110);
      if (s.spikes >= this.config.spikes) this.cleared(place, 'Linia e reparată!', this.config.fact);
    }
  }

  /** @param {number} dt */
  update(dt) {
    super.update(dt);
    this.particles.update(dt);
    for (const place of /** @type {any[]} */ (this.places)) {
      if (place.kind === 'stones') for (const s of place.stones) s.t += dt;
      else {
        place.sleeper.t += dt;
        if (place.sleeper.step === 'sliding' && place.sleeper.t > 0.5) {
          place.sleeper.step = 'spikes';
          place.sleeper.t = 0;
          this.sound('hop');
        }
      }
    }
  }

  /** @returns {[number, string]} */
  result() {
    const n = this.places.length;
    return [this.quick >= n ? 3 : this.quick >= n - 1 ? 2 : 1, this.quick >= n
      ? 'Bravo, muncitor de cale ferată! Linia e ca nouă.'
      : 'Am reparat linia și mergem mai departe!'];
  }

  /**
   * @param {CanvasRenderingContext2D} c
   * @param {import('./line-stop-mission.js').LinePlace} place
   * @param {number} x0
   */
  drawPlace(c, place, x0) {
    const p = /** @type {any} */ (place);
    const y = TRACK_Y;
    const waiting = this.stoppedAt === place;
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 6);
    if (p.kind === 'stones') {
      for (const s of /** @type {Stone[]} */ (p.stones)) {
        let sx = x0 + s.x;
        let sy = y - s.r * 0.8;
        let alpha = 1;
        if (s.gone) {
          // it rolls down the slope, towards the child, and fades
          const k = Math.min(1, s.t / 0.9);
          if (k >= 1) continue;
          sx += k * 70;
          sy += k * k * 220;
          alpha = 1 - k;
        }
        c.globalAlpha = alpha;
        drawStone(c, sx, sy, s.r, s.gone ? s.t * 8 : 0);
        c.globalAlpha = 1;
        if (waiting && !s.gone) {
          c.strokeStyle = `rgba(255,214,90,${0.4 + 0.5 * pulse})`;
          c.lineWidth = 4;
          c.beginPath();
          c.arc(sx, sy, s.r + 8 + pulse * 3, 0, Math.PI * 2);
          c.stroke();
        }
      }
      return;
    }
    // once mended it is a sleeper like the others (the train rolls over it)
    if (p.done) return;
    /** @type {Sleeper} */
    const s = p.sleeper;
    const cx = x0 + SLEEPER_W / 2;
    // the place is drawn a little larger than a normal sleeper, so it is easy to see and touch
    const w = 44;
    const h = 16;
    if (s.step === 'broken') {
      fillRoundRect(c, cx - w / 2, y + 2, w, h, 3, '#5a4034');
      // the crack, in the middle
      c.strokeStyle = '#1d1d24';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(cx - 4, y + 2);
      c.lineTo(cx + 3, y + 8);
      c.lineTo(cx - 3, y + 12);
      c.lineTo(cx + 4, y + 18);
      c.stroke();
    } else if (s.step === 'empty') {
      c.fillStyle = '#7b726b';
      c.fillRect(cx - w / 2, y + 4, w, h - 2);
    } else {
      const k = s.step === 'sliding' ? Math.min(1, s.t / 0.5) : 1;
      // the new sleeper slides in from the side of the line, towards the rail
      fillRoundRect(c, cx - w / 2, y + 2 + (1 - k) * 90, w, h, 3, '#9c6a3a');
      c.fillStyle = 'rgba(255,255,255,0.2)';
      c.fillRect(cx - w / 2 + 4, y + 4 + (1 - k) * 90, w - 8, 3);
      if (s.step === 'spikes') {
        // the spikes beside the rail: sticking up until hammered in
        c.fillStyle = '#4a5160';
        for (let n = 0; n < this.config.spikes; n++) {
          const sx = cx + (n % 2 ? 1 : -1) * (12 + Math.floor(n / 2) * 8);
          const up = n < s.spikes ? 0 : 10;
          c.fillRect(sx - 2, y - 2 - up, 4, up + 4);
          c.fillRect(sx - 4, y - 4 - up, 8, 3);
        }
      }
    }
    if (waiting && s.step !== 'sliding') {
      c.strokeStyle = `rgba(255,214,90,${0.4 + 0.5 * pulse})`;
      c.lineWidth = 4;
      c.strokeRect(cx - w / 2 - 10 - pulse * 2, y - 18 - pulse * 2, w + 20 + pulse * 4, h + 30 + pulse * 4);
    }
  }

  /** @param {CanvasRenderingContext2D} c */
  drawOver(c) {
    const place = /** @type {any} */ (this.stoppedAt);
    if (place) {
      const x0 = this.toScreen(place.worldX);
      const y = TRACK_Y - this.ctx.world.cameraY;
      const stage = this.ctx.stage;
      if (place.kind === 'stones') {
        const s = place.stones.find((/** @type {Stone} */ x) => !x.gone);
        if (s) drawTouchNote(c, stage, x0 + s.x, y - Math.max(s.r * 1.8 + 6, 96), 'Dă piatra la o parte!');
      } else {
        const cx = x0 + SLEEPER_W / 2;
        const step = place.sleeper.step;
        const text = step === 'broken' ? 'Scoate traversa ruptă!' : step === 'empty' ? 'Pune o traversă nouă!' : step === 'spikes' ? 'Bate crampoanele! 🔨' : '';
        if (text) drawTouchNote(c, stage, cx, y - 96, text);
      }
    }
    this.particles.draw(c);
  }
}

/**
 * A grey mountain stone with a little snow on top.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {number} spin
 */
function drawStone(c, x, y, r, spin) {
  c.save();
  c.translate(x, y);
  c.rotate(spin);
  c.fillStyle = '#8a8580';
  c.beginPath();
  c.moveTo(-r, r * 0.3);
  c.lineTo(-r * 0.7, -r * 0.6);
  c.lineTo(r * 0.1, -r);
  c.lineTo(r * 0.9, -r * 0.4);
  c.lineTo(r, r * 0.5);
  c.lineTo(r * 0.2, r * 0.8);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(0,0,0,0.18)';
  c.beginPath();
  c.moveTo(r * 0.1, -r);
  c.lineTo(r * 0.9, -r * 0.4);
  c.lineTo(r, r * 0.5);
  c.lineTo(r * 0.2, r * 0.8);
  c.closePath();
  c.fill();
  c.fillStyle = '#f4f8ff';
  c.beginPath();
  c.moveTo(-r * 0.7, -r * 0.6);
  c.lineTo(r * 0.1, -r);
  c.lineTo(r * 0.6, -r * 0.6);
  c.quadraticCurveTo(0, -r * 0.45, -r * 0.7, -r * 0.6);
  c.fill();
  c.restore();
}
