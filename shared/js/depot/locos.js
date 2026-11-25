/**
 * @file The locomotives of Bubu's depot: the ones that pull her trains on the
 * journeys. In the depot the child picks one and decorates it; the journeys
 * that use that locomotive show it decorated.
 */

import { FOREST_TRAIN, FREIGHT_TRAIN, NIGHT_TRAIN } from '../train/specs.js';

/** @typedef {'electric' | 'diesel' | 'steam'} LocoId */

/**
 * @typedef {object} DepotLoco
 * @property {LocoId} id
 * @property {string} name      as the children say it
 * @property {string} nickname  a short, friendly line about it
 * @property {number} route     the journey it pulls (its number)
 * @property {string} journey   the name of that journey
 * @property {import('../train/specs.js').CarSpec} car  how the game draws it
 */

/** @type {readonly DepotLoco[]} */
export const DEPOT_LOCOS = Object.freeze([
  {
    id: 'electric',
    name: 'Locomotiva electrică',
    nickname: 'Merge cu curent, din firul de deasupra.',
    route: 1,
    journey: 'Drumul de Crăciun',
    car: NIGHT_TRAIN.cars[0],
  },
  {
    id: 'diesel',
    name: 'Locomotiva diesel',
    nickname: 'Puternică, trage vagoanele peste munți.',
    route: 2,
    journey: 'Trenul de marfă',
    car: FREIGHT_TRAIN.cars[0],
  },
  {
    id: 'steam',
    name: 'Locomotiva cu aburi',
    nickname: 'Mocănița: arde lemne și scoate fum.',
    route: 3,
    journey: 'Mocănița de Revelion',
    car: FOREST_TRAIN.cars[0],
  },
]);

/**
 * The depot's locomotive with this id (undefined if there is none).
 * @param {string} id
 */
export const depotLoco = id => DEPOT_LOCOS.find(l => l.id === id);
