/**
 * @file A locomotive standing still, drawn on a canvas of its own (the depot
 * shows the locomotives this way). It is painted by the same painters as
 * the train of the journeys, so it looks exactly like the one the child
 * travels with, then fitted to the canvas, standing on its rail.
 */

import { TAU } from '../core/math.js';
import { fillCircle } from '../gfx/shapes.js';
import { CAR_PAINTERS, WHEEL_R } from '../train/cars.js';
import { TRACK_Y, WIRE_Y } from '../world/track.js';

/** Height of the contact wire above the rail (the pantograph touches it). */
const WIRE_H = TRACK_Y - WIRE_Y;
/** Room around the locomotive on the work canvas (buffers, lamps). */
const MARGIN = 40;
/** Height of the work canvas above the rail (the pantograph reaches the wire). */
const ABOVE = WIRE_H + 20;
/** Below the rail: the bottom of the wheels and the rail itself. */
const BELOW = 12;

/**
 * Paints the locomotive at size 1, with its wheels, on a canvas of its own,
 * and finds the box around what was painted.
 * @param {import('../train/specs.js').CarSpec} car
 */
function paintAlone(car) {
  const work = document.createElement('canvas');
  work.width = car.length + MARGIN * 2;
  work.height = ABOVE + BELOW;
  const c = /** @type {CanvasRenderingContext2D} */ (work.getContext('2d', { willReadFrequently: true }));
  c.translate(MARGIN, ABOVE);
  const geo = CAR_PAINTERS[car.kind](c, car, { leading: true, trailing: true });
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
  // the box around the painted pixels
  const { data, width, height } = c.getImageData(0, 0, work.width, work.height);
  let [x0, y0, x1, y1] = [width, height, 0, 0];
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      if (data[(y * width + x) * 4 + 3] < 8) continue;
      if (x < x0) x0 = x;
      if (x > x1) x1 = x;
      if (y < y0) y0 = y;
      if (y > y1) y1 = y;
    }
  }
  return { work, box: { x: x0, y: y0, w: x1 - x0 + 1, h: Math.max(ABOVE - y0, 1) } };
}

/**
 * Draws the locomotive on the canvas, as big as fits, standing on a rail
 * near the bottom (an electric one with the wire above it), and makes the
 * canvas sharp for the screen.
 * @param {HTMLCanvasElement} canvas  its size on the page is set by CSS
 * @param {import('../train/specs.js').CarSpec} car
 */
export function drawLocoPicture(canvas, car) {
  const ratio = Math.min(window.devicePixelRatio || 1, 3);
  const cssW = canvas.clientWidth || 300;
  const cssH = canvas.clientHeight || 160;
  canvas.width = Math.round(cssW * ratio);
  canvas.height = Math.round(cssH * ratio);
  const c = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  c.setTransform(ratio, 0, 0, ratio, 0, 0);
  c.clearRect(0, 0, cssW, cssH);

  const { work, box } = paintAlone(car);
  const rail = cssH - 14;              // where the rail is on the canvas
  const electric = car.kind === 'electricLoco';
  const room = rail - (electric ? 10 : 8);
  const scale = Math.min((cssW - 24) / box.w, room / box.h);
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
    const wire = rail - (WIRE_H - 2) * scale;
    c.fillStyle = '#2b2f38';
    c.fillRect(0, wire - 1, cssW, 2);
  }
  c.imageSmoothingQuality = 'high';
  c.drawImage(work, box.x, ABOVE - box.h, box.w, box.h, left, rail - box.h * scale, box.w * scale, box.h * scale);
}
