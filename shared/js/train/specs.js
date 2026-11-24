/**
 * @file Train compositions.
 *
 * A train is a list of cars from the front to the back. Each car has a
 * kind (which painter draws it), a length and a colour scheme. Exactly one
 * car carries Bubu, at one of its windows.
 *
 * Coordinates of a car: x from 0 (rear end) to `length` (front end),
 * y = 0 on the rail top, negative upwards.
 */

/**
 * @typedef {object} CarColors
 * @property {string} body     main colour
 * @property {string} band     window band / stripe colour
 * @property {string} roof
 * @property {string} [accent] small details (stripes, emblems)
 */

/**
 * @typedef {object} CarSpec
 * @property {'electricLoco' | 'dieselLoco' | 'steamLoco' | 'coach' | 'forestCoach' | 'railcarFront' | 'railcarRear' | 'flatcar' | 'platform'} kind
 * @property {number} length
 * @property {CarColors} colors
 * @property {number} [bubuWindow]  index of the window where Bubu sits (from the front)
 * @property {number | string} [number]  car number painted on the side (passenger coaches, wagons)
 * @property {string} [cargo]     the load of a flat wagon (a key of LOADS in gfx/cargo.js)
 * @property {boolean} [helper]   a second locomotive, pulling right behind the first
 * @property {boolean} [plain]    without Bubu's ladybug emblem (a locomotive of another train)
 */

/**
 * @typedef {object} TrainSpec
 * @property {string} id
 * @property {boolean} electric   has a pantograph (needs an overhead line)
 * @property {number} gap         space between cars
 * @property {number} [front]     where its front stands, as a share of the screen's width (short
 *                                trains stand further left, so what comes is seen early)
 * @property {CarSpec[]} cars     front to back
 */

const COACH = { body: '#2f5fa8', band: '#f6ecd6', roof: '#7d8796', accent: '#e0b84a' };

/** The long-distance night train from Timișoara to Suceava. */
export const NIGHT_TRAIN = Object.freeze({
  id: 'night',
  electric: true,
  gap: 12,
  cars: [
    { kind: 'electricLoco', length: 290, colors: { body: '#d8382f', band: '#fbeed2', roof: '#7d8796', accent: '#ffd23f' } },
    // coaches are numbered from the back of the train, as often happens
    { kind: 'coach', length: 340, colors: COACH, bubuWindow: 0, number: 3 },
    { kind: 'coach', length: 340, colors: COACH, number: 2 },
    { kind: 'coach', length: 340, colors: COACH, number: 1 },
  ],
});

/** The small regional train from Suceava to Putna (diesel railcar). */
export const REGIONAL_TRAIN = Object.freeze({
  id: 'regional',
  electric: false,
  gap: 6,
  front: 0.6,
  cars: [
    { kind: 'railcarFront', length: 330, colors: { body: '#f4f6f8', band: '#2e9d57', roof: '#9aa4b1', accent: '#e53935' }, bubuWindow: 0 },
    { kind: 'railcarRear', length: 330, colors: { body: '#f4f6f8', band: '#2e9d57', roof: '#9aa4b1', accent: '#e53935' } },
  ],
});

/** The flat wagon that carries the Christmas tree bought in Vatra Dornei (behind the locomotive). */
export const TREE_WAGON = Object.freeze({ kind: 'flatcar', length: 250, colors: { body: '#6d4c41', band: '#8d6e63', roof: '#5d4037' } });

const PLATFORM = { body: '#4a5160', band: '#8d6e63', roof: '#3b4250' };

/**
 * The freight train from Putna to Vișeu de Jos: a diesel locomotive (Bubu
 * drives it, from the front cab) and four empty flat wagons.
 */
export const FREIGHT_TRAIN = Object.freeze({
  id: 'freight',
  electric: false,
  gap: 10,
  cars: [
    { kind: 'dieselLoco', length: 320, colors: { body: '#e0662c', band: '#fbeed2', roof: '#7d8796', accent: '#ffd23f' } },
    { kind: 'platform', length: 250, colors: PLATFORM, number: '1' },
    { kind: 'platform', length: 250, colors: PLATFORM, number: '2' },
    { kind: 'platform', length: 250, colors: PLATFORM, number: '3' },
    { kind: 'platform', length: 250, colors: PLATFORM, number: '4' },
  ],
});

const FOREST_COACH = { body: '#2e7d46', band: '#f1e3b8', roof: '#4a5160' };

/**
 * The forest railway of Vișeu de Sus (the mocănița): a small black steam
 * locomotive burning wood, without a tender (the wood sits in a box by the
 * cab), and three green coaches with the children at the windows.
 */
export const FOREST_TRAIN = Object.freeze({
  id: 'forest',
  electric: false,
  gap: 10,
  cars: [
    { kind: 'steamLoco', length: 250, colors: { body: '#23252b', band: '#c62828', roof: '#16171b', accent: '#d9a640' } },
    { kind: 'forestCoach', length: 240, colors: FOREST_COACH, number: 1 },
    { kind: 'forestCoach', length: 240, colors: FOREST_COACH, number: 2 },
    { kind: 'forestCoach', length: 240, colors: FOREST_COACH, number: 3 },
  ],
});

/** @type {Readonly<Record<string, TrainSpec>>} */
export const TRAINS = Object.freeze({ night: NIGHT_TRAIN, regional: REGIONAL_TRAIN, freight: FREIGHT_TRAIN, forest: FOREST_TRAIN });
