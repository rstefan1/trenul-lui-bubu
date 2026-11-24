/**
 * @file Station mission "the pushing locomotive": before a steep mountain
 * line, a second locomotive is coupled at the back of the freight train, to
 * push it up. The child brings it in gently.
 *
 * A close-up of the back of the train appears in a card: the last wagon on
 * the right, the helper locomotive rolling towards it from the left. The
 * child presses "Frânează" when the locomotive is at the green mark on the
 * rail (a generous stretch, about a second long); it then slows down and
 * touches the wagon softly, and the couplers lock. Too early, and it stops
 * short and creeps on slowly (just try again); too late, and it bumps the
 * wagon (a mistake, but it is coupled all the same). The green mark glows,
 * with a note, as the locomotive nears it.
 *
 * When the locomotive is coupled, the mission sets a flag; the game then
 * draws it at the back of the train.
 *
 * Configuration (besides id/title/text):
 *   flag   set when the locomotive is coupled
 *   fact   shown at the end
 */

import { drawTouchNote } from '../gfx/hints.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { fillCircle, fillRoundRect } from '../gfx/shapes.js';
import { CAR_PAINTERS, WHEEL_R } from '../train/cars.js';
import { FREIGHT_TRAIN } from '../train/specs.js';
import { el } from '../ui/dom.js';
import { leave } from '../ui/panel.js';
import { Mission } from './mission.js';

/** @typedef {import('./mission.js').MissionConfig & {flag: string, fact: string}} CouplingConfig */

/** Size of the close-up card (stage units) and the scale of the cars in it. */
const CARD_W = 1000;
const CARD_H = 330;
const SCALE = 0.8;
/** Speeds of the locomotive in the close-up (card units/s): rolling in, and creeping after a short stop. */
const ROLL_SPEED = 180;
const CREEP_SPEED = 90;
/** Braking rate of a stop asked for too early or too late (card units/s²). */
const BRAKE = 260;
/** The green mark: where the locomotive is when braking would stop it right at the wagon,
 *  and how far before and after it a press still counts (card units). */
const MARK_BEFORE = 150;
const MARK_AFTER = 60;

export class CouplingMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {CouplingConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** Front of the helper locomotive and the back of the wagon, in card units from the card's left. */
    this.locoFront = 120;
    this.wagonBack = 700;
    this.speed = ROLL_SPEED;
    /** @type {'none' | 'soft' | 'hard'} how the locomotive brakes: to a soft touch, or at its usual rate */
    this.braking = 'none';
    /** Braking rate of a soft stop, planned from where "Frânează" was pressed to the wagon. */
    this.softRate = BRAKE;
    /** @type {'rolling' | 'stopped' | 'coupled' | 'done'} */
    this.state = 'rolling';
    this.mistakes = 0;
    this.time = 0;
    this.stateT = 0;
    this.particles = new Particles();
    /** @type {HTMLButtonElement | null} */
    this.button = null;
    /** @type {(e: KeyboardEvent) => void} */
    this.onKey = e => {
      if (e.code !== 'Space' || this.ctx.hud.paused) return;
      e.preventDefault();
      this.brake();
    };
  }

  start() {
    super.start();
    this.button = /** @type {HTMLButtonElement} */ (el('button', { class: 'brake-btn', type: 'button' }, ['✋ Frânează']));
    this.button.addEventListener('pointerdown', e => {
      e.preventDefault();
      this.brake();
    });
    this.button.addEventListener('click', e => { if (e.detail === 0) this.brake(); });
    document.body.append(this.button);
    window.addEventListener('keydown', this.onKey);
  }

  /** The middle of the green mark: braking there at the usual rate stops the locomotive at the wagon. */
  get markX() {
    return this.wagonBack - (this.speed * this.speed) / (2 * BRAKE);
  }

  /** @private */
  brake() {
    if (this.state !== 'rolling' || this.braking !== 'none') return;
    const at = this.locoFront - this.markX;
    // on the mark, the locomotive glides to a soft touch; elsewhere it brakes at its usual rate
    this.braking = at >= -MARK_BEFORE && at <= MARK_AFTER ? 'soft' : 'hard';
    this.softRate = (this.speed * this.speed) / (2 * Math.max(1, this.wagonBack - this.locoFront));
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.stateT += dt;
    this.particles.update(dt);
    if (this.state === 'rolling') {
      if (this.braking === 'soft') {
        const gap = Math.max(0, this.wagonBack - this.locoFront);
        this.speed = Math.max(12, Math.min(this.speed, Math.sqrt(2 * this.softRate * gap)));
      } else if (this.braking === 'hard') {
        this.speed = Math.max(0, this.speed - BRAKE * dt);
      }
      this.locoFront += this.speed * dt;
      const gap = this.wagonBack - this.locoFront;
      if (gap <= 0) {
        // it reached the wagon: softly, or with a bump
        this.locoFront = this.wagonBack;
        if (this.braking !== 'soft') {
          this.mistakes += 1;
          this.oops();
          this.ctx.hud.announce('Bum!', 'Prea tare! Locomotiva a lovit vagonul. Data viitoare frânează la semnul verde.', 'Misiune', 3);
        }
        this.couple();
      } else if (this.speed === 0) {
        this.state = 'stopped';
        this.stateT = 0;
        this.ctx.hud.announce('Prea devreme', 'Locomotiva s-a oprit prea departe. Se mai apropie puțin: frânează iar la semnul verde!', 'Misiune', 3);
      }
    } else if (this.state === 'stopped' && this.stateT > 1.2) {
      // it creeps on, slowly, for another try
      this.state = 'rolling';
      this.braking = 'none';
      this.speed = CREEP_SPEED;
    } else if (this.state === 'coupled' && this.stateT > 2.4) {
      this.state = 'done';
      this.complete(this.mistakes === 0 ? 3 : this.mistakes === 1 ? 2 : 1, this.mistakes === 0
        ? 'Perfect! Locomotiva de împingere s-a cuplat ușor, fără nicio zdruncinătură.'
        : 'Locomotiva de împingere e cuplată. Putem urca!');
    }
    this.button?.classList.toggle('is-urgent', this.state === 'rolling' && this.braking === 'none' && this.locoFront > this.markX - MARK_BEFORE);
  }

  /** @private The couplers lock. */
  couple() {
    this.state = 'coupled';
    this.stateT = 0;
    this.speed = 0;
    this.sound('thud');
    const p = this.toStage(this.wagonBack, -50);
    this.particles.burst(p.x, p.y, SPARKS, 22, 220);
    this.ctx.state.setFlag(this.config.flag);
    this.ctx.hud.announce('Cuplat!', this.config.fact, 'Misiune', 4);
    leave(this.button);
    this.button = null;
  }

  /** @private The card's left and its rail, on the stage. */
  card() {
    const stage = this.ctx.stage;
    const w = Math.min(CARD_W, stage.viewRight - stage.viewLeft - 40);
    const x = (stage.viewLeft + stage.viewRight) / 2 - w / 2;
    const y = stage.toStage(0, this.ctx.hud.hudBottom).y + 30;
    return { x, y, w, rail: y + CARD_H - 50, k: w / CARD_W };
  }

  /**
   * A point of the close-up on the stage.
   * @private
   * @param {number} cx  card units from the left
   * @param {number} cy  car units above the rail (negative up)
   */
  toStage(cx, cy) {
    const c = this.card();
    return { x: c.x + cx * c.k, y: c.rail + cy * SCALE * c.k };
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    if (this.state === 'done') return;
    const card = this.card();
    fillRoundRect(c, card.x - 6, card.y - 6, card.w + 12, CARD_H * card.k + 12, 30, '#ffffff');
    fillRoundRect(c, card.x, card.y, card.w, CARD_H * card.k, 24, '#dfeaf7');
    c.save();
    c.beginPath();
    c.rect(card.x, card.y, card.w, CARD_H * card.k);
    c.clip();
    // the snowy ground and the rail
    c.fillStyle = '#f4f8ff';
    c.fillRect(card.x, card.rail, card.w, CARD_H * card.k);
    c.fillStyle = '#6d6258';
    c.fillRect(card.x, card.rail - 2, card.w, 6);
    // the green mark where to brake
    const mark = this.toStage(this.markX, 0);
    const pulse = 0.5 + 0.5 * Math.sin(this.time * 6);
    if (this.state === 'rolling' && this.braking === 'none') {
      // the stretch where pressing works: the front of the locomotive must be on it
      const from = this.toStage(this.markX - MARK_BEFORE, 0).x;
      const to = this.toStage(this.markX + MARK_AFTER, 0).x;
      c.fillStyle = `rgba(46,157,87,${0.55 + 0.45 * pulse})`;
      c.fillRect(from, card.rail - 4, to - from, 14);
    }
    // the last wagon (its back towards the locomotive) and the helper locomotive
    const k = SCALE * card.k;
    const wagon = FREIGHT_TRAIN.cars[4];
    const loco = { ...FREIGHT_TRAIN.cars[0], colors: { ...FREIGHT_TRAIN.cars[0].colors, body: this.ctx.state.locoColor ?? FREIGHT_TRAIN.cars[0].colors.body } };
    this.drawCar(c, wagon, this.toStage(this.wagonBack, 0), k, false);
    this.drawCar(c, loco, this.toStage(this.locoFront - loco.length * SCALE, 0), k, true);
    c.restore();
    if (this.state === 'rolling' && this.braking === 'none' && this.locoFront > this.markX - MARK_BEFORE - 200) {
      drawTouchNote(c, this.ctx.stage, mark.x, card.rail - 150 * k - pulse * 6, 'Frânează aici!');
    }
    this.particles.draw(c);
  }

  /**
   * A car of the close-up, with its wheels.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {import('../train/specs.js').CarSpec} car
   * @param {{x: number, y: number}} at   its rear end on the rail
   * @param {number} k   scale
   * @param {boolean} turning  the locomotive's wheels turn as it rolls
   */
  drawCar(c, car, at, k, turning) {
    c.save();
    c.translate(at.x, at.y);
    c.scale(k, k);
    const geo = CAR_PAINTERS[car.kind](c, car, { leading: false, trailing: false });
    const a = turning ? this.locoFront / WHEEL_R : 0;
    for (const wx of geo.wheels) {
      c.fillStyle = '#2b2f38';
      fillCircle(c, wx, -WHEEL_R, WHEEL_R);
      c.fillStyle = '#8b95a5';
      fillCircle(c, wx, -WHEEL_R, WHEEL_R - 4);
      c.strokeStyle = '#4a5160';
      c.lineWidth = 3;
      c.beginPath();
      c.moveTo(wx, -WHEEL_R);
      c.lineTo(wx + Math.cos(a) * (WHEEL_R - 4), -WHEEL_R + Math.sin(a) * (WHEEL_R - 4));
      c.stroke();
    }
    c.restore();
  }

  dispose() {
    leave(this.button);
    window.removeEventListener('keydown', this.onKey);
  }
}
