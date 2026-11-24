/**
 * @file Travel mission "the stoker": the steam locomotive of a forest
 * railway burns wood, and Bubu feeds its fire.
 *
 * A pressure gauge stands above the cab, with a green zone. The pressure
 * falls slowly as the locomotive works; "Pune lemne!" (or a tap on the
 * wood box by the cab, or the space bar) throws a log into the firebox and
 * raises it. The train goes as the steam lets it: slowly with little
 * pressure, at a good pace in the green zone. Too much wood makes black
 * smoke, and the safety valve lets out steam with a hiss: a gentle mistake.
 *
 * With `drifts`, it snows in the forest: snowdrifts lie on the line, the
 * plough at the front of the locomotive pushes through them, and every
 * drift eats more steam, so the fire needs more wood.
 *
 * Help: while the pressure is low, the button pulses and a note points at
 * the wood box. The stars count the share of the trip spent in the green
 * zone. The mission takes the controls of the train and gives them back at
 * the end.
 *
 * Configuration (besides id/title/text):
 *   drifts   snowdrifts on the line (optional, 0 = none)
 */

import { clamp, smoothstep } from '../core/math.js';
import { drawTouchNote } from '../gfx/hints.js';
import { Particles } from '../gfx/particles.js';
import { fillRoundRect } from '../gfx/shapes.js';
import { TRACK_Y } from '../world/track.js';
import { el } from '../ui/dom.js';
import { leave } from '../ui/panel.js';
import { Mission } from './mission.js';

/** @typedef {import('./mission.js').MissionConfig & {drifts?: number}} StokerConfig */
/** @typedef {{x: number, plowed: number}} Drift  world x of its left end; how much is pushed away (0..1) */

/** The green zone of the gauge, and where the safety valve opens. */
const GREEN_LOW = 0.45;
const GREEN_HIGH = 0.8;
const VALVE = 0.92;
/** Pressure lost every second, and every second spent ploughing a drift. */
const USE = 0.045;
const PLOUGH_USE = 0.16;
/** Pressure a log gives (once it burns), and the seconds it flies into the cab. */
const LOG = 0.12;
const LOG_FLIGHT = 0.35;
/** Speeds: with almost no steam, and with plenty (stage units/s). */
const CRAWL = 50;
const FULL = 400;
/** Length of a snowdrift on the line (stage units). */
const DRIFT_W = 200;
/** Seconds at the start not counted for the stars (time to understand). */
const GRACE = 3;
const SNOW = ['#ffffff', '#e8f0fa', '#d5e2f2'];

export class StokerMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {StokerConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    this.pressure = 0.55;
    this.time = 0;
    /** Seconds counted for the stars, and of those, the seconds in the green zone. */
    this.counted = 0;
    this.green = 0;
    this.overfires = 0;
    /** Seconds until the safety valve may complain again. */
    this.valveT = 0;
    /** @type {number[]} seconds each flying log has been in the air */
    this.logs = [];
    /** A flash of fire in the cab window (seconds left). */
    this.flame = 0;
    /** @type {Drift[]} */
    this.drifts = [];
    /** @type {import('../journey/journey.js').Controls | null} */
    this.controls = null;
    /** @type {HTMLButtonElement | null} */
    this.button = null;
    this.particles = new Particles();
    /** @type {(e: KeyboardEvent) => void} */
    this.onKey = e => {
      if (e.code !== 'Space' || this.ctx.hud.paused) return;
      e.preventDefault();
      this.feed();
    };
  }

  /** @param {{duration?: number, window?: {from: number, to: number}}} hints */
  start(hints) {
    super.start(hints);
    const j = this.ctx.journey;
    this.controls = j.takeControl();
    const n = this.config.drifts ?? 0;
    if (n > 0) {
      const end = hints.window ? j.segment.start + hints.window.to * j.segment.length - 1200 : j.distance + n * 2500;
      const first = j.distance + 2200;
      this.drifts = Array.from({ length: n }, (_, i) => ({ x: first + (n > 1 ? (i * (end - first)) / (n - 1) : 0), plowed: 0 }));
    }
    this.button = /** @type {HTMLButtonElement} */ (el('button', { class: 'brake-btn sand-btn', type: 'button' }, ['🪵 Pune lemne!']));
    this.button.addEventListener('pointerdown', e => {
      e.preventDefault();
      this.feed();
    });
    this.button.addEventListener('click', e => { if (e.detail === 0) this.feed(); });
    document.body.append(this.button);
    window.addEventListener('keydown', this.onKey);
  }

  /** The steam of the locomotive (set by the journey), if any. */
  get steam() {
    return /** @type {{steam?: import('../train/steam.js').SteamPlume}} */ (this.ctx).steam ?? null;
  }

  /**
   * A part of the locomotive on the stage.
   * @private
   * @param {'bunker' | 'cab' | 'chimney'} name
   */
  part(name) {
    const w = this.ctx.world;
    const r = w.train.locoParts[name]?.[0];
    if (!r) return null;
    const p = w.trainToStage({ x: r[0], y: r[1] });
    return { x: p.x, y: p.y, w: r[2], h: r[3] };
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    const b = this.part('bunker');
    if (b && p.x > b.x - 30 && p.x < b.x + b.w + 30 && p.y > b.y - 30 && p.y < b.y + b.h + 30) this.feed();
  }

  /** @private A log for the fire. */
  feed() {
    if (this.phase === 'finished' || this.logs.length >= 2) return;
    this.logs.push(0);
    this.sound('whoosh');
  }

  /** @param {number} dt */
  update(dt) {
    if (dt <= 0) return;
    this.time += dt;
    this.particles.update(dt);
    this.valveT -= dt;
    this.flame = Math.max(0, this.flame - dt);
    const j = this.ctx.journey;
    const front = j.distance;

    // the logs land in the firebox and burn
    for (let i = this.logs.length - 1; i >= 0; i--) {
      this.logs[i] += dt;
      if (this.logs[i] >= LOG_FLIGHT) {
        this.logs.splice(i, 1);
        this.pressure += LOG;
        this.flame = 0.5;
        this.sound('flame');
      }
    }

    // the steam is used up, more so while ploughing through a drift
    let use = USE;
    for (const d of this.drifts) {
      if (front > d.x && d.plowed < 1) {
        d.plowed = clamp((front - d.x) / DRIFT_W, 0, 1);
        use += PLOUGH_USE;
        if (Math.random() < 0.6) {
          const nose = this.ctx.world.trainToStage({ x: 0, y: -20 });
          this.particles.burst(nose.x + 10, nose.y, SNOW, 3, 260);
        }
      }
    }
    this.pressure = Math.max(0, this.pressure - use * dt);

    // too much: the safety valve opens, with a hiss and black smoke
    if (this.pressure > VALVE) {
      this.pressure = VALVE - 0.04;
      if (this.valveT <= 0) {
        this.valveT = 2;
        this.overfires += 1;
        this.sound('whoosh');
        const chimney = this.part('chimney');
        if (chimney) this.steam?.jet(chimney.x + chimney.w / 2 - 70, chimney.y + 40);
        this.ctx.hud.announce('Fochistul', 'Ajunge! Prea multe lemne fac fum negru și supapa lasă aburul să iasă.', 'Misiune', 2.5);
      }
      if (this.steam) this.steam.dark = 1;
    }

    if (this.controls) this.controls.target = CRAWL + (FULL - CRAWL) * smoothstep(0.12, 0.6, this.pressure);
    if (this.time > GRACE && this.phase === 'running') {
      this.counted += dt;
      if (this.pressure >= GREEN_LOW && this.pressure <= GREEN_HIGH) this.green += dt;
    }
    if (this.button) this.button.classList.toggle('is-urgent', this.pressure < GREEN_LOW);
    if (this.phase === 'wrapping') this.finishMission();
  }

  /** @private */
  finishMission() {
    if (this.phase === 'finished') return;
    if (this.controls) {
      this.controls = null;
      this.ctx.journey.releaseControl();
    }
    const share = this.counted > 0 ? this.green / this.counted : 1;
    const stars = share >= 0.7 && this.overfires <= 1 ? 3 : share >= 0.45 ? 2 : 1;
    this.complete(stars, stars === 3
      ? 'Bravo, fochistule! Ai ținut aburul exact cât trebuie.'
      : 'Am ajuns! Locomotiva a avut abur tot drumul.');
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const cab = this.part('cab');
    const bunker = this.part('bunker');
    const cam = this.ctx.world.cameraY;
    // the snowdrifts on the line (the part not ploughed yet), and the plough at the front
    c.save();
    c.translate(0, -cam);
    for (const d of this.drifts) {
      const x0 = d.x - this.ctx.journey.distance + this.ctx.world.anchorX;
      const left = x0 + d.plowed * DRIFT_W;
      const right = x0 + DRIFT_W;
      if (right < this.ctx.stage.viewLeft || x0 > this.ctx.stage.viewRight || d.plowed >= 1) continue;
      c.fillStyle = '#f4f8ff';
      c.beginPath();
      c.moveTo(left, TRACK_Y + 8);
      c.quadraticCurveTo(left + 4, TRACK_Y - 46, (left + right) / 2, TRACK_Y - 50);
      c.quadraticCurveTo(right - 10, TRACK_Y - 44, right + 20, TRACK_Y + 8);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(150,175,210,0.35)';
      c.fillRect(left, TRACK_Y - 6, right - left, 10);
    }
    c.restore();
    if (this.drifts.length) {
      const nose = this.ctx.world.trainToStage({ x: 0, y: 0 });
      c.fillStyle = '#c62828';
      c.beginPath();
      c.moveTo(nose.x - 6, nose.y - 44);
      c.lineTo(nose.x + 22, nose.y - 2);
      c.lineTo(nose.x - 6, nose.y - 2);
      c.closePath();
      c.fill();
      c.fillStyle = 'rgba(255,255,255,0.35)';
      c.fillRect(nose.x - 4, nose.y - 30, 6, 26);
    }

    // the logs flying from the wood box into the cab, and the fire's flash in the window
    if (bunker && cab) {
      for (const t of this.logs) {
        const u = t / LOG_FLIGHT;
        const x = bunker.x + 20 + (cab.x + cab.w / 2 - bunker.x - 20) * u;
        const y = bunker.y + 10 + (cab.y + 70 - bunker.y - 10) * u - Math.sin(u * Math.PI) * 60;
        c.save();
        c.translate(x, y);
        c.rotate(u * 5);
        fillRoundRect(c, -16, -6, 32, 12, 5, '#8d5a2b');
        c.fillStyle = '#d9a86a';
        c.beginPath();
        c.arc(16, 0, 6, 0, Math.PI * 2);
        c.fill();
        c.restore();
      }
      if (this.flame > 0) {
        c.globalAlpha = this.flame * 1.6;
        c.fillStyle = '#ff9800';
        c.beginPath();
        c.ellipse(cab.x + cab.w / 2, cab.y + 140, 30, 16, 0, 0, Math.PI * 2);
        c.fill();
        c.globalAlpha = 1;
      }
      this.drawGauge(c, cab.x + cab.w / 2 + 20, cab.y - 96);
      if (this.pressure < GREEN_LOW && this.logs.length === 0) {
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 6);
        c.strokeStyle = `rgba(255,214,90,${0.5 + 0.5 * pulse})`;
        c.lineWidth = 5;
        c.strokeRect(bunker.x - 8 - pulse * 3, bunker.y - 8 - pulse * 3, bunker.w + 16 + pulse * 6, bunker.h + 16 + pulse * 6);
        drawTouchNote(c, this.ctx.stage, bunker.x + bunker.w / 2 + 120, bunker.y + 4, 'Pune lemne pe foc!');
      }
    }
    this.particles.draw(c);
  }

  /**
   * The pressure gauge: a round dial with a green zone and a red one, and its needle.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {number} x  centre
   * @param {number} y
   */
  drawGauge(c, x, y) {
    const r = 58;
    const a0 = Math.PI * 0.8;
    const a1 = Math.PI * 2.2;
    const at = (/** @type {number} */ v) => a0 + (a1 - a0) * v;
    c.fillStyle = '#2b2f38';
    c.beginPath();
    c.arc(x, y, r + 8, 0, Math.PI * 2);
    c.fill();
    c.fillStyle = '#fbf6ea';
    c.beginPath();
    c.arc(x, y, r, 0, Math.PI * 2);
    c.fill();
    c.lineWidth = 12;
    for (const [from, to, color] of /** @type {Array<[number, number, string]>} */ ([[0, GREEN_LOW, '#f2c14e'], [GREEN_LOW, GREEN_HIGH, '#2e9d57'], [GREEN_HIGH, 1, '#e53935']])) {
      c.strokeStyle = color;
      c.beginPath();
      c.arc(x, y, r - 12, at(from), at(to));
      c.stroke();
    }
    const a = at(clamp(this.pressure, 0, 1));
    c.strokeStyle = '#1b2440';
    c.lineWidth = 5;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(a) * (r - 8), y + Math.sin(a) * (r - 8));
    c.stroke();
    c.fillStyle = '#1b2440';
    c.beginPath();
    c.arc(x, y, 7, 0, Math.PI * 2);
    c.fill();
    c.font = '800 15px "Baloo 2", system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('ABUR', x, y + 30);
  }

  dispose() {
    if (this.controls) this.ctx.journey.releaseControl();
    leave(this.button);
    window.removeEventListener('keydown', this.onKey);
  }
}
