/**
 * @file Saving the journey in the browser (localStorage).
 *
 * Nothing leaves the child's device: there are no accounts and no server.
 * Browsers may refuse storage (private windows, blocked site data), so every
 * access is guarded and the game simply works without saving then.
 */

/**
 * @typedef {object} SaveData
 * @property {number} version
 * @property {boolean} introSeen
 * @property {number | null} stationIndex   station where the saved journey waits
 *                                          (its mission done), or null if not started
 * @property {import('./state.js').GameStateData | null} state
 * @property {Record<string, import('./state.js').GameStateData>} chapterStart
 *           the state at the start of every chapter played (for replays)
 * @property {boolean} finished              the whole journey was completed once
 */

const VERSION = 1;

/** @returns {SaveData} */
export const emptySave = () => ({
  version: VERSION, introSeen: false, stationIndex: null, state: null, chapterStart: {}, finished: false,
});

export class SaveStore {
  /** @param {string} key  localStorage key (one per season of the game) */
  constructor(key) {
    this.key = key;
  }

  /** @returns {SaveData} */
  load() {
    try {
      const raw = localStorage.getItem(this.key);
      if (!raw) return emptySave();
      const data = JSON.parse(raw);
      return data && data.version === VERSION ? { ...emptySave(), ...data } : emptySave();
    } catch {
      return emptySave();
    }
  }

  /** @param {SaveData} data */
  save(data) {
    try {
      localStorage.setItem(this.key, JSON.stringify(data));
    } catch {
      // storage unavailable or full: the game goes on without saving
    }
  }

  clear() {
    try {
      localStorage.removeItem(this.key);
    } catch {
      // nothing to do
    }
  }
}
