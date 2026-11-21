/**
 * @file Bubu's sleigh and the reindeer that pull it.
 *
 * The drawings follow the sleigh of the earlier game "Sania lui Bubu", so
 * the children recognise it: a red sleigh with golden runners and two
 * galloping reindeer, the leading one with a red nose.
 */

import { TAU } from '../core/math.js';
import { drawBubu } from '../train/bubu.js';

/**
 * The sleigh, seen from the side, facing right. (x, y) is the middle of the
 * bottom of the body; s is its length.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} s
 */
export function drawSleigh(c, x, y, s) {
  c.fillStyle = '#c62828';
  c.beginPath();
  c.moveTo(x - s * 0.5, y - s * 0.3);
  c.lineTo(x + s * 0.35, y - s * 0.3);
  c.quadraticCurveTo(x + s * 0.55, y - s * 0.3, x + s * 0.5, y);
  c.lineTo(x - s * 0.45, y);
  c.closePath();
  c.fill();
  c.fillStyle = '#ffd54f';
  c.fillRect(x - s * 0.5, y - s * 0.34, s * 0.85, s * 0.06);
  c.strokeStyle = '#ffd54f';
  c.lineWidth = s * 0.04;
  c.beginPath();
  c.moveTo(x - s * 0.5, y + s * 0.12);
  c.lineTo(x + s * 0.5, y + s * 0.12);
  c.quadraticCurveTo(x + s * 0.68, y + s * 0.12, x + s * 0.62, y - s * 0.05);
  c.moveTo(x - s * 0.3, y);
  c.lineTo(x - s * 0.3, y + s * 0.12);
  c.moveTo(x + s * 0.3, y);
  c.lineTo(x + s * 0.3, y + s * 0.12);
  c.stroke();
}

/**
 * A reindeer seen from the side, facing right, galloping. (x, y) is the
 * middle of the body; s is the body length.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} s
 * @param {number} phase    seconds (the legs swing with it)
 * @param {boolean} redNose
 */
export function drawReindeer(c, x, y, s, phase, redNose) {
  const fur = '#9c6236';
  const dark = '#6d4022';
  const light = '#e9d2b4';
  c.strokeStyle = dark;
  c.lineCap = 'round';
  c.lineWidth = s * 0.07;
  for (const [lx, off] of [[-0.3, 0], [-0.22, 1.6], [0.25, 3.1], [0.33, 4.7]]) {
    const a = Math.sin(phase * 9 + off) * 0.55;
    const hx = x + lx * s;
    const hy = y + s * 0.1;
    const kx = hx + Math.sin(a) * s * 0.22;
    const ky = hy + Math.cos(a) * s * 0.22;
    const fx = kx + Math.sin(a * 0.4 - 0.2) * s * 0.22;
    const fy = ky + Math.cos(a * 0.4) * s * 0.2;
    c.beginPath();
    c.moveTo(hx, hy);
    c.lineTo(kx, ky);
    c.lineTo(fx, fy);
    c.stroke();
  }
  c.fillStyle = '#fff';
  c.beginPath();
  c.ellipse(x - s * 0.47, y - s * 0.1, s * 0.07, s * 0.05, -0.6, 0, TAU);
  c.fill();
  c.fillStyle = fur;
  c.beginPath();
  c.ellipse(x, y, s * 0.45, s * 0.2, 0, 0, TAU);
  c.fill();
  c.fillStyle = light;
  c.beginPath();
  c.ellipse(x + s * 0.02, y + s * 0.1, s * 0.32, s * 0.08, 0, 0, TAU);
  c.fill();
  c.fillStyle = fur;
  c.beginPath();
  c.moveTo(x + s * 0.22, y - s * 0.12);
  c.lineTo(x + s * 0.5, y - s * 0.48);
  c.lineTo(x + s * 0.64, y - s * 0.38);
  c.lineTo(x + s * 0.42, y + s * 0.05);
  c.closePath();
  c.fill();
  c.strokeStyle = '#7a5a43';
  c.lineWidth = s * 0.035;
  c.beginPath();
  c.moveTo(x + s * 0.55, y - s * 0.55);
  c.quadraticCurveTo(x + s * 0.45, y - s * 0.8, x + s * 0.32, y - s * 0.85);
  c.moveTo(x + s * 0.47, y - s * 0.72);
  c.lineTo(x + s * 0.55, y - s * 0.86);
  c.moveTo(x + s * 0.4, y - s * 0.8);
  c.lineTo(x + s * 0.42, y - s * 0.95);
  c.stroke();
  c.fillStyle = dark;
  c.beginPath();
  c.ellipse(x + s * 0.5, y - s * 0.55, s * 0.08, s * 0.035, -0.5, 0, TAU);
  c.fill();
  c.fillStyle = fur;
  c.beginPath();
  c.ellipse(x + s * 0.62, y - s * 0.5, s * 0.14, s * 0.1, 0.35, 0, TAU);
  c.fill();
  c.beginPath();
  c.ellipse(x + s * 0.74, y - s * 0.44, s * 0.09, s * 0.065, 0.35, 0, TAU);
  c.fill();
  c.fillStyle = '#1b1b1b';
  c.beginPath();
  c.arc(x + s * 0.63, y - s * 0.54, s * 0.022, 0, TAU);
  c.fill();
  if (redNose) {
    c.fillStyle = `rgba(255,60,60,${0.25 + 0.15 * Math.sin(phase * 6)})`;
    c.beginPath();
    c.arc(x + s * 0.82, y - s * 0.41, s * 0.09, 0, TAU);
    c.fill();
  }
  c.fillStyle = redNose ? '#ff1744' : '#3e2723';
  c.beginPath();
  c.arc(x + s * 0.82, y - s * 0.41, s * (redNose ? 0.045 : 0.035), 0, TAU);
  c.fill();
  c.fillStyle = '#c62828';
  c.fillRect(x + s * 0.12, y - s * 0.2, s * 0.08, s * 0.4);
  c.fillStyle = '#ffd54f';
  c.beginPath();
  c.arc(x + s * 0.16, y + s * 0.22, s * 0.045, 0, TAU);
  c.fill();
}

/**
 * The whole team: two reindeer pulling the sleigh with Bubu in it.
 * (x, y) is the bottom of the sleigh; k scales everything (1 = sleigh 100
 * units long).
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} k
 * @param {number} phase
 * @param {(c: CanvasRenderingContext2D, x: number, y: number) => void} [cargo]  something carried in the sleigh (e.g. a tree)
 */
export function drawSleighTeam(c, x, y, k, phase, cargo) {
  c.strokeStyle = '#7a5a43';
  c.lineWidth = 2.5 * k;
  c.beginPath();
  c.moveTo(x + 40 * k, y - 18 * k);
  c.lineTo(x + 150 * k, y - 28 * k);
  c.stroke();
  drawReindeer(c, x + 155 * k, y - 25 * k, 70 * k, phase, true);
  drawReindeer(c, x + 78 * k, y - 20 * k, 70 * k, phase + 0.4, false);
  if (cargo) cargo(c, x - 25 * k, y - 28 * k);
  drawBubu(c, x + 5 * k, y - 48 * k, 62 * k, Math.sin(phase * 3) * 0.06);
  drawSleigh(c, x, y + 15 * k, 100 * k);
}
