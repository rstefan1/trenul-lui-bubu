/**
 * @file Travel mission "the snowy signals": beside a forest railway, the
 * snow has covered the lamps of the signals, and a driver cannot see them.
 *
 * The train stops by itself before each signal (see LineStopMission). The
 * child rubs the snow off its head (moves the mouse with the button held,
 * or the finger; taps and the space bar work too): the snow falls off in
 * clumps and the red lamp shows. A moment later the signal turns green, as
 * the station ahead lets the train come, and the train goes on.
 *
 * A note shows the gesture. A signal cleaned within a few seconds of the
 * stop earns a star.
 *
 * Configuration (besides id/title/text):
 *   signals   how many signals stand along the line
 *   fact      shown after the last one
 */

import { clamp } from '../core/math.js';
import { drawTouchNote } from '../gfx/hints.js';
import { Particles } from '../gfx/particles.js';
import { fillCircle, fillRoundRect, glow } from '../gfx/shapes.js';
import { TRACK_Y } from '../world/track.js';
import { LineStopMission } from './line-stop-mission.js';

/**
 * @typedef {import('./mission.js').MissionConfig & {signals: number, fact: string}} SnowySignalConfig
 * @typedef {import('./line-stop-mission.js').LinePlace & {snow: number, clearAt: number}} SnowySignal
 *          snow: 1 = covered … 0 = clean; clearAt: mission time when it was cleaned (−1 before)
 */

/** Room a signal takes on the line, and where its post stands in it (stage units). */
const SIGNAL_W = 80;
/** The head of the signal: its middle above the rail, and its size. */
const HEAD_Y = TRACK_Y - 230;
const HEAD_W = 54;
const HEAD_H = 104;
/** Pointer travel that rubs all the snow off, and how much a single tap removes. */
const RUB = 1400;
const TAP = 0.18;
/** Seconds the red lamp shows before the signal turns green. */
const RED_FOR = 1.1;
/** A signal cleaned within this many seconds of the stop earns a star. */
const QUICK = 9;
const SNOW = ['#ffffff', '#e8f0fa', '#d5e2f2'];

export class SnowySignalMission extends LineStopMission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {SnowySignalConfig} config
   */
  constructor(ctx, config) {
    // the view stays on a signal from the moment it is seen until it has turned green
    super(ctx, config, { speed: 300, firstAhead: 2400, spacing: 2600, stopBefore: 220, room: 160, holdView: true });
    this.config = config;
    this.particles = new Particles();
    this.quick = 0;
    /** @type {number | null} the last pointer position while rubbing */
    this.lastX = null;
    this.lastY = 0;
    /** @type {(e: KeyboardEvent) => void} */
    this.onKey = e => {
      if (e.code !== 'Space' || this.ctx.hud.paused) return;
      e.preventDefault();
      this.rub(TAP * RUB);
    };
  }

  /** @param {{duration?: number, window?: {from: number, to: number}}} hints */
  start(hints) {
    super.start(hints);
    window.addEventListener('keydown', this.onKey);
    this.ctx.hud.setCounter('⭐', 0, this.config.signals);
  }

  /** @param {(i: number) => number} at */
  makePlaces(at) {
    return Array.from({ length: this.config.signals }, (_, i) => this.place(at(i), SIGNAL_W, { snow: 1, clearAt: -1 }));
  }

  /** A signal that has just turned green (kept framed a moment), or else the next one. */
  focusPlace() {
    return this.places.find(p => p.done && this.time - p.doneAt < 1.5) ?? this.next;
  }

  /** The signal the train waits before, while it still has snow on it. */
  get covered() {
    const p = /** @type {SnowySignal | null} */ (this.stoppedAt);
    return p && p.snow > 0 ? p : null;
  }

  /**
   * Where the head of a signal is, on the stage.
   * @private
   * @param {SnowySignal} p
   */
  head(p) {
    return { x: this.toScreen(p.worldX) + SIGNAL_W / 2, y: HEAD_Y - this.ctx.world.cameraY };
  }

  /**
   * True when a point is on (or near) the head of the signal.
   * @private
   * @param {SnowySignal} p
   * @param {number} x
   * @param {number} y
   */
  onHead(p, x, y) {
    const h = this.head(p);
    return Math.abs(x - h.x) < HEAD_W + 40 && Math.abs(y - h.y) < HEAD_H / 2 + 60;
  }

  /**
   * Rubs some snow off the signal the train waits before.
   * @private
   * @param {number} travel  stage units of rubbing
   */
  rub(travel) {
    const p = this.covered;
    if (!p) return;
    const before = p.snow;
    p.snow = clamp(p.snow - travel / RUB, 0, 1);
    const h = this.head(p);
    // clumps of snow fall off now and then
    if (Math.floor(before * 8) !== Math.floor(p.snow * 8)) {
      this.particles.burst(h.x + (Math.random() - 0.5) * HEAD_W, h.y + (Math.random() - 0.5) * HEAD_H * 0.6, SNOW, 8, 140);
      this.sound('brush', h.x);
    }
    if (p.snow <= 0) {
      p.clearAt = this.time;
      this.sound('ding', h.x);
    }
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    const s = this.covered;
    if (!s || !this.onHead(s, p.x, p.y)) return;
    this.lastX = p.x;
    this.lastY = p.y;
    this.rub(TAP * RUB);
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerMove(p) {
    if (this.lastX === null) return;
    const s = this.covered;
    if (s && this.onHead(s, p.x, p.y)) this.rub(Math.hypot(p.x - this.lastX, p.y - this.lastY));
    this.lastX = p.x;
    this.lastY = p.y;
  }

  pointerUp() {
    this.lastX = null;
  }

  /** @param {number} dt */
  update(dt) {
    super.update(dt);
    this.particles.update(dt);
    // the red lamp shows for a moment, then the signal turns green and the train may go
    for (const p of /** @type {SnowySignal[]} */ (this.places)) {
      if (p.done || p.clearAt < 0 || this.time - p.clearAt < RED_FOR) continue;
      this.markDone(p);
      if (p.reachedAt < 0 || p.clearAt - p.reachedAt <= QUICK) this.quick += 1;
      this.ctx.hud.setCounter('⭐', this.quick, this.places.length);
      this.sound('collect', this.head(p).x);
      if (!this.next) this.ctx.hud.announce('Semnalele se văd!', this.config.fact, 'Misiune', 4);
    }
  }

  /** @returns {[number, string]} */
  result() {
    const n = this.places.length;
    return [this.quick >= n ? 3 : this.quick >= n - 1 ? 2 : 1, this.quick >= n
      ? 'Bravo! Ai curățat semnalele repede și mecanicii le văd de departe.'
      : 'Semnalele sunt curate, iar noi mergem mai departe spre Novăț!'];
  }

  /**
   * The signal: its post beside the line, its head with two lamps, and the snow on it.
   * @param {CanvasRenderingContext2D} c
   * @param {import('./line-stop-mission.js').LinePlace} place
   * @param {number} x0
   */
  drawPlace(c, place, x0) {
    const p = /** @type {SnowySignal} */ (place);
    const x = x0 + SIGNAL_W / 2;
    const top = HEAD_Y - HEAD_H / 2;
    // the post, standing in the snow just in front of the line
    fillRoundRect(c, x - 6, top + 20, 12, TRACK_Y + 40 - top - 20, 4, '#4a5160');
    fillRoundRect(c, x - 18, TRACK_Y + 34, 36, 10, 4, '#3b4250');
    // the head, with its red lamp on top and the green one below
    fillRoundRect(c, x - HEAD_W / 2, top, HEAD_W, HEAD_H, 14, '#1d1d24');
    const cleaned = p.clearAt >= 0;
    const green = p.done;
    const red = cleaned && !green;
    c.fillStyle = red ? '#ff3b30' : '#4a2020';
    fillCircle(c, x, HEAD_Y - 24, 16);
    c.fillStyle = green ? '#3ddc84' : '#1f3a2a';
    fillCircle(c, x, HEAD_Y + 24, 16);
    if (red) glow(c, x, HEAD_Y - 24, 60, 'rgba(255,70,50,0.55)', 'rgba(255,70,50,0)');
    if (green) glow(c, x, HEAD_Y + 24, 60, 'rgba(60,230,130,0.55)', 'rgba(60,230,130,0)');
    // the snow over the head: a white cap that shrinks as it is rubbed off
    if (p.snow > 0) {
      const k = p.snow;
      c.globalAlpha = 0.35 + 0.65 * k;
      c.fillStyle = '#f4f8ff';
      c.beginPath();
      c.ellipse(x, top + HEAD_H * (1 - k * 0.5), HEAD_W * 0.62 + 8 * k, HEAD_H * 0.55 * k + 6, 0, 0, Math.PI * 2);
      c.fill();
      c.beginPath();
      c.ellipse(x, top + 2, HEAD_W * 0.6 + 6, 16, 0, 0, Math.PI * 2);
      c.fill();
      c.globalAlpha = 1;
    }
    if (this.covered === p) {
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 6);
      c.strokeStyle = `rgba(255,214,90,${0.45 + 0.5 * pulse})`;
      c.lineWidth = 5;
      c.strokeRect(x - HEAD_W / 2 - 14 - pulse * 3, top - 22 - pulse * 3, HEAD_W + 28 + pulse * 6, HEAD_H + 36 + pulse * 6);
    }
  }

  /** @param {CanvasRenderingContext2D} c */
  drawOver(c) {
    const p = this.covered;
    if (p && (p.snow > 0.85 || this.lastX === null)) {
      const h = this.head(p);
      drawTouchNote(c, this.ctx.stage, h.x, h.y - HEAD_H / 2 - 28, 'Curăță zăpada de pe semnal! ⟷');
    }
    this.particles.draw(c);
  }

  dispose() {
    super.dispose();
    window.removeEventListener('keydown', this.onKey);
  }
}
