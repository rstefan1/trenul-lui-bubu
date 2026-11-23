/**
 * @file Travel mission "join the stars" (connect the dots in the sky).
 *
 * Above the train, numbered stars appear in the night sky. The child
 * touches them in order, 1, 2, 3…; a golden line joins each to the previous
 * one, and the drawing appears: first the carollers' star, then a Christmas
 * tree. A wrong star only wobbles. The numbers make the task obvious.
 *
 * Configuration (besides id/title/text):
 *   shapes   names of the drawings, in order (see SHAPES)
 */

import { clamp } from '../core/math.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { fillStar, glow } from '../gfx/shapes.js';
import { TRACK_Y } from '../world/track.js';
import { Mission } from './mission.js';

/**
 * Stretches a drawing so it fills the whole square, edge to edge (the
 * stars as far apart as the box allows).
 * @param {Array<[number, number]>} points
 * @returns {ReadonlyArray<[number, number]>}
 */
function fill(points) {
  const xs = points.map(p => p[0]);
  const ys = points.map(p => p[1]);
  const [x0, x1, y0, y1] = [Math.min(...xs), Math.max(...xs), Math.min(...ys), Math.max(...ys)];
  return points.map(([x, y]) => /** @type {[number, number]} */ ([(x - x0) / (x1 - x0), (y - y0) / (y1 - y0)]));
}

/**
 * Drawings as points in a unit square (x right, y down), in the order the
 * child joins them; the last point is joined back to the first.
 * @type {Readonly<Record<string, ReadonlyArray<[number, number]>>>}
 */
const SHAPES = Object.freeze({
  // a plump star: its inner points are far from the outer ones, so no two stars are close
  star: fill(Array.from({ length: 10 }, (_, i) => {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 0.3 : 0.5;
    return /** @type {[number, number]} */ ([0.5 + Math.cos(a) * r, 0.5 + Math.sin(a) * r]);
  })),
  tree: fill([[0.5, 0], [0.7, 0.3], [0.6, 0.3], [0.8, 0.62], [0.68, 0.62], [0.9, 0.95], [0.1, 0.95], [0.32, 0.62], [0.2, 0.62], [0.4, 0.3], [0.3, 0.3]]),
});

/**
 * @typedef {import('./mission.js').MissionConfig & {shapes: string[]}} ConnectStarsConfig
 */

/**
 * How much wider than tall each drawing may be: wider spreads the stars
 * apart; the tree takes it well (a broad fir), the star a little less.
 * @type {Record<string, number>}
 */
const WIDEN = { star: 1.6, tree: 2.1 };

export class ConnectStarsMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {ConnectStarsConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    this.shape = 0;
    /** How many stars of the current drawing are joined. */
    this.joined = 0;
    this.mistakes = 0;
    this.time = 0;
    /** @type {'draw' | 'shine' | 'done'} */
    this.step = 'draw';
    this.stepT = 0;
    /** @type {number[]} seconds each star still wobbles (after a wrong touch) */
    this.wobble = [];
    this.particles = new Particles();
  }

  start(hints) {
    super.start(hints);
    this.wobble = this.points.map(() => 0);
    this.ctx.hud.setCounter('⭐', 0, this.config.shapes.length);
  }

  /** Points of the current drawing. */
  get points() {
    return SHAPES[this.config.shapes[this.shape]] ?? SHAPES.star;
  }

  /**
   * Where the drawing is: as big as the screen allows, so the stars are easy
   * to touch — from just below the heads-up display (with room for the
   * numbers above the top stars) down to the train, its lowest stars over
   * the train's windows; wider than tall, on wide screens.
   */
  get box() {
    const stage = this.ctx.stage;
    const hud = this.ctx.hud;
    const below = Math.max(hud.hudBottom, hud.cardBottom);
    const top = Math.max(stage.viewTop + 40, stage.toStage(0, below).y + 20 + 40 * stage.ui);
    const bottom = Math.min(stage.viewBottom - 30, TRACK_Y - 90 - this.ctx.world.cameraY);
    const size = Math.max(240, Math.min(bottom - top, stage.width * 0.8));
    const widen = WIDEN[this.config.shapes[this.shape]] ?? 1.5;
    const width = Math.min(size * widen, (stage.viewRight - stage.viewLeft) * 0.88);
    // anchored at the bottom: the drawing always comes down to the train
    return { x: stage.width / 2 - width / 2, y: bottom - size, size, width };
  }

  /**
   * Screen position of a point of the drawing.
   * @param {number} i
   */
  at(i) {
    const b = this.box;
    const [u, v] = this.points[i];
    return { x: b.x + u * b.width, y: b.y + v * b.size };
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    if (this.step !== 'draw') return;
    const reach = Math.max(60, 40 / this.ctx.stage.scale);   // generous for fingers
    let best = -1;
    let bestDist = reach;
    this.points.forEach((_, i) => {
      const q = this.at(i);
      const d = Math.hypot(q.x - p.x, q.y - p.y);
      if (d < bestDist) {
        best = i;
        bestDist = d;
      }
    });
    if (best < 0) return;
    if (best === this.joined) {
      this.joined += 1;
      const q = this.at(best);
      this.particles.burst(q.x, q.y, ['#ffd54f', '#ffffff'], 8, 140);
      this.sound('collect', q.x);
      if (this.joined === this.points.length) this.finishShape();
    } else if (best > this.joined) {
      this.mistakes += 1;
      this.oops();
      this.wobble[best] = 0.4;
    }
  }

  /** @private The drawing is complete. */
  finishShape() {
    this.step = 'shine';
    this.stepT = 0;
    const b = this.box;
    this.particles.burst(b.x + b.width / 2, b.y + b.size / 2, SPARKS, 36, 300);
    this.sound('sparkle', b.x + b.width / 2);
    this.ctx.hud.setCounter('⭐', this.shape + 1, this.config.shapes.length);
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.stepT += dt;
    this.particles.update(dt);
    this.wobble = this.wobble.map(w => Math.max(0, w - dt));
    if (this.step === 'shine' && this.stepT > 1.6) {
      if (this.shape + 1 < this.config.shapes.length) {
        this.shape += 1;
        this.joined = 0;
        this.step = 'draw';
        this.wobble = this.points.map(() => 0);
      } else {
        this.step = 'done';
        this.finishMission();
      }
    }
    if (this.phase === 'wrapping' && this.step !== 'done') this.finishMission();
  }

  /** @private */
  finishMission() {
    if (this.phase === 'finished') return;
    this.ctx.hud.hideCounter();
    const done = this.shape + (this.step === 'shine' || this.step === 'done' ? 1 : 0);
    const all = done >= this.config.shapes.length;
    this.complete(all ? (this.mistakes <= 2 ? 3 : 2) : 1,
      all ? 'Stelele de pe cer au desenat steaua colindătorilor și bradul!' : 'Câteva stele n-au fost unite, dar cerul e tot frumos!');
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const n = this.points.length;
    const k = this.ctx.stage.ui;   // bigger stars and numbers on phones
    const shine = this.step === 'shine' ? clamp(this.stepT / 0.6, 0, 1) : 0;
    // a soft patch of night sky behind the drawing, so the stars stand out over the mountains
    const b0 = this.box;
    glow(c, b0.x + b0.width / 2, b0.y + b0.size / 2, Math.max(b0.width, b0.size) * 0.7, 'rgba(5,11,44,0.55)', 'rgba(5,11,44,0)');
    // the lines joined so far (closed when the drawing is complete)
    if (this.joined > 1 || shine) {
      c.strokeStyle = `rgba(255,214,90,${0.8 + 0.2 * shine})`;
      c.lineWidth = (4 + 3 * shine) * k;
      c.lineJoin = 'round';
      c.lineCap = 'round';
      c.beginPath();
      for (let i = 0; i < this.joined; i++) {
        const q = this.at(i);
        if (i) c.lineTo(q.x, q.y);
        else c.moveTo(q.x, q.y);
      }
      if (this.joined === n) c.closePath();
      c.stroke();
    }
    if (shine) {
      const b = this.box;
      glow(c, b.x + b.width / 2, b.y + b.size / 2, b.size * 0.7, `rgba(255,230,140,${0.35 * shine})`, 'rgba(255,230,140,0)');
    }
    // the stars, with their numbers
    for (let i = 0; i < n; i++) {
      const q = this.at(i);
      const done = i < this.joined;
      const next = i === this.joined && this.step === 'draw';
      const wob = Math.sin(this.wobble[i] * 40) * this.wobble[i] * 14 * k;
      const pulse = next ? 1 + 0.18 * Math.sin(this.time * 6) : 1;
      if (next) glow(c, q.x, q.y, 44 * k, 'rgba(255,240,170,0.6)', 'rgba(255,240,170,0)');
      c.fillStyle = done ? '#ffd23f' : '#ffffff';
      fillStar(c, q.x + wob, q.y, 18 * pulse * k, 8 * pulse * k);
      if (!done) {
        c.fillStyle = next ? '#ffe082' : 'rgba(255,255,255,0.85)';
        c.font = `800 ${Math.round((next ? 26 : 22) * k)}px "Baloo 2", system-ui, sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(String(i + 1), q.x + wob, q.y - 32 * k);
      }
    }
    this.particles.draw(c);
  }
}
