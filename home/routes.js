/**
 * @file The journeys of the game, as shown on the home page.
 *
 * Every journey lives in a folder of its own (route-01, route-02, …) and is
 * a complete game: its stations, landscapes, missions and saved progress.
 * Adding a journey means adding its folder and one entry here; the season
 * decides its picture and colours on the home page (and the home page can
 * show the journeys of one season only).
 */

/** @typedef {'winter' | 'spring' | 'summer' | 'autumn'} Season */

/**
 * @typedef {object} RouteInfo
 * @property {number} number
 * @property {string} path       folder of the journey (relative to the home page)
 * @property {string} title
 * @property {string} from       first station
 * @property {string} to         last station
 * @property {string} when       when the journey happens (in the story)
 * @property {string} blurb      one or two sentences for the children
 * @property {number} chapters
 * @property {number} stations
 * @property {string} saveKey    where the journey keeps its progress (localStorage)
 * @property {Season} season
 */

/** @type {RouteInfo[]} */
export const ROUTES = [
  {
    number: 1,
    path: 'route-01/',
    title: 'Drumul de Crăciun',
    from: 'Timișoara',
    to: 'Putna',
    when: '24–25 decembrie',
    blurb: 'În noaptea de Ajun, Bubu traversează țara cu trenul, prin Transilvania și munții Bucovinei, ca să ajungă la Putna în dimineața de Crăciun.',
    chapters: 4,
    stations: 14,
    saveKey: 'trenul-lui-bubu/winter',
    season: 'winter',
  },
];
