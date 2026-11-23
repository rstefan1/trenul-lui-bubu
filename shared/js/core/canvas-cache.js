/**
 * @file A bounded cache of offscreen canvases.
 *
 * Expensive static drawings (landscape tiles, the train body) are painted
 * once into an offscreen canvas and then only copied each frame. The cache
 * keeps the most recently used canvases and drops the oldest ones, so memory
 * stays bounded on phones.
 *
 * The bound is in bytes, not in a number of canvases: a canvas painted for a
 * very sharp screen takes many times the memory of one for an ordinary
 * screen. A canvas that is dropped is emptied at once (see releaseCanvas):
 * left to the browser, its memory would only come back much later.
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
 * Memory taken by a canvas (4 bytes a pixel).
 * @param {HTMLCanvasElement | null | undefined} canvas
 */
export const canvasBytes = canvas => (canvas ? canvas.width * canvas.height * 4 : 0);

/**
 * Gives a canvas's memory back right away (instead of whenever the browser
 * collects it): a canvas of size 0 holds no pixels.
 * @param {HTMLCanvasElement | null | undefined} canvas
 */
export function releaseCanvas(canvas) {
  if (!canvas) return;
  canvas.width = 0;
  canvas.height = 0;
}

/**
 * @template T
 * @typedef {object} LruOptions
 * @property {number} maxBytes                the memory the cache may hold
 * @property {(value: T) => number} sizeOf    memory of one value, in bytes
 * @property {(value: T) => void} release     frees a value that is dropped
 * @property {(value: T) => boolean} [isProtected]  a value that must not be dropped now
 *           (e.g. one on screen): the cache rather holds more than maxBytes for a while
 */

/**
 * @template T
 */
export class LruCache {
  /** @param {LruOptions<T>} options */
  constructor(options) {
    this.options = options;
    /** @type {Map<string, T>} */
    this.map = new Map();
    /** Memory held now, in bytes. */
    this.bytes = 0;
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
    const value = build();
    this.map.set(key, value);
    this.bytes += this.options.sizeOf(value);
    // drop the least recently used until the memory fits, never a protected one
    // (nor the value just built)
    const { maxBytes, isProtected } = this.options;
    for (const [oldKey, old] of [...this.map]) {
      if (this.bytes <= maxBytes) break;
      if (old === value || isProtected?.(old)) continue;
      this.drop(oldKey, old);
    }
    return value;
  }

  /**
   * @private
   * @param {string} key
   * @param {T} value
   */
  drop(key, value) {
    this.map.delete(key);
    this.bytes -= this.options.sizeOf(value);
    this.options.release(value);
  }

  /**
   * Is a value cached (without marking it as used)?
   * @param {string} key
   */
  has(key) {
    return this.map.has(key);
  }

  /** Drops (and frees) everything. */
  clear() {
    for (const [key, value] of [...this.map]) this.drop(key, value);
    this.bytes = 0;
  }
}
