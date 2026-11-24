/**
 * @file Station mission "wood for the locomotive": by the woodshed of a
 * forest railway station lies a heap of wood, and Bubu fills the wood box
 * of the steam locomotive with it.
 *
 * Only dry wood is good for the fire. The heap also holds a wet log (it
 * drips), a rotten one (with mushrooms), thin twigs (they burn out at once)
 * and a lump of snow: each is a gentle mistake, explained in a few words.
 * The wood box fills with every good log, until it is full.
 *
 * Configuration (besides id/title/text):
 *   items   [{icon, label, good, why?}] — the heap (shown shuffled)
 *   need    how many good logs fill the box
 *   fact    shown at the end
 */

import { el } from '../ui/dom.js';
import { showPanel } from '../ui/panel.js';
import { Mission, starsForMistakes } from './mission.js';

/**
 * @typedef {{icon: string, label: string, good: boolean, why?: string}} WoodItem
 * @typedef {import('./mission.js').MissionConfig & {items: WoodItem[], need: number, fact: string}} FirewoodConfig
 */

export class FirewoodMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {FirewoodConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    this.loaded = 0;
    this.mistakes = 0;
    this.time = 0;
    this.doneAt = -1;
    /** @type {Record<string, HTMLElement>} */
    this.ui = {};
  }

  start() {
    this.phase = 'running';
    const items = this.config.items.slice().sort(() => Math.random() - 0.5);
    const heap = el('div', { class: 'luggage-items wood-heap' }, items.map(item => {
      const b = /** @type {HTMLButtonElement} */ (el('button', { class: 'luggage-item', type: 'button' }, [
        el('span', { class: 'luggage-icon', 'aria-hidden': 'true' }, [item.icon]), el('span', {}, [item.label]),
      ]));
      b.addEventListener('click', () => this.take(item, b));
      return b;
    }));
    const box = el('div', { class: 'wood-box', 'aria-hidden': 'true' },
      Array.from({ length: this.config.need }, () => el('span', { class: 'wood-box__slot' })));
    const reply = el('span', {}, ['Care lemne sunt bune pentru foc?']);
    const count = el('p', { class: 'wood-count' }, [`Lada de lemne: 0 / ${this.config.need}`]);
    this.ui = { box, reply, count, heap };
    showPanel(this.ctx.panel, el('div', { class: 'panel panel--wide wood-panel' }, [
      el('p', { class: 'panel-kicker' }, ['Misiune']),
      el('h2', { class: 'panel-title' }, [this.config.title]),
      el('p', { class: 'panel-text' }, [this.config.text]),
      el('div', { class: 'wood-box-row' }, [box, count]),
      heap,
      el('p', { class: 'bubu-says' }, [el('img', { src: '../shared/assets/bubu.webp', alt: '', width: '56', height: '56' }), reply]),
    ]));
  }

  /**
   * @private
   * @param {WoodItem} item
   * @param {HTMLButtonElement} button
   */
  take(item, button) {
    if (this.doneAt >= 0 || button.classList.contains('is-packed')) return;
    if (!item.good) {
      this.mistakes += 1;
      this.oops();
      button.classList.remove('is-wrong');
      void button.offsetWidth;   // restart the shake
      button.classList.add('is-wrong');
      this.ui.reply.textContent = item.why ?? 'Asta nu e bună pentru foc.';
      return;
    }
    button.classList.add('is-packed');
    button.disabled = true;
    this.sound('thud');
    this.ui.box.children[this.loaded]?.classList.add('is-full');
    this.loaded += 1;
    this.ui.count.textContent = `Lada de lemne: ${this.loaded} / ${this.config.need}`;
    this.ui.reply.textContent = this.loaded < this.config.need ? 'Bun! Lemnul uscat arde frumos.' : 'Lada e plină!';
    if (this.loaded >= this.config.need) this.showEnd();
  }

  /** @private The box is full: the fact, and back to the train. */
  showEnd() {
    const go = el('button', { class: 'big-btn', type: 'button' }, ['Gata, la drum! 🚂']);
    go.addEventListener('click', () => {
      showPanel(this.ctx.panel, null);
      this.doneAt = this.time;
    });
    this.ui.heap.replaceWith(el('p', { class: 'fact' }, [el('b', {}, ['Știai că? ']), this.config.fact]), go);
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    if (this.doneAt >= 0 && this.time - this.doneAt > 0.6) {
      this.complete(starsForMistakes(this.mistakes, 2, 0), this.mistakes === 0
        ? 'Perfect! Numai lemne uscate, cum îi place locomotivei.'
        : 'Bravo! Locomotiva are lemne pentru tot drumul.');
    }
  }

  dispose() {
    showPanel(this.ctx.panel, null);
  }
}
