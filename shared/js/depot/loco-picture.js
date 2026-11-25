/**
 * @file A locomotive standing still, drawn on a canvas of its own (the depot
 * shows the locomotives this way). It is painted by the same painters as
 * the train of the journeys, with the decorations the child chose, so it
 * looks exactly like the one the child travels with; it is fitted to the
 * canvas, standing on its rail.
 */

import { TAU } from '../core/math.js';
import { fillCircle } from '../gfx/shapes.js';
import { CAR_PAINTERS, WHEEL_R } from '../train/cars.js';
import { paintDecor } from '../train/loco-decor.js';
import { TRACK_Y, WIRE_Y } from '../world/track.js';
import { paintedCar } from './style.js';

/** Height of the contact wire above the rail (the pantograph touches it). */
const WIRE_H = TRACK_Y - WIRE_Y;
/** Room around the locomotive on the work canvas (buffers, lamps, a bow, a flag). */
const MARGIN = 40;
/** Height of the work canvas above the rail (the pantograph reaches the wire). */
const ABOVE = WIRE_H + 30;
/** Below the rail: the bottom of the wheels and the rail itself. */
const BELOW = 12;
/** Room kept above the locomotive for its decorations (so adding a flag does not shrink it). */
const DECOR_ROOM = 50;

/** @type {Map<string, {x: number, w: number, h: number}>} the box around every kind of locomotive, undecorated */
const BOXES = new Map();

/**
 * Paints the locomotive at size 1, with its wheels and decorations, on a
 * canvas of its own (car x = 0 at MARGIN, the rail at ABOVE).
 * @param {import('../train/specs.js').CarSpec} car
 * @param {import('./style.js').LocoStyle | null} style
 */
function paintAlone(car, style) {
  const work = document.createElement('canvas');
  work.width = car.length + MARGIN * 2;
  work.height = ABOVE + BELOW;
  const c = /** @type {CanvasRenderingContext2D} */ (work.getContext('2d', { willReadFrequently: !BOXES.has(car.kind) }));
  c.translate(MARGIN, ABOVE);
  const painted = paintedCar(car, style);
  const geo = CAR_PAINTERS[car.kind](c, painted, { leading: true, trailing: true });
  // the wheels (on the journeys they are drawn every frame, turning)
  for (const x of geo.wheels) {
    const y = -WHEEL_R;
    c.fillStyle = '#2b2f38';
    fillCircle(c, x, y, WHEEL_R);
    c.fillStyle = '#8b95a5';
    fillCircle(c, x, y, WHEEL_R - 4);
    c.strokeStyle = '#4a5160';
    c.lineWidth = 3;
    c.beginPath();
    for (let k = 0; k < 3; k++) {
      const a = 0.4 + (k * TAU) / 3;
      c.moveTo(x, y);
      c.lineTo(x + Math.cos(a) * (WHEEL_R - 4), y + Math.sin(a) * (WHEEL_R - 4));
    }
    c.stroke();
    c.fillStyle = '#2b2f38';
    fillCircle(c, x, y, 3.5);
  }
  // the size of the locomotive, measured once, before any decoration
  if (!BOXES.has(car.kind)) BOXES.set(car.kind, measure(c, work.width, work.height));
  paintDecor(c, painted, style);
  return work;
}

/**
 * The box around the painted pixels: from x, width, and height above the rail.
 * @param {CanvasRenderingContext2D} c
 * @param {number} width
 * @param {number} height
 */
function measure(c, width, height) {
  const { data } = c.getImageData(0, 0, width, height);
  let [x0, y0, x1] = [width, height, 0];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] < 8) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
    }
  }
  return { x: x0, w: x1 - x0 + 1, h: Math.max(ABOVE - y0, 1) };
}

export class LocoPicture {
  /** @param {HTMLCanvasElement} canvas  its size on the page is set by CSS */
  constructor(canvas) {
    this.canvas = canvas;
    /** @type {import('../train/specs.js').CarSpec | null} */
    this.car = null;
    /** @type {import('./style.js').LocoStyle | null} */
    this.style = null;
    /** @type {HTMLCanvasElement | null} the locomotive, painted at size 1 */
    this.work = null;
  }

  /**
   * Paints the locomotive (again) with these decorations, and draws it.
   * @param {import('../train/specs.js').CarSpec} car
   * @param {import('./style.js').LocoStyle | null} style
   */
  show(car, style) {
    this.car = car;
    this.style = style;
    this.work = paintAlone(car, style);
    this.fit();
    this.draw();
  }

  /** Measures the canvas on the page and makes it sharp for the screen. */
  fit() {
    const ratio = Math.min(window.devicePixelRatio || 1, 3);
    this.cssW = this.canvas.clientWidth || 300;
    this.cssH = this.canvas.clientHeight || 160;
    this.canvas.width = Math.round(this.cssW * ratio);
    this.canvas.height = Math.round(this.cssH * ratio);
    this.ratio = ratio;
  }

  /** Draws the locomotive on its rail (an electric one under its wire). */
  draw() {
    const { car, work } = this;
    if (!car || !work) return;
    const box = /** @type {{x: number, w: number, h: number}} */ (BOXES.get(car.kind));
    const [cssW, cssH] = [/** @type {number} */ (this.cssW), /** @type {number} */ (this.cssH)];
    const c = /** @type {CanvasRenderingContext2D} */ (this.canvas.getContext('2d'));
    c.setTransform(this.ratio ?? 1, 0, 0, this.ratio ?? 1, 0, 0);
    c.clearRect(0, 0, cssW, cssH);

    const rail = cssH - 14;              // where the rail is on the canvas
    const electric = car.kind === 'electricLoco';
    const high = electric ? box.h : box.h + DECOR_ROOM;
    const scale = Math.min((cssW - 24) / box.w, (rail - 8) / high);
    const left = (cssW - box.w * scale) / 2;

    // the rail across the whole canvas, with sleepers
    c.fillStyle = '#6d5a48';
    for (let x = 6; x < cssW; x += 22) c.fillRect(x, rail + 3, 12, 6);
    c.fillStyle = '#8b95a5';
    c.fillRect(0, rail, cssW, 4);
    c.fillStyle = '#5b6472';
    c.fillRect(0, rail + 3, cssW, 1.5);
    // the contact wire of an electric locomotive, where its pantograph touches it
    if (electric) {
      c.fillStyle = '#2b2f38';
      c.fillRect(0, rail - (WIRE_H - 2) * scale - 1, cssW, 2);
    }
    // the locomotive: work canvas x → screen, the rail of the work canvas on the rail
    c.imageSmoothingQuality = 'high';
    const top = ABOVE - high - 2;
    c.drawImage(work, box.x, top, box.w, ABOVE + BELOW - top, left, rail - (ABOVE - top) * scale, box.w * scale, (ABOVE + BELOW - top) * scale);
  }
}
