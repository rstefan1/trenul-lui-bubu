/**
 * @file The sound of the train running: a real recording played in a plain
 * loop, softly in the background, always at the same speed (missions slow
 * the train down on purpose, and that must not change how it sounds).
 *
 * It swells in gently when the train sets off and fades out gently on the
 * last stretch before it stops — at a station, at a forest halt, by a child
 * waiting for a gift or in front of a snowdrift — while the brakes squeal
 * until the train stands still, and the air brakes hiss once it does. It also goes quiet while the game waits for
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
    const master = /** @type {GainNode} */ (e.master);
    const now = ctx.currentTime;
    const out = ctx.createGain();
    out.gain.setValueAtTime(0.0001, now);
    out.gain.exponentialRampToValueAtTime(SQUEAL_VOLUME, now + 0.4);
    // heard directly and with a short echo, as between station buildings
    out.connect(master);
    out.connect(echo(ctx, master));
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
        if (!recorded) airHiss(ctx, master, t + 0.35);
      },
    };
  }
}

/** Seconds the synthesised squeal can last (it is stopped when the train stands still). */
const SQUEAL_LENGTH = 6;

/**
 * A slowly wandering value around 1, as a curve for an AudioParam.
 * @param {number} depth  how far it strays (0.1 = ±10%)
 * @param {number} speed  how restless it is
 * @param {number} [n=64] points
 */
function wander(depth, speed, n = 64) {
  const curve = new Float32Array(n);
  let v = 0;
  let drift = 0;
  for (let i = 0; i < n; i++) {
    drift = drift * 0.8 + (Math.random() - 0.5) * speed;
    v = Math.max(-1, Math.min(1, v * 0.92 + drift));
    curve[i] = 1 + v * depth;
  }
  return curve;
}

/**
 * A squeal of steel brakes on steel wheels. The heart of it is how a real
 * squeal is born: the brake shoe sticks to the wheel and slips, hundreds of
 * times a second ("stick-slip"), so the sound is a rough, gritty tone — not
 * a smooth whistle. Each vibration is drawn one by one (a slow push, a
 * sudden slip), its length jitters a little, and the grip comes and goes in
 * quick, uneven grabs. Two wheels squeal (one a little to the left, one to
 * the right, each with its own pitch); their rims colour the tone like
 * small bells, the pitch wanders and rises a little as the train slows, and
 * a dull grinding of the shoes runs underneath. Every squeal is different.
 * @param {AudioContext} ctx
 * @param {AudioNode} out
 * @param {number} t  start time
 * @returns {AudioScheduledSourceNode[]}
 */
function synthSqueal(ctx, out, t) {
  const noise = whiteNoise(ctx);
  /** @type {AudioScheduledSourceNode[]} */
  const sources = [];
  const base = 1750 + Math.random() * 450;
  for (const [detune, pan, level] of [[1, -0.45, 1], [1.09 + Math.random() * 0.06, 0.45, 0.6]]) {
    const panner = ctx.createStereoPanner();
    panner.pan.value = pan;
    panner.connect(out);
    const f0 = base * detune;
    // the stick-slip tone itself
    const src = ctx.createBufferSource();
    src.buffer = stickSlip(ctx, f0, SQUEAL_LENGTH);
    // the wheel's rim colours it: its main ring and an overtone, a little brighter on top
    const body = ctx.createGain();
    for (const [ratio, q, amount] of [[1, 3, 1], [2.02, 5, 0.5], [3.1, 7, 0.22]]) {
      const f = ctx.createBiquadFilter();
      f.type = 'bandpass';
      f.frequency.value = f0 * ratio;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.value = amount;
      src.connect(f).connect(g).connect(body);
    }
    const soft = ctx.createBiquadFilter();
    soft.type = 'lowpass';
    soft.frequency.value = 7000;
    const lvl = ctx.createGain();
    lvl.gain.value = 0.75 * level;
    body.connect(soft).connect(lvl).connect(panner);
    src.start(t);
    sources.push(src);
    // a little ringing metal under the rasp
    const ring = ctx.createBufferSource();
    ring.buffer = noise;
    ring.loop = true;
    const rf = ctx.createBiquadFilter();
    rf.type = 'bandpass';
    rf.frequency.value = f0;
    rf.Q.value = 40;
    const rg = ctx.createGain();
    rg.gain.value = 1.2 * level;
    ring.connect(rf).connect(rg).connect(panner);
    ring.start(t, Math.random());
    sources.push(ring);
  }
  // the duller grinding of the brake shoes underneath
  const grind = ctx.createBufferSource();
  grind.buffer = noise;
  grind.loop = true;
  const gf = ctx.createBiquadFilter();
  gf.type = 'bandpass';
  gf.frequency.value = 900;
  gf.Q.value = 0.9;
  const gg = ctx.createGain();
  gg.gain.setValueCurveAtTime(wander(0.4, 0.8).map(k => 0.14 * k), t, SQUEAL_LENGTH);
  grind.connect(gf).connect(gg).connect(out);
  grind.start(t, Math.random());
  sources.push(grind);
  return sources;
}

/**
 * The stick-slip vibration of a brake shoe on a wheel, drawn one cycle at a
 * time: a slow push (the shoe sticks and bends) and a sudden slip back. The
 * pitch wanders and rises a little over time, each cycle's length jitters,
 * now and then a cycle skips, and the grip comes in quick uneven grabs with
 * short gaps.
 * @param {AudioContext} ctx
 * @param {number} f0       frequency (Hz)
 * @param {number} seconds
 */
function stickSlip(ctx, f0, seconds) {
  const sr = ctx.sampleRate;
  const buffer = ctx.createBuffer(1, Math.round(sr * seconds), sr);
  const d = buffer.getChannelData(0);
  const pitch = wander(0.04, 0.5, 128);
  let phase = 0;
  let jitter = 1;
  let grip = 0;
  let gripTarget = 1;
  let nextGrab = 0;
  for (let i = 0; i < d.length; i++) {
    const u = i / d.length;
    const p = pitch[Math.min(pitch.length - 1, Math.floor(u * pitch.length))];
    const f = f0 * p * (1 + 0.06 * u) * jitter;
    phase += f / sr;
    if (phase >= 1) {
      phase -= 1;
      // the next cycle is a little longer or shorter; rarely the shoe skips one
      jitter = 0.97 + Math.random() * 0.06;
      if (Math.random() < 0.03) phase -= 0.5 + Math.random() * 0.5;
    }
    // quick, uneven grabs of the brake (every 15–45 ms), with short gaps
    if (i >= nextGrab) {
      nextGrab = i + Math.round(sr * (0.015 + Math.random() * 0.03));
      gripTarget = Math.random() < 0.12 ? 0.05 : 0.35 + Math.random() * 0.65;
    }
    grip += (gripTarget - grip) * 0.004;
    // slow push, sudden slip
    const ph = Math.max(0, phase);
    const wave = ph < 0.82 ? (ph / 0.82) * 2 - 1 : 1 - ((ph - 0.82) / 0.18) * 2;
    d[i] = wave * grip;
  }
  return buffer;
}

/**
 * The hiss of the air brakes after the train has stopped ("pshhh").
 * @param {AudioContext} ctx
 * @param {AudioNode} out
 * @param {number} t
 */
function airHiss(ctx, out, t) {
  const src = ctx.createBufferSource();
  src.buffer = whiteNoise(ctx);
  const hp = ctx.createBiquadFilter();
  hp.type = 'highpass';
  hp.frequency.value = 2200;
  const lp = ctx.createBiquadFilter();
  lp.type = 'lowpass';
  lp.frequency.setValueAtTime(9000, t);
  lp.frequency.exponentialRampToValueAtTime(3500, t + 1.6);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.08);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 1.7);
  src.connect(hp).connect(lp).connect(g).connect(out);
  src.start(t, Math.random() * 0.2, 1.8);
}

/** @type {WeakMap<BaseAudioContext, ConvolverNode>} */
const echoCache = new WeakMap();

/**
 * A short echo, as between the buildings and under the roof of a station
 * (a decaying burst of noise used as the room's response). It is made once
 * and feeds the output once; every squeal just connects to it.
 * @param {AudioContext} ctx
 * @param {AudioNode} master
 * @returns {AudioNode} where to send the sound to be echoed
 */
function echo(ctx, master) {
  let node = echoCache.get(ctx);
  if (!node) {
    const seconds = 1.3;
    const ir = ctx.createBuffer(2, Math.round(ctx.sampleRate * seconds), ctx.sampleRate);
    for (let c = 0; c < 2; c++) {
      const d = ir.getChannelData(c);
      for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length) ** 3;
    }
    node = ctx.createConvolver();
    node.buffer = ir;
    const wet = ctx.createGain();
    wet.gain.value = 0.2;
    node.connect(wet).connect(master);
    echoCache.set(ctx, node);
  }
  return node;
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
