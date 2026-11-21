/**
 * @file The winter journey: Timișoara → Putna, 24–25 December.
 *
 * Times follow a believable night-train timetable (departure 15:00 on
 * Christmas Eve, change of trains in Suceava early in the morning, arrival
 * in Putna before the 10 o'clock Christmas service).
 *
 * For every segment:
 *   duration  play seconds between the two stations
 *   biomes    landscapes along the segment, as [fraction, biome]
 *   features  viaducts, bridges and tunnels, at a fraction of the segment
 *   snowfall  how hard it snows, as [fraction, 0..1]
 *   cover     how white the ground is, as [fraction, 0..1]
 *   train     which train runs on the segment ("night" or "regional")
 *
 * The snow is part of the story: there is none when Bubu leaves Timișoara
 * and arrives in Arad; it starts falling on the way to Deva, as a surprise,
 * and from then on the whole country is white.
 */

/** @type {import('../../shared/js/journey/route.js').RouteData} */
export const WINTER_ROUTE = {
  firstDay: 24,

  stations: [
    { id: 'timisoara', name: 'Timișoara Nord', short: 'Timișoara', depart: '24 15:00', size: 'large' },
    { id: 'arad', name: 'Arad', arrive: '24 15:58', depart: '24 16:03', size: 'large' },
    { id: 'deva', name: 'Deva', arrive: '24 18:10', depart: '24 18:13', size: 'small' },
    { id: 'alba-iulia', name: 'Alba Iulia', arrive: '24 19:20', depart: '24 19:23', size: 'small' },
    { id: 'cluj-napoca', name: 'Cluj-Napoca', arrive: '24 21:25', depart: '24 21:37', size: 'large' },
    { id: 'ilva-mica', name: 'Ilva Mică', arrive: '25 00:40', depart: '25 00:42', size: 'small' },
    { id: 'vatra-dornei', name: 'Vatra Dornei', arrive: '25 02:05', depart: '25 03:10', size: 'small' },
    { id: 'mestecanis', name: 'Mestecăniș', arrive: '25 03:35', depart: '25 03:37', size: 'small' },
    { id: 'campulung', name: 'Câmpulung Moldovenesc', short: 'Câmpulung', arrive: '25 04:05', depart: '25 04:08', size: 'small' },
    { id: 'suceava', name: 'Suceava', arrive: '25 05:30', depart: '25 06:50', size: 'large' },
    { id: 'radauti', name: 'Rădăuți', arrive: '25 07:50', depart: '25 07:54', size: 'small' },
    { id: 'putna', name: 'Putna', arrive: '25 09:40', size: 'small' },
  ],

  segments: [
    // Timișoara → Arad: the western plain on a sunny winter afternoon, no snow
    {
      duration: 50,
      biomes: [[0, 'city'], [0.2, 'plain'], [0.85, 'city']],
      features: [{ type: 'bridge', at: 0.45, length: 340, depth: 110 }],
      snowfall: [[0, 0]],
      cover: [[0, 0]],
    },
    // Arad → Deva: along the Mureș valley; sunset, and the first snowflakes
    {
      duration: 60,
      biomes: [[0, 'city'], [0.14, 'plain'], [0.38, 'hills'], [0.9, 'city']],
      features: [{ type: 'bridge', at: 0.28, length: 420, depth: 120 }],
      snowfall: [[0, 0], [0.32, 0], [0.42, 0.25], [0.7, 0.6], [1, 0.55]],
      cover: [[0, 0], [0.45, 0], [0.95, 1]],
    },
    // Deva → Alba Iulia: hills and villages in the evening
    {
      duration: 50,
      biomes: [[0, 'city'], [0.12, 'hills'], [0.88, 'city']],
      snowfall: [[0, 0.5], [1, 0.35]],
      cover: [[0, 1]],
    },
    // Alba Iulia → Cluj-Napoca
    {
      duration: 60,
      biomes: [[0, 'city'], [0.1, 'hills'], [0.45, 'plain'], [0.6, 'hills'], [0.86, 'city']],
      features: [{ type: 'bridge', at: 0.4, length: 300, depth: 100 }],
      snowfall: [[0, 0.3], [1, 0.45]],
      cover: [[0, 1]],
    },
    // Cluj-Napoca → Ilva Mică: the Someș valley; midnight, Christmas begins
    {
      duration: 70,
      biomes: [[0, 'city'], [0.12, 'hills'], [0.55, 'forest'], [0.7, 'hills']],
      features: [{ type: 'bridge', at: 0.3, length: 360, depth: 120 }],
      snowfall: [[0, 0.45], [0.6, 0.25], [1, 0.15]],
      cover: [[0, 1]],
    },
    // Ilva Mică → Vatra Dornei: deep forests and spectacular viaducts, under the full moon
    // (the train slows down on every viaduct, so the play time is longer than `duration`)
    {
      duration: 70,
      biomes: [[0, 'forest']],
      features: [
        { type: 'viaduct', at: 0.12, length: 900, depth: 400 },
        { type: 'tunnel', at: 0.27, length: 700 },
        { type: 'viaduct', at: 0.38, length: 1300, depth: 480 },
        { type: 'viaduct', at: 0.55, length: 800, depth: 340 },
        { type: 'tunnel', at: 0.68, length: 520 },
        { type: 'viaduct', at: 0.78, length: 1100, depth: 440 },
      ],
      snowfall: [[0, 0.15], [0.3, 0.04], [0.9, 0.04], [1, 0.12]],
      cover: [[0, 1]],
    },
    // Vatra Dornei → Mestecăniș: climbing towards the pass
    {
      duration: 40,
      biomes: [[0, 'city'], [0.15, 'forest']],
      snowfall: [[0, 0.4], [1, 0.5]],
      cover: [[0, 1]],
    },
    // Mestecăniș → Câmpulung Moldovenesc: through the long tunnel under the pass
    {
      duration: 45,
      biomes: [[0, 'forest'], [0.62, 'hills'], [0.9, 'city']],
      features: [{ type: 'tunnel', at: 0.16, length: 1100 }],
      snowfall: [[0, 0.5], [1, 0.3]],
      cover: [[0, 1]],
    },
    // Câmpulung Moldovenesc → Suceava: down the Moldova valley
    {
      duration: 60,
      biomes: [[0, 'city'], [0.1, 'hills'], [0.35, 'forest'], [0.5, 'hills'], [0.88, 'city']],
      features: [{ type: 'bridge', at: 0.6, length: 380, depth: 120 }],
      snowfall: [[0, 0.3], [1, 0.15]],
      cover: [[0, 1]],
    },
    // Suceava → Rădăuți: the small regional train, first light of the morning
    {
      duration: 50,
      train: 'regional',
      biomes: [[0, 'city'], [0.12, 'plain'], [0.6, 'hills'], [0.9, 'city']],
      snowfall: [[0, 0.1], [0.5, 0]],
      cover: [[0, 1]],
    },
    // Rădăuți → Putna: sunrise over the hills of Bucovina
    {
      duration: 60,
      train: 'regional',
      biomes: [[0, 'city'], [0.1, 'hills'], [0.55, 'forest'], [0.85, 'hills']],
      features: [{ type: 'bridge', at: 0.4, length: 300, depth: 100 }],
      snowfall: [[0, 0]],
      cover: [[0, 1]],
    },
  ],
};
