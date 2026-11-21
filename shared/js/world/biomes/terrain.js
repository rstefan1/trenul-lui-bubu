/**
 * @file Building blocks shared by all biome painters: palettes, layer
 * geometry and silhouette generators.
 *
 * Seamless tiling. Every layer of the landscape is a row of 1600-unit tiles,
 * and neighbouring tiles may belong to different biomes (the plain turns into
 * hills, the hills into mountains). To avoid visible seams, every silhouette
 * meets the tile edges at the same height for a given layer
 * ({@link EDGE_Y}), and objects are kept a small margin away from the edges.
 */

import { TAU } from '../../core/math.js';
import { between } from '../../core/random.js';

/** Width of one landscape tile, in layer units. */
export const TILE_WIDTH = 1600;

/** Objects keep at least this distance from the tile edges. */
export const EDGE_MARGIN = 70;

/** Height of the silhouette at the tile edges, per layer. */
export const EDGE_Y = { far: 640, mid: 668, near: 742 };

/** The ground line right behind the track (near layer). */
export const NEAR_GROUND_Y = EDGE_Y.near;

/** Lowest row painted in a tile of the near layer; below it, a flat fill. */
export const NEAR_TILE_BOTTOM = 1000;

/**
 * @typedef {object} Palette
 * @property {string} ground       near ground, top
 * @property {string} groundDeep   near ground, bottom (must match the flat fill)
 * @property {string} midGround    hills/fields of the middle layer
 * @property {string} midShade
 * @property {string} far          distant hills/mountains
 * @property {string} farShade
 * @property {string} farSnow      snow caps of distant mountains (always present)
 * @property {string} fir
 * @property {string} firShade
 * @property {string} bare         leafless trees
 * @property {string} field        ploughed fields
 * @property {string} snow
 * @property {boolean} snowy
 */

/** @type {Palette} */
const BARE = {
  ground: '#aac57b',
  groundDeep: '#93ad66',
  midGround: '#9dbb72',
  midShade: '#89a862',
  far: '#8aa3c9',
  farShade: '#7891ba',
  farSnow: '#eef3fc',
  fir: '#2f6e4f',
  firShade: '#245a41',
  bare: '#7b5e48',
  field: '#b59a6c',
  snow: '#f4f8ff',
  snowy: false,
};

/** @type {Palette} */
const SNOWY = {
  ground: '#f1f6fd',
  groundDeep: '#dfe8f6',
  midGround: '#e9f0fa',
  midShade: '#d3dfef',
  far: '#a9bddc',
  farShade: '#93aad0',
  farSnow: '#f6f9ff',
  fir: '#2f6e4f',
  firShade: '#245a41',
  bare: '#6e5442',
  field: '#e3ebf7',
  snow: '#f4f8ff',
  snowy: true,
};

/**
 * @param {boolean} snowy
 * @returns {Palette}
 */
export const paletteFor = snowy => (snowy ? SNOWY : BARE);

/**
 * @typedef {object} PaintContext
 * @property {import('../../core/random.js').Rng} rng  seeded for this tile
 * @property {Palette} pal
 * @property {() => CanvasRenderingContext2D} lights  context for the night lights (created on demand)
 */

/**
 * A soft silhouette that meets `edgeY` at both tile edges.
 * @param {import('../../core/random.js').Rng} rng
 * @param {number} edgeY
 * @param {number} amplitude  how far (upwards) it may rise above edgeY
 * @param {number} [waves=3]
 * @returns {(x: number) => number}
 */
export function softRidge(rng, edgeY, amplitude, waves = 3) {
  const comps = Array.from({ length: waves }, (_, i) => ({
    k: Math.round(between(rng, 1, 3) * (i + 1)),    // integer number of periods per tile
    phase: rng() * TAU,
    weight: 1 / (i + 1),
  }));
  const total = comps.reduce((s, c) => s + c.weight, 0);
  return x => {
    const u = x / TILE_WIDTH;
    const envelope = Math.sin(Math.PI * u) ** 0.6;
    let v = 0;
    for (const c of comps) v += c.weight * (0.5 + 0.5 * Math.sin(TAU * c.k * u + c.phase));
    return edgeY - envelope * amplitude * (v / total);
  };
}

/**
 * Fills the area under a silhouette down to `bottom`.
 * @param {CanvasRenderingContext2D} c
 * @param {(x: number) => number} f
 * @param {number} bottom
 * @param {string | CanvasGradient} fill
 * @param {number} [step=16]
 */
export function fillUnder(c, f, bottom, fill, step = 16) {
  c.fillStyle = fill;
  c.beginPath();
  c.moveTo(0, bottom);
  for (let x = 0; x <= TILE_WIDTH; x += step) c.lineTo(x, f(x));
  c.lineTo(TILE_WIDTH, bottom);
  c.closePath();
  c.fill();
}

/**
 * A range of distant mountains with snow caps, inside the tile margins,
 * on top of a base strip at the edge height.
 * @param {CanvasRenderingContext2D} c
 * @param {PaintContext} p
 * @param {object} o
 * @param {number} o.count
 * @param {[number, number]} o.height   min/max height above the edge line
 * @param {[number, number]} o.width    min/max base width
 * @param {number} o.bottom
 * @param {number} [o.snowLine=0.38]    fraction of the height covered by snow
 */
export function drawMountainRange(c, p, o) {
  const { rng, pal } = p;
  const edge = EDGE_Y.far;
  c.fillStyle = pal.far;
  c.fillRect(0, edge, TILE_WIDTH, o.bottom - edge);
  const peaks = Array.from({ length: o.count }, () => {
    const w = between(rng, o.width[0], o.width[1]);
    return { w, h: between(rng, o.height[0], o.height[1]), x: between(rng, w / 2 + 10, TILE_WIDTH - w / 2 - 10) };
  }).sort((a, b) => b.h - a.h);    // tallest first, smaller ones in front
  for (const m of peaks) {
    const left = m.x - m.w / 2;
    const right = m.x + m.w / 2;
    const top = edge - m.h;
    const shoulder = between(rng, -0.12, 0.12) * m.w;
    // body: light face on the left, shaded face on the right
    c.fillStyle = pal.far;
    c.beginPath();
    c.moveTo(left, edge + 2);
    c.quadraticCurveTo(m.x - m.w * 0.22, top + m.h * 0.35, m.x, top);
    c.quadraticCurveTo(m.x + m.w * 0.22 + shoulder, top + m.h * 0.35, right, edge + 2);
    c.closePath();
    c.fill();
    c.fillStyle = pal.farShade;
    c.beginPath();
    c.moveTo(m.x, top);
    c.quadraticCurveTo(m.x + m.w * 0.22 + shoulder, top + m.h * 0.35, right, edge + 2);
    c.lineTo(m.x + m.w * 0.08, edge + 2);
    c.closePath();
    c.fill();
    // snow cap with a jagged lower edge
    const s = o.snowLine ?? 0.38;
    const capY = top + m.h * s;
    const capL = m.x - m.w * 0.5 * s * 0.8;
    const capR = m.x + m.w * 0.5 * s * 0.8;
    c.fillStyle = pal.farSnow;
    c.beginPath();
    c.moveTo(m.x, top);
    c.lineTo(capR, capY);
    const teeth = 4;
    for (let i = 1; i <= teeth; i++) {
      const x = capR + ((capL - capR) * i) / teeth;
      c.lineTo(x + (capL - capR) / teeth / 2, capY + (i % 2 ? m.h * 0.07 : -m.h * 0.02));
      c.lineTo(x, capY);
    }
    c.closePath();
    c.fill();
  }
}

/**
 * The near ground: a gentle surface at {@link NEAR_GROUND_Y} that fades into
 * the flat `groundDeep` colour, which continues below the tile.
 * @param {CanvasRenderingContext2D} c
 * @param {Palette} pal
 */
export function drawNearGround(c, pal) {
  const g = c.createLinearGradient(0, NEAR_GROUND_Y, 0, 860);
  g.addColorStop(0, pal.ground);
  g.addColorStop(1, pal.groundDeep);
  c.fillStyle = g;
  c.fillRect(0, NEAR_GROUND_Y, TILE_WIDTH, NEAR_TILE_BOTTOM - NEAR_GROUND_Y);
}

/**
 * Small tufts (grass in the lowlands, snow mounds when snowy) in front of the
 * track, so the foreground does not look empty.
 * @param {CanvasRenderingContext2D} c
 * @param {PaintContext} p
 * @param {number} count
 */
export function drawForegroundTufts(c, p, count) {
  const { rng, pal } = p;
  for (let i = 0; i < count; i++) {
    const x = between(rng, EDGE_MARGIN, TILE_WIDTH - EDGE_MARGIN);
    const y = between(rng, 830, 960);
    if (pal.snowy) {
      c.fillStyle = 'rgba(255,255,255,0.75)';
      c.beginPath();
      c.ellipse(x, y, between(rng, 26, 60), between(rng, 7, 12), 0, Math.PI, 0);
      c.fill();
    } else {
      c.strokeStyle = 'rgba(70,100,50,0.55)';
      c.lineWidth = 3;
      c.lineCap = 'round';
      c.beginPath();
      for (let k = -2; k <= 2; k++) {
        c.moveTo(x + k * 5, y);
        c.lineTo(x + k * 9, y - between(rng, 12, 22));
      }
      c.stroke();
    }
  }
}

/** House wall and roof colours of Romanian villages. */
export const WALLS = ['#f6e6c6', '#f3d3a8', '#eef1f5', '#f4dede', '#e6efd9', '#dfe9f4'];
export const ROOFS = ['#c8553d', '#a8443a', '#7a5a46', '#b0603e', '#5d6d7e'];
