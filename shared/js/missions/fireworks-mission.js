/**
 * @file Station mission "the mysterious crate": at the last station of the
 * forest railway, high in the mountains, the crate the children kept since
 * the camp is opened at last. It holds fireworks for New Year's Eve.
 *
 *   1. By day: the children get off and gather by the campfire place. The
 *      child sets up the rockets on the marks in the clearing, far from the
 *      firs and from the train (two marks are too close: touching them is a
 *      gentle mistake, explained), then joins their fuses ("Leagă fitilele").
 *   2. Time flies: in a second or two the sun crosses the sky and sets, the
 *      stars come out, the campfire is lit, and a big clock spins on to a
 *      few seconds before midnight.
 *   3. Everyone counts down from 10. At midnight the child presses
 *      "Pornește artificiile!" and Bubu sets them off: rockets of many
 *      colours, a heart, golden willows, and "La mulți ani!".
 *
 * The fireworks are drawn by gfx/fireworks.js, which is light on the
 * processor and on memory. The mission moves the journey's clock itself
 * (the journey is over, so nothing else does).
 *
 * Configuration (besides id/title/text):
 *   rockets    how many rockets to set up (each on its own mark)
 *   children   the looks of the children around the campfire (indexes in CHILD_LOOKS)
 *   flag       set when the children leave the train (they stay out)
 *   midnight   the journey's clock at midnight (minutes since the first day)
 *   wish       the words written in the sky at the end
 *   fact       shown after the rockets are set up
 */

import { clamp, smoothstep } from '../core/math.js';
import { CHILD_LOOKS, drawChild } from '../gfx/children.js';
import { Fireworks } from '../gfx/fireworks.js';
import { drawTouchNote } from '../gfx/hints.js';
import { drawFir, fillCircle, fillRoundRect, glow } from '../gfx/shapes.js';
import { TRACK_Y } from '../world/track.js';
import { el } from '../ui/dom.js';
import { leave } from '../ui/panel.js';
import { Mission, starsForMistakes } from './mission.js';

/**
 * @typedef {import('./mission.js').MissionConfig & {
 *   rockets: number, children: number[], flag: string, midnight: number, wish: string, fact: string,
 * }} FireworksConfig
 *
 * @typedef {{x: number, y: number, safe: boolean, why?: string, placed: boolean, t: number}} Mark
 *          x as a share of the screen's width, y in stage units
 */

const REDUCED_MOTION = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false;
const EMOJI_FONT = '"Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
/** Seconds the time takes to fly to midnight, and each number of the countdown. */
const TIME_FLIES = 2.2;
const COUNT_STEP = 0.85;
/** The colours of the fireworks. */
const COLORS = ['#ff5252', '#ffd740', '#40c4ff', '#69f0ae', '#ff80ab', '#b388ff', '#ffffff', '#ffab40'];

/**
 * The show: when each rocket goes up (seconds after the button), from
 * which rocket, its colour, shape, how high it bursts and how wide.
 * @type {Array<[number, number, string, import('../gfx/fireworks.js').BurstShape, number, number]>}
 */
const SHOW = [
  [0.2, 2, COLORS[0], 'peony', 430, 1],
  [1.3, 0, COLORS[1], 'peony', 380, 0.9],
  [2.3, 4, COLORS[2], 'ring', 460, 1],
  [3.3, 1, COLORS[3], 'peony', 400, 1],
  [4.2, 3, COLORS[4], 'peony', 470, 1.1],
  [5.4, 2, '#ffd740', 'willow', 500, 1],
  [6.6, 0, COLORS[5], 'ring', 360, 0.9],
  [7.2, 4, COLORS[6], 'peony', 420, 1],
  [8.3, 1, COLORS[7], 'peony', 450, 1],
  [9.0, 3, COLORS[0], 'ring', 390, 1],
  [10.2, 2, '#ff5c8a', 'heart', 470, 1.2],
  [12.0, 0, COLORS[2], 'peony', 400, 1],
  [12.5, 4, COLORS[3], 'peony', 430, 1],
  [13.4, 1, COLORS[1], 'ring', 470, 1.1],
  [14.2, 3, COLORS[4], 'peony', 380, 0.9],
  [15.4, 2, '#ffe082', 'willow', 520, 1.1],
  [16.8, 0, COLORS[0], 'peony', 420, 1],
  [17.1, 4, COLORS[2], 'peony', 420, 1],
  [17.4, 2, COLORS[6], 'ring', 480, 1.1],
  [18.6, 1, COLORS[5], 'peony', 400, 1],
  [18.9, 3, COLORS[3], 'peony', 400, 1],
  [20.2, 2, '#ff5c8a', 'heart', 480, 1.3],
  [21.8, 0, '#ffd740', 'willow', 500, 1],
  [22.0, 4, '#ffd740', 'willow', 500, 1],
  [22.3, 2, '#ffe082', 'willow', 540, 1.2],
];

export class FireworksMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {FireworksConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {'place' | 'fuse' | 'wire' | 'ready' | 'flies' | 'count' | 'go' | 'show' | 'done'} */
    this.step = 'place';
    this.mistakes = 0;
    this.time = 0;
    this.stepT = 0;
    /** The clock when the mission starts (the train's arrival). */
    this.startClock = ctx.journey.clock;
    /** @type {Mark[]} */
    this.marks = makeMarks(config.rockets);
    /** Which launch of the show is next, and how far the wish has appeared (0..1). */
    this.nextLaunch = 0;
    this.wish = 0;
    /** The number of the countdown last heard. */
    this.lastCount = 11;
    this.fireworks = new Fireworks({ sparks: REDUCED_MOTION ? 220 : 480 });
    this.fireworks.onEvent = (what, x) => this.sound(what === 'launch' ? 'rocketLaunch' : 'rocketBurst', x);
    /** @type {HTMLButtonElement | null} */
    this.button = null;
    /** How far the clearing has appeared (0..1): only once the view has moved to it. */
    this.shown = 0;
  }

  start() {
    super.start();
    // the train moves to the left: the clearing with the marks is ahead of it
    this.ctx.world.lookAhead(0.4);
    this.ctx.world.train.leaveAll();
    this.ctx.state.setFlag(this.config.flag);
    this.ctx.hud.setCounter('🚀', 0, this.config.rockets);
  }

  /**
   * A mark on the stage.
   * @private
   * @param {Mark} m
   */
  at(m) {
    const s = this.ctx.stage;
    return { x: s.viewLeft + (s.viewRight - s.viewLeft) * m.x, y: m.y - this.ctx.world.cameraY };
  }

  /** The launch box with the big button, by the crate. */
  get box() {
    const s = this.ctx.stage;
    return { x: s.viewLeft + (s.viewRight - s.viewLeft) * 0.5, y: TRACK_Y + 112 - this.ctx.world.cameraY };
  }

  /** The campfire, in front of the coaches. */
  get fire() {
    const s = this.ctx.stage;
    return { x: s.viewLeft + (s.viewRight - s.viewLeft) * 0.25, y: TRACK_Y + 96 - this.ctx.world.cameraY };
  }

  /**
   * Shows the big button with a text (or removes it).
   * @private
   * @param {string | null} text
   * @param {() => void} [action]
   */
  setButton(text, action) {
    leave(this.button);
    this.button = null;
    if (!text || !action) return;
    const b = /** @type {HTMLButtonElement} */ (el('button', { class: 'brake-btn is-stopped is-urgent', type: 'button' }, [text]));
    b.addEventListener('click', action);
    document.body.append(b);
    this.button = b;
  }

  /**
   * @private
   * @param {'place' | 'fuse' | 'wire' | 'ready' | 'flies' | 'count' | 'go' | 'show' | 'done'} step
   */
  go(step) {
    this.step = step;
    this.stepT = 0;
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    if (this.step !== 'place' || this.shown < 1) return;
    for (const m of this.marks) {
      const q = this.at(m);
      if (m.placed || Math.hypot(p.x - q.x, (p.y - q.y) * 1.4) > 60) continue;
      if (!m.safe) {
        this.mistakes += 1;
        this.oops();
        m.t = this.time;
        this.ctx.hud.announce('Nu aici!', m.why ?? 'Prea aproape!', 'Misiune', 3);
        return;
      }
      m.placed = true;
      m.t = this.time;
      this.sound('hop', q.x);
      const placed = this.marks.filter(x => x.placed).length;
      this.ctx.hud.setCounter('🚀', placed, this.config.rockets);
      if (placed >= this.config.rockets) {
        this.go('fuse');
        this.setButton('🧨 Leagă fitilele', () => {
          if (this.step !== 'fuse') return;
          this.setButton(null);
          this.sound('brush');
          this.go('wire');
        });
      }
      return;
    }
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.stepT += dt;
    const j = this.ctx.journey;
    this.fireworks.update(dt);
    // the clearing appears once the view has moved to it (drawn where it will
    // be on screen, it would otherwise slide along with the view)
    const w = this.ctx.world;
    if (this.shown > 0 || Math.abs(w.panTarget - w.pan) < 10) this.shown = Math.min(1, this.shown + dt * 2.5);
    if (this.step === 'wire' && this.stepT > 1.2) {
      this.ctx.hud.hideCounter();
      this.ctx.hud.announce('Totul e pregătit!', this.config.fact, 'Misiune', 4);
      this.go('ready');
    } else if (this.step === 'ready' && this.stepT > 4.5) {
      this.go('flies');
      this.sound('whoosh');
    } else if (this.step === 'flies') {
      // the afternoon and the evening fly by, up to ten seconds before midnight
      const k = smoothstep(0, 1, Math.min(1, this.stepT / TIME_FLIES));
      j.clock = this.startClock + (this.config.midnight - 10 / 60 - this.startClock) * k;
      if (this.stepT >= TIME_FLIES + 0.6) this.go('count');
    } else if (this.step === 'count') {
      const left = 10 - this.stepT / COUNT_STEP;
      j.clock = this.config.midnight - Math.max(0, left) / 60;
      const n = Math.ceil(left);
      if (n !== this.lastCount && n > 0) {
        this.lastCount = n;
        this.sound(n <= 3 ? 'drum' : 'tock');
      }
      if (left <= 0) {
        j.clock = this.config.midnight;
        this.sound('chime');
        this.go('go');
        this.setButton('🎆 Pornește artificiile!', () => {
          if (this.step !== 'go') return;
          this.setButton(null);
          this.go('show');
          this.ctx.world.train.react('joy');
        });
      }
    } else if (this.step === 'show') {
      j.clock = this.config.midnight + this.stepT / 60;
      while (this.nextLaunch < SHOW.length && SHOW[this.nextLaunch][0] <= this.stepT) {
        const [, from, color, shape, height, size] = SHOW[this.nextLaunch++];
        if (REDUCED_MOTION && this.nextLaunch % 2 === 0) continue;
        const safe = this.marks.filter(m => m.safe);
        const m = safe[from % safe.length];
        const q = this.at(m);
        this.fireworks.launch(q.x, q.y - 40, height, color, shape, size);
        if (shape === 'heart') this.sound('sparkle', q.x);
      }
      if (this.nextLaunch >= SHOW.length) this.wish = Math.min(1, this.wish + dt / 1.5);
      if (this.nextLaunch >= SHOW.length && !this.fireworks.busy && this.stepT > SHOW[SHOW.length - 1][0] + 4) this.go('done');
    } else if (this.step === 'done' && this.stepT > 1.5 && this.phase !== 'finished') {
      this.complete(starsForMistakes(this.mistakes, 1, 0), this.mistakes === 0
        ? 'La mulți ani! Ai pregătit artificiile ca un artificier adevărat.'
        : 'La mulți ani! Artificiile au luminat toată pădurea.');
    }
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const w = this.ctx.world;
    const night = w.light.night;
    const cam = w.cameraY;
    if (this.shown <= 0) return;
    c.save();
    c.globalAlpha = this.shown;
    // what stands on the ground is tinted by the time of day, like the world
    w.drawTinted(c, TRACK_Y - 360, this.ctx.stage.viewBottom + cam, b => this.drawGround(b));
    // what glows: the campfire and the rockets' fuses
    const f = this.fire;
    if (night > 0.35) {
      const k = smoothstep(0.35, 0.8, night);
      glow(c, f.x, f.y - 30, 220 * k, `rgba(255,170,80,${0.35 * k})`, 'rgba(255,170,80,0)');
      drawFlames(c, f.x, f.y - 8, this.time, k);
    }
    this.fireworks.draw(c);
    this.drawSky(c);
    c.restore();
  }

  /**
   * The ground: the firs by the clearing, the marks, the rockets, the crate,
   * the launch box, the campfire's wood and the children around it.
   * @private
   * @param {CanvasRenderingContext2D} c   (in stage units, with the camera's lift)
   */
  drawGround(c) {
    const s = this.ctx.stage;
    const W = s.viewRight - s.viewLeft;
    const X = (/** @type {number} */ u) => s.viewLeft + W * u;
    // the big fir standing next to one of the marks
    drawFir(c, X(0.92), TRACK_Y + 70, 280, { snowy: true });
    // the marks, and the rockets on them
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 6);
    for (const m of this.marks) {
      const x = X(m.x);
      const y = m.y;
      if (!m.placed) {
        const wrong = !m.safe && this.time - m.t < 0.8;
        c.strokeStyle = wrong ? '#e53935' : this.step === 'place' ? `rgba(255,190,40,${0.55 + 0.45 * pulse})` : 'rgba(120,140,170,0.5)';
        c.lineWidth = 5;
        c.beginPath();
        c.ellipse(x, y, 34 + (this.step === 'place' ? pulse * 3 : 0), 12, 0, 0, Math.PI * 2);
        c.stroke();
        c.beginPath();
        c.moveTo(x - 14, y - 5);
        c.lineTo(x + 14, y + 5);
        c.moveTo(x + 14, y - 5);
        c.lineTo(x - 14, y + 5);
        c.stroke();
        continue;
      }
      // a rocket on its stick, popping up when placed
      const pop = Math.min(1, (this.time - m.t) / 0.25);
      const fired = this.step === 'show' || this.step === 'done';
      drawRocket(c, x, y, pop, fired);
    }
    // the fuses, from the launch box to every rocket
    if (this.step === 'wire' || this.step === 'ready' || this.step === 'flies' || this.step === 'count' || this.step === 'go') {
      const k = this.step === 'wire' ? Math.min(1, this.stepT / 1) : 1;
      const b = this.box;
      c.strokeStyle = '#c62828';
      c.lineWidth = 3;
      c.beginPath();
      for (const m of this.marks.filter(x => x.placed)) {
        const x = X(m.x);
        c.moveTo(b.x, b.y + this.ctx.world.cameraY - 20);
        c.lineTo(b.x + (x - b.x) * k, b.y + this.ctx.world.cameraY - 20 + (m.y - (b.y + this.ctx.world.cameraY - 20)) * k);
      }
      c.stroke();
    }
    // the open crate and the launch box
    const b = this.box;
    const by = b.y + this.ctx.world.cameraY;
    fillRoundRect(c, b.x - 120, by - 54, 80, 54, 6, '#8d5a2b');
    c.fillStyle = '#6d4524';
    c.fillRect(b.x - 120, by - 32, 80, 6);
    c.font = `30px ${EMOJI_FONT}`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    if (this.step === 'place') c.fillText('🎆', b.x - 80, by - 66);
    fillRoundRect(c, b.x - 26, by - 44, 52, 44, 6, '#3b4250');
    c.fillStyle = this.step === 'go' ? '#ff5252' : '#c62828';
    fillCircle(c, b.x, by - 26, 12 + (this.step === 'go' ? pulse * 3 : 0));
    // the campfire's wood and stones
    const f = this.fire;
    const fy = f.y + this.ctx.world.cameraY;
    c.fillStyle = '#7b726b';
    for (let k = 0; k < 7; k++) fillCircle(c, f.x - 48 + k * 16, fy + 2, 9);
    c.save();
    c.translate(f.x, fy - 6);
    for (const a of [-0.5, 0.5, 0]) {
      c.save();
      c.rotate(a);
      fillRoundRect(c, -44, -8, 88, 14, 6, '#6d4524');
      c.restore();
    }
    c.restore();
    // the children: by the train at first, around the campfire later
    const kids = this.config.children;
    kids.forEach((look, i) => {
      const a = Math.PI * (0.88 + (i / Math.max(1, kids.length - 1)) * 1.24);
      const x = f.x + Math.cos(a) * 150;
      const y = fy - 24 + Math.sin(a) * 30;
      const happy = this.step === 'show' || this.step === 'done';
      const hop = happy ? Math.abs(Math.sin(this.time * 6 + i)) * 22 : Math.abs(Math.sin(this.time * 2 + i)) * 4;
      // the children behind the fire face it; they cheer when the fireworks start
      drawChild(c, x, y - 44 - hop, 18, CHILD_LOOKS[look % CHILD_LOOKS.length], { full: true, wave: happy ? 1 : 0, face: x < f.x ? 1 : -1 });
    });
  }

  /**
   * In the sky: the clock while time flies, the countdown, and the wish.
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  drawSky(c) {
    const s = this.ctx.stage;
    const cx = (s.viewLeft + s.viewRight) / 2;
    const cy = Math.max(s.viewTop + 230, 250);
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    if (this.step === 'flies' || (this.step === 'count' && this.stepT < 0.4)) {
      const alpha = this.step === 'flies' ? Math.min(1, this.stepT / 0.3) : 1 - this.stepT / 0.4;
      c.globalAlpha = clamp(alpha, 0, 1);
      drawClock(c, cx, cy, 110, this.ctx.journey.clock);
      c.globalAlpha = 1;
    }
    if (this.step === 'count') {
      const left = 10 - this.stepT / COUNT_STEP;
      const n = Math.ceil(left);
      if (n > 0 && n <= 10) {
        const k = left - Math.floor(left);   // 1 → 0 within each number
        c.globalAlpha = clamp(k * 2, 0, 1);
        bigText(c, String(n), cx, cy, 150 + (1 - k) * 40);
        c.globalAlpha = 1;
      }
    }
    if (this.step === 'go') bigText(c, '00:00', cx, cy, 120);
    if (this.wish > 0) {
      c.globalAlpha = this.wish;
      bigText(c, this.config.wish, cx, cy - 20, 96, '#ffd740');
      c.globalAlpha = 1;
    }
    if (this.step === 'place' && this.marks.every(m => !m.placed)) {
      const m = this.marks.find(x => x.safe);
      if (m) {
        const q = this.at(m);
        drawTouchNote(c, s, q.x, q.y - 24, 'Pune o rachetă aici!');
      }
    }
  }

  dispose() {
    this.ctx.world.lookAhead(null);
    this.ctx.hud.hideCounter();
    leave(this.button);
  }
}

/**
 * The marks in the clearing: the safe ones, and two too close to danger.
 * @param {number} rockets
 * @returns {Mark[]}
 */
function makeMarks(rockets) {
  /** @type {Mark[]} */
  const marks = [];
  for (let i = 0; i < rockets; i++) {
    marks.push({ x: 0.57 + (i * 0.24) / Math.max(1, rockets - 1), y: TRACK_Y + 40 + (i % 2) * 46, safe: true, placed: false, t: -9 });
  }
  marks.push({ x: 0.9, y: TRACK_Y + 74, safe: false, why: 'E prea aproape de brad! Scânteile pot aprinde crengile. Caută un semn în luminiș.', placed: false, t: -9 });
  marks.push({ x: 0.43, y: TRACK_Y + 44, safe: false, why: 'E prea aproape de tren! Artificiile se pun departe de vagoane și de oameni.', placed: false, t: -9 });
  return marks;
}

/**
 * A rocket on its stick, stuck in the snow.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y   the ground
 * @param {number} pop 0..1, as it is put in place
 * @param {boolean} fired  only the stick is left
 */
function drawRocket(c, x, y, pop, fired) {
  const h = 90 * pop;
  c.fillStyle = '#d9a86a';
  c.fillRect(x - 2, y - h, 4, h);
  if (fired) return;
  fillRoundRect(c, x - 9, y - h - 44 * pop, 18, 44 * pop, 4, '#c62828');
  c.fillStyle = '#ffd740';
  c.fillRect(x - 9, y - h - 30 * pop, 18, 6 * pop);
  c.fillStyle = '#2b2f38';
  c.beginPath();
  c.moveTo(x - 11, y - h - 44 * pop);
  c.lineTo(x, y - h - 62 * pop);
  c.lineTo(x + 11, y - h - 44 * pop);
  c.closePath();
  c.fill();
}

/**
 * The flames of the campfire.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} time
 * @param {number} k  0..1, how big
 */
function drawFlames(c, x, y, time, k) {
  for (const [dx, h, color] of /** @type {Array<[number, number, string]>} */ ([[-14, 60, '#ff7043'], [12, 54, '#ff7043'], [0, 76, '#ffb300'], [0, 40, '#fff176']])) {
    const flick = Math.sin(time * 9 + dx) * 6;
    const fh = h * k + flick;
    c.fillStyle = color;
    c.beginPath();
    c.moveTo(x + dx - 16, y);
    c.quadraticCurveTo(x + dx - 14, y - fh * 0.6, x + dx + flick * 0.4, y - fh);
    c.quadraticCurveTo(x + dx + 14, y - fh * 0.6, x + dx + 16, y);
    c.closePath();
    c.fill();
  }
}

/**
 * A big clock whose hands show the journey's time (they spin while time flies).
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {number} minutes
 */
function drawClock(c, x, y, r, minutes) {
  c.fillStyle = '#1b2440';
  fillCircle(c, x, y, r + 10);
  c.fillStyle = '#fbf6ea';
  fillCircle(c, x, y, r);
  c.fillStyle = '#1b2440';
  for (let h = 0; h < 12; h++) {
    const a = (h / 12) * Math.PI * 2;
    fillCircle(c, x + Math.sin(a) * (r - 14), y - Math.cos(a) * (r - 14), h % 3 === 0 ? 6 : 3);
  }
  const m = ((minutes % 60) + 60) % 60;
  const hr = (((minutes / 60) % 12) + 12) % 12;
  c.strokeStyle = '#1b2440';
  c.lineCap = 'round';
  c.lineWidth = 9;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x + Math.sin((hr / 12) * Math.PI * 2) * r * 0.5, y - Math.cos((hr / 12) * Math.PI * 2) * r * 0.5);
  c.stroke();
  c.strokeStyle = '#c62828';
  c.lineWidth = 6;
  c.beginPath();
  c.moveTo(x, y);
  c.lineTo(x + Math.sin((m / 60) * Math.PI * 2) * r * 0.78, y - Math.cos((m / 60) * Math.PI * 2) * r * 0.78);
  c.stroke();
  c.fillStyle = '#1b2440';
  fillCircle(c, x, y, 8);
}

/**
 * Big outlined text in the sky.
 * @param {CanvasRenderingContext2D} c
 * @param {string} text
 * @param {number} x
 * @param {number} y
 * @param {number} size
 * @param {string} [color='#ffffff']
 */
function bigText(c, text, x, y, size, color = '#ffffff') {
  c.font = `800 ${size}px "Baloo 2", system-ui, sans-serif`;
  c.lineWidth = size / 9;
  c.lineJoin = 'round';
  c.strokeStyle = '#1b2440';
  c.strokeText(text, x, y);
  c.fillStyle = color;
  c.fillText(text, x, y);
}
