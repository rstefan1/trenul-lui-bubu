/**
 * @file Pictures of real places along the route, used by station missions
 * (puzzles, "spot the difference", …).
 *
 * Every picture is drawn in code on a square of {@link PICTURE_SIZE} units,
 * in the same flat, friendly style as the rest of the game. The drawings
 * are simplified on purpose: they show what makes the place recognisable,
 * not an architectural survey.
 */

import { TAU } from '../core/math.js';
import { drawBauble } from './ornaments.js';
import { drawFir, fillCircle, fillRoundRect, glow } from './shapes.js';

/** Side of a picture, in drawing units. */
export const PICTURE_SIZE = 600;

/**
 * Arad: the Administrative Palace (the city hall), with its tall clock
 * tower in the middle, on a golden winter afternoon before Christmas. There
 * is no snow yet in Arad, as in the rest of the journey's beginning.
 * @param {CanvasRenderingContext2D} c
 */
function aradCityHall(c) {
  const S = PICTURE_SIZE;
  const ground = 500;

  // sky, sun, clouds and birds (they also help to see which way is up)
  const sky = c.createLinearGradient(0, 0, 0, ground);
  sky.addColorStop(0, '#6fa4e0');
  sky.addColorStop(0.6, '#b9cfea');
  sky.addColorStop(1, '#ffd9a8');
  c.fillStyle = sky;
  c.fillRect(0, 0, S, S);
  // the sun is cut by the top-right corner and its rays point down-left,
  // so its tile can only be turned one way (a whole round sun looks the same
  // in every position)
  glow(c, S, 0, 190, 'rgba(255,236,170,0.75)', 'rgba(255,236,170,0)');
  c.strokeStyle = '#ffd54f';
  c.lineWidth = 9;
  c.lineCap = 'round';
  c.beginPath();
  for (let i = 0; i < 5; i++) {
    const a = Math.PI / 2 + (i + 0.5) * (Math.PI / 2 / 5);   // between down and left
    c.moveTo(S + Math.cos(a) * 92, Math.sin(a) * 92);
    c.lineTo(S + Math.cos(a) * 128, Math.sin(a) * 128);
  }
  c.stroke();
  c.fillStyle = '#ffe27a';
  fillCircle(c, S, 0, 76);
  c.fillStyle = 'rgba(255,255,255,0.9)';
  for (const [x, y, s] of [[95, 80, 1], [190, 130, 0.7], [420, 200, 0.6]]) {
    fillCircle(c, x, y, 26 * s);
    fillCircle(c, x + 28 * s, y - 10 * s, 30 * s);
    fillCircle(c, x + 60 * s, y, 24 * s);
    c.fillRect(x, y, 60 * s, 22 * s);
  }
  c.strokeStyle = '#3b4250';
  c.lineWidth = 3;
  c.lineCap = 'round';
  for (const [x, y] of [[70, 170], [100, 155], [470, 270]]) {
    c.beginPath();
    c.moveTo(x - 10, y);
    c.quadraticCurveTo(x - 5, y - 7, x, y);
    c.quadraticCurveTo(x + 5, y - 7, x + 10, y);
    c.stroke();
  }

  // houses far behind
  c.fillStyle = '#c7b9c9';
  for (const [x, w, h] of [[0, 70, 120], [500, 100, 110], [560, 60, 140]]) c.fillRect(x, ground - h, w, h);

  // the square in front
  c.fillStyle = '#d4c3a3';
  c.fillRect(0, ground, S, S - ground);
  c.strokeStyle = 'rgba(120,95,60,0.25)';
  c.lineWidth = 2;
  for (let y = ground + 18; y < S; y += 22) {
    c.beginPath();
    c.moveTo(0, y);
    c.lineTo(S, y);
    c.stroke();
  }

  const wall = '#f1d79a';
  const trim = '#fff6e0';
  const roof = '#a5513c';
  // wings
  c.fillStyle = wall;
  c.fillRect(40, 330, 520, ground - 330);
  c.fillStyle = trim;
  c.fillRect(34, 322, 532, 12);
  c.fillRect(40, 410, 520, 6);
  c.fillStyle = roof;
  c.fillRect(48, 304, 504, 18);
  // corner pavilions, a little taller
  for (const x of [40, 480]) {
    c.fillStyle = wall;
    c.fillRect(x, 300, 80, ground - 300);
    c.fillStyle = trim;
    c.fillRect(x - 6, 292, 92, 12);
    c.fillStyle = roof;
    c.beginPath();
    c.moveTo(x - 4, 292);
    c.lineTo(x + 40, 262);
    c.lineTo(x + 84, 292);
    c.closePath();
    c.fill();
  }
  // arched windows on two floors
  for (const row of [345, 428]) {
    for (let x = 58; x < 548; x += 38) {
      if (x > 240 && x < 350) continue;    // the tower
      archWindow(c, x, row, 20, 50);
    }
  }

  // central tower with the clock
  const tx = 255;
  const tw = 90;
  c.fillStyle = wall;
  c.fillRect(tx, 190, tw, ground - 190);
  c.fillStyle = 'rgba(0,0,0,0.06)';
  c.fillRect(tx + tw - 18, 190, 18, ground - 190);
  c.fillStyle = trim;
  c.fillRect(tx - 8, 282, tw + 16, 12);
  c.fillRect(tx - 6, 186, tw + 12, 10);
  // entrance
  c.fillStyle = '#7a4a32';
  c.beginPath();
  c.moveTo(tx + 25, ground);
  c.lineTo(tx + 25, 455);
  c.arc(tx + 45, 455, 20, Math.PI, 0);
  c.lineTo(tx + 65, ground);
  c.closePath();
  c.fill();
  for (const x of [tx + 12, tx + 72]) {
    c.fillStyle = trim;
    c.fillRect(x, 430, 7, 70);
  }
  archWindow(c, tx + 33, 345, 24, 56);
  // the clock, showing four o'clock
  const cy = 236;
  c.fillStyle = trim;
  fillCircle(c, tx + 45, cy, 34);
  c.fillStyle = '#ffffff';
  fillCircle(c, tx + 45, cy, 28);
  c.fillStyle = '#3b4250';
  for (let i = 0; i < 12; i++) {
    const a = (i * TAU) / 12;
    fillCircle(c, tx + 45 + Math.cos(a) * 22, cy + Math.sin(a) * 22, 2);
  }
  c.strokeStyle = '#1b2440';
  c.lineWidth = 4;
  c.beginPath();
  c.moveTo(tx + 45, cy);
  c.lineTo(tx + 45, cy - 22);                                  // minute hand on 12
  c.moveTo(tx + 45, cy);
  c.lineTo(tx + 45 + Math.cos(-TAU / 12) * 15, cy - Math.sin(-TAU / 12) * 15);   // hour hand on 4
  c.stroke();
  // lantern with arches and the copper roof
  c.fillStyle = wall;
  c.fillRect(tx + 12, 140, tw - 24, 48);
  c.fillStyle = '#7a4a32';
  for (const x of [tx + 20, tx + 39, tx + 58]) {
    c.beginPath();
    c.moveTo(x, 186);
    c.lineTo(x, 158);
    c.arc(x + 6, 158, 6, Math.PI, 0);
    c.lineTo(x + 12, 186);
    c.closePath();
    c.fill();
  }
  c.fillStyle = '#5f8f7f';
  c.beginPath();
  c.moveTo(tx + 6, 142);
  c.quadraticCurveTo(tx + 45, 112, tx + 45, 62);
  c.quadraticCurveTo(tx + 45, 112, tx + 84, 142);
  c.closePath();
  c.fill();
  c.fillStyle = '#e0b83a';
  c.fillRect(tx + 43, 38, 4, 26);
  fillCircle(c, tx + 45, 36, 6);

  // Christmas lights along the cornice
  const colors = ['#ffd54f', '#ff8a80', '#80d8ff', '#b9f6ca'];
  for (let x = 48, i = 0; x < 552; x += 18, i++) {
    c.fillStyle = colors[i % colors.length];
    fillCircle(c, x, 340 + Math.sin(i * 0.9) * 3, 4);
  }

  // the town's Christmas tree, decorated, with a star
  drawFir(c, 130, 585, 260, { color: '#2f7a52', shade: '#24633f' });
  const baubles = [[105, 470, '#e53935'], [150, 500, '#fbc02d'], [120, 530, '#1e88e5'], [165, 440, '#8e44ad'], [95, 545, '#fb8c00'], [140, 405, '#e53935']];
  for (const [x, y, col] of baubles) drawBauble(c, x, y, 9, col, false);
  c.fillStyle = '#ffd23f';
  c.beginPath();
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 9 : 22;
    c.lineTo(130 + Math.cos(a) * r, 330 + Math.sin(a) * r);
  }
  c.closePath();
  c.fill();

  // a bench and a lamp on the square, bottom right
  fillRoundRect(c, 420, 545, 110, 12, 4, '#7a5a40');
  c.fillStyle = '#5d4535';
  c.fillRect(428, 557, 8, 22);
  c.fillRect(514, 557, 8, 22);
  c.fillStyle = '#4a5568';
  c.fillRect(560, 440, 6, 150);
  c.fillStyle = '#fff3c4';
  fillRoundRect(c, 550, 428, 26, 18, 5, '#fff3c4');
}

/**
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y   top of the arch
 * @param {number} w
 * @param {number} h
 */
function archWindow(c, x, y, w, h) {
  c.fillStyle = '#fff6e0';
  c.beginPath();
  c.moveTo(x - 3, y + h + 3);
  c.lineTo(x - 3, y + w / 2);
  c.arc(x + w / 2, y + w / 2, w / 2 + 3, Math.PI, 0);
  c.lineTo(x + w + 3, y + h + 3);
  c.closePath();
  c.fill();
  c.fillStyle = '#6d8fb8';
  c.beginPath();
  c.moveTo(x, y + h);
  c.lineTo(x, y + w / 2);
  c.arc(x + w / 2, y + w / 2, w / 2, Math.PI, 0);
  c.lineTo(x + w, y + h);
  c.closePath();
  c.fill();
}

/** @type {Readonly<Record<string, (c: CanvasRenderingContext2D) => void>>} */
export const LANDMARKS = Object.freeze({
  'arad-city-hall': aradCityHall,
});
