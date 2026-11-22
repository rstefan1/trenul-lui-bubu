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
 * Where the train runs changes its sound: in a tunnel it is muffled, louder
 * and echoes off the walls; on a bridge or a viaduct the wheels ring hollow
 * and metallic.
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

/**
 * How each place colours the sound: low-pass cut-off (Hz), metallic ring
 * (dB at 2.4 kHz), hollow boom (dB under 180 Hz), loudness and echo.
 * @type {Record<'open' | 'tunnel' | 'bridge', {cut: number, ring: number, boom: number, loud: number, echo: number}>}
 */
const PLACES = {
  open: { cut: 16000, ring: 0, boom: 0, loud: 1, echo: 0 },
  tunnel: { cut: 1100, ring: 0, boom: 6, loud: 1.7, echo: 0.55 },
  bridge: { cut: 16000, ring: 7, boom: 5, loud: 1.3, echo: 0.08 },
};
/** Seconds the sound takes to change when the train enters or leaves a place. */
const PLACE_SMOOTH = 0.25;

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
    /** @type {{cut: BiquadFilterNode, ring: BiquadFilterNode, boom: BiquadFilterNode, echo: GainNode} | null} */
    this.tone = null;
    /** @type {keyof typeof PLACES | null} */
    this.place = null;
  }

  /**
   * @param {number} speed  stage units per second
   * @param {{paused: boolean, toStop: number, place?: keyof typeof PLACES}} view
   *        toStop: distance to where the train will stop next (∞ if it is not stopping);
   *        place: what the train runs through
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
      this.tone = this.makeTone(ctx, src, this.gate);
      src.start();
    }
    this.setPlace(view.place ?? 'open', now);
    const moving = !view.paused && speed > MIN_SPEED;
    if (moving && this.since === null) this.since = now;
    if (!moving) this.since = null;
    // swell in after setting off, fade out on the way into the stop
    let level = 0;
    if (moving && this.since !== null) {
      level = VOLUME * PLACES[this.place ?? 'open'].loud * Math.min(1, (now - this.since) / FADE_IN);
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
   * The filters that colour the sound by place: source → low-pass →
   * metallic ring → hollow boom → out, plus an echo (a short delay feeding
   * back into itself) mixed in for tunnels.
   * @private
   * @param {AudioContext} ctx
   * @param {AudioNode} src
   * @param {AudioNode} out
   */
  makeTone(ctx, src, out) {
    const cut = ctx.createBiquadFilter();
    cut.type = 'lowpass';
    cut.frequency.value = PLACES.open.cut;
    const ring = ctx.createBiquadFilter();
    ring.type = 'peaking';
    ring.frequency.value = 2400;
    ring.Q.value = 1.4;
    ring.gain.value = 0;
    const boom = ctx.createBiquadFilter();
    boom.type = 'lowshelf';
    boom.frequency.value = 180;
    boom.gain.value = 0;
    src.connect(cut).connect(ring).connect(boom).connect(out);
    const delay = ctx.createDelay(1);
    delay.delayTime.value = 0.11;
    const feedback = ctx.createGain();
    feedback.gain.value = 0.45;
    const echo = ctx.createGain();
    echo.gain.value = 0;
    boom.connect(delay).connect(feedback).connect(delay);
    delay.connect(echo).connect(out);
    return { cut, ring, boom, echo };
  }

  /**
   * Moves the sound's colour towards the place the train is in.
   * @private
   * @param {keyof typeof PLACES} place
   * @param {number} now
   */
  setPlace(place, now) {
    if (place === this.place || !this.tone) return;
    this.place = place;
    const p = PLACES[place];
    this.tone.cut.frequency.setTargetAtTime(p.cut, now, PLACE_SMOOTH);
    this.tone.ring.gain.setTargetAtTime(p.ring, now, PLACE_SMOOTH);
    this.tone.boom.gain.setTargetAtTime(p.boom, now, PLACE_SMOOTH);
    this.tone.echo.gain.setTargetAtTime(p.echo, now, PLACE_SMOOTH);
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
