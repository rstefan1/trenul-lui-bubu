/**
 * @file Station mission "the departure signal": a forest railway has one
 * track, so the trains meet in the stations. Bubu works as the station's
 * traffic controller and sends the other trains off, one after the other:
 * first a train loaded with logs, then the little motor trolley of the
 * forest workers.
 *
 * Both wait on the second track, in front of Bubu's train, heading down to
 * the valley (to the left), and are as big as Bubu's own train: the log
 * train has a steam locomotive like hers (drawn by the same painters, turned
 * round) and flat wagons loaded with logs. For each one the child:
 *
 *   1. throws the lever of the switch (it sets the way out of the station);
 *   2. raises the green paddle ("Ridică paleta"): Bubu, who has got off her
 *      train and stands on the ground beside the line, lifts it towards the
 *      other train; its driver whistles and the train leaves. The paddle raised before the switch is set is a
 *      gentle mistake ("Întâi macazul!").
 *
 * Then Bubu puts the switch back, and the next train rolls in.
 *
 * Configuration (besides id/title/text):
 *   trains   ["logs" | "trolley"] — in order
 *   fact     shown at the end
 */

import { createOffscreen, releaseCanvas } from '../core/canvas-cache.js';
import { TAU, clamp } from '../core/math.js';
import { drawTouchNote } from '../gfx/hints.js';
import { fillCircle, fillRoundRect } from '../gfx/shapes.js';
import { CAR_PAINTERS, WHEEL_R } from '../train/cars.js';
import { drawBubu } from '../train/bubu.js';
import { SteamPlume } from '../train/steam.js';
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
/**
 * The cars of the log train, from its front: a black steam locomotive like
 * Bubu's (without her ladybug) and three flat wagons with logs.
 * @type {import('../train/specs.js').CarSpec[]}
 */
const LOG_TRAIN = [
  { kind: 'steamLoco', length: 250, colors: { body: '#23252b', band: '#c62828', roof: '#16171b', accent: '#d9a640' }, plain: true },
  ...[1, 2, 3].map(() => /** @type {import('../train/specs.js').CarSpec} */ ({
    kind: 'platform', length: 250, colors: { body: '#4a5160', band: '#8d6e63', roof: '#3b4250' }, cargo: 'logs',
  })),
];
/** Space between two cars, as on Bubu's train. */
const GAP = 10;
/** Length of the motor trolley. */
const TROLLEY = 210;
/** Lengths of the trains that wait there. */
const LENGTH = { logs: LOG_TRAIN.reduce((sum, car) => sum + car.length + GAP, -GAP), trolley: TROLLEY };
/** Bubu on the ground beside the line: her size, where she stands (share of the screen's
 *  width, left of the waiting trains) and the seconds she takes to hop down or back up. */
const BUBU_SIZE = 96;
const BUBU_AT = 0.23;
const BUBU_HOP = 0.8;
/** Vertical extent of a painted train, relative to its rail. */
const TOP = -262;
const BOTTOM = 8;
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
    /** Bubu out of her train: 0 at her window … 1 on the ground (animated). */
    this.out = 0;
    /** How far the wheels of the waiting train have turned (radians). */
    this.spin = 0;
    /**
     * The log train painted once (like Bubu's train), with where its wheels
     * and its chimney are, from its front (left end).
     * @type {{canvas: HTMLCanvasElement, ratio: number, wheels: number[], chimney: {x: number, y: number}} | null}
     */
    this.painted = null;
    /** The smoke of the log train's locomotive. */
    this.smoke = new SteamPlume();
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
    // Bubu gets off her train: she leaves her window and hops down beside the line
    this.ctx.world.train.setBubuVisible(false);
  }

  /**
   * Where Bubu is now, on the stage (the middle of her picture): at her window,
   * on the ground beside the line, or hopping between the two.
   * @private
   */
  bubuOnStage() {
    const s = this.ctx.stage;
    const w = this.ctx.world;
    const win = w.trainToStage(w.train.bubuPosition);
    const ground = { x: s.viewLeft + (s.viewRight - s.viewLeft) * BUBU_AT, y: TRACK_Y + 54 - w.cameraY - BUBU_SIZE / 2 };
    const k = this.out;
    const e = k * k * (3 - 2 * k);
    return {
      x: win.x + (ground.x - win.x) * e,
      y: win.y + (ground.y - win.y) * e - Math.sin(k * Math.PI) * 120,
    };
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
    // Bubu hops down at the start, and back up to her window when all is done
    const back = this.step === 'done' && this.stepT > 0.8;
    this.out = clamp(this.out + (back ? -dt : dt) / BUBU_HOP, 0, 1);
    if (back && this.out <= 0) this.ctx.world.train.setBubuVisible(true);
    this.spin += (-this.speed * dt) / WHEEL_R;
    const chimney = this.kind === 'logs' && this.painted
      ? { x: this.trainX + this.painted.chimney.x, y: RAIL_Y + this.painted.chimney.y - this.ctx.world.cameraY }
      : null;
    this.smoke.update(dt, chimney, 0);
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

    this.drawBubu(c);

    // the waiting train
    if (this.index < this.config.trains.length) {
      c.save();
      c.translate(this.trainX, RAIL_Y - cam);
      if (this.kind === 'logs') this.drawLogTrain(c);
      else drawTrolley(c, this.spin, this.time);
      c.restore();
    }
    this.smoke.draw(c);

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
  }

  /**
   * Bubu out of her train, with her green paddle: held low, or raised high
   * towards the waiting train.
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  drawBubu(c) {
    if (this.out <= 0) return;
    const b = this.bubuOnStage();
    const up = this.paddle >= 0 ? Math.min(1, this.paddle / 0.3) : 0;
    // a little hop of pride when she raises the paddle
    const hop = up > 0 && this.paddle < 0.6 ? Math.sin((this.paddle / 0.6) * Math.PI) * 10 : 0;
    const y = b.y - hop;
    if (this.out >= 1) {
      // the paddle: its handle in her hand, the green disc low by her side or high up
      const hx = b.x + BUBU_SIZE * 0.36;
      const hy = y + BUBU_SIZE * 0.12;
      const dx = hx + 10 + up * 26;
      const dy = hy - 40 - up * 90;
      c.strokeStyle = '#6d4524';
      c.lineWidth = 7;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(hx, hy);
      c.lineTo(dx, dy + 26);
      c.stroke();
      c.fillStyle = '#ffffff';
      fillCircle(c, dx, dy, 30);
      c.fillStyle = '#2e9d57';
      fillCircle(c, dx, dy, 24);
    }
    drawBubu(c, b.x, y, BUBU_SIZE, (1 - this.out) * 0.4 + up * 0.08);
  }

  /**
   * Paints the log train once, turned round (heading left), with the painters
   * of Bubu's own train.
   * @private
   */
  paintLogTrain() {
    const ratio = this.ctx.stage.pixelRatio;
    if (this.painted && this.painted.ratio === ratio) return this.painted;
    releaseCanvas(this.painted?.canvas);
    const { canvas, ctx } = createOffscreen({ x: -20, y: TOP, width: LENGTH.logs + 40, height: BOTTOM - TOP, ratio });
    /** @type {number[]} */
    const wheels = [];
    let chimney = { x: 40, y: -180 };
    let left = 0;
    LOG_TRAIN.forEach((car, i) => {
      ctx.save();
      // the painters draw a car heading right: turned round, its front is on the left
      ctx.translate(left + car.length, 0);
      ctx.scale(-1, 1);
      const geo = CAR_PAINTERS[car.kind](ctx, car, { leading: i === 0, trailing: i === LOG_TRAIN.length - 1 });
      ctx.restore();
      for (const wx of geo.wheels) wheels.push(left + car.length - wx);
      const ch = geo.parts?.chimney?.[0];
      if (ch) chimney = { x: left + car.length - (ch[0] + ch[2] / 2), y: ch[1] + 8 };
      left += car.length + GAP;
    });
    this.painted = { canvas, ratio, wheels, chimney };
    return this.painted;
  }

  /**
   * The log train: its turning wheels, then its painted body.
   * @private
   * @param {CanvasRenderingContext2D} c  (x = 0 at its front, y = 0 on its rail)
   */
  drawLogTrain(c) {
    const p = this.paintLogTrain();
    for (const x of p.wheels) drawWheel(c, x, this.spin);
    c.drawImage(p.canvas, -20, TOP, LENGTH.logs + 40, BOTTOM - TOP);
  }

  dispose() {
    this.ctx.world.train.setBubuVisible(true);
    leave(this.button);
    this.ctx.hud.hideCounter();
    releaseCanvas(this.painted?.canvas);
    this.painted = null;
  }
}

/**
 * A wheel of the trains on the second track, as big as the wheels of Bubu's
 * train, its spokes turning.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} spin
 */
function drawWheel(c, x, spin) {
  const y = -WHEEL_R;
  c.fillStyle = '#2b2f38';
  fillCircle(c, x, y, WHEEL_R);
  c.fillStyle = '#8b95a5';
  fillCircle(c, x, y, WHEEL_R - 4);
  c.strokeStyle = '#4a5160';
  c.lineWidth = 3;
  c.beginPath();
  for (let k = 0; k < 3; k++) {
    const a = spin + (k * TAU) / 3;
    c.moveTo(x, y);
    c.lineTo(x + Math.cos(a) * (WHEEL_R - 4), y + Math.sin(a) * (WHEEL_R - 4));
  }
  c.stroke();
  c.fillStyle = '#2b2f38';
  fillCircle(c, x, y, 3.5);
}

/**
 * The yellow motor trolley of the forest workers, heading left: a little
 * car with a roof, as tall as a coach of Bubu's train.
 * @param {CanvasRenderingContext2D} c
 * @param {number} spin
 * @param {number} time
 */
function drawTrolley(c, spin, time) {
  const L = TROLLEY;
  // the roof on its posts, open at the sides
  c.fillStyle = '#2b2f38';
  for (const x of [66, L - 12]) c.fillRect(x, -164, 6, 82);
  fillRoundRect(c, 56, -174, L - 50, 14, 7, '#c62828');
  // the forest workers on their bench, sitting inside: drawn before the side of
  // the trolley, which hides them from the waist down
  c.font = '48px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText('👷', 100, -98 + Math.sin(time * 3));
  c.fillText('👷', 154, -98 + Math.sin(time * 3 + 1));
  // the frame, the body and the bonnet with the engine at the front (left)
  c.fillStyle = '#2f3540';
  c.fillRect(0, -40, L, 10);
  fillRoundRect(c, 4, -96, 64, 58, 10, '#e0a830');
  fillRoundRect(c, 60, -84, L - 66, 46, 8, '#f2c14e');
  c.fillStyle = 'rgba(0,0,0,0.16)';
  for (let x = 14; x < 60; x += 9) c.fillRect(x, -88, 4, 30);
  // the lamp at the front
  c.fillStyle = '#fff8dc';
  fillCircle(c, 6, -70, 6);
  for (const x of [40, L - 40]) drawWheel(c, x, spin);
}
