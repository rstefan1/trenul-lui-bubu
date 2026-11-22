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
 */

import { makeSeamless } from './seamless.js';

/**
 * @typedef {object} AmbienceLayer
 * @property {string} sound   a recording registered with the engine
 * @property {number} level   0..1
 *
 * @typedef {object} Place
 * @property {AmbienceLayer[]} layers
 */

/** Seconds to fade a place in, and out. */
const FADE_IN = 2.5;
const FADE_OUT = 2;
/** Seconds of blend at the loop's joint (long: these sounds change all the time). */
const LOOP_BLEND = 1.5;

export class Ambience {
  /** @param {import('./audio.js').AudioEngine} engine */
  constructor(engine) {
    this.engine = engine;
    /** @type {Place | null} the place being heard */
    this.place = null;
    /** @type {Array<{gain: GainNode, src: AudioBufferSourceNode}>} its layers while they play */
    this.playing = [];
    /** @type {Map<string, AudioBuffer>} recordings already prepared for looping */
    this.loops = new Map();
  }

  /**
   * Called every frame with the place that should be heard (null: none).
   * Nothing happens while the place stays the same.
   * @param {Place | null} place
   */
  update(place) {
    const e = this.engine;
    if (!e.ready || !e.ctx || !e.master || place === this.place) return;
    // wait until every recording of the new place is loaded
    if (place && !place.layers.every(l => e.buffers.has(l.sound))) return;
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
    if (!place) return;
    for (const layer of place.layers) {
      const buffer = this.loopOf(ctx, layer.sound);
      const src = ctx.createBufferSource();
      src.buffer = buffer;
      src.loop = true;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(layer.level, now + FADE_IN);
      src.connect(gain).connect(e.master);
      src.start(now, Math.random() * buffer.duration);
      this.playing.push({ gain, src });
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
    }
    return b;
  }
}
