/**
 * @file The scrolling landscape: three parallax layers made of tiles.
 *
 * Layers. "far" (distant hills/mountains) moves slowly, "mid" (villages,
 * slopes) at medium speed and "near" (the ground beside the track) exactly
 * with the train. A vertical camera offset moves the layers by different
 * amounts too, which is how the valleys under the viaducts are revealed.
 *
 * Tiles. Each layer is an endless row of {@link TILE_WIDTH}-wide tiles. The
 * biome of a tile is looked up from the route, at the distance where the
 * tile passes the middle of the screen, so the landscape changes gradually
 * and spatially as the train advances (no fading).
 *
 * Snow cover. Every tile exists in a "bare" and a "snowy" version; while the
 * ground is turning white both are drawn, the snowy one with growing
 * opacity.
 *
 * Night. Each tile has an optional companion bitmap with its lights (lit
 * windows, street lamps). The tile itself is tinted by the time-of-day wash
 * (see compositor.js), then the lights are drawn on top, untinted, with the
 * strength of the night.
 *
 * Performance. Tiles are painted once and cached (LRU); far tiles are
 * painted at reduced resolution since they are blurred by distance anyway.
 * Every layer also has a highest resolution: on very sharp screens (Retina,
 * 150–200 % scaling) a tile at full density would take 10–20 MB, while the
 * landscape — behind the train and the text, which stay sharp — looks the
 * same a little softer. The memory of a tile grows with the square of its
 * resolution, so the cap saves most where it is invisible.
 *
 * Painting a tile (a forest with hundreds of firs) can take longer than a
 * frame. So that no frame is ever late because of it, the tiles that are
 * about to come into view are painted ahead, one at a time, when the
 * browser has a moment to spare (requestIdleCallback), well before they are
 * needed.
 */

import { LruCache, canvasBytes, createOffscreen, releaseCanvas } from '../core/canvas-cache.js';
import { rngFor } from '../core/random.js';
import { hexToRgb, css, mixRgb } from '../gfx/color.js';
import { biome } from './biomes/index.js';
import { NEAR_TILE_BOTTOM, TILE_WIDTH, paletteFor } from './biomes/terrain.js';

/**
 * @typedef {object} LayerSpec
 * @property {'far' | 'mid' | 'near'} id
 * @property {number} top          first painted row (stage units)
 * @property {number} bottom       last painted row
 * @property {number} speed        horizontal parallax factor (near = 1)
 * @property {number} parallaxY    vertical parallax factor for the camera
 * @property {number} haze         strength of the sky-coloured haze
 * @property {number} resolution   fraction of the full pixel density
 * @property {number} maxRatio     highest density (device pixels per stage unit)
 */

/** @type {ReadonlyArray<LayerSpec>} */
export const LAYERS = Object.freeze([
  // the far mountains are in the haze: a low cap is invisible; the near layer keeps most of its detail
  { id: 'far', top: 250, bottom: 720, speed: 0.08, parallaxY: 0.3, haze: 0.32, resolution: 0.6, maxRatio: 1 },
  { id: 'mid', top: 400, bottom: 800, speed: 0.32, parallaxY: 0.6, haze: 0.12, resolution: 0.85, maxRatio: 1.3 },
  { id: 'near', top: 480, bottom: NEAR_TILE_BOTTOM, speed: 1, parallaxY: 1, haze: 0, resolution: 1, maxRatio: 2 },
]);

/** Horizontal screen position used as reference when assigning biomes. */
const REFERENCE_X = 800;

/**
 * Tiles are drawn this much wider than they are, so that neighbours overlap
 * by a fraction of a pixel and no hairline seam can appear between them.
 */
const SEAM = 1;

/** Number of variants per biome and layer (avoids visible repetition). */
const VARIANTS = 4;
/**
 * Memory the tiles may take. Enough for every tile on screen and the ones
 * painted ahead, on all three layers, even while the ground turns white
 * (bare and snowy tiles at once), on a sharp screen; on ordinary screens it
 * holds many more.
 */
const TILES_MAX_BYTES = 128 * 1024 * 1024;
/** Never fewer tiles than those on screen and ahead (3 layers × (3 on screen + 1 ahead)), whatever the memory. */
const TILES_MIN = 12;
/** How many tiles beyond the right edge of the screen are painted ahead, per layer. */
const AHEAD = 1;
/** Paint ahead only while at least this much of the browser's spare moment is left (ms). */
const IDLE_MARGIN = 4;
/** At the latest after this long (ms), a tile is painted ahead even if the browser is never idle. */
const IDLE_TIMEOUT = 600;

const GROUND_DEEP_BARE = hexToRgb(paletteFor(false).groundDeep);
const GROUND_DEEP_SNOWY = hexToRgb(paletteFor(true).groundDeep);

/**
 * @typedef {object} Tile
 * @property {HTMLCanvasElement} body
 * @property {HTMLCanvasElement | null} lights
 */

/**
 * @typedef {object} LandscapeView
 * @property {number} distance   distance travelled by the train (near-layer units)
 * @property {number} cameraY    vertical camera lift (positive = world moves up)
 * @property {number} cover      snow on the ground, 0..1
 * @property {import('./lighting.js').Light} light
 * @property {number} viewBottom lowest visible row (stage units)
 */

/**
 * Additional drawing that shares a layer's band (and therefore its tint).
 * @typedef {object} LayerExtras
 * @property {(c: CanvasRenderingContext2D) => void} [extra]        drawn after the tiles
 * @property {(c: CanvasRenderingContext2D) => void} [extraLights]  drawn after the tile lights
 * @property {(c: CanvasRenderingContext2D) => void} [clip]         adds holes to the tiles' clip path
 * @property {number} [bandTop]  top of the tinted band, if the extras reach higher than the tiles
 */

export class Landscape {
  /**
   * @param {import('../core/stage.js').Stage} stage
   * @param {import('../gfx/compositor.js').BandCompositor} compositor
   * @param {(distance: number) => string} biomeAt  biome id at a route distance
   */
  constructor(stage, compositor, biomeAt) {
    this.stage = stage;
    this.compositor = compositor;
    this.biomeAt = biomeAt;
    /** @type {LruCache<Tile>} */
    this.cache = new LruCache({
      maxBytes: TILES_MAX_BYTES,
      minEntries: TILES_MIN,
      sizeOf: tile => canvasBytes(tile.body) + canvasBytes(tile.lights),
      release: tile => {
        releaseCanvas(tile.body);
        releaseCanvas(tile.lights);
      },
    });
    stage.on('resize', () => {
      this.cache.clear();
      this.ahead.clear();
    });
    /** Paint the tiles at the screen's full density, without the caps (for comparing, in ?debug). */
    this.fullResolution = false;
    /** @type {Map<string, {layer: LayerSpec, biome: string, variant: number, snowy: boolean, soon: number}>} tiles to paint ahead */
    this.ahead = new Map();
    this.idleQueued = false;
  }

  /**
   * Switches the resolution caps off (or on again); the tiles are painted anew.
   * @param {boolean} full
   */
  setFullResolution(full) {
    if (full === this.fullResolution) return;
    this.fullResolution = full;
    this.cache.clear();
    this.ahead.clear();
  }

  /**
   * Device pixels per stage unit a layer's tiles are painted at.
   * @param {LayerSpec} layer
   */
  ratioOf(layer) {
    const ratio = this.stage.pixelRatio * layer.resolution;
    return this.fullResolution ? ratio : Math.min(ratio, layer.maxRatio);
  }

  /**
   * Draws one layer (with its lights).
   * @param {CanvasRenderingContext2D} c  in stage units, camera not applied
   * @param {LayerSpec} layer
   * @param {LandscapeView} view
   * @param {LayerExtras} [extras]
   */
  drawLayer(c, layer, view, extras = {}) {
    const { extra, extraLights, clip } = extras;
    const { light } = view;
    const dy = -view.cameraY * layer.parallaxY;
    const washes = [
      { color: css(light.bottom), alpha: layer.haze },
      light.wash,
    ];
    const bottom = layer.id === 'near' ? view.viewBottom + view.cameraY + 4 : layer.bottom;
    const tiles = this.visibleTiles(layer, view);

    c.save();
    c.translate(0, dy);
    this.compositor.draw(c, extras.bandTop ?? layer.top, bottom, b => {
      if (layer.id === 'near') {
        // flat ground below the painted tiles (portrait screens, camera lift)
        b.fillStyle = css(mixRgb(GROUND_DEEP_BARE, GROUND_DEEP_SNOWY, view.cover));
        b.fillRect(-1, NEAR_TILE_BOTTOM - 2, this.stage.width + 2, bottom - NEAR_TILE_BOTTOM + 2);
      }
      if (clip) {
        b.save();
        b.beginPath();
        b.rect(-10, layer.top - 10, this.stage.width + 20, bottom - layer.top + 20);
        clip(b);
        b.clip('evenodd');
      }
      for (const t of tiles) this.drawTileBody(b, layer, t, view.cover);
      if (clip) b.restore();
      if (extra) extra(b);
    }, washes);

    if (light.night > 0.02) {
      c.globalAlpha = Math.min(1, light.night * 1.1);
      for (const t of tiles) {
        const tile = this.tile(layer, t.biome, t.variant, view.cover >= 0.5);
        if (tile.lights) c.drawImage(tile.lights, t.x, layer.top, TILE_WIDTH + SEAM, layer.bottom - layer.top);
      }
      c.globalAlpha = 1;
    }
    if (extraLights) extraLights(c);
    c.restore();
    this.planAhead(layer, view);
  }

  /**
   * Notes the tiles of a layer that come into view next, to paint them ahead.
   * @private
   * @param {LayerSpec} layer
   * @param {LandscapeView} view
   */
  planAhead(layer, view) {
    const offset = view.distance * layer.speed;
    const last = Math.floor((offset + this.stage.width) / TILE_WIDTH);
    // the ground can be bare, snowy, or both while it turns white
    const covers = view.cover <= 0.001 ? [false] : view.cover >= 0.999 ? [true] : [false, true];
    for (let i = last + 1; i <= last + AHEAD; i++) {
      const t = this.tileAt(layer, i);
      // how soon it comes into view (in stage units of the near layer: the far ones come later)
      const soon = (i * TILE_WIDTH - offset - this.stage.width) / layer.speed;
      for (const snowy of covers) {
        const key = this.keyOf(layer, t.biome, t.variant, snowy);
        if (!this.cache.has(key) && !this.ahead.has(key)) this.ahead.set(key, { layer, ...t, snowy, soon });
      }
    }
    if (this.ahead.size && !this.idleQueued) this.whenIdle();
  }

  /**
   * Asks the browser for a spare moment to paint ahead.
   * @private
   */
  whenIdle() {
    this.idleQueued = true;
    const run = (/** @type {IdleDeadline | null} */ deadline) => {
      this.idleQueued = false;
      this.paintAhead(deadline);
      if (this.ahead.size) this.whenIdle();
    };
    if (window.requestIdleCallback) window.requestIdleCallback(run, { timeout: IDLE_TIMEOUT });
    else setTimeout(() => run(null), 50);   // Safari: no idle callbacks, a short pause instead
  }

  /**
   * Paints the tiles noted ahead, the soonest first, while the spare moment lasts
   * (always at least one, so they are ready in time).
   * @private
   * @param {IdleDeadline | null} deadline
   */
  paintAhead(deadline) {
    const jobs = [...this.ahead.entries()].sort((a, b) => a[1].soon - b[1].soon);
    for (const [key, job] of jobs) {
      this.ahead.delete(key);
      if (this.cache.has(key)) continue;
      this.tile(job.layer, job.biome, job.variant, job.snowy);
      if (!deadline || deadline.timeRemaining() < IDLE_MARGIN) return;
    }
  }

  /**
   * Which biome and variant tile number `i` of a layer shows.
   * @private
   * @param {LayerSpec} layer
   * @param {number} i
   */
  tileAt(layer, i) {
    const centreDistance = (i * TILE_WIDTH + TILE_WIDTH / 2 - REFERENCE_X) / layer.speed;
    return { biome: this.biomeAt(centreDistance), variant: ((i % VARIANTS) + VARIANTS) % VARIANTS };
  }

  /**
   * @private
   * @param {LayerSpec} layer
   * @param {string} biomeId
   * @param {number} variant
   * @param {boolean} snowy
   */
  keyOf(layer, biomeId, variant, snowy) {
    return `${layer.id}|${biomeId}|${variant}|${snowy ? 's' : 'b'}`;
  }

  /**
   * @private
   * @param {LayerSpec} layer
   * @param {LandscapeView} view
   * @returns {Array<{x: number, biome: string, variant: number}>}
   */
  visibleTiles(layer, view) {
    const offset = view.distance * layer.speed;
    const first = Math.floor(offset / TILE_WIDTH);
    const last = Math.floor((offset + this.stage.width) / TILE_WIDTH);
    const out = [];
    for (let i = first; i <= last; i++) out.push({ x: i * TILE_WIDTH - offset, ...this.tileAt(layer, i) });
    return out;
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} b
   * @param {LayerSpec} layer
   * @param {{x: number, biome: string, variant: number}} t
   * @param {number} cover
   */
  drawTileBody(b, layer, t, cover) {
    const h = layer.bottom - layer.top;
    if (cover < 0.999) {
      b.drawImage(this.tile(layer, t.biome, t.variant, false).body, t.x, layer.top, TILE_WIDTH + SEAM, h);
    }
    if (cover > 0.001) {
      b.globalAlpha = cover;
      b.drawImage(this.tile(layer, t.biome, t.variant, true).body, t.x, layer.top, TILE_WIDTH + SEAM, h);
      b.globalAlpha = 1;
    }
  }

  /**
   * Returns (painting if needed) a tile.
   * @private
   * @param {LayerSpec} layer
   * @param {string} biomeId
   * @param {number} variant
   * @param {boolean} snowy
   * @returns {Tile}
   */
  tile(layer, biomeId, variant, snowy) {
    return this.cache.get(this.keyOf(layer, biomeId, variant, snowy), () => {
      const ratio = this.ratioOf(layer);
      const req = { x: 0, y: layer.top, width: TILE_WIDTH, height: layer.bottom - layer.top, ratio };
      const body = createOffscreen(req);
      /** @type {ReturnType<typeof createOffscreen> | null} */
      let lights = null;
      const ctx = {
        // the same seed for bare and snowy tiles: only the colours differ
        rng: rngFor(`${layer.id}|${biomeId}|${variant}`),
        pal: paletteFor(snowy),
        lights: () => (lights ??= createOffscreen(req)).ctx,
      };
      biome(biomeId)[layer.id](body.ctx, ctx);
      return { body: body.canvas, lights: lights ? lights.canvas : null };
    });
  }
}
