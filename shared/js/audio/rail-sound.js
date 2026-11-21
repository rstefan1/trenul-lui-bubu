/**
 * @file The sound of the train running: a real recording played in a plain
 * loop, softly in the background, always at the same speed (missions slow
 * the train down on purpose, and that must not change how it sounds).
 *
 * It swells in gently when the train sets off and fades out gently on the
 * last stretch before it stops — at a station, at a forest halt, by a child
 * waiting for a gift or in front of a snowdrift — while the brakes squeal
 * (a recording) until the train stands still. It also goes quiet while the
 * game waits for the player.
 *
 * So that the loop never hitches, the recording is prepared once: the bits
 * of silence an MP3 has at both ends are cut off, and the end is blended
 * into the beginning for a few hundredths of a second.
 */

/** Below this speed the train is considered stopped. */
const MIN_SPEED = 0.5;
/** Volume of the running train: a soft sound in the background, so the whistle stands out. */
const VOLUME = 0.2;
/** Seconds the sound takes to swell in after the train sets off. */
const FADE_IN = 4;
/** Distance before a stop over which the sound fades out (stage units). */
const FADE_OUT = 1900;
/** The brakes start squealing this far from the stop (stage units). */
const SQUEAL_AT = 950;
/** Seconds over which the sound settles to a new level (a gentle, never abrupt change). */
const SMOOTH = 0.4;
/** Volume of the brakes' squeal (heard over the train, softer than the whistle). */
const SQUEAL_VOLUME = 0.35;

export class RailSound {
  /**
   * @param {import('./audio.js').AudioEngine} engine
   * @param {string} name   the running train (registered with the engine)
   * @param {string} brakes the recording of squealing brakes (registered with the engine)
   */
  constructor(engine, name, brakes) {
    this.engine = engine;
    this.name = name;
    this.brakes = brakes;
    /** @type {GainNode | null} */
    this.gate = null;
    /** Time (audio clock) when the train set off; null while it stands. */
    this.since = null;
    /** @type {{stop: () => void} | null} the squeal while it plays */
    this.squeal = null;
    /** The squeal already played on the way into this stop. */
    this.squealed = false;
  }

  /**
   * @param {number} speed  stage units per second
   * @param {{paused: boolean, toStop: number}} view
   *        toStop: distance to where the train will stop next (∞ if it is not stopping)
   */
  update(speed, view) {
    const e = this.engine;
    const buffer = e.buffers.get(this.name);
    if (!e.ready || !e.ctx || !e.master || !buffer) return;
    const ctx = e.ctx;
    const now = ctx.currentTime;
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
    const moving = !view.paused && speed > MIN_SPEED;
    if (moving && this.since === null) this.since = now;
    if (!moving) this.since = null;
    // swell in after setting off, fade out on the way into the stop
    let level = 0;
    if (moving && this.since !== null) {
      level = VOLUME * Math.min(1, (now - this.since) / FADE_IN);
      if (view.toStop < FADE_OUT) level *= Math.max(0, view.toStop / FADE_OUT);
    }
    this.gate.gain.setTargetAtTime(level, now, SMOOTH);

    // the brakes squeal on the last metres before the train stands still
    if (!moving || view.toStop > SQUEAL_AT * 2) this.squealed = false;
    if (!this.squeal && !this.squealed && moving && view.toStop < SQUEAL_AT) {
      this.squealed = true;
      this.squeal = this.startSqueal();
    }
    if (this.squeal && !moving) {
      this.squeal.stop();
      this.squeal = null;
    }
  }

  /**
   * Starts the recorded squeal of the brakes (nothing if it is not loaded).
   * @private
   * @returns {{stop: () => void} | null}
   */
  startSqueal() {
    const e = this.engine;
    const recorded = e.buffers.get(this.brakes);
    if (!recorded || !e.ctx || !e.master) return null;
    const ctx = e.ctx;
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(SQUEAL_VOLUME, now + 0.25);
    out.connect(e.master);
    const src = ctx.createBufferSource();
    src.buffer = recorded;
    src.loop = true;   // a long braking never runs out of squeal
    src.connect(out);
    src.start(now);
    return {
      stop() {
        const t = ctx.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), t);
        out.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        src.stop(t + 1.25);
      },
    };
  }
}

/** Seconds of the recording's end blended into its beginning (just enough to hide the joint). */
const BLEND = 0.04;
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
