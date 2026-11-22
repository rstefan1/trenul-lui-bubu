/**
 * @file The sound of a place: a quiet bed of recordings, looped, under the
 * missions of a station — the murmur of a station platform, a town square
 * in the evening, the wind on a fortress wall, a railway yard at night.
 *
 * A place is a list of layers (a recording and its volume). When the place
 * changes, the old layers fade out and the new ones fade in, slowly, so the
 * child hears where they are without noticing a sound "start". Every
 * recording is prepared once to loop without a seam, and starts from a
 * random point, so the same place never sounds exactly the same twice.
 *
 * The volumes are relative to a reference sound — the train running — so a
 * place is never louder than the journey itself: each recording is measured
 * (its average loudness, RMS) and scaled so that level 1 is exactly as loud
 * as the reference. Recordings made louder or softer need no new numbers.
 *
 * A place can also have events: short sounds that happen now and then, at
 * random moments and from a random side — a sleigh going by, steps
 * in the snow, a bird. They are played by the game's sound effects (the ambience
 * only decides when).
 */

import { makeSeamless } from './seamless.js';

/**
 * @typedef {object} AmbienceLayer
 * @property {string} sound   a recording registered with the engine
 * @property {number} level   1 = as loud as the reference (the running train)
 *
 * @typedef {object} AmbienceEvent
 * @property {string} sound            a sound effect (see effects.js)
 * @property {[number, number]} every  seconds between two of them (at random in this range)
 * @property {[number, number]} [first] seconds before the first one (default: `every`)
 * @property {number} [gain=1]         volume, relative to the effect's own
 * @property {number} [spread=0.6]     how far to the sides it may come from (0 = centre)
 *
 * @typedef {object} Place
 * @property {AmbienceLayer[]} layers
 * @property {AmbienceEvent[]} [events]
 */

/** Seconds to fade a place in, and out. */
const FADE_IN = 2.5;
const FADE_OUT = 2;
/** Seconds of blend at the loop's joint (long: these sounds change all the time). */
const LOOP_BLEND = 1.5;

export class Ambience {
  /**
   * @param {import('./audio.js').AudioEngine} engine
   * @param {{sound: string, volume: number}} reference  the sound the places are
   *        matched to, and the volume it is played at (e.g. the running train)
   * @param {(sound: string, o: {gain: number, pan: number}) => void} [playEvent]
   *        plays one event of a place
   */
  constructor(engine, reference, playEvent = () => {}) {
    this.engine = engine;
    this.reference = reference;
    this.playEvent = playEvent;
    /** @type {Array<{event: AmbienceEvent, at: number}>} when each event of the place happens next */
    this.timers = [];
    /** @type {Map<string, number>} the gain that makes each recording as loud as the reference */
    this.match = new Map();
    /** @type {Place | null} the place being heard */
    this.place = null;
    /** @type {Array<{gain: GainNode, src: AudioBufferSourceNode}>} its layers while they play */
    this.playing = [];
    /** @type {Map<string, AudioBuffer>} recordings already prepared for looping */
    this.loops = new Map();
  }

  /**
   * Called every frame with the place that should be heard (null: none).
   * @param {Place | null} place
   */
  update(place) {
    const e = this.engine;
    if (!e.ready || !e.ctx || !e.master) return;
    if (place === this.place) {
      this.events(e.ctx.currentTime);
      return;
    }
    // wait until every recording of the new place (and the reference) is loaded
    if (place && ![...place.layers.map(l => l.sound), this.reference.sound].every(s => e.buffers.has(s))) return;
    const ctx = e.ctx;
    const now = ctx.currentTime;
    for (const { gain, src } of this.playing) {
      gain.gain.cancelScheduledValues(now);
      gain.gain.setValueAtTime(gain.gain.value, now);
      gain.gain.linearRampToValueAtTime(0, now + FADE_OUT);
      src.stop(now + FADE_OUT + 0.05);
    }
    this.playing = [];
    this.place = place;
    this.timers = (place?.events ?? []).map(event => ({ event, at: now + between(event.first ?? event.every) }));
    if (!place) return;
    for (const layer of place.layers) {
      const buffer = this.loopOf(ctx, layer.sound);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(layer.level * (this.match.get(layer.sound) ?? 1), now + FADE_IN);
      src.connect(gain).connect(e.master);
      src.start(now, Math.random() * buffer.duration);
      this.playing.push({ gain, src });
    }
  }

  /**
   * Plays the events whose time has come, and plans the next ones.
   * @private
   * @param {number} now
   */
  events(now) {
    for (const timer of this.timers) {
      if (now < timer.at) continue;
      const { event } = timer;
      const spread = event.spread ?? 0.6;
      this.playEvent(event.sound, { gain: event.gain ?? 1, pan: (Math.random() * 2 - 1) * spread });
      timer.at = now + between(event.every);
    }
  }

  /**
   * A recording prepared for looping (done once per recording).
   * @private
   * @param {AudioContext} ctx
   * @param {string} name
   */
  loopOf(ctx, name) {
    let b = this.loops.get(name);
    if (!b) {
      b = makeSeamless(ctx, /** @type {AudioBuffer} */ (this.engine.buffers.get(name)), LOOP_BLEND);
      this.loops.set(name, b);
      const ref = /** @type {AudioBuffer} */ (this.engine.buffers.get(this.reference.sound));
      const target = rms(ref) * this.reference.volume;
      const own = rms(/** @type {AudioBuffer} */ (this.engine.buffers.get(name)));
      if (own > 1e-6) this.match.set(name, Math.min(4, target / own));
    }
    return b;
  }
}

/**
 * Average loudness of a recording (root mean square of all its samples).
 * @param {AudioBuffer} buffer
 */
function rms(buffer) {
  let sum = 0;
  let n = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < d.length; i += 4) {   // every 4th sample is plenty for an average
      sum += d[i] * d[i];
      n++;
    }
  }
  return n ? Math.sqrt(sum / n) : 0;
}

/**
 * A random number in a range.
 * @param {[number, number]} range
 */
const between = ([a, b]) => a + Math.random() * (b - a);
