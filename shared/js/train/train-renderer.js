/**
 * @file Draws a train with Bubu at her window.
 *
 * The static body of the whole train (all cars, windows, emblems,
 * pantograph) is painted once into an offscreen canvas. Every frame only
 * this image is copied, and the parts that move or glow are drawn on top:
 * the turning wheels, Bubu (who sways gently with the train), the lit
 * windows and the headlight.
 *
 * Train coordinates: x = 0 at the front of the train, negative towards the
 * back; y = 0 on the rail top. The renderer is told where the front of the
 * train is on screen.
 */

import { createOffscreen } from '../core/canvas-cache.js';
import { TAU, clamp } from '../core/math.js';
import { fillCircle, glow } from '../gfx/shapes.js';
import { drawBubu } from './bubu.js';
import { CAR_PAINTERS, WHEEL_R } from './cars.js';

/** Vertical extent of the painted train, relative to the rail. */
const TOP = -262;
const BOTTOM = 6;
/** Bubu's size on screen. */
const BUBU_SIZE = 88;

/**
 * @typedef {object} LaidOutCar
 * @property {import('./specs.js').CarSpec} spec
 * @property {number} left   train x of the rear end
 * @property {import('./cars.js').CarGeometry} geo  in car coordinates
 */

/**
 * @typedef {object} TrainFrame
 * @property {number} frontX     screen x of the front of the train
 * @property {number} railY      screen y of the rail
 * @property {number} distance   travelled distance (turns the wheels)
 * @property {number} speed      current speed (Bubu sways more when fast)
 * @property {number} time       seconds
 * @property {number} lights     0..1, how strongly the windows glow
 * @property {number} headlight  0..1
 */

export class TrainRenderer {
  /**
   * @param {import('../core/stage.js').Stage} stage
   * @param {import('./specs.js').TrainSpec} spec
   */
  constructor(stage, spec) {
    this.stage = stage;
    /** @type {HTMLCanvasElement | null} */
    this.body = null;
    this.setSpec(spec);
    stage.on('resize', () => { this.body = null; });
  }

  /**
   * Changes the composition (e.g. after changing trains in Suceava).
   * @param {import('./specs.js').TrainSpec} spec
   */
  setSpec(spec) {
    this.spec = spec;
    /** @type {LaidOutCar[]} */
    this.cars = [];
    let cursor = 0;
    spec.cars.forEach((car, i) => {
      const left = cursor - car.length;
      this.cars.push({ spec: car, left, geo: /** @type {any} */ (null) });
      cursor = left - spec.gap;
    });
    /** Train x of the rear end. */
    this.rearX = cursor + spec.gap;
    this.body = null;
  }

  /** Total length of the train. */
  get length() {
    return -this.rearX;
  }

  /**
   * Train x of the centre of Bubu's window (negative: behind the front).
   * Stations use it to stop with Bubu in front of the station building.
   */
  get bubuOffset() {
    this.ensureBody();
    for (const car of this.cars) {
      const r = car.geo.bubuWindow;
      if (r) return car.left + r[0] + r[2] / 2;
    }
    return 0;
  }

  /** @private Paints the static body (and computes the geometry). */
  ensureBody() {
    if (this.body) return;
    const ratio = this.stage.pixelRatio;
    const { canvas, ctx } = createOffscreen({
      x: this.rearX - 20, y: TOP, width: -this.rearX + 40, height: BOTTOM - TOP, ratio,
    });
    const last = this.cars.length - 1;
    this.cars.forEach((car, i) => {
      ctx.save();
      ctx.translate(car.left, 0);
      car.geo = CAR_PAINTERS[car.spec.kind](ctx, car.spec, { leading: i === 0, trailing: i === last });
      ctx.restore();
    });
    this.body = canvas;
  }

  /**
   * Draws the parts of the train that are tinted by the time of day: body,
   * wheels and Bubu.
   * @param {CanvasRenderingContext2D} c
   * @param {TrainFrame} f
   */
  drawBody(c, f) {
    this.ensureBody();
    const x0 = f.frontX + this.rearX - 20;
    c.drawImage(/** @type {HTMLCanvasElement} */ (this.body), x0, f.railY + TOP, -this.rearX + 40, BOTTOM - TOP);
    this.drawWheels(c, f);
    this.drawBubu(c, f);
  }

  /**
   * Draws the glowing parts, on top of the tint: windows, Bubu's lamp-lit
   * face, the headlight beam and the tail light.
   * @param {CanvasRenderingContext2D} c
   * @param {TrainFrame} f
   */
  drawLights(c, f) {
    this.ensureBody();
    if (f.lights > 0.02) {
      c.globalAlpha = f.lights;
      for (const car of this.cars) {
        const ox = f.frontX + car.left;
        for (const [x, y, w, h] of car.geo.windows) {
          glow(c, ox + x + w / 2, f.railY + y + h / 2, w * 1.1, 'rgba(255,214,120,0.35)', 'rgba(255,214,120,0)');
          c.fillStyle = '#ffe39a';
          c.fillRect(ox + x, f.railY + y, w, h);
        }
        const b = car.geo.bubuWindow;
        if (b) {
          // the warm lamp inside, then Bubu again, lit by it
          c.fillStyle = '#ffd98a';
          c.fillRect(ox + b[0], f.railY + b[1], b[2], b[3]);
          c.globalAlpha = f.lights * 0.75;
          this.drawBubu(c, f);
          c.globalAlpha = f.lights;
        }
      }
      c.globalAlpha = 1;
    }
    for (const car of this.cars) {
      const ox = f.frontX + car.left;
      const t = car.geo.taillight;
      if (t && f.lights > 0.05) {
        glow(c, ox + t.x, f.railY + t.y, 26, `rgba(255,60,60,${0.6 * f.lights})`, 'rgba(255,60,60,0)');
      }
      const h = car.geo.headlight;
      if (h && f.headlight > 0.02) {
        const hx = ox + h.x;
        const hy = f.railY + h.y;
        // beam along the track
        const g = c.createLinearGradient(hx, 0, hx + 520, 0);
        g.addColorStop(0, `rgba(255,244,200,${0.45 * f.headlight})`);
        g.addColorStop(1, 'rgba(255,244,200,0)');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(hx, hy - 6);
        c.lineTo(hx + 520, hy - 70);
        c.lineTo(hx + 520, hy + 60);
        c.lineTo(hx, hy + 6);
        c.closePath();
        c.fill();
        glow(c, hx, hy, 34, `rgba(255,250,220,${0.9 * f.headlight})`, 'rgba(255,250,220,0)');
      }
    }
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {TrainFrame} f
   */
  drawWheels(c, f) {
    const angle = f.distance / WHEEL_R;
    const y = f.railY - WHEEL_R;
    for (const car of this.cars) {
      const ox = f.frontX + car.left;
      for (const wx of car.geo.wheels) {
        const x = ox + wx;
        c.fillStyle = '#2b2f38';
        fillCircle(c, x, y, WHEEL_R);
        c.fillStyle = '#8b95a5';
        fillCircle(c, x, y, WHEEL_R - 4);
        // spokes turn with the distance travelled
        c.strokeStyle = '#4a5160';
        c.lineWidth = 3;
        c.beginPath();
        for (let k = 0; k < 3; k++) {
          const a = angle + (k * TAU) / 3;
          c.moveTo(x, y);
          c.lineTo(x + Math.cos(a) * (WHEEL_R - 4), y + Math.sin(a) * (WHEEL_R - 4));
        }
        c.stroke();
        c.fillStyle = '#2b2f38';
        fillCircle(c, x, y, 3.5);
      }
    }
  }

  /**
   * Bubu at her open window, leaning out a little: her lower part is hidden
   * behind the wall under the window sill.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {TrainFrame} f
   */
  drawBubu(c, f) {
    for (const car of this.cars) {
      const r = car.geo.bubuWindow;
      if (!r) continue;
      const cx = f.frontX + car.left + r[0] + r[2] / 2;
      const sill = f.railY + r[1] + r[3];
      const sway = clamp(f.speed / 500, 0, 1);
      const bob = Math.sin(f.time * 7) * 1.5 * sway + Math.sin(f.time * 1.3) * 1.2;
      const tilt = Math.sin(f.time * 2.1) * 0.05 * (0.3 + sway);
      c.save();
      c.beginPath();
      c.rect(cx - BUBU_SIZE, sill - BUBU_SIZE * 1.5, BUBU_SIZE * 2, BUBU_SIZE * 1.5);
      c.clip();
      drawBubu(c, cx, sill - BUBU_SIZE * 0.4 + bob, BUBU_SIZE, tilt);
      c.restore();
    }
  }
}
