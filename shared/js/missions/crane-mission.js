/**
 * @file Station mission "the crane of the depot": the child loads a flat
 * wagon with a gantry crane.
 *
 * The goods wait on the ground in front of the train, each with its weight
 * written on a tag. The child taps one, and the crane picks it up and sets
 * it down in its place on the wagon. The rule every loader knows: the heavy
 * things go first, at the bottom, and the light ones on top of them, so the
 * load is steady and does not tip over. A light thing chosen while heavy
 * ones still wait is a gentle mistake (it stays on the ground, and the
 * reason is explained); after a mistake, or a few seconds of waiting, a
 * note points at a heavy one ("Încarcă sacul cu făină").
 *
 * When everything is on the wagon, the mission sets a flag; the game then
 * draws the load on the wagon for the rest of the journey (gfx/cargo.js).
 *
 * Configuration (besides id/title/text):
 *   load    the load being put on the wagon (a key of LOADS)
 *   wagon   which flat wagon (0 = the first behind the locomotive)
 *   items   [{item, label, kg}] — the goods, one for every place of the load
 *   flag    set when the wagon is loaded
 *   fact    shown when the wagon is loaded
 */

import { DECK_Y, LOADS, drawCargoItem } from '../gfx/cargo.js';
import { drawTouchNote } from '../gfx/hints.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { fillRoundRect } from '../gfx/shapes.js';
import { TRACK_Y } from '../world/track.js';
import { Mission, starsForMistakes } from './mission.js';

/**
 * @typedef {object} CraneGood
 * @property {import('../gfx/cargo.js').CargoItem} item
 * @property {string} label
 * @property {number} kg
 *
 * @typedef {import('./mission.js').MissionConfig & {
 *   load: string, wagon: number, items: CraneGood[], flag: string, fact: string,
 * }} CraneConfig
 *
 * @typedef {object} Good
 * @property {CraneGood} spec
 * @property {import('../gfx/cargo.js').CargoSlot} slot   its place on the wagon
 * @property {boolean} heavy      it goes in the bottom row
 * @property {number} groundX     where it waits (stage x)
 * @property {'ground' | 'lifted' | 'placed'} state
 */

/** Where the goods stand on the ground (stage y of their bottom). */
const GROUND_Y = TRACK_Y + 72;
/** Space between the goods waiting on the ground. */
const GROUND_SPACING = 108;
/** Height of the crane's beam, and where the hook rests. */
const BEAM_Y = TRACK_Y - 340;
const HOOK_REST = TRACK_Y - 250;
/** Speeds of the trolley (along the beam) and of the hook (stage units/s). */
const TROLLEY_SPEED = 900;
const HOOK_SPEED = 800;
/** Seconds without a choice before the note points at a heavy good. */
const HINT_AFTER = 5;

export class CraneMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {CraneConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    const slots = LOADS[config.load];
    /** @type {Good[]} */
    this.goods = config.items.map(spec => {
      const slot = slots.find(s => s.item === spec.item);
      if (!slot) throw new Error(`No place for "${spec.item}" in the load "${config.load}"`);
      return { spec, slot, heavy: slot.bottom === DECK_Y, groundX: 0, state: /** @type {const} */ ('ground') };
    });
    this.mistakes = 0;
    this.time = 0;
    this.idleSince = 0;
    /** The crane: trolley x, hook y, and the moves still to make for the good it carries. */
    this.trolleyX = NaN;
    this.hookY = HOOK_REST;
    /** @type {Array<{x?: number, y?: number, then?: () => void}>} */
    this.moves = [];
    /** @type {Good | null} the good on the hook */
    this.carried = null;
    this.doneAt = -1;
    this.particles = new Particles();
  }

  start() {
    super.start();
    this.layout();
    this.trolleyX = this.goods[0].groundX;
    this.zoomOnCrane();
  }

  /**
   * The camera moves in on the crane, the goods and the wagon (every frame:
   * the wagon moves on screen if the window changes size).
   * @private
   */
  zoomOnCrane() {
    const { left, right } = this.craneSpan();
    const cam = this.ctx.world.cameraY;
    this.ctx.world.zoomOn({ left: left - 60, right: right + 60, top: BEAM_Y - 110 - cam, bottom: GROUND_Y + 60 - cam });
  }

  /**
   * Where the legs of the crane stand (stage x): around the goods on the
   * ground and their places on the wagon.
   * @private
   */
  craneSpan() {
    const xs = this.goods.flatMap(g => [g.groundX, this.slotOnStage(g).x]);
    return { left: Math.min(...xs) - 70, right: Math.max(...xs) + 70 };
  }

  /**
   * Places the goods on the ground in front of the wagon, mixed up so the
   * heavy and the light ones alternate.
   * @private
   */
  layout() {
    const heavy = this.goods.filter(g => g.heavy);
    const light = this.goods.filter(g => !g.heavy);
    /** @type {Good[]} */
    const row = [];
    while (heavy.length || light.length) {
      if (light.length) row.push(/** @type {Good} */ (light.shift()));
      if (heavy.length) row.push(/** @type {Good} */ (heavy.shift()));
    }
    const wagon = this.wagonLeft();
    const stage = this.ctx.stage;
    // under the wagon and the one behind it, kept on screen
    const right = Math.min(wagon + 230, stage.viewRight - 70);
    const left = Math.max(stage.viewLeft + 70, right - GROUND_SPACING * (row.length - 1));
    const step = row.length > 1 ? (right - left) / (row.length - 1) : 0;
    row.forEach((g, i) => { g.groundX = left + i * step; });
  }

  /** @private Stage x of the rear end of the wagon being loaded. */
  wagonLeft() {
    return this.ctx.world.trainToStage({ x: this.wagonCar().left, y: 0 }).x;
  }

  /** @private The wagon being loaded (laid out by the train renderer). */
  wagonCar() {
    const wagons = this.ctx.world.train.cars.filter(c => c.spec.kind === 'platform');
    return wagons[Math.min(this.config.wagon, wagons.length - 1)];
  }

  /**
   * Position of the bottom centre of a good's place on the wagon (stage
   * units, without the camera's lift: everything here is drawn with it).
   * @private
   * @param {Good} g
   */
  slotOnStage(g) {
    const p = this.ctx.world.trainToStage({ x: this.wagonCar().left + g.slot.x, y: g.slot.bottom });
    return { x: p.x, y: p.y + this.ctx.world.cameraY };
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    if (this.carried || this.doneAt >= 0) return;
    const g = this.goods.find(x => x.state === 'ground'
      && Math.abs(p.x - x.groundX) < x.slot.w / 2 + 16 && p.y > GROUND_Y - x.slot.h - 30 && p.y < GROUND_Y + 40);
    if (!g) return;
    this.idleSince = this.time;
    if (!g.heavy && this.goods.some(x => x.heavy && x.state !== 'placed')) {
      this.mistakes += 1;
      this.oops();
      this.ctx.hud.announce('Macaraua din depozit',
        `${g.spec.label} cântăresc doar ${g.spec.kg} kg. Întâi punem jos lucrurile grele, ca încărcătura să nu se răstoarne!`, 'Misiune', 3.5);
      return;
    }
    this.lift(g);
  }

  /**
   * The crane picks a good up and sets it down in its place.
   * @private
   * @param {Good} g
   */
  lift(g) {
    this.carried = g;
    const slot = this.slotOnStage(g);
    this.moves = [
      { x: g.groundX },
      { y: GROUND_Y - g.slot.h, then: () => { g.state = 'lifted'; this.sound('thud', g.groundX); } },
      { y: HOOK_REST },
      { x: slot.x },
      { y: slot.y - g.slot.h, then: () => this.place(g) },
      { y: HOOK_REST },
    ];
  }

  /**
   * @private
   * @param {Good} g
   */
  place(g) {
    g.state = 'placed';
    this.carried = null;
    const slot = this.slotOnStage(g);
    this.particles.burst(slot.x, slot.y - g.slot.h / 2, SPARKS, 12, 180);
    this.sound('ding', slot.x);
    this.ctx.hud.setCounter('📦', this.goods.filter(x => x.state === 'placed').length, this.goods.length);
    this.idleSince = this.time;
    if (this.goods.every(x => x.state === 'placed')) {
      this.doneAt = this.time;
      this.ctx.state.setFlag(this.config.flag);
      this.ctx.hud.announce('Vagonul e încărcat!', this.config.fact, 'Misiune', 4);
    }
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    this.zoomOnCrane();
    if (this.time < dt * 2) this.ctx.hud.setCounter('📦', 0, this.goods.length);
    // the crane makes its moves one after the other
    const m = this.moves[0];
    if (m) {
      if (m.x !== undefined) this.trolleyX = step(this.trolleyX, m.x, TROLLEY_SPEED * dt);
      if (m.y !== undefined) this.hookY = step(this.hookY, m.y, HOOK_SPEED * dt);
      if ((m.x === undefined || this.trolleyX === m.x) && (m.y === undefined || this.hookY === m.y)) {
        this.moves.shift();
        m.then?.();
      }
    }
    if (this.doneAt >= 0 && !this.moves.length && this.time - this.doneAt > 1.4) {
      this.ctx.hud.hideCounter();
      this.complete(starsForMistakes(this.mistakes, 2, 0), this.mistakes === 0
        ? 'Perfect! Lucrurile grele jos, cele ușoare sus: încărcătura stă bine.'
        : 'Bravo! Vagonul e încărcat și încărcătura stă bine.');
    }
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const cam = this.ctx.world.cameraY;
    c.save();
    c.translate(0, -cam);
    // the goods on the ground, with their weights
    for (const g of this.goods) {
      if (g.state !== 'ground') continue;
      drawCargoItem(c, g.spec.item, g.groundX, GROUND_Y, g.slot.w, g.slot.h);
      drawWeightTag(c, g.groundX, GROUND_Y + 6, g.spec.kg, g.heavy);
    }
    // the goods already on the wagon (until the wagon draws them itself)
    if (!this.ctx.state.flags.has(this.config.flag)) {
      for (const g of this.goods) {
        if (g.state !== 'placed') continue;
        const s = this.slotOnStage(g);
        drawCargoItem(c, g.spec.item, s.x, s.y, g.slot.w, g.slot.h);
      }
    }
    this.drawCrane(c);
    c.restore();
    // help: after a mistake, or when the child waits, point at a heavy good
    const waiting = !this.carried && this.doneAt < 0 && (this.mistakes > 0 || this.time - this.idleSince > HINT_AFTER);
    const next = this.goods.find(g => g.state === 'ground' && (g.heavy || this.goods.every(x => !x.heavy || x.state === 'placed')));
    if (waiting && next) {
      const bob = Math.sin(this.time * 5) * 5;
      drawTouchNote(c, this.ctx.stage, next.groundX, GROUND_Y - next.slot.h - 10 - cam + bob, `Încarcă ${next.spec.label.toLowerCase()}`);
    }
    this.particles.draw(c);
  }

  /**
   * The gantry crane: two legs, the beam above the train, the trolley with
   * its cable and hook, and the good it carries.
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  drawCrane(c) {
    const { left, right } = this.craneSpan();
    const steel = '#f2b705';
    // the legs stand in front of the train
    for (const x of [left, right]) {
      c.fillStyle = steel;
      c.fillRect(x - 8, BEAM_Y, 16, GROUND_Y + 20 - BEAM_Y);
      fillRoundRect(c, x - 22, GROUND_Y + 14, 44, 12, 4, '#59606c');
    }
    // the beam, with its lattice
    fillRoundRect(c, left - 16, BEAM_Y - 22, right - left + 32, 26, 4, steel);
    c.strokeStyle = '#b8860b';
    c.lineWidth = 3;
    c.beginPath();
    for (let x = left; x < right; x += 30) {
      c.moveTo(x, BEAM_Y - 20);
      c.lineTo(x + 15, BEAM_Y + 2);
      c.lineTo(x + 30, BEAM_Y - 20);
    }
    c.stroke();
    // the trolley, the cable and the hook
    const tx = this.trolleyX;
    fillRoundRect(c, tx - 26, BEAM_Y - 4, 52, 22, 5, '#59606c');
    c.strokeStyle = '#2d323c';
    c.lineWidth = 3;
    c.beginPath();
    c.moveTo(tx, BEAM_Y + 18);
    c.lineTo(tx, this.hookY);
    c.stroke();
    c.lineWidth = 5;
    c.beginPath();
    c.arc(tx, this.hookY + 8, 8, -Math.PI / 2, Math.PI * 0.9);
    c.stroke();
    const g = this.carried;
    if (g && g.state === 'lifted') {
      drawCargoItem(c, g.spec.item, tx, this.hookY + g.slot.h, g.slot.w, g.slot.h);
      // the slings from the hook to the good
      c.strokeStyle = '#6d4c41';
      c.lineWidth = 2;
      c.beginPath();
      c.moveTo(tx, this.hookY);
      c.lineTo(tx - g.slot.w / 2 + 6, this.hookY + 4);
      c.moveTo(tx, this.hookY);
      c.lineTo(tx + g.slot.w / 2 - 6, this.hookY + 4);
      c.stroke();
    }
  }

  dispose() {
    this.ctx.hud.hideCounter();
    this.ctx.world.zoomOn(null);
  }
}

/**
 * Moves a value towards a target by at most `max`.
 * @param {number} v
 * @param {number} target
 * @param {number} max
 */
function step(v, target, max) {
  return Math.abs(target - v) <= max ? target : v + Math.sign(target - v) * max;
}

/**
 * The weight tag under a good: heavy ones in orange, light ones in green.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y   top of the tag
 * @param {number} kg
 * @param {boolean} heavy
 */
function drawWeightTag(c, x, y, kg, heavy) {
  fillRoundRect(c, x - 34, y, 68, 26, 9, heavy ? '#f08a24' : '#2e9d57');
  c.fillStyle = '#ffffff';
  c.font = '800 17px "Baloo 2", system-ui, sans-serif';
  c.textAlign = 'center';
  c.textBaseline = 'middle';
  c.fillText(`${kg} kg`, x, y + 14);
}
