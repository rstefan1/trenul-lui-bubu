/**
 * @file The sound of the places of the New Year's Eve journey: what is
 * heard under the station missions and along the way (see
 * shared/js/audio/ambience.js).
 *
 * The levels are relative to the running train (1 = just as loud): a place
 * is a soft background, never louder than the journey. The whole line runs
 * beside the Vaser, so the river is heard all the way, and the forest is
 * full of life: birds, a woodpecker, a jay, snow falling off the branches,
 * a fox far away; at night, an owl.
 */

/** @typedef {import('../../shared/js/audio/ambience.js').Place} ForestPlace */

/** @type {import('../../shared/js/audio/ambience.js').AmbienceLayer} */
const RIVER = { sound: 'river', level: 0.45 };

/**
 * What is heard in the forest by day, now and then: birds singing (great
 * tits, sparrows, robins, bullfinches), a woodpecker drumming, a jay, crows,
 * a twig snapping, snow sliding off a branch, a fox far away.
 * @type {import('../../shared/js/audio/ambience.js').AmbienceEvent[]}
 */
const FOREST_DAY = [
  { sound: 'birdsong', first: [1, 3], every: [3, 7], spread: 0.8 },
  { sound: 'bullfinch', first: [4, 8], every: [9, 16], spread: 0.8 },
  { sound: 'woodpecker', first: [5, 10], every: [12, 22], spread: 0.9 },
  { sound: 'jay', first: [8, 14], every: [18, 32], spread: 0.8 },
  { sound: 'snowPlop', first: [6, 12], every: [10, 20], spread: 0.9 },
  { sound: 'twig', first: [5, 10], every: [9, 18], spread: 0.8 },
  { sound: 'crow', first: [10, 18], every: [25, 40], spread: 0.8 },
  { sound: 'fox', first: [20, 35], every: [40, 70], spread: 0.9 },
];

/**
 * The forest at night: the birds are asleep; an owl, a fox, a twig, snow
 * falling off a branch.
 * @type {import('../../shared/js/audio/ambience.js').AmbienceEvent[]}
 */
const FOREST_NIGHT = [
  { sound: 'owl', first: [3, 6], every: [14, 24], spread: 0.8 },
  { sound: 'fox', first: [8, 14], every: [25, 45], spread: 0.9 },
  { sound: 'twig', first: [4, 9], every: [10, 20], spread: 0.8 },
  { sound: 'snowPlop', first: [6, 12], every: [12, 24], spread: 0.9 },
];

/** @type {Record<string, ForestPlace>} */
export const FOREST_PLACES = {
  /** the forest railway station of Vișeu de Sus: people on the platform, the children, birds in the town */
  station: {
    layers: [{ sound: 'station-platform', level: 0.6 }, { sound: 'station-crowd', level: 0.6 }],
    events: [{ sound: 'birdsong', first: [2, 5], every: [6, 12], spread: 0.8 }],
  },
  /** a small station in the forest, by the river, full of the sounds of the forest */
  forest: { layers: [{ sound: 'winter-wind', level: 0.4 }, RIVER], events: FOREST_DAY },
  /** the forest at night (Paltin, waiting for midnight) */
  night: { layers: [{ sound: 'winter-wind', level: 0.35 }, RIVER], events: FOREST_NIGHT },
};

/** @type {Record<string, import('../../shared/js/audio/ambience.js').AmbienceEvent[]>} what is heard in each landscape by day */
const TRAVEL_EVENTS = {
  city: [{ sound: 'birdsong', first: [2, 5], every: [6, 12], spread: 0.8 }],
  plain: [{ sound: 'crow', first: [4, 9], every: [14, 28], spread: 0.8 }, { sound: 'birdsong', first: [3, 6], every: [8, 14], spread: 0.8 }],
  hills: [
    { sound: 'crow', first: [6, 12], every: [18, 32], spread: 0.8 },
    { sound: 'birdsong', first: [2, 5], every: [6, 12], spread: 0.8 },
    { sound: 'bullfinch', first: [6, 10], every: [12, 20], spread: 0.8 },
  ],
  forest: FOREST_DAY,
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
