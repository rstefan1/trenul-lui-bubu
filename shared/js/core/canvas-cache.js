/**
 * @file A bounded cache of offscreen canvases.
 *
 * Expensive static drawings (landscape tiles, the train body) are painted
 * once into an offscreen canvas and then only copied each frame. The cache
 * keeps the most recently used canvases and drops the oldest ones, so memory
 * stays bounded on phones.
 */

/**
 * @typedef {object} OffscreenRequest
 * @property {number} x       left edge of the painted area, in source units
 * @property {number} y       top edge of the painted area, in source units
 * @property {number} width   in source units
 * @property {number} height  in source units
 * @property {number} ratio   device pixels per source unit
 */

/**
 * Creates a canvas whose context draws in source units, with (x, y) mapped
 * to the top-left corner.
 * @param {OffscreenRequest} req
 * @returns {{canvas: HTMLCanvasElement, ctx: CanvasRenderingContext2D}}
 */
export function createOffscreen(req) {
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.ceil(req.width * req.ratio));
  canvas.height = Math.max(1, Math.ceil(req.height * req.ratio));
  const ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  ctx.setTransform(req.ratio, 0, 0, req.ratio, -req.x * req.ratio, -req.y * req.ratio);
  return { canvas, ctx };
}

/**
 * @template T
 */
export class LruCache {
  /** @param {number} capacity  maximum number of entries */
  constructor(capacity) {
    this.capacity = capacity;
    /** @type {Map<string, T>} */
    this.map = new Map();
  }

  /**
   * Returns the cached value for `key`, building it with `build` if needed.
   * @param {string} key
   * @param {() => T} build
   * @returns {T}
   */
  get(key, build) {
    const hit = this.map.get(key);
    if (hit !== undefined) {
      // Re-insert to mark as most recently used.
      this.map.delete(key);
      this.map.set(key, hit);
      return hit;
    }
    while (this.map.size >= this.capacity) {
      this.map.delete(this.map.keys().next().value);
    }
    const value = build();
    this.map.set(key, value);
    return value;
  }

  clear() {
    this.map.clear();
  }
}
