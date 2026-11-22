/**
 * @file The train's pace during missions with things to touch along the line.
 *
 * Children must never miss something because the train goes by too fast.
 * A travel mission can take the controls of the train with a TrainPace and
 * then, every frame, either:
 *
 *   - stopAt(gap): brake so that something `gap` stage units ahead ends up
 *     exactly in place, and wait there (e.g. a child under the golden circle);
 *   - slowNear(xs): crawl while something still to touch is on screen, brake
 *     in time for the next one coming from the right, and go fast in between.
 *
 * The controls go back to the timetable with release().
 */

import { MANUAL } from '../journey/journey.js';

/** Default braking rate the pace plans with (well under the train's own, so it always manages). */
const BRAKE = 230;

/**
 * @typedef {object} PaceOptions
 * @property {number} far    speed between the things to touch
 * @property {number} [slow] crawling speed while something waits on screen (slowNear)
 * @property {number} [brake] braking rate (stage units/s², at most the train's own):
 *   higher values brake later and harder
 * @property {number} [enter] slowNear: where (0 = left edge, 1 = right edge of
 *   the view) a thing to touch should already be crawling; smaller values
 *   slow the train down later (default: just inside the right edge)
 */

export class TrainPace {
  /**
   * @param {import('../journey/journey.js').Journey} journey
   * @param {PaceOptions} options
   */
  constructor(journey, options) {
    this.journey = journey;
    this.far = options.far;
    this.slow = options.slow ?? 100;
    this.brake = Math.min(options.brake ?? BRAKE, MANUAL.brake - 20);
    this.enter = options.enter;
    /** @type {import('../journey/journey.js').Controls | null} */
    this.controls = journey.takeControl();
  }

  /** Go at full pace (nothing to wait for). */
  cruise() {
    if (!this.controls) return;
    this.controls.target = this.far;
    this.controls.stopIn = undefined;
  }

  /**
   * Brakes so that a point `gap` stage units ahead stops right in place.
   * @param {number} gap  how far it still has to come (≤ 0: it is there)
   */
  stopAt(gap) {
    if (!this.controls) return;
    this.controls.target = Math.min(this.far, Math.sqrt(2 * this.brake * Math.max(0, gap)));
    this.controls.stopIn = Math.max(0, gap);
  }

  /**
   * Crawls while one of the things still to touch is on screen, brakes in
   * time for the next one, and goes fast otherwise.
   * @param {number[]} xs   screen x of every thing still to touch (also those not on screen yet)
   * @param {{left: number, right: number}} view  the visible part of the stage
   */
  slowNear(xs, view) {
    if (!this.controls) return;
    // where a thing should already be crawling
    const enter = this.enter === undefined ? view.right - 120 : view.left + (view.right - view.left) * this.enter;
    let target = this.far;
    for (const x of xs) {
      if (x < view.left + 80) continue;   // gone by on the left
      const d = x - enter;
      const v = d <= 0 ? this.slow : Math.sqrt(this.slow * this.slow + 2 * this.brake * d);
      target = Math.min(target, v);
    }
    this.controls.target = target;
    this.controls.stopIn = undefined;
  }

  /** Gives the train back to its timetable. */
  release() {
    if (!this.controls) return;
    this.controls = null;
    this.journey.releaseControl();
  }
}
