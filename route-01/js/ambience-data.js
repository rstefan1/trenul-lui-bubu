/**
 * @file The sound of the places of the winter journey: what is heard under
 * the station missions (see shared/js/audio/ambience.js).
 *
 * A place with `carol` also lets a carol be heard from afar (muffled), as
 * from a Christmas fair, a square down the street or a monastery church;
 * the other places have no music, only their own sounds.
 *
 * The levels are relative to the running train (1 = just as loud): a place
 * is a soft background, never louder than the journey.
 */

import { CLOPOTEI, NOAPTE_DE_VIS, O_BRAD_FRUMOS } from '../../shared/js/audio/songs.js';

/**
 * @typedef {import('../../shared/js/audio/ambience.js').Place & {
 *   carol?: boolean,
 *   song?: import('../../shared/js/audio/songs.js').Song,
 * }} WinterPlace
 */

/**
 * Life around a monastery on Christmas morning: horse sleighs going by
 * almost all the time (each one crosses from one side to the other in
 * about 8 s, then a short pause).
 * @type {import('../../shared/js/audio/ambience.js').AmbienceEvent[]}
 */
const MONASTERY_LIFE = [
  { sound: 'sleigh', first: [0.5, 1.5], every: [9.5, 13], spread: 0 },
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
  /** Voroneț before sunrise: a light wind, sleighs going by, and carols from the church */
  monastery: {
    layers: [{ sound: 'winter-wind', level: 0.35 }],
    events: MONASTERY_LIFE,
    carol: true,
    song: NOAPTE_DE_VIS,
  },
  /** Putna on Christmas morning: the birds wake up; sleighs, and carols from the church */
  putna: {
    layers: [{ sound: 'winter-wind', level: 0.15 }],
    events: [...MONASTERY_LIFE, BIRDS],
    carol: true,
    song: O_BRAD_FRUMOS,
  },
};

/**
 * The landscape heard on the way, softly under the train: what it passes by
 * now and then (crows over the fields, an owl in the night forest, a twig
 * snapping) and, along a river, its water. No church bells: the only bell
 * of the journey is the one the child rings at Putna.
 *
 * Segments along a river (by index in the route): Arad → Deva (the Mureș),
 * Cluj-Napoca → Dej (the Someș), Câmpulung → Gura Humorului (the Moldova).
 */
const RIVER_SEGMENTS = new Set([1, 4, 9]);
/** @type {import('../../shared/js/audio/ambience.js').AmbienceLayer} */
const RIVER = { sound: 'river', level: 0.45 };

/**
 * What can be heard in each kind of landscape, by day and by night.
 * @type {Record<string, {day: import('../../shared/js/audio/ambience.js').AmbienceEvent[], night: import('../../shared/js/audio/ambience.js').AmbienceEvent[]}>}
 */
const TRAVEL_EVENTS = {
  city: { day: [], night: [] },
  plain: {
    day: [{ sound: 'crow', first: [4, 9], every: [14, 28], spread: 0.8 }],
    night: [],
  },
  hills: {
    day: [{ sound: 'crow', first: [6, 12], every: [18, 32], spread: 0.8 }],
    night: [{ sound: 'owl', first: [8, 16], every: [25, 45], spread: 0.8 }],
  },
  forest: {
    day: [{ sound: 'twig', first: [5, 10], every: [9, 18], spread: 0.8 }, { sound: 'crow', first: [10, 18], every: [25, 40], spread: 0.8 }],
    night: [{ sound: 'owl', first: [4, 9], every: [14, 26], spread: 0.8 }, { sound: 'twig', first: [6, 12], every: [10, 20], spread: 0.8 }],
  },
};

/** @type {Map<string, import('../../shared/js/audio/ambience.js').Place>} the same place object for the same key */
const travelCache = new Map();

/**
 * The sound of the landscape the train is going through.
 * @param {number} segment  index of the segment of the route
 * @param {string} biome
 * @param {boolean} night
 * @returns {import('../../shared/js/audio/ambience.js').Place | null}
 */
export function travelPlace(segment, biome, night) {
  const events = TRAVEL_EVENTS[biome];
  if (!events) return null;
  const river = RIVER_SEGMENTS.has(segment);
  const key = `${biome}|${night ? 'n' : 'd'}|${river ? 'r' : ''}`;
  let place = travelCache.get(key);
  if (!place) {
    place = { layers: river ? [RIVER] : [], events: night ? events.night : events.day };
    travelCache.set(key, place);
  }
  return place;
}
