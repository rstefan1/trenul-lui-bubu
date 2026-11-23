/**
 * @file The sky: gradient, sun, moon and stars.
 *
 * The sky does not move with the camera (it is infinitely far away). The
 * gradient is a single fill per frame; the static stars are painted once
 * into an offscreen canvas and faded in with the night, and only a handful
 * of twinkling stars are drawn individually.
 */

import { TAU } from '../core/math.js';
import { rngFor } from '../core/random.js';
import { createOffscreen, releaseCanvas } from '../core/canvas-cache.js';
import { css } from '../gfx/color.js';
import { fillCircle, fillStar, glow } from '../gfx/shapes.js';

/** Lowest point of the sky that can ever be visible, in stage units. */
const SKY_BOTTOM = 900;

export class Sky {
  /** @param {import('../core/stage.js').Stage} stage */
  constructor(stage) {
    this.stage = stage;
    /** @type {HTMLCanvasElement | null} */
    this.starCanvas = null;
    this.starKey = '';
    const rng = rngFor('sky|twinkles');
    this.twinkles = Array.from({ length: 14 }, () => ({
      x: rng(), y: 40 + rng() * 380, size: 5 + rng() * 6, phase: rng() * TAU,
    }));
  }

  /**
   * @param {CanvasRenderingContext2D} c
   * @param {import('./lighting.js').Light} light
   * @param {number} time  seconds, for twinkling
   */
  draw(c, light, time) {
    const { width, viewTop } = this.stage;
    const top = Math.min(0, viewTop) - 2;
    const g = c.createLinearGradient(0, top, 0, 700);
    g.addColorStop(0, css(light.top));
    g.addColorStop(0.55, css(light.mid));
    g.addColorStop(1, css(light.bottom));
    c.fillStyle = g;
    c.fillRect(0, top, width, SKY_BOTTOM - top);

    if (light.night > 0.05) this.drawStars(c, light.night, time);
    if (light.sun.alpha > 0) this.drawSun(c, light);
    if (light.moon.alpha > 0) this.drawMoon(c, light);
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {number} night
   * @param {number} time
   */
  drawStars(c, night, time) {
    const { width, viewTop, pixelRatio } = this.stage;
    const top = Math.min(0, viewTop);
    const key = `${width}|${top.toFixed(0)}|${pixelRatio.toFixed(3)}`;
    if (key !== this.starKey) {
      this.starKey = key;
      const h = 620 - top;
      const { canvas, ctx } = createOffscreen({ x: 0, y: top, width, height: h, ratio: pixelRatio });
      const rng = rngFor('sky|stars');
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      const count = Math.round((140 * width * h) / (1600 * 620));
      ctx.beginPath();
      for (let i = 0; i < count; i++) {
        const x = rng() * width;
        const y = top + rng() * h * (0.35 + 0.65 * rng());   // denser near the zenith
        const r = 0.5 + rng() * 1.6;
        ctx.moveTo(x + r, y);
        ctx.arc(x, y, r, 0, TAU);
      }
      ctx.fill();
      releaseCanvas(this.starCanvas);
      this.starCanvas = canvas;
      this.starTop = top;
      this.starHeight = h;
    }
    c.globalAlpha = night;
    c.drawImage(/** @type {HTMLCanvasElement} */ (this.starCanvas), 0, this.starTop, width, this.starHeight);
    c.fillStyle = '#fffbe6';
    for (const s of this.twinkles) {
      const a = 0.35 + 0.65 * Math.abs(Math.sin(time * 1.6 + s.phase));
      c.globalAlpha = night * a;
      fillStar(c, s.x * width, s.y, s.size * (0.7 + 0.4 * a), s.size * 0.22, 4);
    }
    c.globalAlpha = 1;
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {import('./lighting.js').Light} light
   */
  drawSun(c, light) {
    const x = light.sun.x * this.stage.width;
    const y = light.sun.y;
    // the sun turns orange and bigger near the horizon
    const low = Math.max(0, Math.min(1, (y - 380) / 260));
    const r = 46 + low * 18;
    glow(c, x, y, r * 4, `rgba(255,${Math.round(230 - low * 70)},150,0.45)`, 'rgba(255,200,120,0)');
    c.fillStyle = low > 0.5 ? '#ffb356' : '#fff1b8';
    fillCircle(c, x, y, r);
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {import('./lighting.js').Light} light
   */
  drawMoon(c, light) {
    const x = light.moon.x * this.stage.width;
    const y = light.moon.y;
    c.globalAlpha = light.moon.alpha;
    glow(c, x, y, 200, 'rgba(255,248,225,0.28)', 'rgba(255,248,225,0)');
    c.fillStyle = '#fff6d8';
    fillCircle(c, x, y, 54);
    // a few soft craters
    c.fillStyle = 'rgba(214,200,160,0.45)';
    fillCircle(c, x - 16, y - 10, 11);
    fillCircle(c, x + 14, y + 14, 8);
    fillCircle(c, x + 18, y - 18, 5);
    c.globalAlpha = 1;
  }
}
