/**
 * @file Bubu on foot: she gets off her train, walks to where the work is,
 * works there with a tool (a hammer, a brush, or her own paws pushing) and
 * climbs back to her window when it is done.
 *
 * Missions tell her where to go (`getOff`, `goTo`), make her strike or brush
 * (`work`) and send her back (`comeBack`); `aboard` says when she is on the
 * train again (the train must not leave without her). While she is out, the
 * train shows her window empty.
 *
 * Her place is kept in world units along the line (so she stays where she
 * stands when the view pans) and in stage height without the camera's lift.
 */

import { TRACK_Y } from '../world/track.js';
import { drawBubu } from '../train/bubu.js';
import { fillRoundRect } from '../gfx/shapes.js';
import { drawHammer } from './line-stop-mission.js';

/** Bubu's size on foot (stage units). */
export const WORKER_SIZE = 84;
/** Where her feet are when she stands on the snow in front of the line. */
export const GROUND_FEET = TRACK_Y + 58;
/** Walking speed, and the seconds of the hop out of (or back into) her window. */
const WALK = 700;
const HOP = 0.7;

/** @typedef {'hammer' | 'brush' | 'push' | null} WorkerTool */

/**
 * @typedef {object} WorkerMove
 * @property {number} x0  world x at the start (her middle)
 * @property {number} y0  stage y at the start (her middle, without the camera)
 * @property {number} x1
 * @property {number} y1
 * @property {number} t   seconds so far
 * @property {number} length  seconds in all
 * @property {number} arc  height of the jump (0 = she walks)
 */

export class BubuWorker {
  /** @param {import('./mission.js').MissionContext} ctx */
  constructor(ctx) {
    this.ctx = ctx;
    /** @type {'aboard' | 'out' | 'returning'} */
    this.state = 'aboard';
    /** Where she is: world x and stage y of her middle (without the camera). */
    this.x = 0;
    this.y = 0;
    /** @type {WorkerMove | null} */
    this.move = null;
    /** @type {WorkerTool} the tool in her paws */
    this.tool = null;
    /** Seconds since she last struck or brushed (∞: resting). */
    this.workT = Infinity;
    /** 1 = she looks right, −1 = left. */
    this.facing = 1;
    this.time = 0;
  }

  /** True when she is back on the train (or never left it). */
  get aboard() {
    return this.state === 'aboard';
  }

  /** True when she has arrived where she was going. */
  get arrived() {
    return this.state === 'out' && !this.move;
  }

  /**
   * Her window on the train: world x and stage y of its middle.
   * @private
   */
  window() {
    const w = this.ctx.world;
    const p = w.train.bubuPosition;
    return { x: this.ctx.journey.distance + p.x, y: TRACK_Y + p.y };
  }

  /**
   * Starts a move from where she is to (x, feet).
   * @private
   * @param {number} x     world x
   * @param {number} feet  stage y of her feet (without the camera)
   * @param {number} [hop] a jump of this height, and of HOP seconds (else she walks)
   */
  start(x, feet, hop) {
    const y = feet - WORKER_SIZE / 2;
    const dist = Math.hypot(x - this.x, y - this.y);
    if (dist < 2 && !hop) {
      this.move = null;
      return;
    }
    if (Math.abs(x - this.x) > 4) this.facing = x > this.x ? 1 : -1;
    // a step up or down (onto a bridge, a ladder) is a little jump
    const arc = hop ?? (Math.abs(y - this.y) > 18 ? 50 : 0);
    this.move = { x0: this.x, y0: this.y, x1: x, y1: y, t: 0, length: hop ? HOP : Math.max(0.25, dist / WALK), arc };
  }

  /**
   * She gets off her train and goes to a place.
   * @param {number} x     world x of the place
   * @param {number} [feet=GROUND_FEET]
   */
  getOff(x, feet = GROUND_FEET) {
    if (this.state !== 'aboard') {
      this.goTo(x, feet);
      return;
    }
    const w = this.window();
    this.x = w.x;
    this.y = w.y;
    this.state = 'out';
    this.ctx.world.train.setBubuVisible(false, true);
    this.start(x, feet, 110);
  }

  /**
   * She walks (or hops) somewhere else.
   * @param {number} x     world x
   * @param {number} [feet=GROUND_FEET]
   */
  goTo(x, feet = GROUND_FEET) {
    if (this.state === 'aboard') {
      this.getOff(x, feet);
      return;
    }
    this.state = 'out';
    this.start(x, feet);
  }

  /**
   * She works: one stroke of the hammer, a sweep of the brush, a push.
   * @param {WorkerTool} tool
   */
  work(tool) {
    this.tool = tool;
    this.workT = 0;
  }

  /** The work is done: she puts the tool away and climbs back into her window. */
  comeBack() {
    if (this.state === 'aboard') return;
    this.tool = null;
    this.state = 'returning';
    const w = this.window();
    // she walks to below her window first, then hops in
    this.start(w.x, GROUND_FEET);
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.workT += dt;
    const m = this.move;
    if (m) {
      m.t += dt;
      const k = Math.min(1, m.t / m.length);
      const e = k * k * (3 - 2 * k);
      this.x = m.x0 + (m.x1 - m.x0) * e;
      this.y = m.y0 + (m.y1 - m.y0) * e - Math.sin(k * Math.PI) * m.arc;
      if (k >= 1) this.move = null;
    }
    if (this.state === 'returning' && !this.move) {
      const w = this.window();
      if (Math.abs(this.y - w.y) < 2 && Math.abs(this.x - w.x) < 2) {
        // in her window again
        this.state = 'aboard';
        this.ctx.world.train.setBubuVisible(true, true);
      } else {
        this.move = { x0: this.x, y0: this.y, x1: w.x, y1: w.y, t: 0, length: HOP, arc: 110 };
      }
    }
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    if (this.state === 'aboard') return;
    const sx = this.x - this.ctx.journey.distance + this.ctx.world.anchorX;
    const sy = this.y - this.ctx.world.cameraY;
    const walking = this.move && this.move.arc === 0;
    const bob = walking ? Math.abs(Math.sin(this.time * 14)) * 6 : 0;
    // she leans into the work, then straightens
    const lean = this.workT < 0.3 ? Math.sin((this.workT / 0.3) * Math.PI) * 0.22 * this.facing : 0;
    const flying = this.move && this.move.arc > 0;
    drawBubu(c, sx, sy - bob, WORKER_SIZE, (flying ? 0.25 * this.facing : 0) + lean);
    // the tool in her paws, on the side she faces
    const hx = sx + this.facing * WORKER_SIZE * 0.42;
    const hy = sy + WORKER_SIZE * 0.05 - bob;
    if (this.tool === 'hammer') {
      const swing = this.workT < 0.15 ? 0.9 : this.workT < 0.35 ? 0.2 : -0.4;
      drawHammer(c, hx, hy - 30, this.facing * swing);
    } else if (this.tool === 'brush') {
      drawBrush(c, hx, hy, this.workT < 0.4 ? Math.sin(this.workT * 30) * 0.5 : 0, this.facing);
    }
  }
}

/**
 * A long brush for snow, held up and to the side, sweeping.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x  where she holds it
 * @param {number} y
 * @param {number} sweep  radians of the sweep
 * @param {number} facing
 */
function drawBrush(c, x, y, sweep, facing) {
  c.save();
  c.translate(x, y);
  c.rotate(facing * (0.5 + sweep));
  c.fillStyle = '#9c6a3a';
  c.fillRect(-3, -70, 6, 76);
  fillRoundRect(c, -18, -86, 36, 18, 5, '#c62828');
  c.fillStyle = '#f2c14e';
  for (let k = -15; k <= 13; k += 5) c.fillRect(k, -94, 3, 10);
  c.restore();
}
