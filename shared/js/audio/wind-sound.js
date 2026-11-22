/**
 * @file The wind of the snowstorm: a howl that rises and falls on its own,
 * heard only when it snows hard, and the louder the harder it snows.
 *
 * It is made of noise through a narrow filter whose pitch wanders slowly
 * (that wandering is what makes it "howl"), with a second, deeper layer of
 * rushing air. A recording registered as "wind" is looped instead, if
 * there is one.
 *
 * The wind is only built while a storm can be heard: once it has died away
 * it is taken apart, and built again at the next storm.
 */

/** Snowfall intensity (0..2) from which the wind can be heard, and where it is loudest. */
const FROM = 0.9;
const FULL = 2;
/** Loudest volume of the wind. */
const VOLUME = 0.16;
/** Seconds over which the wind follows the snowfall. */
const SMOOTH = 1.5;

export class WindSound {
  /** @param {import('./audio.js').AudioEngine} engine */
  constructor(engine) {
    this.engine = engine;
    /** @type {GainNode | null} */
    this.gain = null;
    /** @type {BiquadFilterNode | null} the howl's filter (its pitch wanders) */
    this.howl = null;
    /** @type {AudioBufferSourceNode | null} */
    this.src = null;
    this.level = -1;
    this.nextGust = 0;
    /** Audio time when the wind will have died away (null while it blows). */
    this.silentAt = /** @type {number | null} */ (null);
  }

  /**
   * Called every frame.
   * @param {number} intensity  snowfall, 0..2 (2 = blizzard)
   * @param {boolean} paused
   */
  update(intensity, paused) {
    const e = this.engine;
    if (!e.ready || !e.ctx || !e.master) return;
    const ctx = e.ctx;
    const now = ctx.currentTime;
    const level = paused ? 0 : VOLUME * Math.max(0, Math.min(1, (intensity - FROM) / (FULL - FROM)));
    if (!this.gain) {
      if (level <= 0) return;   // nothing is built before the first storm
      this.build(ctx, e.master);
    }
    const gain = /** @type {GainNode} */ (this.gain);
    if (Math.abs(level - this.level) > 0.002) {
      this.level = level;
      gain.gain.setTargetAtTime(level, now, SMOOTH);
      // setTargetAtTime is practically silent after about five time constants
      this.silentAt = level > 0 ? null : now + SMOOTH * 5;
    }
    if (this.silentAt !== null && now >= this.silentAt) {
      this.takeApart();
      return;
    }
    // the howl's pitch drifts to a new note every few seconds
    if (this.howl && now > this.nextGust) {
      this.nextGust = now + 1.5 + Math.random() * 2.5;
      this.howl.frequency.setTargetAtTime(380 + Math.random() * 520, now, 0.9);
    }
  }

  /**
   * The wind has died away: stop it and let its parts go.
   * @private
   */
  takeApart() {
    this.src?.stop();
    this.gain?.disconnect();
    this.src = null;
    this.gain = null;
    this.howl = null;
    this.level = -1;
    this.silentAt = null;
  }

  /**
   * @private
   * @param {AudioContext} ctx
   * @param {AudioNode} out
   */
  build(ctx, out) {
    this.gain = ctx.createGain();
    this.gain.gain.value = 0;
    this.gain.connect(out);
    const src = ctx.createBufferSource();
    src.loop = true;
    this.src = src;
    const recording = this.engine.buffers.get('wind');
    if (recording) {
      src.buffer = recording;
      src.connect(this.gain);
    } else {
      // three seconds of noise, looped
      const b = ctx.createBuffer(1, ctx.sampleRate * 3, ctx.sampleRate);
      const d = b.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
      src.buffer = b;
      this.howl = ctx.createBiquadFilter();
      this.howl.type = 'bandpass';
      this.howl.frequency.value = 500;
      this.howl.Q.value = 6;
      const howlGain = ctx.createGain();
      howlGain.gain.value = 1.4;
      src.connect(this.howl).connect(howlGain).connect(this.gain);
      const rush = ctx.createBiquadFilter();
      rush.type = 'lowpass';
      rush.frequency.value = 600;
      const rushGain = ctx.createGain();
      rushGain.gain.value = 0.5;
      src.connect(rush).connect(rushGain).connect(this.gain);
    }
    src.start();
  }
}
