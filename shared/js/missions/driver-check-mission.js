/**
 * @file Station mission "driver for a day": Bubu becomes the driver of a
 * freight train, in three short steps.
 *
 *   1. The letter — the children waiting at the end of the journey say what
 *      they need; their list is the freight the train will pick up on the way.
 *   2. The waybill — the child writes their name as Bubu's assistant driver
 *      and chooses the colour of the locomotive (the train changes at once).
 *   3. The check — before leaving, a driver walks around the locomotive and
 *      checks it. The child finds every part of the checklist on the
 *      locomotive (headlights, wheels, fuel tank, horn) and taps it, and
 *      inspects the first wagon; each check comes with a short fact.
 *      The horn comes last and sounds the departure, then Bubu climbs into
 *      the cab.
 *
 * Help, so that no child is left guessing: as soon as a part is asked for,
 * it glows on the locomotive with a note pointing at it ("Verifică
 * farurile"), the
 * checklist says where it is (on the roof, under the locomotive…) and Bubu
 * walks over and waits next to it. Stars depend on the number of wrong taps.
 */

import { approach, clamp, easeInOut, lerp } from '../core/math.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { drawTouchNote } from '../gfx/hints.js';
import { fillCircle, roundRectPath } from '../gfx/shapes.js';
import { drawBubu } from '../train/bubu.js';
import { TRACK_Y } from '../world/track.js';
import { el } from '../ui/dom.js';
import { leave, showPanel } from '../ui/panel.js';
import { Mission, starsForMistakes } from './mission.js';

/**
 * @typedef {import('../train/cars.js').LocoPart} LocoPart
 * @typedef {LocoPart | 'wagon'} CheckPart   a part of the locomotive, or the first wagon
 * @typedef {import('../train/cars.js').Rect} Rect
 *
 * @typedef {object} Letter
 * @property {string} from       who wrote it
 * @property {string[]} lines    the letter itself, a paragraph per line
 * @property {Array<{icon: string, label: string}>} needs   what the children need
 * @property {string} sign       the signature
 *
 * @typedef {object} Waybill
 * @property {string} train
 * @property {string} from
 * @property {string} to
 * @property {string} date
 * @property {string} time
 * @property {string} wagons
 *
 * @typedef {object} PartCheck
 * @property {CheckPart} part
 * @property {string} icon
 * @property {string} label   as on the checklist ("Farurile")
 * @property {string} where   where to look for it ("jos, sub locomotivă")
 * @property {string} hint    the note pointing at it ("Verifică farurile")
 * @property {string} fact    what the part is for
 *
 * @typedef {object} DriverCheckConfig
 * @property {string} id
 * @property {string} title
 * @property {string} text
 * @property {Letter} letter
 * @property {Waybill} waybill
 * @property {Array<{color: string, label: string}>} locoColors
 * @property {string} checkText   the instructions of the check
 * @property {PartCheck[]} checks  in the order of the checklist
 */

/** Seconds of Bubu's hop into the cab. */
const HOP_TIME = 0.9;
/** Room around a part that still counts as touching it (stage units)… */
const TOUCH_MARGIN = 12;
/** …and at least this much on the screen (CSS pixels), so a finger finds even a small lamp on a phone. */
const FINGER_MARGIN = 26;
/** Height of a hint note with its tip (stage units, before it is enlarged on phones). */
const NOTE_HEIGHT = 58;
/** Bubu's size while she walks around the locomotive. */
const BUBU_SIZE = 104;

export class DriverCheckMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {DriverCheckConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    this.mistakes = 0;
    /** @type {'letter' | 'waybill' | 'check' | 'hop' | 'done'} */
    this.step = 'letter';
    this.time = 0;
    /** Index of the part to find now. */
    this.current = 0;
    /** Bubu's place on the platform (stage x), where she walks to. */
    this.bubuX = NaN;
    this.bubuTargetX = NaN;
    this.hopT = 0;
    this.doneAt = 0;
    this.particles = new Particles();
    /** @type {HTMLElement | null} */
    this.chip = null;
    /** @type {HTMLElement[]} the lines of the checklist */
    this.rows = [];
  }

  start() {
    this.phase = 'running';
    this.ctx.world.train.setBubuVisible(false, true);
    this.showLetter();
  }

  // ------------------------------------------------------------ step 1: the letter

  /** @private */
  showLetter() {
    const l = this.config.letter;
    const go = el('button', { class: 'big-btn', type: 'button' }, ['Îi ajutăm! ▶']);
    go.addEventListener('click', () => this.showWaybill());
    this.setPanel(el('div', { class: 'panel panel--wide letter-panel' }, [
      el('p', { class: 'panel-kicker' }, ['Misiune']),
      el('h2', { class: 'panel-title' }, [this.config.title]),
      el('div', { class: 'letter' }, [
        el('p', { class: 'letter-from' }, [`✉️ ${l.from}`]),
        ...l.lines.map(line => el('p', { class: 'letter-line' }, [line])),
        el('ul', { class: 'letter-needs' }, l.needs.map(n => el('li', {}, [el('span', { 'aria-hidden': 'true' }, [n.icon]), ` ${n.label}`]))),
        el('p', { class: 'letter-sign' }, [l.sign]),
      ]),
      go,
    ]));
  }

  // ------------------------------------------------------------ step 2: the waybill

  /** @private */
  showWaybill() {
    this.step = 'waybill';
    const w = this.config.waybill;
    const state = this.ctx.state;
    const input = el('input', {
      class: 'ticket-input', type: 'text', maxlength: '18', autocomplete: 'off',
      placeholder: 'scrie numele tău', 'aria-label': 'Numele tău',
    });
    input.value = state.travelerName;
    const done = el('button', { class: 'big-btn', type: 'button' }, ['Gata! ✔']);
    const hint = el('p', { class: 'panel-hint' }, ['Scrie-ți numele pe foaia de parcurs, lângă Bubu.']);
    const refresh = () => {
      const ok = input.value.trim().length >= 2;
      done.disabled = !ok;
      hint.hidden = ok;
    };
    input.addEventListener('input', refresh);
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !done.disabled) done.click(); });

    const swatches = this.config.locoColors.map(({ color, label }, i) => {
      const b = el('button', {
        class: 'swatch', type: 'button', title: label, 'aria-label': `Locomotivă ${label}`,
        style: `--swatch:${color}`, 'aria-pressed': String((state.locoColor ?? this.config.locoColors[0].color) === color),
      });
      b.addEventListener('click', () => {
        state.setLocoColor(color);
        for (const s of swatches) s.setAttribute('aria-pressed', String(s === b));
      });
      if (i === 0 && !state.locoColor) state.setLocoColor(color);
      return b;
    });

    done.addEventListener('click', () => {
      state.setTravelerName(input.value);
      this.startCheck();
    });

    this.setPanel(el('div', { class: 'panel ticket-panel' }, [
      el('p', { class: 'panel-kicker' }, ['Misiune']),
      el('h2', { class: 'panel-title' }, ['Foaia de parcurs']),
      el('p', { class: 'panel-text' }, ['Mecanicul primește foaia de parcurs a trenului. Completeaz-o!']),
      el('div', { class: 'ticket waybill' }, [
        el('div', { class: 'ticket-head' }, [el('span', {}, ['Foaie de parcurs']), el('span', {}, [w.train])]),
        el('p', { class: 'ticket-route' }, [
          el('b', {}, [w.from]), ' → ', el('b', {}, [w.to]),
          el('small', {}, [w.wagons]),
        ]),
        el('dl', { class: 'ticket-grid' }, [
          field('Data', w.date), field('Plecare', w.time),
          field('Mecanic', 'Bubu'), field('Tren', 'marfă'),
        ]),
        el('label', { class: 'ticket-name' }, ['Mecanic ajutor: ', input]),
      ]),
      hint,
      el('p', { class: 'panel-text' }, ['Alege culoarea locomotivei:']),
      el('div', { class: 'swatches' }, swatches),
      done,
    ]));
    refresh();
    // on phones, opening the keyboard by itself would hide the waybill
    if (matchMedia('(pointer: fine)').matches) input.focus();
  }

  // ------------------------------------------------------------ step 3: the check

  /** @private */
  startCheck() {
    this.step = 'check';
    this.setPanel(null);
    this.ctx.hud.instruct('Verificarea locomotivei', this.config.checkText);
    this.rows = this.config.checks.map(c => el('li', { class: 'check-row' }, [
      el('span', { class: 'check-box', 'aria-hidden': 'true' }),
      el('span', { class: 'check-label' }, [
        el('span', { 'aria-hidden': 'true' }, [c.icon]), ` ${c.label}`,
        el('small', { class: 'check-where' }, [c.where]),
      ]),
    ]));
    this.chip = el('div', { class: 'ticket-chip checklist' }, [
      el('span', { class: 'ticket-chip__label' }, ['Fișa de verificare']),
      el('ol', { class: 'check-list' }, this.rows),
    ]);
    document.body.append(this.chip);
    this.markRows();
    this.walkToCurrent();
    this.zoomOnLoco();
  }

  /**
   * The camera moves in on the locomotive and the first wagon, so that the
   * parts to check are seen (and touched) easily; the checklist stays on the
   * left, over the wagon's far end. Called every frame of the check.
   * @private
   */
  zoomOnLoco() {
    const w = this.ctx.world;
    const loco = w.train.cars[0];
    const wagon = w.train.cars.find(car => car.spec.kind === 'platform') ?? loco;
    const right = w.trainToStage({ x: loco.left + loco.spec.length, y: 0 }).x;
    const left = w.trainToStage({ x: wagon.left, y: 0 }).x;
    const rail = w.trainToStage({ x: 0, y: 0 }).y;
    // room above for the facts told at the top of the screen (they must not hide
    // the horn on the roof) and for the notes, below for Bubu, and on the left
    // for the checklist
    w.zoomOn({ left: left - 40, right: right + 220, top: rail - 440, bottom: rail + 110 });
  }

  /** @private Bubu walks to the part to find now and waits next to it. */
  walkToCurrent() {
    const check = this.config.checks[this.current];
    const [rx, , rw] = (check && this.partsOnStage()[check.part]?.[0]) ?? [this.bubuX, 0, 0];
    this.bubuTargetX = this.standBefore(rx + rw / 2);
  }

  /** @private Ticks the parts found and marks the one to find now. */
  markRows() {
    this.rows.forEach((row, i) => {
      row.classList.toggle('is-done', i < this.current);
      row.classList.toggle('is-current', i === this.current);
    });
  }

  /**
   * The parts of the locomotive on the stage, and the first wagon behind it
   * (the others may be hidden by the checklist, or beyond the screen).
   * @private
   * @returns {Partial<Record<CheckPart, Rect[]>>}
   */
  partsOnStage() {
    const w = this.ctx.world;
    /** @type {Partial<Record<CheckPart, Rect[]>>} */
    const out = {};
    const toStage = (/** @type {Rect} */ [x, y, rw, rh]) => {
      const p = w.trainToStage({ x, y });
      return /** @type {Rect} */ ([p.x, p.y, rw, rh]);
    };
    for (const [name, rects] of Object.entries(w.train.locoParts)) out[/** @type {LocoPart} */ (name)] = rects.map(toStage);
    const wagon = w.train.cars.find(car => car.spec.kind === 'platform');
    if (wagon) out.wagon = [toStage([wagon.left + 12, -100, wagon.spec.length - 24, 104])];
    return out;
  }

  /**
   * The part of the checklist under a point of the stage (or nearest to it,
   * within a finger's reach), if any.
   * @private
   * @param {number} x
   * @param {number} y
   * @returns {CheckPart | null}
   */
  partAt(x, y) {
    /** @type {CheckPart | null} */
    let best = null;
    let bestD = Infinity;
    // the room around the parts, from screen pixels to stage units (through the camera's zoom)
    const margin = Math.max(TOUCH_MARGIN, FINGER_MARGIN / (this.ctx.stage.scale * this.ctx.world.zoomTransform.k));
    // only the parts on the checklist (a tap near the sandbox finds the headlight next to it)
    const listed = new Set(this.config.checks.map(c => c.part));
    for (const [name, rects] of Object.entries(this.partsOnStage())) {
      if (!listed.has(/** @type {CheckPart} */ (name))) continue;
      for (const [rx, ry, rw, rh] of rects) {
        const dx = Math.max(rx - x, 0, x - (rx + rw));
        const dy = Math.max(ry - y, 0, y - (ry + rh));
        const d = Math.hypot(dx, dy);
        if (d <= margin && d < bestD) {
          best = /** @type {CheckPart} */ (name);
          bestD = d;
        }
      }
    }
    return best;
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    if (this.step !== 'check') return;
    const part = this.partAt(p.x, p.y);
    const check = this.config.checks[this.current];
    if (!part) {
      // a tap on the locomotive, but not on a part of the list
      if (!this.ctx.world.carAtStage(p.x, p.y)) return;
      this.wrong(`Caută ${check.label.toLowerCase()}: ${check.where}.`);
      return;
    }
    if (part === check.part) {
      this.found(check);
      return;
    }
    const other = this.config.checks.find(c => c.part === part);
    const done = other && this.config.checks.indexOf(other) < this.current;
    this.wrong(done
      ? `${other.label}: am verificat deja! Acum caută ${check.label.toLowerCase()}: ${check.where}.`
      : `Ai atins: ${other ? other.label.toLowerCase() : 'altceva'}. Pe fișă urmează ${check.label.toLowerCase()}: ${check.where}.`);
  }

  /**
   * @private
   * @param {string} text
   */
  wrong(text) {
    this.mistakes += 1;
    this.oops();
    this.ctx.hud.announce('Verificarea locomotivei', text, 'Misiune', 3);
  }

  /**
   * @private
   * @param {PartCheck} check
   */
  found(check) {
    const rects = this.partsOnStage()[check.part] ?? [];
    const [rx, ry, rw, rh] = rects[0] ?? [this.bubuX, TRACK_Y, 0, 0];
    this.particles.burst(rx + rw / 2, ry + rh / 2, SPARKS, 18, 220);
    // the horn really sounds; the other parts get a happy ding
    if (check.part === 'horn' && this.ctx.audio?.canPlay('whistle')) this.ctx.audio.play('whistle', 0.8);
    else this.sound('ding', rx + rw / 2);
    this.ctx.hud.announce(`✔ ${check.label}`, check.fact, 'Verificat', 4.5);
    this.current += 1;
    this.markRows();
    this.walkToCurrent();
    if (this.current >= this.config.checks.length) {
      this.step = 'hop';
      this.hopT = -1.6;   // a moment to read the last fact before the hop
      leave(this.chip);
      this.chip = null;
    }
  }

  // ------------------------------------------------------------ canvas

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    if (Number.isNaN(this.bubuX)) this.bubuX = this.bubuTargetX = this.standBefore(this.locoRear() - 60);
    if (this.step === 'check') {
      // the camera and Bubu follow the locomotive (it moves on screen if the
      // window changes size, e.g. in full screen)
      this.zoomOnLoco();
      this.walkToCurrent();
    }
    this.bubuX = approach(this.bubuX, this.bubuTargetX, 3, dt);
    if (this.step === 'hop') {
      this.hopT += dt;
      if (this.hopT >= HOP_TIME) {
        this.step = 'done';
        const train = this.ctx.world.train;
        train.setBubuVisible(true, true);
        const b = this.ctx.world.trainToStage(train.bubuPosition);
        this.particles.burst(b.x, b.y, SPARKS, 24, 260);
        this.sound('collect', b.x);
        this.doneAt = this.time;
      }
    }
    if (this.step === 'done' && this.time - this.doneAt > 0.9) {
      this.complete(starsForMistakes(this.mistakes, 4, 1), this.resultFor(this.mistakes));
    }
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    if (this.step === 'check' || this.step === 'hop' || this.step === 'done') this.drawChecks(c);
    const ground = TRACK_Y + 70 - this.ctx.world.cameraY;
    if (this.step === 'hop' && this.hopT > 0) {
      const k = easeInOut(clamp(this.hopT / HOP_TIME, 0, 1));
      const to = this.ctx.world.trainToStage(this.ctx.world.train.bubuPosition);
      const x = lerp(this.bubuX, to.x, k);
      const y = lerp(ground - BUBU_SIZE / 2, to.y, k) - Math.sin(Math.PI * k) * 170;
      drawBubu(c, x, y, lerp(BUBU_SIZE, 80, k), k * 6.28);
    } else if (this.step !== 'done') {
      // she walks (a little bounce) towards the part she checks, then waits
      const walking = Math.abs(this.bubuTargetX - this.bubuX) > 4;
      const bob = walking ? -Math.abs(Math.sin(this.time * 9)) * 9 : Math.sin(this.time * 3) * 4;
      drawBubu(c, this.bubuX, ground - BUBU_SIZE / 2 + bob, BUBU_SIZE, Math.sin(this.time * 2) * 0.06);
    }
    this.particles.draw(c);
  }

  /**
   * Green ticks on the parts already checked, and on the part to find a glow
   * with a note pointing at it ("Verifică farurile").
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  drawChecks(c) {
    const parts = this.partsOnStage();
    this.config.checks.forEach((check, i) => {
      const rects = parts[check.part] ?? [];
      if (i < this.current) {
        for (const [x, y, w] of rects.slice(0, 1)) drawTick(c, x + w / 2, y - 14);
      } else if (i === this.current && this.step === 'check') {
        const pulse = 0.5 + 0.5 * Math.sin(this.time * 5);
        c.save();
        c.strokeStyle = `rgba(255,214,90,${0.55 + 0.45 * pulse})`;
        c.lineWidth = 5;
        for (const [x, y, w, h] of rects) {
          c.beginPath();
          roundRectPath(c, x - 8 - pulse * 4, y - 8 - pulse * 4, w + 16 + pulse * 8, h + 16 + pulse * 8, 12);
          c.stroke();
        }
        c.restore();
        // the note above the (first) glowing spot, or under it when a card at the
        // top of the screen covers the room above (the horn, on the roof)
        const [x, y, w, h] = rects[0] ?? [0, 0, 0, 0];
        if (!rects.length) return;
        if (this.underCard(y - 14 - NOTE_HEIGHT * this.ctx.stage.ui)) {
          drawTouchNote(c, this.ctx.stage, x + w / 2, y + h + 14 + pulse * 6, check.hint, true);
        } else {
          drawTouchNote(c, this.ctx.stage, x + w / 2, y - 14 - pulse * 6, check.hint);
        }
      }
    });
  }

  /**
   * Is a height of the stage (as drawn, through the camera's zoom) hidden by
   * the card at the top of the screen?
   * @private
   * @param {number} y
   */
  underCard(y) {
    const bottom = this.ctx.hud.cardBottom;
    if (!bottom) return false;
    const { k, oy } = this.ctx.world.zoomTransform;
    return y * k + oy < this.ctx.stage.toStage(0, bottom).y + 10;
  }

  /** @private Stage x of the back of the locomotive. */
  locoRear() {
    const train = this.ctx.world.train;
    return this.ctx.world.trainToStage({ x: train.cars[0].left, y: 0 }).x;
  }

  /**
   * Where Bubu stands to look at something at stage x: in front of it, a
   * little to the left, and always on screen.
   * @private
   * @param {number} x
   */
  standBefore(x) {
    const stage = this.ctx.stage;
    return clamp(x - 95, stage.viewLeft + 70, stage.viewRight - 70);
  }

  // ------------------------------------------------------------ helpers

  /**
   * @private
   * @param {HTMLElement | null} node
   */
  setPanel(node) {
    showPanel(this.ctx.panel, node);
  }

  /** @private @param {number} mistakes */
  resultFor(mistakes) {
    const name = this.ctx.state.travelerName;
    if (mistakes <= 1) return `Perfect, ${name}! Locomotiva e verificată, iar Bubu e la post. Pornim spre Vișeu!`;
    if (mistakes <= 4) return `Bravo, ${name}! Totul e în regulă. Pornim spre Vișeu!`;
    return `Gata, ${name}! Cu puțin ajutor, locomotiva e verificată. Pornim!`;
  }

  dispose() {
    this.setPanel(null);
    this.ctx.world.zoomOn(null);
    leave(this.chip);
    this.ctx.hud.hideAnnouncement();
  }
}

/**
 * @param {string} label
 * @param {string} value
 */
function field(label, value) {
  return el('div', {}, [el('dt', {}, [label]), el('dd', {}, [value])]);
}

/**
 * A green tick in a white circle (a part checked).
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 */
function drawTick(c, x, y) {
  c.fillStyle = '#ffffff';
  fillCircle(c, x, y, 15);
  c.fillStyle = '#2e9d57';
  fillCircle(c, x, y, 12);
  c.strokeStyle = '#ffffff';
  c.lineWidth = 4;
  c.lineCap = 'round';
  c.lineJoin = 'round';
  c.beginPath();
  c.moveTo(x - 6, y);
  c.lineTo(x - 1, y + 5);
  c.lineTo(x + 7, y - 5);
  c.stroke();
}
