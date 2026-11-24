/**
 * @file Travel mission "trees felled by the storm": on a mountain line
 * through the forest, the blizzard has thrown fir trees across the track.
 *
 *   1. Two short blasts of the horn tell the driver of the second
 *      locomotive to pull too (as drivers really signal to each other).
 *   2. Up in the forest, a fallen fir lies on the rails. The train stops
 *      before it by itself, and the child saws the trunk in two by dragging
 *      a finger back and forth over it (or with the space bar): the cut gets
 *      deeper with every stroke, sawdust flies, and the two halves roll off
 *      the track. Then the train climbs on.
 *
 * A note with arrows ("Taie cu fierăstrăul!") shows the gesture. A tree cut
 * within a few seconds of the train stopping earns a star in the counter.
 * The mission takes the controls of the train and gives them back at the end.
 *
 * Configuration (besides id/title/text):
 *   trees     how many trees lie on the line
 *   fact      shown after the last tree
 */

import { clamp } from '../core/math.js';
import { drawTouchNote } from '../gfx/hints.js';
import { Particles } from '../gfx/particles.js';
import { drawFir, fillRoundRect } from '../gfx/shapes.js';
import { TRACK_Y } from '../world/track.js';
import { el } from '../ui/dom.js';
import { leave } from '../ui/panel.js';
import { Mission } from './mission.js';
import { TrainPace } from './pace.js';

/**
 * @typedef {import('./mission.js').MissionConfig & {trees: number, fact: string}} SawConfig
 *
 * @typedef {object} FallenTree
 * @property {number} worldX   middle of the trunk (where it is cut)
 * @property {number} cut      0..1, how deep the cut is
 * @property {'lying' | 'falling' | 'gone'} state
 * @property {number} t        seconds since it fell apart
 * @property {number} reachedAt  mission time when the train stopped before it (−1 before)
 */

/** Speed up the mountain, and the crawl while the train waits for the horn (stage units/s). */
const CLIMB_SPEED = 300;
const WAIT_SPEED = 25;
/** The first tree (far enough to come into view a few seconds after the horn), and the
 *  space between two (stage units). */
const FIRST_AHEAD = 3000;
const SPACING = 2800;
/** The train stops with its front this far before the middle of a trunk. */
const STOP_BEFORE = 360;
/** How far the crown of a fallen fir reaches beyond its trunk, with some room (stage units):
 *  the view pans forward so all of it is on screen. */
const CROWN_ROOM = 200;
/** The view pans towards a fallen fir from this far before the train stops at it. */
const FOCUS_AHEAD = 1600;
/** Length of a fallen trunk, and the pointer travel (stage units) that saws right through it. */
const TRUNK = 380;
const SAW_TRAVEL = 2600;
/** A tree cut within this many seconds of the stop earns a star. */
const QUICK = 8;
const SAWDUST = ['#e6c08a', '#d9b46a', '#f4e3c3'];

export class SawMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {SawConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {'signal' | 'trees'} */
    this.step = 'signal';
    this.horns = 0;
    /** @type {FallenTree[]} */
    this.trees = [];
    this.quick = 0;
    this.time = 0;
    this.endT = 0;
    /** The saw: where it is (stage x) and the last pointer x while sawing. */
    this.sawX = NaN;
    /** @type {number | null} */
    this.lastX = null;
    /** @type {TrainPace | null} */
    this.pace = null;
    /** @type {HTMLButtonElement | null} */
    this.button = null;
    this.particles = new Particles();
    /** @type {(e: KeyboardEvent) => void} */
    this.onKey = e => {
      if (e.code !== 'Space' || this.ctx.hud.paused) return;
      e.preventDefault();
      if (this.step === 'signal') this.horn();
      else this.saw(TRUNK * 0.9);
    };
  }

  /** @param {{duration?: number, window?: {from: number, to: number}}} hints */
  start(hints) {
    super.start(hints);
    this.pace = new TrainPace(this.ctx.journey, { far: CLIMB_SPEED, brake: 240 });
    if (this.pace.controls) this.pace.controls.target = WAIT_SPEED;
    this.button = /** @type {HTMLButtonElement} */ (el('button', { class: 'brake-btn is-stopped is-urgent', type: 'button' }, ['📯 Claxonează (0/2)']));
    this.button.addEventListener('pointerdown', e => {
      e.preventDefault();
      this.horn();
    });
    this.button.addEventListener('click', e => { if (e.detail === 0) this.horn(); });
    document.body.append(this.button);
    window.addEventListener('keydown', this.onKey);
  }

  /** The tree lying on the track ahead, if any. */
  get next() {
    return this.trees.find(t => t.state === 'lying') ?? null;
  }

  /** Screen x of a world position. */
  toScreen(/** @type {number} */ x) {
    return x - this.ctx.journey.distance + this.ctx.world.anchorX;
  }

  /** @private The signal to the second locomotive; then the climb begins. */
  horn() {
    if (this.step !== 'signal' || !this.button) return;
    if (this.ctx.audio?.canPlay('whistle')) this.ctx.audio.play('whistle', 0.5);
    this.horns += 1;
    this.button.textContent = `📯 Claxonează (${this.horns}/2)`;
    if (this.horns < 2) return;
    this.step = 'trees';
    leave(this.button);
    this.button = null;
    const j = this.ctx.journey;
    this.trees = Array.from({ length: this.config.trees }, (_, i) => ({
      worldX: j.distance + FIRST_AHEAD + i * SPACING, cut: 0, state: /** @type {const} */ ('lying'), t: 0, reachedAt: -1,
    }));
    this.ctx.hud.setCounter('🪓', 0, this.trees.length);
    this.ctx.hud.announce('Trag amândouă!', 'Mecanicul celei de-a doua locomotive a auzit semnalul. Urcăm prin pădure!', 'Misiune', 3);
  }

  /**
   * The tree the train is stopped before (it can be sawn), if any.
   * @private
   */
  sawable() {
    const t = this.next;
    return t && t.reachedAt >= 0 ? t : null;
  }

  /**
   * Saws a little: `travel` stage units of the saw going back or forth.
   * @private
   * @param {number} travel
   */
  saw(travel) {
    const t = this.sawable();
    if (!t) return;
    t.cut = Math.min(1, t.cut + travel / SAW_TRAVEL);
    const x = this.toScreen(t.worldX);
    this.particles.burst(x, TRACK_Y - 46 - this.ctx.world.cameraY, SAWDUST, 3, 140);
    if (Math.random() < 0.3) this.sound('brush', x);
    if (t.cut >= 1) {
      t.state = 'falling';
      t.t = 0;
      this.sound('thud', x);
      if (this.time - t.reachedAt <= QUICK) this.quick += 1;
      this.ctx.hud.setCounter('🪓', this.trees.filter(x => x.state !== 'lying').length, this.trees.length);
      if (!this.next) this.ctx.hud.announce('Linia e liberă!', this.config.fact, 'Misiune', 4);
    }
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    const t = this.sawable();
    if (!t) return;
    const x = this.toScreen(t.worldX);
    if (Math.abs(p.x - x) > TRUNK && Math.abs(p.y - (TRACK_Y - this.ctx.world.cameraY)) > 200) return;
    this.lastX = p.x;
    this.sawX = clamp(p.x, x - 60, x + 60);
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerMove(p) {
    if (this.lastX === null) return;
    const t = this.sawable();
    if (!t) return;
    const x = this.toScreen(t.worldX);
    this.saw(Math.abs(p.x - this.lastX));
    this.lastX = p.x;
    this.sawX = clamp(p.x, x - 60, x + 60);
  }

  pointerUp() {
    this.lastX = null;
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    const j = this.ctx.journey;
    for (const t of this.trees) {
      t.t += dt;
      if (t.state === 'falling' && t.t > 1.4) t.state = 'gone';
    }
    const t = this.next;
    // as at a snowdrift: the view pans forward so the fallen fir ahead is fully on
    // screen (only when the train comes near it; it pans back once the line is clear)
    const w = this.ctx.world;
    const near = t && t.worldX - STOP_BEFORE - j.distance < FOCUS_AHEAD;
    const right = t ? t.worldX + TRUNK / 2 + CROWN_ROOM - j.distance + w.baseAnchorX : 0;
    w.panTarget = near ? Math.max(0, right - this.ctx.stage.viewRight) : 0;
    if (this.step === 'trees' && this.pace) {
      if (t) {
        const gap = t.worldX - STOP_BEFORE - j.distance;
        this.pace.stopAt(gap);
        if (t.reachedAt < 0 && gap < 6 && j.speed < 3) t.reachedAt = this.time;
      } else {
        this.pace.cruise();
      }
    }
    const done = this.step === 'trees' && this.trees.every(x => x.state === 'gone');
    this.endT = done ? this.endT + dt : 0;
    if (this.endT > 1 || this.phase === 'wrapping') this.finishMission();
  }

  /** @private */
  finishMission() {
    if (this.phase === 'finished') return;
    this.pace?.release();
    this.pace = null;
    this.ctx.hud.hideCounter();
    const total = this.trees.length || 1;
    this.complete(this.quick >= total ? 3 : this.quick >= total - 1 ? 2 : 1, this.quick >= total
      ? 'Bravo, pădurarule! Ai curățat linia repede.'
      : 'Linia e liberă: am urcat până la Dealu Ștefăniței!');
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const stage = this.ctx.stage;
    const cam = this.ctx.world.cameraY;
    c.save();
    c.translate(0, -cam);
    for (const t of this.trees) {
      if (t.state === 'gone') continue;
      const x = this.toScreen(t.worldX);
      if (x < stage.viewLeft - TRUNK || x > stage.viewRight + TRUNK) continue;
      if (t.state === 'lying') {
        drawFallenFir(c, x - TRUNK / 2, x + TRUNK / 2, TRACK_Y - 30, t.cut);
      } else {
        // the two halves roll off the track, towards the child, and fade
        const k = Math.min(1, t.t / 1.4);
        c.globalAlpha = 1 - k;
        for (const side of [-1, 1]) {
          c.save();
          c.translate(x + side * (20 + k * 160), TRACK_Y - 30 + k * 90);
          c.rotate(side * k * 0.6);
          drawFallenFir(c, side < 0 ? -TRUNK / 2 : 0, side < 0 ? 0 : TRUNK / 2, 0, 0);
          c.restore();
        }
        c.globalAlpha = 1;
      }
    }
    c.restore();
    // the saw and the note showing the gesture
    const t = this.sawable();
    if (t) {
      const x = this.toScreen(t.worldX);
      const y = TRACK_Y - 30 - cam;
      const swing = this.lastX === null ? Math.sin(this.time * 6) * 40 : (Number.isNaN(this.sawX) ? x : this.sawX) - x;
      drawSaw(c, x + swing, y - 28 + t.cut * 22);
      if (t.cut < 0.15 || this.lastX === null) drawTouchNote(c, stage, x, y - 70, 'Taie cu fierăstrăul! ⟷');
    }
    this.particles.draw(c);
  }

  dispose() {
    this.ctx.world.panTarget = 0;
    this.pace?.release();
    this.ctx.hud.hideCounter();
    leave(this.button);
    window.removeEventListener('keydown', this.onKey);
  }
}

/**
 * A fir lying on the rails: the trunk from x0 to x1, branches on the top
 * end, snow on it, and the cut in the middle (0..1 deep).
 * @param {CanvasRenderingContext2D} c
 * @param {number} x0
 * @param {number} x1
 * @param {number} y   middle of the trunk
 * @param {number} cut
 */
function drawFallenFir(c, x0, x1, y, cut) {
  const r = 17;
  fillRoundRect(c, x0, y - r, x1 - x0, r * 2, r, '#7d4f25');
  c.fillStyle = 'rgba(0,0,0,0.15)';
  c.fillRect(x0 + 8, y + 4, x1 - x0 - 16, 6);
  // the crown at the right end: a fir lying on its side
  c.save();
  c.translate(x1 - 10, y);
  c.rotate(Math.PI / 2);
  drawFir(c, 0, 0, Math.min(150, (x1 - x0) * 0.55), { snowy: true });
  c.restore();
  // snow along the top of the trunk
  fillRoundRect(c, x0 + 6, y - r - 4, (x1 - x0) * 0.6, 8, 4, '#f4f8ff');
  if (cut > 0) {
    const mx = (x0 + x1) / 2;
    c.fillStyle = '#e6c08a';
    c.fillRect(mx - 3, y - r, 6, r * 2 * cut);
  }
}

/**
 * A bow saw over the trunk.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x  middle of the blade
 * @param {number} y  the blade
 */
function drawSaw(c, x, y) {
  c.fillStyle = '#c9ced6';
  c.fillRect(x - 60, y - 3, 120, 7);
  c.fillStyle = '#5f6b7a';
  for (let k = -56; k < 60; k += 8) {
    c.beginPath();
    c.moveTo(x + k, y + 4);
    c.lineTo(x + k + 4, y + 9);
    c.lineTo(x + k + 8, y + 4);
    c.fill();
  }
  c.strokeStyle = '#e53935';
  c.lineWidth = 6;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x - 60, y);
  c.quadraticCurveTo(x, y - 70, x + 60, y);
  c.stroke();
}
