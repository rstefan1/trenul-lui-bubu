/**
 * @file The sound of the train running: a real recording played in a plain
 * loop, always at its natural speed and volume, whatever the train's speed
 * (missions slow the train down on purpose, and that must not change how
 * it sounds). It is heard while the train moves and goes quiet while it
 * stands or while the game waits for the player.
 */

/** Below this speed the train is considered stopped. */
const MIN_SPEED = 5;
/** Seconds to go quiet or to be heard again (just enough to avoid a click). */
const SWITCH = 0.12;

export class RailSound {
  /**
   * @param {import('./audio.js').AudioEngine} engine
   * @param {string} name  the recording (registered with the engine)
   */
  constructor(engine, name) {
    this.engine = engine;
    this.name = name;
    /** @type {GainNode | null} on while the train moves, off while it stands */
    this.gate = null;
    this.on = false;
  }

  /**
   * @param {number} speed  stage units per second
   * @param {{paused: boolean}} view
   */
  update(speed, view) {
    const e = this.engine;
    const buffer = e.buffers.get(this.name);
    if (!e.ready || !e.ctx || !e.master || !buffer) return;
    const ctx = e.ctx;
    if (!this.gate) {
      // one copy of the recording, looping for as long as the game runs
      this.gate = ctx.createGain();
      this.gate.gain.value = 0;
      this.gate.connect(e.master);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      src.connect(this.gate);
      src.start();
    }
    const on = !view.paused && speed > MIN_SPEED;
    if (on === this.on) return;
    this.on = on;
    this.gate.gain.setTargetAtTime(on ? 1 : 0, ctx.currentTime, SWITCH / 3);
  }
}
