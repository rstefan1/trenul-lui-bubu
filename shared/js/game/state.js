/**
 * @file What the player has achieved so far: the traveller's name, the
 * chosen locomotive colour, the stars earned in every mission and the
 * ornaments collected for the train.
 *
 * The state is a plain observable object: the HUD and the train renderer
 * listen to "change" events instead of being called by the missions. It can
 * be turned into plain JSON and back, to be saved in the browser.
 *
 * The locomotive's colour is not saved with the journey: a journey starts
 * with the colour the child gave the locomotive in the depot; a colour
 * chosen on the journey lasts while the child stays on it (leaving the
 * journey, or choosing another, brings back the depot's colour).
 */

import { Emitter } from '../core/emitter.js';

/**
 * @typedef {object} GameStateData
 * @property {string} travelerName
 * @property {string | null} [locoColor]  no longer saved (older saves may still have it)
 * @property {Array<[string, number]>} stars
 * @property {string[]} baubles
 * @property {number} [hat]
 * @property {number} [lightBulbs]
 * @property {string[]} [flags]
 */

export class GameState extends Emitter {
  constructor() {
    super();
    this.travelerName = '';
    /** @type {string | null} the colour chosen on this journey (null: the depot's colour); never saved */
    this.locoColor = null;
    /** @type {Map<string, number>} mission id → stars (1..3) */
    this.stars = new Map();
    /** Colours of the baubles hanging on the train, in the order they were caught. */
    /** @type {string[]} */
    this.baubles = [];
    /** How much of the string of lights along the train is lit (0..1). */
    this.lightBulbs = 0;
    /** Things that changed in the world thanks to the player (e.g. "deva-fortress-lit"). */
    /** @type {Set<string>} */
    this.flags = new Set();
    /** The festive hat Bubu wears (index in HATS, −1 = none). */
    this.hat = -1;
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

  /** @param {string | null} color  null: back to the colour of the depot */
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

  /** @returns {GameStateData} */
  toJSON() {
    return {
      travelerName: this.travelerName,
      stars: [...this.stars],
      baubles: [...this.baubles],
      hat: this.hat,
      lightBulbs: this.lightBulbs,
      flags: [...this.flags],
    };
  }

  /**
   * Replaces everything with saved data (or with an empty state) and tells
   * every listener.
   * @param {Partial<GameStateData> | null} data
   */
  load(data) {
    this.travelerName = data?.travelerName ?? '';
    // the colour chosen on the journey stays (it is not part of what is saved)
    this.stars = new Map(data?.stars ?? []);
    this.baubles.length = 0;
    this.baubles.push(...(data?.baubles ?? []));
    this.lightBulbs = data?.lightBulbs ?? 0;
    this.flags.clear();
    for (const f of data?.flags ?? []) this.flags.add(f);
    this.hat = data?.hat ?? -1;
    for (const what of ['travelerName', 'locoColor', 'stars', 'baubles', 'lightBulbs', 'flags', 'hat']) this.emit('change', what);
  }

  /** @param {string} flag */
  setFlag(flag) {
    this.flags.add(flag);
    this.emit('change', 'flags');
  }

  /**
   * Lights more of the string of lights along the train.
   * @param {number} fraction  0..1, how much of it is lit now
   */
  setLightBulbs(fraction) {
    this.lightBulbs = Math.max(this.lightBulbs, Math.min(1, fraction));
    this.emit('change', 'lightBulbs');
  }

  /** @param {number} index  the hat Bubu wears from now on */
  setHat(index) {
    this.hat = index;
    this.emit('change', 'hat');
  }

  /** @param {string} color */
  addBauble(color) {
    this.baubles.push(color);
    this.emit('change', 'baubles');
  }
}
