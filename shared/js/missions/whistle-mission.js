/**
 * @file Travel mission "the train's whistle" (a short, cheerful one near the
 * end of the journey).
 *
 * On Christmas morning, groups of children wait by the line to see the
 * train. When the train passes a group, the child presses the big "Fluieră!"
 * button: the locomotive whistles ("Tuu-tuuu!" and a puff of steam) and the
 * children jump, wave and send little hearts. A whistle with nobody around
 * costs nothing. The train slows down while children are on screen, so
 * there is no hurry.
 *
 * Configuration (besides id/title/text):
 *   groups   how many groups of children wait along the line
 *   pace     {far, slow} speeds (see TrainPace)
 */

import { Particles } from '../gfx/particles.js';
import { fillCircle, glow } from '../gfx/shapes.js';
import { TRACK_Y } from '../world/track.js';
import { el } from '../ui/dom.js';
import { Mission } from './mission.js';
import { TrainPace } from './pace.js';

/** Seconds the whistle lasts on screen. */
const WHISTLE_TIME = 1.4;
/** A group hears the whistle when it is this close to the locomotive (stage units). */
const HEAR_BEHIND = 650;
const HEAR_AHEAD = 420;
/** Where the children stand: in front of the track. */
const GROUND = TRACK_Y + 96;
const COATS = ['#e53935', '#1e88e5', '#43a047', '#8e44ad', '#fb8c00', '#ec407a'];

/**
 * @typedef {{worldX: number, kids: number, state: 'waiting' | 'cheered' | 'missed', t: number, seed: number}} Group
 * @typedef {import('./mission.js').MissionConfig & {groups: number, pace: import('./pace.js').PaceOptions}} WhistleConfig
 */

export class WhistleMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {WhistleConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {Group[]} */
    this.groups = [];
    this.cheered = 0;
    this.time = 0;
    /** Seconds since the last whistle (large = silent). */
    this.whistleT = 9;
    /** @type {TrainPace | null} */
    this.pace = null;
    /** @type {HTMLButtonElement | null} */
    this.button = null;
    this.particles = new Particles();
    /** @type {(e: KeyboardEvent) => void} */
    this.onKey = e => {
      if (e.code !== 'Space' || this.ctx.hud.paused) return;
      e.preventDefault();
      this.whistle();
    };
  }

  start(hints) {
    super.start(hints);
    const j = this.ctx.journey;
    const first = j.distance + 2200;
    this.groups = Array.from({ length: this.config.groups }, (_, i) => ({
      worldX: first + i * 2600,
      kids: 2 + (i % 2),
      state: 'waiting',
      t: 0,
      seed: i * 3,
    }));
    this.pace = new TrainPace(j, this.config.pace);
    this.button = /** @type {HTMLButtonElement} */ (el('button', { class: 'brake-btn is-stopped', type: 'button' }, ['📣 Fluieră!']));
    this.button.addEventListener('pointerdown', e => {
      e.preventDefault();
      this.whistle();
    });
    document.body.append(this.button);
    window.addEventListener('keydown', this.onKey);
    this.ctx.hud.setCounter('🎉', 0, this.groups.length);
  }

  /** Screen x of a world position. */
  toScreen(/** @type {number} */ x) {
    return x - this.ctx.journey.distance + this.ctx.world.anchorX;
  }

  /** Is a group close enough to the locomotive to hear the whistle? */
  inRange(/** @type {Group} */ g) {
    const d = this.toScreen(g.worldX) - this.ctx.world.anchorX;
    return d > -HEAR_BEHIND && d < HEAR_AHEAD;
  }

  /** @private The locomotive whistles. */
  whistle() {
    if (this.phase !== 'running' || this.whistleT < 0.4) return;
    this.whistleT = 0;
    this.ctx.audio?.play('whistle');
    const w = this.ctx.world;
    // a puff of steam from the locomotive's roof
    this.particles.burst(w.anchorX - 60, TRACK_Y - 290 - w.cameraY, ['#ffffff', '#e8eef8'], 14, 120);
    for (const g of this.groups) {
      if (g.state !== 'waiting' || !this.inRange(g)) continue;
      g.state = 'cheered';
      g.t = 0;
      this.cheered += 1;
      this.particles.burst(this.toScreen(g.worldX), GROUND - 90 - w.cameraY, ['#ff8a80', '#ff5252', '#ffd23f'], 24, 220);
      this.sound('sparkle', this.toScreen(g.worldX));
      this.ctx.hud.setCounter('🎉', this.cheered, this.groups.length);
    }
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.whistleT += dt;
    this.particles.update(dt);
    const stage = this.ctx.stage;
    this.pace?.slowNear(this.groups.filter(g => g.state === 'waiting').map(g => this.toScreen(g.worldX)), { left: stage.viewLeft, right: stage.viewRight, front: this.ctx.world.anchorX });
    for (const g of this.groups) {
      g.t += dt;
      if (g.state === 'waiting' && this.toScreen(g.worldX) - this.ctx.world.anchorX < -HEAR_BEHIND) {
        g.state = 'missed';
        g.t = 0;
      }
    }
    const urgent = this.groups.some(g => g.state === 'waiting' && this.inRange(g));
    this.button?.classList.toggle('is-urgent', urgent);
    const over = this.groups.every(g => g.state !== 'waiting') && this.whistleT > 1.5;
    if (over || this.phase === 'wrapping') this.finishMission();
  }

  /** @private */
  finishMission() {
    if (this.phase === 'finished') return;
    this.pace?.release();
    this.ctx.hud.hideCounter();
    const n = this.cheered;
    const total = this.groups.length;
    this.complete(n >= total ? 3 : n >= total - 1 ? 2 : 1,
      n >= total ? 'Toți copiii au auzit fluierul trenului lui Bubu!' : `${n} grupuri de copii din ${total} au auzit fluierul.`);
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const stage = this.ctx.stage;
    const w = this.ctx.world;
    const cam = w.cameraY;
    for (const g of this.groups) {
      const x = this.toScreen(g.worldX);
      if (x < stage.viewLeft - 200 || x > stage.viewRight + 200) continue;
      if (g.state === 'waiting' && this.inRange(g)) glow(c, x, GROUND - 60 - cam, 120, `rgba(255,230,140,${0.3 + 0.15 * Math.sin(this.time * 6)})`, 'rgba(255,230,140,0)');
      for (let k = 0; k < g.kids; k++) {
        const kx = x + (k - (g.kids - 1) / 2) * 52;
        const happy = g.state === 'cheered';
        const jump = happy ? Math.abs(Math.sin(g.t * 7 + k)) * 26 : 0;
        drawKid(c, kx, GROUND - cam - jump, COATS[(g.seed + k) % COATS.length], this.time + k, happy);
      }
      if (g.state === 'cheered' && g.t < 2.5) {
        c.save();
        c.globalAlpha = Math.min(1, 2.5 - g.t);
        c.fillStyle = '#ff5252';
        c.font = '800 26px "Baloo 2", system-ui, sans-serif';
        c.textAlign = 'center';
        c.fillText('❤ Crăciun fericit! ❤', x, GROUND - 150 - cam - g.t * 20);
        c.restore();
      }
    }
    // the whistle: rings of sound and the words over the locomotive
    if (this.whistleT < WHISTLE_TIME) {
      const k = this.whistleT / WHISTLE_TIME;
      const x = w.anchorX - 60;
      const y = TRACK_Y - 300 - cam;
      c.save();
      c.strokeStyle = `rgba(255,255,255,${0.8 * (1 - k)})`;
      c.lineWidth = 5;
      for (let r = 0; r < 3; r++) {
        c.beginPath();
        c.arc(x, y, 30 + (k * 120 + r * 30), -Math.PI * 0.85, -Math.PI * 0.15);
        c.stroke();
      }
      c.globalAlpha = 1 - k * 0.6;
      c.font = '800 34px "Baloo 2", system-ui, sans-serif';
      c.textAlign = 'center';
      c.lineWidth = 7;
      c.strokeStyle = 'rgba(27,36,64,0.85)';
      c.strokeText('Tuu-tuuu!', x, y - 60 - k * 30);
      c.fillStyle = '#ffffff';
      c.fillText('Tuu-tuuu!', x, y - 60 - k * 30);
      c.restore();
    }
    this.particles.draw(c);
  }

  dispose() {
    this.pace?.release();
    this.button?.remove();
    window.removeEventListener('keydown', this.onKey);
  }
}

/**
 * A child in a winter coat and a cap with a pompom, waving.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} feet
 * @param {string} coat
 * @param {number} t
 * @param {boolean} happy  waves with both arms
 */
function drawKid(c, x, feet, coat, t, happy) {
  const s = 70;
  c.fillStyle = '#37474f';
  c.fillRect(x - s * 0.14, feet - s * 0.2, s * 0.1, s * 0.2);
  c.fillRect(x + s * 0.04, feet - s * 0.2, s * 0.1, s * 0.2);
  c.fillStyle = coat;
  c.beginPath();
  c.moveTo(x - s * 0.22, feet - s * 0.18);
  c.lineTo(x - s * 0.16, feet - s * 0.62);
  c.lineTo(x + s * 0.16, feet - s * 0.62);
  c.lineTo(x + s * 0.22, feet - s * 0.18);
  c.closePath();
  c.fill();
  // arms: one waves, both when happy
  c.strokeStyle = coat;
  c.lineWidth = s * 0.09;
  c.lineCap = 'round';
  for (const side of happy ? [-1, 1] : [1]) {
    const a = -Math.PI / 2 + side * (0.5 + Math.sin(t * 8) * 0.35);
    c.beginPath();
    c.moveTo(x + side * s * 0.14, feet - s * 0.55);
    c.lineTo(x + side * s * 0.14 + Math.cos(a) * s * 0.3, feet - s * 0.55 + Math.sin(a) * s * 0.3);
    c.stroke();
  }
  c.fillStyle = '#f6d1b3';
  fillCircle(c, x, feet - s * 0.76, s * 0.15);
  c.fillStyle = '#3b4250';
  fillCircle(c, x - s * 0.05, feet - s * 0.77, s * 0.022);
  fillCircle(c, x + s * 0.05, feet - s * 0.77, s * 0.022);
  c.strokeStyle = '#b23b3b';
  c.lineWidth = 2;
  c.beginPath();
  c.arc(x, feet - s * 0.72, s * (happy ? 0.06 : 0.04), 0.2, Math.PI - 0.2);
  c.stroke();
  // cap with a pompom
  c.fillStyle = coat === '#e53935' ? '#1e88e5' : '#e53935';
  c.beginPath();
  c.ellipse(x, feet - s * 0.86, s * 0.16, s * 0.1, 0, Math.PI, 0);
  c.fill();
  c.fillStyle = '#ffffff';
  c.fillRect(x - s * 0.17, feet - s * 0.88, s * 0.34, s * 0.05);
  fillCircle(c, x, feet - s * 0.98, s * 0.05);
}
