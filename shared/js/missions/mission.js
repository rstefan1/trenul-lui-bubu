/**
 * @file The common shape of every mission.
 *
 * Two families of missions exist:
 *
 *   travel missions   run while the train is moving between two stations,
 *                     inside a window of the segment (e.g. from 10 % to
 *                     88 % of the way). When the window closes the director
 *                     calls {@link Mission#wrapUp}: no new challenges
 *                     appear, and the mission finishes as soon as what is
 *                     still in progress has settled.
 *
 *   station missions  run while the train waits at a station; the train
 *                     leaves only after the mission is finished.
 *
 * A mission draws on the canvas (in stage units, on top of the world) and/or
 * builds its own HTML panel, receives pointer events on the canvas, and
 * finishes by calling {@link Mission#complete} with 1–3 stars. Missions can
 * never be lost: the worst result is one star.
 */

import { oopsSound, playSound } from '../audio/effects.js';

/** How far to the sides the missions' sounds go (1 = fully into one speaker). */
const PAN_WIDTH = 0.7;

/**
 * Everything a mission may use.
 * @typedef {object} MissionContext
 * @property {import('../core/stage.js').Stage} stage
 * @property {import('../journey/journey.js').Journey} journey
 * @property {import('../world/world-view.js').WorldView} world
 * @property {import('../game/state.js').GameState} state
 * @property {import('../ui/mission-hud.js').MissionHud} hud
 * @property {HTMLElement} panel   container for the mission's HTML panels
 * @property {import('../audio/audio.js').AudioEngine} [audio]  plays the recorded sounds
 */

/**
 * @typedef {object} MissionConfig
 * @property {string} id       unique, used to record the stars
 * @property {string} title    shown when the mission starts
 * @property {string} text     one or two sentences explaining what to do
 */

/** @typedef {'idle' | 'running' | 'wrapping' | 'finished'} MissionPhase */

export class Mission {
  /**
   * @param {MissionContext} ctx
   * @param {MissionConfig} config
   */
  constructor(ctx, config) {
    this.ctx = ctx;
    this.config = config;
    /** The background music stays silent while this mission runs (it has sounds of its own). */
    this.quietMusic = false;
    /** @type {MissionPhase} */
    this.phase = 'idle';
    this.stars = 0;
    /** Short sentence shown with the stars at the end. */
    this.resultText = '';
  }

  get id() {
    return this.config.id;
  }

  get finished() {
    return this.phase === 'finished';
  }

  /**
   * Starts the mission.
   * @param {{duration?: number, window?: {from: number, to: number}}} [hints]
   *        travel missions: expected play seconds, and the window in the segment
   */
  start(hints = {}) {
    this.phase = 'running';
    this.ctx.hud.instruct(this.config.title, this.config.text);
  }

  /** Travel missions: the window is closing, finish what is in progress. */
  wrapUp() {
    if (this.phase === 'running') this.phase = 'wrapping';
  }

  /** @param {number} dt */
  update(dt) {}

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {}

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {}

  /** @param {import('../core/input.js').PointerInfo} p  (mouse: also without a button pressed) */
  pointerMove(p) {}

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerUp(p) {}

  /**
   * Ends the mission.
   * @protected
   * @param {number} stars   1..3
   * @param {string} text
   */
  complete(stars, text) {
    this.stars = Math.max(1, Math.min(3, Math.round(stars)));
    this.resultText = text;
    this.phase = 'finished';
  }

  /**
   * A wrong choice: a gentle "oops" (never a punishing buzzer).
   * @protected
   */
  oops() {
    oopsSound(this.ctx.audio);
  }

  /**
   * Plays one of the sound effects, from where it happens on screen.
   * @protected
   * @param {import('../audio/effects.js').SoundName} name
   * @param {number} [x]  stage x of what makes the sound (centre if omitted)
   */
  sound(name, x) {
    const stage = this.ctx.stage;
    const half = (stage.viewRight - stage.viewLeft) / 2;
    const pan = x === undefined ? 0 : ((x - (stage.viewLeft + half)) / half) * PAN_WIDTH;
    playSound(this.ctx.audio, name, { pan });
  }

  /** Called by the director after the mission has finished (remove panels, listeners). */
  dispose() {}
}

/**
 * Stars from a count of mistakes: few mistakes give three stars.
 * @param {number} mistakes
 * @param {number} forTwo    at most this many mistakes for two stars
 * @param {number} forThree  at most this many mistakes for three stars
 */
export const starsForMistakes = (mistakes, forTwo, forThree) => (mistakes <= forThree ? 3 : mistakes <= forTwo ? 2 : 1);
