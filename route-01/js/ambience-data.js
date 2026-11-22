/**
 * @file The sound of the places of the winter journey: what is heard under
 * the station missions (see shared/js/audio/ambience.js).
 *
 * A place with `carol` also lets a carol be heard from afar (muffled), as
 * from a Christmas fair or a square down the street; the other places have
 * no music, only their own sounds.
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
  station: { layers: [{ sound: 'station-platform', level: 0.3 }, { sound: 'station-crowd', level: 0.1 }] },
  /** a town square on Christmas Eve, with a carol coming from the Christmas market */
  town: { layers: [{ sound: 'town-square', level: 0.3 }], carol: true },
  /** a quiet small town (no market) */
  street: { layers: [{ sound: 'town-square', level: 0.22 }] },
  /** the enchanted Christmas fair: a happy crowd and "Clopoței" from the stalls */
  fair: { layers: [{ sound: 'station-crowd', level: 0.3 }], carol: true, song: CLOPOTEI },
  /** a fortress at night: the wind on the walls */
  fortress: { layers: [{ sound: 'winter-wind', level: 0.3 }] },
  /** a railway yard at night: a freight train shunting far away, the wind */
  yard: { layers: [{ sound: 'freight-train', level: 0.16 }, { sound: 'winter-wind', level: 0.12 }] },
  /** the forest in the mountains */
  forest: { layers: [{ sound: 'winter-wind', level: 0.25 }] },
  /** a monastery in the hills: almost silent, a light wind */
  monastery: { layers: [{ sound: 'winter-wind', level: 0.1 }] },
};
