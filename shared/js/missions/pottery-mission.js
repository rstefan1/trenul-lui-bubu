/**
 * @file Station mission "the black jug": at a potter's in a village known
 * for its black pottery, the child makes a jug as a gift for the children
 * waiting at the end of the journey.
 *
 * Four short steps, each different:
 *   1. the wheel — a few taps spin the potter's wheel and the lump of clay
 *      rises into a rough pot;
 *   2. the shape — of three shapes, the child picks the one of the model
 *      jug (a wrong one is a gentle mistake);
 *   3. the decoration — any of three patterns, scratched into the clay
 *      (no wrong answer: it is the child's own jug);
 *   4. the kiln — the jug is fired and comes out black and shiny.
 *
 * The mission sets a flag (the jug is given away at the last station).
 *
 * Configuration (besides id/title/text):
 *   spins     taps needed on the wheel
 *   flag      set when the jug is ready
 *   fact      shown when the jug comes out of the kiln
 */

import { el } from '../ui/dom.js';
import { showPanel } from '../ui/panel.js';
import { Mission, starsForMistakes } from './mission.js';

/** @typedef {import('./mission.js').MissionConfig & {spins: number, flag: string, fact: string}} PotteryConfig */

/**
 * The shapes of pot, seen from the side, as [belly, neck, lip] half-widths
 * (the model jug first).
 * @type {Array<{id: string, belly: number, neck: number, lip: number}>}
 */
const SHAPES = [
  { id: 'jug', belly: 44, neck: 14, lip: 20 },
  { id: 'bowl', belly: 50, neck: 46, lip: 52 },
  { id: 'bottle', belly: 24, neck: 9, lip: 11 },
];
/** The patterns scratched into the clay (SVG paths in the pot's box). */
const PATTERNS = {
  zigzag: { label: 'Zigzag', d: 'M58 92 l8 -8 l8 8 l8 -8 l8 8 l8 -8 l8 8 l8 -8 l8 8' },
  dots: { label: 'Buline', d: 'M66 90 h1 M78 90 h1 M90 90 h1 M102 90 h1 M114 90 h1 M72 100 h1 M84 100 h1 M96 100 h1 M108 100 h1' },
  waves: { label: 'Valuri', d: 'M56 94 q8 -10 16 0 t16 0 t16 0 t16 0 t16 0' },
};

/**
 * SVG of a pot (fixed markup only: no text from outside goes into it).
 * @param {{belly: number, neck: number, lip: number} | null} shape  null: a lump of clay
 * @param {{clay: string, line?: string, pattern?: string, shine?: boolean}} look
 */
function potSvg(shape, look) {
  const cx = 90;
  let body;
  if (!shape) {
    body = `<ellipse cx="${cx}" cy="118" rx="38" ry="26" fill="${look.clay}"/>`;
  } else {
    const { belly, neck, lip } = shape;
    const d = `M${cx - lip} 40 Q${cx - neck} 46 ${cx - neck} 58 Q${cx - belly - 8} 84 ${cx - belly} 112 Q${cx - belly} 140 ${cx - 22} 142`
      + ` L${cx + 22} 142 Q${cx + belly} 140 ${cx + belly} 112 Q${cx + belly + 8} 84 ${cx + neck} 58 Q${cx + neck} 46 ${cx + lip} 40 Z`;
    body = `<path d="${d}" fill="${look.clay}"/>`;
    if (look.pattern) body += `<path d="${look.pattern}" fill="none" stroke="${look.line ?? '#7a4a2a'}" stroke-width="4" stroke-linecap="round"/>`;
    if (look.shine) body += `<path d="M${cx - belly + 10} 100 Q${cx - belly + 8} 80 ${cx - belly + 20} 70" fill="none" stroke="rgba(255,255,255,.55)" stroke-width="6" stroke-linecap="round"/>`;
  }
  return `<svg viewBox="0 0 180 170" aria-hidden="true" focusable="false">`
    + `<ellipse cx="90" cy="152" rx="70" ry="12" fill="#8d6e63"/><rect x="84" y="152" width="12" height="18" fill="#6d4c41"/>`
    + body + `</svg>`;
}

const CLAY = '#c9875a';

export class PotteryMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {PotteryConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    this.mistakes = 0;
    this.spins = 0;
    /** @type {string} the pattern chosen */
    this.pattern = '';
    this.time = 0;
    this.doneAt = -1;
    /** @type {Record<string, HTMLElement>} */
    this.ui = {};
  }

  start() {
    this.phase = 'running';
    const work = el('figure', { class: 'sled-card sled-card--bench pot-card' });
    const model = el('figure', { class: 'sled-card pot-card' });
    // fixed markup only (see potSvg)
    model.innerHTML = potSvg(SHAPES[0], { clay: '#26221f', shine: true });
    model.append(el('figcaption', {}, ['Modelul']));
    const step = el('div', { class: 'pot-step' });
    const says = el('span', {}, ['Învârte roata olarului!']);
    this.ui = { work, step, says };
    showPanel(this.ctx.panel, el('div', { class: 'panel panel--wide pot-panel' }, [
      el('p', { class: 'panel-kicker' }, ['Misiune']),
      el('h2', { class: 'panel-title' }, [this.config.title]),
      el('p', { class: 'panel-text' }, [this.config.text]),
      el('div', { class: 'sled-work' }, [model, work]),
      step,
      el('p', { class: 'bubu-says' }, [el('img', { src: '../shared/assets/bubu.webp', alt: '', width: '56', height: '56' }), says]),
    ]));
    this.showWheel();
  }

  /**
   * Shows the jug as it is now on the workbench.
   * @private
   * @param {{belly: number, neck: number, lip: number} | null} shape
   * @param {{clay: string, line?: string, pattern?: string, shine?: boolean}} look
   * @param {boolean} [spinning]
   */
  setWork(shape, look, spinning = false) {
    // fixed markup only (see potSvg)
    this.ui.work.innerHTML = potSvg(shape, look);
    this.ui.work.append(el('figcaption', {}, ['Ulciorul tău']));
    this.ui.work.classList.toggle('is-spinning', spinning);
  }

  /** @private Step 1: the wheel. */
  showWheel() {
    this.setWork(null, { clay: CLAY });
    const spin = el('button', { class: 'big-btn is-hint', type: 'button' }, [`🌀 Învârte roata (0/${this.config.spins})`]);
    spin.addEventListener('click', () => {
      this.spins += 1;
      this.sound('whoosh');
      spin.textContent = `🌀 Învârte roata (${this.spins}/${this.config.spins})`;
      this.setWork(this.spins >= this.config.spins ? SHAPES[1] : null, { clay: CLAY }, true);
      if (this.spins >= this.config.spins) setTimeout(() => this.showShapes(), 500);
    });
    this.ui.step.replaceChildren(spin);
  }

  /** @private Step 2: the shape of the model. */
  showShapes() {
    this.ui.says.textContent = 'Lutul s-a ridicat! Ce formă are ulciorul din model?';
    const order = [SHAPES[2], SHAPES[0], SHAPES[1]];
    const buttons = order.map(shape => {
      const b = el('button', { class: 'luggage-item pot-choice', type: 'button', 'aria-label': `Forma ${shape.id}` });
      // fixed markup only (see potSvg)
      b.innerHTML = potSvg(shape, { clay: CLAY });
      b.addEventListener('click', () => {
        if (shape !== SHAPES[0]) {
          this.mistakes += 1;
          this.oops();
          b.classList.remove('is-wrong');
          void b.offsetWidth;   // restart the shake animation
          b.classList.add('is-wrong');
          this.ui.says.textContent = 'Uită-te bine la model: are burta rotundă și gâtul îngust.';
          buttons[1].classList.add('is-hint');
          return;
        }
        this.sound('tock');
        this.setWork(SHAPES[0], { clay: CLAY });
        this.showPatterns();
      });
      return b;
    });
    this.ui.step.replaceChildren(el('div', { class: 'pot-choices' }, buttons));
  }

  /** @private Step 3: the decoration (any one is right). */
  showPatterns() {
    this.ui.says.textContent = 'Ce model zgâriem pe ulcior? Alege-l pe cel care îți place!';
    const buttons = Object.values(PATTERNS).map(p => {
      const b = el('button', { class: 'luggage-item', type: 'button' }, [p.label]);
      b.addEventListener('click', () => {
        this.pattern = p.d;
        this.sound('brush');
        this.setWork(SHAPES[0], { clay: CLAY, pattern: p.d });
        this.showKiln();
      });
      return b;
    });
    this.ui.step.replaceChildren(el('div', { class: 'pot-choices' }, buttons));
  }

  /** @private Step 4: the kiln. */
  showKiln() {
    this.ui.says.textContent = 'Acum ulciorul intră în cuptor!';
    const fire = el('button', { class: 'big-btn is-hint', type: 'button' }, ['🔥 În cuptor!']);
    fire.addEventListener('click', () => {
      this.sound('flame');
      this.setWork(SHAPES[0], { clay: '#26221f', line: '#5a5550', pattern: this.pattern, shine: true });
      this.ui.says.textContent = 'Ulciorul a ieșit negru și lucios. E darul nostru pentru copii!';
      this.ui.step.replaceChildren();
      this.ctx.state.setFlag(this.config.flag);
      this.ctx.hud.announce('Ulciorul negru', this.config.fact, 'Misiune', 4);
      this.doneAt = this.time;
    });
    this.ui.step.replaceChildren(fire);
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    if (this.doneAt >= 0 && this.time - this.doneAt > 3) {
      this.complete(starsForMistakes(this.mistakes, 1, 0), this.mistakes === 0
        ? 'Perfect! Un ulcior negru, ca la Săcel.'
        : 'Bravo! Ulciorul negru e gata.');
    }
  }

  dispose() {
    showPanel(this.ctx.panel, null);
  }
}
