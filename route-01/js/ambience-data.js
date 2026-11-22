/**
 * @file The sound of the places of the winter journey: what is heard under
 * the station missions (see shared/js/audio/ambience.js).
 *
 * A place with `carol` also lets a carol be heard from afar (muffled), as
 * from a Christmas fair or a square down the street; the other places have
 * no music, only their own sounds.
 *
 * The levels are relative to the running train (1 = just as loud): a place
 * is a soft background, never louder than the journey.
 */

import { CLOPOTEI } from '../../shared/js/audio/songs.js';

/**
 * @typedef {import('../../shared/js/audio/ambience.js').Place & {
 *   carol?: boolean,
 *   song?: import('../../shared/js/audio/songs.js').Song,
 * }} WinterPlace
 */

/**
 * Life around a monastery on Christmas morning: horse sleighs going by
 * almost all the time (each one crosses from one side to the other in
 * about 8 s, then a short pause), and little bells ringing every few
 * seconds.
 * @type {import('../../shared/js/audio/ambience.js').AmbienceEvent[]}
 */
const MONASTERY_LIFE = [
  { sound: 'sleigh', first: [0.5, 1.5], every: [9.5, 13], spread: 0 },
  { sound: 'littleBells', first: [3, 4], every: [4, 6], spread: 0.7 },
];
/** @type {import('../../shared/js/audio/ambience.js').AmbienceEvent} the birds of the morning (Putna) */
const BIRDS = { sound: 'birdsong', first: [1, 3], every: [1.5, 5], spread: 0.8 };

/** @type {Record<string, WinterPlace>} */
export const WINTER_PLACES = {
  /** a station platform: people, footsteps, announcements far away */
  station: { layers: [{ sound: 'station-platform', level: 0.8 }, { sound: 'station-crowd', level: 0.4 }] },
  /** a town square on Christmas Eve, with a carol coming from the Christmas market */
  town: { layers: [{ sound: 'town-square', level: 0.85 }], carol: true },
  /** a quiet small town (no market) */
  street: { layers: [{ sound: 'town-square', level: 0.6 }] },
  /** the enchanted Christmas fair: people around the stalls and "Clopoței" from afar */
  fair: { layers: [{ sound: 'town-square', level: 0.9 }], carol: true, song: CLOPOTEI },
  /** a fortress high on a hill at night (Deva): the wind blows hard on the walls */
  hilltop: { layers: [{ sound: 'winter-wind', level: 0.8 }] },
  /** a fortress in the town (Alba Carolina): only a light wind, the snow falls quietly */
  fortress: { layers: [{ sound: 'winter-wind', level: 0.5 }] },
  /** a railway yard at night: a freight train shunting far away, nothing else */
  yard: { layers: [{ sound: 'freight-train', level: 0.7 }] },
  /** the forest in the mountains */
  forest: { layers: [{ sound: 'winter-wind', level: 0.8 }] },
  /** Voroneț before sunrise: a light wind, sleighs going by, little bells */
  monastery: {
    layers: [{ sound: 'winter-wind', level: 0.35 }],
    events: MONASTERY_LIFE,
  },
  /** Putna on Christmas morning: the birds wake up; sleighs and little bells */
  putna: {
    layers: [{ sound: 'winter-wind', level: 0.15 }],
    events: [...MONASTERY_LIFE, BIRDS],
  },
};
