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
  /** a fortress at night: the wind on the walls */
  fortress: { layers: [{ sound: 'winter-wind', level: 0.8 }] },
  /** a railway yard at night: a freight train shunting far away, the wind */
  yard: { layers: [{ sound: 'freight-train', level: 0.7 }, { sound: 'winter-wind', level: 0.4 }] },
  /** the forest in the mountains */
  forest: { layers: [{ sound: 'winter-wind', level: 0.8 }] },
  /** a monastery in the hills: almost silent, a light wind */
  monastery: { layers: [{ sound: 'winter-wind', level: 0.35 }] },
};
