/**
 * @file The sound of the places of the New Year's Eve journey: what is
 * heard under the station missions and along the way (see
 * shared/js/audio/ambience.js).
 *
 * The levels are relative to the running train (1 = just as loud): a place
 * is a soft background, never louder than the journey. The whole line runs
 * beside the Vaser, so the river is heard all the way.
 */

/** @typedef {import('../../shared/js/audio/ambience.js').Place} ForestPlace */

/** @type {import('../../shared/js/audio/ambience.js').AmbienceLayer} */
const RIVER = { sound: 'river', level: 0.45 };

/** @type {Record<string, ForestPlace>} */
export const FOREST_PLACES = {
  /** the forest railway station of Vișeu de Sus: people on the platform, the children */
  station: { layers: [{ sound: 'station-platform', level: 0.6 }, { sound: 'station-crowd', level: 0.6 }] },
  /** a small station in the forest, by the river */
  forest: {
    layers: [{ sound: 'winter-wind', level: 0.5 }, RIVER],
    events: [{ sound: 'crow', first: [4, 9], every: [18, 30], spread: 0.8 }, { sound: 'twig', first: [6, 12], every: [10, 20], spread: 0.8 }],
  },
};

/** @type {Record<string, import('../../shared/js/audio/ambience.js').AmbienceEvent[]>} what is heard in each landscape by day */
const TRAVEL_EVENTS = {
  city: [],
  plain: [{ sound: 'crow', first: [4, 9], every: [14, 28], spread: 0.8 }],
  hills: [{ sound: 'crow', first: [6, 12], every: [18, 32], spread: 0.8 }],
  forest: [{ sound: 'twig', first: [5, 10], every: [9, 18], spread: 0.8 }, { sound: 'crow', first: [10, 18], every: [25, 40], spread: 0.8 }],
};

/** @type {Map<string, ForestPlace>} the same place object for the same landscape */
const travelCache = new Map();

/**
 * The sound of the landscape the train is going through (always beside the river).
 * @param {string} biome
 * @returns {ForestPlace | null}
 */
export function travelPlace(biome) {
  const events = TRAVEL_EVENTS[biome];
  if (!events) return null;
  let place = travelCache.get(biome);
  if (!place) {
    place = { layers: [RIVER], events };
    travelCache.set(biome, place);
  }
  return place;
}
