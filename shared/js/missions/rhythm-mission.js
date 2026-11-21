/**
 * @file Station mission "the carollers" (a rhythm game, Ilva Mică).
 *
 * On the night platform, children with a carolling star sing for the
 * travellers. Notes glide from the right towards a drum; the child touches
 * the screen (or presses the space bar) when a note reaches the circle.
 * Every note hit makes the carollers jump; at the end they give Bubu a
 * colac (a ring-shaped festive bread), as is the custom.
 *
 * The tempo is slow and the timing window generous: this is about rhythm
 * and fun, not reflexes.
 *
 * Configuration (besides id/title/text):
 *   beats      when each note reaches the drum, in beats from the start
 *   tempo      beats per minute
 *   doneText, fact
 */

import { TAU, clamp } from '../core/math.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { drawFir, fillCircle, fillRoundRect, fillStar, glow } from '../gfx/shapes.js';
import { drawBubu } from '../train/bubu.js';
import { SceneMission } from './scene-mission.js';

/** Seconds a note needs to glide from the right edge to the drum. */
const TRAVEL = 2.6;
/** Timing windows (seconds): perfect and good. */
const PERFECT = 0.14;
const GOOD = 0.28;
/** Seconds before the first note starts gliding. */
const LEAD_IN = 2.5;

/**
 * @typedef {object} Note
 * @property {number} time     when it reaches the drum (seconds from the start)
 * @property {'waiting' | 'hit' | 'missed'} state
 * @property {number} t        seconds since hit or missed
 *
 * @typedef {import('./mission.js').MissionConfig & {beats: number[], tempo: number, doneText: string, fact: string}} RhythmConfig
 */

export class RhythmMission extends SceneMission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {RhythmConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    const beat = 60 / config.tempo;
    /** @type {Note[]} */
    this.notes = config.beats.map(b => ({ time: LEAD_IN + TRAVEL + b * beat, state: 'waiting', t: 0 }));
    this.songTime = 0;
    this.time = 0;
    this.hits = 0;
    this.jump = 0;
    this.feedback = { text: '', t: 9 };
    this.ended = false;
    this.particles = new Particles();
    /** @type {(e: KeyboardEvent) => void} */
    this.onKey = e => {
      if ((e.code !== 'Space' && e.code !== 'Enter') || this.ctx.hud.paused) return;
      e.preventDefault();
      this.strike();
    };
  }

  start() {
    this.phase = 'running';
    this.ctx.hud.instruct(this.config.title, this.config.text);
    this.ctx.hud.setCounter('🎵', 0, this.notes.length);
    window.addEventListener('keydown', this.onKey);
  }

  /** Where things are: the lane near the bottom, the carollers above it. */
  get layout() {
    const stage = this.ctx.stage;
    const cardBottom = this.ctx.hud.cardBottom;
    const top = Math.max(stage.viewTop + 130, cardBottom ? stage.toStage(0, cardBottom + 20).y : 0);
    const bottom = stage.viewBottom - 40;
    const laneY = bottom - 90;
    return { top, bottom, laneY, drumX: stage.viewLeft + Math.max(150, (stage.viewRight - stage.viewLeft) * 0.18), right: stage.viewRight - 40, groundY: laneY - 120 };
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    void p;
    this.strike();
  }

  /** @private The child strikes the drum. */
  strike() {
    if (this.ended) return;
    const L = this.layout;
    this.particles.burst(L.drumX, L.laneY, ['#ffffff', '#ffd54f'], 6, 120);
    // the closest note still waiting
    let best = null;
    let bestDist = GOOD;
    for (const n of this.notes) {
      if (n.state !== 'waiting') continue;
      const d = Math.abs(n.time - this.songTime);
      if (d < bestDist) {
        best = n;
        bestDist = d;
      }
    }
    if (!best) return;
    best.state = 'hit';
    best.t = 0;
    this.hits += 1;
    this.jump = 1;
    this.feedback = { text: bestDist < PERFECT ? 'Perfect!' : 'Bine!', t: 0 };
    this.particles.burst(L.drumX, L.laneY, SPARKS, 16, 220);
    this.ctx.hud.setCounter('🎵', this.hits, this.notes.length);
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.songTime += dt;
    this.jump = Math.max(0, this.jump - dt * 3);
    this.feedback.t += dt;
    this.particles.update(dt);
    this.updateFade(dt);
    for (const n of this.notes) {
      if (n.state === 'waiting' && this.songTime - n.time > GOOD) {
        n.state = 'missed';
        n.t = 0;
      } else if (n.state !== 'waiting') {
        n.t += dt;
      }
    }
    const last = this.notes[this.notes.length - 1];
    if (!this.ended && this.songTime > last.time + 1.2) this.end();
  }

  /** @private The song is over: the colac and the fact. */
  end() {
    this.ended = true;
    this.ctx.hud.hideCounter();
    const k = this.hits / this.notes.length;
    this.showEnding({
      doneText: this.config.doneText,
      fact: this.config.fact,
      stars: k >= 0.85 ? 3 : k >= 0.55 ? 2 : 1,
      result: k >= 0.85 ? 'Ai ținut ritmul ca un colindător adevărat!' : `Ai prins ${this.hits} note din ${this.notes.length}. Frumos colind!`,
      delay: 1.4,
    });
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const stage = this.ctx.stage;
    const L = this.layout;
    c.save();
    c.globalAlpha = this.fade;
    // a winter night at the small station
    const g = c.createLinearGradient(0, stage.viewTop, 0, stage.viewBottom);
    g.addColorStop(0, '#081233');
    g.addColorStop(1, '#22356b');
    c.fillStyle = g;
    c.fillRect(stage.viewLeft, stage.viewTop, stage.viewRight - stage.viewLeft, stage.viewBottom - stage.viewTop);
    c.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 60; i++) {
      const x = stage.viewLeft + ((i * 977) % 1000) / 1000 * (stage.viewRight - stage.viewLeft);
      const y = stage.viewTop + ((i * 613) % 1000) / 1000 * (L.groundY - stage.viewTop - 120);
      fillCircle(c, x, y, (i % 3) * 0.6 + 0.8);
    }
    // the little station of Ilva Mică behind the platform
    this.drawStation(c, L);
    // the platform, snowy, with a lamp
    c.fillStyle = '#dfe7f3';
    c.fillRect(stage.viewLeft, L.groundY, stage.viewRight - stage.viewLeft, stage.viewBottom - L.groundY);
    c.fillStyle = '#b9bcc4';
    c.fillRect(stage.viewLeft, L.groundY, stage.viewRight - stage.viewLeft, 18);
    const lampX = L.right - 120;
    c.fillStyle = '#4a5568';
    c.fillRect(lampX - 4, L.groundY - 230, 8, 230);
    glow(c, lampX, L.groundY - 230, 120, 'rgba(255,220,130,0.55)', 'rgba(255,220,130,0)');
    fillRoundRect(c, lampX - 14, L.groundY - 240, 28, 14, 4, '#fff3c0');

    this.drawCarollers(c, L);

    // the lane, the drum and the notes
    fillRoundRect(c, L.drumX - 70, L.laneY - 46, L.right - L.drumX + 70, 92, 46, 'rgba(19,41,90,0.85)');
    const hitNow = this.notes.some(n => n.state === 'waiting' && Math.abs(n.time - this.songTime) < GOOD);
    glow(c, L.drumX, L.laneY, 80, `rgba(255,220,120,${hitNow ? 0.6 : 0.25})`, 'rgba(255,220,120,0)');
    c.fillStyle = '#c62828';
    fillCircle(c, L.drumX, L.laneY, 40);
    c.fillStyle = '#f6e7c8';
    fillCircle(c, L.drumX, L.laneY, 30);
    c.strokeStyle = '#ffd23f';
    c.lineWidth = 5;
    c.beginPath();
    c.arc(L.drumX, L.laneY, 44, 0, TAU);
    c.stroke();
    const speed = (L.right - L.drumX) / TRAVEL;
    for (const n of this.notes) {
      if (n.state === 'hit' && n.t > 0.35) continue;
      const x = L.drumX + (n.time - this.songTime) * speed;
      if (x > L.right + 30) continue;
      if (n.state === 'missed' && n.t > 0.6) continue;
      const alpha = n.state === 'missed' ? 1 - n.t / 0.6 : n.state === 'hit' ? 1 - n.t / 0.35 : 1;
      const r = n.state === 'hit' ? 30 + n.t * 60 : 26;
      c.globalAlpha = this.fade * clamp(alpha, 0, 1);
      c.fillStyle = n.state === 'missed' ? '#8a93a3' : '#ffd23f';
      fillCircle(c, x, L.laneY, r);
      c.fillStyle = '#1b2440';
      c.font = '800 30px "Baloo 2", system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('♪', x, L.laneY + 2);
      c.globalAlpha = this.fade;
    }
    if (this.feedback.t < 0.7) {
      c.globalAlpha = this.fade * (1 - this.feedback.t / 0.7);
      c.fillStyle = '#ffe082';
      c.font = '800 34px "Baloo 2", system-ui, sans-serif';
      c.fillText(this.feedback.text, L.drumX, L.laneY - 80 - this.feedback.t * 40);
      c.globalAlpha = this.fade;
    }
    if (this.songTime < LEAD_IN) {
      c.fillStyle = '#ffffff';
      c.font = '700 24px "Baloo 2", system-ui, sans-serif';
      c.fillText('Atinge ecranul când nota ajunge în cerc!', (L.drumX + L.right) / 2, L.laneY - 70);
    }
    this.particles.draw(c);
    c.restore();
  }

  /**
   * The station building behind the carollers: snowy roof, warm windows, a
   * clock and the name of the station, with firs and the hills around.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {{groundY: number, drumX: number, right: number}} L
   */
  drawStation(c, L) {
    const stage = this.ctx.stage;
    const g = L.groundY;
    // snowy hills and firs far behind
    c.fillStyle = '#2f4277';
    c.beginPath();
    c.moveTo(stage.viewLeft, g);
    for (let x = stage.viewLeft; x <= stage.viewRight + 40; x += 40) c.lineTo(x, g - 150 - Math.sin(x / 210) * 40 - Math.sin(x / 77) * 12);
    c.lineTo(stage.viewRight + 40, g);
    c.closePath();
    c.fill();
    for (let x = stage.viewLeft + 10; x < stage.viewRight; x += 46) drawFir(c, x, g - 100 - Math.sin(x / 210) * 30, 70 + (x % 3) * 12, { color: '#1f3b45', shade: '#1a3239', snowy: true });
    // the building
    const w = Math.min(760, L.right - L.drumX + 120);
    const x0 = (L.drumX + L.right) / 2 - w / 2;
    const h = 210;
    c.fillStyle = '#e8d9c0';
    c.fillRect(x0, g - h, w, h);
    c.fillStyle = '#c9b48f';
    c.fillRect(x0, g - 30, w, 30);
    // roof with snow
    c.fillStyle = '#7b3f2f';
    c.beginPath();
    c.moveTo(x0 - 40, g - h);
    c.lineTo(x0 + 60, g - h - 80);
    c.lineTo(x0 + w - 60, g - h - 80);
    c.lineTo(x0 + w + 40, g - h);
    c.closePath();
    c.fill();
    c.fillStyle = '#f4f8ff';
    c.beginPath();
    c.moveTo(x0 - 44, g - h + 2);
    c.lineTo(x0 + 58, g - h - 84);
    c.lineTo(x0 + w - 58, g - h - 84);
    c.lineTo(x0 + w + 44, g - h + 2);
    c.lineTo(x0 + w + 20, g - h + 8);
    c.lineTo(x0 + w - 70, g - h - 66);
    c.lineTo(x0 + 70, g - h - 66);
    c.lineTo(x0 - 20, g - h + 8);
    c.closePath();
    c.fill();
    // warm windows and a door
    const n = Math.max(3, Math.floor(w / 130));
    for (let i = 0; i < n; i++) {
      const wx = x0 + ((i + 0.5) * w) / n;
      if (i === Math.floor(n / 2)) {
        fillRoundRect(c, wx - 32, g - 130, 64, 130, 14, '#5d4037');
        c.fillStyle = '#ffd36b';
        c.fillRect(wx - 22, g - 118, 44, 40);
        continue;
      }
      glow(c, wx, g - 110, 70, 'rgba(255,214,120,0.35)', 'rgba(255,214,120,0)');
      fillRoundRect(c, wx - 34, g - 150, 68, 76, 8, '#5d4037');
      fillRoundRect(c, wx - 28, g - 144, 56, 64, 6, '#ffd36b');
      c.fillStyle = '#5d4037';
      c.fillRect(wx - 2, g - 144, 4, 64);
      c.fillRect(wx - 28, g - 114, 56, 4);
      // a little garland under each window
      for (let k = 0; k < 5; k++) {
        c.fillStyle = ['#e53935', '#ffd23f', '#43a047'][k % 3];
        fillCircle(c, wx - 26 + k * 13, g - 68 + Math.sin(k) * 2, 3.5);
      }
    }
    // the name sign and the station clock
    const signW = 260;
    fillRoundRect(c, x0 + w / 2 - signW / 2, g - h - 60, signW, 46, 10, '#1565c0');
    c.fillStyle = '#ffffff';
    c.font = '800 28px "Baloo 2", system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('Ilva Mică', x0 + w / 2, g - h - 36);
    c.fillStyle = '#fffaf0';
    fillCircle(c, x0 + w - 70, g - h + 46, 26);
    c.strokeStyle = '#3e2723';
    c.lineWidth = 3;
    c.beginPath();
    c.arc(x0 + w - 70, g - h + 46, 26, 0, TAU);
    c.moveTo(x0 + w - 70, g - h + 46);
    c.lineTo(x0 + w - 70, g - h + 28);
    c.moveTo(x0 + w - 70, g - h + 46);
    c.lineTo(x0 + w - 58, g - h + 50);
    c.stroke();
  }

  /**
   * Four carollers, the one in the middle holding the star; Bubu with them.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {{groundY: number, drumX: number, right: number}} L
   */
  drawCarollers(c, L) {
    const span = Math.min(620, L.right - L.drumX);
    const x0 = (L.drumX + L.right) / 2 - span / 2;
    const coats = ['#e53935', '#1e88e5', '#43a047', '#8e44ad'];
    for (let i = 0; i < 4; i++) {
      const x = x0 + (i + 0.5) * (span / 5);
      const hop = Math.abs(Math.sin(this.time * 4 + i)) * 4 + this.jump * 22 * (i % 2 ? 0.8 : 1);
      const y = L.groundY - hop;
      // body and head
      c.fillStyle = coats[i];
      c.beginPath();
      c.moveTo(x - 26, y);
      c.lineTo(x - 18, y - 70);
      c.lineTo(x + 18, y - 70);
      c.lineTo(x + 26, y);
      c.closePath();
      c.fill();
      c.fillStyle = '#f6d1b3';
      fillCircle(c, x, y - 88, 20);
      c.fillStyle = '#5d4037';
      c.beginPath();
      c.ellipse(x, y - 102, 24, 10, 0, Math.PI, 0);
      c.fill();
      c.fillStyle = '#3b4250';
      fillCircle(c, x - 7, y - 88, 2.5);
      fillCircle(c, x + 7, y - 88, 2.5);
      // a singing mouth
      c.fillStyle = '#b23b3b';
      c.beginPath();
      c.ellipse(x, y - 78, 5, 3 + 3 * Math.abs(Math.sin(this.time * 6 + i)), 0, 0, TAU);
      c.fill();
      if (i === 1) {
        // the carolling star on a pole
        c.strokeStyle = '#7a5a40';
        c.lineWidth = 5;
        c.beginPath();
        c.moveTo(x + 22, y - 40);
        c.lineTo(x + 30, y - 170);
        c.stroke();
        glow(c, x + 30, y - 190, 60, 'rgba(255,220,120,0.5)', 'rgba(255,220,120,0)');
        c.fillStyle = '#ffd23f';
        fillStar(c, x + 30, y - 190, 32, 14, 8);
        c.fillStyle = '#e53935';
        fillCircle(c, x + 30, y - 190, 9);
      }
    }
    drawBubu(c, x0 + span * 0.92, L.groundY - 40 - this.jump * 18, 80, Math.sin(this.time * 3) * 0.1);
  }

  dispose() {
    super.dispose();
    window.removeEventListener('keydown', this.onKey);
  }
}
