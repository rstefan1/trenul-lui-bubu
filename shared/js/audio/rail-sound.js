/**
 * @file The sound of the train running: a real recording played in a plain
 * loop, softly in the background, always at the same speed (missions slow
 * the train down on purpose, and that must not change how it sounds).
 *
 * It swells in gently when the train sets off and fades out gently on the
 * last stretch before it stops — at a station, at a forest halt, by a child
 * waiting for a gift or in front of a snowdrift — while the brakes squeal
 * until the train stands still. It also goes quiet while the game waits for
 * the player.
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
/** Volume of the squeal (heard over the train, softer than the whistle). */
const SQUEAL_VOLUME = 0.35;

export class RailSound {
  /**
   * @param {import('./audio.js').AudioEngine} engine
   * @param {string} name   the running train (registered with the engine)
   * @param {string} brakes an optional recording of squealing brakes
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
   * Starts the squeal: the recording if there is one, otherwise a squeal
   * synthesised from noise (see synthSqueal).
   * @private
   * @returns {{stop: () => void}}
   */
  startSqueal() {
    const e = this.engine;
    const ctx = /** @type {AudioContext} */ (e.ctx);
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(SQUEAL_VOLUME, now + 0.4);
    out.connect(/** @type {GainNode} */ (e.master));
    /** @type {AudioScheduledSourceNode[]} */
    const sources = [];
    const recorded = e.buffers.get(this.brakes);
    if (recorded) {
      const src = ctx.createBufferSource();
      src.buffer = recorded;
      src.loop = true;
      src.connect(out);
      src.start(now);
      sources.push(src);
    } else {
      sources.push(...synthSqueal(ctx, out, now));
    }
    return {
      stop() {
        const t = ctx.currentTime;
        out.gain.cancelScheduledValues(t);
        out.gain.setValueAtTime(Math.max(0.0001, out.gain.value), t);
        out.gain.exponentialRampToValueAtTime(0.0001, t + 1.2);
        for (const s of sources) s.stop(t + 1.25);
      },
    };
  }
}

/** Seconds the synthesised squeal can last (it is stopped when the train stands still). */
const SQUEAL_LENGTH = 6;

/**
 * A squeal of steel brakes on steel wheels, made the way the real one
 * sounds: noise "singing" through a few narrow resonances (the wheel rings
 * like a bell), whose pitch slides and wavers irregularly, whose loudness
 * flutters (the brake shoe sticks and slips), over a duller grinding.
 * Every squeal is a little different.
 * @param {AudioContext} ctx
 * @param {AudioNode} out
 * @param {number} t  start time
 * @returns {AudioScheduledSourceNode[]}
 */
function synthSqueal(ctx, out, t) {
  const noise = whiteNoise(ctx);
  /** @type {AudioScheduledSourceNode[]} */
  const sources = [];
  /** A slowly wandering value around 1 (for pitch and loudness), as a curve. */
  const wander = (/** @type {number} */ depth, /** @type {number} */ speed) => {
    const n = 64;
    const curve = new Float32Array(n);
    let v = 0;
    let drift = 0;
    for (let i = 0; i < n; i++) {
      drift = drift * 0.8 + (Math.random() - 0.5) * speed;
      v = Math.max(-1, Math.min(1, v * 0.92 + drift));
      curve[i] = 1 + v * depth;
    }
    return curve;
  };
  const base = 2350 + Math.random() * 500;
  const pitch = wander(0.035, 0.5);
  // the singing resonances of the wheel (a main one and two overtones)
  for (const [ratio, q, level] of [[1, 42, 1], [1.61, 55, 0.45], [2.43, 60, 0.22]]) {
    const src = ctx.createBufferSource();
    src.buffer = noise;
    src.loop = true;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass';
    f.Q.value = q;
    const curve = pitch.map(k => base * ratio * k);
    // the squeal rises a little as the train slows down
    for (let i = 0; i < curve.length; i++) curve[i] *= 1 + 0.05 * (i / curve.length);
    f.frequency.setValueCurveAtTime(curve, t, SQUEAL_LENGTH);
    const g = ctx.createGain();
    g.gain.setValueCurveAtTime(wander(0.45, 0.9).map(k => Math.max(0.05, k) * level * 6), t, SQUEAL_LENGTH);
    src.connect(f).connect(g).connect(out);
    src.start(t, Math.random());
    sources.push(src);
  }
  // the duller grinding of the brake shoes underneath
  const grind = ctx.createBufferSource();
  grind.buffer = noise;
  grind.loop = true;
  const gf = ctx.createBiquadFilter();
  gf.type = 'bandpass';
  gf.frequency.value = 1100;
  gf.Q.value = 0.8;
  const gg = ctx.createGain();
  gg.gain.value = 0.12;
  grind.connect(gf).connect(gg).connect(out);
  grind.start(t, Math.random());
  sources.push(grind);
  return sources;
}

/** @type {WeakMap<BaseAudioContext, AudioBuffer>} */
const noiseCache = new WeakMap();

/**
 * Two seconds of white noise (made once per audio context).
 * @param {AudioContext} ctx
 */
function whiteNoise(ctx) {
  let buffer = noiseCache.get(ctx);
  if (!buffer) {
    buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buffer.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseCache.set(ctx, buffer);
  }
  return buffer;
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
