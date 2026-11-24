/**
 * @file The freight journey: Putna → Vișeu de Jos, 28 December, by day.
 *
 * Eight stops, half as many as on the Christmas journey. The train follows
 * the real line: from Putna through Rădăuți and Dornești to Suceava Nord,
 * up the Moldova valley to Câmpulung Moldovenesc, under the Mestecăniș pass
 * to Vatra Dornei, over the viaducts of the Ilva valley to Ilva Mică and
 * Salva, then on the mountain line to Vișeu de Jos, over the great viaducts
 * of Dealu Ștefăniței and down into Maramureș through Săcel. It passes
 * through the other stations (Rădăuți, Dornești, Gura Humorului, Lunca
 * Ilvei, Romuli, Dealu Ștefăniței…) without stopping.
 *
 * Bubu leaves Putna at sunrise and reaches Vișeu de Jos just before sunset,
 * still in daylight (the day sky of shared/js/world/lighting.js).
 *
 * The fields of every segment are explained in route-01/js/route-data.js.
 */

/** @type {import('../../shared/js/journey/route.js').RouteData} */
export const FREIGHT_ROUTE = {
  firstDay: 28,
  sky: 'day',

  stations: [
    { id: 'putna', name: 'Putna', depart: '28 07:50', size: 'small' },
    { id: 'suceava-nord', name: 'Suceava Nord', arrive: '28 09:15', depart: '28 09:35', size: 'large' },
    { id: 'campulung', name: 'Câmpulung Moldovenesc', short: 'Câmpulung', arrive: '28 11:00', depart: '28 11:10', size: 'small' },
    { id: 'vatra-dornei', name: 'Vatra Dornei', arrive: '28 12:05', depart: '28 12:35', size: 'small' },
    { id: 'ilva-mica', name: 'Ilva Mică', arrive: '28 14:00', depart: '28 14:10', size: 'small' },
    { id: 'salva', name: 'Salva', arrive: '28 14:35', depart: '28 14:45', size: 'small' },
    { id: 'sacel', name: 'Săcel', arrive: '28 15:45', depart: '28 15:50', size: 'small' },
    { id: 'viseu-de-jos', name: 'Vișeu de Jos', short: 'Vișeu', arrive: '28 16:15', size: 'small' },
  ],

  segments: [
    // Putna → Suceava Nord: the hills of Bucovina at sunrise, over the Suceava river
    // (past Rădăuți and Dornești); the signals mission sets the pace
    {
      duration: 34,
      biomes: [[0, 'hills'], [0.12, 'forest'], [0.3, 'hills'], [0.5, 'plain'], [0.75, 'hills'], [0.9, 'city']],
      features: [{ type: 'bridge', at: 0.6, length: 340, depth: 110 }],
      snowfall: [[0, 0]],
      cover: [[0, 1]],
      train: 'freight',
    },
    // Suceava Nord → Câmpulung Moldovenesc: up the Moldova valley, a sunny morning
    {
      duration: 24,
      biomes: [[0, 'city'], [0.1, 'hills'], [0.4, 'forest'], [0.7, 'hills'], [0.9, 'city']],
      features: [{ type: 'bridge', at: 0.5, length: 380, depth: 120 }],
      snowfall: [[0, 0]],
      cover: [[0, 1]],
      train: 'freight',
    },
    // Câmpulung Moldovenesc → Vatra Dornei: up to the Mestecăniș pass (the sand
    // mission) and through the long tunnel under it; Vatra Dornei comes soon
    // after the tunnel, so there is no long ride without anything to do
    {
      duration: 22,
      biomes: [[0, 'city'], [0.1, 'forest'], [0.86, 'city']],
      features: [{ type: 'tunnel', at: 0.66, length: 1600 }],
      snowfall: [[0, 0], [0.2, 0.3], [0.5, 0.25], [0.8, 0]],
      cover: [[0, 1]],
      train: 'freight',
    },
    // Vatra Dornei → Ilva Mică: the forests and viaducts of the Christmas night, now by day
    // (the train slows down on every viaduct, while the child counts its arches)
    {
      duration: 24,
      biomes: [[0, 'city'], [0.06, 'forest']],
      features: [
        { type: 'viaduct', at: 0.11, length: 720, depth: 420 },
        { type: 'tunnel', at: 0.3, length: 400 },
        { type: 'viaduct', at: 0.4, length: 960, depth: 480 },
        { type: 'viaduct', at: 0.7, length: 600, depth: 380 },
      ],
      snowfall: [[0, 0]],
      cover: [[0, 1]],
      train: 'freight',
    },
    // Ilva Mică → Salva: a short way along the Someș, early afternoon; a freight
    // train passes the other way
    {
      duration: 12,
      biomes: [[0, 'city'], [0.14, 'hills'], [0.86, 'city']],
      features: [{ type: 'bridge', at: 0.45, length: 320, depth: 100 }],
      snowfall: [[0, 0]],
      cover: [[0, 1]],
      train: 'freight',
    },
    // Salva → Săcel: the mountain line climbs past Romuli to Dealu Ștefăniței (a short
    // tunnel at the top), then goes down over its great viaducts in the golden light
    {
      duration: 24,
      biomes: [[0, 'city'], [0.06, 'hills'], [0.12, 'forest'], [0.9, 'hills']],
      features: [
        { type: 'tunnel', at: 0.11, length: 500 },
        { type: 'viaduct', at: 0.2, length: 1300, depth: 560 },
        { type: 'viaduct', at: 0.42, length: 1500, depth: 620 },
        { type: 'viaduct', at: 0.66, length: 1200, depth: 540 },
      ],
      snowfall: [[0, 0]],
      cover: [[0, 1]],
      train: 'freight',
    },
    // Săcel → Vișeu de Jos: down the valley of Maramureș, before sunset
    {
      duration: 22,
      biomes: [[0, 'city'], [0.14, 'hills'], [0.88, 'city']],
      snowfall: [[0, 0]],
      cover: [[0, 1]],
      train: 'freight',
    },
  ],
};
