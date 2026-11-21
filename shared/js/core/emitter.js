/**
 * @file Minimal synchronous event emitter.
 *
 * Used to keep modules decoupled: the journey announces "arrive"/"depart",
 * the stage announces "resize", and the user interface reacts without the
 * producers knowing about it.
 */

export class Emitter {
  constructor() {
    /** @type {Map<string, Set<Function>>} */
    this.listeners = new Map();
  }

  /**
   * Subscribes to an event.
   * @param {string} type
   * @param {Function} listener
   * @returns {() => void} a function that removes the subscription
   */
  on(type, listener) {
    let set = this.listeners.get(type);
    if (!set) this.listeners.set(type, (set = new Set()));
    set.add(listener);
    return () => set.delete(listener);
  }

  /**
   * Calls every listener of an event with the given arguments.
   * @param {string} type
   * @param {...unknown} args
   */
  emit(type, ...args) {
    const set = this.listeners.get(type);
    if (!set) return;
    for (const listener of [...set]) listener(...args);
  }
}
