/**
 * @file The journeys of the game, as shown on the home page.
 *
 * Every journey lives in a folder of its own (route-01, route-02, …) and is
 * a complete game: its stations, landscapes, missions and saved progress.
 * Adding a journey means adding its folder and one entry here; the season
 * decides its colours on the home page (and the home page can
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
 * @property {Picture} picture  the small drawing on its ticket (each journey has its own)
 */

/**
 * The drawings of the tickets (home/home.js draws them): the Christmas night
 * train, the freight train over the mountains by day, the mocănița under the
 * fireworks of New Year's Eve.
 * @typedef {'christmas' | 'freight' | 'mocanita'} Picture
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
    blurb: 'În noaptea de Ajun, Bubu merge cu trenul prin toată țara, până la Putna.',
    chapters: 4,
    stations: 14,
    saveKey: 'trenul-lui-bubu/route-01',
    season: 'winter',
    picture: 'christmas',
  },
  {
    number: 2,
    path: 'route-02/',
    title: 'Trenul de marfă',
    from: 'Putna',
    to: 'Vișeu de Jos',
    when: '28 decembrie',
    blurb: 'Bubu e mecanic de locomotivă și duce peste munți tot ce le trebuie copiilor din tabăra de la Vișeu.',
    chapters: 2,
    stations: 9,
    saveKey: 'trenul-lui-bubu/route-02',
    season: 'winter',
    picture: 'freight',
  },
  {
    number: 3,
    path: 'route-03/',
    title: 'Mocănița de Revelion',
    from: 'Vișeu de Sus',
    to: 'Paltin',
    when: '31 decembrie',
    blurb: 'Bubu lucrează la mocănița de pe Valea Vaserului și duce copiii din tabără la artificiile de la miezul nopții.',
    chapters: 1,
    stations: 7,
    saveKey: 'trenul-lui-bubu/route-03',
    season: 'winter',
    picture: 'mocanita',
  },
];
