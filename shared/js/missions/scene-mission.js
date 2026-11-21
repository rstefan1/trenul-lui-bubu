/**
 * @file Base class for station missions that take over the whole screen
 * with a scene of their own (the Deva fortress, the Alba Iulia maze, the
 * square in Cluj…).
 *
 * It provides what all of them share:
 *   - the scene fades in over the world and out again at the end;
 *   - the ending: a panel at the bottom with what was achieved, a short real
 *     fact about the place and a button back to the train;
 *   - cleaning up the panel, the announcement and the counter.
 */

import { approach } from '../core/math.js';
import { el } from '../ui/dom.js';
import { Mission } from './mission.js';

/** Seconds of the fade between the world and the scene. */
const FADE = 0.5;

/**
 * @typedef {object} Ending
 * @property {string} doneText   what was achieved
 * @property {string} fact       a real fact about the place
 * @property {number} stars
 * @property {string} result     sentence shown with the stars
 * @property {number} [delay=1.2]  seconds before the panel appears (time to enjoy the scene)
 */

export class SceneMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {import('./mission.js').MissionConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    /** Opacity of the scene (0 = the world is visible). */
    this.fade = 0;
    this.leaving = false;
    /** @type {[number, string] | null} stars and text, applied when the fade-out ends */
    this.result = null;
  }

  /**
   * To be called from update(): animates the fades and completes the mission
   * once the scene has faded out.
   * @protected
   * @param {number} dt
   */
  updateFade(dt) {
    this.fade = approach(this.fade, this.leaving ? 0 : 1, 3 / FADE, dt);
    if (this.leaving && this.fade < 0.02 && this.result) this.complete(...this.result);
  }

  /** True while the scene is shown (not fading out). */
  get inScene() {
    return !this.leaving;
  }

  /**
   * Shows the ending panel; the mission completes when the child presses
   * the button and the scene has faded out.
   * @protected
   * @param {Ending} ending
   */
  showEnding(ending) {
    this.ctx.hud.hideAnnouncement();
    const next = el('button', { class: 'big-btn', type: 'button' }, ['Înapoi la tren! 🚂']);
    next.addEventListener('click', () => {
      this.setPanel(null);
      this.ctx.hud.hideCounter();
      this.result = [ending.stars, ending.result];
      this.leaving = true;
    });
    setTimeout(() => {
      if (this.phase === 'finished') return;
      this.setPanel(el('div', { class: 'panel panel--bottom' }, [
        el('p', { class: 'puzzle-solved' }, [ending.doneText]),
        el('p', { class: 'fact' }, [el('b', {}, ['Știai că? ']), ending.fact]),
        next,
      ]));
    }, (ending.delay ?? 1.2) * 1000);
  }

  /**
   * Shows a panel (or removes it).
   * @protected
   * @param {HTMLElement | null} node
   * @param {boolean} [bottom=true]  at the bottom (the scene stays visible) or in the middle
   */
  setPanel(node, bottom = true) {
    const root = this.ctx.panel;
    root.replaceChildren();
    root.hidden = !node;
    root.classList.toggle('is-bottom', !!node && bottom);
    if (node) root.append(node);
  }

  dispose() {
    this.setPanel(null);
    this.ctx.hud.hideAnnouncement();
    this.ctx.hud.hideCounter();
  }
}
