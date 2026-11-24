/**
 * @file The children of the winter camp, drawn in their winter clothes: a
 * knitted hat with a pompom, a scarf, a puffy coat, mittens and boots.
 *
 * Every child has a look (the colours of the hat, the coat and the scarf,
 * the hair and the skin), so the same child is recognised everywhere: at
 * the window of a coach, playing in the snow, around the campfire. Drawn
 * with a few simple shapes, so many of them cost nothing.
 */

import { fillCircle, fillRoundRect } from './shapes.js';

/**
 * @typedef {object} ChildLook
 * @property {string} skin
 * @property {string} hair
 * @property {string} hat
 * @property {string} pompom
 * @property {string} coat
 * @property {string} scarf
 * @property {boolean} [braids]  two little braids under the hat
 */

/** @type {ReadonlyArray<ChildLook>} the looks of the children, by index */
export const CHILD_LOOKS = Object.freeze([
  { skin: '#f6d2b4', hair: '#6b3e1f', hat: '#e53935', pompom: '#ffffff', coat: '#1e88e5', scarf: '#ffd54f', braids: true },
  { skin: '#f1c7a3', hair: '#2b1d14', hat: '#43a047', pompom: '#ffeb3b', coat: '#ef6c00', scarf: '#e53935' },
  { skin: '#e0ac84', hair: '#1d1d24', hat: '#7e57c2', pompom: '#ff80ab', coat: '#c2185b', scarf: '#80deea' },
  { skin: '#f8dcc4', hair: '#d9a441', hat: '#00897b', pompom: '#ffffff', coat: '#fdd835', scarf: '#1e88e5', braids: true },
  { skin: '#c68a5e', hair: '#241812', hat: '#1565c0', pompom: '#ff7043', coat: '#e53935', scarf: '#ffffff' },
  { skin: '#f3cfae', hair: '#8d4a24', hat: '#ff8f00', pompom: '#6d4c41', coat: '#2e7d32', scarf: '#ff80ab' },
]);

/**
 * @typedef {object} ChildPose
 * @property {boolean} [full=false]  the whole child, with legs and boots (else head and shoulders)
 * @property {number} [wave=0]       0..1, how high one arm is raised (waving, cheering)
 * @property {boolean} [shiver=false] cold: arms hugging the body, a little shake
 * @property {number} [face=1]       1 = looking right, −1 = looking left
 */

/**
 * Draws a child. (x, y) is the middle of the head; `s` is the size of the
 * head (the whole child is about 2.6 s tall).
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} s
 * @param {ChildLook} look
 * @param {ChildPose} [pose]
 */
export function drawChild(c, x, y, s, look, pose = {}) {
  const r = s * 0.5;
  const face = pose.face ?? 1;
  c.save();
  c.translate(x, y);
  if (pose.shiver) c.translate(Math.sin(performance.now() / 30) * s * 0.02, 0);

  // the legs and boots (only when the whole child is seen)
  if (pose.full) {
    c.fillStyle = '#2b3a55';
    c.fillRect(-r * 0.62, s * 1.55, r * 0.5, s * 0.55);
    c.fillRect(r * 0.12, s * 1.55, r * 0.5, s * 0.55);
    fillRoundRect(c, -r * 0.7, s * 1.98, r * 0.66, s * 0.22, s * 0.08, '#3e2723');
    fillRoundRect(c, r * 0.06, s * 1.98, r * 0.66, s * 0.22, s * 0.08, '#3e2723');
  }

  // the puffy coat, with a zip and two quilted lines
  const coatH = pose.full ? s * 1.2 : s * 1.4;
  fillRoundRect(c, -r * 1.25, r * 0.7, r * 2.5, coatH, r * 0.6, look.coat);
  c.fillStyle = 'rgba(0,0,0,0.14)';
  c.fillRect(-r * 1.1, r * 1.35, r * 2.2, s * 0.05);
  c.fillRect(-r * 1.1, r * 1.85, r * 2.2, s * 0.05);
  c.fillStyle = 'rgba(255,255,255,0.55)';
  c.fillRect(-s * 0.02, r * 0.8, s * 0.04, coatH - r * 0.2);

  // the arms with their mittens: hugging the body when cold, or one waving
  const mitten = look.scarf;
  if (pose.shiver) {
    fillRoundRect(c, -r * 1.0, r * 1.25, r * 2.0, r * 0.45, r * 0.22, look.coat);
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.fillRect(-r * 1.0, r * 1.45, r * 2.0, r * 0.06);
    c.fillStyle = mitten;
    fillCircle(c, -r * 0.95, r * 1.47, r * 0.24);
    fillCircle(c, r * 0.95, r * 1.47, r * 0.24);
  } else {
    const w = pose.wave ?? 0;
    // the arm that waves (on the side the child looks to)
    const ax = face * r * 1.15;
    const hx = ax + face * r * (0.5 - w * 0.2);
    const hy = r * 1.9 - w * r * 2.6;
    c.strokeStyle = look.coat;
    c.lineWidth = r * 0.5;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(ax, r * 1.1);
    c.lineTo(hx, hy);
    c.moveTo(-ax, r * 1.1);
    c.lineTo(-ax - face * r * 0.3, r * 2.0);
    c.stroke();
    c.fillStyle = mitten;
    fillCircle(c, hx, hy, r * 0.27);
    fillCircle(c, -ax - face * r * 0.3, r * 2.0, r * 0.27);
  }

  // the scarf, with its end hanging on one side
  fillRoundRect(c, -r * 0.95, r * 0.62, r * 1.9, r * 0.42, r * 0.2, look.scarf);
  fillRoundRect(c, face * r * 0.25, r * 0.8, r * 0.38, r * 0.85, r * 0.14, look.scarf);
  c.fillStyle = 'rgba(255,255,255,0.35)';
  c.fillRect(face * r * 0.25, r * 1.3, r * 0.38, r * 0.08);

  // the head
  c.fillStyle = look.skin;
  fillCircle(c, 0, 0, r);
  // hair peeking from under the hat (and two little braids)
  c.fillStyle = look.hair;
  c.beginPath();
  c.ellipse(-r * 0.78, -r * 0.05, r * 0.28, r * 0.42, 0.3, 0, Math.PI * 2);
  c.ellipse(r * 0.78, -r * 0.05, r * 0.28, r * 0.42, -0.3, 0, Math.PI * 2);
  c.fill();
  if (look.braids) {
    fillRoundRect(c, -r * 1.08, r * 0.1, r * 0.3, r * 0.75, r * 0.15, look.hair);
    fillRoundRect(c, r * 0.78, r * 0.1, r * 0.3, r * 0.75, r * 0.15, look.hair);
  }
  // the face: eyes, rosy cheeks (it is cold) and a smile
  const fx = face * r * 0.12;
  c.fillStyle = '#2b1d14';
  fillCircle(c, fx - r * 0.3, r * 0.08, r * 0.1);
  fillCircle(c, fx + r * 0.3, r * 0.08, r * 0.1);
  c.fillStyle = 'rgba(255,110,110,0.55)';
  fillCircle(c, fx - r * 0.52, r * 0.36, r * 0.16);
  fillCircle(c, fx + r * 0.52, r * 0.36, r * 0.16);
  c.strokeStyle = '#8d3b2a';
  c.lineWidth = Math.max(1.2, r * 0.09);
  c.lineCap = 'round';
  c.beginPath();
  if (pose.shiver) {
    // teeth chattering: a small wavy mouth
    c.moveTo(fx - r * 0.2, r * 0.42);
    c.lineTo(fx - r * 0.07, r * 0.36);
    c.lineTo(fx + r * 0.07, r * 0.44);
    c.lineTo(fx + r * 0.2, r * 0.38);
  } else {
    c.arc(fx, r * 0.28, r * 0.22, 0.2 * Math.PI, 0.8 * Math.PI);
  }
  c.stroke();

  // the knitted hat: a dome with a folded brim, stripes and the pompom
  c.fillStyle = look.hat;
  c.beginPath();
  c.ellipse(0, -r * 0.28, r * 1.02, r * 0.95, 0, Math.PI, Math.PI * 2);
  c.fill();
  fillRoundRect(c, -r * 1.08, -r * 0.42, r * 2.16, r * 0.4, r * 0.18, look.hat);
  c.fillStyle = 'rgba(0,0,0,0.16)';
  c.fillRect(-r * 1.08, -r * 0.3, r * 2.16, r * 0.06);
  c.fillStyle = 'rgba(255,255,255,0.3)';
  c.fillRect(-r * 0.7, -r * 0.82, r * 1.4, r * 0.08);
  c.fillStyle = look.pompom;
  fillCircle(c, 0, -r * 1.28, r * 0.3);
  c.restore();
}
