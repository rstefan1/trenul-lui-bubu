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

import { between, createRng } from '../core/random.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { drawFir, fillCircle, glow } from '../gfx/shapes.js';
import { zoomed } from '../gfx/ui-style.js';
import { SceneMission } from './scene-mission.js';

/**
 * Where the animals hide, as fractions of the free area (spread out, each
 * next to a fir).
 * @type {ReadonlyArray<[number, number]>}
 */
/**
 * The forest, back to front: each row of firs stands on its own snowy hill.
 * line = where the hill's top is (fraction of the free area), size = fir
 * height (stage units), and the colours of the snow and of the firs.
 */
const ROWS = [
  { line: 0.36, size: 110, snow: '#5a6c9c', fir: '#1c3a3f', shade: '#16302f', count: 16 },
  { line: 0.6, size: 150, snow: '#8193bf', fir: '#22504a', shade: '#1b423d', count: 12 },
  { line: 0.86, size: 200, snow: '#c3cfe6', fir: '#2c6a4d', shade: '#22573f', count: 9 },
];

const SPOTS = [[0.12, 0.52], [0.33, 0.29], [0.52, 0.78], [0.71, 0.31], [0.88, 0.53], [0.24, 0.77], [0.6, 0.5]];

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
    this.ctx.hud.instruct(this.config.title, this.config.text);
    this.ctx.hud.setCounter('👀', 0, this.hidden.length);
  }

  /** The free part of the screen. */
  get area() {
    const stage = this.ctx.stage;
    const hud = this.ctx.hud;
    const cardBottom = hud.cardBottom;
    const top = Math.max(stage.viewTop + 140, stage.toStage(0, hud.controlsBottom + 30).y,
      cardBottom ? stage.toStage(0, cardBottom + 20).y : -Infinity);
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
        this.sound('collect', q.x);
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
    const left = stage.viewLeft;
    const width = stage.viewRight - stage.viewLeft;
    c.save();
    c.globalAlpha = this.fade;
    const g = c.createLinearGradient(0, stage.viewTop, 0, stage.viewBottom);
    g.addColorStop(0, '#050b24');
    g.addColorStop(1, '#1c2c5c');
    c.fillStyle = g;
    c.fillRect(left, stage.viewTop, width, stage.viewBottom - stage.viewTop);
    c.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 60; i++) fillCircle(c, left + ((i * 977) % 1000) / 1000 * width, stage.viewTop + ((i * 613) % 1000) / 1000 * (a.top - stage.viewTop + a.h * 0.25), (i % 3) * 0.5 + 0.7);
    // the moon and the mountains far away
    const moonX = left + width * 0.82;
    const moonY = a.top + a.h * 0.08;
    glow(c, moonX, moonY, 120, 'rgba(255,248,225,0.3)', 'rgba(255,248,225,0)');
    c.fillStyle = '#fff6d8';
    fillCircle(c, moonX, moonY, 36);
    c.fillStyle = '#26345f';
    c.beginPath();
    c.moveTo(left, a.top + a.h * 0.42);
    for (let i = 0; i <= 8; i++) {
      c.lineTo(left + (i / 8) * width, a.top + a.h * (i % 2 ? 0.12 : 0.3));
    }
    c.lineTo(stage.viewRight, stage.viewBottom);
    c.lineTo(left, stage.viewBottom);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(235,242,255,0.55)';
    for (let i = 1; i <= 7; i += 2) {
      const x = left + (i / 8) * width;
      const y = a.top + a.h * 0.12;
      c.beginPath();
      c.moveTo(x, y);
      c.lineTo(x + width / 40, y + a.h * 0.05);
      c.lineTo(x - width / 40, y + a.h * 0.05);
      c.closePath();
      c.fill();
    }
    // the rows of firs, each on its rolling snowy hill
    ROWS.forEach((row, r) => {
      const hill = (/** @type {number} */ x) => a.top + a.h * row.line - Math.sin((x - left) / width * Math.PI * 2 + r * 1.7) * a.h * 0.04;
      c.fillStyle = row.snow;
      c.beginPath();
      c.moveTo(left, stage.viewBottom);
      for (let x = left; x <= stage.viewRight + 20; x += 20) c.lineTo(x, hill(x));
      c.lineTo(stage.viewRight + 20, stage.viewBottom);
      c.closePath();
      c.fill();
      const rng = createRng(31 + r * 17);
      const count = Math.max(4, Math.round(row.count * width / 1600));
      for (let i = 0; i < count; i++) {
        const x = left + ((i + between(rng, 0.1, 0.9)) / count) * width;
        const size = row.size * between(rng, 0.8, 1.2) * Math.min(1, a.h / 600 + 0.3);
        drawFir(c, x, hill(x) + 6, size, { color: row.fir, shade: row.shade, snowy: true });
      }
    });
    // the animals: eyes while hidden, the animal once found
    // bigger eyes and animals on phones (the eyes even more: they are small)
    const ui = stage.ui;
    for (const h of this.hidden) {
      const q = this.at(h);
      const k = h.found ? ui : ui > 1 ? ui * 1.4 : 1;
      zoomed(c, k, q.x, q.y, () => this.drawAnimal(c, h, q));
    }
    this.particles.draw(c);
    c.restore();
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {Hidden} h
   * @param {{x: number, y: number}} q
   */
  drawAnimal(c, h, q) {
    if (h.found) {
      const k = Math.min(1, h.t / 0.3);
      glow(c, q.x, q.y, 70, 'rgba(255,240,180,0.45)', 'rgba(255,240,180,0)');
      c.font = `${Math.round(64 * k)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(h.emoji, q.x, q.y);
      return;
    }
    const blink = Math.sin(this.time * 1.3 + h.phase) > 0.93;
    if (blink) return;
    glow(c, q.x, q.y, 34, 'rgba(255,240,120,0.35)', 'rgba(255,240,120,0)');
    c.fillStyle = '#fff59d';
    fillCircle(c, q.x - 9, q.y, 5);
    fillCircle(c, q.x + 9, q.y, 5);
    c.fillStyle = '#1b1b1b';
    fillCircle(c, q.x - 9, q.y, 2);
    fillCircle(c, q.x + 9, q.y, 2);
  }
}
