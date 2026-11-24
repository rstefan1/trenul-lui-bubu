/**
 * @file Travel mission "photos from the viaducts".
 *
 * While the train crosses each big viaduct (and the view rises to show the
 * valley), an animal can be seen down in the valley: a deer, a fox, an owl,
 * a hare. Touching it takes a photo — a white flash, and a real snapshot of
 * that moment of the game lands in a little album in the corner.
 *
 * Configuration (besides id/title/text):
 *   animals   emoji of the animals, one per viaduct, in order
 *   pace      optional {far, slow}: the train crawls while an animal waits
 *             to be photographed (see TrainPace)
 */

import { Particles, SPARKS } from '../gfx/particles.js';
import { fillRoundRect, glow } from '../gfx/shapes.js';
import { NEAR_GROUND_Y } from '../world/biomes/terrain.js';
import { Mission } from './mission.js';
import { TrainPace } from './pace.js';

/** Size of the snapshot taken around an animal (stage units) and of the thumbnail (pixels). */
const SHOT_W = 300;
const SHOT_H = 210;
const THUMB_W = 150;
const THUMB_H = 105;

/**
 * @typedef {object} Sighting
 * @property {number} worldX   middle of the viaduct
 * @property {number} depth    depth of its valley
 * @property {string} animal
 * @property {'waiting' | 'taken' | 'missed'} state
 * @property {number} phase
 *
 * @typedef {import('./mission.js').MissionConfig & {animals: string[], pace?: import('./pace.js').PaceOptions}} PhotoConfig
 */

export class PhotoMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {PhotoConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {Sighting[]} */
    this.sightings = [];
    /** @type {HTMLCanvasElement[]} */
    this.album = [];
    this.flash = 0;
    this.time = 0;
    /** @type {Sighting | null} a photo to take at the end of this frame's drawing */
    this.pending = null;
    this.particles = new Particles();
  }

  start(hints) {
    super.start(hints);
    const j = this.ctx.journey;
    const seg = j.segment;
    const viaducts = j.route.features.filter(f => f.type === 'viaduct' && f.x0 >= seg.start && f.x1 <= seg.start + seg.length);
    this.sightings = viaducts.map((f, i) => {
      const v = /** @type {import('../world/features.js').SpanFeature} */ (f);
      return {
        worldX: v.x0 + (v.x1 - v.x0) * (i % 2 ? 0.8 : 0.72),
        depth: v.depth,
        animal: this.config.animals[i % this.config.animals.length],
        state: 'waiting',
        phase: Math.random() * 6,
      };
    });
    /** @type {TrainPace | null} */
    this.pace = this.config.pace ? new TrainPace(j, this.config.pace) : null;
    this.ctx.hud.setCounter('📷', 0, this.sightings.length);
  }

  /**
   * Screen position of an animal.
   * @param {Sighting} s
   */
  at(s) {
    const w = this.ctx.world;
    return {
      x: s.worldX - this.ctx.journey.distance + w.anchorX + Math.sin(this.time * 0.8 + s.phase) * 30,
      y: Math.min(NEAR_GROUND_Y + s.depth - 34 - w.cameraY, this.ctx.stage.viewBottom - 70),
    };
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    const reach = Math.max(70 * this.ctx.stage.ui, 40 / this.ctx.stage.scale);
    for (const s of this.sightings) {
      if (s.state !== 'waiting') continue;
      const q = this.at(s);
      if (Math.hypot(q.x - p.x, q.y - p.y) < reach && this.ctx.world.cameraY > 60) {
        s.state = 'taken';
        this.pending = s;
        this.sound('shutter', q.x);   // right at the touch (the snapshot itself is taken while drawing)
        return;
      }
    }
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.flash = Math.max(0, this.flash - dt * 4);
    this.particles.update(dt);
    if (this.pace) {
      const stage = this.ctx.stage;
      this.pace.slowNear(this.sightings.filter(s => s.state === 'waiting').map(s => this.at(s).x), { left: stage.viewLeft, right: stage.viewRight });
    }
    const left = this.ctx.stage.viewLeft - 200;
    for (const s of this.sightings) if (s.state === 'waiting' && this.at(s).x < left) s.state = 'missed';
    // (a photo just touched is put in the album while drawing: wait for it)
    const over = this.sightings.every(s => s.state !== 'waiting') && !this.pending;
    if (over || (this.phase === 'wrapping' && !this.pending)) {
      this.ctx.hud.hideCounter();
      this.pace?.release();
      const n = this.sightings.filter(s => s.state === 'taken').length;
      const total = this.sightings.length;
      this.complete(n >= total ? 3 : n >= Math.ceil(total / 2) ? 2 : 1,
        n >= total ? 'Ai fotografiat toate animalele de pe viaducte!' : `Ai ${n} fotografii din ${total}. Frumoasă noapte la munte!`);
    }
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const lifted = this.ctx.world.cameraY > 60;
    const ui = this.ctx.stage.ui;   // bigger animals on phones
    for (const s of this.sightings) {
      if (s.state === 'missed') continue;
      const q = this.at(s);
      if (q.x < this.ctx.stage.viewLeft - 80 || q.x > this.ctx.stage.viewRight + 80) continue;
      if (s.state === 'waiting' && lifted) {
        glow(c, q.x, q.y, 70 * ui, `rgba(255,240,170,${0.25 + 0.15 * Math.sin(this.time * 4)})`, 'rgba(255,240,170,0)');
      }
      c.font = `${Math.round(64 * ui)}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(s.animal, q.x, q.y);
    }
    // the photo is taken from what is on screen right now
    if (this.pending) this.takePhoto(this.pending);
    if (this.flash > 0) {
      const stage = this.ctx.stage;
      c.fillStyle = `rgba(255,255,255,${this.flash * 0.8})`;
      c.fillRect(stage.viewLeft, stage.viewTop, stage.viewRight - stage.viewLeft, stage.viewBottom - stage.viewTop);
    }
    this.particles.draw(c);
    this.drawAlbum(c);
  }

  /**
   * Copies the part of the screen around an animal into a thumbnail.
   * @private
   * @param {Sighting} s
   */
  takePhoto(s) {
    this.pending = null;
    const stage = this.ctx.stage;
    const q = this.at(s);
    const k = stage.scale * stage.dpr;
    const sx = (q.x - SHOT_W / 2) * k + stage.offsetX * stage.dpr;
    const sy = (q.y - SHOT_H / 2 - 30) * k + stage.offsetY * stage.dpr;
    const thumb = document.createElement('canvas');
    thumb.width = THUMB_W;
    thumb.height = THUMB_H;
    const t = /** @type {CanvasRenderingContext2D} */ (thumb.getContext('2d'));
    t.drawImage(stage.canvas, sx, sy, SHOT_W * k, SHOT_H * k, 0, 0, THUMB_W, THUMB_H);
    this.album.push(thumb);
    this.flash = 1;
    this.particles.burst(q.x, q.y, SPARKS, 18, 220);
    this.ctx.hud.setCounter('📷', this.album.length, this.sightings.length);
  }

  /**
   * The album: small instant photos in the bottom-left corner.
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  drawAlbum(c) {
    const stage = this.ctx.stage;
    const ui = stage.ui;   // bigger photos on phones
    const w = 100 * ui;
    const h = 70 * ui;
    this.album.forEach((thumb, i) => {
      const x = stage.viewLeft + 24 + i * (w + 16);
      const y = stage.viewBottom - h - 40;
      const tilt = (i % 2 ? 1 : -1) * 0.06;
      c.save();
      c.translate(x + w / 2, y + h / 2);
      c.rotate(tilt);
      fillRoundRect(c, -w / 2 - 6, -h / 2 - 6, w + 12, h + 24, 4, '#ffffff');
      c.drawImage(thumb, -w / 2, -h / 2, w, h);
      c.restore();
    });
  }

  dispose() {
    this.pace?.release();
  }
}
