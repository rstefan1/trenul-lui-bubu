/**
 * @file Travel mission "frost flowers".
 *
 * In the cold before dawn, round frost flowers grow on Bubu's window. The
 * child rubs one (moves the mouse with the button held, or the finger) and
 * the frost melts away, uncovering a little picture of something Bucovina
 * is known for. One frost flower at a time; when most of it is clear, it
 * melts completely and the next one grows.
 *
 * Configuration (besides id/title/text):
 *   pictures   names of the pictures, in order (see PICTURES)
 */

import { TAU, clamp } from '../core/math.js';
import { createOffscreen } from '../core/canvas-cache.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { drawFir, fillCircle, glow } from '../gfx/shapes.js';
import { drawSleighTeam } from '../gfx/sleigh.js';
import { TRACK_Y } from '../world/track.js';
import { Mission } from './mission.js';

/** Radius of a frost flower (stage units). */
const R = 125;
/** Resolution of the grid that measures how much frost is gone. */
const GRID = 12;
/** A frost flower melts completely when this share of it is clear. */
const CLEAR = 0.62;
/** Radius of the "cloth" that wipes the frost. */
const WIPE = 34;

/**
 * Pictures under the frost, drawn in a circle of radius 1 centred at (0, 0).
 * @type {Readonly<Record<string, (c: CanvasRenderingContext2D, t: number) => void>>}
 */
const PICTURES = Object.freeze({
  // the fortress of Suceava on its hill, at dawn
  fortress: c => {
    const g = c.createLinearGradient(0, -1, 0, 1);
    g.addColorStop(0, '#f6b26b');
    g.addColorStop(1, '#fbe3c0');
    c.fillStyle = g;
    c.fillRect(-1, -1, 2, 2);
    c.fillStyle = '#c9d5ea';
    c.beginPath();
    c.ellipse(0, 0.95, 1.3, 0.55, 0, 0, TAU);
    c.fill();
    c.fillStyle = '#8d7b68';
    c.fillRect(-0.55, -0.05, 1.1, 0.5);
    for (const x of [-0.6, -0.15, 0.3]) {
      c.fillRect(x, -0.3, 0.3, 0.75);
      c.fillStyle = '#6d4c41';
      c.beginPath();
      c.moveTo(x - 0.04, -0.3);
      c.lineTo(x + 0.15, -0.55);
      c.lineTo(x + 0.34, -0.3);
      c.fill();
      c.fillStyle = '#8d7b68';
    }
    c.fillStyle = '#3e2f27';
    c.fillRect(-0.08, 0.2, 0.16, 0.25);
    c.fillStyle = '#e53935';
    c.fillRect(0.45, -0.78, 0.02, 0.24);
    c.fillRect(0.47, -0.78, 0.14, 0.09);
  },
  // the morning star over the hills
  star: c => {
    const g = c.createLinearGradient(0, -1, 0, 1);
    g.addColorStop(0, '#1d2b5e');
    g.addColorStop(1, '#d98b7a');
    c.fillStyle = g;
    c.fillRect(-1, -1, 2, 2);
    glow(c, 0.2, -0.4, 0.45, 'rgba(255,250,220,0.9)', 'rgba(255,250,220,0)');
    c.fillStyle = '#fffbe8';
    fillCircle(c, 0.2, -0.4, 0.08);
    c.fillStyle = '#3c4f7a';
    c.beginPath();
    c.moveTo(-1, 0.5);
    c.quadraticCurveTo(-0.4, 0.1, 0.1, 0.45);
    c.quadraticCurveTo(0.6, 0.15, 1, 0.4);
    c.lineTo(1, 1);
    c.lineTo(-1, 1);
    c.fill();
    for (const [x, s] of [[-0.6, 0.35], [-0.35, 0.28], [0.5, 0.32], [0.75, 0.26]]) drawFir(c, x, 0.62, s, { color: '#1f3b45', shade: '#1a3239' });
  },
  // a reindeer sleigh flying over the snow
  sleigh: (c, t) => {
    const g = c.createLinearGradient(0, -1, 0, 1);
    g.addColorStop(0, '#24366e');
    g.addColorStop(1, '#8aa0d0');
    c.fillStyle = g;
    c.fillRect(-1, -1, 2, 2);
    c.fillStyle = '#eef3fb';
    c.beginPath();
    c.ellipse(0, 1, 1.4, 0.45, 0, 0, TAU);
    c.fill();
    c.save();
    c.scale(0.0042, 0.0042);
    drawSleighTeam(c, -120, 10, 0.9, t);
    c.restore();
  },
});

/**
 * @typedef {object} Bloom
 * @property {string} picture
 * @property {HTMLCanvasElement} frost      the frost layer (wiped with destination-out)
 * @property {CanvasRenderingContext2D} fc
 * @property {boolean[]} cells              grid cells already wiped
 * @property {number} grow                  0..1, how far it has grown
 * @property {number} melt                  seconds since it started melting (−1 = not yet)
 *
 * @typedef {import('./mission.js').MissionConfig & {pictures: string[]}} FrostConfig
 */

export class FrostMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {FrostConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    this.index = 0;
    /** @type {Bloom | null} */
    this.bloom = null;
    this.cleared = 0;
    this.time = 0;
    /** @type {{x: number, y: number} | null} */
    this.rubbing = null;
    this.particles = new Particles();
  }

  start(hints) {
    super.start(hints);
    this.ctx.hud.setCounter('❄️', 0, this.config.pictures.length);
    this.bloom = this.makeBloom(this.config.pictures[0]);
  }

  /**
   * A new frost flower, with its crystal pattern.
   * @private
   * @param {string} picture
   * @returns {Bloom}
   */
  makeBloom(picture) {
    const ratio = Math.min(2, this.ctx.stage.scale * this.ctx.stage.dpr);
    const { canvas: frost, ctx: fc } = createOffscreen({ x: 0, y: 0, width: R * 2, height: R * 2, ratio });
    const g = fc.createRadialGradient(R, R, R * 0.1, R, R, R);
    g.addColorStop(0, 'rgba(236,244,255,0.97)');
    g.addColorStop(1, 'rgba(205,224,248,0.95)');
    fc.fillStyle = g;
    fc.beginPath();
    fc.arc(R, R, R, 0, TAU);
    fc.fill();
    // ferns of ice growing from the middle
    fc.strokeStyle = 'rgba(255,255,255,0.95)';
    fc.lineCap = 'round';
    for (let i = 0; i < 9; i++) {
      const a = (i * TAU) / 9 + 0.2;
      fc.lineWidth = 3;
      fc.beginPath();
      fc.moveTo(R, R);
      const ex = R + Math.cos(a) * R * 0.92;
      const ey = R + Math.sin(a) * R * 0.92;
      fc.lineTo(ex, ey);
      for (let k = 1; k < 6; k++) {
        const px = R + Math.cos(a) * R * 0.16 * k;
        const py = R + Math.sin(a) * R * 0.16 * k;
        const len = R * (0.18 - k * 0.018);
        for (const side of [-0.6, 0.6]) {
          fc.moveTo(px, py);
          fc.lineTo(px + Math.cos(a + side) * len, py + Math.sin(a + side) * len);
        }
      }
      fc.stroke();
    }
    return { picture, frost, fc, cells: new Array(GRID * GRID).fill(false), grow: 0, melt: -1 };
  }

  /** Where the frost flower is: in the sky above the train, in the middle. */
  get centre() {
    const stage = this.ctx.stage;
    const hud = this.ctx.hud;
    const top = stage.toStage(0, Math.max(hud.hudBottom, hud.cardBottom)).y;
    const bottom = TRACK_Y - 290 - this.ctx.world.cameraY;
    return { x: stage.width / 2, y: clamp((top + bottom) / 2, top + R + 10, Math.max(top + R + 10, bottom - R)) };
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    this.rubbing = { x: p.x, y: p.y };
    this.wipe(p.x, p.y, p.x, p.y);
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerMove(p) {
    if (!this.rubbing) return;
    this.wipe(this.rubbing.x, this.rubbing.y, p.x, p.y);
    this.rubbing = { x: p.x, y: p.y };
  }

  pointerUp() {
    this.rubbing = null;
  }

  /**
   * Wipes the frost along a stroke.
   * @private
   */
  wipe(/** @type {number} */ x0, /** @type {number} */ y0, /** @type {number} */ x1, /** @type {number} */ y1) {
    const b = this.bloom;
    if (!b || b.melt >= 0 || b.grow < 1) return;
    const c0 = this.centre;
    const steps = Math.max(1, Math.ceil(Math.hypot(x1 - x0, y1 - y0) / 10));
    const sx = 1;   // the frost's context is already scaled to stage units
    b.fc.save();
    b.fc.globalCompositeOperation = 'destination-out';
    for (let i = 0; i <= steps; i++) {
      const x = x0 + ((x1 - x0) * i) / steps - c0.x + R;
      const y = y0 + ((y1 - y0) * i) / steps - c0.y + R;
      if (Math.hypot(x - R, y - R) > R + WIPE) continue;
      const g = b.fc.createRadialGradient(x * sx, y * sx, 0, x * sx, y * sx, WIPE * sx);
      g.addColorStop(0, 'rgba(0,0,0,1)');
      g.addColorStop(0.7, 'rgba(0,0,0,0.9)');
      g.addColorStop(1, 'rgba(0,0,0,0)');
      b.fc.fillStyle = g;
      b.fc.beginPath();
      b.fc.arc(x * sx, y * sx, WIPE * sx, 0, TAU);
      b.fc.fill();
      // mark the grid cells under the cloth
      const cell = (R * 2) / GRID;
      for (let gy = Math.floor((y - WIPE * 0.8) / cell); gy <= Math.floor((y + WIPE * 0.8) / cell); gy++) {
        for (let gx = Math.floor((x - WIPE * 0.8) / cell); gx <= Math.floor((x + WIPE * 0.8) / cell); gx++) {
          if (gx >= 0 && gy >= 0 && gx < GRID && gy < GRID) b.cells[gy * GRID + gx] = true;
        }
      }
    }
    b.fc.restore();
    if (Math.random() < 0.3) this.particles.burst(x1, y1, ['#ffffff', '#dbe9ff'], 3, 120);
    if (this.share(b) >= CLEAR) {
      b.melt = 0;
      this.cleared += 1;
      this.particles.burst(c0.x, c0.y, SPARKS, 30, 280);
      this.sound('sparkle');
      this.ctx.hud.setCounter('❄️', this.cleared, this.config.pictures.length);
    }
  }

  /**
   * Share of the frost flower (inside the circle) already wiped.
   * @private
   * @param {Bloom} b
   */
  share(b) {
    let inside = 0;
    let wiped = 0;
    const cell = (R * 2) / GRID;
    for (let gy = 0; gy < GRID; gy++) {
      for (let gx = 0; gx < GRID; gx++) {
        if (Math.hypot((gx + 0.5) * cell - R, (gy + 0.5) * cell - R) > R * 0.92) continue;
        inside += 1;
        if (b.cells[gy * GRID + gx]) wiped += 1;
      }
    }
    return wiped / inside;
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    const b = this.bloom;
    if (b) {
      b.grow = Math.min(1, b.grow + dt * 1.2);
      if (b.melt >= 0) {
        b.melt += dt;
        if (b.melt > 2.4) {
          this.index += 1;
          this.bloom = this.index < this.config.pictures.length ? this.makeBloom(this.config.pictures[this.index]) : null;
        }
      }
    }
    if (!this.bloom || this.phase === 'wrapping') this.finishMission();
  }

  /** @private */
  finishMission() {
    if (this.phase === 'finished') return;
    this.ctx.hud.hideCounter();
    const n = this.cleared;
    const total = this.config.pictures.length;
    this.complete(n >= total ? 3 : n >= 2 ? 2 : 1,
      n >= total ? 'Ai topit toate florile de gheață!' : `Ai topit ${n} flori de gheață din ${total}.`);
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const b = this.bloom;
    if (!b) {
      this.particles.draw(c);
      return;
    }
    const { x, y } = this.centre;
    const r = R * (0.3 + 0.7 * b.grow);
    // the picture, in a round window
    c.save();
    c.beginPath();
    c.arc(x, y, r, 0, TAU);
    c.clip();
    c.translate(x, y);
    c.scale(r, r);
    (PICTURES[b.picture] ?? PICTURES.star)(c, this.time);
    c.restore();
    // the frost on top (fading away when it melts)
    c.save();
    c.globalAlpha = b.melt >= 0 ? clamp(1 - b.melt / 0.6, 0, 1) : 1;
    c.drawImage(b.frost, x - r, y - r, r * 2, r * 2);
    c.restore();
    // a wooden frame around the round window
    c.strokeStyle = '#8d6e63';
    c.lineWidth = 10;
    c.beginPath();
    c.arc(x, y, r + 5, 0, TAU);
    c.stroke();
    c.strokeStyle = '#fff3d6';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(x, y, r + 11, 0, TAU);
    c.stroke();
    this.particles.draw(c);
  }
}
