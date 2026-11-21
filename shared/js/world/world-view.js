/**
 * @file Renders the world around the journey: sky, landscape, railway,
 * stations, the train with Bubu, and the weather.
 *
 * Drawing order (back to front):
 *
 *   sky → far layer → mid layer → near layer (+ railway, back features)
 *       → train → front features (tunnels) → train lights → snowfall
 *
 * Each landscape layer and the train are tinted by the time-of-day wash;
 * the lights are drawn after the tint so they glow at night.
 *
 * The world view only reads the journey; it never changes it.
 */

import { approach, smoothstep } from '../core/math.js';
import { BandCompositor } from '../gfx/compositor.js';
import { TrainRenderer } from '../train/train-renderer.js';
import { TRAINS } from '../train/specs.js';
import { TrackFeatures } from './features.js';
import { LAYERS, Landscape } from './landscape.js';
import { lightAt } from './lighting.js';
import { Sky } from './sky.js';
import { TRACK_Y, drawCatenary, drawTrack } from './track.js';
import { Snowfall } from './weather.js';

/** Fewer flakes when the user prefers less motion. */
const REDUCED_MOTION = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;

export class WorldView {
  /**
   * @param {import('../core/stage.js').Stage} stage
   * @param {import('../journey/journey.js').Journey} journey
   */
  constructor(stage, journey) {
    this.stage = stage;
    this.journey = journey;
    const route = journey.route;
    this.compositor = new BandCompositor();
    this.sky = new Sky(stage);
    this.landscape = new Landscape(stage, this.compositor, d => route.biomeAt(d));
    this.features = new TrackFeatures(route.features);
    this.train = new TrainRenderer(stage, TRAINS[journey.trainId]);
    this.snow = new Snowfall(stage, REDUCED_MOTION ? 50 : 150);
    this.cameraY = 0;
    /** How far the view is panned forward (the whole world moves left), and where it is heading. */
    this.pan = 0;
    this.panTarget = 0;
    this.time = 0;
    /** What the player changed in the world (set by the game, e.g. lit torches). */
    /** @type {ReadonlySet<string>} */
    this.flags = new Set();
    /** The light of the last drawn frame (missions use it to match the world). */
    this.light = lightAt(journey.clock);
    /** Snow cover shown on screen (follows the journey smoothly). */
    this.cover = journey.weather.cover;
  }

  /** Where the front of the train normally is: near the right edge, room for the headlight. */
  get baseAnchorX() {
    const w = this.stage.width;
    const usual = w - Math.max(150, w * 0.18);
    const front = this.train.spec.front;
    return front ? Math.min(usual, w * front) : usual;
  }

  /**
   * Pans the view so the front of the train is at a given share of the
   * screen's width (missions use it to show more of what lies ahead);
   * null goes back to the usual place.
   * @param {number | null} share  e.g. 0.5 = the middle of the screen
   */
  lookAhead(share) {
    const stage = this.stage;
    this.panTarget = share === null ? 0 : Math.max(0, this.baseAnchorX - (stage.viewLeft + (stage.viewRight - stage.viewLeft) * share));
  }

  /** Screen x of the front of the train (missions may pan the view to show what is ahead). */
  get anchorX() {
    return this.baseAnchorX - this.pan;
  }

  /**
   * Jumps to the journey's current situation without transitions (after
   * placing the train somewhere else, e.g. at the start of a chapter).
   */
  snap() {
    const j = this.journey;
    this.train.setSpec(TRAINS[j.trainId]);
    this.cover = j.weather.cover;
    this.cameraY = this.features.cameraLift(j.distance, this.train.length);
  }

  /**
   * Converts train coordinates to stage coordinates (camera included).
   * @param {{x: number, y: number}} p
   * @returns {{x: number, y: number}}
   */
  trainToStage(p) {
    return { x: this.anchorX + p.x, y: TRACK_Y + p.y - this.cameraY };
  }

  /**
   * The car under a point of the stage, if any.
   * @param {number} x
   * @param {number} y
   * @returns {import('../train/specs.js').CarSpec | null}
   */
  carAtStage(x, y) {
    return this.train.carAt(x - this.anchorX, y - TRACK_Y + this.cameraY);
  }

  /**
   * Lets a mission draw something that belongs to the world (houses, people
   * next to the track): it is drawn with the camera of the near layer and
   * tinted by the time of day like the rest of the world.
   * @param {CanvasRenderingContext2D} c
   * @param {number} top     band to tint, in stage units
   * @param {number} bottom
   * @param {(c: CanvasRenderingContext2D) => void} paint
   */
  drawTinted(c, top, bottom, paint) {
    c.save();
    c.translate(0, -this.cameraY);
    this.compositor.draw(c, top, bottom, paint, [this.light.wash]);
    c.restore();
  }

  /** How strongly lamps and windows glow now (0 by day, 1 at night). */
  get glowStrength() {
    return smoothstep(0.25, 0.8, this.light.night);
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    const j = this.journey;
    if (TRAINS[j.trainId] !== this.train.spec) this.train.setSpec(TRAINS[j.trainId]);
    this.train.update(dt);
    const target = this.features.cameraLift(j.distance, this.train.length);
    this.cameraY = approach(this.cameraY, target, 1.6, dt);
    this.pan = approach(this.pan, this.panTarget, 1.6, dt);
    const w = j.weather;
    this.cover = approach(this.cover, w.cover, 3, dt);
    this.snow.update(dt, w.snowfall, j.speed, this.time);
  }

  /** @param {CanvasRenderingContext2D} c  in stage units */
  draw(c) {
    const j = this.journey;
    const light = lightAt(j.clock);
    this.light = light;
    const stage = this.stage;
    this.compositor.resize(stage.canvas);

    this.sky.draw(c, light, this.time);

    const view = {
      distance: j.distance + this.pan,
      cameraY: this.cameraY,
      cover: this.cover,
      light,
      viewBottom: stage.viewBottom,
    };
    const fview = {
      distance: j.distance,
      anchorX: this.anchorX,
      cover: this.cover,
      left: stage.viewLeft,
      right: stage.viewRight,
      bottom: stage.viewBottom + this.cameraY,
      bubuOffset: this.train.bubuOffset,
      time: this.time,
      flags: this.flags,
    };
    const electric = this.train.spec.electric;

    this.landscape.drawLayer(c, LAYERS[0], view);
    this.landscape.drawLayer(c, LAYERS[1], view);
    this.landscape.drawLayer(c, LAYERS[2], view, {
      bandTop: 120,
      extra: b => {
        this.features.drawBack(b, fview);
        drawTrack(b, fview);
        if (electric) drawCatenary(b, fview, x => this.features.blocksMast(x, fview.bubuOffset));
      },
      extraLights: l => {
        if (light.night > 0.02) {
          l.globalAlpha = Math.min(1, light.night * 1.1);
          this.features.drawLights(l, fview);
          l.globalAlpha = 1;
        }
      },
      clip: b => this.features.addHoles(b, fview),
    });

    // the train and what passes in front of it share the camera of the near layer
    c.save();
    c.translate(0, -this.cameraY);
    const tunnel = this.features.tunnelState(j.distance, this.train.length);
    const frame = {
      frontX: this.anchorX,
      railY: TRACK_Y,
      distance: j.distance,
      speed: j.speed,
      time: this.time,
      lights: smoothstep(0.25, 0.8, light.night),
      headlight: Math.max(smoothstep(0.3, 0.8, light.night), tunnel.front),
    };
    this.compositor.draw(c, TRACK_Y - 280, TRACK_Y + 30, b => this.train.drawBody(b, frame), [light.wash]);
    this.compositor.draw(c, 0, stage.viewBottom + this.cameraY, b => this.features.drawFront(b, fview), [light.wash]);
    if (tunnel.any) {
      // the part of the train inside a mountain stays hidden, lights included
      c.save();
      c.beginPath();
      c.rect(stage.viewLeft, stage.viewTop + this.cameraY - 10, stage.viewRight - stage.viewLeft, stage.viewBottom - stage.viewTop + 20);
      for (const [x, y, w, h] of this.features.tubes(fview)) c.rect(x, y, w, h);
      c.clip('evenodd');
      this.train.drawLights(c, frame);
      c.restore();
    } else {
      this.train.drawLights(c, frame);
    }
    c.restore();

    this.snow.draw(c);
  }
}
