/**
 * @file Travel mission "the broken bridge": on a forest railway, the autumn
 * flood has torn planks out of a small wooden bridge over a mountain stream.
 *
 * The train stops by itself before the bridge (see LineStopMission). Holes
 * gape in the deck, with the water seen through them. The child:
 *
 *   1. touches every hole: a new plank flies in from the stack by the line;
 *   2. touches every new plank to nail it: two strokes of the hammer each
 *      ("poc!"), and the nails sink in.
 *
 * Then the train crosses slowly. A note shows what to touch at every step.
 * A bridge mended within a few seconds of the stop gets three stars.
 *
 * Configuration (besides id/title/text):
 *   holes   how many planks are missing
 *   fact    shown when the bridge is mended
 */

import { drawTouchNote } from '../gfx/hints.js';
import { Particles } from '../gfx/particles.js';
import { fillRoundRect } from '../gfx/shapes.js';
import { TRACK_Y } from '../world/track.js';
import { LineStopMission, drawHammer } from './line-stop-mission.js';

/**
 * @typedef {import('./mission.js').MissionConfig & {holes: number, fact: string}} BridgeConfig
 *
 * @typedef {object} Plank
 * @property {number} x        middle of the plank, from the left end of the bridge
 * @property {'ok' | 'hole' | 'flying' | 'loose' | 'fixed'} state
 * @property {number} nails    strokes of the hammer it got (2 = fixed)
 * @property {number} t        seconds since its state changed
 */

/** Length of the bridge and of one plank of its deck (stage units). */
const BRIDGE = 440;
const PLANK = 34;
/** Strokes of the hammer a plank needs. */
const NAILS = 2;
/** The bridge mended within this many seconds of the stop earns three stars, within the second two. */
const QUICK = 22;
const SLOW = 40;
const SPLINTERS = ['#c89a5e', '#e6c08a', '#8d5a2b'];

export class BridgeRepairMission extends LineStopMission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {BridgeConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config, { speed: 280, firstAhead: 2600, spacing: 0, stopBefore: 120, room: 160 });
    this.config = config;
    this.particles = new Particles();
    /** Where the last hammer stroke landed, and when. */
    this.stroke = { x: 0, y: 0, t: -1 };
  }

  /** @param {(i: number) => number} at */
  makePlaces(at) {
    const n = Math.floor(BRIDGE / PLANK);
    // the holes are spread over the bridge, never at its very ends
    const holes = new Set();
    const want = Math.min(this.config.holes, n - 4);
    for (let k = 0; k < want; k++) holes.add(2 + Math.round((k + 0.5) * ((n - 4) / want) - 0.5));
    /** @type {Plank[]} */
    const planks = Array.from({ length: n }, (_, i) => ({
      x: (i + 0.5) * PLANK, state: holes.has(i) ? 'hole' : 'ok', nails: 0, t: 0,
    }));
    return [this.place(at(0), BRIDGE, { planks })];
  }

  /** The bridge. */
  get bridge() {
    return /** @type {import('./line-stop-mission.js').LinePlace & {planks: Plank[]}} */ (this.places[0]);
  }

  onReached() {
    this.ctx.hud.setCounter('🔨', 0, this.config.holes);
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    const b = this.stoppedAt ? this.bridge : null;
    if (!b) return;
    const x0 = this.toScreen(b.worldX);
    const y = TRACK_Y - this.ctx.world.cameraY;
    if (p.y < y - 120 || p.y > y + 140) return;
    // the nearest plank that needs something
    let best = null;
    let dist = 46;
    for (const k of b.planks) {
      if (k.state !== 'hole' && k.state !== 'loose') continue;
      const d = Math.abs(x0 + k.x - p.x);
      if (d < dist) {
        dist = d;
        best = k;
      }
    }
    if (!best) return;
    const x = x0 + best.x;
    if (best.state === 'hole') {
      best.state = 'flying';
      best.t = 0;
      this.sound('whoosh', x);
    } else {
      best.nails += 1;
      this.stroke = { x, y: y + 6, t: this.time };
      this.sound('thud', x);
      this.particles.burst(x, y + 6, SPLINTERS, 6, 120);
      if (best.nails >= NAILS) {
        best.state = 'fixed';
        best.t = 0;
        this.sound('ding', x);
        const fixed = b.planks.filter(k => k.state === 'fixed').length;
        this.ctx.hud.setCounter('🔨', fixed, this.config.holes);
        if (fixed >= this.config.holes) {
          this.markDone(b);
          this.ctx.hud.announce('Podul e reparat!', this.config.fact, 'Misiune', 4);
        }
      }
    }
  }

  /** @param {number} dt */
  update(dt) {
    super.update(dt);
    this.particles.update(dt);
    for (const k of this.bridge?.planks ?? []) {
      k.t += dt;
      if (k.state === 'flying' && k.t > 0.45) {
        k.state = 'loose';
        k.t = 0;
        this.sound('hop');
      }
    }
  }

  /** The bridge is drawn by the mission: it ends only when the bridge is behind, off the screen. */
  get canEnd() {
    const b = this.bridge;
    return !b || this.toScreen(b.worldX + BRIDGE + 60) < this.ctx.stage.viewLeft;
  }

  /** @returns {[number, string]} */
  result() {
    const b = this.bridge;
    const took = b && b.doneAt >= 0 && b.reachedAt >= 0 ? b.doneAt - b.reachedAt : Infinity;
    return [took <= QUICK ? 3 : took <= SLOW ? 2 : 1, took <= QUICK
      ? 'Bravo, meștere! Podul e din nou bun și am trecut peste el.'
      : 'Am reparat podul și am trecut mai departe!'];
  }

  /**
   * The stream under the bridge, the wooden trestles and the deck with its holes.
   * @param {CanvasRenderingContext2D} c
   * @param {import('./line-stop-mission.js').LinePlace} place
   * @param {number} x0
   */
  drawPlace(c, place, x0) {
    const b = /** @type {import('./line-stop-mission.js').LinePlace & {planks: Plank[]}} */ (place);
    const y = TRACK_Y;
    const x1 = x0 + BRIDGE;
    // the little gorge of the stream, cut into the snow below the line
    c.fillStyle = '#c9d6e6';
    c.beginPath();
    c.moveTo(x0 - 30, y + 4);
    c.quadraticCurveTo(x0 + 40, y + 110, x0 + BRIDGE / 2, y + 116);
    c.quadraticCurveTo(x1 - 40, y + 110, x1 + 30, y + 4);
    c.closePath();
    c.fill();
    c.fillStyle = '#a9bbd2';
    c.beginPath();
    c.moveTo(x0 + 10, y + 28);
    c.quadraticCurveTo(x0 + 60, y + 100, x0 + BRIDGE / 2, y + 108);
    c.quadraticCurveTo(x1 - 60, y + 100, x1 - 10, y + 28);
    c.lineTo(x1 - 10, y + 50);
    c.quadraticCurveTo(x0 + BRIDGE / 2, y + 90, x0 + 10, y + 50);
    c.closePath();
    c.fill();
    // the stream, with a few white ripples
    c.fillStyle = '#4f86c0';
    c.beginPath();
    c.ellipse(x0 + BRIDGE / 2, y + 100, BRIDGE * 0.32, 12, 0, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.6)';
    for (let k = 0; k < 3; k++) {
      const rx = x0 + BRIDGE * (0.32 + k * 0.16) + Math.sin(this.time * 2 + k) * 8;
      c.fillRect(rx, y + 97 + (k % 2) * 4, 22, 3);
    }
    // the wooden trestles holding the deck
    c.strokeStyle = '#6d4524';
    c.lineWidth = 9;
    c.lineCap = 'round';
    c.beginPath();
    for (const u of [0.25, 0.75]) {
      const tx = x0 + BRIDGE * u;
      c.moveTo(tx - 30, y + 98);
      c.lineTo(tx - 8, y + 24);
      c.moveTo(tx + 30, y + 98);
      c.lineTo(tx + 8, y + 24);
      c.moveTo(tx - 22, y + 66);
      c.lineTo(tx + 22, y + 66);
    }
    c.stroke();
    // the beam under the deck
    fillRoundRect(c, x0 - 10, y + 15, BRIDGE + 20, 11, 3, '#5a3a1e');
    // the planks of the deck (the rail of the world is drawn above them)
    for (const k of b.planks) {
      const px = x0 + k.x - PLANK / 2 + 2;
      if (k.state === 'hole') {
        // the water seen through the hole, and a pulsing ring around it while the train waits
        c.fillStyle = '#2f4f74';
        c.fillRect(px, y + 4, PLANK - 4, 12);
        if (this.stoppedAt) {
          const pulse = 0.5 + 0.5 * Math.sin(this.time * 6);
          c.strokeStyle = `rgba(255,214,90,${0.5 + 0.5 * pulse})`;
          c.lineWidth = 4;
          c.strokeRect(px - 5 - pulse * 2, y - 8 - pulse * 2, PLANK + 6 + pulse * 4, 32 + pulse * 4);
        }
        continue;
      }
      let py = y + 4;
      let dx = 0;
      if (k.state === 'flying') {
        // from the stack of planks by the line, in an arc
        const u = Math.min(1, k.t / 0.45);
        dx = (1 - u) * (x0 - 90 - (x0 + k.x));
        py = y + 4 + (1 - u) * 60 - Math.sin(u * Math.PI) * 90;
      }
      const fresh = k.state === 'loose' || k.state === 'flying' || (k.state === 'fixed' && k.t < 0.6);
      c.fillStyle = fresh ? '#e2b779' : '#9c6a3a';
      c.fillRect(px + dx, py, PLANK - 4, 12);
      c.fillStyle = 'rgba(0,0,0,0.18)';
      c.fillRect(px + dx, py + 9, PLANK - 4, 3);
      if (k.state === 'loose' || k.state === 'fixed') {
        // the nails: sticking up until they are hammered in
        c.fillStyle = '#5f6b7a';
        for (let n = 0; n < NAILS; n++) {
          const nx = px + 7 + n * (PLANK - 18);
          const up = n < k.nails ? 0 : 7;
          c.fillRect(nx, py - up, 3, up + 2);
          c.fillRect(nx - 2, py - up - 2, 7, 3);
        }
      }
    }
    // the stack of new planks by the line
    for (let k = 0; k < 3; k++) fillRoundRect(c, x0 - 130 + k * 4, y + 50 - k * 9, 70, 9, 2, '#e2b779');
  }

  /** @param {CanvasRenderingContext2D} c */
  drawOver(c) {
    const b = this.stoppedAt ? this.bridge : null;
    if (b) {
      const x0 = this.toScreen(b.worldX);
      const y = TRACK_Y - this.ctx.world.cameraY;
      const hole = b.planks.find(k => k.state === 'hole');
      const loose = b.planks.find(k => k.state === 'loose');
      if (loose) {
        const swing = this.time - this.stroke.t < 0.25 ? 0.2 : -0.5 + Math.sin(this.time * 5) * 0.15;
        drawHammer(c, x0 + loose.x + 26, y - 30, swing);
        drawTouchNote(c, this.ctx.stage, x0 + loose.x, y - 46, 'Bate cuiele! 🔨');
      } else if (hole) {
        drawTouchNote(c, this.ctx.stage, x0 + hole.x, y - 16, 'Pune o scândură!');
      }
    }
    this.particles.draw(c);
  }
}
