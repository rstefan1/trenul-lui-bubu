/**
 * @file Travel mission "over the big viaducts": from the top of a mountain
 * line the heavy freight train goes down over great viaducts, and the child
 * keeps its speed safe.
 *
 * Downhill the loaded train keeps speeding up. Holding (or tapping)
 * "Frânează" slows it down; the speedometer has a green zone, and the child
 * keeps the needle in it all the way down, over the viaducts.
 *
 * Stars depend on how much of the descent the speed stayed in the green
 * zone. The mission takes the controls of the train and gives them back at
 * the end.
 *
 * Configuration: only id/title/text.
 */

import { clamp } from '../core/math.js';
import { CRUISE_SPEED } from '../journey/route.js';
import { fillCircle, fillRoundRect } from '../gfx/shapes.js';
import { zoomed } from '../gfx/ui-style.js';
import { el } from '../ui/dom.js';
import { leave } from '../ui/panel.js';
import { Mission } from './mission.js';

/** @typedef {import('./mission.js').MissionConfig} DescentConfig */

/** Speed when the descent begins, at the top (stage units/s). */
const TOP_SPEED = 220;
/** Downhill the train speeds up by this much per second; the brake takes off this much. */
const DOWNHILL = 75;
const BRAKE = 210;
/** The green zone of the speedometer, and the top of its scale. */
const ZONE = [170, 320];
const MAX_SPEED = 560;
/** A tap brakes for this long (holding brakes as long as it is held). */
const TAP_BRAKE = 0.45;
/** Speed shown on the speedometer for the timetable's cruising speed (km/h). */
const KMH_AT_CRUISE = 80;
/** How much bigger the speedometer is drawn than the other cards. */
const GAUGE_ZOOM = 1.3;
/** Room left free under the heads-up display for the announcements (stage units). */
const ANNOUNCE_ROOM = 170;

export class DescentMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {DescentConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    this.speed = TOP_SPEED;
    this.held = false;
    this.tapLeft = 0;
    /** Seconds of the descent, and of them in the green zone. */
    this.downT = 0;
    this.inZoneT = 0;
    this.time = 0;
    /** @type {import('../journey/journey.js').Controls | null} */
    this.controls = null;
    /** @type {HTMLButtonElement | null} */
    this.button = null;
    /** @type {(e: KeyboardEvent) => void} */
    this.onKeyDown = e => {
      if (e.code !== 'Space' || this.ctx.hud.paused) return;
      e.preventDefault();
      if (!e.repeat) this.press();
    };
    /** @type {(e: KeyboardEvent) => void} */
    this.onKeyUp = e => { if (e.code === 'Space') this.held = false; };
  }

  /** @param {{duration?: number, window?: {from: number, to: number}}} hints */
  start(hints) {
    super.start(hints);
    this.controls = this.ctx.journey.takeControl();
    if (this.controls) this.controls.target = TOP_SPEED;
    this.button = /** @type {HTMLButtonElement} */ (el('button', { class: 'brake-btn', type: 'button' }, ['✋ Frânează']));
    this.button.addEventListener('pointerdown', e => {
      e.preventDefault();
      this.press();
    });
    for (const ev of ['pointerup', 'pointercancel', 'pointerleave']) this.button.addEventListener(ev, () => { this.held = false; });
    this.button.addEventListener('click', e => { if (e.detail === 0) this.press(); });
    document.body.append(this.button);
    window.addEventListener('keydown', this.onKeyDown);
    window.addEventListener('keyup', this.onKeyUp);
  }

  /** @private The brake: held, or tapped. */
  press() {
    if (this.phase === 'finished' || !this.button) return;
    this.held = true;
    this.tapLeft = TAP_BRAKE;
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.tapLeft -= dt;
    const braking = this.held || this.tapLeft > 0;
    this.speed = clamp(this.speed + (braking ? -BRAKE : DOWNHILL) * dt, 60, MAX_SPEED);
    if (!this.ctx.hud.paused) {
      this.downT += dt;
      if (this.speed >= ZONE[0] && this.speed <= ZONE[1]) this.inZoneT += dt;
    }
    this.button?.classList.toggle('is-urgent', this.speed > ZONE[1]);
    if (this.controls) this.controls.target = this.speed;
    if (this.phase === 'wrapping') this.finishMission();
  }

  /** @private */
  finishMission() {
    if (this.phase === 'finished') return;
    if (this.controls) {
      this.controls = null;
      this.ctx.journey.releaseControl();
    }
    const k = this.downT > 0 ? this.inZoneT / this.downT : 1;
    this.complete(k >= 0.75 ? 3 : k >= 0.5 ? 2 : 1, k >= 0.75
      ? 'Bravo! Ai coborât peste viaducte cu viteza potrivită.'
      : 'Am coborât cu bine peste viaductele de la Dealu Ștefăniței!');
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    // the speedometer, big, in the middle of the screen (it is what the child
    // watches), below the announcements, with its green zone
    const stage = this.ctx.stage;
    const w = 250;
    const h = 150;
    const middle = (stage.viewLeft + stage.viewRight) / 2;
    const right = middle + w / 2;
    // always in the same place (moving with the view, it would cover the viaducts)
    const top = stage.toStage(0, this.ctx.hud.hudBottom).y + ANNOUNCE_ROOM;
    zoomed(c, stage.ui * GAUGE_ZOOM, middle, top, () => {
      const cx = right - w / 2;
      const cy = top + 104;
      const r = 78;
      fillRoundRect(c, right - w, top, w, h, 18, '#1b2440');
      const angle = (/** @type {number} */ v) => Math.PI + (clamp(v, 0, MAX_SPEED) / MAX_SPEED) * Math.PI;
      c.lineWidth = 16;
      c.strokeStyle = '#3a4466';
      c.beginPath();
      c.arc(cx, cy, r, Math.PI, 0);
      c.stroke();
      c.strokeStyle = '#3ee07a';
      c.beginPath();
      c.arc(cx, cy, r, angle(ZONE[0]), angle(ZONE[1]));
      c.stroke();
      c.strokeStyle = '#ff4436';
      c.beginPath();
      c.arc(cx, cy, r, angle(ZONE[1] + 20), 0);
      c.stroke();
      const a = angle(this.speed);
      c.strokeStyle = '#ffffff';
      c.lineWidth = 5;
      c.lineCap = 'round';
      c.beginPath();
      c.moveTo(cx, cy);
      c.lineTo(cx + Math.cos(a) * (r - 6), cy + Math.sin(a) * (r - 6));
      c.stroke();
      c.fillStyle = '#ffffff';
      fillCircle(c, cx, cy, 7);
      const fast = this.speed > ZONE[1];
      const slow = this.speed < ZONE[0];
      c.fillStyle = fast ? '#ff8a80' : slow ? '#ffe39a' : '#9ff0bf';
      c.font = '800 18px "Baloo 2", system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(fast ? 'Prea repede! Frânează!' : slow ? 'Prea încet: lasă frâna' : 'Bine!', cx, top + 20);
      c.font = '700 15px "Baloo 2", system-ui, sans-serif';
      c.fillStyle = '#9fb3d9';
      c.fillText(`${Math.round((this.speed / CRUISE_SPEED) * KMH_AT_CRUISE)} km/h`, cx, cy + 22);
    });
  }

  dispose() {
    if (this.controls) this.ctx.journey.releaseControl();
    leave(this.button);
    window.removeEventListener('keydown', this.onKeyDown);
    window.removeEventListener('keyup', this.onKeyUp);
  }
}
