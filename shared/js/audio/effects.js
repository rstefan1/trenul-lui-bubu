/**
 * @file The game's short sound effects: a mission won, each star, a gentle
 * "oops", a button click and the little fanfares at the end of a chapter
 * and of the journey.
 *
 * They are all played on the same music box and hand bell as the carols, so
 * every sound in the game belongs to the same family of small metal bells.
 * A recording registered with the effect's name (e.g. "success") is played
 * instead, if there is one, so any effect can later be replaced by a file.
 */

import { freqOf, handBell, musicBox } from './instruments.js';

/**
 * A melody for the music box: [note, start beat, length in beats].
 * @typedef {Array<[string, number, number]>} Phrase
 */

/** A quick rising arpeggio: the mission is won. @type {Phrase} */
const SUCCESS = [['C5', 0, 1], ['E5', 1, 1], ['G5', 2, 1], ['C6', 3, 3]];
/** The high bell of each star, rising (first, second, third). */
const STAR_NOTES = ['E6', 'G6', 'C7'];
/** Two soft falling notes, low and quiet: not a buzzer. @type {Phrase} */
const OOPS = [['E4', 0, 1], ['C4', 1, 2]];
/** End of a chapter: a small fanfare. @type {Phrase} */
const CHAPTER = [
  ['G4', 0, 1], ['C5', 1, 1], ['E5', 2, 1], ['G5', 3, 2],
  ['E5', 5, 1], ['G5', 6, 4],
];
/** End of the journey: a longer fanfare, with the bells joining in. @type {Phrase} */
const FINALE = [
  ['C5', 0, 1], ['E5', 1, 1], ['G5', 2, 1], ['C6', 3, 2],
  ['G5', 5, 1], ['C6', 6, 1], ['E6', 7, 2],
  ['D6', 9, 1], ['C6', 10, 1], ['G5', 11, 1], ['C6', 12, 4],
];

/**
 * Whether the engine can make a sound now; plays the recording instead
 * when there is one.
 * @param {import('./audio.js').AudioEngine | undefined} engine
 * @param {string} name
 * @returns {engine is import('./audio.js').AudioEngine & {ctx: AudioContext, master: GainNode}}
 *   true when the synthesised version should be played
 */
function synthesise(engine, name) {
  if (!engine?.ready || !engine.ctx || !engine.master) return false;
  if (engine.canPlay(name)) {
    engine.play(name);
    return false;
  }
  return true;
}

/**
 * Plays a phrase on the music box.
 * @param {AudioContext} ctx
 * @param {AudioNode} out
 * @param {Phrase} phrase
 * @param {number} beat   seconds per beat
 * @param {number} level
 */
function playPhrase(ctx, out, phrase, beat, level) {
  const t = ctx.currentTime + 0.01;
  for (const [note, at, length] of phrase) musicBox(ctx, out, freqOf(note), t + at * beat, length * beat, level);
}

/**
 * A mission is won.
 * @param {import('./audio.js').AudioEngine | undefined} engine
 */
export function successSound(engine) {
  if (synthesise(engine, 'success')) playPhrase(engine.ctx, engine.master, SUCCESS, 0.09, 0.2);
}

/**
 * One star of the result (0 = the first), each a little higher.
 * @param {import('./audio.js').AudioEngine | undefined} engine
 * @param {number} index
 */
export function starSound(engine, index) {
  if (!synthesise(engine, 'star')) return;
  const note = STAR_NOTES[Math.min(index, STAR_NOTES.length - 1)];
  handBell(engine.ctx, engine.master, freqOf(note), engine.ctx.currentTime + 0.005, 0.12);
}

/**
 * A gentle "oops" for a wrong choice.
 * @param {import('./audio.js').AudioEngine | undefined} engine
 */
export function oopsSound(engine) {
  if (synthesise(engine, 'oops')) playPhrase(engine.ctx, engine.master, OOPS, 0.13, 0.16);
}

/**
 * A soft click for a button: a tiny wooden "tock".
 * @param {import('./audio.js').AudioEngine | undefined} engine
 */
export function clickSound(engine) {
  if (!synthesise(engine, 'click')) return;
  const ctx = engine.ctx;
  const t = ctx.currentTime + 0.005;
  const osc = ctx.createOscillator();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(1500, t);
  osc.frequency.exponentialRampToValueAtTime(700, t + 0.04);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(0.12, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 0.06);
  osc.connect(g).connect(engine.master);
  osc.start(t);
  osc.stop(t + 0.08);
}

/**
 * A chapter is finished.
 * @param {import('./audio.js').AudioEngine | undefined} engine
 */
export function chapterSound(engine) {
  if (synthesise(engine, 'chapter-end')) playPhrase(engine.ctx, engine.master, CHAPTER, 0.16, 0.22);
}

/**
 * The whole journey is over: a longer fanfare, crowned by the bells.
 * @param {import('./audio.js').AudioEngine | undefined} engine
 */
export function finaleSound(engine) {
  if (!synthesise(engine, 'finale')) return;
  const beat = 0.16;
  playPhrase(engine.ctx, engine.master, FINALE, beat, 0.22);
  const t = engine.ctx.currentTime + 0.01 + 12 * beat;
  for (const [note, dt] of [['C6', 0], ['G5', 0.35], ['C5', 0.7]]) {
    handBell(engine.ctx, engine.master, freqOf(note), t + Number(dt), 0.14);
  }
}

// ------------------------------------------------------------ mission sounds

/** The ladder of notes a run of things collected climbs (a pentatonic scale). */
const COLLECT = ['C6', 'D6', 'E6', 'G6', 'A6', 'C7', 'D7', 'E7'];
/** A run of collected things ends after this pause (seconds): back to the first note. */
const COLLECT_RUN = 2.5;
/** Least time between two of the same sound (rubbing snow would make dozens a second). */
const MIN_GAP = { crunch: 0.11, tock: 0.04, brush: 0.15 };

/** @type {WeakMap<BaseAudioContext, AudioBuffer>} one second of white noise per context */
const noiseBuffers = new WeakMap();
/** @type {Map<string, number>} when each sound was last played */
const lastPlayed = new Map();
let collectStep = 0;

/** @param {BaseAudioContext} ctx */
function noiseOf(ctx) {
  let b = noiseBuffers.get(ctx);
  if (!b) {
    b = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
    const d = b.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    noiseBuffers.set(ctx, b);
  }
  return b;
}

/**
 * A puff of filtered noise (the raw material of whooshes, crunches, wind…).
 * @param {AudioContext} ctx
 * @param {AudioNode} out
 * @param {object} o
 * @param {number} o.t          start time
 * @param {number} o.length     seconds
 * @param {number} o.level
 * @param {BiquadFilterType} o.type
 * @param {number} o.from       filter frequency at the start…
 * @param {number} [o.to]       …and at the end
 * @param {number} [o.q=1]
 * @param {number} [o.attack=0.005]
 */
function noisePuff(ctx, out, { t, length, level, type, from, to = from, q = 1, attack = 0.005 }) {
  const src = ctx.createBufferSource();
  src.buffer = noiseOf(ctx);
  const f = ctx.createBiquadFilter();
  f.type = type;
  f.Q.value = q;
  f.frequency.setValueAtTime(from, t);
  f.frequency.exponentialRampToValueAtTime(to, t + length);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(level, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + length);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 0.5, length + 0.05);
}

/**
 * The sounds, each made from the music box, the hand bell or a puff of noise.
 * @type {Record<string, (ctx: AudioContext, out: AudioNode, t: number) => void>}
 */
const SOUNDS = {
  /** Something collected: one note higher for every thing in a quick run. */
  collect(ctx, out, t) {
    musicBox(ctx, out, freqOf(COLLECT[collectStep]), t, 0.3, 0.15);
  },
  /** A bigger moment inside a mission (a shape finished, the right train). */
  sparkle(ctx, out, t) {
    ['G6', 'C7', 'E7', 'G7'].forEach((n, i) => musicBox(ctx, out, freqOf(n), t + i * 0.05, 0.25, 0.1));
  },
  /** A piece turned, a switch thrown: a small wooden tock. */
  tock(ctx, out, t) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, t);
    osc.frequency.exponentialRampToValueAtTime(420, t + 0.05);
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.16, t + 0.003);
    g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
    osc.connect(g).connect(out);
    osc.start(t);
    osc.stop(t + 0.1);
  },
  /** A gift thrown: a short whoosh. */
  whoosh(ctx, out, t) {
    noisePuff(ctx, out, { t, length: 0.35, level: 0.12, type: 'bandpass', from: 2400, to: 500, q: 1.5, attack: 0.08 });
  },
  /** A candle or a torch catches fire: the scratch of a match, then the flame. */
  flame(ctx, out, t) {
    noisePuff(ctx, out, { t, length: 0.06, level: 0.08, type: 'highpass', from: 3500 });
    noisePuff(ctx, out, { t: t + 0.05, length: 0.5, level: 0.07, type: 'bandpass', from: 700, to: 450, q: 0.8, attack: 0.08 });
    musicBox(ctx, out, freqOf('E6'), t + 0.08, 0.3, 0.08);
  },
  /** A photo: the camera's double click. */
  shutter(ctx, out, t) {
    // "click" (the shutter opens, the mirror slaps up) … "clack" (it closes)
    for (const [at, level, freq] of [[0, 0.5, 3200], [0.09, 0.4, 2400]]) {
      noisePuff(ctx, out, { t: t + at, length: 0.025, level, type: 'highpass', from: freq, attack: 0.001 });
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(220, t + at);
      osc.frequency.exponentialRampToValueAtTime(90, t + at + 0.05);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t + at);
      g.gain.exponentialRampToValueAtTime(level * 0.6, t + at + 0.002);
      g.gain.exponentialRampToValueAtTime(0.0001, t + at + 0.06);
      osc.connect(g).connect(out);
      osc.start(t + at);
      osc.stop(t + at + 0.08);
    }
  },
  /** A bird fed: two or three quick chirps. */
  chirp(ctx, out, t) {
    const n = 2 + Math.round(Math.random());
    for (let i = 0; i < n; i++) {
      const s = t + i * 0.11;
      const base = 3000 + Math.random() * 600;
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(base, s);
      osc.frequency.exponentialRampToValueAtTime(base * 1.45, s + 0.05);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, s);
      g.gain.exponentialRampToValueAtTime(0.06, s + 0.01);
      g.gain.exponentialRampToValueAtTime(0.0001, s + 0.07);
      osc.connect(g).connect(out);
      osc.start(s);
      osc.stop(s + 0.08);
    }
  },
  /** Snow dug or a gift landing in the snow: a soft crunch. */
  crunch(ctx, out, t) {
    noisePuff(ctx, out, { t, length: 0.12, level: 0.1, type: 'lowpass', from: 1400 + Math.random() * 800, to: 500 });
  },
  /** A gust of wind (blows out a torch). */
  gust(ctx, out, t) {
    noisePuff(ctx, out, { t, length: 1.4, level: 0.1, type: 'bandpass', from: 400, to: 900, q: 0.7, attack: 0.5 });
  },
  /** A stroke of the paintbrush. */
  brush(ctx, out, t) {
    noisePuff(ctx, out, { t, length: 0.25, level: 0.06, type: 'bandpass', from: 1600, to: 1100, q: 0.9, attack: 0.06 });
  },
};

/**
 * Plays one of the missions' sounds (a recording with the same name, if
 * there is one, otherwise the synthesised version).
 * @param {import('./audio.js').AudioEngine | undefined} engine
 * @param {keyof typeof SOUNDS} name
 */
export function missionSound(engine, name) {
  if (!engine?.ready || !engine.ctx || !engine.master) return;
  const now = engine.ctx.currentTime;
  const last = lastPlayed.get(name) ?? -Infinity;
  if (now - last < (MIN_GAP[/** @type {keyof typeof MIN_GAP} */ (name)] ?? 0)) return;
  lastPlayed.set(name, now);
  if (name === 'collect') collectStep = now - last > COLLECT_RUN ? 0 : Math.min(collectStep + 1, COLLECT.length - 1);
  if (engine.canPlay(name)) engine.play(name);
  else SOUNDS[name](engine.ctx, engine.master, now + 0.005);
}
