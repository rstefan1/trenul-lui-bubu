/**
 * @file The Christmas music: songs played note by note on a music box, with
 * a soft bass and, for the jingle song, sleigh bells.
 *
 * The notes are scheduled a little ahead on the audio clock (so the rhythm
 * stays exact even if the game stutters), and the song loops. Only one song
 * plays at a time; switching songs fades the old one out and starts the new
 * one from its beginning. What plays, and how loud, is decided every frame
 * by the game (carols on the menus, silence on the way).
 *
 * A song can also be heard "from afar" — from a Christmas fair or a town
 * square down the street: it is then muffled (the high notes are lost on
 * the way, as in real life) and comes in more slowly.
 */

import { freqOf, musicBox } from './instruments.js';

/** How far ahead notes are scheduled (seconds). */
const LOOKAHEAD = 0.35;
/** Seconds to fade between songs or to a new volume. */
const FADE = 1.2;
/** Coming from afar: the muffling (low-pass, Hz) and the slower fade (seconds). */
const FAR_CUTOFF = 1400;
const FAR_FADE = 3.5;

export class Music {
  /** @param {import('./audio.js').AudioEngine} engine */
  constructor(engine) {
    this.engine = engine;
    /** @type {{song: import('./songs.js').Song, gain: GainNode, index: number, time: number, beat: number} | null} */
    this.current = null;
    /** @type {AudioBuffer | null} */
    this.noise = null;
    this.level = 0;
    /** @type {BiquadFilterNode | null} muffles the music heard from afar */
    this.tone = null;
    this.far = false;
  }

  /**
   * Called every frame: which song should be heard, and how loud.
   * @param {import('./songs.js').Song | null} song
   * @param {number} level  0..1
   * @param {{far?: boolean}} [o]  far: heard from afar (muffled, slower to come in)
   */
  update(song, level, o = {}) {
    const e = this.engine;
    if (!e.ctx || !e.musicBus || e.ctx.state !== 'running') return;
    const ctx = e.ctx;
    const audible = e.ready && !e.musicOff;
    const target = audible && song ? level : 0;
    const far = !!o.far;
    if (far !== this.far) {
      this.far = far;
      this.output().frequency.setTargetAtTime(far ? FAR_CUTOFF : 20000, ctx.currentTime, 0.3);
    }
    if (song && (!this.current || this.current.song !== song)) this.start(song);
    if (!this.current) return;
    if (Math.abs(target - this.level) > 0.001) {
      this.level = target;
      this.current.gain.gain.setTargetAtTime(target, ctx.currentTime, (far ? FAR_FADE : FADE) / 3);
    }
    this.schedule();
  }

  /**
   * Where the songs go: through the muffling filter to the music bus.
   * @private
   */
  output() {
    if (!this.tone) {
      const ctx = /** @type {AudioContext} */ (this.engine.ctx);
      this.tone = ctx.createBiquadFilter();
      this.tone.type = 'lowpass';
      this.tone.frequency.value = 20000;
      this.tone.connect(/** @type {GainNode} */ (this.engine.musicBus));
    }
    return this.tone;
  }

  /**
   * @private
   * @param {import('./songs.js').Song} song
   */
  start(song) {
    const ctx = /** @type {AudioContext} */ (this.engine.ctx);
    if (this.current) {
      const old = this.current.gain;
      old.gain.setTargetAtTime(0, ctx.currentTime, FADE / 3);
      setTimeout(() => old.disconnect(), FADE * 4000);
    }
    const gain = ctx.createGain();
    gain.gain.value = 0;
    gain.connect(this.output());
    this.current = { song, gain, index: 0, time: ctx.currentTime + 0.1, beat: 0 };
    this.level = 0;
  }

  /** @private Schedules the notes that start within the next moment. */
  schedule() {
    const c = /** @type {NonNullable<Music['current']>} */ (this.current);
    const ctx = /** @type {AudioContext} */ (this.engine.ctx);
    const spb = 60 / c.song.tempo;
    // after a long pause (hidden tab), do not try to catch up: start again soon
    if (c.time < ctx.currentTime - 0.5) c.time = ctx.currentTime + 0.05;
    while (c.time < ctx.currentTime + LOOKAHEAD) {
      const [note, beats] = c.song.notes[c.index];
      if (note) this.bell(freqOf(note), c.time, c.gain, beats * spb);
      // on the grid of half beats inside this note: the bass on the first beat
      // of every bar, the sleigh bells on every half beat
      const from = c.beat - c.song.pickup;
      for (let at = Math.ceil(from * 2 - 1e-9) / 2; at < from + beats - 1e-9; at += 0.5) {
        if (at < 0) continue;
        const t = c.time + (at - from) * spb;
        if (Math.abs(at % c.song.bar) < 1e-6) {
          const root = c.song.chords[Math.round(at / c.song.bar)];
          if (root) this.bass(freqOf(`${root}3`), t, c.gain, c.song.bar * spb);
        }
        if (c.song.sleighBells) this.jingle(t, c.gain, Math.abs(at % 1) < 1e-6);
      }
      c.time += beats * spb;
      c.beat += beats;
      c.index += 1;
      if (c.index >= c.song.notes.length) {
        c.index = 0;
        c.beat = 0;
      }
    }
  }

  /**
   * One note of the music box.
   * @private
   * @param {number} f
   * @param {number} t
   * @param {AudioNode} out
   * @param {number} length  seconds the note is meant to last
   */
  bell(f, t, out, length) {
    musicBox(/** @type {AudioContext} */ (this.engine.ctx), out, f, t, length);
  }

  /**
   * A soft, round bass note.
   * @private
   * @param {number} f
   * @param {number} t
   * @param {AudioNode} out
   * @param {number} length
   */
  bass(f, t, out, length) {
    const ctx = /** @type {AudioContext} */ (this.engine.ctx);
    const osc = ctx.createOscillator();
    osc.type = 'triangle';
    osc.frequency.value = f;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.09, t + 0.02);
    g.gain.exponentialRampToValueAtTime(0.0001, t + Math.min(2.5, length));
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + Math.min(2.5, length) + 0.05);
  }

  /**
   * A shake of sleigh bells: a few tiny high bells and a rattle.
   * @private
   * @param {number} t
   * @param {AudioNode} out
   * @param {boolean} accent  on the beat (a little louder)
   */
  jingle(t, out, accent) {
    const ctx = /** @type {AudioContext} */ (this.engine.ctx);
    const level = accent ? 0.05 : 0.03;
    const g = ctx.createGain();
    g.gain.value = level;
    g.connect(out);
    for (let i = 0; i < 4; i++) {
      const start = t + Math.random() * 0.025;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = 4800 + Math.random() * 3600;
      const og = ctx.createGain();
      og.gain.setValueAtTime(0.0001, start);
      og.gain.exponentialRampToValueAtTime(0.5, start + 0.002);
      og.gain.exponentialRampToValueAtTime(0.0001, start + 0.18);
      osc.connect(og).connect(g);
      osc.start(start);
      osc.stop(start + 0.2);
    }
    const src = ctx.createBufferSource();
    src.buffer = this.rattleNoise(ctx);
    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 6500;
    const ng = ctx.createGain();
    ng.gain.setValueAtTime(0.0001, t);
    ng.gain.exponentialRampToValueAtTime(0.6, t + 0.004);
    ng.gain.exponentialRampToValueAtTime(0.0001, t + 0.09);
    src.connect(hp).connect(ng).connect(g);
    src.start(t, Math.random() * 0.4, 0.12);
  }

  /**
   * Half a second of noise for the bells' rattle (made once).
   * @private
   * @param {AudioContext} ctx
   */
  rattleNoise(ctx) {
    if (!this.noise) {
      this.noise = ctx.createBuffer(1, Math.round(ctx.sampleRate * 0.5), ctx.sampleRate);
      const d = this.noise.getChannelData(0);
      for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    }
    return this.noise;
  }
}
