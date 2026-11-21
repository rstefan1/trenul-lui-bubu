/**
 * @file Travel mission "the bells on the line": the child drives the train.
 *
 * Bells hang from the overhead wire. Each has a sign saying how fast the
 * train must pass under it for the pantograph to ring it: slowly, medium or
 * fast. The child chooses the speed with three big buttons (slow, medium,
 * fast); the train reaches it smoothly and keeps it. The dashboard shows the
 * speedometer and the next three bells, so the child knows in advance which
 * speed will be needed. A bell passed at the right speed rings (it swings
 * and sends up golden notes); otherwise it only goes "clonk".
 *
 * The mission takes the controls of the train (Journey#takeControl) and
 * gives them back when it ends, after which the train continues normally to
 * the next station.
 *
 * Configuration (besides id/title/text):
 *   bells   how many bells hang along the line
 */

import { clamp } from '../core/math.js';
import { Particles } from '../gfx/particles.js';
import { fillCircle, fillRoundRect, glow, roundRectPath } from '../gfx/shapes.js';
import { WIRE_Y } from '../world/track.js';
import { MANUAL } from '../journey/journey.js';
import { el } from '../ui/dom.js';
import { Mission } from './mission.js';

/** Train speed (world units/s) → the km/h shown to the child. */
const KMH = 0.2;

/**
 * The three speed bands, in world units per second.
 * @type {Readonly<Record<'slow' | 'medium' | 'fast', {min: number, max: number, target: number, label: string, icon: string, color: string}>>}
 */
const BANDS = Object.freeze({
  slow: { min: MANUAL.minSpeed, max: 260, target: 170, label: 'ÎNCET', icon: '🐢', color: '#2f7fd8' },
  medium: { min: 280, max: 430, target: 355, label: 'MEDIU', icon: '🚂', color: '#2e9d57' },
  fast: { min: 450, max: MANUAL.maxSpeed, target: 540, label: 'REPEDE', icon: '🐇', color: '#e0472e' },
});

/** The pantograph is this far behind the front of the train (train units). */
const PANTOGRAPH_X = -200;

/**
 * @typedef {object} Bell
 * @property {number} worldX
 * @property {'slow' | 'medium' | 'fast'} band
 * @property {'waiting' | 'rung' | 'missed'} state
 * @property {number} t   seconds since it was passed
 */

/**
 * @typedef {import('./mission.js').MissionConfig & {bells: number}} BellsConfig
 */

export class BellsMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {BellsConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {Bell[]} */
    this.bells = [];
    this.rung = 0;
    this.time = 0;
    this.particles = new Particles();
    /** @type {import('../journey/journey.js').Controls | null} */
    this.controls = null;
    /** @type {HTMLElement | null} the three speed buttons */
    this.gearbox = null;
    /** @type {'slow' | 'medium' | 'fast'} */
    this.gear = 'fast';
    /** @type {(e: KeyboardEvent) => void} */
    this.onKey = e => {
      const order = /** @type {const} */ (['slow', 'medium', 'fast']);
      const i = order.indexOf(this.gear);
      const pick = { Digit1: 0, Digit2: 1, Digit3: 2, ArrowDown: Math.max(0, i - 1), ArrowUp: Math.min(2, i + 1) }[e.code];
      if (pick === undefined) return;
      e.preventDefault();
      this.setGear(order[pick]);
    };
  }

  /** @param {{duration?: number, window?: {from: number, to: number}}} hints */
  start(hints) {
    super.start(hints);
    const j = this.ctx.journey;
    this.controls = j.takeControl();

    // bells along the window, starting a little ahead (time to look and react)
    const seg = j.segment;
    const end = seg.start + (hints.window ? hints.window.to : 0.85) * seg.length - 900;
    const first = j.distance + 3200;
    const n = this.config.bells;
    const spacing = Math.max(2200, (end - first) / Math.max(1, n - 1));
    /** @type {Array<'slow' | 'medium' | 'fast'>} */
    const pattern = ['slow', 'fast', 'medium', 'slow', 'medium', 'fast', 'slow', 'fast', 'medium', 'slow', 'fast', 'medium'];
    for (let i = 0; i < n; i++) {
      this.bells.push({ worldX: first + i * spacing, band: pattern[i % pattern.length], state: 'waiting', t: 0 });
    }

    // the gearbox: three big buttons (and the keys 1, 2, 3 or the arrows)
    const buttons = /** @type {const} */ (['fast', 'medium', 'slow']).map(gear => {
      const band = BANDS[gear];
      const b = el('button', {
        class: `gear-btn gear-btn--${gear}`, type: 'button', 'aria-pressed': 'false',
        style: `--gear:${band.color}`, 'aria-label': `Viteză ${band.label.toLowerCase()}`,
      }, [el('span', { class: 'gear-btn__icon', 'aria-hidden': 'true' }, [band.icon]), el('span', {}, [band.label])]);
      b.dataset.gear = gear;
      b.addEventListener('pointerdown', e => {
        e.preventDefault();
        this.setGear(gear);
      });
      b.addEventListener('click', e => { if (e.detail === 0) this.setGear(gear); });
      return b;
    });
    this.gearbox = el('div', { class: 'gearbox', role: 'group', 'aria-label': 'Viteza trenului' }, [
      el('span', { class: 'gearbox__title' }, ['Viteza']), ...buttons,
    ]);
    document.body.append(this.gearbox);
    this.setGear('fast');
    window.addEventListener('keydown', this.onKey);
    this.updateCounter();
  }

  /**
   * Chooses the speed of the train.
   * @param {'slow' | 'medium' | 'fast'} gear
   */
  setGear(gear) {
    this.gear = gear;
    if (this.controls) this.controls.target = BANDS[gear].target;
    for (const b of this.gearbox?.querySelectorAll('button') ?? []) {
      b.setAttribute('aria-pressed', String(/** @type {HTMLElement} */ (b).dataset.gear === gear));
    }
  }

  /** @private */
  updateCounter() {
    this.ctx.hud.setCounter('🔔', this.rung, this.bells.length);
  }

  /** Screen x of a world position. */
  toScreen(/** @type {number} */ worldX) {
    return worldX - this.ctx.journey.distance + this.ctx.world.anchorX;
  }

  /** The next bell still to be passed. */
  get nextBell() {
    return this.bells.find(b => b.state === 'waiting');
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    const j = this.ctx.journey;
    const pantograph = j.distance + PANTOGRAPH_X;
    for (const b of this.bells) {
      if (b.state !== 'waiting') {
        b.t += dt;
        continue;
      }
      if (pantograph < b.worldX) continue;
      const band = BANDS[b.band];
      const ok = j.speed >= band.min - 10 && j.speed <= band.max + 10;
      b.state = ok ? 'rung' : 'missed';
      b.t = 0;
      if (ok) {
        this.rung += 1;
        const x = this.toScreen(b.worldX);
        this.particles.burst(x, WIRE_Y + 40 - this.ctx.world.cameraY, ['#ffd54f', '#fff3c4', '#ffffff'], 18, 220);
      }
      this.updateCounter();
    }

    const allPassed = !this.nextBell;
    if (this.phase === 'wrapping' || allPassed) {
      if (allPassed || this.bells.every(b => b.state !== 'waiting' || this.toScreen(b.worldX) > this.ctx.stage.viewRight)) {
        this.finishMission();
      }
    }
  }

  /** @private */
  finishMission() {
    if (this.phase === 'finished') return;
    this.releaseControls();
    this.ctx.hud.hideCounter();
    const n = this.rung;
    const total = this.bells.length;
    const k = n / Math.max(1, total);
    this.complete(k >= 0.9 ? 3 : k >= 0.6 ? 2 : 1,
      n === total ? `Toți cei ${n} clopoței au sunat! Ce mecanic priceput!`
        : `Au sunat ${n} clopoței din ${total}. Frumos colind pe linia ferată!`);
  }

  /** @private */
  releaseControls() {
    if (!this.controls) return;
    this.controls = null;
    this.ctx.journey.releaseControl();
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const w = this.ctx.world;
    c.save();
    c.translate(0, -w.cameraY);
    for (const b of this.bells) {
      const x = this.toScreen(b.worldX);
      if (x < this.ctx.stage.viewLeft - 100 || x > this.ctx.stage.viewRight + 100) continue;
      this.drawBell(c, x, b);
    }
    c.restore();
    this.particles.draw(c);
    this.drawDashboard(c);
  }

  /**
   * A bell hanging from the wire, with its speed sign.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {number} x
   * @param {Bell} b
   */
  drawBell(c, x, b) {
    const band = BANDS[b.band];
    const swing = b.state === 'rung' ? Math.sin(b.t * 12) * 0.5 * Math.exp(-b.t * 1.2)
      : b.state === 'missed' ? Math.sin(b.t * 30) * 0.08 * Math.exp(-b.t * 4) : Math.sin(this.time * 2 + x * 0.01) * 0.05;
    const top = WIRE_Y;
    // the sign above the wire
    fillRoundRect(c, x - 52, top - 92, 104, 50, 12, '#ffffff');
    fillRoundRect(c, x - 48, top - 88, 96, 42, 10, b.state === 'missed' ? '#9aa3b2' : band.color);
    c.fillStyle = '#ffffff';
    c.font = '800 22px "Baloo 2", system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(band.label, x, top - 66);
    c.strokeStyle = '#3b4250';
    c.lineWidth = 2;
    c.beginPath();
    c.moveTo(x, top - 42);
    c.lineTo(x, top);
    c.stroke();
    // the bell
    c.save();
    c.translate(x, top);
    c.rotate(swing);
    c.strokeStyle = '#3b4250';
    c.beginPath();
    c.moveTo(0, 0);
    c.lineTo(0, 14);
    c.stroke();
    if (b.state === 'rung') glow(c, 0, 40, 60, 'rgba(255,220,120,0.6)', 'rgba(255,220,120,0)');
    c.fillStyle = b.state === 'missed' ? '#a7a08a' : '#f2c230';
    c.beginPath();
    c.moveTo(-8, 14);
    c.quadraticCurveTo(-12, 22, -14, 40);
    c.quadraticCurveTo(-20, 50, -24, 54);
    c.lineTo(24, 54);
    c.quadraticCurveTo(20, 50, 14, 40);
    c.quadraticCurveTo(12, 22, 8, 14);
    c.closePath();
    c.fill();
    c.fillStyle = 'rgba(255,255,255,0.45)';
    c.fillRect(-9, 20, 4, 24);
    c.fillStyle = '#b8860b';
    fillCircle(c, 0, 58, 6);
    c.fillStyle = '#d32f2f';
    fillCircle(c, -6, 14, 5);
    fillCircle(c, 6, 14, 5);
    c.restore();
    // golden notes rising from a bell that rang
    if (b.state === 'rung' && b.t < 1.6) {
      c.globalAlpha = 1 - b.t / 1.6;
      c.fillStyle = '#ffd23f';
      c.font = '800 30px "Baloo 2", system-ui, sans-serif';
      c.fillText('♪', x + 24 + b.t * 20, top + 20 - b.t * 70);
      c.fillText('♫', x - 26 - b.t * 14, top + 34 - b.t * 90);
      c.globalAlpha = 1;
    }
  }

  /**
   * Speedometer and "next bell" indicator, bottom left.
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  drawDashboard(c) {
    const stage = this.ctx.stage;
    const j = this.ctx.journey;
    const cx = stage.viewLeft + 150;
    const cy = stage.viewBottom - 70;
    const R = 105;
    // panel
    fillRoundRect(c, cx - 135, cy - 125, 270 + 230, 150, 26, 'rgba(19,41,90,0.85)');
    c.strokeStyle = 'rgba(255,255,255,0.85)';
    c.lineWidth = 3;
    c.beginPath();
    roundRectPath(c, cx - 135, cy - 125, 270 + 230, 150, 26);
    c.stroke();
    // coloured bands on the dial
    const ang = (/** @type {number} */ v) => Math.PI + (clamp(v, 0, MANUAL.maxSpeed) / MANUAL.maxSpeed) * Math.PI;
    for (const band of Object.values(BANDS)) {
      c.strokeStyle = band.color;
      c.lineWidth = 16;
      c.beginPath();
      c.arc(cx, cy, R - 12, ang(band.min), ang(band.max));
      c.stroke();
    }
    // needle
    const a = ang(j.speed);
    c.strokeStyle = '#ffffff';
    c.lineWidth = 6;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(cx, cy);
    c.lineTo(cx + Math.cos(a) * (R - 18), cy + Math.sin(a) * (R - 18));
    c.stroke();
    c.fillStyle = '#ffffff';
    fillCircle(c, cx, cy, 9);
    c.font = '800 28px "Baloo 2", system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'alphabetic';
    c.fillText(`${Math.round(j.speed * KMH)}`, cx, cy - 30);
    c.font = '700 15px "Baloo 2", system-ui, sans-serif';
    c.fillText('km/h', cx, cy - 12);

    // the next bells: the first one large, with how far it is; two more after it
    const nx = cx + 150;
    c.textAlign = 'left';
    c.font = '700 18px "Baloo 2", system-ui, sans-serif';
    c.fillStyle = 'rgba(255,255,255,0.85)';
    c.fillText('Urmează:', nx, cy - 84);
    const upcoming = this.bells.filter(b => b.state === 'waiting').slice(0, 3);
    if (upcoming.length) {
      const next = upcoming[0];
      const band = BANDS[next.band];
      fillRoundRect(c, nx, cy - 72, 130, 46, 12, band.color);
      c.fillStyle = '#ffffff';
      c.font = '800 24px "Baloo 2", system-ui, sans-serif';
      c.fillText(band.label, nx + 12, cy - 40);
      upcoming.slice(1).forEach((b, i) => {
        const bb = BANDS[b.band];
        fillRoundRect(c, nx + 140 + i * 34, cy - 64, 28, 30, 8, bb.color);
      });
      const dist = next.worldX - (j.distance + PANTOGRAPH_X);
      const k = clamp(1 - dist / 3200, 0, 1);
      fillRoundRect(c, nx, cy - 14, 200, 12, 6, 'rgba(255,255,255,0.25)');
      fillRoundRect(c, nx, cy - 14, Math.max(12, 200 * k), 12, 6, '#ffd23f');
      const ok = this.gear === next.band;
      c.font = '700 17px "Baloo 2", system-ui, sans-serif';
      c.fillStyle = ok ? '#b9f6ca' : '#ffe082';
      c.fillText(ok ? '✔ viteza aleasă e bună' : `Alege viteza ${band.label}!`, nx, cy + 14);
    }
  }

  dispose() {
    this.releaseControls();
    this.gearbox?.remove();
    window.removeEventListener('keydown', this.onKey);
  }
}
