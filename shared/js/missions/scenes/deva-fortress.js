/**
 * @file Scene for the Deva station mission: the hill above the town with
 * the medieval fortress on top, the inclined lift that climbs to it, and
 * the torches on the walls.
 *
 * A scene describes only geometry and drawing; the mission decides what
 * happens. Everything is laid out from the stage width, so the scene fits
 * wide laptops and narrow phones alike.
 */

import { TAU, lerp } from '../../core/math.js';
import { css, mixHex } from '../../gfx/color.js';
import { drawFir, fillCircle, glow } from '../../gfx/shapes.js';

/**
 * @typedef {object} DevaLayout
 * @property {number} W
 * @property {(x: number) => number} hill   height of the hill's outline at x
 * @property {{x: number, y: number}} liftFrom   lower station of the lift
 * @property {{x: number, y: number}} liftTo     upper station of the lift
 * @property {Array<{x: number, y: number}>} torches
 * @property {{x: number, y: number}} bubu   where Bubu stands with her lantern
 * @property {number} wallLeft
 * @property {number} wallRight
 * @property {number} wallTop
 */

/**
 * @param {number} W  stage width
 * @returns {DevaLayout}
 */
export function devaLayout(W) {
  const peakX = W * 0.6;
  const hill = (/** @type {number} */ x) => {
    const u = (x - peakX) / (W * 0.42);
    return 420 + 500 * Math.min(1, u * u) - 30 * Math.cos(u * 3);
  };
  const wallLeft = peakX - Math.min(250, W * 0.16);
  const wallRight = peakX + Math.min(250, W * 0.16);
  const wallTop = 322;
  const liftTo = { x: wallLeft - 30, y: hill(wallLeft - 30) - 6 };
  const liftFrom = { x: Math.max(70, W * 0.12), y: 870 };
  const span = wallRight - wallLeft;
  return {
    W,
    hill,
    liftFrom,
    liftTo,
    wallLeft,
    wallRight,
    wallTop,
    bubu: { x: liftTo.x - 10, y: liftTo.y - 40 },
    torches: [
      { x: wallLeft + span * 0.06, y: wallTop - 30 },
      { x: wallLeft + span * 0.3, y: wallTop + 48 },
      { x: wallLeft + span * 0.5, y: wallTop - 72 },
      { x: wallLeft + span * 0.7, y: wallTop + 48 },
      { x: wallLeft + span * 0.94, y: wallTop - 30 },
      { x: wallLeft + span * 0.5, y: wallTop + 92 },
    ],
  };
}

/**
 * Sky, town lights, the hill with firs and snow, and the lift track.
 * @param {CanvasRenderingContext2D} c
 * @param {DevaLayout} L
 * @param {import('../../world/lighting.js').Light} light
 * @param {{top: number, bottom: number}} view   visible rows
 */
export function drawDevaBackground(c, L, light, view) {
  const { W } = L;
  const g = c.createLinearGradient(0, view.top, 0, 700);
  g.addColorStop(0, css(light.top));
  g.addColorStop(0.6, css(light.mid));
  g.addColorStop(1, css(light.bottom));
  c.fillStyle = g;
  c.fillRect(0, view.top, W, view.bottom - view.top);
  // stars
  c.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 70; i++) {
    const x = ((i * 977) % 1000) / 1000 * W;
    const y = view.top + ((i * 613) % 1000) / 1000 * (420 - view.top);
    fillCircle(c, x, y, (i % 3) * 0.6 + 0.7);
  }
  // the town at the foot of the hill: rows of lit windows
  c.fillStyle = '#26315e';
  c.fillRect(0, 800, W, view.bottom - 800);
  for (let i = 0; i < W / 34; i++) {
    const x = i * 34 + ((i * 37) % 13);
    const h = 40 + ((i * 53) % 60);
    c.fillStyle = '#2e3a6c';
    c.fillRect(x, 800 - h, 30, h);
    c.fillStyle = (i % 3) ? '#ffd877' : '#ffe7a8';
    c.fillRect(x + 8, 800 - h + 10, 6, 8);
    if (h > 70) c.fillRect(x + 17, 800 - h + 30, 6, 8);
  }
  // the hill, covered with snow (bluish in the night), lit from the left
  const night = light.night * 0.7;
  const snow = c.createLinearGradient(W * 0.2, 0, W, 0);
  snow.addColorStop(0, mixHex('#eef3fb', '#a9b9da', night));
  snow.addColorStop(1, mixHex('#c9d5ea', '#7d8fb8', night));
  c.fillStyle = snow;
  c.beginPath();
  c.moveTo(0, view.bottom);
  for (let x = 0; x <= W; x += 10) c.lineTo(x, L.hill(x));
  c.lineTo(W, view.bottom);
  c.closePath();
  c.fill();
  // firs on the slopes
  for (let i = 0; i < 26; i++) {
    const x = ((i * 389) % 1000) / 1000 * W;
    if (Math.abs(x - L.liftFrom.x - (L.liftTo.x - L.liftFrom.x) * 0.5) < 60) continue;
    const y = L.hill(x) + 30 + ((i * 211) % 140);
    if (y > 860) continue;
    drawFir(c, x, y, 40 + ((i * 97) % 40), { snowy: true });
  }
  // the lift track: two rails on pillars
  const { liftFrom: a, liftTo: b } = L;
  c.strokeStyle = '#59627a';
  c.lineWidth = 5;
  for (let k = 0; k <= 6; k++) {
    const x = lerp(a.x, b.x, k / 6);
    const y = lerp(a.y, b.y, k / 6);
    c.beginPath();
    c.moveTo(x, y + 4);
    c.lineTo(x, Math.min(view.bottom, L.hill(x) + 60, y + 90));
    c.stroke();
  }
  c.strokeStyle = '#3b4250';
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(a.x, a.y);
  c.lineTo(b.x, b.y);
  c.stroke();
}

/**
 * The fortress: walls and towers.
 * @param {CanvasRenderingContext2D} c
 * @param {DevaLayout} L
 * @param {number} glowAll      0..1, the whole fortress lit up at the end
 * @param {number} time
 */
export function drawDevaFortress(c, L, glowAll, time) {
  const { wallLeft: l, wallRight: r, wallTop: t } = L;
  const span = r - l;
  const stone = '#8b8fa3';
  const dark = '#6f7389';
  // walls with battlements
  c.fillStyle = stone;
  c.fillRect(l, t, span, 150);
  c.fillStyle = dark;
  c.fillRect(l, t + 110, span, 40);
  c.fillStyle = stone;
  for (let x = l; x < r; x += 28) c.fillRect(x, t - 16, 16, 18);
  // towers
  for (const [tx, w, h] of [[l - 20, 70, 110], [l + span * 0.5 - 45, 90, 160], [r - 50, 70, 110]]) {
    c.fillStyle = stone;
    c.fillRect(tx, t - h + 40, w, h + 110);
    for (let x = tx; x < tx + w; x += 22) c.fillRect(x, t - h + 26, 12, 16);
    c.fillStyle = '#3b3550';
    c.beginPath();
    c.moveTo(tx + w / 2 - 9, t - h + 110);
    c.lineTo(tx + w / 2 - 9, t - h + 88);
    c.arc(tx + w / 2, t - h + 88, 9, Math.PI, 0);
    c.lineTo(tx + w / 2 + 9, t - h + 110);
    c.closePath();
    c.fill();
  }
  // snow on the battlements
  c.fillStyle = '#f4f8ff';
  for (let x = l; x < r; x += 28) c.fillRect(x - 1, t - 19, 18, 4);
  // flag on the big tower
  c.strokeStyle = '#3b4250';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(l + span * 0.5, t - 134);
  c.lineTo(l + span * 0.5, t - 190);
  c.stroke();
  c.fillStyle = '#d32f2f';
  c.beginPath();
  c.moveTo(l + span * 0.5, t - 190);
  c.lineTo(l + span * 0.5 + 34 + Math.sin(time * 4) * 4, t - 180);
  c.lineTo(l + span * 0.5, t - 168);
  c.closePath();
  c.fill();

  if (glowAll > 0) {
    c.globalAlpha = glowAll;
    glow(c, l + span / 2, t + 20, span * 0.85, 'rgba(255,200,110,0.45)', 'rgba(255,200,110,0)');
    c.globalAlpha = 1;
  }

}

/**
 * The torches on the walls: an iron bracket, and a flame when lit.
 * @param {CanvasRenderingContext2D} c
 * @param {DevaLayout} L
 * @param {boolean[]} lit   per torch
 * @param {number} time
 */
export function drawDevaTorches(c, L, lit, time) {
  L.torches.forEach((p, i) => {
    c.fillStyle = '#3b3550';
    c.fillRect(p.x - 3, p.y, 6, 26);
    c.fillRect(p.x - 10, p.y, 20, 6);
    if (!lit[i]) {
      c.fillStyle = '#4a4458';
      fillCircle(c, p.x, p.y - 4, 7);
      return;
    }
    const flicker = 1 + Math.sin(time * 17 + i) * 0.12;
    glow(c, p.x, p.y - 12, 70 * flicker, 'rgba(255,190,90,0.6)', 'rgba(255,190,90,0)');
    c.fillStyle = '#ff9a2e';
    c.beginPath();
    c.moveTo(p.x - 9, p.y - 2);
    c.quadraticCurveTo(p.x - 10, p.y - 22 * flicker, p.x, p.y - 32 * flicker);
    c.quadraticCurveTo(p.x + 10, p.y - 22 * flicker, p.x + 9, p.y - 2);
    c.closePath();
    c.fill();
    c.fillStyle = '#ffe27a';
    c.beginPath();
    c.ellipse(p.x, p.y - 10, 4, 10 * flicker, 0, 0, TAU);
    c.fill();
  });
}

/**
 * The cabin of the inclined lift, with Bubu at its window.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x   centre of the cabin on the track
 * @param {number} y
 * @param {number} slope  angle of the track (radians)
 * @param {(c: CanvasRenderingContext2D, x: number, y: number, size: number) => void} drawBubu
 */
export function drawLiftCabin(c, x, y, slope, drawBubu) {
  c.save();
  c.translate(x, y);
  c.rotate(slope);
  c.fillStyle = '#c62828';
  c.fillRect(-46, -58, 92, 54);
  c.fillStyle = '#fbeed2';
  c.fillRect(-46, -30, 92, 6);
  c.fillStyle = '#ffe39a';
  c.fillRect(-36, -50, 30, 20);
  c.fillRect(6, -50, 30, 20);
  c.fillStyle = '#2d323c';
  fillCircle(c, -26, -2, 7);
  fillCircle(c, 26, -2, 7);
  c.restore();
  drawBubu(c, x + 12 * Math.cos(slope), y - 48 + 12 * Math.sin(slope), 54);
}
