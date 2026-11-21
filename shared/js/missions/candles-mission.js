/**
 * @file Travel mission "candles in the windows" (a night in the villages).
 *
 * Village houses pass slowly in front of the train. In some of them a child
 * waits at the window — a small face behind the glass, waving. The child
 * playing simply touches those houses, and Bubu lights a Christmas candle
 * in their window: the window glows, the little one waves happily. Houses
 * with dark, empty windows have nobody home. No timing, nothing blinks: a
 * calm, clear mission for the night.
 *
 * Configuration (besides id/title/text):
 *   houses   how many houses pass by
 *   empty    how many of them have nobody at the window
 */

import { TAU } from '../core/math.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { drawHouse, fillCircle, glow, lightWindows } from '../gfx/shapes.js';
import { ROOFS, WALLS } from '../world/biomes/terrain.js';
import { drawCandle } from './delivery-mission.js';
import { Mission } from './mission.js';

/** Ground line of the houses in front of the track (stage units). */
const GROUND = 895;
/** Size of a house. */
const HOUSE_W = 170;
const HOUSE_H = 92;
/** Top of the band in which the houses are drawn (for the tint). */
const BAND_TOP = 680;

/**
 * @typedef {object} House
 * @property {number} worldX   left wall, in world units
 * @property {boolean} child   a child waits at the window
 * @property {boolean} lit     the candle was lit
 * @property {number} litAt    time when it was lit
 * @property {string} wall
 * @property {string} roof
 * @property {number} phase
 * @property {Array<[number, number, number, number]>} windows   (relative to the left wall)
 *
 * @typedef {import('./mission.js').MissionConfig & {houses: number, empty: number}} CandlesConfig
 */

export class CandlesMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {CandlesConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {House[]} */
    this.houses = [];
    /** @type {boolean[]} which houses have a child (decided at the start) */
    this.plan = [];
    this.spawned = 0;
    this.nextWorldX = 0;
    this.spacing = 1000;
    this.children = 0;
    this.lit = 0;
    this.time = 0;
    this.particles = new Particles();
    /** @type {Array<{x: number, y: number, t: number}>} touches on empty houses */
    this.misses = [];
  }

  /** @param {{duration?: number, window?: {from: number, to: number}}} hints */
  start(hints) {
    super.start(hints);
    const { houses, empty } = this.config;
    const plan = Array(houses).fill(true);
    let placed = 0;
    while (placed < empty) {
      const i = 1 + Math.floor(Math.random() * (houses - 1));
      if (!plan[i] || !plan[i - 1] || plan[i + 1] === false) continue;
      plan[i] = false;
      placed += 1;
    }
    this.plan = plan;
    this.children = plan.filter(Boolean).length;
    const j = this.ctx.journey;
    const length = hints.window ? (hints.window.to - hints.window.from) * j.segment.length : 15000;
    this.spacing = Math.max(800, (length - this.ctx.stage.width) / houses);
    this.nextWorldX = j.distance - this.ctx.world.anchorX + this.ctx.stage.viewRight + 150;
    this.ctx.hud.setCounter('🕯️', 0, this.children);
  }

  /** Screen x of a world position. */
  toScreen(/** @type {number} */ worldX) {
    return worldX - this.ctx.journey.distance + this.ctx.world.anchorX;
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    for (let i = this.misses.length - 1; i >= 0; i--) if ((this.misses[i].t += dt) > 0.6) this.misses.splice(i, 1);

    while (this.phase === 'running' && this.spawned < this.config.houses
      && this.toScreen(this.nextWorldX) < this.ctx.stage.viewRight + 200) {
      this.houses.push({
        worldX: this.nextWorldX,
        child: this.plan[this.spawned],
        lit: false,
        litAt: 0,
        wall: WALLS[(this.spawned * 2) % WALLS.length],
        roof: ROOFS[(this.spawned * 3) % ROOFS.length],
        phase: Math.random() * TAU,
        windows: [],
      });
      this.spawned += 1;
      this.nextWorldX += this.spacing * (0.85 + Math.random() * 0.3);
    }
    const left = this.ctx.stage.viewLeft - 300;
    this.houses = this.houses.filter(h => this.toScreen(h.worldX) > left);

    const out = this.spawned >= this.config.houses && this.houses.length === 0;
    if (this.phase === 'wrapping' || out) {
      this.ctx.hud.hideCounter();
      const n = this.lit;
      const k = n / Math.max(1, this.children);
      this.complete(k >= 0.9 ? 3 : k >= 0.6 ? 2 : 1,
        n === this.children ? `Ai aprins lumânări la toți cei ${n} copii!`
          : `Ai aprins ${n} lumânări din ${this.children}. Satele strălucesc în noaptea de Ajun!`);
    }
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    const y = p.y + this.ctx.world.cameraY;
    if (y < GROUND - HOUSE_H - 80 || y > GROUND + 20) return;
    for (const h of this.houses) {
      const x = this.toScreen(h.worldX);
      if (p.x < x - 20 || p.x > x + HOUSE_W + 20) continue;
      if (h.child && !h.lit) {
        h.lit = true;
        h.litAt = this.time;
        this.lit += 1;
        this.ctx.hud.setCounter('🕯️', this.lit, this.children);
        const [wx, wy, ww, wh] = h.windows[0] ?? [HOUSE_W * 0.3, -HOUSE_H * 0.6, 30, 30];
        this.particles.burst(x + wx + ww / 2, GROUND + wy + wh / 2 - this.ctx.world.cameraY, SPARKS, 22, 240);
      } else if (!h.child) {
        this.misses.push({ x: p.x, y: p.y, t: 0 });
      }
      return;
    }
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const w = this.ctx.world;
    w.drawTinted(c, BAND_TOP, this.ctx.stage.viewBottom + w.cameraY + 10, b => {
      for (const h of this.houses) this.drawHouse(b, h);
    });
    c.save();
    c.translate(0, -w.cameraY);
    for (const h of this.houses) {
      const x = this.toScreen(h.worldX);
      if (!h.child) continue;
      const [wx, wy, ww, wh] = h.windows[0] ?? [0, 0, 0, 0];
      const wxs = x + wx;
      const wys = GROUND + wy;
      if (h.lit) {
        lightWindows(c, [[wxs, wys, ww, wh]], 1.3);
        drawCandle(c, wxs + ww * 0.8, wys + wh - 2, this.time + h.phase);
      } else {
        // a soft glow invites the touch
        const a = 0.25 + 0.15 * Math.sin(this.time * 3 + h.phase);
        glow(c, wxs + ww / 2, wys + wh / 2, ww * 1.6, `rgba(255,230,160,${a})`, 'rgba(255,230,160,0)');
      }
      this.drawChildAtWindow(c, wxs, wys, ww, wh, h);
    }
    for (const m of this.misses) {
      c.globalAlpha = 1 - m.t / 0.6;
      c.fillStyle = '#ffffff';
      c.font = '700 20px "Baloo 2", system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillText('Nu e nimeni acasă', m.x, m.y + w.cameraY - 20 - m.t * 30);
      c.globalAlpha = 1;
    }
    c.restore();
    this.particles.draw(c);
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {House} h
   */
  drawHouse(c, h) {
    const x = this.toScreen(h.worldX);
    const snowy = this.ctx.world.cover > 0.5;
    drawHouse(c, x, GROUND, HOUSE_W, HOUSE_H, { wall: h.wall, roof: h.roof, snowy, chimney: true, windows: 0 });
    // one big window (where the child waits) and a small one, both with a frame
    /** @type {Array<[number, number, number, number]>} */
    const windows = [
      [HOUSE_W * 0.14, -HOUSE_H * 0.8, HOUSE_W * 0.38, HOUSE_H * 0.54],
      [HOUSE_W * 0.66, -HOUSE_H * 0.7, HOUSE_W * 0.18, HOUSE_H * 0.32],
    ];
    h.windows = windows;
    for (const [wx, wy, ww, wh] of windows) {
      c.fillStyle = '#6d4a32';
      c.fillRect(x + wx - 4, GROUND + wy - 4, ww + 8, wh + 8);
      c.fillStyle = '#28324f';   // dark glass: nobody lit a candle yet
      c.fillRect(x + wx, GROUND + wy, ww, wh);
    }
    // a fence
    c.fillStyle = '#8a6a50';
    // a low fence, so it does not hide the windows
    c.fillRect(x - 20, GROUND - 12, HOUSE_W + 40, 3);
    for (let fx = x - 18; fx < x + HOUSE_W + 20; fx += 18) c.fillRect(fx, GROUND - 18, 4, 18);
  }

  /**
   * A child's face behind the glass; it waves once the candle is lit.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {number} x
   * @param {number} y
   * @param {number} w
   * @param {number} h
   * @param {House} house
   */
  drawChildAtWindow(c, x, y, w, h, house) {
    const cx = x + w * 0.38;
    const cy = y + h * 0.6;
    const r = Math.min(w, h) * 0.24;
    c.save();
    c.beginPath();
    c.rect(x, y, w, h);
    c.clip();
    c.fillStyle = '#f6d1b3';
    fillCircle(c, cx, cy, r);
    c.fillStyle = '#d32f2f';
    c.beginPath();
    c.moveTo(cx - r * 1.1, cy - r * 0.2);
    c.quadraticCurveTo(cx, cy - r * 2.6, cx + r * 1.1, cy - r * 0.2);
    c.closePath();
    c.fill();
    c.fillStyle = '#3b4250';
    fillCircle(c, cx - r * 0.35, cy, r * 0.13);
    fillCircle(c, cx + r * 0.35, cy, r * 0.13);
    // a waving hand
    const wave = house.lit ? Math.sin(this.time * 9 + house.phase) * 0.6 : Math.sin(this.time * 3 + house.phase) * 0.25;
    c.strokeStyle = '#f6d1b3';
    c.lineWidth = r * 0.45;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(cx + r * 0.9, cy + r * 1.4);
    c.lineTo(cx + r * 0.9 + Math.sin(wave) * r * 1.2, cy + r * 1.4 - Math.cos(wave) * r * 1.6);
    c.stroke();
    c.restore();
  }
}
