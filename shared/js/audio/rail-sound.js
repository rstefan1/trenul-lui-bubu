/**
 * @file The sound of the train running: a real recording played in a plain
 * loop, softly in the background, always at the same speed and volume
 * whatever the train's speed
 * (missions slow the train down on purpose, and that must not change how
 * it sounds). It is heard while the train moves and goes quiet while it
 * stands or while the game waits for the player. It starts with the first
 * turn of the wheels when the train leaves a station.
 *
 * So that the loop never hitches, the recording is prepared once: the bits
 * of silence an MP3 has at both ends are cut off, and its last fraction of
 * a second is blended into its beginning, so the end flows straight into
 * the start.
 */

/** Below this speed the train is considered stopped. */
const MIN_SPEED = 0.5;
/** Volume of the running train: a soft sound in the background, so the whistle stands out. */
const VOLUME = 0.3;
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
      src.buffer = makeSeamless(ctx, buffer);
      src.loop = true;
      src.connect(this.gate);
      src.start();
    }
    const on = !view.paused && speed > MIN_SPEED;
    if (on === this.on) return;
    this.on = on;
    this.gate.gain.setTargetAtTime(on ? VOLUME : 0, ctx.currentTime, SWITCH / 3);
  }
}

/** Seconds of the recording's end blended into its beginning. */
const BLEND = 0.2;
/** Samples quieter than this at both ends count as the MP3's padding. */
const SILENCE = 0.003;

/**
 * A copy of a recording that loops without a seam: the padding at both
 * ends is trimmed and the end is blended into the beginning (equal power).
 * @param {AudioContext} ctx
 * @param {AudioBuffer} src
 * @returns {AudioBuffer}
 */
function makeSeamless(ctx, src) {
  const channels = Array.from({ length: src.numberOfChannels }, (_, c) => src.getChannelData(c));
  const loud = (/** @type {number} */ i) => channels.some(d => Math.abs(d[i]) > SILENCE);
  let start = 0;
  while (start < src.length - 1 && !loud(start)) start++;
  let end = src.length - 1;
  while (end > start && !loud(end)) end--;
  const usable = end - start + 1;
  const blend = Math.min(Math.round(BLEND * src.sampleRate), Math.floor(usable / 4));
  const length = usable - blend;
  if (blend < 2 || length < 2) return src;
  const out = ctx.createBuffer(src.numberOfChannels, length, src.sampleRate);
  channels.forEach((d, c) => {
    const o = out.getChannelData(c);
    for (let i = 0; i < length; i++) o[i] = d[start + i];
    // the tail (just after the loop's end) fades out over the head, which fades in
    for (let i = 0; i < blend; i++) {
      const k = i / blend;
      o[i] = d[start + i] * Math.sqrt(k) + d[start + length + i] * Math.sqrt(1 - k);
    }
  });
  return out;
}
