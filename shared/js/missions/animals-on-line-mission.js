/**
 * @file Travel mission "animals on the line": deep in the forest, animals
 * stand on the rails of a forest railway (a roe deer, a fox, wild boars…).
 * When one comes into view, the child presses "Fluieră!": the locomotive
 * whistles, a jet of steam shoots up, and the animal runs off into the
 * forest.
 *
 * If the child waits, the train simply stops before the animal (see
 * LineStopMission) and the button pulses until the whistle sends it away;
 * nothing is ever hurt. A whistle with no animal in sight only blows steam.
 * An animal sent away before the train had to stop earns a star.
 *
 * Configuration (besides id/title/text):
 *   animals   [{emoji, name}] — in order along the line
 *   fact      shown after the last one
 */

import { el } from '../ui/dom.js';
import { leave } from '../ui/panel.js';
import { drawTouchNote } from '../gfx/hints.js';
import { TRACK_Y } from '../world/track.js';
import { LineStopMission } from './line-stop-mission.js';

/**
 * @typedef {{emoji: string, name: string}} AnimalSpec
 * @typedef {import('./mission.js').MissionConfig & {animals: AnimalSpec[], fact: string}} AnimalsConfig
 */

/** Room an animal takes on the line (stage units). */
const ANIMAL_W = 110;
/** Size of an animal on screen. */
const SIZE = 84;
/** Seconds an animal takes to run off. */
const RUN = 1.2;

export class AnimalsOnLineMission extends LineStopMission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {AnimalsConfig} config
   */
  constructor(ctx, config) {
    // once the view has moved forward to the first animal, it stays there until the last one has run away
    super(ctx, config, { speed: 320, firstAhead: 2600, spacing: 2600, stopBefore: 260, room: 200, holdView: true });
    this.config = config;
    this.quick = 0;
    /** @type {HTMLButtonElement | null} */
    this.button = null;
    /** @type {(e: KeyboardEvent) => void} */
    this.onKey = e => {
      if (e.code !== 'Space' || this.ctx.hud.paused) return;
      e.preventDefault();
      this.whistle();
    };
  }

  /** @param {{duration?: number, window?: {from: number, to: number}}} hints */
  start(hints) {
    super.start(hints);
    this.button = /** @type {HTMLButtonElement} */ (el('button', { class: 'brake-btn is-stopped', type: 'button' }, ['📣 Fluieră!']));
    this.button.addEventListener('pointerdown', e => {
      e.preventDefault();
      this.whistle();
    });
    this.button.addEventListener('click', e => { if (e.detail === 0) this.whistle(); });
    document.body.append(this.button);
    window.addEventListener('keydown', this.onKey);
    this.ctx.hud.setCounter('⭐', 0, this.config.animals.length);
  }

  /** @param {(i: number) => number} at */
  makePlaces(at) {
    return this.config.animals.map((a, i) => this.place(at(i), ANIMAL_W, { animal: a, side: i % 2 ? 1 : -1 }));
  }

  /** The animal running away (kept on screen until it is gone), or else the next one. */
  focusPlace() {
    return this.places.find(p => p.done && this.time - p.doneAt < RUN + 0.3) ?? this.next;
  }

  /** The animal on screen still standing on the line, if any. */
  inSight() {
    const p = this.next;
    if (!p) return null;
    const x = this.toScreen(p.worldX);
    return x < this.ctx.stage.viewRight - 30 ? p : null;
  }

  /** @private The locomotive whistles. */
  whistle() {
    if (this.phase === 'finished') return;
    if (this.ctx.audio?.canPlay('whistle')) this.ctx.audio.play('whistle', 0.6);
    // a jet of steam from the whistle on the roof of the cab
    const steam = /** @type {{steam?: import('../train/steam.js').SteamPlume}} */ (this.ctx).steam;
    const cab = this.ctx.world.train.locoParts.cab?.[0];
    if (steam && cab) {
      const top = this.ctx.world.trainToStage({ x: cab[0] + cab[2] - 18, y: cab[1] - 18 });
      steam.jet(top.x, top.y);
    }
    const p = this.inSight();
    if (!p) return;
    this.markDone(p);
    if (p.reachedAt < 0) this.quick += 1;
    this.ctx.hud.setCounter('⭐', this.quick, this.places.length);
    this.sound('hop', this.toScreen(p.worldX));
    if (!this.next) this.ctx.hud.announce('Linia e liberă!', this.config.fact, 'Misiune', 4);
  }

  /** @param {number} dt */
  update(dt) {
    super.update(dt);
    if (this.button) this.button.classList.toggle('is-urgent', !!this.inSight());
  }

  /** @returns {[number, string]} */
  result() {
    const n = this.places.length;
    return [this.quick >= n ? 3 : this.quick >= n - 1 ? 2 : 1, this.quick >= n
      ? 'Bravo! Ai fluierat la timp și animalele au fugit în pădure.'
      : 'Animalele s-au întors în pădure, iar noi mergem mai departe!'];
  }

  /**
   * @param {CanvasRenderingContext2D} c
   * @param {import('./line-stop-mission.js').LinePlace} place
   * @param {number} x0
   */
  drawPlace(c, place, x0) {
    const p = /** @type {import('./line-stop-mission.js').LinePlace & {animal: AnimalSpec, side: number}} */ (place);
    let x = x0 + ANIMAL_W / 2;
    let y = TRACK_Y - SIZE * 0.42;
    let alpha = 1;
    let flip = 1;
    if (p.done) {
      // it runs off, up into the forest, and is gone
      const k = (this.time - p.doneAt) / RUN;
      if (k >= 1) return;
      x += k * 260;
      y -= k * 150 + Math.abs(Math.sin(k * Math.PI * 4)) * 24;
      alpha = 1 - k * k;
    } else {
      // it stands and looks around, a little nervous
      y += Math.sin(this.time * 3 + p.worldX) * 2;
      flip = Math.sin(this.time * 0.8 + p.worldX) > 0 ? 1 : -1;
    }
    c.save();
    c.globalAlpha = alpha;
    c.translate(x, y);
    // emoji animals look left; the running ones turn towards the forest (right)
    c.scale(p.done ? -1 : flip, 1);
    c.font = `${SIZE}px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(p.animal.emoji, 0, 0);
    c.restore();
  }

  /** @param {CanvasRenderingContext2D} c */
  drawOver(c) {
    const p = this.inSight();
    if (!p) return;
    const x = this.toScreen(p.worldX) + ANIMAL_W / 2;
    const y = TRACK_Y - this.ctx.world.cameraY - SIZE;
    drawTouchNote(c, this.ctx.stage, x, y, `Fluieră! ${p.animal.name} e pe linie`);
  }

  dispose() {
    super.dispose();
    leave(this.button);
    window.removeEventListener('keydown', this.onKey);
  }
}
