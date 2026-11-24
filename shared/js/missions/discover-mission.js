/**
 * @file Travel mission "welcome to Maramureș": typical things of the region
 * appear by the line, one after the other (a carved wooden gate, a wooden
 * church with a tall spire, a haystack, a well with a sweep, a wooden
 * house). Tapping one shows what it is and a short fact; there are no wrong
 * answers, only things to discover.
 *
 * The train slows down while something waits to be discovered (see
 * TrainPace), and a note above it says what it is, so even the youngest
 * children know what to touch.
 *
 * Configuration (besides id/title/text):
 *   things   [{kind, name, fact}] — in order; kind: gate | church | haystack | well | house
 *   pace     {far, slow, …} (see TrainPace)
 */

import { drawTouchNote } from '../gfx/hints.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { fillCircle, fillRoundRect } from '../gfx/shapes.js';
import { TRACK_Y } from '../world/track.js';
import { Mission } from './mission.js';
import { TrainPace } from './pace.js';

/**
 * @typedef {'gate' | 'church' | 'haystack' | 'well' | 'house'} ThingKind
 * @typedef {{kind: ThingKind, name: string, fact: string}} ThingSpec
 * @typedef {import('./mission.js').MissionConfig & {things: ThingSpec[], pace: import('./pace.js').PaceOptions}} DiscoverConfig
 *
 * @typedef {object} Thing
 * @property {ThingSpec} spec
 * @property {number} worldX
 * @property {'waiting' | 'found' | 'missed'} state
 * @property {number} t
 */

/** Where the things stand: on the ground in front of the track (stage y of their base). */
const BASE_Y = TRACK_Y + 120;
/** Space between two things along the line, and before the first. */
const SPACING = 1500;
const FIRST_AHEAD = 1400;
/** Half the width of a thing, for touching. */
const HALF_W = 80;

export class DiscoverMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {DiscoverConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {Thing[]} */
    this.things = [];
    this.found = 0;
    this.time = 0;
    this.particles = new Particles();
    /** @type {TrainPace | null} */
    this.pace = null;
  }

  /** @param {{duration?: number, window?: {from: number, to: number}}} hints */
  start(hints) {
    super.start(hints);
    const j = this.ctx.journey;
    this.things = this.config.things.map((spec, i) => ({
      spec, worldX: j.distance + FIRST_AHEAD + i * SPACING, state: /** @type {const} */ ('waiting'), t: 0,
    }));
    this.pace = new TrainPace(j, this.config.pace);
    this.ctx.hud.setCounter('🔎', 0, this.things.length);
  }

  /** Screen x of a world position. */
  toScreen(/** @type {number} */ x) {
    return x - this.ctx.journey.distance + this.ctx.world.anchorX;
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    const cam = this.ctx.world.cameraY;
    for (const t of this.things) {
      if (t.state !== 'waiting') continue;
      const x = this.toScreen(t.worldX);
      if (Math.abs(p.x - x) < HALF_W + 20 && p.y > BASE_Y - 170 - cam && p.y < BASE_Y + 20 - cam) {
        t.state = 'found';
        t.t = 0;
        this.found += 1;
        this.particles.burst(x, BASE_Y - 70 - cam, SPARKS, 20, 220);
        this.sound('collect', x);
        this.ctx.hud.setCounter('🔎', this.found, this.things.length);
        this.ctx.hud.announce(t.spec.name, t.spec.fact, 'Maramureș', 4.5);
        return;
      }
    }
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    const stage = this.ctx.stage;
    for (const t of this.things) {
      t.t += dt;
      if (t.state === 'waiting' && this.toScreen(t.worldX) < stage.viewLeft - HALF_W) t.state = 'missed';
    }
    this.pace?.slowNear(this.things.filter(t => t.state === 'waiting').map(t => this.toScreen(t.worldX)), {
      left: stage.viewLeft, right: stage.viewRight, front: this.ctx.world.anchorX,
    });
    const over = this.things.every(t => t.state !== 'waiting') && this.things.every(t => t.state !== 'found' || t.t > 1.5);
    if (over || this.phase === 'wrapping') this.finishMission();
  }

  /** @private */
  finishMission() {
    if (this.phase === 'finished') return;
    this.pace?.release();
    this.ctx.hud.hideCounter();
    const total = this.things.length;
    this.complete(this.found >= total ? 3 : this.found >= total - 1 ? 2 : 1, this.found >= total
      ? 'Ai descoperit tot ce e frumos în Maramureș!'
      : `Ai descoperit ${this.found} lucruri din ${total}. Bun venit în Maramureș!`);
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const stage = this.ctx.stage;
    const cam = this.ctx.world.cameraY;
    c.save();
    c.translate(0, -cam);
    for (const t of this.things) {
      const x = this.toScreen(t.worldX);
      if (x < stage.viewLeft - 150 || x > stage.viewRight + 150) continue;
      drawThing(c, t.spec.kind, x, BASE_Y);
      if (t.state === 'found' && t.t < 1.6) {
        c.fillStyle = '#2e9d57';
        fillCircle(c, x + 60, BASE_Y - 150, 15);
      }
    }
    c.restore();
    // the note over the next thing to discover
    const next = this.things.find(t => t.state === 'waiting' && this.toScreen(t.worldX) < stage.viewRight - 40);
    if (next) {
      const bob = Math.sin(this.time * 5) * 5;
      drawTouchNote(c, stage, this.toScreen(next.worldX), BASE_Y - 175 - cam + bob, `Ce e? ${next.spec.name}`);
    }
    this.particles.draw(c);
  }

  dispose() {
    this.pace?.release();
    this.ctx.hud.hideCounter();
  }
}

/**
 * One of the typical things of Maramureș, standing on `base`.
 * @param {CanvasRenderingContext2D} c
 * @param {ThingKind} kind
 * @param {number} x
 * @param {number} base
 */
function drawThing(c, kind, x, base) {
  const wood = '#8d5a2b';
  const dark = '#5d3a1a';
  if (kind === 'gate') {
    // a carved wooden gate with its little shingle roof
    c.fillStyle = wood;
    c.fillRect(x - 70, base - 130, 16, 130);
    c.fillRect(x + 54, base - 130, 16, 130);
    c.fillRect(x - 70, base - 136, 140, 14);
    c.fillStyle = dark;
    c.beginPath();
    c.moveTo(x - 86, base - 134);
    c.lineTo(x, base - 168);
    c.lineTo(x + 86, base - 134);
    c.closePath();
    c.fill();
    // the twisted rope carved on the posts, and the sun
    c.strokeStyle = '#e6c08a';
    c.lineWidth = 3;
    for (const px of [x - 62, x + 62]) {
      c.beginPath();
      for (let y = base - 120; y < base - 10; y += 12) {
        c.moveTo(px - 5, y);
        c.lineTo(px + 5, y + 8);
      }
      c.stroke();
    }
    c.fillStyle = '#e6c08a';
    fillCircle(c, x, base - 128, 6);
    fillRoundRect(c, x - 50, base - 112, 100, 112, 4, '#a8743f');
  } else if (kind === 'church') {
    // a wooden church with a very tall, thin spire
    fillRoundRect(c, x - 60, base - 70, 120, 70, 3, wood);
    c.fillStyle = dark;
    c.beginPath();
    c.moveTo(x - 72, base - 66);
    c.lineTo(x - 30, base - 104);
    c.lineTo(x + 30, base - 104);
    c.lineTo(x + 72, base - 66);
    c.closePath();
    c.fill();
    c.fillStyle = wood;
    c.fillRect(x - 12, base - 130, 24, 30);
    c.fillStyle = dark;
    c.beginPath();
    c.moveTo(x - 16, base - 128);
    c.lineTo(x, base - 190);
    c.lineTo(x + 16, base - 128);
    c.closePath();
    c.fill();
    c.fillStyle = '#ffd23f';
    c.fillRect(x - 1.5, base - 202, 3, 14);
    c.fillRect(x - 6, base - 198, 12, 3);
  } else if (kind === 'haystack') {
    // a haystack round a pole
    c.fillStyle = '#5d3a1a';
    c.fillRect(x - 2, base - 140, 4, 140);
    c.fillStyle = '#d9b46a';
    c.beginPath();
    c.moveTo(x - 50, base);
    c.quadraticCurveTo(x - 58, base - 60, x, base - 120);
    c.quadraticCurveTo(x + 58, base - 60, x + 50, base);
    c.closePath();
    c.fill();
    c.fillStyle = '#f4f8ff';
    c.beginPath();
    c.moveTo(x - 30, base - 80);
    c.quadraticCurveTo(x, base - 132, x + 30, base - 80);
    c.closePath();
    c.fill();
  } else if (kind === 'well') {
    // a well with a sweep: a long beam on a forked post
    fillRoundRect(c, x - 26, base - 34, 52, 34, 4, '#9e9e9e');
    c.fillStyle = wood;
    c.fillRect(x + 40, base - 110, 10, 110);
    c.strokeStyle = wood;
    c.lineWidth = 7;
    c.beginPath();
    c.moveTo(x - 30, base - 150);
    c.lineTo(x + 100, base - 80);
    c.stroke();
    c.strokeStyle = '#5d3a1a';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x - 26, base - 148);
    c.lineTo(x - 6, base - 40);
    c.stroke();
    fillRoundRect(c, x - 14, base - 46, 16, 14, 3, '#6d4c41');
  } else {
    // a house of logs with a tall shingle roof
    fillRoundRect(c, x - 64, base - 66, 128, 66, 3, '#a8743f');
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.lineWidth = 2;
    for (let y = base - 58; y < base; y += 11) {
      c.beginPath();
      c.moveTo(x - 64, y);
      c.lineTo(x + 64, y);
      c.stroke();
    }
    c.fillStyle = dark;
    c.beginPath();
    c.moveTo(x - 78, base - 62);
    c.lineTo(x, base - 140);
    c.lineTo(x + 78, base - 62);
    c.closePath();
    c.fill();
    fillRoundRect(c, x - 18, base - 50, 26, 24, 3, '#9fc3e6');
  }
}
