/**
 * @file The railway itself: rails, sleepers, ballast and the overhead line.
 *
 * Everything here is drawn every frame (it is only a few hundred simple
 * shapes), in the near layer, so it shares the time-of-day tint.
 */

import { hexToRgb, css, mixRgb } from '../gfx/color.js';

/** Height of the rail top, in stage units. All train geometry hangs off it. */
export const TRACK_Y = 770;

/** Height of the contact wire of the overhead line. */
export const WIRE_Y = TRACK_Y - 252;

/** Distance between two catenary masts. */
const MAST_SPACING = 420;
/** Distance between two sleepers. */
const SLEEPER_SPACING = 26;

const BALLAST_BARE = hexToRgb('#9a8f86');
const BALLAST_SNOWY = hexToRgb('#e7edf6');

/**
 * @typedef {object} TrackView
 * @property {number} distance  distance travelled
 * @property {number} anchorX   screen x of the front of the train
 * @property {number} cover     snow cover 0..1
 * @property {number} left      leftmost visible x (stage units)
 * @property {number} right     rightmost visible x
 */

/**
 * Screen x of a world position (near layer).
 * @param {TrackView} v
 * @param {number} worldX
 */
export const screenX = (v, worldX) => worldX - v.distance + v.anchorX;

/**
 * Ballast, sleepers and the rail between two screen x positions.
 * @param {CanvasRenderingContext2D} c
 * @param {TrackView} v
 * @param {number} [from]  screen x, defaults to the left edge
 * @param {number} [to]    screen x, defaults to the right edge
 */
export function drawTrack(c, v, from = v.left, to = v.right) {
  const y = TRACK_Y;
  // ballast embankment
  c.fillStyle = css(mixRgb(BALLAST_BARE, BALLAST_SNOWY, v.cover));
  c.beginPath();
  c.moveTo(from, y + 4);
  c.lineTo(to, y + 4);
  c.lineTo(to, y + 26);
  c.lineTo(from, y + 26);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(0,0,0,0.12)';
  c.fillRect(from, y + 20, to - from, 6);
  // sleepers (their ends stick out under the rail)
  c.fillStyle = '#6d5040';
  const phase = ((v.distance - v.anchorX) % SLEEPER_SPACING + SLEEPER_SPACING) % SLEEPER_SPACING;
  c.beginPath();
  for (let x = from - phase; x < to; x += SLEEPER_SPACING) c.rect(x, y + 3, 14, 7);
  c.fill();
  // rail
  c.fillStyle = '#5f6b7a';
  c.fillRect(from, y - 3, to - from, 7);
  c.fillStyle = '#c9d3df';
  c.fillRect(from, y - 3, to - from, 2);
}

/**
 * Overhead line: masts and the sagging contact wire.
 * @param {CanvasRenderingContext2D} c
 * @param {TrackView} v
 * @param {(worldX: number) => boolean} [skip]  true where no mast should stand (tunnels)
 */
export function drawCatenary(c, v, skip) {
  const offset = v.distance - v.anchorX;
  const firstMast = Math.floor((offset + v.left - 40) / MAST_SPACING) * MAST_SPACING;
  const masts = [];
  for (let wx = firstMast; wx - offset < v.right + MAST_SPACING; wx += MAST_SPACING) masts.push(wx);

  c.fillStyle = '#6b7685';
  for (const wx of masts) {
    if (skip && skip(wx)) continue;
    const x = wx - offset;
    c.fillRect(x - 4, WIRE_Y - 40, 8, TRACK_Y - WIRE_Y + 34);
    c.fillRect(x - 4, WIRE_Y - 40, 30, 5);          // cantilever arm
    c.fillRect(x + 22, WIRE_Y - 40, 3, 30);          // dropper to the wire
  }
  // messenger wire and contact wire, sagging between masts
  c.strokeStyle = '#3d4654';
  c.lineWidth = 2;
  c.beginPath();
  for (let i = 0; i < masts.length - 1; i++) {
    const x0 = masts[i] - offset + 24;
    const x1 = masts[i + 1] - offset + 24;
    c.moveTo(x0, WIRE_Y - 36);
    c.quadraticCurveTo((x0 + x1) / 2, WIRE_Y - 6, x1, WIRE_Y - 36);
    c.moveTo(x0, WIRE_Y);
    c.lineTo(x1, WIRE_Y);
  }
  c.stroke();
}
