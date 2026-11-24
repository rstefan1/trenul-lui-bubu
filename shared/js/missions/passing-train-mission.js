/**
 * @file Travel mission "which wagon is it?": a long freight train passes on
 * the next track, the other way, and the child finds the wagons asked for:
 * a tank wagon, a covered wagon, a wagon of logs, a coal wagon.
 *
 * Both trains go slowly, so the wagons cross the screen at a walking pace.
 * A card in the corner shows what to find; a tap on a wagon of that kind
 * ticks it, a tap on another kind is a gentle mistake that names the wagon
 * touched. There are no other hints: the card's picture is enough. Only
 * kinds still to come are ever asked for.
 *
 * The mission takes the controls of the train and gives them back at the end.
 *
 * Configuration (besides id/title/text):
 *   wagons   the kinds of wagon of the passing train, from its front
 *   finds    how many wagons to find
 */

import { Particles, SPARKS } from '../gfx/particles.js';
import { fillCircle, fillRoundRect } from '../gfx/shapes.js';
import { zoomed } from '../gfx/ui-style.js';
import { TRACK_Y } from '../world/track.js';
import { Mission } from './mission.js';

/** @typedef {'tank' | 'covered' | 'logs' | 'coal'} WagonKind */
/** @typedef {import('./mission.js').MissionConfig & {wagons: WagonKind[], finds: number}} PassingConfig */

/** What each kind is called, with an article. */
const NAMES = {
  tank: { name: 'cisterna', what: 'Cisterna' },
  covered: { name: 'vagonul acoperit', what: 'Vagonul acoperit' },
  logs: { name: 'platforma cu bușteni', what: 'Platforma cu bușteni' },
  coal: { name: 'vagonul de cărbune', what: 'Vagonul de cărbune' },
};

/** Speed of our train during the mission, and of the passing train (stage units/s). */
const OUR_SPEED = 150;
const THEIR_SPEED = 160;
/** The passing train's rail (in front of ours, closer to the child) and its scale. */
const RAIL_Y = TRACK_Y + 104;
const SCALE = 0.62;
/** Length of a wagon of the passing train and the gap between two (car units). */
const WAGON_L = 230;
const GAP = 14;

export class PassingTrainMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {PassingConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** Stage x of the passing train's front (it comes from the right). */
    this.front = 0;
    /** @type {boolean[]} wagons already found */
    this.found = config.wagons.map(() => false);
    /** @type {WagonKind | null} */
    this.want = null;
    this.got = 0;
    this.mistakes = 0;
    this.time = 0;
    this.endT = 0;
    /** @type {import('../journey/journey.js').Controls | null} */
    this.controls = null;
    this.particles = new Particles();
  }

  /** @param {{duration?: number, window?: {from: number, to: number}}} hints */
  start(hints) {
    super.start(hints);
    this.controls = this.ctx.journey.takeControl();
    if (this.controls) this.controls.target = OUR_SPEED;
    this.front = this.ctx.stage.viewRight + 60;
    this.ctx.hud.setCounter('🔍', 0, this.config.finds);
    this.pickWant();
  }

  /**
   * Stage x of both ends of a wagon (the locomotive leads on the left).
   * @param {number} i
   */
  wagonSpan(i) {
    const left = this.front + (140 + GAP) * SCALE + i * (WAGON_L + GAP) * SCALE;
    return { left, right: left + WAGON_L * SCALE };
  }

  /** @private Asks for a kind of wagon still to come (well on screen, or still to the right). */
  pickWant() {
    const left = this.ctx.stage.viewLeft + 220;
    const kinds = [...new Set(this.config.wagons.filter((k, i) => !this.found[i] && this.wagonSpan(i).left > left))];
    const fresh = kinds.filter(k => k !== this.want);
    const pool = fresh.length ? fresh : kinds;
    this.want = pool.length ? pool[Math.floor(Math.random() * pool.length)] : null;
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    if (!this.want) return;
    const cam = this.ctx.world.cameraY;
    if (p.y < RAIL_Y - 150 * SCALE - 30 - cam || p.y > RAIL_Y + 30 - cam) return;
    const i = this.config.wagons.findIndex((_, k) => {
      const s = this.wagonSpan(k);
      return p.x >= s.left - 8 && p.x <= s.right + 8;
    });
    if (i < 0) return;
    const kind = this.config.wagons[i];
    if (kind === this.want && !this.found[i]) {
      this.found[i] = true;
      this.got += 1;
      const s = this.wagonSpan(i);
      this.particles.burst((s.left + s.right) / 2, RAIL_Y - 60 - cam, SPARKS, 16, 200);
      this.sound('ding', p.x);
      this.ctx.hud.setCounter('🔍', this.got, this.config.finds);
      if (this.got >= this.config.finds) this.want = null;
      else this.pickWant();
      return;
    }
    if (this.found[i]) return;
    this.mistakes += 1;
    this.oops();
    this.ctx.hud.announce('Ce vagon e?', `Acesta e ${NAMES[kind].name}. Caută ${NAMES[this.want].name}!`, 'Misiune', 3);
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    // the passing train moves left, faster than ours moves right
    this.front -= (THEIR_SPEED + this.ctx.journey.speed) * dt;
    if (this.want) {
      // the kind asked for is no longer coming: ask for another
      const left = this.ctx.stage.viewLeft + 120;
      const coming = this.config.wagons.some((k, i) => k === this.want && !this.found[i] && this.wagonSpan(i).right > left);
      if (!coming) this.pickWant();
    }
    const gone = this.wagonSpan(this.config.wagons.length - 1).right < this.ctx.stage.viewLeft;
    if (!this.want || gone) this.endT += dt;
    if (this.endT > 1 || this.phase === 'wrapping') this.finishMission();
  }

  /** @private */
  finishMission() {
    if (this.phase === 'finished') return;
    if (this.controls) {
      this.controls = null;
      this.ctx.journey.releaseControl();
    }
    this.ctx.hud.hideCounter();
    const total = this.config.finds;
    const stars = this.got >= total && this.mistakes <= 1 ? 3 : this.got >= total - 1 ? 2 : 1;
    this.complete(stars, stars === 3 ? 'Bravo! Recunoști vagoanele ca un mecanic adevărat.' : `Ai găsit ${this.got} vagoane din ${total}.`);
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const cam = this.ctx.world.cameraY;
    const stage = this.ctx.stage;
    c.save();
    c.translate(0, -cam);
    // the other track, in front of ours
    c.fillStyle = '#6d6258';
    c.fillRect(stage.viewLeft, RAIL_Y - 2, stage.viewRight - stage.viewLeft, 5);
    c.fillStyle = 'rgba(109,98,88,0.5)';
    for (let x = stage.viewLeft - ((this.time * 40) % 40); x < stage.viewRight; x += 40) c.fillRect(x, RAIL_Y + 3, 22, 5);
    // its locomotive (facing left) and its wagons
    this.drawLoco(c, this.front, RAIL_Y);
    this.config.wagons.forEach((kind, i) => {
      const s = this.wagonSpan(i);
      if (s.right < stage.viewLeft - 20 || s.left > stage.viewRight + 20) return;
      c.save();
      c.translate(s.left, RAIL_Y);
      c.scale(SCALE, SCALE);
      drawWagon(c, kind, this.time + i);
      c.restore();
      if (this.found[i]) {
        c.fillStyle = '#2e9d57';
        fillCircle(c, (s.left + s.right) / 2, RAIL_Y - 150 * SCALE - 20, 15);
        c.strokeStyle = '#ffffff';
        c.lineWidth = 4;
        c.beginPath();
        const x = (s.left + s.right) / 2;
        const y = RAIL_Y - 150 * SCALE - 20;
        c.moveTo(x - 6, y);
        c.lineTo(x - 1, y + 5);
        c.lineTo(x + 7, y - 5);
        c.stroke();
      }
    });
    c.restore();
    this.drawWantCard(c);
    this.particles.draw(c);
  }

  /**
   * The card high up on the right: the kind of wagon to find, drawn.
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  drawWantCard(c) {
    if (!this.want) return;
    const stage = this.ctx.stage;
    const right = stage.viewRight - 20;
    const top = stage.toStage(0, this.ctx.hud.hudBottom).y + 24;
    zoomed(c, stage.ui, right, top, () => {
      const w = 250;
      const h = 150;
      fillRoundRect(c, right - w, top, w, h, 18, '#fffaf0');
      c.fillStyle = '#1f4f9c';
      c.font = '800 16px "Baloo 2", system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('Găsește:', right - w / 2, top + 20);
      c.fillStyle = '#1b2440';
      c.font = '800 19px "Baloo 2", system-ui, sans-serif';
      c.fillText(NAMES[/** @type {WagonKind} */ (this.want)].what, right - w / 2, top + 44);
      c.save();
      c.translate(right - w / 2 - 57, top + 140);
      c.scale(0.5, 0.5);
      drawWagon(c, /** @type {WagonKind} */ (this.want), 0);
      c.restore();
    });
  }

  /**
   * The passing train's locomotive, facing left.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {number} x  its front
   * @param {number} rail
   */
  drawLoco(c, x, rail) {
    c.save();
    c.translate(x, rail);
    c.scale(SCALE, SCALE);
    fillRoundRect(c, 0, -150, 140, 120, 18, '#2f6fd0');
    c.fillStyle = '#fbeed2';
    c.fillRect(0, -88, 140, 8);
    fillRoundRect(c, 10, -136, 34, 30, 6, '#9fc3e6');
    for (const wx of [24, 56, 92, 120]) {
      c.fillStyle = '#2b2f38';
      fillCircle(c, wx, -14, 14);
    }
    c.restore();
  }
}

/**
 * A wagon of the passing train (car coordinates: x from 0 to WAGON_L, y = 0
 * on the rail).
 * @param {CanvasRenderingContext2D} c
 * @param {WagonKind} kind
 * @param {number} seed
 */
function drawWagon(c, kind, seed) {
  const L = WAGON_L;
  // frame and wheels
  fillRoundRect(c, 0, -40, L, 14, 3, '#3b4250');
  for (const wx of [30, 70, L - 70, L - 30]) {
    c.fillStyle = '#2b2f38';
    fillCircle(c, wx, -14, 14);
    c.fillStyle = '#8b95a5';
    fillCircle(c, wx, -14, 8);
  }
  if (kind === 'tank') {
    fillRoundRect(c, 4, -128, L - 8, 88, 44, '#cfd5dc');
    c.fillStyle = '#9aa4b1';
    c.fillRect(L / 2 - 16, -140, 32, 14);
    c.fillStyle = 'rgba(0,0,0,0.12)';
    c.fillRect(10, -70, L - 20, 10);
  } else if (kind === 'covered') {
    fillRoundRect(c, 2, -150, L - 4, 110, 6, '#8d4b32');
    fillRoundRect(c, -2, -158, L + 4, 14, 7, '#6d3a26');
    c.strokeStyle = 'rgba(0,0,0,0.3)';
    c.lineWidth = 3;
    c.strokeRect(L / 2 - 36, -140, 72, 96);
    c.beginPath();
    c.moveTo(L / 2, -140);
    c.lineTo(L / 2, -44);
    c.stroke();
  } else if (kind === 'logs') {
    c.fillStyle = '#3b4250';
    for (let x = 10; x < L; x += 52) c.fillRect(x, -110, 7, 72);
    for (let row = 0; row < 3; row++) {
      for (let k = 0; k < 3 - row; k++) {
        const y = -52 - row * 22;
        fillRoundRect(c, 8 + row * 10, y - 11, L - 16 - row * 20, 22, 11, k % 2 ? '#8d5a2b' : '#a8743f');
      }
    }
    c.fillStyle = '#e6c08a';
    for (let row = 0; row < 3; row++) fillCircle(c, 14 + row * 10, -52 - row * 22, 9);
  } else {
    fillRoundRect(c, 2, -112, L - 4, 72, 5, '#5d6670');
    c.fillStyle = '#1d1d24';
    c.beginPath();
    c.moveTo(6, -112);
    for (let x = 6; x <= L - 6; x += 18) c.lineTo(x, -120 - ((x * 7 + seed * 13) % 12));
    c.lineTo(L - 6, -112);
    c.closePath();
    c.fill();
    c.strokeStyle = 'rgba(0,0,0,0.25)';
    c.lineWidth = 3;
    for (let x = 40; x < L - 20; x += 50) {
      c.beginPath();
      c.moveTo(x, -110);
      c.lineTo(x, -42);
      c.stroke();
    }
  }
}
