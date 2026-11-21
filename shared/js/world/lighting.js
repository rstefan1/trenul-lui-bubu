/**
 * @file Time-of-day lighting.
 *
 * A short list of keyframes describes how the world looks at a few moments
 * of the day (afternoon, sunset, dusk, night, dawn, sunrise, morning); the
 * light at any other moment is interpolated between them. The result drives
 * the sky gradient, the colour washes laid over the landscape, the stars,
 * the lit windows and the positions of the sun and the moon.
 *
 * Times are minutes since midnight of the first day (see clock.js), so the
 * same table works for any journey that crosses the same hours.
 */

import { hexToRgb, mixRgb, css } from '../gfx/color.js';
import { clamp, lerp, progress, smoothstep } from '../core/math.js';
import { DAY } from './clock.js';

/**
 * @typedef {object} LightKey
 * @property {number} t        minutes since midnight of the first day
 * @property {string} top      sky colour at the zenith
 * @property {string} mid      sky colour half-way down
 * @property {string} bottom   sky colour at the horizon
 * @property {string} wash     colour laid over the landscape
 * @property {number} washAlpha
 * @property {number} night    0 = day … 1 = full night (stars, lit windows)
 */

/** @type {LightKey[]} */
const KEYS = [
  { t: 13 * 60, top: '#4f9be6', mid: '#8cc4f2', bottom: '#d8efff', wash: '#ffffff', washAlpha: 0, night: 0 },
  { t: 15 * 60 + 30, top: '#5a98df', mid: '#a5c8ee', bottom: '#ffe6bf', wash: '#ffbe78', washAlpha: 0.07, night: 0 },
  { t: 16 * 60 + 25, top: '#4b62b0', mid: '#ea8c7a', bottom: '#ffc46b', wash: '#ff8a4a', washAlpha: 0.17, night: 0.1 },
  { t: 17 * 60 + 5, top: '#25306e', mid: '#7b5a9e', bottom: '#f08a78', wash: '#46328a', washAlpha: 0.35, night: 0.6 },
  { t: 17 * 60 + 50, top: '#050b2c', mid: '#132a66', bottom: '#30508f', wash: '#0c1640', washAlpha: 0.55, night: 1 },
  { t: DAY + 6 * 60 + 40, top: '#050b2c', mid: '#132a66', bottom: '#30508f', wash: '#0c1640', washAlpha: 0.55, night: 1 },
  { t: DAY + 7 * 60 + 25, top: '#1a2456', mid: '#7a4f8f', bottom: '#f2a07a', wash: '#503278', washAlpha: 0.33, night: 0.6 },
  { t: DAY + 7 * 60 + 58, top: '#5d7fc8', mid: '#f3b49a', bottom: '#ffd98a', wash: '#ff9a5a', washAlpha: 0.14, night: 0.08 },
  { t: DAY + 9 * 60, top: '#4a98e8', mid: '#9fd0f5', bottom: '#e6f5ff', wash: '#ffffff', washAlpha: 0, night: 0 },
];

const PARSED = KEYS.map(k => ({
  ...k,
  topRgb: hexToRgb(k.top),
  midRgb: hexToRgb(k.mid),
  bottomRgb: hexToRgb(k.bottom),
  washRgb: hexToRgb(k.wash),
}));

/** Sunset and sunrise (minutes), used to place the sun on the horizon. */
const SUNSET = 16 * 60 + 40;
const SUNRISE = DAY + 7 * 60 + 55;

/**
 * @typedef {object} Light
 * @property {import('../gfx/color.js').Rgb} top
 * @property {import('../gfx/color.js').Rgb} mid
 * @property {import('../gfx/color.js').Rgb} bottom
 * @property {{color: string, alpha: number}} wash
 * @property {import('../gfx/color.js').Rgb} washRgb
 * @property {number} night       0..1
 * @property {{x: number, y: number, alpha: number}} sun   x as a fraction of the width
 * @property {{x: number, y: number, alpha: number}} moon  x as a fraction of the width
 */

/**
 * The light at a given moment.
 * @param {number} minutes  since midnight of the first day
 * @returns {Light}
 */
export function lightAt(minutes) {
  let i = 1;
  while (i < PARSED.length - 1 && PARSED[i].t < minutes) i++;
  const a = PARSED[i - 1];
  const b = PARSED[i];
  const t = smoothstep(0, 1, progress(a.t, b.t, minutes));
  const washRgb = mixRgb(a.washRgb, b.washRgb, t);
  const night = lerp(a.night, b.night, t);
  return {
    top: mixRgb(a.topRgb, b.topRgb, t),
    mid: mixRgb(a.midRgb, b.midRgb, t),
    bottom: mixRgb(a.bottomRgb, b.bottomRgb, t),
    wash: { color: css(washRgb), alpha: lerp(a.washAlpha, b.washAlpha, t) },
    washRgb,
    night,
    sun: sunAt(minutes),
    moon: { x: 0.8, y: 150, alpha: smoothstep(0.35, 0.9, night) },
  };
}

/**
 * Where the sun is. The train travels towards the right (east), so the sun
 * sets on the left, behind the train, and rises on the right, ahead of it.
 * @param {number} minutes
 * @returns {{x: number, y: number, alpha: number}}
 */
function sunAt(minutes) {
  const horizon = 640;
  if (minutes < DAY) {
    // afternoon: from high in the sky down to the horizon at sunset
    const k = clamp((SUNSET - minutes) / 240, -0.2, 1);   // 1 = four hours before sunset
    return { x: lerp(0.18, 0.42, k), y: horizon - 360 * Math.sin((k * Math.PI) / 2.2), alpha: k > -0.15 ? 1 : 0 };
  }
  // morning: from below the horizon up into the sky
  const k = clamp((minutes - SUNRISE) / 150, -0.2, 1);
  return { x: lerp(0.86, 0.66, Math.max(0, k)), y: horizon - 330 * Math.sin((Math.max(-0.1, k) * Math.PI) / 2.2), alpha: k > -0.15 ? 1 : 0 };
}
