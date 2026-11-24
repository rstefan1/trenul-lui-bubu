/**
 * @file Station mission "the sled workshop": in a woodworker's workshop the
 * child builds a wooden sled from its parts, following a model, and the
 * sleds are then loaded on a flat wagon.
 *
 * The finished sled is shown as a model; on the workbench the sled grows
 * part by part, and the next part waits as a dashed outline (so the child
 * always sees where it goes). The parts are buttons, mixed with a few that
 * do not belong on a sled (wheels, pedals…): choosing one of those is a
 * gentle mistake with a funny remark, and so is a part taken too early.
 * After a mistake, or a few seconds of waiting, the right button pulses.
 *
 * When the sled is ready, the woodworkers add the others they have made and
 * the mission sets a flag; the game then draws the sleds on the wagon for
 * the rest of the journey (gfx/cargo.js).
 *
 * Configuration (besides id/title/text):
 *   parts    [{id, icon, label}] — the parts of the sled, in the order they are put
 *            together (ids: runners, posts, seat, rope)
 *   decoys   [{id, icon, label, reply}] — things that are not part of a sled
 *   wagon    which flat wagon the sleds go on (0 = the first behind the locomotive)
 *   flag     set when the sleds are on the wagon
 *   doneText what the woodworkers say when the sled is ready
 *   fact     shown at the end
 */

import { Particles, SPARKS } from '../gfx/particles.js';
import { el } from '../ui/dom.js';
import { showPanel } from '../ui/panel.js';
import { Mission, starsForMistakes } from './mission.js';

/**
 * @typedef {object} SledPart
 * @property {string} id
 * @property {string} icon
 * @property {string} label
 * @property {string} [reply]   what Bubu says when it is chosen (decoys)
 *
 * @typedef {import('./mission.js').MissionConfig & {
 *   parts: SledPart[], decoys: SledPart[], wagon: number, flag: string, doneText: string, fact: string,
 * }} SledWorkshopConfig
 */

/** Seconds without a choice before the right part pulses. */
const HINT_AFTER = 5;

/**
 * The parts of the sled, seen from the side, as SVG (fixed markup only:
 * no text from outside ever goes into it).
 * @type {Record<string, string>}
 */
const SHAPES = {
  runners: '<path d="M18 104 H186 Q214 104 214 82 Q214 66 198 66" fill="none" stroke-width="8" stroke-linecap="round"/>',
  posts: '<path d="M48 104 V72 M104 104 V72 M160 104 V72" fill="none" stroke-width="9" stroke-linecap="round"/>',
  seat: '<rect x="30" y="58" width="160" height="14" rx="4"/><path d="M70 58 V72 M110 58 V72 M150 58 V72" stroke-width="2" fill="none"/>',
  rope: '<path d="M200 68 Q226 92 236 58" fill="none" stroke-width="4" stroke-linecap="round"/>',
};
/** The colours of the parts: wood, darker wood, and the red rope. */
const COLORS = { runners: '#8d5a2b', posts: '#a8743f', seat: '#c98f52', rope: '#d84343' };

/**
 * SVG of a sled made of some parts, with the next part as a dashed outline.
 * @param {string[]} done   ids of the parts already in place
 * @param {string | null} ghost  id of the next part, or null
 */
function sledSvg(done, ghost) {
  const part = (/** @type {string} */ id, /** @type {boolean} */ outline) => {
    const color = COLORS[/** @type {keyof typeof COLORS} */ (id)];
    const style = outline
      ? `fill="none" stroke="#1f4f9c" stroke-dasharray="10 7" opacity=".8"`
      : `fill="${color}" stroke="${color}"`;
    // the fill of open paths is "none" in the shape itself
    return `<g ${style} class="${outline ? 'sled-ghost' : ''}">${SHAPES[id]}</g>`;
  };
  return `<svg viewBox="0 0 250 120" aria-hidden="true" focusable="false">`
    + `<rect x="0" y="108" width="250" height="12" rx="6" fill="#eef3fb"/>`
    + done.map(id => part(id, false)).join('')
    + (ghost ? part(ghost, true) : '')
    + `</svg>`;
}

export class SledWorkshopMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {SledWorkshopConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    this.mistakes = 0;
    /** How many parts are in place. */
    this.placed = 0;
    this.time = 0;
    this.idleSince = 0;
    /** @type {'build' | 'loading' | 'done'} */
    this.step = 'build';
    this.doneAt = 0;
    this.particles = new Particles();
    /** @type {Map<string, HTMLButtonElement>} */
    this.buttons = new Map();
    /** @type {HTMLElement | null} */
    this.bench = null;
    /** @type {HTMLElement | null} */
    this.says = null;
  }

  start() {
    this.phase = 'running';
    this.showBench();
  }

  /** @private The workshop: the model, the workbench and the parts. */
  showBench() {
    const model = el('div', { class: 'sled-model' });
    // fixed markup only (see SHAPES)
    model.innerHTML = sledSvg(this.config.parts.map(p => p.id), null);
    this.bench = el('div', { class: 'sled-bench' });
    this.says = el('span', {}, ['Sania se face de jos în sus. Ce punem întâi?']);
    const all = shuffle([...this.config.parts, ...this.config.decoys]);
    const buttons = all.map(part => {
      const b = /** @type {HTMLButtonElement} */ (el('button', { class: 'luggage-item', type: 'button' }, [
        el('span', { class: 'luggage-icon', 'aria-hidden': 'true' }, [part.icon]), el('span', {}, [part.label]),
      ]));
      b.addEventListener('click', () => this.choose(part, b));
      this.buttons.set(part.id, b);
      return b;
    });
    this.refreshBench();
    showPanel(this.ctx.panel, el('div', { class: 'panel panel--wide sled-panel' }, [
      el('p', { class: 'panel-kicker' }, ['Misiune']),
      el('h2', { class: 'panel-title' }, [this.config.title]),
      el('p', { class: 'panel-text' }, [this.config.text]),
      el('div', { class: 'sled-work' }, [
        el('figure', { class: 'sled-card' }, [model, el('figcaption', {}, ['Modelul'])]),
        el('figure', { class: 'sled-card sled-card--bench' }, [this.bench, el('figcaption', {}, ['Sania ta'])]),
      ]),
      el('div', { class: 'luggage-items sled-parts' }, buttons),
      el('p', { class: 'bubu-says' }, [el('img', { src: '../shared/assets/bubu.webp', alt: '', width: '56', height: '56' }), this.says]),
    ]));
  }

  /** @private Draws the sled on the workbench as it is now. */
  refreshBench() {
    if (!this.bench) return;
    const ids = this.config.parts.map(p => p.id);
    // fixed markup only (see SHAPES)
    this.bench.innerHTML = sledSvg(ids.slice(0, this.placed), ids[this.placed] ?? null);
  }

  /**
   * @private
   * @param {SledPart} part
   * @param {HTMLButtonElement} button
   */
  choose(part, button) {
    if (this.step !== 'build' || button.disabled) return;
    this.idleSince = this.time;
    const next = this.config.parts[this.placed];
    if (part.id === next.id) {
      button.disabled = true;
      button.classList.add('is-packed');
      button.classList.remove('is-hint');
      this.placed += 1;
      this.refreshBench();
      this.sound('tock');
      const after = this.config.parts[this.placed];
      if (!this.says) return;
      if (after) {
        this.says.textContent = `Da! ${part.label}. Acum: ${after.label.toLowerCase()}.`;
      } else {
        this.says.textContent = this.config.doneText;
        this.finishSled();
      }
      return;
    }
    this.mistakes += 1;
    this.oops();
    button.classList.remove('is-wrong');
    void button.offsetWidth;   // restart the shake animation
    button.classList.add('is-wrong');
    const isPart = this.config.parts.some(p => p.id === part.id);
    if (this.says) {
      this.says.textContent = isPart
        ? `Nu încă! Uită-te la conturul punctat. Acum urmează: ${next.label.toLowerCase()}.`
        : part.reply ?? `${part.label} nu sunt la o sanie!`;
    }
  }

  /** @private The sled is ready: the sleds go to the wagon. */
  finishSled() {
    this.step = 'loading';
    const go = el('button', { class: 'big-btn', type: 'button' }, ['Urcăm săniile în tren! ▶']);
    go.addEventListener('click', () => {
      showPanel(this.ctx.panel, null);
      this.ctx.state.setFlag(this.config.flag);
      const p = this.wagonCenter();
      this.particles.burst(p.x, p.y, SPARKS, 28, 260);
      this.sound('collect', p.x);
      this.ctx.hud.announce('Săniile sunt în tren!', this.config.fact, 'Misiune', 4);
      this.step = 'done';
      this.doneAt = this.time;
    });
    const panel = this.ctx.panel.querySelector('.sled-panel');
    panel?.append(go);
  }

  /** @private Stage position above the middle of the wagon that takes the sleds. */
  wagonCenter() {
    const wagons = this.ctx.world.train.cars.filter(c => c.spec.kind === 'platform');
    const car = wagons[Math.min(this.config.wagon, wagons.length - 1)];
    return this.ctx.world.trainToStage({ x: car.left + car.spec.length / 2, y: -110 });
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    if (this.step === 'build') {
      // help: the right part pulses after a mistake or a wait
      const next = this.config.parts[this.placed];
      const hint = this.mistakes > 0 || this.time - this.idleSince > HINT_AFTER;
      this.buttons.get(next.id)?.classList.toggle('is-hint', hint);
    }
    if (this.step === 'done' && this.time - this.doneAt > 2.2) {
      this.complete(starsForMistakes(this.mistakes, 2, 0), this.mistakes === 0
        ? 'Perfect! Ai făcut sania ca un meșter adevărat.'
        : 'Bravo! Sania e gata, iar săniile sunt în tren.');
    }
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    this.particles.draw(c);
  }

  dispose() {
    showPanel(this.ctx.panel, null);
  }
}

/**
 * Fisher–Yates shuffle (returns a new array).
 * @template T
 * @param {T[]} items
 * @returns {T[]}
 */
function shuffle(items) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}
