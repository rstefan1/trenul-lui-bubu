/**
 * @file Travel mission "twin snowflakes".
 *
 * Big snowflakes drift slowly down the sky above the train. A frame at the
 * top shows one snowflake: the child touches the snowflakes that look
 * exactly like it. Every snowflake has six arms, but the arms are decorated
 * differently, so looking closely is all it takes. After a few catches the
 * model changes.
 *
 * Configuration (besides id/title/text):
 *   goal     how many twins to catch
 *   models   how many times the model changes (the goal is split between them)
 */

import { TAU, clamp } from '../core/math.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { fillRoundRect, glow } from '../gfx/shapes.js';
import { TRACK_Y } from '../world/track.js';
import { Mission } from './mission.js';

/** How many kinds of snowflakes there are (see drawFlake). */
const KINDS = 4;
/** Radius of a falling snowflake (stage units). */
const FLAKE_R = 40;
/** Falling speed (stage units/s) and seconds between two new snowflakes. */
const FALL = 45;
const SPAWN = 1.1;
/** At most this many snowflakes at once. */
const MAX_FLAKES = 9;

/**
 * @typedef {{x: number, y: number, kind: number, spin: number, phase: number, caught: number, wobble: number}} Flake
 * @typedef {import('./mission.js').MissionConfig & {goal: number, models: number}} SnowflakeConfig
 */

export class SnowflakeMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {SnowflakeConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {Flake[]} */
    this.flakes = [];
    this.model = Math.floor(Math.random() * KINDS);
    this.caught = 0;
    this.mistakes = 0;
    this.time = 0;
    this.spawnT = 0;
    /** Seconds since a twin of the model was last on screen. */
    this.noTwinT = 0;
    this.particles = new Particles();
  }

  start(hints) {
    super.start(hints);
    this.ctx.hud.setCounter('❄️', 0, this.config.goal);
  }

  /** The sky between the heads-up display and the train's roof. */
  get sky() {
    const stage = this.ctx.stage;
    const hud = this.ctx.hud;
    const top = stage.toStage(0, Math.max(hud.hudBottom, hud.cardBottom)).y + 10;
    return { top, bottom: TRACK_Y - 300 - this.ctx.world.cameraY, left: stage.viewLeft, right: stage.viewRight };
  }

  /** The frame with the model snowflake (top left of the sky, out of the way). */
  get frame() {
    const s = this.sky;
    return { x: s.left + 120, y: s.top + 74, r: 58 };
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    const reach = Math.max(FLAKE_R + 14, 34 / this.ctx.stage.scale);
    let best = null;
    let bestD = reach;
    for (const f of this.flakes) {
      if (f.caught) continue;
      const d = Math.hypot(f.x - p.x, f.y - p.y);
      if (d < bestD) {
        best = f;
        bestD = d;
      }
    }
    if (!best) return;
    if (best.kind === this.model) {
      best.caught = 0.01;
      this.caught += 1;
      this.particles.burst(best.x, best.y, SPARKS, 18, 220);
      this.ctx.hud.setCounter('❄️', this.caught, this.config.goal);
      const per = Math.ceil(this.config.goal / Math.max(1, this.config.models));
      if (this.caught < this.config.goal && this.caught % per === 0) this.changeModel();
    } else {
      best.wobble = 0.5;
      this.mistakes += 1;
    }
  }

  /** @private A new model to look for. */
  changeModel() {
    let next = this.model;
    while (next === this.model) next = Math.floor(Math.random() * KINDS);
    this.model = next;
    this.noTwinT = 2;
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    const s = this.sky;
    // new snowflakes; a twin of the model is never missing for long
    this.spawnT -= dt;
    const live = this.flakes.filter(f => !f.caught);
    this.noTwinT = live.some(f => f.kind === this.model) ? 0 : this.noTwinT + dt;
    if (this.spawnT <= 0 && live.length < MAX_FLAKES && this.phase === 'running') {
      this.spawnT = SPAWN;
      const twin = this.noTwinT > 1.5 || Math.random() < 0.35;
      let kind = this.model;
      if (!twin) while (kind === this.model) kind = Math.floor(Math.random() * KINDS);
      const f = this.frame;
      const minX = f.x + f.r + FLAKE_R + 20;
      this.flakes.push({
        x: minX + Math.random() * Math.max(10, s.right - 60 - minX),
        y: s.top - FLAKE_R,
        kind,
        spin: (Math.random() - 0.5) * 0.6,
        phase: Math.random() * TAU,
        caught: 0,
        wobble: 0,
      });
    }
    for (const fl of this.flakes) {
      if (fl.caught) fl.caught += dt;
      else fl.y += FALL * dt;
      fl.wobble = Math.max(0, fl.wobble - dt);
    }
    this.flakes = this.flakes.filter(fl => (fl.caught ? fl.caught < 0.5 : fl.y < s.bottom + FLAKE_R));
    if (this.caught >= this.config.goal || this.phase === 'wrapping') this.finishMission();
  }

  /** @private */
  finishMission() {
    if (this.phase === 'finished') return;
    this.ctx.hud.hideCounter();
    const all = this.caught >= this.config.goal;
    this.complete(all ? (this.mistakes <= 2 ? 3 : 2) : 1,
      all ? 'Ai găsit toți fulgii gemeni!' : `Ai găsit ${this.caught} fulgi gemeni din ${this.config.goal}.`);
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    for (const f of this.flakes) {
      const sway = Math.sin(this.time * 0.8 + f.phase) * 18 + Math.sin(f.wobble * 30) * f.wobble * 16;
      const k = f.caught ? 1 + f.caught * 2 : 1;
      c.save();
      c.globalAlpha = f.caught ? clamp(1 - f.caught * 2, 0, 1) : 1;
      drawFlake(c, f.x + sway, f.y, FLAKE_R * k, f.kind, this.time * f.spin);
      c.restore();
    }
    // the model, in a frame
    const m = this.frame;
    glow(c, m.x, m.y, m.r * 1.6, 'rgba(180,220,255,0.35)', 'rgba(180,220,255,0)');
    fillRoundRect(c, m.x - m.r, m.y - m.r, m.r * 2, m.r * 2, 18, 'rgba(19,41,90,0.88)');
    c.strokeStyle = '#ffffff';
    c.lineWidth = 4;
    c.beginPath();
    c.roundRect(m.x - m.r, m.y - m.r, m.r * 2, m.r * 2, 18);
    c.stroke();
    drawFlake(c, m.x, m.y + 4, m.r * 0.72, this.model, 0);
    c.fillStyle = '#ffe082';
    c.font = '800 18px "Baloo 2", system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('Caută:', m.x, m.y - m.r + 14);
    this.particles.draw(c);
  }
}

/**
 * A six-armed snowflake; the kind decides how the arms are decorated.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {number} kind  0..KINDS-1
 * @param {number} angle
 */
export function drawFlake(c, x, y, r, kind, angle) {
  c.save();
  c.translate(x, y);
  c.rotate(angle);
  c.strokeStyle = '#ffffff';
  c.fillStyle = '#ffffff';
  c.lineCap = 'round';
  c.lineWidth = Math.max(2.5, r * 0.11);
  c.shadowColor = 'rgba(150,200,255,0.9)';
  c.shadowBlur = r * 0.25;
  for (let i = 0; i < 6; i++) {
    c.save();
    c.rotate((i * TAU) / 6);
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, -r);
    if (kind === 0) {
      // two pairs of branches like a fir
      for (const t of [0.45, 0.72]) {
        c.moveTo(0, -r * t);
        c.lineTo(-r * 0.24, -r * (t + 0.18));
        c.moveTo(0, -r * t);
        c.lineTo(r * 0.24, -r * (t + 0.18));
      }
      c.stroke();
    } else if (kind === 1) {
      c.stroke();
      c.beginPath();
      c.arc(0, -r * 0.9, r * 0.14, 0, TAU);
      c.fill();
    } else if (kind === 2) {
      c.stroke();
      // a diamond at the tip
      c.beginPath();
      c.moveTo(0, -r * 1.05);
      c.lineTo(r * 0.14, -r * 0.82);
      c.lineTo(0, -r * 0.6);
      c.lineTo(-r * 0.14, -r * 0.82);
      c.closePath();
      c.fill();
    } else {
      // one wide V near the middle
      c.moveTo(0, -r * 0.35);
      c.lineTo(-r * 0.36, -r * 0.62);
      c.moveTo(0, -r * 0.35);
      c.lineTo(r * 0.36, -r * 0.62);
      c.stroke();
    }
    c.restore();
  }
  if (kind === 3) {
    c.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6 + Math.PI / 6;
      c.lineTo(Math.cos(a) * r * 0.22, Math.sin(a) * r * 0.22);
    }
    c.closePath();
    c.stroke();
  }
  c.restore();
}
