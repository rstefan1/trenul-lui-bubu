/**
 * @file What the player has achieved so far: the traveller's name, the
 * chosen locomotive colour, the stars earned in every mission and the
 * ornaments collected for the train.
 *
 * The state is a plain observable object: the HUD and the train renderer
 * listen to "change" events instead of being called by the missions.
 * (Saving it in the browser, so a journey can be resumed, comes later.)
 */

import { Emitter } from '../core/emitter.js';

export class GameState extends Emitter {
  constructor() {
    super();
    this.travelerName = '';
    /** @type {string | null} */
    this.locoColor = null;
    /** @type {Map<string, number>} mission id → stars (1..3) */
    this.stars = new Map();
    /** Colours of the baubles hanging on the train, in the order they were caught. */
    /** @type {string[]} */
    this.baubles = [];
  }

  /** Total number of stars. */
  get totalStars() {
    let sum = 0;
    for (const s of this.stars.values()) sum += s;
    return sum;
  }

  /** @param {string} name */
  setTravelerName(name) {
    this.travelerName = name.trim();
    this.emit('change', 'travelerName');
  }

  /** @param {string} color */
  setLocoColor(color) {
    this.locoColor = color;
    this.emit('change', 'locoColor');
  }

  /**
   * Records the result of a mission (a replay keeps the best result).
   * @param {string} missionId
   * @param {number} stars
   */
  awardStars(missionId, stars) {
    this.stars.set(missionId, Math.max(stars, this.stars.get(missionId) || 0));
    this.emit('change', 'stars');
  }

  /** @param {string} color */
  addBauble(color) {
    this.baubles.push(color);
    this.emit('change', 'baubles');
  }
}
