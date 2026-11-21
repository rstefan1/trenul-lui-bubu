/**
 * @file Travel mission "the train is snowed in".
 *
 * Climbing towards the pass in a heavy snowfall, the train stops in front
 * of a huge snowdrift that covers the line. In three short steps:
 *
 *   0. Bubu climbs out of her window and lands next to the shovel;
 *   1. dig — the child rubs the drift (moves the mouse with the button held,
 *      or the finger) or taps it; snow flies off and the drift shrinks;
 *   2. signal — the rest is too much for Bubu: the child touches the
 *      lantern (the one packed in Timișoara!) three times to call for help;
 *   3. the snowplough — a little orange plough engine comes down the line,
 *      clears it and goes away; Bubu hops back to her window and the train
 *      continues.
 *
 * The mission takes the controls of the train to stop it and gives them
 * back at the end.
 */

import { clamp, easeInOut, lerp } from '../core/math.js';
import { Particles } from '../gfx/particles.js';
import { fillCircle, fillRoundRect, glow } from '../gfx/shapes.js';
import { drawBubu } from '../train/bubu.js';
import { TRACK_Y } from '../world/track.js';
import { Mission } from './mission.js';

/** How much snow one stage unit of rubbing clears (the drift starts at 1). */
const RUB = 1 / 2400;
/** How much one tap clears. */
const TAP = 0.035;
/** The plough takes over when this much snow is left. */
const PLOUGH_AT = 0.38;
/** Seconds of Bubu's hop out of the window, and back in. */
const HOP_TIME = 1.1;
/** Width of the drift (stage units). */
const DRIFT_W = 320;
/** Gap between the stopped train and the drift (room for Bubu and the lantern). */
const GAP = 280;

/**
 * @typedef {import('./mission.js').MissionConfig & {digText: string, signalText: string, ploughText: string}} SnowboundConfig
 */

export class SnowboundMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {SnowboundConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {'stopping' | 'out' | 'dig' | 'signal' | 'plough' | 'back' | 'go'} */
    this.step = 'stopping';
    this.stepT = 0;
    this.time = 0;
    /** Snow left on the line (1 = the whole drift). */
    this.snow = 1;
    this.driftX = 0;
    this.signals = 0;
    this.flash = 0;
    this.ploughX = 0;
    /** @type {{x: number, y: number} | null} last pointer position while rubbing */
    this.rubbing = null;
    /** @type {import('../journey/journey.js').Controls | null} */
    this.controls = null;
    this.particles = new Particles();
    this.digTime = 0;
    /** Seconds the locomotive whistles before setting off again. */
    this.whistleFor = 0;
  }

  start(hints) {
    super.start(hints);
    const j = this.ctx.journey;
    this.controls = j.takeControl();
    if (this.controls) this.controls.target = 0;
    // the drift is just beyond the place where the braking train stops
    const stopping = (j.speed * j.speed) / (2 * 260);
    this.driftX = j.distance + stopping + GAP;
  }

  /** Screen x of the drift's left edge. */
  get driftScreenX() {
    return this.driftX - this.ctx.journey.distance + this.ctx.world.anchorX;
  }

  /** The lantern, in front of the train on the ground (screen coordinates). */
  get lantern() {
    const x = this.driftScreenX - 190;
    return { x, y: TRACK_Y + 40 - this.ctx.world.cameraY };
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    if (this.step === 'dig' && this.onDrift(p)) {
      this.rubbing = { x: p.x, y: p.y };
      this.clear(TAP, p);
    } else if (this.step === 'signal') {
      const l = this.lantern;
      if (Math.hypot(p.x - l.x, p.y - (l.y - 40)) < Math.max(80, 50 / this.ctx.stage.scale)) {
        this.signals += 1;
        this.flash = 1;
        if (this.signals >= 3) this.setStep('plough');
      }
    }
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerMove(p) {
    if (this.step !== 'dig' || !this.rubbing) return;
    if (!this.onDrift(p)) return;
    const d = Math.hypot(p.x - this.rubbing.x, p.y - this.rubbing.y);
    this.rubbing = { x: p.x, y: p.y };
    if (d > 2) this.clear(d * RUB, p);
  }

  pointerUp() {
    this.rubbing = null;
  }

  /**
   * Is a point over the drift?
   * @private
   * @param {{x: number, y: number}} p
   */
  onDrift(p) {
    const x0 = this.driftScreenX;
    const top = TRACK_Y - 60 - 220 * this.snow - this.ctx.world.cameraY;
    return p.x > x0 - 40 && p.x < x0 + DRIFT_W + 40 && p.y > top - 60 && p.y < TRACK_Y + 80 - this.ctx.world.cameraY;
  }

  /**
   * Removes some snow, with a puff where the child dug.
   * @private
   * @param {number} amount
   * @param {{x: number, y: number}} p
   */
  clear(amount, p) {
    this.snow = Math.max(PLOUGH_AT - 0.01, this.snow - amount);
    if (Math.random() < 0.6) this.particles.burst(p.x, p.y, ['#ffffff', '#e3ecf8'], 5, 220);
    if (this.snow <= PLOUGH_AT) this.setStep('signal');
  }

  /**
   * @private
   * @param {'stopping' | 'out' | 'dig' | 'signal' | 'plough' | 'back' | 'go'} step
   */
  setStep(step) {
    if (this.step === step) return;
    this.step = step;
    this.stepT = 0;
    const hud = this.ctx.hud;
    if (step === 'out') this.ctx.world.train.setBubuVisible(false, true);
    if (step === 'go') {
      this.ctx.world.train.setBubuVisible(true, true);
      const audio = this.ctx.audio;
      this.whistleFor = audio?.canPlay('whistle') ? audio.duration('whistle') : 0;
      audio?.play('whistle');
    }
    if (step === 'dig') hud.instruct(this.config.title, this.config.digText);
    if (step === 'signal') hud.instruct(this.config.title, this.config.signalText);
    if (step === 'plough') {
      hud.instruct(this.config.title, this.config.ploughText);
      this.ploughX = this.ctx.stage.viewRight + 300;
    }
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.stepT += dt;
    this.flash = Math.max(0, this.flash - dt * 2.5);
    this.particles.update(dt);
    const j = this.ctx.journey;
    // pan the view forward so the drift ahead of the train is fully on screen
    const w = this.ctx.world;
    w.panTarget = this.step === 'back' || this.step === 'go' ? 0 : Math.max(0, w.baseAnchorX + GAP + DRIFT_W + 60 - this.ctx.stage.viewRight);
    if (this.step === 'stopping' && j.speed < 1) this.setStep('out');
    if (this.step === 'out' && this.stepT >= HOP_TIME) this.setStep('dig');
    if (this.step === 'back' && this.stepT >= HOP_TIME) this.setStep('go');
    if (this.step === 'dig') this.digTime += dt;
    if (this.step === 'plough') {
      // the plough comes down the line, pushes through the drift and goes away
      const target = this.driftScreenX + DRIFT_W * 0.2;
      const t = this.stepT;
      if (t < 2.2) this.ploughX = lerp(this.ctx.stage.viewRight + 300, target, clamp(t / 2.2, 0, 1));
      else if (t < 3.6) {
        this.snow = Math.max(0, lerp(PLOUGH_AT, 0, (t - 2.2) / 1.4));
        if (Math.random() < 0.5) this.particles.burst(this.ploughX, TRACK_Y - 60 - this.ctx.world.cameraY, ['#ffffff', '#e3ecf8'], 6, 260);
      } else this.ploughX = lerp(target, this.ctx.stage.viewRight + 400, clamp((t - 3.6) / 2, 0, 1));
      if (t > 5.4) this.setStep('back');
    }
    if (this.step === 'go') {
      // the locomotive whistles first, then the train sets off again
      if (this.stepT >= this.whistleFor) {
        if (this.controls) {
          this.controls = null;
          this.ctx.journey.releaseControl();
        }
        this.ctx.hud.hideAnnouncement();
        this.complete(this.digTime < 25 ? 3 : 2, 'Linia e liberă! Mulțumim, plugule de zăpadă!');
      }
    }
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const w = this.ctx.world;
    const x0 = this.driftScreenX;
    w.drawTinted(c, TRACK_Y - 400, this.ctx.stage.viewBottom + w.cameraY + 10, b => {
      // the drift: a big white mound over the rails
      const h = 60 + 220 * this.snow;
      b.fillStyle = '#f4f8ff';
      b.beginPath();
      b.moveTo(x0 - 40, TRACK_Y + 30);
      b.bezierCurveTo(x0 + 20, TRACK_Y - h, x0 + DRIFT_W - 60, TRACK_Y - h * 1.05, x0 + DRIFT_W + 40, TRACK_Y + 30);
      b.closePath();
      b.fill();
      b.fillStyle = 'rgba(160,180,215,0.45)';
      b.beginPath();
      b.moveTo(x0 + DRIFT_W * 0.45, TRACK_Y + 30);
      b.bezierCurveTo(x0 + DRIFT_W * 0.6, TRACK_Y - h * 0.8, x0 + DRIFT_W - 40, TRACK_Y - h * 0.9, x0 + DRIFT_W + 40, TRACK_Y + 30);
      b.closePath();
      b.fill();
      if (this.step === 'plough' || this.step === 'go') this.drawPlough(b, this.ploughX);
    });
    c.save();
    c.translate(0, -w.cameraY);
    // Bubu with her shovel, and the lantern
    const bx = x0 - 95;
    const dig = this.step === 'dig' ? Math.sin(this.time * 10) * 0.25 : 0;
    c.strokeStyle = '#6d4c41';
    c.lineWidth = 6;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(bx + 10, TRACK_Y + 10);
    c.lineTo(bx + 60 + Math.cos(dig) * 20, TRACK_Y - 10 + Math.sin(dig) * 30);
    c.stroke();
    fillRoundRect(c, bx + 66 + Math.cos(dig) * 20, TRACK_Y - 26 + Math.sin(dig) * 30, 26, 22, 4, '#90a4ae');
    // Bubu stands by the drift only between climbing out and climbing back in
    if (this.step === 'dig' || this.step === 'signal' || this.step === 'plough') drawBubu(c, bx, TRACK_Y + 30, 90, dig * 0.3);
    const l = { x: x0 - 190, y: TRACK_Y + 40 };
    if (this.step === 'signal' || this.flash > 0) {
      glow(c, l.x, l.y - 40, 90 + this.flash * 160, `rgba(255,214,120,${0.35 + 0.5 * this.flash})`, 'rgba(255,214,120,0)');
      if (this.flash > 0) {
        c.fillStyle = `rgba(255,240,180,${0.35 * this.flash})`;
        c.beginPath();
        c.moveTo(l.x, l.y - 40);
        c.lineTo(this.ctx.stage.viewRight, l.y - 220);
        c.lineTo(this.ctx.stage.viewRight, l.y + 100);
        c.closePath();
        c.fill();
      }
    }
    fillRoundRect(c, l.x - 18, l.y - 70, 36, 56, 10, '#37474f');
    fillRoundRect(c, l.x - 12, l.y - 62, 24, 36, 6, this.step === 'signal' || this.flash ? '#ffe082' : '#90a4ae');
    c.strokeStyle = '#37474f';
    c.lineWidth = 4;
    c.beginPath();
    c.arc(l.x, l.y - 74, 12, Math.PI, 0);
    c.stroke();
    if (this.step === 'signal') {
      c.fillStyle = '#ffffff';
      c.font = '800 22px "Baloo 2", system-ui, sans-serif';
      c.textAlign = 'center';
      c.fillText(`${this.signals} / 3`, l.x, l.y - 100);
    }
    // a hint of how much snow is left while digging
    if (this.step === 'dig') {
      const k = (this.snow - PLOUGH_AT) / (1 - PLOUGH_AT);
      fillRoundRect(c, x0 + DRIFT_W / 2 - 100, TRACK_Y - 330, 200, 16, 8, 'rgba(19,41,90,0.7)');
      fillRoundRect(c, x0 + DRIFT_W / 2 - 100, TRACK_Y - 330, Math.max(16, 200 * k), 16, 8, '#e3ecf8');
    }
    c.restore();
    if (this.step === 'out' || this.step === 'back') this.drawHop(c, x0 - 95);
    this.particles.draw(c);
  }

  /**
   * Bubu hopping between her window and the shovel (in an arc, spinning once).
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {number} groundX  where she stands to dig
   */
  drawHop(c, groundX) {
    const w = this.ctx.world;
    const win = w.trainToStage(w.train.bubuPosition);
    const ground = { x: groundX, y: TRACK_Y + 30 - w.cameraY };
    const t = easeInOut(clamp(this.stepT / HOP_TIME, 0, 1));
    const k = this.step === 'out' ? t : 1 - t;   // 0 = at the window, 1 = by the shovel
    const x = lerp(win.x, ground.x, k);
    const y = lerp(win.y, ground.y, k) - Math.sin(Math.PI * k) * 150;
    drawBubu(c, x, y, lerp(80, 90, k), (this.step === 'out' ? 1 : -1) * t * 6.28);
  }

  /**
   * The little snowplough engine (facing left, towards the train).
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {number} x  front of the plough
   */
  drawPlough(c, x) {
    const y = TRACK_Y;
    fillRoundRect(c, x + 40, y - 120, 200, 95, 10, '#f57c00');
    fillRoundRect(c, x + 160, y - 175, 80, 60, 8, '#ef6c00');
    fillRoundRect(c, x + 172, y - 165, 56, 30, 6, '#9fc3e6');
    c.fillStyle = '#ffd23f';
    c.fillRect(x + 40, y - 70, 200, 10);
    // the blade
    c.fillStyle = '#546e7a';
    c.beginPath();
    c.moveTo(x + 40, y - 110);
    c.lineTo(x - 10, y - 20);
    c.lineTo(x + 40, y - 20);
    c.closePath();
    c.fill();
    c.fillStyle = '#2b2f38';
    for (const wx of [x + 80, x + 200]) fillCircle(c, wx, y - 15, 15);
    // a beacon on the roof
    const on = Math.sin(this.time * 10) > 0;
    glow(c, x + 200, y - 185, 40, `rgba(255,170,60,${on ? 0.8 : 0.2})`, 'rgba(255,170,60,0)');
    c.fillStyle = on ? '#ffb300' : '#a1632a';
    fillCircle(c, x + 200, y - 182, 8);
  }

  dispose() {
    this.ctx.world.panTarget = 0;
    this.ctx.world.train.setBubuVisible(true);
    if (this.controls) this.ctx.journey.releaseControl();
    this.ctx.hud.hideAnnouncement();
  }
}
