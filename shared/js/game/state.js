/**
 * @file What the player has achieved so far: the traveller's name, the
 * chosen locomotive colour, the stars earned in every mission and the
 * ornaments collected for the train.
 *
 * The state is a plain observable object: the HUD and the train renderer
 * listen to "change" events instead of being called by the missions. It can
 * be turned into plain JSON and back, to be saved in the browser.
 */

import { Emitter } from '../core/emitter.js';

/**
 * @typedef {object} GameStateData
 * @property {string} travelerName
 * @property {string | null} locoColor
 * @property {Array<[string, number]>} stars
 * @property {string[]} baubles
 * @property {string[]} [flags]
 */

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
    /** Things that changed in the world thanks to the player (e.g. "deva-fortress-lit"). */
    /** @type {Set<string>} */
    this.flags = new Set();
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

  /** @returns {GameStateData} */
  toJSON() {
    return {
      travelerName: this.travelerName,
      locoColor: this.locoColor,
      stars: [...this.stars],
      baubles: [...this.baubles],
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
    this.locoColor = data?.locoColor ?? null;
    this.stars = new Map(data?.stars ?? []);
    this.baubles.length = 0;
    this.baubles.push(...(data?.baubles ?? []));
    this.flags.clear();
    for (const f of data?.flags ?? []) this.flags.add(f);
    for (const what of ['travelerName', 'locoColor', 'stars', 'baubles', 'flags']) this.emit('change', what);
  }

  /** @param {string} flag */
  setFlag(flag) {
    this.flags.add(flag);
    this.emit('change', 'flags');
  }

  /** @param {string} color */
  addBauble(color) {
    this.baubles.push(color);
    this.emit('change', 'baubles');
  }
}
