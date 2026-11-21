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
    this.time = 0;
    /** Snow cover shown on screen (follows the journey smoothly). */
    this.cover = journey.weather.cover;
  }

  /** Screen x of the front of the train: near the right edge, room for the headlight. */
  get anchorX() {
    const w = this.stage.width;
    return w - Math.max(150, w * 0.18);
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

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    const j = this.journey;
    if (TRAINS[j.trainId] !== this.train.spec) this.train.setSpec(TRAINS[j.trainId]);
    this.train.update(dt);
    const target = this.features.cameraLift(j.distance, this.train.length);
    this.cameraY = approach(this.cameraY, target, 1.6, dt);
    const w = j.weather;
    this.cover = approach(this.cover, w.cover, 3, dt);
    this.snow.update(dt, w.snowfall, j.speed, this.time);
  }

  /** @param {CanvasRenderingContext2D} c  in stage units */
  draw(c) {
    const j = this.journey;
    const light = lightAt(j.clock);
    const stage = this.stage;
    this.compositor.resize(stage.canvas);

    this.sky.draw(c, light, this.time);

    const view = {
      distance: j.distance,
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
    this.train.drawLights(c, frame);
    if (tunnel.any && frame.lights < 1) {
      // inside a tunnel the windows are lit even by day
      c.save();
      c.beginPath();
      for (const [x, y, w, h] of this.features.tubes(fview)) c.rect(x, y, w, h);
      c.clip();
      this.train.drawLights(c, { ...frame, lights: 1 - frame.lights, headlight: 0 });
      c.restore();
    }
    c.restore();

    this.snow.draw(c);
  }
}
