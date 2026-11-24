/**
 * @file Station mission "the wagon's scales": stacks of mineral water packs
 * are loaded on a flat wagon, on its left or right side, so that it stays
 * level (the needle of the scales in the middle). A loaded wagon leaning to
 * one side could tip over in the curves.
 *
 * The stacks come one at a time, with the number of packs written on them.
 * Putting one on the heavier side while the wagon already leans is a gentle
 * mistake (the stack stays where it was, and the reason is explained); after
 * a mistake, or a few seconds of waiting, the right button pulses. Taken in
 * the order of the configuration (heaviest first), the stacks always end up
 * balanced.
 *
 * At the end a sealed crate arrives for the children, "not to be opened
 * before 31 December", and goes in the middle of the wagon; the mission sets
 * a flag and the game draws the load on the wagon (gfx/cargo.js).
 *
 * Configuration (besides id/title/text):
 *   stacks     packs in every stack, in the order they come
 *   flag       set when the wagon is loaded
 *   crateText  what is said about the sealed crate
 *   fact       shown at the end
 */

import { el } from '../ui/dom.js';
import { showPanel } from '../ui/panel.js';
import { Mission, starsForMistakes } from './mission.js';

/**
 * @typedef {import('./mission.js').MissionConfig & {
 *   stacks: number[], flag: string, crateText: string, fact: string,
 * }} BalanceConfig
 */

/** Seconds without a choice before the right button pulses. */
const HINT_AFTER = 5;
/** Degrees the needle turns for every pack of difference (and at most). */
const DEG_PER_PACK = 9;
const MAX_DEG = 40;

export class BalanceMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {BalanceConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    this.mistakes = 0;
    this.next = 0;
    /** Packs on each side. */
    this.left = 0;
    this.right = 0;
    this.time = 0;
    this.idleSince = 0;
    /** @type {'load' | 'crate' | 'done'} */
    this.step = 'load';
    this.doneAt = 0;
    /** @type {Record<string, HTMLElement>} */
    this.ui = {};
  }

  start() {
    this.phase = 'running';
    const stackEl = el('div', { class: 'balance-stack' });
    const leftEl = el('div', { class: 'balance-side' });
    const rightEl = el('div', { class: 'balance-side' });
    const needle = el('div', { class: 'balance-needle' });
    const says = el('span', {}, ['Unde punem baxurile? Acul cântarului trebuie să rămână la mijloc.']);
    const toLeft = el('button', { class: 'big-btn balance-btn', type: 'button' }, ['⬅ Stânga']);
    const toRight = el('button', { class: 'big-btn balance-btn', type: 'button' }, ['Dreapta ➡']);
    toLeft.addEventListener('click', () => this.put('left'));
    toRight.addEventListener('click', () => this.put('right'));
    this.ui = { stackEl, leftEl, rightEl, needle, says, toLeft, toRight };
    showPanel(this.ctx.panel, el('div', { class: 'panel panel--wide balance-panel' }, [
      el('p', { class: 'panel-kicker' }, ['Misiune']),
      el('h2', { class: 'panel-title' }, [this.config.title]),
      el('p', { class: 'panel-text' }, [this.config.text]),
      el('div', { class: 'balance-dial', 'aria-hidden': 'true' }, [el('div', { class: 'balance-mark' }), needle]),
      el('div', { class: 'balance-wagon' }, [leftEl, el('div', { class: 'balance-middle' }), rightEl]),
      el('div', { class: 'balance-controls' }, [toLeft, stackEl, toRight]),
      el('p', { class: 'bubu-says' }, [el('img', { src: '../shared/assets/bubu.webp', alt: '', width: '56', height: '56' }), says]),
    ]));
    this.refresh();
  }

  /**
   * @private
   * @param {'left' | 'right'} side
   */
  put(side) {
    if (this.step !== 'load') return;
    this.idleSince = this.time;
    const n = this.config.stacks[this.next];
    const heavier = this.left === this.right ? null : this.left > this.right ? 'left' : 'right';
    if (side === heavier) {
      this.mistakes += 1;
      this.oops();
      this.ui.says.textContent = `Vagonul se înclină deja spre ${side === 'left' ? 'stânga' : 'dreapta'}! Pune baxurile pe partea mai ușoară.`;
      return;
    }
    if (side === 'left') this.left += n;
    else this.right += n;
    this.next += 1;
    this.sound('thud');
    const diff = Math.abs(this.left - this.right);
    this.ui.says.textContent = diff === 0 ? 'Perfect, acul e la mijloc!' : `Stânga: ${this.left} baxuri, dreapta: ${this.right}. Echilibrăm!`;
    this.refresh();
    if (this.next >= this.config.stacks.length) this.crate();
  }

  /** @private Shows the wagon, the needle and the next stack. */
  refresh() {
    const { stackEl, leftEl, rightEl, needle } = this.ui;
    const packs = (/** @type {number} */ n) => Array.from({ length: n }, () => el('span', { class: 'balance-pack' }));
    leftEl.replaceChildren(...packs(this.left));
    rightEl.replaceChildren(...packs(this.right));
    const n = this.config.stacks[this.next];
    stackEl.replaceChildren(...(n ? [el('div', { class: 'balance-packs' }, packs(n)), el('b', {}, [`${n} ${n === 1 ? 'bax' : 'baxuri'}`])] : []));
    const deg = Math.max(-MAX_DEG, Math.min(MAX_DEG, (this.right - this.left) * DEG_PER_PACK));
    needle.style.transform = `rotate(${deg}deg)`;
    needle.classList.toggle('is-level', this.left === this.right);
  }

  /** @private The wagon is level: the sealed crate arrives. */
  crate() {
    this.step = 'crate';
    this.ui.toLeft.hidden = true;
    this.ui.toRight.hidden = true;
    this.ui.says.textContent = this.config.crateText;
    const go = el('button', { class: 'big-btn', type: 'button' }, ['Urcăm lada în tren! ▶']);
    go.addEventListener('click', () => {
      showPanel(this.ctx.panel, null);
      this.ctx.state.setFlag(this.config.flag);
      this.ctx.hud.announce('Vagonul e încărcat!', this.config.fact, 'Misiune', 4);
      this.sound('collect');
      this.step = 'done';
      this.doneAt = this.time;
    });
    this.ui.stackEl.replaceChildren(el('span', { class: 'balance-crate', 'aria-hidden': 'true' }, ['?']), go);
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    if (this.step === 'load') {
      const hint = this.mistakes > 0 || this.time - this.idleSince > HINT_AFTER;
      const lighter = this.left === this.right ? null : this.left < this.right ? this.ui.toLeft : this.ui.toRight;
      this.ui.toLeft?.classList.toggle('is-hint', hint && lighter === this.ui.toLeft);
      this.ui.toRight?.classList.toggle('is-hint', hint && lighter === this.ui.toRight);
    }
    if (this.step === 'done' && this.time - this.doneAt > 2) {
      this.complete(starsForMistakes(this.mistakes, 2, 0), this.mistakes === 0
        ? 'Perfect! Vagonul stă drept, iar lada misterioasă e în tren.'
        : 'Bravo! Vagonul e echilibrat, iar lada misterioasă e în tren.');
    }
  }

  dispose() {
    showPanel(this.ctx.panel, null);
  }
}
