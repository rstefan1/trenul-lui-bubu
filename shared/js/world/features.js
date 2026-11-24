/**
 * @file Things built along the railway: stations, viaducts, bridges and
 * tunnels.
 *
 * Features live in world coordinates (distance along the route, in
 * near-layer units) and are drawn in three passes, so they interleave
 * correctly with the train:
 *
 *   back   — in the near layer, behind the train: station buildings, the
 *            valleys and arches under viaducts and bridges, the hill a
 *            tunnel goes through;
 *   front  — in front of the train: the part of a tunnel's mountain that
 *            hides the train, and the near side of a bridge's truss;
 *   lights — untinted glow at night: station lamps and windows.
 *
 * Viaducts and bridges also cut a hole in the near layer above the valley
 * (see {@link TrackFeatures#addHoles}) and ask the camera to rise so the
 * valley below can be seen.
 */

import { TAU, clamp, lerp, smoothstep } from '../core/math.js';
import { createRng, between } from '../core/random.js';
import { hexToRgb, css, mixRgb } from '../gfx/color.js';
import { drawFir, fillRoundRect, glow, lightWindows } from '../gfx/shapes.js';
import { NEAR_GROUND_Y, paletteFor } from './biomes/terrain.js';
import { TRACK_Y, screenX } from './track.js';
import { devaLayout, drawDevaFortress, drawDevaTorches } from '../gfx/scenes/deva-fortress.js';

/**
 * @typedef {object} StationFeature
 * @property {'station'} type
 * @property {number} x       world position of the front of the train when stopped
 * @property {string} name
 * @property {'large' | 'small'} size
 * @property {number} seed
 * @property {{kind: string, litFlag?: string}} [backdrop]
 *
 * @typedef {object} SpanFeature
 * @property {'viaduct' | 'bridge' | 'tunnel'} type
 * @property {number} x0      world position of the start
 * @property {number} x1      world position of the end
 * @property {number} depth   depth of the valley (viaduct/bridge)
 * @property {number} seed
 *
 * @typedef {StationFeature | SpanFeature} Feature
 */

/**
 * @typedef {object} FeatureView
 * @property {number} distance
 * @property {number} anchorX
 * @property {number} cover
 * @property {number} left
 * @property {number} right
 * @property {number} bottom      lowest row to paint (stage units, camera included)
 * @property {number} bubuOffset  train x of Bubu's window (negative)
 * @property {number} time
 * @property {ReadonlySet<string>} flags   what the player changed in the world
 */

/** How far a station reaches on both sides of its centre. */
const STATION_HALF = 460;
/** Top of a tunnel tube (just above the pantograph). */
const TUBE_TOP = TRACK_Y - 268;

const GROUND_TOP = [hexToRgb(paletteFor(false).ground), hexToRgb(paletteFor(true).ground)];
const GROUND_DEEP = [hexToRgb(paletteFor(false).groundDeep), hexToRgb(paletteFor(true).groundDeep)];
const VALLEY_BARE = hexToRgb('#7f9d68');
const VALLEY_SNOWY = hexToRgb('#c8d6ea');
const ROCK_BARE = hexToRgb('#8d7f6e');
const ROCK_SNOWY = hexToRgb('#a7a6b0');

export class TrackFeatures {
  /** @param {Feature[]} features */
  constructor(features) {
    this.features = features;
  }

  /**
   * Features (partly) visible on screen.
   * @param {FeatureView} v
   * @returns {Feature[]}
   */
  visible(v) {
    const lo = v.distance - v.anchorX + v.left - 600;
    const hi = v.distance - v.anchorX + v.right + 600;
    return this.features.filter(f => (f.type === 'station'
      ? f.x + v.bubuOffset + STATION_HALF > lo && f.x + v.bubuOffset - STATION_HALF < hi
      : f.x1 > lo && f.x0 < hi));
  }

  /**
   * Adds the valley openings to a clip path (evenodd), so the near tiles are
   * not drawn above the valleys.
   * @param {CanvasRenderingContext2D} c
   * @param {FeatureView} v
   */
  addHoles(c, v) {
    for (const f of this.visible(v)) {
      if (f.type === 'viaduct' || f.type === 'bridge') {
        const x0 = screenX(v, f.x0);
        c.rect(x0, 300, screenX(v, f.x1) - x0, v.bottom - 300 + 400);
      }
    }
  }

  /**
   * The camera rises over deep valleys so that they can be admired.
   * @param {number} distance  position of the front of the train
   * @param {number} trainLength
   * @returns {number} desired camera lift
   */
  cameraLift(distance, trainLength) {
    let lift = 0;
    for (const f of this.features) {
      if (f.type !== 'viaduct') continue;
      const mid = distance - trainLength * 0.45;   // the middle of the train
      const k = smoothstep(f.x0 - 500, f.x0 + 150, mid) * (1 - smoothstep(f.x1 - 150, f.x1 + 500, mid));
      lift = Math.max(lift, k * f.depth * 0.62);
    }
    return lift;
  }

  /**
   * How much of the train is inside a tunnel, for the lights.
   * @param {number} distance     front of the train
   * @param {number} trainLength
   * @returns {{front: number, any: boolean}}  front = 1 when the locomotive is inside
   */
  tunnelState(distance, trainLength) {
    let front = 0;
    let any = false;
    for (const f of this.features) {
      if (f.type !== 'tunnel') continue;
      if (distance > f.x0 && distance - trainLength < f.x1) any = true;
      if (distance > f.x0 - 30 && distance < f.x1 + 60) front = 1;
    }
    return { front, any };
  }

  /**
   * What the locomotive is running through, for the sound of the train.
   * @param {number} distance  front of the train
   * @returns {'tunnel' | 'bridge' | 'open'}
   */
  placeAt(distance) {
    for (const f of this.features) {
      if (f.type === 'station' || distance < f.x0 || distance > f.x1) continue;
      return f.type === 'tunnel' ? 'tunnel' : 'bridge';
    }
    return 'open';
  }

  /**
   * Where the next tunnel ahead begins (∞ if there is none).
   * @param {number} distance
   */
  nextTunnel(distance) {
    let next = Infinity;
    for (const f of this.features) if (f.type === 'tunnel' && f.x0 > distance) next = Math.min(next, f.x0);
    return next;
  }

  /**
   * Screen rectangles of the tunnel tubes on screen (for clipping lights).
   * @param {FeatureView} v
   * @returns {Array<[number, number, number, number]>}
   */
  tubes(v) {
    return this.visible(v)
      .filter(f => f.type === 'tunnel')
      .map(f => {
        const s = /** @type {SpanFeature} */ (f);
        const x0 = screenX(v, s.x0);
        return [x0, TUBE_TOP, screenX(v, s.x1) - x0, TRACK_Y + 28 - TUBE_TOP];
      });
  }

  /** @param {CanvasRenderingContext2D} c @param {FeatureView} v */
  drawBack(c, v) {
    // landmarks behind stations first (they are far away)
    for (const f of this.features) {
      if (f.type === 'station' && f.backdrop) drawBackdrop(c, v, f, false);
    }
    for (const f of this.visible(v)) {
      if (f.type === 'station') drawStation(c, v, f, false);
      else if (f.type === 'viaduct') drawValley(c, v, f, 'viaduct');
      else if (f.type === 'bridge') drawValley(c, v, f, 'bridge');
      else if (f.type === 'tunnel') drawTunnelHill(c, v, f);
    }
  }

  /** @param {CanvasRenderingContext2D} c @param {FeatureView} v */
  /**
   * Is anything drawn in front of the train now (a tunnel's mountain, a
   * bridge's truss)? If not, the front pass can be skipped.
   * @param {FeatureView} v
   */
  hasFront(v) {
    return this.visible(v).some(f => f.type === 'tunnel' || f.type === 'bridge');
  }

  drawFront(c, v) {
    for (const f of this.visible(v)) {
      if (f.type === 'tunnel') drawTunnelFront(c, v, f);
      else if (f.type === 'bridge') drawTruss(c, screenX(v, f.x0), screenX(v, f.x1), true);
    }
  }

  /** @param {CanvasRenderingContext2D} c @param {FeatureView} v */
  drawLights(c, v) {
    for (const f of this.features) {
      if (f.type === 'station' && f.backdrop) drawBackdrop(c, v, f, true);
    }
    for (const f of this.visible(v)) {
      if (f.type === 'station') drawStation(c, v, f, true);
    }
  }

  /**
   * True where no catenary mast should stand (inside tunnels and stations'
   * buildings would look odd with a mast in front of the name).
   * @param {number} worldX
   * @param {number} bubuOffset
   */
  blocksMast(worldX, bubuOffset) {
    return this.features.some(f => (f.type === 'tunnel'
      ? worldX > f.x0 - 40 && worldX < f.x1 + 40
      : f.type === 'station' && Math.abs(worldX - (f.x + bubuOffset)) < 300));
  }
}

// ------------------------------------------------------------------ valleys

/**
 * Ground profile across a valley: the ground line outside, `depth` lower in
 * the middle, with smooth slopes.
 * @param {number} u      0..1 across the span
 * @param {number} depth
 */
function valleyGround(u, depth) {
  const k = smoothstep(0, 0.28, u) * (1 - smoothstep(0.72, 1, u));
  return NEAR_GROUND_Y + depth * k;
}

/**
 * The valley under a viaduct or a bridge, with the structure carrying the
 * track.
 * @param {CanvasRenderingContext2D} c
 * @param {FeatureView} v
 * @param {SpanFeature} f
 * @param {'viaduct' | 'bridge'} kind
 */
function drawValley(c, v, f, kind) {
  const x0 = screenX(v, f.x0);
  const x1 = screenX(v, f.x1);
  const w = x1 - x0;
  const depth = f.depth;
  // the same gradient as the near tiles, so the slopes join the ground seamlessly
  const ground = c.createLinearGradient(0, NEAR_GROUND_Y, 0, 860);
  ground.addColorStop(0, css(mixRgb(GROUND_TOP[0], GROUND_TOP[1], v.cover)));
  ground.addColorStop(1, css(mixRgb(GROUND_DEEP[0], GROUND_DEEP[1], v.cover)));
  const rng = createRng(f.seed);

  // 1. the far side of the valley, seen through the opening
  const far = c.createLinearGradient(0, NEAR_GROUND_Y, 0, NEAR_GROUND_Y + depth + 60);
  far.addColorStop(0, css(mixRgb(VALLEY_BARE, VALLEY_SNOWY, v.cover)));
  far.addColorStop(1, css(mixRgb(mixRgb(VALLEY_BARE, [40, 70, 60], 0.4), mixRgb(VALLEY_SNOWY, [120, 140, 175], 0.4), v.cover)));
  c.fillStyle = far;
  c.fillRect(x0, NEAR_GROUND_Y - 2, w, v.bottom - NEAR_GROUND_Y + 2);
  // distant firs on the far slope
  for (let i = 0; i < w / 26; i++) {
    const x = x0 + between(rng, 0.12, 0.88) * w;
    const y = NEAR_GROUND_Y + between(rng, 10, depth * 0.85);
    drawFir(c, x, y, between(rng, 28, 46), { color: '#4d7d68', shade: '#41705c', snowy: v.cover > 0.5 });
  }

  // 2. what stands in the valley (its feet are then hidden by the ground)
  if (kind === 'viaduct') drawArches(c, x0, x1, depth, v.cover);
  else drawAbutments(c, x0, x1, depth);

  // 3. the near slopes and the valley floor
  c.fillStyle = ground;
  c.beginPath();
  c.moveTo(x0 - 1, v.bottom);
  for (let i = 0; i <= 40; i++) {
    const u = i / 40;
    c.lineTo(x0 + u * w, valleyGround(u, depth));
  }
  c.lineTo(x1 + 1, v.bottom);
  c.closePath();
  c.fill();

  // 4. the river at the bottom (frozen at the edges when snowy)
  const ry = NEAR_GROUND_Y + depth;
  const rw = kind === 'bridge' ? w * 0.42 : w * 0.24;
  c.fillStyle = '#4f86c0';
  c.beginPath();
  c.ellipse(x0 + w / 2, ry + 4, rw / 2, 12, 0, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = 'rgba(255,255,255,0.5)';
  c.fillRect(x0 + w / 2 - rw * 0.25, ry + 1, rw * 0.2, 3);
  if (v.cover > 0.5) {
    c.fillStyle = 'rgba(235,245,255,0.85)';
    c.beginPath();
    c.ellipse(x0 + w / 2 - rw * 0.32, ry + 4, rw * 0.16, 7, 0, 0, Math.PI * 2);
    c.ellipse(x0 + w / 2 + rw * 0.3, ry + 5, rw * 0.12, 6, 0, 0, Math.PI * 2);
    c.fill();
  }

  if (kind === 'bridge') {
    drawGirder(c, x0, x1);
    drawTruss(c, x0, x1, false);
  }

  // 5. firs on the near slopes
  for (const side of [0, 1]) {
    for (let i = 0; i < 4; i++) {
      const u = side ? between(rng, 0.74, 0.95) : between(rng, 0.05, 0.26);
      const x = x0 + u * w;
      drawFir(c, x, valleyGround(u, depth) + 4, between(rng, 60, 110), { snowy: v.cover > 0.5 });
    }
  }

  // 6. big firs standing on both rims: the ground beside the track is cut
  //    straight down at the edges of the valley (see addHoles), and these
  //    hide the cut, so no tree of the landscape is ever seen cut in half
  for (const edge of [x0, x1]) {
    for (const dx of [-34, 26]) {
      drawFir(c, edge + dx + between(rng, -6, 6), NEAR_GROUND_Y + 8, between(rng, 262, 290), { snowy: v.cover > 0.5 });
    }
  }
}

/**
 * Stone arches from the deck down into the valley (evenodd fill: the
 * openings are holes in one big shape).
 * @param {CanvasRenderingContext2D} c
 * @param {number} x0
 * @param {number} x1
 * @param {number} depth
 * @param {number} cover
 */
function drawArches(c, x0, x1, depth, cover) {
  const deckTop = TRACK_Y + 6;
  const w = x1 - x0;
  const spans = Math.max(3, Math.round(w / 120));
  const span = w / spans;
  const pier = Math.min(26, span * 0.24);
  const bottom = NEAR_GROUND_Y + depth + 30;

  c.fillStyle = '#c2ab8e';
  c.beginPath();
  c.rect(x0, deckTop, w, bottom - deckTop);
  for (let i = 0; i < spans; i++) {
    const left = x0 + i * span + pier / 2;
    const right = x0 + (i + 1) * span - pier / 2;
    const r = (right - left) / 2;
    const spring = deckTop + 34 + r;
    c.moveTo(left, bottom + 10);
    c.lineTo(left, spring);
    c.arc(left + r, spring, r, Math.PI, 0);
    c.lineTo(right, bottom + 10);
    c.closePath();
  }
  c.fill('evenodd');
  // shading of the piers and a cornice under the track
  c.fillStyle = 'rgba(0,0,0,0.12)';
  for (let i = 0; i < spans; i++) {
    const px = x0 + i * span;
    c.fillRect(px, deckTop + 34, pier / 2, bottom - deckTop);
  }
  c.fillStyle = '#a8927a';
  c.fillRect(x0 - 6, deckTop, w + 12, 12);
  if (cover > 0.3) {
    c.fillStyle = `rgba(244,248,255,${clamp(cover, 0, 1)})`;
    c.fillRect(x0 - 6, deckTop - 2, w + 12, 5);
  }
  // parapet
  c.fillStyle = '#b39c82';
  c.fillRect(x0 - 6, TRACK_Y - 16, w + 12, 8);
}

/**
 * Stone abutments at both ends of a bridge.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x0
 * @param {number} x1
 * @param {number} depth
 */
function drawAbutments(c, x0, x1, depth) {
  const top = TRACK_Y + 8;
  c.fillStyle = '#b8a48a';
  c.fillRect(x0, top, 44, NEAR_GROUND_Y + depth - top);
  c.fillRect(x1 - 44, top, 44, NEAR_GROUND_Y + depth - top);
  c.fillStyle = 'rgba(0,0,0,0.12)';
  c.fillRect(x0 + 30, top, 14, NEAR_GROUND_Y + depth - top);
  c.fillRect(x1 - 14, top, 14, NEAR_GROUND_Y + depth - top);
}

/**
 * The deck of a bridge: a steel beam under the rails.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x0
 * @param {number} x1
 */
function drawGirder(c, x0, x1) {
  c.fillStyle = '#3f5b5a';
  c.fillRect(x0, TRACK_Y + 8, x1 - x0, 22);
  c.fillStyle = '#4f6d6b';
  c.fillRect(x0, TRACK_Y + 8, x1 - x0, 5);
}

/** Height of a bridge's truss above the rails. */
const TRUSS_H = 205;

/**
 * The steel truss of a bridge, above the rails (the train runs inside it).
 * Drawn twice: the far side behind the train, darker; the near side in front
 * of it with thin bars, so the train is still seen between them.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x0
 * @param {number} x1
 * @param {boolean} near
 */
function drawTruss(c, x0, x1, near) {
  const bottom = TRACK_Y - 4;
  const top = TRACK_Y - TRUSS_H;
  const end = 60;                                    // the sloping end posts
  c.strokeStyle = near ? '#4f6d6b' : '#2f4544';
  c.lineWidth = near ? 6 : 8;
  c.lineJoin = 'round';
  c.beginPath();
  // chords and end posts
  c.moveTo(x0, bottom);
  c.lineTo(x0 + end, top);
  c.lineTo(x1 - end, top);
  c.lineTo(x1, bottom);
  // zig-zag between the chords
  const n = Math.max(3, Math.round((x1 - x0 - 2 * end) / 70));
  const step = (x1 - x0 - 2 * end) / n;
  for (let i = 0; i < n; i++) {
    const a = x0 + end + i * step;
    c.moveTo(a, top);
    c.lineTo(a + step / 2, bottom);
    c.lineTo(a + step, top);
  }
  c.stroke();
  if (!near) {
    c.fillStyle = '#2f4544';
    c.fillRect(x0, bottom - 4, x1 - x0, 8);
  }
}

// ------------------------------------------------------------------ tunnels

/** How far a tunnel's mountain reaches beyond the portals. */
const MOUNTAIN_SKIRT = 420;
/** A portal seen from the side: thickness of its stone head wall and its top. */
const PORTAL_THICK = 46;
const PORTAL_TOP = TUBE_TOP - 46;

/**
 * Height of the mountain a tunnel goes through: a big rounded massif with a
 * few peaks of its own, so a long tunnel does not look like a flat wall.
 * @param {number} u     0..1 along the whole mountain (skirts included)
 * @param {number} span  length of the tunnel
 * @param {number} seed
 */
function mountainTop(u, span, seed) {
  const k = clamp(u, 0, 1);
  const total = span + 2 * MOUNTAIN_SKIRT;
  const fromEnd = Math.min(k, 1 - k) * total;          // distance to the nearest foot
  const rise = Math.sin((Math.PI / 2) * Math.min(1, fromEnd / 520));
  const height = 330 + Math.min(260, span * 0.08);
  const peaks = Math.max(1, Math.round(span / 1400));
  const ridge = 0.86 + 0.14 * Math.cos(TAU * peaks * k + (seed % 6)) + 0.05 * Math.sin(37 * k + (seed % 5));
  return NEAR_GROUND_Y - height * rise * ridge;
}

/**
 * Path of the mountain's outline between two screen x values (inclusive),
 * closed down to a given bottom.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x0  left end of the mountain
 * @param {number} x1  right end of the mountain
 * @param {number} from
 * @param {number} to
 * @param {number} bottom
 * @param {SpanFeature} f
 * @param {number} [dy=0]  offset of the outline (for the snow cap)
 */
function mountainPath(c, x0, x1, from, to, bottom, f, dy = 0) {
  const span = f.x1 - f.x0;
  c.moveTo(from, bottom);
  for (const x of outlineXs(x0, from, to)) c.lineTo(x, mountainTop((x - x0) / (x1 - x0), span, f.seed) + dy);
  c.lineTo(to, bottom);
  c.closePath();
}

/** Spacing of the points of a mountain's outline (stage units). */
const OUTLINE_STEP = 24;

/**
 * The x values at which a mountain's outline is drawn between `from` and
 * `to`: always the same points of the mountain (counted from its foot x0),
 * so the outline does not shimmer while the mountain scrolls by.
 * @param {number} x0
 * @param {number} from
 * @param {number} to
 * @returns {number[]}
 */
function outlineXs(x0, from, to) {
  const xs = [from];
  for (let n = Math.ceil((from - x0) / OUTLINE_STEP); x0 + n * OUTLINE_STEP < to; n++) {
    const x = x0 + n * OUTLINE_STEP;
    if (x > from) xs.push(x);
  }
  xs.push(to);
  return xs;
}

/**
 * The mountain behind the track, with the arched mouths of the tunnel at
 * both ends: the train passes in front of the mouth and then disappears
 * behind the front part of the mountain.
 * @param {CanvasRenderingContext2D} c
 * @param {FeatureView} v
 * @param {SpanFeature} f
 */
function drawTunnelHill(c, v, f) {
  const p0 = screenX(v, f.x0);
  const p1 = screenX(v, f.x1);
  const x0 = p0 - MOUNTAIN_SKIRT;
  const x1 = p1 + MOUNTAIN_SKIRT;
  const from = Math.max(x0, v.left - 30);
  const to = Math.min(x1, v.right + 30);
  if (to <= from) return;
  c.fillStyle = rockColor(v, 1);
  c.beginPath();
  mountainPath(c, x0, x1, from, to, NEAR_GROUND_Y + 30, f);
  c.fill();
  drawMountainDressing(c, v, f, x0, x1, from, to, 1);
  drawPortal(c, v, p0, 1, 'back');
  drawPortal(c, v, p1, -1, 'back');
}

/**
 * Colour of the mountain's rock (lighter with snow), slightly darker behind.
 * @param {FeatureView} v
 * @param {number} shade  1 = full brightness
 */
function rockColor(v, shade) {
  const rgb = mixRgb(ROCK_BARE, ROCK_SNOWY, v.cover * 0.5);
  return css(/** @type {[number, number, number]} */ (rgb.map(ch => ch * shade)));
}

/**
 * Rocky crags, the snow cap and firs on a tunnel's mountain.
 * @param {CanvasRenderingContext2D} c
 * @param {FeatureView} v
 * @param {SpanFeature} f
 * @param {number} x0
 * @param {number} x1
 * @param {number} from  visible part
 * @param {number} to
 * @param {number} shade
 */
function drawMountainDressing(c, v, f, x0, x1, from, to, shade) {
  const span = f.x1 - f.x0;
  const top = (/** @type {number} */ x) => mountainTop((x - x0) / (x1 - x0), span, f.seed);
  const rng = createRng(f.seed);
  // darker crags: triangles of rock along the slopes
  c.fillStyle = rockColor(v, shade * 0.82);
  const crags = Math.floor((x1 - x0) / 120);
  for (let i = 0; i < crags; i++) {
    const x = x0 + between(rng, 0.06, 0.94) * (x1 - x0);
    const w = between(rng, 50, 120);
    const depth = between(rng, 40, 170);
    if (x + w < from || x - w > to) continue;
    const y = top(x) + depth;
    if (y > NEAR_GROUND_Y - 40) continue;
    c.beginPath();
    c.moveTo(x - w / 2, y + w * 0.5);
    c.lineTo(x - w * 0.1, y);
    c.lineTo(x + w * 0.15, y + 8);
    c.lineTo(x + w / 2, y + w * 0.5);
    c.closePath();
    c.fill();
  }
  // the snow cap along the ridge
  if (v.cover > 0.05) {
    c.fillStyle = `rgba(244,248,255,${v.cover})`;
    c.beginPath();
    const xs = outlineXs(x0, from, to);
    for (const x of xs) c.lineTo(x, top(x) - 2);
    for (let i = xs.length - 1; i >= 0; i--) c.lineTo(xs[i], top(xs[i]) + 22 + 10 * Math.sin((xs[i] - x0) * 0.05 + f.seed));
    c.closePath();
    c.fill();
  }
  // firs on the lower slopes
  const firs = Math.floor((x1 - x0) / 70);
  for (let i = 0; i < firs; i++) {
    const x = x0 + between(rng, 0.04, 0.96) * (x1 - x0);
    const along = between(rng, 0.25, 0.85);
    const size = between(rng, 60, 105);
    if (x < from - 60 || x > to + 60) continue;
    const y = lerp(top(x) + 40, NEAR_GROUND_Y + 10, along);
    drawFir(c, x, y, size * (0.7 + 0.3 * along), { snowy: v.cover > 0.5 });
  }
}

/**
 * A tunnel portal seen in profile, as the train sees it from the side: a
 * stone head wall standing against the mountain, a little taller than the
 * train, with a cornice on top and a sloping wing wall holding the slope.
 * @param {CanvasRenderingContext2D} c
 * @param {FeatureView} v
 * @param {number} px    screen x of the tunnel's end
 * @param {1 | -1} dir   1 = the mountain is to the right (entrance), -1 = exit
 * @param {'back' | 'front'} part  behind the train (wing wall) or in front (head wall)
 */
function drawPortal(c, v, px, dir, part) {
  if (px < v.left - 200 || px > v.right + 200) return;
  const ground = TRACK_Y + 30;
  const outer = px - dir * 12;                     // face towards the open line
  const inner = outer + dir * PORTAL_THICK;
  const left = Math.min(outer, inner);
  if (part === 'back') {
    drawWingWall(c, outer, dir, NEAR_GROUND_Y + 10);
    return;
  }
  drawHeadWall(c, v, left, inner, dir, ground);
}

/**
 * The wing wall behind the track: a stone slope from the top of the portal
 * down to the ground, holding the mountain's side.
 * @param {CanvasRenderingContext2D} c
 * @param {number} outer
 * @param {1 | -1} dir
 * @param {number} ground
 */
function drawWingWall(c, outer, dir, ground) {
  c.fillStyle = '#9d8d79';
  c.beginPath();
  c.moveTo(outer, PORTAL_TOP + 30);
  c.lineTo(outer - dir * 120, ground);
  c.lineTo(outer, ground);
  c.closePath();
  c.fill();
  c.strokeStyle = 'rgba(70,55,40,0.3)';
  c.lineWidth = 2;
  c.beginPath();
  for (let k = 1; k < 5; k++) {
    const y = PORTAL_TOP + 30 + (ground - PORTAL_TOP - 30) * (k / 5);
    c.moveTo(outer, y);
    c.lineTo(outer - dir * 120 * (k / 5), y);
  }
  c.stroke();
}

/**
 * The portal's head wall in front of the train, seen from the side.
 * @param {CanvasRenderingContext2D} c
 * @param {FeatureView} v
 * @param {number} left
 * @param {number} inner
 * @param {1 | -1} dir
 * @param {number} ground
 */
function drawHeadWall(c, v, left, inner, dir, ground) {
  // the head wall, with a darker edge where the tunnel opens behind it
  fillRoundRect(c, left, PORTAL_TOP, PORTAL_THICK, ground - PORTAL_TOP, 4, '#b7a58e');
  c.fillStyle = 'rgba(40,30,25,0.35)';
  c.fillRect(dir === 1 ? inner - 8 : inner, PORTAL_TOP + 16, 8, ground - PORTAL_TOP - 16);
  c.strokeStyle = 'rgba(70,55,40,0.3)';
  c.beginPath();
  for (let y = PORTAL_TOP + 40, row = 0; y < ground; y += 34, row++) {
    c.moveTo(left, y);
    c.lineTo(left + PORTAL_THICK, y);
    const jx = left + (row % 2 ? PORTAL_THICK * 0.35 : PORTAL_THICK * 0.65);
    c.moveTo(jx, y);
    c.lineTo(jx, y - 34);
  }
  c.stroke();
  // the cornice, overhanging a little on both sides, with snow on it
  c.fillStyle = '#968470';
  c.fillRect(left - 10, PORTAL_TOP - 14, PORTAL_THICK + 20, 18);
  if (v.cover > 0.3) {
    c.fillStyle = `rgba(244,248,255,${v.cover})`;
    fillRoundRect(c, left - 13, PORTAL_TOP - 22, PORTAL_THICK + 26, 10, 5, c.fillStyle);
  }
}

/**
 * The part of the mountain in front of the train: between the portals it
 * hides the train completely; at each end a stone pillar closes the arch.
 * @param {CanvasRenderingContext2D} c
 * @param {FeatureView} v
 * @param {SpanFeature} f
 */
function drawTunnelFront(c, v, f) {
  const p0 = screenX(v, f.x0);
  const p1 = screenX(v, f.x1);
  const x0 = p0 - MOUNTAIN_SKIRT;
  const x1 = p1 + MOUNTAIN_SKIRT;
  const from = Math.max(p0, v.left - 30);
  const to = Math.min(p1, v.right + 30);
  if (to > from) {
    c.fillStyle = rockColor(v, 1);
    c.beginPath();
    mountainPath(c, x0, x1, from, to, TRACK_Y + 30, f);
    c.fill();
    c.save();
    c.beginPath();
    c.rect(from, 0, to - from, TRACK_Y + 40);
    c.clip();
    drawMountainDressing(c, v, f, x0, x1, from, to, 1);
    // the foot of the mountain over the rails
    c.fillStyle = rockColor(v, 0.9);
    c.fillRect(from, TRACK_Y - 6, to - from, 36);
    if (v.cover > 0.3) {
      c.fillStyle = `rgba(244,248,255,${v.cover * 0.8})`;
      c.fillRect(from, TRACK_Y - 10, to - from, 6);
    }
    c.restore();
  }
  drawPortal(c, v, p0, 1, 'front');
  drawPortal(c, v, p1, -1, 'front');
}

// ------------------------------------------------------------------ stations

/**
 * A station: building with the name on its façade, platform, lamps.
 * Drawn twice: once normally (lights = false) and once for the night glow.
 * @param {CanvasRenderingContext2D} c
 * @param {FeatureView} v
 * @param {StationFeature} f
 * @param {boolean} lights
 */
function drawStation(c, v, f, lights) {
  const cx = screenX(v, f.x + v.bubuOffset);
  const large = f.size === 'large';
  const w = large ? 560 : 360;
  const wallTop = large ? 505 : 535;
  const g = NEAR_GROUND_Y;
  const left = cx - w / 2;
  /** @type {Array<[number, number, number, number]>} */
  const windows = [];
  const floors = large ? 2 : 1;
  const floorH = (g - wallTop) / (floors + 0.4);
  for (let fl = 0; fl < floors; fl++) {
    const y = wallTop + 54 + fl * floorH;
    for (let x = left + 40; x < left + w - 60; x += 70) {
      if (Math.abs(x + 18 - cx) < 30 && fl === floors - 1) continue;   // the door
      windows.push([x, y, 36, Math.min(56, floorH * 0.55)]);
    }
  }
  const lampXs = [cx - STATION_HALF + 60, cx - 150, cx + 150, cx + STATION_HALF - 60];

  if (lights) {
    lightWindows(c, windows.filter((_, i) => i % 3 !== 1), 0.9);
    for (const lx of lampXs) {
      glow(c, lx, g - 112, 80, 'rgba(255,220,130,0.6)', 'rgba(255,220,130,0)');
      c.fillStyle = '#fff3c0';
      c.fillRect(lx - 9, g - 118, 18, 9);
    }
    return;
  }

  // platform (behind the track)
  c.fillStyle = '#b9bcc4';
  c.fillRect(cx - STATION_HALF, g - 6, STATION_HALF * 2, TRACK_Y - g);
  c.fillStyle = '#e8c547';
  c.fillRect(cx - STATION_HALF, TRACK_Y - 12, STATION_HALF * 2, 4);
  if (v.cover > 0.3) {
    c.fillStyle = `rgba(244,248,255,${v.cover * 0.8})`;
    c.fillRect(cx - STATION_HALF, g - 8, STATION_HALF * 2, 6);
  }

  // building
  c.fillStyle = '#f2e3c4';
  c.fillRect(left, wallTop, w, g - wallTop);
  c.fillStyle = 'rgba(0,0,0,0.06)';
  c.fillRect(left, wallTop, w, 16);
  c.fillStyle = '#d9c39c';
  c.fillRect(left, g - 26, w, 26);
  // roof
  c.fillStyle = '#b5523b';
  c.beginPath();
  c.moveTo(left - 20, wallTop);
  c.lineTo(left + 50, wallTop - (large ? 70 : 80));
  c.lineTo(left + w - 50, wallTop - (large ? 70 : 80));
  c.lineTo(left + w + 20, wallTop);
  c.closePath();
  c.fill();
  if (v.cover > 0.2) {
    c.fillStyle = `rgba(244,248,255,${v.cover})`;
    c.beginPath();
    c.moveTo(left + 30, wallTop - (large ? 58 : 66));
    c.lineTo(left + 50, wallTop - (large ? 70 : 80));
    c.lineTo(left + w - 50, wallTop - (large ? 70 : 80));
    c.lineTo(left + w - 30, wallTop - (large ? 58 : 66));
    c.closePath();
    c.fill();
  }
  if (large) {
    // central tower with a clock
    c.fillStyle = '#f2e3c4';
    c.fillRect(cx - 50, wallTop - 120, 100, 120);
    c.fillStyle = '#b5523b';
    c.beginPath();
    c.moveTo(cx - 62, wallTop - 120);
    c.lineTo(cx, wallTop - 175);
    c.lineTo(cx + 62, wallTop - 120);
    c.closePath();
    c.fill();
    c.fillStyle = '#fffaf0';
    c.beginPath();
    c.arc(cx, wallTop - 70, 26, 0, Math.PI * 2);
    c.fill();
    c.strokeStyle = '#3b4250';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(cx, wallTop - 70);
    c.lineTo(cx, wallTop - 88);
    c.moveTo(cx, wallTop - 70);
    c.lineTo(cx + 12, wallTop - 70);
    c.stroke();
  }
  for (const [x, y, ww, wh] of windows) {
    c.fillStyle = '#5b7aa6';
    c.beginPath();
    c.moveTo(x, y + wh);
    c.lineTo(x, y + 10);
    c.arc(x + ww / 2, y + 10, ww / 2, Math.PI, 0);
    c.lineTo(x + ww, y + wh);
    c.closePath();
    c.fill();
  }
  // the name, on a blue board on the façade (like real Romanian stations)
  drawNameBoard(c, cx, wallTop + 6, f.name, large ? 1 : 0.86);

  // lamps on the platform
  for (const lx of lampXs) {
    c.fillStyle = '#4a5568';
    c.fillRect(lx - 3, g - 112, 6, 112);
    c.fillRect(lx - 12, g - 120, 24, 6);
  }
}

/**
 * @param {CanvasRenderingContext2D} c
 * @param {number} cx
 * @param {number} top
 * @param {string} name
 * @param {number} scale
 */
function drawNameBoard(c, cx, top, name, scale) {
  c.save();
  c.font = `800 ${Math.round(30 * scale)}px "Baloo 2", system-ui, sans-serif`;
  const tw = c.measureText(name).width;
  const w = tw + 40 * scale;
  const h = 42 * scale;
  fillRoundRect(c, cx - w / 2, top, w, h, 8, '#ffffff');
  fillRoundRect(c, cx - w / 2 + 4, top + 4, w - 8, h - 8, 6, '#1f4f9c');
  c.fillStyle = '#ffffff';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(name, cx, top + h / 2 + 2 * scale);
  c.restore();
}

// ------------------------------------------------------------------ landmarks behind stations

/** The fortress drawings are made for this stage width (see devaLayout). */
const DEVA = devaLayout(1600);
/** Landmarks are far away: they slide by slower than the station. */
const BACKDROP_PARALLAX = 0.45;

/**
 * A landmark on a hill behind a station (for now: the Deva fortress). Its
 * torches burn once the player has lit them in the station's mission.
 * Drawn twice: the hill and walls in the tinted pass, the flames in the
 * lights pass.
 * @param {CanvasRenderingContext2D} c
 * @param {FeatureView} v
 * @param {StationFeature} f
 * @param {boolean} lights
 */
function drawBackdrop(c, v, f, lights) {
  const b = /** @type {{kind: string, litFlag?: string}} */ (f.backdrop);
  if (b.kind !== 'deva-fortress') return;
  // where the fortress stands when the train is stopped: to the right of the station
  const cx = (f.x - v.distance) * BACKDROP_PARALLAX + v.anchorX + v.bubuOffset + 330;
  if (cx < v.left - 500 || cx > v.right + 500) return;
  const lit = !!(b.litFlag && v.flags.has(b.litFlag));
  const k = 0.5;                       // scale of the fortress
  const base = NEAR_GROUND_Y - 300;    // foot of the walls, on top of the hill

  // the hill has a wide flat top, so the whole fortress stands on it
  const plateau = 230;
  const slope = 480;
  const hillY = (/** @type {number} */ x) => {
    const d = Math.max(0, Math.abs(x - cx) - plateau) / slope;
    return base + (NEAR_GROUND_Y + 4 - base) * smoothstep(0, 1, d);
  };

  c.save();
  if (!lights) {
    c.fillStyle = css(mixRgb(GROUND_TOP[0], GROUND_TOP[1], v.cover));
    c.beginPath();
    c.moveTo(cx - plateau - slope - 10, NEAR_GROUND_Y + 6);
    for (let x = cx - plateau - slope; x <= cx + plateau + slope; x += 12) c.lineTo(x, hillY(x));
    c.lineTo(cx + plateau + slope + 10, NEAR_GROUND_Y + 6);
    c.closePath();
    c.fill();
    // rocks where the walls meet the hill
    c.fillStyle = css(mixRgb(ROCK_BARE, ROCK_SNOWY, v.cover * 0.5));
    for (const dx of [-plateau + 10, -120, 40, plateau - 30]) {
      c.beginPath();
      c.ellipse(cx + dx, base + 10, 34, 14, 0, Math.PI, 0);
      c.fill();
    }
    // firs on the slopes, below the walls
    for (let i = 0; i < 10; i++) {
      const side = i % 2 ? 1 : -1;
      const x = cx + side * (plateau + 30 + (i >> 1) * 85);
      drawFir(c, x, hillY(x) + 26, 44 + (i % 3) * 10, { snowy: v.cover > 0.5 });
    }
  }
  c.translate(cx, base + 8);     // the foot of the walls sits a little in the ground
  c.scale(k, k);
  c.translate(-(DEVA.wallLeft + DEVA.wallRight) / 2, -(DEVA.wallTop + 150));
  if (!lights) drawDevaFortress(c, DEVA, lit ? 0.6 : 0, v.time);
  drawDevaTorches(c, DEVA, DEVA.torches.map(() => lit && lights), v.time);
  c.restore();
}
