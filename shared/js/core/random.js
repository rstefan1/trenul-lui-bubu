/**
 * @file Deterministic pseudo-random numbers.
 *
 * The landscape is generated procedurally, but it must look exactly the same
 * every time a tile is (re)built, so every generator is seeded. Seeds are
 * derived from readable strings such as "plain|mid|2".
 */

/**
 * @callback Rng
 * @returns {number} a number in [0, 1)
 */

/**
 * Creates a seeded generator (mulberry32: tiny, fast and good enough for
 * graphics).
 * @param {number} seed  any 32-bit integer
 * @returns {Rng}
 */
export function createRng(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/**
 * FNV-1a hash of a string, used to turn names into seeds.
 * @param {string} text
 * @returns {number} unsigned 32-bit integer
 */
export function hashString(text) {
  let h = 2166136261;
  for (let i = 0; i < text.length; i++) {
    h ^= text.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

/**
 * Seeded generator built from a readable key.
 * @param {string} key
 * @returns {Rng}
 */
export const rngFor = key => createRng(hashString(key));

/**
 * Uniform number in [a, b).
 * @param {Rng} rng
 * @param {number} a
 * @param {number} b
 */
export const between = (rng, a, b) => a + rng() * (b - a);

/**
 * Random element of a non-empty array.
 * @template T
 * @param {Rng} rng
 * @param {ReadonlyArray<T>} items
 * @returns {T}
 */
export const choose = (rng, items) => items[Math.floor(rng() * items.length)];
