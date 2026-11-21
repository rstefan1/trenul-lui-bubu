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
 * @property {'electricLoco' | 'coach' | 'railcarFront' | 'railcarRear'} kind
 * @property {number} length
 * @property {CarColors} colors
 * @property {number} [bubuWindow]  index of the window where Bubu sits (from the front)
 * @property {number} [number]      car number painted on the side (passenger coaches)
 */

/**
 * @typedef {object} TrainSpec
 * @property {string} id
 * @property {boolean} electric   has a pantograph (needs an overhead line)
 * @property {number} gap         space between cars
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
  cars: [
    { kind: 'railcarFront', length: 330, colors: { body: '#f4f6f8', band: '#2e9d57', roof: '#9aa4b1', accent: '#e53935' }, bubuWindow: 0 },
    { kind: 'railcarRear', length: 330, colors: { body: '#f4f6f8', band: '#2e9d57', roof: '#9aa4b1', accent: '#e53935' } },
  ],
});

/** @type {Readonly<Record<string, TrainSpec>>} */
export const TRAINS = Object.freeze({ night: NIGHT_TRAIN, regional: REGIONAL_TRAIN });
