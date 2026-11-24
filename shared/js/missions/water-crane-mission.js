/**
 * @file Station mission "water for the boiler": a steam locomotive drinks
 * water, and in the station of a forest railway stands a water crane, a
 * tall post with an arm that swings over the locomotive's water tank.
 *
 * Three steps:
 *
 *   1. the child touches the crane and its arm swings over the tank;
 *   2. the child holds "Dă drumul la apă" and the water runs while it is
 *      held; a tall gauge beside the locomotive shows the level, and the
 *      water must be stopped in the green band. Letting it overflow is a
 *      gentle mistake (the water splashes out, the valve shuts by itself);
 *   3. the child touches the crane again to swing the arm back, away from
 *      the line, so the train can leave without hitting it.
 *
 * Configuration (besides id/title/text):
 *   fact   shown at the end
 */

import { clamp } from '../core/math.js';
import { drawTouchNote } from '../gfx/hints.js';
import { fillRoundRect } from '../gfx/shapes.js';
import { TRACK_Y } from '../world/track.js';
import { el } from '../ui/dom.js';
import { leave } from '../ui/panel.js';
import { Mission, starsForMistakes } from './mission.js';

/** @typedef {import('./mission.js').MissionConfig & {fact: string}} WaterConfig */

/** The green band of the gauge, and where the tank overflows. */
const BAND_LOW = 0.74;
const BAND_HIGH = 0.88;
const OVERFLOW = 0.97;
/** How fast the water rises while it runs (share of the tank per second), and the level at the start. */
const FLOW = 0.16;
const START = 0.2;
const SPLASH = ['#9fd0f5', '#4f86c0', '#ffffff'];

export class WaterCraneMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {WaterConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {'swing' | 'fill' | 'back' | 'done'} */
    this.step = 'swing';
    this.level = START;
    this.running = false;
    this.mistakes = 0;
    /** 0 = the arm along the line (away), 1 = over the tank (animated). */
    this.arm = 0;
    this.armTarget = 0;
    this.time = 0;
    this.doneT = 0;
    /** @type {Array<{x: number, y: number, vx: number, vy: number, t: number}>} drops of a splash */
    this.drops = [];
    /** @type {HTMLButtonElement | null} */
    this.button = null;
    /** @type {(e: KeyboardEvent) => void} */
    this.onKeyDown = e => {
      if (e.code !== 'Space' || this.ctx.hud.paused || e.repeat) return;
      e.preventDefault();
      this.open(true);
    };
    /** @type {(e: KeyboardEvent) => void} */
    this.onKeyUp = e => {
      if (e.code === 'Space') this.open(false);
    };
  }

  start() {
    super.start();
    // the locomotive comes to the middle of the screen: the crane and the gauge stand in front of it
    this.ctx.world.lookAhead(0.5);
    const b = /** @type {HTMLButtonElement} */ (el('button', { class: 'brake-btn is-stopped', type: 'button' }, ['💧 Ține apăsat: dă drumul la apă']));
    b.addEventListener('pointerdown', e => {
      e.preventDefault();
      b.setPointerCapture?.(e.pointerId);
      this.open(true);
    });
    for (const type of ['pointerup', 'pointercancel', 'lostpointercapture']) b.addEventListener(type, () => this.open(false));
    b.disabled = true;
    this.button = b;
    document.body.append(b);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  /**
   * Where things are on the stage: the tank's filler on the locomotive, the
   * crane's post beside it and the gauge.
   * @private
   */
  layout() {
    const w = this.ctx.world;
    const bunker = w.train.locoParts.bunker?.[0] ?? [92, -106, 50, 64];
    // the filler on top of the tank, just in front of the wood box
    const filler = w.trainToStage({ x: bunker[0] + bunker[2] + 40, y: -104 });
    const post = { x: filler.x + 150, y: TRACK_Y + 70 - w.cameraY };
    const gauge = { x: filler.x + 290, y: TRACK_Y - 330 - w.cameraY };
    return { filler, post, gauge };
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    if (this.step !== 'swing' && this.step !== 'back') return;
    const { post } = this.layout();
    if (Math.abs(p.x - post.x) > 170 || p.y < post.y - 360 || p.y > post.y + 40) return;
    this.sound('tock', post.x);
    if (this.step === 'swing') {
      this.armTarget = 1;
      this.step = 'fill';
      if (this.button) this.button.disabled = false;
    } else {
      this.armTarget = 0;
      this.step = 'done';
      this.ctx.hud.announce('Brațul e la loc', this.config.fact, 'Misiune', 4);
    }
  }

  /**
   * Opens or shuts the valve.
   * @private
   * @param {boolean} on
   */
  open(on) {
    if (this.step !== 'fill' || this.arm < 0.95) on = false;
    if (on === this.running) return;
    this.running = on;
    if (on) this.sound('whoosh');
    else if (this.step === 'fill' && this.level >= BAND_LOW) this.full();
  }

  /** @private The tank is full: now the arm must go back. */
  full() {
    this.running = false;
    this.step = 'back';
    if (this.button) this.button.disabled = true;
    this.sound('ding');
    this.ctx.hud.announce('Rezervorul e plin!', 'Acum atinge macaraua de apă ca să întorci brațul. Altfel îl lovește trenul!', 'Misiune', 3.5);
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.arm = clamp(this.arm + Math.sign(this.armTarget - this.arm) * dt * 1.6, 0, 1);
    if (this.running) {
      this.level += FLOW * dt;
      if (this.level >= OVERFLOW) {
        // it overflows: a splash, and the valve shuts by itself
        this.mistakes += 1;
        this.oops();
        const { filler } = this.layout();
        for (let k = 0; k < 14; k++) this.drops.push({ x: filler.x, y: filler.y, vx: (Math.random() - 0.5) * 300, vy: -120 - Math.random() * 160, t: 0 });
        this.level = BAND_HIGH;
        this.ctx.hud.announce('A dat pe-afară!', 'Data viitoare oprește apa mai devreme, când acul e în zona verde.', 'Misiune', 3);
        this.full();
      }
    }
    for (const d of this.drops) {
      d.t += dt;
      d.vy += 600 * dt;
      d.x += d.vx * dt;
      d.y += d.vy * dt;
    }
    this.drops = this.drops.filter(d => d.t < 1);
    if (this.button) this.button.classList.toggle('is-urgent', this.step === 'fill' && !this.running);
    if (this.step === 'done' && this.arm <= 0) {
      this.doneT += dt;
      if (this.doneT > 1.5 && this.phase !== 'finished') {
        this.complete(starsForMistakes(this.mistakes, 1, 0), this.mistakes === 0
          ? 'Perfect! Rezervorul e plin ochi, fără o picătură vărsată.'
          : 'Bravo! Locomotiva are apă pentru tot urcușul.');
      }
    }
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const { filler, post, gauge } = this.layout();
    const top = post.y - 300;
    // the post of the water crane, and its arm (seen from the side it shortens as it turns)
    fillRoundRect(c, post.x - 16, top, 32, post.y - top, 10, '#3b4250');
    fillRoundRect(c, post.x - 26, post.y - 16, 52, 20, 6, '#2b2f38');
    fillRoundRect(c, post.x - 22, top - 12, 44, 22, 8, '#c62828');
    const reach = 40 + this.arm * (post.x - filler.x - 40);
    const ay = top + 6;
    c.strokeStyle = '#3b4250';
    c.lineWidth = 16;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(post.x, ay);
    c.lineTo(post.x - reach, ay);
    c.stroke();
    // the hose hanging from the end of the arm, down to the filler when it is over the tank
    const hx = post.x - reach;
    const hoseEnd = this.arm > 0.95 ? filler.y - 8 : ay + 50;
    c.strokeStyle = '#2b2f38';
    c.lineWidth = 12;
    c.beginPath();
    c.moveTo(hx, ay);
    c.lineTo(hx, hoseEnd);
    c.stroke();
    if (this.running) {
      c.fillStyle = 'rgba(120,180,240,0.8)';
      c.fillRect(hx - 5, hoseEnd, 10, filler.y - hoseEnd + 6);
    }
    for (const d of this.drops) {
      c.globalAlpha = 1 - d.t;
      c.fillStyle = SPLASH[Math.floor(d.x) % SPLASH.length] ?? SPLASH[0];
      c.beginPath();
      c.arc(d.x, d.y, 5, 0, Math.PI * 2);
      c.fill();
    }
    c.globalAlpha = 1;

    this.drawGauge(c, gauge.x, gauge.y);

    if (this.step === 'swing' || this.step === 'back') {
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 6);
      c.strokeStyle = `rgba(255,214,90,${0.5 + 0.5 * pulse})`;
      c.lineWidth = 5;
      c.strokeRect(post.x - 40 - pulse * 3, top - 30 - pulse * 3, 80 + pulse * 6, post.y - top + 50 + pulse * 6);
      drawTouchNote(c, this.ctx.stage, post.x, top - 40, this.step === 'swing' ? 'Adu brațul peste locomotivă!' : 'Întoarce brațul la loc!');
    }
  }

  /**
   * The tall gauge of the tank: the water level, the green band and the red top.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {number} x  centre
   * @param {number} y  top
   */
  drawGauge(c, x, y) {
    const w = 54;
    const h = 260;
    fillRoundRect(c, x - w / 2 - 8, y - 8, w + 16, h + 16, 16, '#2b2f38');
    fillRoundRect(c, x - w / 2, y, w, h, 10, '#eef3f8');
    const at = (/** @type {number} */ v) => y + h - v * h;
    c.fillStyle = 'rgba(46,157,87,0.35)';
    c.fillRect(x - w / 2, at(BAND_HIGH), w, at(BAND_LOW) - at(BAND_HIGH));
    c.fillStyle = 'rgba(229,57,53,0.35)';
    c.fillRect(x - w / 2, y, w, at(OVERFLOW) - y);
    // the water
    const lv = clamp(this.level, 0, 1);
    c.fillStyle = '#4f86c0';
    c.fillRect(x - w / 2 + 6, at(lv), w - 12, y + h - at(lv) - 6);
    c.fillStyle = 'rgba(255,255,255,0.45)';
    c.fillRect(x - w / 2 + 10, at(lv) + 2, 6, y + h - at(lv) - 10);
    // the band's edges
    c.fillStyle = '#2e9d57';
    c.fillRect(x - w / 2 - 6, at(BAND_HIGH) - 2, w + 12, 4);
    c.fillRect(x - w / 2 - 6, at(BAND_LOW) - 2, w + 12, 4);
    c.fillStyle = '#1b2440';
    c.font = '800 18px "Baloo 2", system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('APĂ', x, y + h + 26);
  }

  dispose() {
    this.ctx.world.lookAhead(null);
    leave(this.button);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
