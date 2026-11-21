/**
 * @file Station mission "eyes in the forest" (Mestecăniș, a short stop).
 *
 * The night forest by the pass is dark; here and there a pair of eyes
 * blinks between the firs. Touching a pair reveals the animal it belongs
 * to. A short, calm search: find them all.
 *
 * Configuration (besides id/title/text):
 *   animals   emoji of the hidden animals
 *   doneText, fact
 */

import { Particles, SPARKS } from '../gfx/particles.js';
import { drawFir, fillCircle, glow } from '../gfx/shapes.js';
import { SceneMission } from './scene-mission.js';

/**
 * Where the animals hide, as fractions of the free area (spread out, each
 * next to a fir).
 * @type {ReadonlyArray<[number, number]>}
 */
const SPOTS = [[0.12, 0.62], [0.33, 0.38], [0.52, 0.7], [0.71, 0.44], [0.88, 0.66], [0.24, 0.82], [0.63, 0.2]];

/**
 * @typedef {{u: number, v: number, emoji: string, found: boolean, t: number, phase: number}} Hidden
 * @typedef {import('./mission.js').MissionConfig & {animals: string[], doneText: string, fact: string}} EyesConfig
 */

export class EyesMission extends SceneMission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {EyesConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    const spots = [...SPOTS].sort(() => Math.random() - 0.5);
    /** @type {Hidden[]} */
    this.hidden = config.animals.map((emoji, i) => ({ u: spots[i][0], v: spots[i][1], emoji, found: false, t: 0, phase: Math.random() * 6 }));
    this.time = 0;
    this.taps = 0;
    this.done = false;
    this.particles = new Particles();
  }

  start() {
    this.phase = 'running';
    this.ctx.hud.announce(this.config.title, this.config.text, 'Misiune', 7);
    this.ctx.hud.setCounter('👀', 0, this.hidden.length);
  }

  /** The free part of the screen. */
  get area() {
    const stage = this.ctx.stage;
    const cardBottom = this.ctx.hud.cardBottom;
    const top = Math.max(stage.viewTop + 140, cardBottom ? stage.toStage(0, cardBottom + 20).y : 0);
    return { left: stage.viewLeft + 40, top, w: stage.viewRight - stage.viewLeft - 80, h: stage.viewBottom - 40 - top };
  }

  /**
   * Screen position of a hiding place.
   * @param {Hidden} h
   */
  at(h) {
    const a = this.area;
    return { x: a.left + h.u * a.w, y: a.top + h.v * a.h };
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    if (this.done) return;
    this.taps += 1;
    const reach = Math.max(60, 40 / this.ctx.stage.scale);
    for (const h of this.hidden) {
      if (h.found) continue;
      const q = this.at(h);
      if (Math.hypot(q.x - p.x, q.y - p.y) < reach) {
        h.found = true;
        h.t = 0;
        this.particles.burst(q.x, q.y, SPARKS, 18, 220);
        const n = this.hidden.filter(x => x.found).length;
        this.ctx.hud.setCounter('👀', n, this.hidden.length);
        if (n === this.hidden.length) this.finish();
        return;
      }
    }
  }

  /** @private */
  finish() {
    this.done = true;
    const extra = this.taps - this.hidden.length;
    this.showEnding({
      doneText: this.config.doneText,
      fact: this.config.fact,
      stars: extra <= 3 ? 3 : extra <= 8 ? 2 : 1,
      result: 'Ai găsit toate animalele din pădure!',
      delay: 1,
    });
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    for (const h of this.hidden) h.t += dt;
    this.particles.update(dt);
    this.updateFade(dt);
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const stage = this.ctx.stage;
    const a = this.area;
    c.save();
    c.globalAlpha = this.fade;
    const g = c.createLinearGradient(0, stage.viewTop, 0, stage.viewBottom);
    g.addColorStop(0, '#050b24');
    g.addColorStop(1, '#16244d');
    c.fillStyle = g;
    c.fillRect(stage.viewLeft, stage.viewTop, stage.viewRight - stage.viewLeft, stage.viewBottom - stage.viewTop);
    c.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 50; i++) fillCircle(c, stage.viewLeft + ((i * 977) % 1000) / 1000 * (stage.viewRight - stage.viewLeft), stage.viewTop + ((i * 613) % 1000) / 1000 * (a.top - stage.viewTop + 120), (i % 3) * 0.5 + 0.7);
    c.fillStyle = '#c9d5ea';
    c.fillRect(stage.viewLeft, a.top + a.h * 0.92, stage.viewRight - stage.viewLeft, stage.viewBottom);
    // three rows of firs, darker in the back
    for (const [row, color, shade, scale] of [[0.45, '#1d3d3a', '#173230', 0.8], [0.7, '#24504a', '#1d433e', 1], [0.95, '#2f6e4f', '#245a41', 1.25]]) {
      for (let i = 0; i < 12; i++) {
        const x = a.left + ((i + (row * 7) % 1) / 11.5) * a.w;
        drawFir(c, x, a.top + /** @type {number} */ (row) * a.h, 170 * /** @type {number} */ (scale), { color: /** @type {string} */ (color), shade: /** @type {string} */ (shade), snowy: true });
      }
    }
    // the animals: eyes while hidden, the animal once found
    for (const h of this.hidden) {
      const q = this.at(h);
      if (h.found) {
        const k = Math.min(1, h.t / 0.3);
        glow(c, q.x, q.y, 70, 'rgba(255,240,180,0.45)', 'rgba(255,240,180,0)');
        c.font = `${Math.round(64 * k)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText(h.emoji, q.x, q.y);
        continue;
      }
      const blink = Math.sin(this.time * 1.3 + h.phase) > 0.93;
      if (blink) continue;
      glow(c, q.x, q.y, 34, 'rgba(255,240,120,0.35)', 'rgba(255,240,120,0)');
      c.fillStyle = '#fff59d';
      fillCircle(c, q.x - 9, q.y, 5);
      fillCircle(c, q.x + 9, q.y, 5);
      c.fillStyle = '#1b1b1b';
      fillCircle(c, q.x - 9, q.y, 2);
      fillCircle(c, q.x + 9, q.y, 2);
    }
    this.particles.draw(c);
    c.restore();
  }
}
