/**
 * @file Station mission "logs that fit": a flat wagon 12 m long is loaded
 * with logs of different lengths, so that they fill it exactly: no empty
 * place, and nothing sticking out (a little sum for 5th graders).
 *
 * The logs are buttons with their length; a log put on the wagon fills its
 * part of a ruler drawn in metres, and a tap on it takes it off again (so a
 * wrong start can always be mended, without a mistake). A log too long for
 * the room left is a gentle mistake. There are no hints (no metres left
 * counted, no warning that the wagon can no longer be filled): the ruler
 * makes the sum plain enough.
 *
 * When the wagon is full, the mission sets a flag; the game then draws the
 * logs on the wagon for the rest of the journey (gfx/cargo.js).
 *
 * Configuration (besides id/title/text):
 *   length   of the wagon, in metres
 *   logs     lengths of the logs waiting, in metres
 *   flag     set when the wagon is full
 *   fact     shown at the end
 */

import { el } from '../ui/dom.js';
import { showPanel } from '../ui/panel.js';
import { Mission, starsForMistakes } from './mission.js';

/**
 * @typedef {import('./mission.js').MissionConfig & {length: number, logs: number[], flag: string, fact: string}} LogsConfig
 */

/** Seconds the full wagon's sum stays in the panel before the fact is told. */
const SUM_SECONDS = 1.6;
/** Colours of the logs on the ruler, one after the other. */
const WOOD = ['#9c6a3a', '#b07a45', '#8d5a2b', '#a8743f', '#7d4f25'];

export class LogsMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {LogsConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    this.mistakes = 0;
    /** @type {number[]} indexes of the logs on the wagon, in order */
    this.placed = [];
    this.time = 0;
    this.doneAt = -1;
    /** The fact has been told (after the wagon is full). */
    this.told = false;
    /** @type {HTMLButtonElement[]} */
    this.buttons = [];
    /** @type {Record<string, HTMLElement>} */
    this.ui = {};
  }

  start() {
    this.phase = 'running';
    const ruler = el('div', { class: 'logs-ruler' });
    const ticks = el('div', { class: 'logs-ticks', 'aria-hidden': 'true' },
      Array.from({ length: this.config.length + 1 }, (_, m) => el('span', {}, [String(m)])));
    const says = el('span', {}, [`Vagonul are ${this.config.length} m. Alege buștenii care îl umplu exact!`]);
    this.buttons = this.config.logs.map((len, i) => {
      const b = /** @type {HTMLButtonElement} */ (el('button', { class: 'luggage-item logs-log', type: 'button', style: `--len:${len}` }, [
        el('span', { class: 'logs-wood', 'aria-hidden': 'true' }), el('span', {}, [`${len} m`]),
      ]));
      b.addEventListener('click', () => this.add(i));
      return b;
    });
    this.ui = { ruler, says };
    showPanel(this.ctx.panel, el('div', { class: 'panel panel--wide logs-panel' }, [
      el('p', { class: 'panel-kicker' }, ['Misiune']),
      el('h2', { class: 'panel-title' }, [this.config.title]),
      el('p', { class: 'panel-text' }, [this.config.text]),
      el('div', { class: 'logs-wagon' }, [ruler, ticks]),
      el('div', { class: 'logs-pile' }, this.buttons),
      el('p', { class: 'bubu-says' }, [el('img', { src: '../shared/assets/bubu.webp', alt: '', width: '56', height: '56' }), says]),
    ]));
    this.refresh();
  }

  /** Metres already filled. */
  get filled() {
    return this.placed.reduce((sum, i) => sum + this.config.logs[i], 0);
  }

  /**
   * @private
   * @param {number} i
   */
  add(i) {
    if (this.doneAt >= 0 || this.placed.includes(i)) return;
    const room = this.config.length - this.filled;
    const len = this.config.logs[i];
    if (len > room) {
      this.mistakes += 1;
      this.oops();
      this.buttons[i].classList.remove('is-wrong');
      void this.buttons[i].offsetWidth;   // restart the shake animation
      this.buttons[i].classList.add('is-wrong');
      this.ui.says.textContent = `Bușteanul de ${len} m nu mai încape pe vagon.`;
      return;
    }
    this.placed.push(i);
    this.sound('thud');
    const left = this.config.length - this.filled;
    if (left === 0) {
      this.ui.says.textContent = `${this.placed.map(k => this.config.logs[k]).join(' + ')} = ${this.config.length} m. Vagonul e plin!`;
      this.finishWagon();
    } else {
      this.ui.says.textContent = `Am pus bușteanul de ${len} m.`;
    }
    this.refresh();
  }

  /**
   * @private
   * @param {number} k  position on the wagon
   */
  remove(k) {
    if (this.doneAt >= 0) return;
    this.placed.splice(k, 1);
    this.ui.says.textContent = 'Am dat jos bușteanul.';
    this.refresh();
  }

  /** @private Draws the logs on the ruler and greys out those used. */
  refresh() {
    const L = this.config.length;
    this.ui.ruler.replaceChildren(...this.placed.map((i, k) => {
      const seg = el('button', {
        class: 'logs-segment', type: 'button', title: 'Dă jos bușteanul',
        style: `width:${(100 * this.config.logs[i]) / L}%;background:${WOOD[k % WOOD.length]}`,
      }, [`${this.config.logs[i]} m`]);
      seg.addEventListener('click', () => this.remove(k));
      return seg;
    }));
    this.buttons.forEach((b, i) => {
      const used = this.placed.includes(i);
      b.disabled = used;
      b.classList.toggle('is-packed', used);
    });
  }

  /** @private The wagon is full. */
  finishWagon() {
    this.doneAt = this.time;
    this.ctx.state.setFlag(this.config.flag);
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    // a moment to see the sum, then the panel closes (the logs are seen on the
    // wagon) and the fact is told on its own, never over the panel
    if (this.doneAt >= 0 && !this.told && this.time - this.doneAt > SUM_SECONDS) {
      this.told = true;
      showPanel(this.ctx.panel, null);
      this.ctx.hud.announce('Vagonul e plin!', this.config.fact, 'Misiune', 4);
    }
    if (this.doneAt >= 0 && this.time - this.doneAt > SUM_SECONDS + 2.6) {
      this.complete(starsForMistakes(this.mistakes, 2, 0), this.mistakes === 0
        ? 'Perfect! Buștenii umplu vagonul exact, fără niciun loc gol.'
        : 'Bravo! Vagonul cu lemne de foc e plin.');
    }
  }

  dispose() {
    showPanel(this.ctx.panel, null);
  }
}
