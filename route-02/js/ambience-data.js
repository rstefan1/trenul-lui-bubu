/**
 * @file The sound of the places of the freight journey: what is heard under
 * the station missions and along the way (see shared/js/audio/ambience.js).
 *
 * The levels are relative to the running train (1 = just as loud): a place
 * is a soft background, never louder than the journey. It is a day journey:
 * birds and crows, no owls.
 */

/** @typedef {import('../../shared/js/audio/ambience.js').Place} FreightPlace */

/** @type {Record<string, FreightPlace>} */
export const FREIGHT_PLACES = {
  /** a station platform: people, footsteps, announcements far away */
  station: { layers: [{ sound: 'station-platform', level: 0.8 }, { sound: 'station-crowd', level: 0.4 }] },
  /** a railway yard: freight trains shunting */
  yard: { layers: [{ sound: 'freight-train', level: 0.7 }] },
  /** Putna at sunrise: a light wind, the birds waking up and a sleigh going by now and then */
  putna: {
    layers: [{ sound: 'winter-wind', level: 0.15 }],
    events: [
      { sound: 'birdsong', first: [1, 3], every: [1.5, 5], spread: 0.8 },
      { sound: 'sleigh', first: [4, 8], every: [16, 24], spread: 0 },
    ],
  },
  /** a woodworker's workshop in a quiet small town */
  workshop: { layers: [{ sound: 'town-square', level: 0.5 }] },
  /** a quiet village in Maramureș */
  village: { layers: [{ sound: 'town-square', level: 0.4 }, { sound: 'winter-wind', level: 0.2 }] },
  /** the station of Vișeu, full of children from the camp */
  camp: { layers: [{ sound: 'station-platform', level: 0.6 }, { sound: 'station-crowd', level: 0.7 }] },
  /** the forest in the mountains */
  forest: { layers: [{ sound: 'winter-wind', level: 0.8 }] },
};

/**
 * Segments along a river (by index in the route): Suceava Nord → Câmpulung
 * (the Moldova), Ilva Mică → Salva (the Someș), Săcel → Vișeu de Jos (the Vișeu).
 */
const RIVER_SEGMENTS = new Set([1, 4, 6]);
/** @type {import('../../shared/js/audio/ambience.js').AmbienceLayer} */
const RIVER = { sound: 'river', level: 0.45 };

/** @type {Record<string, import('../../shared/js/audio/ambience.js').AmbienceEvent[]>} what is heard in each landscape by day */
const TRAVEL_EVENTS = {
  city: [],
  plain: [{ sound: 'crow', first: [4, 9], every: [14, 28], spread: 0.8 }],
  hills: [{ sound: 'crow', first: [6, 12], every: [18, 32], spread: 0.8 }],
  forest: [{ sound: 'twig', first: [5, 10], every: [9, 18], spread: 0.8 }, { sound: 'crow', first: [10, 18], every: [25, 40], spread: 0.8 }],
};

/** @type {Map<string, FreightPlace>} the same place object for the same key */
const travelCache = new Map();

/**
 * The sound of the landscape the train is going through.
 * @param {number} segment  index of the segment of the route
 * @param {string} biome
 * @returns {FreightPlace | null}
 */
export function travelPlace(segment, biome) {
  const events = TRAVEL_EVENTS[biome];
  if (!events) return null;
  const river = RIVER_SEGMENTS.has(segment);
  const key = `${biome}|${river ? 'r' : ''}`;
  let place = travelCache.get(key);
  if (!place) {
    place = { layers: river ? [RIVER] : [], events };
    travelCache.set(key, place);
  }
  return place;
}
