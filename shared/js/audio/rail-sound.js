/**
 * @file The sound of the train running, from a real recording.
 *
 * The recording plays in a seamless loop: a few seconds before one copy
 * ends, the next one starts and the two cross-fade, so the joint is never
 * heard. It follows the train: silent while it stands, louder and a little
 * faster (higher) as it speeds up, slower and softer as it brakes, a bit
 * louder in tunnels. While the game waits (a mission's instructions are
 * open), the sound fades out.
 */

/** Seconds of cross-fade between two copies of the loop. */
const FADE = 2.5;
/** Below this speed the train is considered stopped. */
const MIN_SPEED = 20;
/** The speed at which the recording plays at its natural rate (stage units/s). */
const NATURAL_SPEED = 560;

export class RailSound {
  /**
   * @param {import('./audio.js').AudioEngine} engine
   * @param {string} name  the recording (registered with the engine)
   */
  constructor(engine, name) {
    this.engine = engine;
    this.name = name;
    /** @type {GainNode | null} the volume that follows the speed */
    this.level = null;
    /** @type {Array<{src: AudioBufferSourceNode, fade: GainNode, end: number}>} copies playing */
    this.copies = [];
    this.rate = 1;
  }

  /**
   * @param {number} speed  stage units per second
   * @param {{tunnel: boolean, paused: boolean}} view
   */
  update(speed, view) {
    const e = this.engine;
    const buffer = e.buffers.get(this.name);
    if (!e.ready || !e.ctx || !e.master || !buffer) return;
    const ctx = e.ctx;
    if (!this.level) {
      this.level = ctx.createGain();
      this.level.gain.value = 0;
      this.level.connect(e.master);
    }
    const moving = view.paused ? 0 : speed;
    const k = moving < MIN_SPEED ? 0 : Math.min(1.2, moving / NATURAL_SPEED);
    const now = ctx.currentTime;
    this.level.gain.setTargetAtTime(k === 0 ? 0 : (0.35 + 0.55 * Math.min(1, k)) * (view.tunnel ? 1.25 : 1), now, k === 0 ? 0.6 : 0.3);
    this.rate = 0.75 + 0.25 * Math.min(1.2, k);
    for (const c of this.copies) c.src.playbackRate.setTargetAtTime(this.rate, now, 0.4);
    // keep the loop going while the train moves (and a little after, while it fades)
    this.copies = this.copies.filter(c => c.end > now);
    const last = this.copies[this.copies.length - 1];
    if (k > 0 && (!last || last.end - now < FADE)) this.startCopy(buffer, last ? Math.max(now, last.end - FADE) : now, !last);
  }

  /**
   * Starts one more copy of the loop, fading in, and fading out at its end.
   * @private
   * @param {AudioBuffer} buffer
   * @param {number} at     when it starts
   * @param {boolean} first the very first copy starts at a random point, without a fade
   */
  startCopy(buffer, at, first) {
    const ctx = /** @type {AudioContext} */ (this.engine.ctx);
    const src = ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = this.rate;
    const fade = ctx.createGain();
    const offset = first ? Math.random() * Math.max(0, buffer.duration - FADE * 3) : 0;
    const length = (buffer.duration - offset) / this.rate;
    fade.gain.setValueAtTime(first ? 1 : 0.0001, at);
    if (!first) fade.gain.exponentialRampToValueAtTime(1, at + FADE);
    fade.gain.setValueAtTime(1, at + length - FADE);
    fade.gain.exponentialRampToValueAtTime(0.0001, at + length);
    src.connect(fade).connect(/** @type {GainNode} */ (this.level));
    src.start(at, offset);
    src.stop(at + length + 0.05);
    this.copies.push({ src, fade, end: at + length });
  }
}
