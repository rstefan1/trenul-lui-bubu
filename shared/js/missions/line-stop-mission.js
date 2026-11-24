/**
 * @file Base class for travel missions where the train must stop on the
 * line to fix something ahead (a broken bridge, stones on the track…) or
 * wait for something to leave it (animals standing on the rails).
 *
 * Built like the "trees felled by the storm" mission: the mission takes the
 * controls of the train, which goes at a gentle pace and brakes by itself
 * so that it stops right before the next place, and the view pans forward
 * so that the whole place is on screen. When the place is done, the train
 * goes on to the next one; when all are done, the mission ends.
 *
 * Subclasses describe the places (`makePlaces`), draw them (`drawPlace`),
 * react to touches and say how it went (`result`). A place done before the
 * train had to stop never stops it.
 */

import { fillRoundRect } from '../gfx/shapes.js';
import { TrainPace } from './pace.js';
import { Mission } from './mission.js';

/**
 * @typedef {object} LinePlace
 * @property {number} worldX     where the place starts on the line (its left end)
 * @property {number} width      how long it is (stage units)
 * @property {boolean} done      fixed (or left by the animal): the train may pass
 * @property {number} reachedAt  mission time when the train stopped before it (−1 before)
 * @property {number} doneAt     mission time when it was done (−1 before)
 */

/**
 * @typedef {object} LineStopOptions
 * @property {number} speed        the train's pace between the places (stage units/s)
 * @property {number} firstAhead   where the first place is, ahead of the train's front
 * @property {number} spacing      the distance between two places
 * @property {number} [stopBefore=140]  the train stops with its front this far before a place
 * @property {number} [room=120]   space kept on screen beyond the right end of a place
 */

/** The view pans towards a place from this far before the train stops at it. */
const FOCUS_AHEAD = 1700;
/** The front of the train always stays at least this far from the left edge of the screen. */
const KEEP_LOCO = 420;

export class LineStopMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {import('./mission.js').MissionConfig} config
   * @param {LineStopOptions} options
   */
  constructor(ctx, config, options) {
    super(ctx, config);
    this.options = { stopBefore: 140, room: 120, ...options };
    /** @type {LinePlace[]} */
    this.places = [];
    this.time = 0;
    this.endT = 0;
    /** @type {TrainPace | null} */
    this.pace = null;
  }

  /** @param {{duration?: number, window?: {from: number, to: number}}} hints */
  start(hints) {
    super.start(hints);
    const o = this.options;
    this.pace = new TrainPace(this.ctx.journey, { far: o.speed, brake: 240 });
    const j = this.ctx.journey;
    this.places = this.makePlaces((i) => j.distance + o.firstAhead + i * o.spacing);
  }

  /**
   * The places of the mission (subclasses add what they need to each one).
   * @protected
   * @param {(index: number) => number} at  world x of the place with this index
   * @returns {LinePlace[]}
   */
  makePlaces(at) {
    return [];
  }

  /**
   * A new place, with the fields every place needs.
   * @protected
   * @template {object} T
   * @param {number} worldX
   * @param {number} width
   * @param {T} extra
   * @returns {LinePlace & T}
   */
  place(worldX, width, extra) {
    return { worldX, width, done: false, reachedAt: -1, doneAt: -1, ...extra };
  }

  /** The next place the train has not passed yet (not done), if any. */
  get next() {
    return this.places.find(p => !p.done) ?? null;
  }

  /** The place the train is stopped before (it can be worked on), if any. */
  get stoppedAt() {
    const p = this.next;
    return p && p.reachedAt >= 0 ? p : null;
  }

  /**
   * Screen x of a world position.
   * @param {number} x
   */
  toScreen(x) {
    return x - this.ctx.journey.distance + this.ctx.world.anchorX;
  }

  /**
   * Marks a place as done: the train may go on.
   * @protected
   * @param {LinePlace} p
   */
  markDone(p) {
    if (p.done) return;
    p.done = true;
    p.doneAt = this.time;
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    const j = this.ctx.journey;
    const w = this.ctx.world;
    const p = this.next;
    // the view pans forward so the whole place ahead is on screen
    const near = p && p.worldX - this.options.stopBefore - j.distance < FOCUS_AHEAD;
    const right = p ? p.worldX + p.width + this.options.room - j.distance + w.baseAnchorX : 0;
    // (never so far that the locomotive leaves the screen)
    const most = Math.max(0, w.baseAnchorX - this.ctx.stage.viewLeft - KEEP_LOCO);
    w.panTarget = near ? Math.min(most, Math.max(0, right - this.ctx.stage.viewRight)) : 0;
    if (this.pace) {
      if (p) {
        const gap = p.worldX - this.options.stopBefore - j.distance;
        this.pace.stopAt(gap);
        if (p.reachedAt < 0 && gap < 6 && j.speed < 3) {
          p.reachedAt = this.time;
          this.onReached(p);
        }
      } else {
        this.pace.cruise();
      }
    }
    const done = this.places.length > 0 && this.places.every(x => x.done);
    this.endT = done ? this.endT + dt : 0;
    if ((this.endT > 1.2 && this.canEnd) || this.phase === 'wrapping') this.finishMission();
  }

  /**
   * True when the mission may end once every place is done (a place drawn
   * under the line, like a bridge, must first be left behind by the train).
   * @protected
   */
  get canEnd() {
    return true;
  }

  /**
   * The train has just stopped before a place.
   * @protected
   * @param {LinePlace} p
   */
  onReached(p) {}

  /**
   * How it went: stars and the sentence shown with them.
   * @protected
   * @returns {[number, string]}
   */
  result() {
    return [3, 'Bravo!'];
  }

  /** @private */
  finishMission() {
    if (this.phase === 'finished') return;
    this.pace?.release();
    this.pace = null;
    this.ctx.hud.hideCounter();
    this.complete(...this.result());
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const stage = this.ctx.stage;
    c.save();
    c.translate(0, -this.ctx.world.cameraY);
    for (const p of this.places) {
      const x = this.toScreen(p.worldX);
      if (x + p.width < stage.viewLeft - 200 || x > stage.viewRight + 200) continue;
      this.drawPlace(c, p, x);
    }
    c.restore();
    this.drawOver(c);
  }

  /**
   * Draws a place (the camera's lift is already applied: y = TRACK_Y is the rail).
   * @protected
   * @param {CanvasRenderingContext2D} c
   * @param {LinePlace} p
   * @param {number} x  screen x of its left end
   */
  drawPlace(c, p, x) {}

  /**
   * Draws what goes on top of everything (notes, tools), without the camera's lift.
   * @protected
   * @param {CanvasRenderingContext2D} c
   */
  drawOver(c) {}

  dispose() {
    this.ctx.world.panTarget = 0;
    this.pace?.release();
    this.ctx.hud.hideCounter();
  }
}

/**
 * A hammer, its head at (x, y), turned by `angle` (0 = handle down to the right).
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} angle
 */
export function drawHammer(c, x, y, angle) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  fillRoundRect(c, -4, 0, 9, 62, 4, '#9c6a3a');
  fillRoundRect(c, -20, -12, 40, 18, 4, '#5f6b7a');
  c.fillStyle = 'rgba(255,255,255,0.3)';
  c.fillRect(-18, -10, 36, 4);
  c.restore();
}
