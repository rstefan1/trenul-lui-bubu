/**
 * @file Travel mission "friends of the forest": animals crossing the line.
 *
 * In the forest after the pass, animals walk onto the railway. A warning
 * sign appears above each one as it starts crossing. The child stops the
 * train with a big button, waits until the animal is safely on the other
 * side (it says thank you with little hearts), and starts the train again.
 * If the train does not stop in time, the animal only jumps away, startled
 * — nobody is hurt, but it does not count.
 *
 * The mission takes the controls of the train and gives them back at the
 * end.
 *
 * Configuration (besides id/title/text):
 *   animals   emoji of the animals, in order
 */

import { clamp, lerp } from '../core/math.js';
import { Particles } from '../gfx/particles.js';
import { glow } from '../gfx/shapes.js';
import { NEAR_GROUND_Y } from '../world/biomes/terrain.js';
import { TRACK_Y } from '../world/track.js';
import { el } from '../ui/dom.js';
import { Mission } from './mission.js';

/** Cruising speed while the child drives here (stage units/s). */
const DRIVE_SPEED = 420;
/** An animal starts crossing when the train is this far away. */
const TRIGGER = 1700;
/** Seconds an animal needs to cross the line. */
const CROSS_TIME = 4.5;

/**
 * @typedef {object} Animal
 * @property {number} worldX
 * @property {string} emoji
 * @property {'waiting' | 'crossing' | 'safe' | 'startled'} state
 * @property {number} t    seconds in the current state
 *
 * @typedef {import('./mission.js').MissionConfig & {animals: string[]}} CrossingConfig
 */

export class CrossingMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {CrossingConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {Animal[]} */
    this.animals = [];
    this.safe = 0;
    this.time = 0;
    this.stopped = false;
    /** @type {import('../journey/journey.js').Controls | null} */
    this.controls = null;
    /** @type {HTMLButtonElement | null} */
    this.button = null;
    this.particles = new Particles();
    /** @type {(e: KeyboardEvent) => void} */
    this.onKey = e => {
      if (e.code !== 'Space') return;
      e.preventDefault();
      this.toggle();
    };
  }

  /** @param {{duration?: number, window?: {from: number, to: number}}} hints */
  start(hints) {
    super.start(hints);
    const j = this.ctx.journey;
    this.controls = j.takeControl();
    if (this.controls) this.controls.target = DRIVE_SPEED;
    const seg = j.segment;
    const end = seg.start + (hints.window ? hints.window.to : 0.9) * seg.length - 600;
    const first = j.distance + 3000;
    const n = this.config.animals.length;
    const spacing = Math.max(2200, (end - first) / Math.max(1, n - 1));
    this.animals = this.config.animals.map((emoji, i) => ({ worldX: first + i * spacing, emoji, state: 'waiting', t: 0 }));
    this.button = /** @type {HTMLButtonElement} */ (el('button', { class: 'brake-btn', type: 'button' }));
    this.button.addEventListener('pointerdown', e => {
      e.preventDefault();
      this.toggle();
    });
    document.body.append(this.button);
    window.addEventListener('keydown', this.onKey);
    this.refreshButton();
    this.ctx.hud.setCounter('🦌', 0, n);
  }

  /** @private Stops or starts the train. */
  toggle() {
    if (!this.controls) return;
    this.stopped = !this.stopped;
    this.controls.target = this.stopped ? 0 : DRIVE_SPEED;
    this.refreshButton();
  }

  /** @private */
  refreshButton() {
    if (!this.button) return;
    this.button.textContent = this.stopped ? '▶ Pornește trenul' : '✋ Oprește trenul';
    this.button.classList.toggle('is-stopped', this.stopped);
  }

  /** Screen x of a world position. */
  toScreen(/** @type {number} */ x) {
    return x - this.ctx.journey.distance + this.ctx.world.anchorX;
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    const j = this.ctx.journey;
    for (const a of this.animals) {
      a.t += dt;
      const gap = a.worldX - j.distance;   // distance from the front of the train
      if (a.state === 'waiting' && gap < TRIGGER) {
        a.state = 'crossing';
        a.t = 0;
      } else if (a.state === 'crossing') {
        if (gap < 30 && j.speed > 25) {
          a.state = 'startled';
          a.t = 0;
        } else if (a.t >= CROSS_TIME) {
          a.state = 'safe';
          a.t = 0;
          this.safe += 1;
          this.ctx.hud.setCounter('🦌', this.safe, this.animals.length);
          const p = this.pos(a);
          this.particles.burst(p.x, p.y - 40, ['#ff8a80', '#ff5252', '#ffffff'], 14, 160);
        }
      }
    }
    const left = this.ctx.stage.viewLeft - 200;
    const done = this.animals.every(a => (a.state === 'safe' || a.state === 'startled') && (a.t > 2 || this.toScreen(a.worldX) < left));
    if (done || this.phase === 'wrapping') this.finishMission();
  }

  /**
   * Where an animal is: it walks from behind the track to the front.
   * @param {Animal} a
   */
  pos(a) {
    const x = this.toScreen(a.worldX);
    const cam = this.ctx.world.cameraY;
    if (a.state === 'waiting') return { x, y: NEAR_GROUND_Y - 6 - cam };
    if (a.state === 'crossing') return { x, y: lerp(NEAR_GROUND_Y - 6, TRACK_Y + 120, clamp(a.t / CROSS_TIME, 0, 1)) - cam };
    if (a.state === 'safe') return { x: x + a.t * 40, y: TRACK_Y + 120 - cam };
    return { x: x + a.t * 260, y: TRACK_Y + 40 - Math.sin(clamp(a.t * 2, 0, Math.PI)) * 160 - cam };
  }

  /** @private */
  finishMission() {
    if (this.phase === 'finished') return;
    if (this.controls) {
      this.controls = null;
      this.ctx.journey.releaseControl();
    }
    this.ctx.hud.hideCounter();
    const n = this.safe;
    const total = this.animals.length;
    this.complete(n >= total ? 3 : n >= Math.ceil(total / 2) ? 2 : 1,
      n >= total ? 'Toate animalele au trecut linia în siguranță. Bravo, mecanicule!' : `${n} animale din ${total} au trecut liniștite.`);
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    for (const a of this.animals) {
      const p = this.pos(a);
      if (p.x < this.ctx.stage.viewLeft - 100 || p.x > this.ctx.stage.viewRight + 100) continue;
      if (a.state === 'crossing') {
        // the warning sign
        const blink = Math.sin(this.time * 8) > 0;
        glow(c, p.x, p.y - 120, 50, `rgba(255,200,60,${blink ? 0.6 : 0.25})`, 'rgba(255,200,60,0)');
        c.fillStyle = '#ffd23f';
        c.beginPath();
        c.moveTo(p.x, p.y - 150);
        c.lineTo(p.x + 30, p.y - 98);
        c.lineTo(p.x - 30, p.y - 98);
        c.closePath();
        c.fill();
        c.fillStyle = '#1b2440';
        c.font = '800 30px "Baloo 2", system-ui, sans-serif';
        c.textAlign = 'center';
        c.textBaseline = 'middle';
        c.fillText('!', p.x, p.y - 114);
      }
      c.font = '72px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'bottom';
      c.save();
      c.translate(p.x, p.y);
      if (a.state !== 'startled') c.scale(-1, 1);   // walking towards the viewer, facing left
      c.fillText(a.emoji, 0, 0);
      c.restore();
      if (a.state === 'safe' && a.t < 1.5) {
        c.globalAlpha = 1 - a.t / 1.5;
        c.font = '700 22px "Baloo 2", system-ui, sans-serif';
        c.fillStyle = '#ffffff';
        c.textBaseline = 'middle';
        c.fillText('Mulțumesc! ❤', p.x, p.y - 100 - a.t * 30);
        c.globalAlpha = 1;
      }
    }
    this.particles.draw(c);
  }

  dispose() {
    if (this.controls) this.ctx.journey.releaseControl();
    this.button?.remove();
    window.removeEventListener('keydown', this.onKey);
  }
}
