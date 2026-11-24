/**
 * @file Station mission "the children's list": at the end of the journey
 * the children of the winter camp come to the train, one at a time, each
 * saying what they need, like a little riddle ("Ne e sete după joacă!").
 * The child gives them the right thing from the wagons.
 *
 * The goods are buttons grouped by wagon, as they travelled; a wrong one is a
 * gentle mistake with a hint, and after a mistake (or a few seconds) the
 * right one pulses. At the end the children see the sealed crate and
 * invite Bubu to stay for New Year's Eve (the crate is not opened: that is
 * for the next journey).
 *
 * Configuration (besides id/title/text):
 *   wagons     [{label, goods: [{id, icon, label}]}] — what each wagon brought
 *   children   [{emoji, says, wants, hint}] — in order; `wants` is a good's id
 *   gift       {needs, emoji, says, wants} — asked for only when the flag `needs` is set
 *   endText    what is said at the end (the crate and the invitation)
 *   endButton  the label of the last button
 */

import { el } from '../ui/dom.js';
import { showPanel } from '../ui/panel.js';
import { Mission, starsForMistakes } from './mission.js';

/**
 * @typedef {{id: string, icon: string, label: string}} Good
 * @typedef {{emoji: string, says: string, wants: string, hint: string}} Child
 * @typedef {import('./mission.js').MissionConfig & {
 *   wagons: Array<{label: string, goods: Good[]}>, children: Child[],
 *   gift?: Child & {needs: string, good: Good}, endText: string, endButton: string,
 * }} WishlistConfig
 */

/** Seconds without a choice before the right good pulses. */
const HINT_AFTER = 6;

export class WishlistMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {WishlistConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    const gift = config.gift && ctx.state.flags.has(config.gift.needs) ? config.gift : null;
    /** @type {Child[]} */
    this.children = gift ? [...config.children, gift] : config.children.slice();
    this.current = 0;
    this.mistakes = 0;
    this.wrongHere = 0;
    this.time = 0;
    this.idleSince = 0;
    this.doneAt = -1;
    /** True while a child thanks Bubu and the next one comes (choices wait). */
    this.busy = false;
    /** @type {Map<string, HTMLButtonElement>} */
    this.buttons = new Map();
    /** @type {Record<string, HTMLElement>} */
    this.ui = {};
  }

  start() {
    this.phase = 'running';
    const gift = this.children.find(c => c === this.config.gift);
    const groups = [...this.config.wagons, ...(gift ? [{ label: 'Din cabina lui Bubu', goods: [/** @type {any} */ (gift).good] }] : [])];
    const wagons = groups.map(w => el('div', { class: 'wish-wagon' }, [
      el('p', { class: 'wish-wagon__label' }, [w.label]),
      el('div', { class: 'wish-goods' }, w.goods.map(g => {
        const b = /** @type {HTMLButtonElement} */ (el('button', { class: 'luggage-item', type: 'button' }, [
          el('span', { class: 'luggage-icon', 'aria-hidden': 'true' }, [g.icon]), el('span', {}, [g.label]),
        ]));
        b.addEventListener('click', () => this.give(g, b));
        this.buttons.set(g.id, b);
        return b;
      })),
    ]));
    const face = el('span', { class: 'wish-child', 'aria-hidden': 'true' });
    const says = el('p', { class: 'wish-says' });
    const reply = el('span', {}, ['Ce îi dăm?']);
    const count = el('span', { class: 'wish-count' });
    this.ui = { face, says, reply, count };
    showPanel(this.ctx.panel, el('div', { class: 'panel panel--wide wish-panel' }, [
      el('p', { class: 'panel-kicker' }, ['Misiune']),
      el('h2', { class: 'panel-title' }, [this.config.title]),
      el('p', { class: 'panel-text' }, [this.config.text]),
      el('div', { class: 'wish-bubble' }, [face, says, count]),
      el('div', { class: 'wish-wagons' }, wagons),
      el('p', { class: 'bubu-says' }, [el('img', { src: '../shared/assets/bubu.webp', alt: '', width: '56', height: '56' }), reply]),
    ]));
    this.showChild();
  }

  /** @private The next child comes and says what they need. */
  showChild() {
    const c = this.children[this.current];
    this.ui.face.textContent = c.emoji;
    this.ui.says.textContent = `„${c.says}”`;
    this.ui.count.textContent = `${this.current + 1} / ${this.children.length}`;
    this.ui.reply.textContent = 'Ce îi dăm?';
    this.wrongHere = 0;
    this.idleSince = this.time;
  }

  /**
   * @private
   * @param {Good} good
   * @param {HTMLButtonElement} button
   */
  give(good, button) {
    if (this.busy || this.doneAt >= 0 || this.current >= this.children.length) return;
    this.idleSince = this.time;
    const c = this.children[this.current];
    if (good.id !== c.wants) {
      this.mistakes += 1;
      this.wrongHere += 1;
      this.oops();
      button.classList.remove('is-wrong');
      void button.offsetWidth;   // restart the shake animation
      button.classList.add('is-wrong');
      this.ui.reply.textContent = c.hint;
      return;
    }
    this.sound('collect');
    this.ui.reply.textContent = `${good.icon} Mulțumesc, Bubu!`;
    this.buttons.get(c.wants)?.classList.remove('is-hint');
    this.current += 1;
    this.busy = true;
    setTimeout(() => {
      this.busy = false;
      if (this.phase === 'finished') return;
      if (this.current < this.children.length) this.showChild();
      else this.showEnd();
    }, 900);
  }

  /** @private The crate, and the invitation for New Year's Eve. */
  showEnd() {
    this.ui.face.textContent = '🎁';
    this.ui.says.textContent = this.config.endText;
    this.ui.count.textContent = '';
    this.ui.reply.textContent = 'Ce-o fi în ladă?';
    const stay = el('button', { class: 'big-btn', type: 'button' }, [this.config.endButton]);
    stay.addEventListener('click', () => {
      showPanel(this.ctx.panel, null);
      this.sound('collect');
      this.doneAt = this.time;
    });
    this.ctx.panel.querySelector('.wish-wagons')?.replaceWith(stay);
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    const c = this.children[this.current];
    if (c && this.doneAt < 0) {
      const hint = this.wrongHere > 0 || this.time - this.idleSince > HINT_AFTER;
      this.buttons.get(c.wants)?.classList.toggle('is-hint', hint);
    }
    if (this.doneAt >= 0 && this.time - this.doneAt > 0.8) {
      this.complete(starsForMistakes(this.mistakes, 2, 0), this.mistakes === 0
        ? 'Perfect! Fiecare copil a primit exact ce îi trebuia.'
        : 'Bravo! Copiii din tabără au tot ce le trebuie.');
    }
  }

  dispose() {
    showPanel(this.ctx.panel, null);
  }
}
