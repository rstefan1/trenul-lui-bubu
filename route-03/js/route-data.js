/**
 * @file The New Year's Eve journey: Vișeu de Sus → Paltin, 31 December, on
 * the forest railway (the mocănița).
 *
 * The narrow-gauge line climbs the valley of the Vaser river from the
 * forest railway station of Vișeu de Sus, through the forest, and stops at
 * every one of its real stations: Valea Scradei, Novăț, Glîmboaca, Cozia,
 * Novicior and Paltin, the last one, high in the mountains.
 *
 * The train leaves in the morning and reaches Paltin at one in the
 * afternoon; there the time flies to midnight (the fireworks), which is why
 * the journey has the New Year's Eve sky of shared/js/world/lighting.js.
 * The train is slow, as the real one is: the missions keep its pace, and
 * the trip without a mission has a slow stretch.
 *
 * The fields of every segment are explained in route-01/js/route-data.js.
 */

/** @type {import('../../shared/js/journey/route.js').RouteData} */
export const FOREST_ROUTE = {
  firstDay: 31,
  sky: 'newYear',

  stations: [
    { id: 'viseu-de-sus', name: 'Vișeu de Sus CFF', short: 'Vișeu de Sus', depart: '31 09:00', size: 'small' },
    { id: 'valea-scradei', name: 'Valea Scradei', arrive: '31 09:30', depart: '31 09:40', size: 'small' },
    { id: 'novat', name: 'Novăț', arrive: '31 10:20', depart: '31 10:35', size: 'small' },
    { id: 'glimboaca', name: 'Glîmboaca', arrive: '31 11:05', depart: '31 11:15', size: 'small' },
    { id: 'cozia', name: 'Cozia', arrive: '31 11:40', depart: '31 11:50', size: 'small' },
    { id: 'novicior', name: 'Novicior', arrive: '31 12:15', depart: '31 12:25', size: 'small' },
    { id: 'paltin', name: 'Paltin', arrive: '31 13:00', size: 'small' },
  ],

  segments: [
    // Vișeu de Sus → Valea Scradei: out of the town, along the street, into the valley
    // of the Vaser; Bubu feeds the fire of the locomotive
    {
      duration: 28,
      biomes: [[0, 'city'], [0.2, 'hills'], [0.45, 'forest']],
      snowfall: [[0, 0]],
      cover: [[0, 1]],
      train: 'forest',
    },
    // Valea Scradei → Novăț: deep in the forest, over a small wooden bridge broken by the flood
    {
      duration: 26,
      biomes: [[0, 'forest']],
      snowfall: [[0, 0]],
      cover: [[0, 1]],
      train: 'forest',
    },
    // Novăț → Glîmboaca: stones fallen from the mountain, and a cracked sleeper
    {
      duration: 30,
      biomes: [[0, 'forest'], [0.4, 'hills'], [0.6, 'forest']],
      snowfall: [[0, 0]],
      cover: [[0, 1]],
      train: 'forest',
    },
    // Glîmboaca → Cozia: the wild part of the valley, with animals on the line
    {
      duration: 32,
      biomes: [[0, 'forest']],
      snowfall: [[0, 0], [0.7, 0.1]],
      cover: [[0, 1]],
      train: 'forest',
    },
    // Cozia → Novicior: it snows in the forest, and snowdrifts lie on the line
    {
      duration: 28,
      biomes: [[0, 'forest'], [0.5, 'hills'], [0.7, 'forest']],
      snowfall: [[0, 0.15], [0.25, 0.6], [0.75, 0.5], [1, 0.25]],
      cover: [[0, 1]],
      train: 'forest',
    },
    // Novicior → Paltin: a slow ride through the firs, up to the last station; it is
    // cold up there, and the children get hot tea
    {
      duration: 20,
      biomes: [[0, 'forest']],
      slow: [[0.08, 0.9, 360]],
      snowfall: [[0, 0.2], [1, 0.1]],
      cover: [[0, 1]],
      train: 'forest',
    },
  ],
};
