/**
 * @file Time-of-day lighting.
 *
 * A short list of keyframes describes how the world looks at a few moments
 * of the day (afternoon, sunset, dusk, night, dawn, sunrise, morning); the
 * light at any other moment is interpolated between them. The result drives
 * the sky gradient, the colour washes laid over the landscape, the stars,
 * the lit windows and the positions of the sun and the moon.
 *
 * Times are minutes since midnight of the first day (see clock.js). Every
 * journey picks one of the skies below, for the hours it crosses: the night
 * of Christmas (an afternoon, the whole night and the next morning), a
 * winter day (from sunrise to the late afternoon) or New Year's Eve (from
 * the morning to past midnight).
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

/** @type {LightKey[]} An afternoon, the night and the next morning. */
const NIGHT_KEYS = [
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

/**
 * @type {LightKey[]} A short winter day: the train leaves at sunrise (pink
 * light), the morning turns blue, the afternoon golden, and the journey ends
 * just before sunset, still in daylight.
 */
const DAY_KEYS = [
  { t: 6 * 60 + 40, top: '#1a2456', mid: '#7a4f8f', bottom: '#f2a07a', wash: '#503278', washAlpha: 0.33, night: 0.6 },
  { t: 7 * 60 + 50, top: '#5d7fc8', mid: '#f3b49a', bottom: '#ffd98a', wash: '#ff9a5a', washAlpha: 0.13, night: 0.04 },
  { t: 9 * 60 + 15, top: '#4a98e8', mid: '#9fd0f5', bottom: '#e6f5ff', wash: '#ffffff', washAlpha: 0, night: 0 },
  { t: 14 * 60, top: '#4f9be6', mid: '#8cc4f2', bottom: '#d8efff', wash: '#ffffff', washAlpha: 0, night: 0 },
  { t: 15 * 60, top: '#5a98df', mid: '#a5c8ee', bottom: '#ffe6bf', wash: '#ffbe78', washAlpha: 0.07, night: 0 },
  { t: 16 * 60 + 15, top: '#5577c4', mid: '#e8a88a', bottom: '#ffcf7a', wash: '#ff9a55', washAlpha: 0.13, night: 0.03 },
  { t: 16 * 60 + 55, top: '#25306e', mid: '#7b5a9e', bottom: '#f08a78', wash: '#46328a', washAlpha: 0.35, night: 0.6 },
];

/**
 * @type {LightKey[]} New Year's Eve in the mountains: a blue winter morning
 * and midday, a golden afternoon, the sunset, and then the whole night,
 * past midnight (the fireworks).
 */
const NEW_YEAR_KEYS = [
  { t: 7 * 60 + 50, top: '#5d7fc8', mid: '#f3b49a', bottom: '#ffd98a', wash: '#ff9a5a', washAlpha: 0.13, night: 0.04 },
  { t: 9 * 60, top: '#4a98e8', mid: '#9fd0f5', bottom: '#e6f5ff', wash: '#ffffff', washAlpha: 0, night: 0 },
  { t: 14 * 60, top: '#4f9be6', mid: '#8cc4f2', bottom: '#d8efff', wash: '#ffffff', washAlpha: 0, night: 0 },
  { t: 15 * 60 + 20, top: '#5a98df', mid: '#a5c8ee', bottom: '#ffe6bf', wash: '#ffbe78', washAlpha: 0.07, night: 0 },
  { t: 16 * 60 + 15, top: '#4b62b0', mid: '#ea8c7a', bottom: '#ffc46b', wash: '#ff8a4a', washAlpha: 0.17, night: 0.1 },
  { t: 16 * 60 + 55, top: '#25306e', mid: '#7b5a9e', bottom: '#f08a78', wash: '#46328a', washAlpha: 0.35, night: 0.6 },
  { t: 17 * 60 + 40, top: '#050b2c', mid: '#132a66', bottom: '#30508f', wash: '#0c1640', washAlpha: 0.55, night: 1 },
  { t: DAY + 2 * 60, top: '#050b2c', mid: '#132a66', bottom: '#30508f', wash: '#0c1640', washAlpha: 0.55, night: 1 },
];

/** @param {LightKey[]} keys */
const parse = keys => keys.map(k => ({
  ...k,
  topRgb: hexToRgb(k.top),
  midRgb: hexToRgb(k.mid),
  bottomRgb: hexToRgb(k.bottom),
  washRgb: hexToRgb(k.wash),
}));

/** Horizon line of the sun (stage units). */
const HORIZON = 640;

/** Sunset and sunrise of the Christmas night (minutes), used to place the sun on the horizon. */
const SUNSET = 16 * 60 + 40;
const SUNRISE = DAY + 7 * 60 + 55;

/**
 * Where the sun is on the Christmas night journey. The train travels
 * towards the right (east), so the sun sets on the left, behind the train,
 * and rises on the right, ahead of it.
 * @param {number} minutes
 * @returns {{x: number, y: number, alpha: number}}
 */
function nightSun(minutes) {
  if (minutes < DAY) {
    // afternoon: from high in the sky down to the horizon at sunset
    const k = clamp((SUNSET - minutes) / 240, -0.2, 1);   // 1 = four hours before sunset
    return { x: lerp(0.18, 0.42, k), y: HORIZON - 360 * Math.sin((k * Math.PI) / 2.2), alpha: k > -0.15 ? 1 : 0 };
  }
  // morning: from below the horizon up into the sky
  const k = clamp((minutes - SUNRISE) / 150, -0.2, 1);
  return { x: lerp(0.86, 0.66, Math.max(0, k)), y: HORIZON - 330 * Math.sin((Math.max(-0.1, k) * Math.PI) / 2.2), alpha: k > -0.15 ? 1 : 0 };
}

/** Sunrise and sunset of the winter day (a little earlier and later than on the calendar, so the
 *  journey starts with the sun just up and ends with it still above the mountains). */
const DAY_SUNRISE = 7 * 60 + 40;
const DAY_SUNSET = 16 * 60 + 35;

/**
 * Where the sun is on the winter day journey. The train travels towards the
 * right (west), so the sun rises on the left, behind the train, crosses the
 * sky low (it is winter) and sets on the right, ahead of it.
 * @param {number} minutes
 * @returns {{x: number, y: number, alpha: number}}
 */
function daySun(minutes) {
  const k = (minutes - DAY_SUNRISE) / (DAY_SUNSET - DAY_SUNRISE);
  const u = clamp(k, -0.05, 1.05);
  return { x: lerp(0.1, 0.9, u), y: HORIZON - 320 * Math.sin(clamp(u, 0, 1) * Math.PI), alpha: k > -0.04 && k < 1.04 ? 1 : 0 };
}

/** Sunset on New Year's Eve, in the mountains (the sun goes behind the ridges early). */
const NEW_YEAR_SUNSET = 16 * 60 + 25;

/**
 * Where the sun is on New Year's Eve: as on the winter day, but it sets a
 * little earlier, behind the mountains, and stays down all night.
 * @param {number} minutes
 * @returns {{x: number, y: number, alpha: number}}
 */
function newYearSun(minutes) {
  const k = (minutes - DAY_SUNRISE) / (NEW_YEAR_SUNSET - DAY_SUNRISE);
  const u = clamp(k, -0.05, 1.05);
  return { x: lerp(0.1, 0.9, u), y: HORIZON - 320 * Math.sin(clamp(u, 0, 1) * Math.PI), alpha: k > -0.04 && k < 1.04 ? 1 : 0 };
}

/**
 * @typedef {object} SkyPlan
 * @property {ReturnType<typeof parse>} keys
 * @property {(minutes: number) => {x: number, y: number, alpha: number}} sun
 */

/** @typedef {'night' | 'day' | 'newYear'} SkyId */

/** @type {Readonly<Record<SkyId, SkyPlan>>} */
const SKIES = Object.freeze({
  night: { keys: parse(NIGHT_KEYS), sun: nightSun },
  day: { keys: parse(DAY_KEYS), sun: daySun },
  newYear: { keys: parse(NEW_YEAR_KEYS), sun: newYearSun },
});

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
 * @param {SkyId} [sky='night']  the sky of the journey
 * @returns {Light}
 */
export function lightAt(minutes, sky = 'night') {
  const { keys, sun } = SKIES[sky];
  let i = 1;
  while (i < keys.length - 1 && keys[i].t < minutes) i++;
  const a = keys[i - 1];
  const b = keys[i];
  const t = smoothstep(0, 1, progress(a.t, b.t, minutes));
  const washRgb = mixRgb(a.washRgb, b.washRgb, t);
  const night = lerp(a.night, b.night, t);
  return {
    top: mixRgb(a.topRgb, b.topRgb, t),
    mid: mixRgb(a.midRgb, b.midRgb, t),
    bottom: mixRgb(a.bottomRgb, b.bottomRgb, t),
    wash: { color: css(washRgb), alpha: lerp(a.washAlpha, b.washAlpha, t), rgb: washRgb },
    washRgb,
    night,
    sun: sun(minutes),
    moon: { x: 0.8, y: 150, alpha: smoothstep(0.35, 0.9, night) },
  };
}
