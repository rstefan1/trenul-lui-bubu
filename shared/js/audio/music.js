/**
 * @file The Christmas music: songs played note by note on a music box, with
 * a soft bass and, for the jingle song, sleigh bells.
 *
 * The notes are scheduled a little ahead on the audio clock (so the rhythm
 * stays exact even if the game stutters), and the song loops. Only one song
 * plays at a time; switching songs fades the old one out and starts the new
 * one from its beginning. The volume follows what is on screen (louder on
 * the menu and the chapter screens, very soft while the train runs).
 */

/** How far ahead notes are scheduled (seconds). */
const LOOKAHEAD = 0.35;
/** Seconds to fade between songs or to a new volume. */
const FADE = 1.2;

/** Semitones of the note names. */
const STEPS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * Frequency of a note name like "C5" or "F#4".
 * @param {string} name
 */
function freqOf(name) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) return 440;
  const semis = STEPS[/** @type {keyof typeof STEPS} */ (m[1])] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = (Number(m[3]) + 1) * 12 + semis;
  return 440 * 2 ** ((midi - 69) / 12);
}

export class Music {
  /** @param {import('./audio.js').AudioEngine} engine */
  constructor(engine) {
    this.engine = engine;
    /** @type {{song: import('./songs.js').Song, gain: GainNode, index: number, time: number, beat: number} | null} */
    this.current = null;
    /** @type {AudioBuffer | null} */
    this.noise = null;
    this.level = 0;
  }

  /**
   * Called every frame: which song should be heard, and how loud.
   * @param {import('./songs.js').Song | null} song
   * @param {number} level  0..1
   */
  update(song, level) {
    const e = this.engine;
    if (!e.ctx || !e.master || e.ctx.state !== 'running') return;
    const ctx = e.ctx;
    const audible = e.ready && !e.musicOff;
    const target = audible && song ? level : 0;
    if (song && (!this.current || this.current.song !== song)) this.start(song);
    if (!this.current) return;
    if (Math.abs(target - this.level) > 0.001) {
      this.level = target;
      this.current.gain.gain.setTargetAtTime(target, ctx.currentTime, FADE / 3);
    }
    this.schedule();
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
    gain.connect(/** @type {GainNode} */ (this.engine.master));
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
   * One note of the music box: a bright, bell-like tone that rings and fades.
   * @private
   * @param {number} f
   * @param {number} t
   * @param {AudioNode} out
   * @param {number} length  seconds the note is meant to last
   */
  bell(f, t, out, length) {
    const ctx = /** @type {AudioContext} */ (this.engine.ctx);
    const decay = Math.max(0.6, Math.min(2.2, length * 2.2));
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.22, t + 0.004);
    g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    g.connect(out);
    for (const [ratio, amount] of [[1, 1], [2, 0.32], [3, 0.1], [4.16, 0.06]]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f * ratio;
      const pg = ctx.createGain();
      pg.gain.value = amount;
      osc.connect(pg).connect(g);
      osc.start(t);
      osc.stop(t + decay + 0.05);
    }
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
