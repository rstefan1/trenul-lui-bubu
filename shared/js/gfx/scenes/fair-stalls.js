/**
 * @file The open stalls of the enchanted Christmas fair (Vatra Dornei): in
 * the middle of the night all the people are asleep, and the animals of the
 * forest run the fair. Each stall has its striped awning, string of lights,
 * a sign, its goods on the counter and an animal seller behind it (a hare
 * with gingerbread, a beaver with wooden toys, a fox with hot tea, a
 * squirrel roasting chestnuts, a bear with honey, a sheep with woollen
 * socks). Steam rises from the tea and the chestnuts, the sellers bob, and a
 * few animal visitors stroll by in front of the stalls.
 */

import { TAU, clamp } from '../../core/math.js';
import { fillCircle, fillRoundRect, glow } from '../shapes.js';

const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';

/**
 * @typedef {{emoji: string}} Seller
 * @typedef {{name: string, seller: Seller, stripe: string, goods: string, steam?: boolean}} StallKind
 */

/** The stalls, in the order they stand. @type {StallKind[]} */
const STALLS = [
  { name: 'Turtă dulce', seller: { emoji: '🐰' }, stripe: '#c62828', goods: 'hearts' },
  { name: 'Jucării de lemn', seller: { emoji: '🦫' }, stripe: '#1565c0', goods: 'toys' },
  { name: 'Ceai fierbinte', seller: { emoji: '🦊' }, stripe: '#2e7d32', goods: 'cups', steam: true },
  { name: 'Castane coapte', seller: { emoji: '🐿️' }, stripe: '#6d4c41', goods: 'chestnuts', steam: true },
  { name: 'Miere', seller: { emoji: '🐻' }, stripe: '#f9a825', goods: 'honey' },
  { name: 'Ciorapi de lână', seller: { emoji: '🐑' }, stripe: '#6a1b9a', goods: 'socks' },
];

/** Visitors strolling in front of the stalls. */
const VISITORS = [
  { emoji: '🦌', speed: 34, offset: 0, dir: 1 },
  { emoji: '🐇', speed: 28, offset: 0.45, dir: -1 },
  { emoji: '🦔', speed: 22, offset: 0.7, dir: 1 },
];

/**
 * Draws the row of stalls.
 * @param {CanvasRenderingContext2D} c
 * @param {{left: number, right: number, ground: number, height: number}} v  height = room for a stall
 * @param {number} time  seconds, for the little movements
 */
export function drawFairStalls(c, v, time) {
  const w = v.right - v.left;
  const count = clamp(Math.floor(w / 250), 3, STALLS.length);
  const slot = w / count;
  const sw = slot - 26;
  const h = clamp(v.height, 150, 230);
  for (let i = 0; i < count; i++) {
    drawStall(c, v.left + i * slot + 13, v.ground, sw, h, STALLS[i], time + i * 0.7);
  }
  // visitors walk along the front, coming back on the other side
  for (const vis of VISITORS) {
    const span = w + 240;
    const pos = (((time * vis.speed) / span + vis.offset) % 1) * span;
    const x = vis.dir > 0 ? v.left - 120 + pos : v.right + 120 - pos;
    const step = Math.abs(Math.sin(time * 5 + vis.offset * 10)) * 4;
    if (vis.emoji) {
      c.save();
      c.translate(x, v.ground - 6 - step);
      if (vis.dir > 0) c.scale(-1, 1);   // emoji face left; walking right means flipping
      c.font = `${Math.round(h * 0.34)}px ${EMOJI_FONT}`;
      c.textAlign = 'center';
      c.textBaseline = 'bottom';
      c.fillText(vis.emoji, 0, 0);
      c.restore();
    }
  }
}

/**
 * One open stall.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x      left edge
 * @param {number} g      ground
 * @param {number} w
 * @param {number} h
 * @param {StallKind} kind
 * @param {number} t
 */
function drawStall(c, x, g, w, h, kind, t) {
  const counterTop = g - h * 0.38;
  const awningTop = g - h * 0.92;
  const awningBottom = g - h * 0.76;
  // the warm, lit inside of the stall
  const inside = c.createLinearGradient(0, awningBottom, 0, counterTop);
  inside.addColorStop(0, '#5d3a24');
  inside.addColorStop(1, '#8a5a35');
  c.fillStyle = inside;
  c.fillRect(x, awningBottom, w, counterTop - awningBottom + 4);
  glow(c, x + w / 2, awningBottom + 20, w * 0.6, 'rgba(255,214,140,0.45)', 'rgba(255,214,140,0)');
  // goods hanging at the back (socks, wooden spoons…) and the seller
  if (kind.goods === 'socks') {
    for (let k = 0; k < 4; k++) drawSock(c, x + w * (0.2 + k * 0.2), awningBottom + 10, h * 0.13, ['#c62828', '#fbc02d', '#1565c0', '#2e7d32'][k]);
  }
  drawSeller(c, x + w * 0.5, counterTop, h, kind.seller, t);
  // posts
  c.fillStyle = '#5d4037';
  c.fillRect(x - 4, awningTop, 8, g - awningTop);
  c.fillRect(x + w - 4, awningTop, 8, g - awningTop);
  // the counter, with planks, and the goods on it
  fillRoundRect(c, x - 8, counterTop, w + 16, g - counterTop, 4, '#a1887f');
  c.fillStyle = '#8d6e63';
  c.fillRect(x - 10, counterTop - 6, w + 20, 10);
  c.strokeStyle = 'rgba(62,39,35,0.25)';
  c.lineWidth = 2;
  c.beginPath();
  for (let y = counterTop + 22; y < g; y += 20) {
    c.moveTo(x - 8, y);
    c.lineTo(x + w + 8, y);
  }
  c.stroke();
  drawGoods(c, x, counterTop - 6, w, h, kind, t);
  // the striped awning with a scalloped edge
  const stripes = 7;
  const sw = (w + 20) / stripes;
  for (let k = 0; k < stripes; k++) {
    c.fillStyle = k % 2 ? '#fffaf0' : kind.stripe;
    c.fillRect(x - 10 + k * sw, awningTop, sw + 0.5, awningBottom - awningTop);
    c.beginPath();
    c.arc(x - 10 + k * sw + sw / 2, awningBottom, sw / 2, 0, Math.PI);
    c.fill();
  }
  // roof with snow, and the sign
  c.fillStyle = '#4e342e';
  c.beginPath();
  c.moveTo(x - 18, awningTop + 2);
  c.lineTo(x + w / 2, awningTop - h * 0.2);
  c.lineTo(x + w + 18, awningTop + 2);
  c.closePath();
  c.fill();
  c.fillStyle = '#f4f8ff';
  c.beginPath();
  c.moveTo(x - 20, awningTop + 2);
  c.lineTo(x + w / 2, awningTop - h * 0.2 - 4);
  c.lineTo(x + w + 20, awningTop + 2);
  c.lineTo(x + w + 8, awningTop + 6);
  c.lineTo(x + w / 2, awningTop - h * 0.2 + 6);
  c.lineTo(x - 8, awningTop + 6);
  c.closePath();
  c.fill();
  const signW = Math.min(w * 0.9, 170);
  fillRoundRect(c, x + w / 2 - signW / 2, awningTop - h * 0.13, signW, h * 0.12, 6, '#fff3d6');
  c.fillStyle = '#4e342e';
  c.font = `800 ${Math.round(clamp(h * 0.075, 12, 17))}px "Baloo 2", system-ui, sans-serif`;
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(kind.name, x + w / 2, awningTop - h * 0.07, signW - 10);
  // the string of lights along the awning
  for (let k = 0; k <= 8; k++) {
    const lx = x - 6 + (k * (w + 12)) / 8;
    const ly = awningBottom + 8 + Math.sin(k * 1.3) * 3;
    const on = Math.sin(t * 3 + k) > -0.6;
    const col = ['#ffd54f', '#ff8a80', '#80d8ff', '#b9f6ca'][k % 4];
    if (on) glow(c, lx, ly, 10, 'rgba(255,240,180,0.55)', 'rgba(255,240,180,0)');
    c.fillStyle = on ? col : '#7a6a5a';
    fillCircle(c, lx, ly, 4);
  }
}

/**
 * The animal selling behind the counter.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} counterTop
 * @param {number} h
 * @param {Seller} s
 * @param {number} t
 */
function drawSeller(c, x, counterTop, h, s, t) {
  const bob = Math.sin(t * 2.2) * 3;
  c.font = `${Math.round(h * 0.36)}px ${EMOJI_FONT}`;
  c.textAlign = 'center';
  c.textBaseline = 'bottom';
  c.fillText(s.emoji, x, counterTop + h * 0.08 + bob);
}

/**
 * The goods laid out on the counter.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} top
 * @param {number} w
 * @param {number} h
 * @param {StallKind} kind
 * @param {number} t
 */
function drawGoods(c, x, top, w, h, kind, t) {
  const u = h * 0.06;
  const n = Math.max(3, Math.floor(w / (u * 3.2)));
  for (let k = 0; k < n; k++) {
    const gx = x + ((k + 0.5) * w) / n;
    if (kind.goods === 'hearts') {
      c.fillStyle = '#a0522d';
      c.beginPath();
      c.moveTo(gx, top);
      c.bezierCurveTo(gx - u * 1.4, top - u * 0.8, gx - u * 0.8, top - u * 2, gx, top - u * 1.3);
      c.bezierCurveTo(gx + u * 0.8, top - u * 2, gx + u * 1.4, top - u * 0.8, gx, top);
      c.fill();
      c.strokeStyle = '#fff';
      c.lineWidth = 1.5;
      c.stroke();
    } else if (kind.goods === 'cups') {
      fillRoundRect(c, gx - u * 0.6, top - u * 1.3, u * 1.2, u * 1.3, 3, ['#e53935', '#fbc02d', '#1e88e5'][k % 3]);
      c.strokeStyle = '#fffaf0';
      c.lineWidth = 2;
      c.beginPath();
      c.arc(gx + u * 0.75, top - u * 0.7, u * 0.35, -1.3, 1.3);
      c.stroke();
    } else if (kind.goods === 'honey') {
      fillRoundRect(c, gx - u * 0.7, top - u * 1.6, u * 1.4, u * 1.6, 5, '#f9a825');
      c.fillStyle = '#fff3d6';
      c.fillRect(gx - u * 0.75, top - u * 1.75, u * 1.5, u * 0.35);
      c.fillStyle = '#c62828';
      c.fillRect(gx - u * 0.7, top - u * 1.62, u * 1.4, u * 0.12);
    } else if (kind.goods === 'toys') {
      // little wooden horses
      c.fillStyle = ['#d84315', '#1565c0', '#2e7d32'][k % 3];
      c.fillRect(gx - u * 0.8, top - u * 1.2, u * 1.4, u * 0.6);
      c.fillRect(gx + u * 0.4, top - u * 1.8, u * 0.4, u * 0.8);
      c.fillRect(gx - u * 0.7, top - u * 0.6, u * 0.2, u * 0.6);
      c.fillRect(gx + u * 0.3, top - u * 0.6, u * 0.2, u * 0.6);
    } else if (kind.goods === 'chestnuts') {
      if (k === Math.floor(n / 2)) {
        // the roasting pan with glowing coals
        glow(c, gx, top - u * 0.4, u * 2.5, 'rgba(255,120,40,0.5)', 'rgba(255,120,40,0)');
        fillRoundRect(c, gx - u * 1.4, top - u * 0.8, u * 2.8, u * 0.8, 4, '#37474f');
        c.fillStyle = '#6d3f1e';
        for (let m = 0; m < 6; m++) fillCircle(c, gx - u + m * u * 0.4, top - u * 0.85, u * 0.25);
      } else {
        c.fillStyle = '#6d3f1e';
        for (let m = 0; m < 3; m++) fillCircle(c, gx - u * 0.4 + m * u * 0.4, top - u * 0.3 - (m % 2) * u * 0.25, u * 0.25);
      }
    } else if (kind.goods === 'socks') {
      fillRoundRect(c, gx - u * 0.7, top - u * 0.7, u * 1.4, u * 0.7, 3, ['#fbc02d', '#c62828', '#1565c0'][k % 3]);
    }
  }
  if (kind.steam) {
    // steam curling up from the middle of the counter
    c.fillStyle = 'rgba(255,255,255,0.35)';
    for (let k = 0; k < 4; k++) {
      const p = (t * 0.5 + k / 4) % 1;
      fillCircle(c, x + w / 2 + Math.sin(p * TAU + k) * 8, top - u * 1.5 - p * h * 0.35, u * (0.4 + p * 0.6));
    }
  }
}

/**
 * A woollen sock hanging at the back of the stall.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y   where it hangs
 * @param {number} s
 * @param {string} color
 */
function drawSock(c, x, y, s, color) {
  c.fillStyle = color;
  c.beginPath();
  c.moveTo(x - s * 0.25, y);
  c.lineTo(x + s * 0.25, y);
  c.lineTo(x + s * 0.25, y + s * 0.8);
  c.quadraticCurveTo(x + s * 0.9, y + s * 0.85, x + s * 0.7, y + s * 1.15);
  c.lineTo(x - s * 0.1, y + s * 1.15);
  c.quadraticCurveTo(x - s * 0.3, y + s, x - s * 0.25, y + s * 0.8);
  c.closePath();
  c.fill();
  c.fillStyle = '#fffaf0';
  c.fillRect(x - s * 0.25, y, s * 0.5, s * 0.15);
}
