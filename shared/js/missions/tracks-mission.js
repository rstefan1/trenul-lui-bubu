/**
 * @file Station mission "tracks in the snow": by a station in the mountain
 * forest, fresh snow shows the tracks of wild animals, and the child finds
 * which animal left each one (a bear, a red deer, a fox, a hare…).
 *
 * The tracks are drawn after their real shapes: the wide pad and five toes
 * of the bear, the split hoof of the deer, the "Y" of the hare (its long
 * hind feet land in front of the front ones), the straight line of the fox.
 * One track at a time; the animals are buttons, with one more than the
 * tracks (the boar). A wrong animal is a gentle mistake with a hint about
 * the shape; after a mistake, or a few seconds, the right one pulses.
 *
 * Configuration (besides id/title/text):
 *   animals   [{id, icon, label}] — the buttons
 *   tracks    [{animal, hint, fact}] — in order; animal: bear | deer | fox | hare | boar
 */

import { el } from '../ui/dom.js';
import { showPanel } from '../ui/panel.js';
import { Mission, starsForMistakes } from './mission.js';

/**
 * @typedef {'bear' | 'deer' | 'fox' | 'hare' | 'boar'} TrackKind
 * @typedef {{id: TrackKind, icon: string, label: string}} AnimalButton
 * @typedef {{animal: TrackKind, hint: string, fact: string}} TrackSpec
 * @typedef {import('./mission.js').MissionConfig & {animals: AnimalButton[], tracks: TrackSpec[]}} TracksConfig
 */

/** Seconds without a choice before the right animal pulses. */
const HINT_AFTER = 6;
/** Seconds the fact about an animal stays before the next track (time to read it). */
const FACT_SECONDS = 4;

/** One footprint of each animal, as SVG (fixed markup only), drawn round (0, 0) pointing up. */
const PRINTS = {
  bear: '<path d="M-22 6 Q-24 -10 0 -12 Q24 -10 22 6 Q20 22 0 22 Q-20 22 -22 6Z"/>'
    + '<ellipse cx="-22" cy="-22" rx="6" ry="8"/><ellipse cx="-10" cy="-28" rx="6" ry="8"/><ellipse cx="3" cy="-30" rx="6" ry="8"/>'
    + '<ellipse cx="15" cy="-27" rx="6" ry="8"/><ellipse cx="25" cy="-19" rx="5" ry="7"/>',
  deer: '<path d="M-3 16 Q-14 14 -14 -2 Q-12 -16 -4 -20 Q-2 -4 -3 16Z"/><path d="M3 16 Q14 14 14 -2 Q12 -16 4 -20 Q2 -4 3 16Z"/>',
  boar: '<path d="M-3 12 Q-16 10 -15 -4 Q-12 -14 -4 -16 Q-2 -4 -3 12Z"/><path d="M3 12 Q16 10 15 -4 Q12 -14 4 -16 Q2 -4 3 12Z"/>'
    + '<circle cx="-15" cy="20" r="4"/><circle cx="15" cy="20" r="4"/>',
  fox: '<ellipse cx="0" cy="6" rx="8" ry="7"/><ellipse cx="-8" cy="-7" rx="4" ry="5"/><ellipse cx="8" cy="-7" rx="4" ry="5"/>'
    + '<ellipse cx="-3" cy="-14" rx="3.5" ry="5"/><ellipse cx="3" cy="-14" rx="3.5" ry="5"/>',
  hare: '<ellipse cx="0" cy="0" rx="7" ry="16"/>',
  hareFront: '<circle cx="0" cy="0" r="7"/>',
};

/**
 * The trail of an animal in the snow, as SVG (fixed markup only).
 * @param {TrackKind} kind
 */
function trailSvg(kind) {
  const print = (/** @type {string} */ shape, /** @type {number} */ x, /** @type {number} */ y, /** @type {number} */ s = 1) =>
    `<g transform="translate(${x} ${y}) scale(${s})" fill="#6f87ad">${shape}</g>`;
  let marks = '';
  if (kind === 'bear') marks = print(PRINTS.bear, 90, 150, 1.2) + print(PRINTS.bear, 150, 70, 1.2);
  else if (kind === 'deer' || kind === 'boar') {
    const shape = PRINTS[kind];
    marks = print(shape, 80, 165) + print(shape, 120, 110) + print(shape, 160, 55);
  } else if (kind === 'fox') {
    // the fox walks in a straight line, one print in front of the other
    marks = print(PRINTS.fox, 120, 170) + print(PRINTS.fox, 120, 115) + print(PRINTS.fox, 120, 60);
  } else {
    // the hare: two small front prints one behind the other, the long hind ones side by side in front
    marks = print(PRINTS.hareFront, 120, 175) + print(PRINTS.hareFront, 120, 145) + print(PRINTS.hare, 100, 95) + print(PRINTS.hare, 140, 95)
      + print(PRINTS.hareFront, 120, 60) + print(PRINTS.hareFront, 120, 34);
  }
  return `<svg viewBox="0 0 240 200" aria-hidden="true" focusable="false">`
    + `<rect width="240" height="200" rx="16" fill="#f4f8ff"/>`
    + `<path d="M0 30 Q60 18 120 30 T240 26" fill="none" stroke="#dfe8f7" stroke-width="10"/>`
    + `<path d="M0 182 Q70 170 130 184 T240 176" fill="none" stroke="#dfe8f7" stroke-width="10"/>`
    + marks + `</svg>`;
}

export class TracksMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {TracksConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    this.current = 0;
    this.mistakes = 0;
    this.wrongHere = 0;
    this.time = 0;
    this.idleSince = 0;
    this.busy = false;
    this.doneAt = -1;
    /** @type {Map<string, HTMLButtonElement>} */
    this.buttons = new Map();
    /** @type {Record<string, HTMLElement>} */
    this.ui = {};
  }

  start() {
    this.phase = 'running';
    const snow = el('figure', { class: 'tracks-snow' });
    const says = el('span', {}, ['Ce animal a lăsat aceste urme?']);
    const count = el('span', { class: 'wish-count' });
    const buttons = this.config.animals.map(a => {
      const b = /** @type {HTMLButtonElement} */ (el('button', { class: 'luggage-item', type: 'button' }, [
        el('span', { class: 'luggage-icon', 'aria-hidden': 'true' }, [a.icon]), el('span', {}, [a.label]),
      ]));
      b.addEventListener('click', () => this.choose(a, b));
      this.buttons.set(a.id, b);
      return b;
    });
    this.ui = { snow, says, count };
    showPanel(this.ctx.panel, el('div', { class: 'panel panel--wide tracks-panel' }, [
      el('p', { class: 'panel-kicker' }, ['Misiune']),
      el('h2', { class: 'panel-title' }, [this.config.title]),
      el('p', { class: 'panel-text' }, [this.config.text]),
      el('div', { class: 'tracks-row' }, [snow, count]),
      el('div', { class: 'luggage-items tracks-animals' }, buttons),
      el('p', { class: 'bubu-says' }, [el('img', { src: '../shared/assets/bubu.webp', alt: '', width: '56', height: '56' }), says]),
    ]));
    this.showTrack();
  }

  /** @private The next trail in the snow. */
  showTrack() {
    const t = this.config.tracks[this.current];
    // fixed markup only (see trailSvg)
    this.ui.snow.innerHTML = trailSvg(t.animal);
    this.ui.count.textContent = `Urma ${this.current + 1} din ${this.config.tracks.length}`;
    this.ui.says.textContent = 'Ce animal a lăsat aceste urme?';
    this.wrongHere = 0;
    this.idleSince = this.time;
  }

  /**
   * @private
   * @param {AnimalButton} a
   * @param {HTMLButtonElement} button
   */
  choose(a, button) {
    if (this.busy || this.doneAt >= 0) return;
    this.idleSince = this.time;
    const t = this.config.tracks[this.current];
    if (a.id !== t.animal) {
      this.mistakes += 1;
      this.wrongHere += 1;
      this.oops();
      button.classList.remove('is-wrong');
      void button.offsetWidth;   // restart the shake animation
      button.classList.add('is-wrong');
      this.ui.says.textContent = t.hint;
      return;
    }
    this.sound('collect');
    this.buttons.get(t.animal)?.classList.remove('is-hint');
    // the fact is told by Bubu, inside the panel (a card above would be hidden by it)
    this.ui.says.textContent = `Da! Sunt urme de ${a.label.toLowerCase()}. ${t.fact}`;
    this.current += 1;
    this.busy = true;
    setTimeout(() => {
      this.busy = false;
      if (this.phase === 'finished') return;
      if (this.current < this.config.tracks.length) this.showTrack();
      else {
        showPanel(this.ctx.panel, null);
        this.doneAt = this.time;
      }
    }, FACT_SECONDS * 1000);
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    const t = this.config.tracks[this.current];
    if (t && this.doneAt < 0) {
      const hint = this.wrongHere > 0 || this.time - this.idleSince > HINT_AFTER;
      this.buttons.get(t.animal)?.classList.toggle('is-hint', hint);
    }
    if (this.doneAt >= 0 && this.time - this.doneAt > 0.6) {
      this.complete(starsForMistakes(this.mistakes, 2, 0), this.mistakes === 0
        ? 'Perfect! Citești urmele ca un pădurar adevărat.'
        : 'Bravo! Acum știi ce animale trăiesc în pădurile de la Dealu Ștefăniței.');
    }
  }

  dispose() {
    showPanel(this.ctx.panel, null);
  }
}
