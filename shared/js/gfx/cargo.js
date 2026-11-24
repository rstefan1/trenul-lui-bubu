/**
 * @file The goods a freight train carries on its flat wagons, and where they
 * stand on a wagon.
 *
 * The same drawings serve the wagon painter (the load travels with the
 * train) and the missions that load or secure it, so a load put on a wagon
 * by the child looks exactly the same once it rides with the train.
 *
 * Coordinates of a load: x from the rear end of the wagon, y = 0 on the
 * rail, negative upwards (as for the cars); every item stands with its
 * bottom on `bottom`.
 */

import { fillCircle, fillRoundRect } from './shapes.js';

/** Top of the deck of a flat wagon (car coordinates). */
export const DECK_Y = -58;

/** @typedef {'potatoes' | 'flour' | 'jars' | 'blankets-red' | 'blankets-blue' | 'sled' | 'water' | 'mystery' | 'logs'} CargoItem */

/**
 * @typedef {object} CargoSlot
 * @property {CargoItem} item
 * @property {number} x        centre, from the rear end of the wagon
 * @property {number} bottom   where the item stands
 * @property {number} w
 * @property {number} h
 */

/** Height of the heavy items of the bottom row. */
const LOW_H = 46;

/**
 * The provisions loaded in Suceava, for a wagon 250 units long: the heavy
 * crates and the sack in the bottom row, the light blankets on top of them.
 * @type {CargoSlot[]}
 */
export const PROVISIONS = [
  { item: 'potatoes', x: 45, bottom: DECK_Y, w: 72, h: LOW_H },
  { item: 'flour', x: 125, bottom: DECK_Y, w: 72, h: LOW_H },
  { item: 'jars', x: 205, bottom: DECK_Y, w: 72, h: LOW_H },
  { item: 'blankets-red', x: 85, bottom: DECK_Y - LOW_H, w: 74, h: 34 },
  { item: 'blankets-blue', x: 165, bottom: DECK_Y - LOW_H, w: 74, h: 34 },
];

/** Height of a sled lying on the deck. */
const SLED_H = 26;

/**
 * The sleds made in Câmpulung: two stacks of two, on a wagon 250 units long.
 * @type {CargoSlot[]}
 */
export const SLEDS = [
  { item: 'sled', x: 66, bottom: DECK_Y, w: 108, h: SLED_H },
  { item: 'sled', x: 184, bottom: DECK_Y, w: 108, h: SLED_H },
  { item: 'sled', x: 66, bottom: DECK_Y - SLED_H, w: 108, h: SLED_H },
  { item: 'sled', x: 184, bottom: DECK_Y - SLED_H, w: 108, h: SLED_H },
];

/**
 * The packs of mineral water loaded in Vatra Dornei, balanced on both sides
 * of the wagon, and the mysterious crate in the middle.
 * @type {CargoSlot[]}
 */
export const WATER = [
  { item: 'water', x: 40, bottom: DECK_Y, w: 60, h: 34 },
  { item: 'water', x: 40, bottom: DECK_Y - 34, w: 60, h: 34 },
  { item: 'water', x: 210, bottom: DECK_Y, w: 60, h: 34 },
  { item: 'water', x: 210, bottom: DECK_Y - 34, w: 60, h: 34 },
  { item: 'mystery', x: 125, bottom: DECK_Y, w: 84, h: 62 },
];

/** The firewood loaded in Ilva Mică: logs 12 m long in all, in a pile. */
export const LOGS = [
  { item: 'logs', x: 125, bottom: DECK_Y, w: 230, h: 54 },
];

/** @type {Readonly<Record<string, CargoSlot[]>>} the loads by name */
export const LOADS = Object.freeze({ provisions: PROVISIONS, sleds: SLEDS, water: WATER, logs: LOGS });

/**
 * Draws one item, centred on x, standing on `bottom`.
 * @param {CanvasRenderingContext2D} c
 * @param {CargoItem} item
 * @param {number} x
 * @param {number} bottom
 * @param {number} w
 * @param {number} h
 */
export function drawCargoItem(c, item, x, bottom, w, h) {
  const left = x - w / 2;
  const top = bottom - h;
  if (item === 'flour') {
    // a fat sack, tied at the top, with an ear of wheat on it
    c.fillStyle = '#e8dcc0';
    c.beginPath();
    c.moveTo(left + 4, bottom);
    c.quadraticCurveTo(left - 4, top + h * 0.4, left + 12, top + 8);
    c.lineTo(left + w - 12, top + 8);
    c.quadraticCurveTo(left + w + 4, top + h * 0.4, left + w - 4, bottom);
    c.closePath();
    c.fill();
    fillRoundRect(c, x - 10, top, 20, 10, 4, '#d6c7a3');
    c.strokeStyle = '#b08d3c';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(x, bottom - 8);
    c.lineTo(x, top + 18);
    c.stroke();
    c.fillStyle = '#c99a34';
    for (let k = 0; k < 3; k++) {
      fillCircle(c, x - 5, top + 20 + k * 7, 3.5);
      fillCircle(c, x + 5, top + 20 + k * 7, 3.5);
    }
    return;
  }
  if (item === 'water') {
    // a pack of six bottles of mineral water, wrapped in clear foil
    fillRoundRect(c, left, top, w, h, 5, 'rgba(200,228,250,0.9)');
    for (let k = 0; k < 3; k++) {
      const bx = left + 6 + k * ((w - 12) / 3);
      const bw = (w - 12) / 3 - 4;
      fillRoundRect(c, bx, top + 8, bw, h - 10, 4, '#5aa9e6');
      fillRoundRect(c, bx + bw / 2 - 3, top + 2, 6, 8, 2, '#1f6fb5');
      c.fillStyle = '#ffffff';
      c.fillRect(bx, top + h * 0.45, bw, 6);
    }
    c.fillStyle = 'rgba(255,255,255,0.45)';
    c.fillRect(left + 4, top + 3, w - 8, 3);
    return;
  }
  if (item === 'mystery') {
    // the mysterious crate: dark wood, iron corners and a big seal
    fillRoundRect(c, left, top, w, h, 6, '#7a3b2e');
    c.fillStyle = '#5d2a20';
    c.fillRect(left, top + h / 2 - 3, w, 6);
    c.fillStyle = '#c9ced6';
    for (const [cx, cy] of [[left, top], [left + w - 12, top], [left, bottom - 12], [left + w - 12, bottom - 12]]) c.fillRect(cx, cy, 12, 12);
    c.fillStyle = '#ffd23f';
    fillCircle(c, x, top + h / 2, 15);
    c.fillStyle = '#7a3b2e';
    c.font = '800 20px "Baloo 2", system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('?', x, top + h / 2 + 1);
    return;
  }
  if (item === 'logs') {
    // a pile of logs seen from the side: long trunks, their round ends at the back
    const rows = [[0, 3], [1, 2]];
    for (const [row, count] of rows) {
      const r = h / 4;
      const y = bottom - r - row * (r * 1.7);
      for (let k = 0; k < count; k++) {
        const lx = left + (row ? 18 : 0) + k * 6;
        fillRoundRect(c, lx, y - r, w - (row ? 36 : 0) - k * 12, r * 2, r, k % 2 ? '#8d5a2b' : '#9c6a3a');
      }
      c.fillStyle = '#e6c08a';
      for (let k = 0; k < count; k++) fillCircle(c, left + (row ? 18 : 0) + 4 + k * 6, y, r * 0.8);
    }
    return;
  }
  if (item === 'sled') {
    // a wooden sled seen from the side: the runner curling up at the front, posts and the seat
    c.strokeStyle = '#8d5a2b';
    c.lineWidth = 4;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(left + 4, bottom - 2);
    c.lineTo(left + w - 14, bottom - 2);
    c.quadraticCurveTo(left + w, bottom - 2, left + w, bottom - h * 0.5);
    c.quadraticCurveTo(left + w, bottom - h * 0.8, left + w - 8, bottom - h * 0.8);
    c.stroke();
    c.strokeStyle = '#a8743f';
    c.beginPath();
    for (const k of [0.2, 0.5, 0.8]) {
      c.moveTo(left + w * k * 0.92, bottom - 2);
      c.lineTo(left + w * k * 0.92, bottom - h + 6);
    }
    c.stroke();
    fillRoundRect(c, left + 2, bottom - h, w - 14, 8, 3, '#c98f52');
    return;
  }
  if (item === 'blankets-red' || item === 'blankets-blue') {
    // two rolled wool blankets, tied with string
    const colors = item === 'blankets-red' ? ['#d84343', '#f2c14e'] : ['#3d6fc4', '#f4f8ff'];
    const r = h / 4;
    for (let k = 0; k < 2; k++) {
      const y = bottom - r - k * (r * 2);
      fillRoundRect(c, left, y - r, w, r * 2, r, colors[0]);
      c.fillStyle = colors[1];
      for (let sx = left + 10; sx < left + w - 6; sx += 14) c.fillRect(sx, y - r, 4, r * 2);
      c.fillStyle = 'rgba(0,0,0,0.18)';
      fillCircle(c, left + w - r * 0.6, y, r * 0.55);
    }
    c.fillStyle = '#6d4c41';
    c.fillRect(left + w * 0.28, top, 3, h);
    c.fillRect(left + w * 0.7, top, 3, h);
    return;
  }
  // a wooden crate, with what it holds peeking out at the top
  fillRoundRect(c, left, top, w, h, 4, '#b98b56');
  c.fillStyle = '#9c7040';
  for (let k = 1; k < 3; k++) c.fillRect(left, top + (h / 3) * k - 2, w, 4);
  c.fillRect(left + 4, top, 5, h);
  c.fillRect(left + w - 9, top, 5, h);
  if (item === 'potatoes') {
    c.fillStyle = '#c9a063';
    for (let k = 0; k < 5; k++) fillCircle(c, left + 12 + k * ((w - 24) / 4), top + 2, 7);
  } else {
    for (let k = 0; k < 4; k++) {
      const jx = left + 12 + k * ((w - 24) / 3);
      fillRoundRect(c, jx - 6, top - 12, 12, 14, 3, '#e57373');
      fillRoundRect(c, jx - 7, top - 15, 14, 5, 2, '#f2c14e');
    }
  }
}

/**
 * Draws a whole load on a wagon (car coordinates), with its straps.
 * @param {CanvasRenderingContext2D} c
 * @param {CargoSlot[]} load
 */
export function drawLoad(c, load) {
  for (const s of load) drawCargoItem(c, s.item, s.x, s.bottom, s.w, s.h);
  // orange straps over every stack, hooked to the deck
  const stacks = load.filter(s => s.bottom < DECK_Y);
  const top = Math.min(...load.map(s => s.bottom - s.h));
  c.fillStyle = '#f08a24';
  for (const s of stacks) {
    c.fillRect(s.x - 2, top - 2, 4, DECK_Y - top + 2);
    c.fillRect(s.x - 5, DECK_Y - 3, 10, 5);
  }
}
