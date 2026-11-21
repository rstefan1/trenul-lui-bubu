/**
 * @file Station mission "change of trains" (Suceava).
 *
 * The night train ends its journey here; Bubu goes on with a small regional
 * train. In two steps:
 *
 *   1. the departures board — Bubu's ticket says where she is going; the
 *      child finds that train on the board (and so its time and platform);
 *   2. the platforms — three trains stand at three platforms; the child
 *      touches the one at the platform shown on the board, and Bubu (with
 *      her tree) gets on.
 *
 * At the end the journey is told that the new train is boarded, so the
 * world shows it while it waits to leave.
 *
 * Configuration (besides id/title/text):
 *   destination   where Bubu goes (shown on the ticket)
 *   departures    [{time, to, via?, platform, ok?}] rows of the board
 *   platformText  instructions for the second step
 *   train         id of the train boarded (see TRAINS)
 *   doneText, fact
 */

import { clamp, easeInOut, lerp } from '../core/math.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { fillCircle, fillRoundRect, glow } from '../gfx/shapes.js';
import { drawBubu } from '../train/bubu.js';
import { el } from '../ui/dom.js';
import { SceneMission } from './scene-mission.js';

/** Seconds of Bubu's walk to the train. */
const WALK = 1.6;

/**
 * @typedef {{time: string, to: string, via?: string, platform: number, ok?: boolean}} Departure
 * @typedef {import('./mission.js').MissionConfig & {
 *   destination: string, departures: Departure[], platformText: string, train: string,
 *   doneText: string, fact: string
 * }} ChangeTrainConfig
 */

export class ChangeTrainMission extends SceneMission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {ChangeTrainConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {'board' | 'platforms' | 'walk' | 'done'} */
    this.step = 'board';
    this.stepT = 0;
    this.time = 0;
    this.mistakes = 0;
    /** @type {{text: string, t: number}} */
    this.say = { text: '', t: 9 };
    /** @type {number} index of a row that shakes after a wrong touch */
    this.shakeRow = -1;
    this.shakeT = 0;
    this.picked = -1;
    this.particles = new Particles();
    /** @type {HTMLElement | null} */
    this.ticket = null;
  }

  /** The right train. */
  get target() {
    return /** @type {Departure} */ (this.config.departures.find(d => d.ok));
  }

  start() {
    this.phase = 'running';
    this.ctx.hud.instruct(this.config.title, this.config.text);
    this.ticket = el('div', { class: 'ticket-chip' }, [
      el('span', { class: 'ticket-chip__label' }, ['Biletul lui Bubu']),
      el('span', {}, [`Suceava → ${this.config.destination}`]),
      el('small', {}, ['Tren regional']),
    ]);
    document.body.append(this.ticket);
  }

  /** The free area of the screen. */
  get area() {
    const stage = this.ctx.stage;
    const hud = this.ctx.hud;
    const top = stage.toStage(0, Math.max(hud.hudBottom, hud.cardBottom)).y + 20;
    const chip = this.ticket ? this.ticket.getBoundingClientRect() : null;
    const bottom = chip && chip.top > window.innerHeight / 2 ? stage.toStage(0, chip.top).y - 16 : stage.viewBottom - 30;
    return { left: stage.viewLeft + 30, right: stage.viewRight - 30, top, bottom };
  }

  // ------------------------------------------------------------ step 1: the board

  /** Geometry of the departures board. */
  get board() {
    const a = this.area;
    const rows = this.config.departures.length;
    const w = Math.min(900, a.right - a.left);
    const rowH = clamp((a.bottom - a.top - 110) / rows, 54, 90);
    const h = 90 + rowH * rows;
    return { x: (a.left + a.right) / 2 - w / 2, y: a.top + Math.max(0, (a.bottom - a.top - h) / 2), w, rowH, h };
  }

  // ------------------------------------------------------------ step 2: the platforms

  /** Geometry of the platforms: one train per platform, stacked. */
  get platforms() {
    const a = this.area;
    const n = 3;
    // in the middle of the screen (clear of the "?" button), with room below for Bubu
    const gap = (a.bottom - a.top - 110) / n;
    const width = Math.min(780, a.right - a.left - 260);
    const x0 = (a.left + a.right) / 2 - width / 2 + 40;
    return Array.from({ length: n }, (_, i) => ({ number: i + 1, y: a.top + gap * (i + 0.78), x0, x1: x0 + width }));
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    if (this.step === 'board') {
      const b = this.board;
      const i = Math.floor((p.y - (b.y + 80)) / b.rowH);
      if (p.x < b.x || p.x > b.x + b.w || i < 0 || i >= this.config.departures.length) return;
      const d = this.config.departures[i];
      if (d.ok) {
        this.picked = i;
        this.particles.burst(p.x, p.y, SPARKS, 20, 240);
        this.say = { text: `Da! Trenul spre ${d.to} pleacă la ${d.time}, de la linia ${d.platform}.`, t: 0 };
        setTimeout(() => this.toPlatforms(), 1600);
      } else {
        this.mistakes += 1;
        this.shakeRow = i;
        this.shakeT = 0.45;
        this.say = { text: `Acest tren merge la ${d.to}. Bubu merge la ${this.config.destination}.`, t: 0 };
      }
    } else if (this.step === 'platforms') {
      for (const pl of this.platforms) {
        if (Math.abs(p.y - (pl.y - 60)) > 75 || p.x < pl.x0 || p.x > pl.x1) continue;
        if (pl.number === this.target.platform) {
          this.step = 'walk';
          this.stepT = 0;
          this.ctx.hud.hideAnnouncement();
          this.ctx.hud.clearInstructions();
        } else {
          this.mistakes += 1;
          this.say = { text: `Aceasta e linia ${pl.number}. Pe tabelă scria linia ${this.target.platform}.`, t: 0 };
        }
        return;
      }
    }
  }

  /** @private */
  toPlatforms() {
    if (this.phase === 'finished') return;
    this.step = 'platforms';
    this.stepT = 0;
    this.ctx.hud.instruct(this.config.title, this.config.platformText);
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.stepT += dt;
    this.say.t += dt;
    this.shakeT = Math.max(0, this.shakeT - dt);
    this.particles.update(dt);
    this.updateFade(dt);
    if (this.step === 'walk' && this.stepT >= WALK) {
      this.step = 'done';
      this.ticket?.remove();
      this.ctx.journey.boarded = this.config.train;
      const pl = this.platforms[this.target.platform - 1];
      this.particles.burst((pl.x0 + pl.x1) / 2, pl.y - 80, SPARKS, 30, 260);
      this.showEnding({
        doneText: this.config.doneText,
        fact: this.config.fact,
        stars: this.mistakes === 0 ? 3 : this.mistakes <= 2 ? 2 : 1,
        result: this.mistakes === 0 ? 'Ai găsit trenul cel bun din prima!' : 'Bubu e în trenul cel bun!',
        delay: 0.8,
      });
    }
  }

  // ------------------------------------------------------------ drawing

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const stage = this.ctx.stage;
    c.save();
    c.globalAlpha = this.fade;
    // inside the big station hall, early in the morning
    const g = c.createLinearGradient(0, stage.viewTop, 0, stage.viewBottom);
    g.addColorStop(0, '#22305c');
    g.addColorStop(1, '#3c4f86');
    c.fillStyle = g;
    c.fillRect(stage.viewLeft, stage.viewTop, stage.viewRight - stage.viewLeft, stage.viewBottom - stage.viewTop);
    // arches of the hall's roof
    c.strokeStyle = 'rgba(255,255,255,0.08)';
    c.lineWidth = 14;
    for (let x = stage.viewLeft - 100; x < stage.viewRight + 200; x += 320) {
      c.beginPath();
      c.arc(x + 160, stage.viewBottom, 520, Math.PI * 1.05, Math.PI * 1.95);
      c.stroke();
    }
    if (this.step === 'board') this.drawBoard(c);
    else this.drawPlatforms(c);
    if (this.say.t < 3.5) {
      const a = this.area;
      c.globalAlpha = this.fade * clamp(3.5 - this.say.t, 0, 1);
      const w = Math.min(820, a.right - a.left);
      fillRoundRect(c, stage.width / 2 - w / 2, a.top - 6, w, 50, 16, this.picked >= 0 || this.step !== 'board' ? 'rgba(46,157,87,0.95)' : 'rgba(198,40,40,0.95)');
      c.fillStyle = '#ffffff';
      c.font = '700 21px "Baloo 2", system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(this.say.text, stage.width / 2, a.top + 19, w - 24);
    }
    this.particles.draw(c);
    c.restore();
  }

  /**
   * The departures board: dark, with yellow letters, as in real stations.
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  drawBoard(c) {
    const b = this.board;
    fillRoundRect(c, b.x - 8, b.y - 8, b.w + 16, b.h + 16, 18, '#9aa4b1');
    fillRoundRect(c, b.x, b.y, b.w, b.h, 12, '#121a2e');
    c.fillStyle = '#ffffff';
    c.font = '800 30px "Baloo 2", system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('PLECĂRI', b.x + b.w / 2, b.y + 28);
    const cols = { time: b.x + 28, to: b.x + b.w * 0.22, platform: b.x + b.w - 28 };
    c.font = '700 17px "Baloo 2", system-ui, sans-serif';
    c.fillStyle = '#9fb3d9';
    c.textAlign = 'left';
    c.fillText('Ora', cols.time, b.y + 62);
    c.fillText('Trenul merge spre', cols.to, b.y + 62);
    c.textAlign = 'right';
    c.fillText('Linia', cols.platform, b.y + 62);
    this.config.departures.forEach((d, i) => {
      const y = b.y + 80 + i * b.rowH;
      const shake = i === this.shakeRow ? Math.sin(this.shakeT * 50) * this.shakeT * 12 : 0;
      c.save();
      c.translate(shake, 0);
      if (i === this.picked) {
        glow(c, b.x + b.w / 2, y + b.rowH / 2, b.w * 0.5, 'rgba(255,214,90,0.35)', 'rgba(255,214,90,0)');
        fillRoundRect(c, b.x + 10, y + 4, b.w - 20, b.rowH - 8, 10, 'rgba(255,214,90,0.25)');
      }
      c.fillStyle = 'rgba(255,255,255,0.06)';
      if (i % 2 === 0) c.fillRect(b.x + 10, y + 4, b.w - 20, b.rowH - 8);
      c.fillStyle = '#ffd23f';
      c.font = `800 ${Math.round(clamp(b.rowH * 0.42, 22, 32))}px "Baloo 2", system-ui, sans-serif`;
      c.textBaseline = 'middle';
      c.textAlign = 'left';
      c.fillText(d.time, cols.time, y + b.rowH / 2);
      c.fillText(d.to, cols.to, y + b.rowH / 2 - (d.via ? 8 : 0), b.w * 0.6);
      if (d.via) {
        c.font = `600 ${Math.round(clamp(b.rowH * 0.24, 13, 18))}px "Baloo 2", system-ui, sans-serif`;
        c.fillStyle = '#e6c75a';
        c.fillText(`prin ${d.via}`, cols.to, y + b.rowH / 2 + 15);
        c.font = `800 ${Math.round(clamp(b.rowH * 0.42, 22, 32))}px "Baloo 2", system-ui, sans-serif`;
        c.fillStyle = '#ffd23f';
      }
      c.textAlign = 'right';
      c.fillText(String(d.platform), cols.platform, y + b.rowH / 2);
      c.restore();
    });
  }

  /**
   * The platforms with their trains, and Bubu walking to hers.
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  drawPlatforms(c) {
    const target = this.target.platform;
    for (const pl of this.platforms) {
      // platform edge and rails
      c.fillStyle = '#b9bcc4';
      c.fillRect(pl.x0 - 90, pl.y + 6, pl.x1 - pl.x0 + 110, 14);
      c.fillStyle = '#5b5f6b';
      c.fillRect(pl.x0 - 90, pl.y - 2, pl.x1 - pl.x0 + 110, 6);
      // the platform number sign
      fillRoundRect(c, pl.x0 - 80, pl.y - 120, 60, 60, 12, '#1565c0');
      c.fillStyle = '#ffffff';
      c.font = '800 36px "Baloo 2", system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(String(pl.number), pl.x0 - 50, pl.y - 89);
      const len = Math.min(pl.x1 - pl.x0, 760);
      if (pl.number === target) drawRegional(c, pl.x0 + 10, pl.y, Math.min(len, 560));
      else if (pl.number === 1) drawLongTrain(c, pl.x0 + 10, pl.y, len, '#1e5aa8', '#f2f2f2');
      else drawLongTrain(c, pl.x0 + 10, pl.y, len, '#7b3f61', '#f1e3c2');
    }
    // Bubu (and her tree) at the bottom, walking to the right train
    const a = this.area;
    const pl = this.platforms[target - 1];
    const start = { x: (a.left + a.right) / 2, y: a.bottom - 10 };
    const end = { x: pl.x0 + 200, y: pl.y - 70 };
    const k = this.step === 'walk' ? easeInOut(clamp(this.stepT / WALK, 0, 1)) : this.step === 'done' ? 1 : 0;
    if (this.step !== 'done') {
      const x = lerp(start.x, end.x, k);
      const y = lerp(start.y, end.y, k) - Math.abs(Math.sin(k * Math.PI * 4)) * 20;
      drawBubu(c, x, y - 40, 80, Math.sin(this.time * 3) * 0.08);
    }
  }

  dispose() {
    super.dispose();
    this.ticket?.remove();
  }
}

/**
 * A long intercity train (side view, simple).
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} rail
 * @param {number} len
 * @param {string} body
 * @param {string} band
 */
function drawLongTrain(c, x, rail, len, body, band) {
  const cars = Math.max(2, Math.floor(len / 250));
  const w = len / cars;
  for (let i = 0; i < cars; i++) {
    const cx = x + i * w;
    fillRoundRect(c, cx + 4, rail - 112, w - 8, 100, 14, body);
    c.fillStyle = band;
    c.fillRect(cx + 4, rail - 52, w - 8, 10);
    c.fillStyle = '#cfe3f5';
    for (let k = 0; k < 4; k++) c.fillRect(cx + 18 + k * ((w - 30) / 4), rail - 96, (w - 30) / 4 - 10, 30);
    c.fillStyle = '#2b2f38';
    fillCircle(c, cx + 34, rail - 8, 10);
    fillCircle(c, cx + w - 34, rail - 8, 10);
  }
}

/**
 * The small white-and-green regional train Bubu takes to Putna.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} rail
 * @param {number} len
 */
function drawRegional(c, x, rail, len) {
  const w = len / 2;
  for (let i = 0; i < 2; i++) {
    const cx = x + i * w;
    fillRoundRect(c, cx + 4, rail - 118, w - 8, 106, i === 1 ? 30 : 14, '#f4f6f8');
    c.fillStyle = '#2e9d57';
    c.fillRect(cx + 4, rail - 50, w - 8, 14);
    c.fillStyle = '#e53935';
    c.fillRect(cx + 4, rail - 36, w - 8, 4);
    c.fillStyle = '#9fc3e6';
    for (let k = 0; k < 3; k++) fillRoundRect(c, cx + 22 + k * ((w - 40) / 3), rail - 104, (w - 40) / 3 - 14, 36, 6, '#9fc3e6');
    c.fillStyle = '#2b2f38';
    fillCircle(c, cx + 40, rail - 8, 11);
    fillCircle(c, cx + w - 40, rail - 8, 11);
  }
  glow(c, x + len - 10, rail - 40, 40, 'rgba(255,240,180,0.7)', 'rgba(255,240,180,0)');
}
