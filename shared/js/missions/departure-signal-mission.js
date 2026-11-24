/**
 * @file Station mission "the departure signal": a forest railway has one
 * track, so the trains meet in the stations. Bubu works as the station's
 * traffic controller and sends the other trains off, one after the other:
 * first a train loaded with logs, then the little motor trolley of the
 * forest workers.
 *
 * Both wait on the second track, in front of Bubu's train, heading down to
 * the valley (to the left). For each one the child:
 *
 *   1. throws the lever of the switch (it sets the way out of the station);
 *   2. raises the green paddle ("Ridică paleta"): the driver whistles and
 *      the train leaves. The paddle raised before the switch is set is a
 *      gentle mistake ("Întâi macazul!").
 *
 * Then Bubu puts the switch back, and the next train rolls in.
 *
 * Configuration (besides id/title/text):
 *   trains   ["logs" | "trolley"] — in order
 *   fact     shown at the end
 */

import { clamp } from '../core/math.js';
import { drawTouchNote } from '../gfx/hints.js';
import { fillCircle, fillRoundRect } from '../gfx/shapes.js';
import { TRACK_Y } from '../world/track.js';
import { el } from '../ui/dom.js';
import { leave } from '../ui/panel.js';
import { Mission, starsForMistakes } from './mission.js';

/**
 * @typedef {'logs' | 'trolley'} OtherTrain
 * @typedef {import('./mission.js').MissionConfig & {trains: OtherTrain[], fact: string}} SignalConfig
 */

/** The rail of the second track, in front of the train (stage units; the ground below the
 *  line is narrow on wide screens, so the track runs close to it). */
const RAIL_Y = TRACK_Y + 78;
/** Lengths of the trains that wait there. */
const LENGTH = { logs: 620, trolley: 150 };
/** Speed of a train leaving (stage units/s), and how fast it gets there. */
const LEAVE_SPEED = 330;
const LEAVE_ACCEL = 160;

export class DepartureSignalMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {SignalConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    this.index = 0;
    /** @type {'arrive' | 'lever' | 'paddle' | 'leaving' | 'done'} */
    this.step = 'arrive';
    this.mistakes = 0;
    this.time = 0;
    this.stepT = 0;
    /** Where the waiting train's front (left end) is, and how fast it moves (negative: to the left). */
    this.trainX = 0;
    this.speed = 0;
    /** 0 = the switch is set for the station, 1 = for the way out (animated). */
    this.lever = 0;
    this.leverOn = false;
    /** Seconds the paddle has been raised (−1: down). */
    this.paddle = -1;
    /** @type {HTMLButtonElement | null} */
    this.button = null;
  }

  start() {
    super.start();
    this.button = /** @type {HTMLButtonElement} */ (el('button', { class: 'brake-btn is-stopped', type: 'button' }, ['🟢 Ridică paleta']));
    this.button.addEventListener('click', () => this.raise());
    document.body.append(this.button);
    this.ctx.hud.setCounter('🚂', 0, this.config.trains.length);
    this.bringTrain(true);
  }

  /** The train waiting now. */
  get kind() {
    return this.config.trains[this.index];
  }

  /** Where the waiting trains stop: their front in the left part of the screen. */
  get stopX() {
    const s = this.ctx.stage;
    return s.viewLeft + (s.viewRight - s.viewLeft) * 0.3;
  }

  /** The lever of the switch, on the stage (in the middle: the big button takes the bottom left corner). */
  get leverPos() {
    const s = this.ctx.stage;
    return { x: s.viewLeft + (s.viewRight - s.viewLeft) * 0.58, y: RAIL_Y + 14 - this.ctx.world.cameraY };
  }

  /**
   * The next train comes in (the first one is already there).
   * @private
   * @param {boolean} already
   */
  bringTrain(already) {
    this.step = 'arrive';
    this.stepT = 0;
    this.trainX = already ? this.stopX : this.ctx.stage.viewRight + 80;
    this.speed = 0;
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    const l = this.leverPos;
    if (Math.abs(p.x - l.x) > 80 || Math.abs(p.y - (l.y - 40)) > 90) return;
    if (this.step !== 'lever') return;
    this.leverOn = true;
    this.step = 'paddle';
    this.sound('tock', l.x);
    this.ctx.hud.announce('Macazul e pus', 'Acum ridică paleta verde: așa îi spui mecanicului că poate pleca.', 'Misiune', 3);
  }

  /** @private The green paddle: the train may leave. */
  raise() {
    if (this.step === 'lever') {
      this.mistakes += 1;
      this.oops();
      this.ctx.hud.announce('Întâi macazul!', 'Trenul nu poate ieși din stație până nu muți macazul. Atinge maneta macazului.', 'Misiune', 3);
      return;
    }
    if (this.step !== 'paddle') return;
    this.step = 'leaving';
    this.stepT = 0;
    this.paddle = 0;
    this.sound('ding');
    if (this.ctx.audio?.canPlay('whistle')) setTimeout(() => this.ctx.audio?.play('whistle', 0.45), 500);
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.stepT += dt;
    this.lever = clamp(this.lever + (this.leverOn ? 1 : -1) * dt * 4, 0, 1);
    if (this.paddle >= 0) this.paddle += dt;
    if (this.step === 'arrive') {
      // the trolley rolls in and brakes in front of the lever
      const gap = this.trainX - this.stopX;
      if (gap > 1) {
        this.speed = -Math.min(LEAVE_SPEED, Math.sqrt(2 * 200 * gap));
        this.trainX += this.speed * dt;
      } else {
        this.trainX = this.stopX;
        this.speed = 0;
        if (this.stepT > 0.6) this.step = 'lever';
      }
    } else if (this.step === 'leaving' && this.stepT > 1.2) {
      this.speed = Math.max(-LEAVE_SPEED, this.speed - LEAVE_ACCEL * dt);
      this.trainX += this.speed * dt;
      if (this.trainX + LENGTH[this.kind] < this.ctx.stage.viewLeft - 40) {
        // gone: Bubu puts the switch and the paddle back
        this.leverOn = false;
        this.paddle = -1;
        this.index += 1;
        this.ctx.hud.setCounter('🚂', this.index, this.config.trains.length);
        if (this.index < this.config.trains.length) this.bringTrain(false);
        else {
          this.step = 'done';
          this.stepT = 0;
          this.ctx.hud.announce('Linia e liberă!', this.config.fact, 'Misiune', 4);
        }
      }
    }
    if (this.button) {
      this.button.classList.toggle('is-urgent', this.step === 'paddle');
      this.button.disabled = this.step !== 'lever' && this.step !== 'paddle';
    }
    if (this.step === 'done' && this.stepT > 2.5 && this.phase !== 'finished') {
      this.complete(starsForMistakes(this.mistakes, 1, 0), this.mistakes === 0
        ? 'Perfect! Ai trimis trenurile la drum ca un impiegat de mișcare adevărat.'
        : 'Bravo! Trenurile au plecat, iar linia e liberă pentru noi.');
    }
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const stage = this.ctx.stage;
    const cam = this.ctx.world.cameraY;
    c.save();
    c.translate(0, -cam);
    // the second track
    c.fillStyle = '#d7dfe9';
    c.fillRect(stage.viewLeft, RAIL_Y + 4, stage.viewRight - stage.viewLeft, 20);
    c.fillStyle = '#6d5040';
    c.beginPath();
    for (let x = stage.viewLeft - (stage.viewLeft % 26); x < stage.viewRight; x += 26) c.rect(x, RAIL_Y + 3, 14, 7);
    c.fill();
    c.fillStyle = '#5f6b7a';
    c.fillRect(stage.viewLeft, RAIL_Y - 3, stage.viewRight - stage.viewLeft, 7);
    c.fillStyle = '#c9d3df';
    c.fillRect(stage.viewLeft, RAIL_Y - 3, stage.viewRight - stage.viewLeft, 2);
    c.restore();

    // the waiting train
    if (this.index < this.config.trains.length) {
      c.save();
      c.translate(this.trainX, RAIL_Y - cam);
      if (this.kind === 'logs') drawLogTrain(c, this.speed, this.time);
      else drawTrolley(c, this.time);
      c.restore();
    }

    // the lever of the switch, with its weight and a little flag showing the way
    const l = this.leverPos;
    const a = -0.9 + this.lever * 1.8;
    fillRoundRect(c, l.x - 34, l.y - 12, 68, 22, 5, '#4a5160');
    c.save();
    c.translate(l.x, l.y - 6);
    c.rotate(a);
    c.fillStyle = '#d8dde4';
    c.fillRect(-4, -88, 8, 88);
    c.fillStyle = '#c62828';
    fillCircle(c, 0, -92, 13);
    c.restore();
    c.fillStyle = this.lever > 0.5 ? '#2e9d57' : '#f2c14e';
    c.beginPath();
    c.moveTo(l.x - 24, l.y + 30);
    c.lineTo(l.x + 10, l.y + 30);
    c.lineTo(l.x + 10, l.y + 22);
    c.lineTo(l.x + 26, l.y + 38);
    c.lineTo(l.x + 10, l.y + 54);
    c.lineTo(l.x + 10, l.y + 46);
    c.lineTo(l.x - 24, l.y + 46);
    c.closePath();
    c.save();
    // the arrow points the way out (to the left) once the switch is set
    if (this.lever > 0.5) {
      c.translate(2 * l.x, 0);
      c.scale(-1, 1);
    }
    c.fill();
    c.restore();
    if (this.step === 'lever') {
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 6);
      c.strokeStyle = `rgba(255,214,90,${0.5 + 0.5 * pulse})`;
      c.lineWidth = 5;
      c.beginPath();
      c.arc(l.x, l.y - 50, 70 + pulse * 6, 0, Math.PI * 2);
      c.stroke();
      drawTouchNote(c, stage, l.x, l.y - 130, 'Mută macazul!');
    }

    // Bubu's green paddle, raised from her window
    if (this.paddle >= 0) {
      const b = this.ctx.world.trainToStage(this.ctx.world.train.bubuPosition);
      const up = Math.min(1, this.paddle / 0.3);
      const x = b.x - 60;
      const y = b.y - 20 - up * 50;
      c.fillStyle = '#6d4524';
      c.fillRect(x - 4, y, 8, 70);
      c.fillStyle = '#ffffff';
      fillCircle(c, x, y, 30);
      c.fillStyle = '#2e9d57';
      fillCircle(c, x, y, 24);
    }
  }

  dispose() {
    leave(this.button);
    this.ctx.hud.hideCounter();
  }
}

/**
 * A wheel of the trains on the second track.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} spin
 */
function wheel(c, x, spin) {
  c.fillStyle = '#2b2f38';
  fillCircle(c, x, -13, 13);
  c.strokeStyle = '#8b95a5';
  c.lineWidth = 3;
  c.beginPath();
  c.moveTo(x + Math.cos(spin) * 9, -13 + Math.sin(spin) * 9);
  c.lineTo(x - Math.cos(spin) * 9, -13 - Math.sin(spin) * 9);
  c.stroke();
}

/**
 * The log train: a small red diesel locomotive (heading left) and three
 * wagons with logs. x = 0 is its front (left end), y = 0 the rail.
 * @param {CanvasRenderingContext2D} c
 * @param {number} speed
 * @param {number} time
 */
function drawLogTrain(c, speed, time) {
  const spin = time * -speed / 13;
  // the locomotive: a hood in front, the cab behind it
  fillRoundRect(c, 4, -96, 110, 66, 10, '#c0392b');
  fillRoundRect(c, 110, -150, 76, 120, 10, '#c0392b');
  fillRoundRect(c, 104, -158, 88, 12, 6, '#5d4037');
  fillRoundRect(c, 122, -138, 44, 38, 6, '#9fc3e6');
  c.fillStyle = '#fbeed2';
  c.fillRect(4, -60, 182, 8);
  c.fillStyle = '#2b2f38';
  c.fillRect(30, -112, 14, 18);
  c.fillStyle = '#fff8dc';
  fillCircle(c, 8, -78, 6);
  for (const x of [34, 76, 132, 170]) wheel(c, x, spin);
  // three wagons of logs
  for (let k = 0; k < 3; k++) {
    const x0 = 200 + k * 140;
    fillRoundRect(c, x0, -40, 130, 12, 3, '#4a5160');
    c.fillStyle = '#2b2f38';
    c.fillRect(x0 + 6, -78, 6, 40);
    c.fillRect(x0 + 118, -78, 6, 40);
    for (let row = 0; row < 3; row++) {
      for (let n = 0; n < 4 - (row === 2 ? 1 : 0); n++) {
        const lx = x0 + 28 + n * 25 + (row % 2) * 12;
        const ly = -50 - row * 18;
        c.fillStyle = '#d9a86a';
        fillCircle(c, lx, ly, 10);
        c.strokeStyle = '#a8743f';
        c.lineWidth = 2;
        c.beginPath();
        c.arc(lx, ly, 5, 0, Math.PI * 2);
        c.stroke();
      }
    }
    // snow on the logs
    fillRoundRect(c, x0 + 22, -96, 86, 7, 3, '#f4f8ff');
    for (const x of [x0 + 26, x0 + 104]) wheel(c, x, spin);
  }
}

/**
 * The yellow motor trolley of the forest workers, heading left.
 * @param {CanvasRenderingContext2D} c
 * @param {number} time
 */
function drawTrolley(c, time) {
  fillRoundRect(c, 6, -60, 138, 30, 8, '#f2c14e');
  c.fillStyle = '#2b2f38';
  c.fillRect(20, -130, 5, 70);
  c.fillRect(126, -130, 5, 70);
  fillRoundRect(c, 12, -138, 126, 12, 6, '#e0a830');
  c.font = '44px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('👷', 56, -86 + Math.sin(time * 3) * 2);
  c.fillText('👷', 100, -86 + Math.sin(time * 3 + 1) * 2);
  c.fillStyle = '#fff8dc';
  fillCircle(c, 10, -46, 5);
  for (const x of [36, 114]) wheel(c, x, 0);
}
