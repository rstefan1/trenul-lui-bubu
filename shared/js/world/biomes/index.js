/**
 * @file Registry of biomes (kinds of landscape).
 *
 * A biome paints one tile of each parallax layer. Painters receive a context
 * already transformed to layer units (x in [0, TILE_WIDTH], y in stage
 * units) and a {@link import('./terrain.js').PaintContext} with a seeded
 * random generator, the palette (bare or snowy ground) and a lazily created
 * context for the night lights.
 *
 * New biomes (for new routes or the summer journey) are added here.
 */

import { city } from './city.js';
import { plain } from './plain.js';
import { hills } from './hills.js';
import { forest } from './forest.js';

/**
 * @callback LayerPainter
 * @param {CanvasRenderingContext2D} c
 * @param {import('./terrain.js').PaintContext} p
 * @returns {void}
 */

/**
 * @typedef {object} Biome
 * @property {string} id
 * @property {LayerPainter} far
 * @property {LayerPainter} mid
 * @property {LayerPainter} near
 */

/** @type {Readonly<Record<string, Biome>>} */
export const BIOMES = Object.freeze({ city, plain, hills, forest });

/**
 * @param {string} id
 * @returns {Biome}
 */
export function biome(id) {
  const b = BIOMES[id];
  if (!b) throw new Error(`Unknown biome "${id}"`);
  return b;
}
