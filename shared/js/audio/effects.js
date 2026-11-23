/**
 * @file The game's sound effects: a mission won, the stars, a gentle
 * "oops", a button click, the fanfares, the station chime, and the sounds
 * of the missions (things collected, a camera, a match, the wind…).
 *
 * The bell-like sounds are played on the same music box and hand bell as
 * the carols, so they all belong to one family; the others are made of
 * short puffs of filtered noise. A recording registered with an effect's
 * name (e.g. "success") is played instead, if there is one.
 *
 * What makes them sound finished, as in a professional game:
 *
 *   variation   every time a sound plays, its pitch and volume change a
 *               tiny bit at random, so a sound heard twenty times in a row
 *               never sounds mechanical;
 *   balance     the first time sound is allowed, every effect is rendered
 *               once, silently, and its loudness measured; each one is then
 *               scaled so that all have the loudness written in MIX —
 *               the mix is decided in one table, not by guessing volumes;
 *   panning     a sound can come from where it happens on screen (left or
 *               right speaker);
 *   ducking     the important sounds lower the music for a moment.
 */

import { churchBell, freqOf, handBell, musicBox, stationChime } from './instruments.js';

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
/** The ladder of notes a run of things collected climbs (a pentatonic scale). */
const COLLECT = ['C6', 'D6', 'E6', 'G6', 'A6', 'C7', 'D7', 'E7'];
/** A run of collected things ends after this pause (seconds): back to the first note. */
const COLLECT_RUN = 2.5;

/**
 * The mix: how loud every effect is, in decibels around the reference
 * (0 dB = as loud as the "mission won" sound). Quiet, frequent sounds sit
 * low; the big moments sit high.
 * @type {Record<string, number>}
 */
const MIX = {
  // the interface: discreet
  click: -12, tock: -8,
  // small feedback, heard often
  collect: -3, oops: -5, star: -2, chirp: -8, crunch: -10, brush: -12, shutter: -3,
  hop: -4, flame: -5, whoosh: -6, ding: -5, drum: -2, thud: -5,
  // things around the train
  doorsOpen: -9, doorsClose: -9, gust: -6, plough: -4, ploughEngine: -6,
  // the big moments
  success: 0, sparkle: -4, chime: 0, chapterEnd: 1, finale: 2, churchBell: 10,
  // the sounds of places (heard now and then, far away, under everything)
  birdsong: -16, sleigh: -11,
  // the sounds of the landscape on the way (far away, under the train)
  passingBell: -12, owl: -13, crow: -16, twig: -17,
};
/** The effects that lower the music while they play, and for how long (seconds). */
const DUCK = { success: 1, chime: 1.6, chapterEnd: 2, finale: 3, star: 0.5 };
/** Least time between two of the same sound (rubbing snow would make dozens a second). */
const MIN_GAP = { crunch: 0.11, tock: 0.04, brush: 0.15 };
/** Random variation of every sound: pitch (± share) and volume (± dB). */
const VARY_PITCH = 0.04;
const VARY_DB = 1.5;
/** Effects whose pitch must not vary (melodies that go with the music, or notes in a scale). */
const FIXED_PITCH = new Set(['success', 'chapterEnd', 'finale', 'chime', 'collect', 'star', 'hop', 'churchBell']);

/** @type {WeakMap<BaseAudioContext, AudioBuffer>} one second of white noise per context */
const noiseBuffers = new WeakMap();
/** @type {Map<string, number>} when each sound was last played */
const lastPlayed = new Map();
/** @type {Map<string, number>} the gain that brings each effect to its loudness in MIX */
const balance = new Map();
let collectStep = 0;
let starIndex = 0;
/** The pitch factor of the sound being made (varies a little at every play). */
let pitch = 1;

/**
 * Frequency of a note, with the current pitch variation.
 * @param {string} note
 */
const fq = note => freqOf(note) * pitch;
/**
 * A frequency in hertz, with the current pitch variation.
 * @param {number} f
 */
const hz = f => f * pitch;

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
 * @param {BaseAudioContext} ctx
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
  f.frequency.setValueAtTime(hz(from), t);
  f.frequency.exponentialRampToValueAtTime(hz(to), t + length);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(level, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + length);
  src.connect(f).connect(g).connect(out);
  src.start(t, Math.random() * 0.5, length + 0.05);
}

/**
 * A short tone whose pitch slides (clicks, tocks, drums, chirps, thuds).
 * @param {BaseAudioContext} ctx
 * @param {AudioNode} out
 * @param {object} o
 * @param {number} o.t
 * @param {number} o.from     frequency at the start (Hz)…
 * @param {number} o.to       …and at the end
 * @param {number} o.slide    seconds of the slide
 * @param {number} o.level
 * @param {number} o.length   seconds until silent
 * @param {OscillatorType} [o.type='sine']
 * @param {number} [o.attack=0.003]
 */
function sweep(ctx, out, { t, from, to, slide, level, length, type = 'sine', attack = 0.003 }) {
  const osc = ctx.createOscillator();
  osc.type = type;
  osc.frequency.setValueAtTime(hz(from), t);
  osc.frequency.exponentialRampToValueAtTime(hz(to), t + slide);
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(level, t + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t + length);
  osc.connect(g).connect(out);
  osc.start(t);
  osc.stop(t + length + 0.02);
}

/**
 * Plays a phrase on the music box.
 * @param {BaseAudioContext} ctx
 * @param {AudioNode} out
 * @param {number} t
 * @param {Phrase} phrase
 * @param {number} beat   seconds per beat
 * @param {number} level
 */
function playPhrase(ctx, out, t, phrase, beat, level) {
  for (const [note, at, length] of phrase) musicBox(ctx, out, fq(note), t + at * beat, length * beat, level);
}

/**
 * Every effect, made from the instruments or from puffs of noise.
 * @type {Record<string, (ctx: BaseAudioContext, out: AudioNode, t: number) => void>}
 */
const SOUNDS = {
  // ------------------------------------------------------------ general
  /** A mission is won: a quick rising arpeggio. */
  success(ctx, out, t) {
    playPhrase(ctx, out, t, SUCCESS, 0.09, 0.2);
  },
  /** One star of the result, each one higher. */
  star(ctx, out, t) {
    handBell(ctx, out, fq(STAR_NOTES[Math.min(starIndex, STAR_NOTES.length - 1)]), t, 0.12);
  },
  /** A gentle "oops": two soft falling notes. */
  oops(ctx, out, t) {
    playPhrase(ctx, out, t, OOPS, 0.13, 0.16);
  },
  /** A button: a tiny wooden "tock". */
  click(ctx, out, t) {
    sweep(ctx, out, { t, from: 1500, to: 700, slide: 0.04, level: 0.12, length: 0.06 });
  },
  /** A chapter is finished: a small fanfare. */
  chapterEnd(ctx, out, t) {
    playPhrase(ctx, out, t, CHAPTER, 0.16, 0.22);
  },
  /** The whole journey is over: a longer fanfare, crowned by the bells. */
  finale(ctx, out, t) {
    const beat = 0.16;
    playPhrase(ctx, out, t, FINALE, beat, 0.22);
    [['C6', 0], ['G5', 0.35], ['C5', 0.7]].forEach(([note, dt]) => {
      handBell(ctx, out, fq(String(note)), t + 12 * beat + Number(dt), 0.14);
    });
  },
  /** A station: the chime before the announcements. */
  chime(ctx, out, t) {
    stationChime(ctx, out, t, 0.4, pitch);
  },

  // ------------------------------------------------------------ missions
  /** Something collected: one note higher for every thing in a quick run. */
  collect(ctx, out, t) {
    musicBox(ctx, out, fq(COLLECT[collectStep]), t, 0.3, 0.15);
  },
  /** A bigger moment inside a mission (a shape finished, the right train). */
  sparkle(ctx, out, t) {
    ['G6', 'C7', 'E7', 'G7'].forEach((n, i) => musicBox(ctx, out, fq(n), t + i * 0.05, 0.25, 0.1));
  },
  /** A piece turned, a switch thrown: a small wooden tock. */
  tock(ctx, out, t) {
    sweep(ctx, out, { t, from: 900, to: 420, slide: 0.05, level: 0.16, length: 0.08 });
  },
  /** A gift thrown: a short whoosh. */
  whoosh(ctx, out, t) {
    noisePuff(ctx, out, { t, length: 0.35, level: 0.12, type: 'bandpass', from: 2400, to: 500, q: 1.5, attack: 0.08 });
  },
  /** A candle or a torch catches fire: the scratch of a match, then the flame. */
  flame(ctx, out, t) {
    noisePuff(ctx, out, { t, length: 0.06, level: 0.08, type: 'highpass', from: 3500 });
    noisePuff(ctx, out, { t: t + 0.05, length: 0.5, level: 0.07, type: 'bandpass', from: 700, to: 450, q: 0.8, attack: 0.08 });
    musicBox(ctx, out, fq('E6'), t + 0.08, 0.3, 0.08);
  },
  /** A photo: "click" (the shutter opens, the mirror slaps up) … "clack" (it closes). */
  shutter(ctx, out, t) {
    for (const [at, level, freq] of [[0, 0.5, 3200], [0.09, 0.4, 2400]]) {
      noisePuff(ctx, out, { t: t + at, length: 0.025, level, type: 'highpass', from: freq, attack: 0.001 });
      sweep(ctx, out, { t: t + at, from: 220, to: 90, slide: 0.05, level: level * 0.6, length: 0.06, attack: 0.002 });
    }
  },
  /** A bird fed: two or three quick chirps. */
  chirp(ctx, out, t) {
    const n = 2 + Math.round(Math.random());
    for (let i = 0; i < n; i++) {
      const base = 3000 + Math.random() * 600;
      sweep(ctx, out, { t: t + i * 0.11, from: base, to: base * 1.45, slide: 0.05, level: 0.06, length: 0.07, attack: 0.01 });
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
  /** An animal hops on board: a little springy "boing", then a note. */
  hop(ctx, out, t) {
    sweep(ctx, out, { t, from: 280, to: 760, slide: 0.12, level: 0.12, length: 0.16, attack: 0.01 });
    musicBox(ctx, out, fq(COLLECT[collectStep]), t + 0.12, 0.3, 0.12);
  },
  /** The carollers' drum: a deep, round thump with the skin's slap. */
  drum(ctx, out, t) {
    sweep(ctx, out, { t, from: 150, to: 55, slide: 0.25, level: 0.35, length: 0.35, attack: 0.004 });
    noisePuff(ctx, out, { t, length: 0.05, level: 0.08, type: 'bandpass', from: 1200, q: 0.8, attack: 0.001 });
  },
  /** Something heavy set down (the tree on its wagon). */
  thud(ctx, out, t) {
    sweep(ctx, out, { t, from: 120, to: 45, slide: 0.18, level: 0.3, length: 0.25, attack: 0.005 });
    noisePuff(ctx, out, { t, length: 0.2, level: 0.08, type: 'lowpass', from: 700, to: 200 });
  },
  /** The snow plough going by: a long rumble with snow thrown aside. */
  plough(ctx, out, t) {
    // the blade pushing through the snow: a heavy rush and the snow thrown aside
    noisePuff(ctx, out, { t, length: 2.2, level: 0.16, type: 'lowpass', from: 350, to: 550, q: 0.7, attack: 0.3 });
    for (let i = 0; i < 9; i++) {
      noisePuff(ctx, out, { t: t + 0.1 + i * 0.22 + Math.random() * 0.08, length: 0.14, level: 0.07, type: 'lowpass', from: 1800, to: 600 });
    }
  },
  /** The plough engine coming down the line: a diesel's low throb that grows. */
  ploughEngine(ctx, out, t) {
    const length = 2.4;
    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(hz(48), t);
    osc.frequency.linearRampToValueAtTime(hz(56), t + length);
    const dark = ctx.createBiquadFilter();
    dark.type = 'lowpass';
    dark.frequency.value = 260;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, t);
    g.gain.exponentialRampToValueAtTime(0.12, t + length * 0.7);
    g.gain.exponentialRampToValueAtTime(0.0001, t + length + 0.6);
    osc.connect(dark).connect(g).connect(out);
    osc.start(t);
    osc.stop(t + length + 0.7);
    noisePuff(ctx, out, { t, length: length + 0.5, level: 0.05, type: 'lowpass', from: 400, attack: length * 0.6 });
  },
  /** The big bell of a monastery's bell tower. */
  churchBell(ctx, out, t) {
    churchBell(ctx, out, fq('E3'), t);
  },
  /** A small bell: the lantern's signal is seen. */
  ding(ctx, out, t) {
    handBell(ctx, out, fq('A5'), t, 0.12);
  },
  /** The train's doors open: a puff of air, then the doors slide. */
  doorsOpen(ctx, out, t) {
    noisePuff(ctx, out, { t, length: 0.5, level: 0.1, type: 'highpass', from: 2500, to: 4000, attack: 0.02 });
    noisePuff(ctx, out, { t: t + 0.3, length: 0.6, level: 0.07, type: 'bandpass', from: 350, to: 250, q: 1.2, attack: 0.1 });
  },
  /**
   * A horse sleigh going by: its bells (zurgălăi) jingle at the horse's trot,
   * coming from one side, passing in front and going away on the other,
   * with the soft steps of the hooves in the snow.
   */
  sleigh(ctx, out, t) {
    const length = 8;
    const dir = Math.random() < 0.5 ? -1 : 1;
    const pass = ctx.createGain();
    pass.gain.setValueAtTime(0.0001, t);
    pass.gain.exponentialRampToValueAtTime(1, t + length * 0.5);
    pass.gain.exponentialRampToValueAtTime(0.0001, t + length);
    let last = pass;
    if (ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner();
      pan.pan.setValueAtTime(-0.8 * dir, t);
      pan.pan.linearRampToValueAtTime(0.8 * dir, t + length);
      pass.connect(pan);
      last = pan;
    }
    last.connect(out);
    // the trot: two quick steps, a pause… (about two and a half strides a second)
    for (let at = 0; at < length; at += 0.42) {
      for (const step of [0, 0.16]) {
        const s = t + at + step + Math.random() * 0.02;
        // the bells: a few tiny high bells struck together, and their rattle
        for (let k = 0; k < 4; k++) {
          const st = s + Math.random() * 0.03;
          sweep(ctx, pass, { t: st, from: 4600 + Math.random() * 3400, to: 4500 + Math.random() * 3400, slide: 0.15, level: 0.07, length: 0.2, attack: 0.002 });
        }
        noisePuff(ctx, pass, { t: s, length: 0.08, level: 0.05, type: 'highpass', from: 6500, attack: 0.002 });
        // the hoof in the snow
        noisePuff(ctx, pass, { t: s, length: 0.09, level: 0.06, type: 'lowpass', from: 500, to: 250, attack: 0.004 });
      }
    }
  },
  /**
   * The bell of a village church the train goes past: it rings three times,
   * coming from the right (ahead), passing, and going away to the left.
   */
  passingBell(ctx, out, t) {
    const length = 7;
    const far = ctx.createBiquadFilter();
    far.type = 'lowpass';
    far.frequency.value = 1800;
    const pass = ctx.createGain();
    pass.gain.setValueAtTime(0.5, t);
    pass.gain.linearRampToValueAtTime(1, t + 2.5);
    pass.gain.linearRampToValueAtTime(0.35, t + length);
    far.connect(pass);
    let last = pass;
    if (ctx.createStereoPanner) {
      const pan = ctx.createStereoPanner();
      pan.pan.setValueAtTime(0.75, t);
      pan.pan.linearRampToValueAtTime(-0.75, t + length);
      pass.connect(pan);
      last = pan;
    }
    last.connect(out);
    for (let i = 0; i < 3; i++) churchBell(ctx, far, fq('B3'), t + i * 2.2, 0.25);
  },
  /** A tawny owl in the night forest: "hoo… hoo-hoo-hoooo", soft and round. */
  owl(ctx, out, t) {
    const hoot = (/** @type {number} */ at, /** @type {number} */ length, /** @type {number} */ level) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(hz(410), at);
      osc.frequency.linearRampToValueAtTime(hz(385), at + length);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(level, at + Math.min(0.12, length * 0.3));
      g.gain.setValueAtTime(level, at + length * 0.6);
      g.gain.exponentialRampToValueAtTime(0.0001, at + length);
      osc.connect(g).connect(out);
      osc.start(at);
      osc.stop(at + length + 0.02);
      // the breath in the hoot
      noisePuff(ctx, out, { t: at, length, level: level * 0.12, type: 'bandpass', from: 420, q: 4, attack: 0.08 });
    };
    hoot(t, 0.5, 0.08);
    hoot(t + 1.4, 0.18, 0.06);
    hoot(t + 1.7, 0.18, 0.06);
    hoot(t + 2.0, 0.9, 0.08);
  },
  /** Crows over the fields: two or three hoarse "kraa". */
  crow(ctx, out, t) {
    const n = 2 + Math.floor(Math.random() * 2);
    for (let k = 0; k < n; k++) {
      const at = t + k * (0.38 + Math.random() * 0.12);
      const osc = ctx.createOscillator();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(hz(720), at);
      osc.frequency.exponentialRampToValueAtTime(hz(560), at + 0.24);
      const voice = ctx.createBiquadFilter();
      voice.type = 'bandpass';
      voice.frequency.value = hz(1300);
      voice.Q.value = 3;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, at);
      g.gain.exponentialRampToValueAtTime(0.06, at + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, at + 0.26);
      osc.connect(voice).connect(g).connect(out);
      osc.start(at);
      osc.stop(at + 0.28);
      // the hoarseness
      noisePuff(ctx, out, { t: at, length: 0.24, level: 0.03, type: 'bandpass', from: 1400, to: 1100, q: 2, attack: 0.02 });
    }
  },
  /** A twig snapping under the snow somewhere in the forest. */
  twig(ctx, out, t) {
    noisePuff(ctx, out, { t, length: 0.04, level: 0.12, type: 'highpass', from: 1800, attack: 0.001 });
    noisePuff(ctx, out, { t: t + 0.05, length: 0.03, level: 0.06, type: 'highpass', from: 2400, attack: 0.001 });
    sweep(ctx, out, { t, from: 160, to: 80, slide: 0.06, level: 0.05, length: 0.08, attack: 0.002 });
  },
  /** A bird of the winter morning: a great tit ("ti-tu ti-tu"), a sparrow, or a robin's little trill. */
  birdsong(ctx, out, t) {
    const kind = Math.floor(Math.random() * 3);
    if (kind === 0) {
      // the great tit: a high note and a lower one, a few times
      const hi = 5200 + Math.random() * 500;
      const n = 2 + Math.floor(Math.random() * 3);
      for (let k = 0; k < n; k++) {
        sweep(ctx, out, { t: t + k * 0.32, from: hi, to: hi * 0.97, slide: 0.08, level: 0.05, length: 0.1, attack: 0.008 });
        sweep(ctx, out, { t: t + k * 0.32 + 0.14, from: hi * 0.74, to: hi * 0.72, slide: 0.1, level: 0.05, length: 0.12, attack: 0.008 });
      }
    } else if (kind === 1) {
      // the sparrow: quick, uneven chirps
      const n = 3 + Math.floor(Math.random() * 4);
      for (let k = 0; k < n; k++) {
        const base = 3200 + Math.random() * 900;
        sweep(ctx, out, { t: t + k * (0.12 + Math.random() * 0.1), from: base, to: base * 1.3, slide: 0.04, level: 0.045, length: 0.06, attack: 0.006 });
      }
    } else {
      // the robin: a short, wavering trill that falls
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      const start = hz(6000 + Math.random() * 800);
      osc.frequency.setValueAtTime(start, t);
      osc.frequency.exponentialRampToValueAtTime(start * 0.6, t + 0.9);
      const wobble = ctx.createOscillator();
      wobble.frequency.value = 28;
      const depth = ctx.createGain();
      depth.gain.value = 400;
      wobble.connect(depth).connect(osc.frequency);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(0.04, t + 0.05);
      g.gain.exponentialRampToValueAtTime(0.0001, t + 0.9);
      osc.connect(g).connect(out);
      osc.start(t);
      wobble.start(t);
      osc.stop(t + 0.95);
      wobble.stop(t + 0.95);
    }
  },
  /** The doors close: they slide, shut with a soft bump, and the air hisses. */
  doorsClose(ctx, out, t) {
    noisePuff(ctx, out, { t, length: 0.55, level: 0.07, type: 'bandpass', from: 250, to: 350, q: 1.2, attack: 0.1 });
    SOUNDS.thud(ctx, out, t + 0.55);
    noisePuff(ctx, out, { t: t + 0.6, length: 0.4, level: 0.08, type: 'highpass', from: 3500, to: 2500, attack: 0.01 });
  },
};

/** @typedef {keyof typeof SOUNDS} SoundName */

/**
 * Plays one of the game's sound effects.
 * @param {import('./audio.js').AudioEngine | undefined} engine
 * @param {SoundName} name
 * @param {{pan?: number, gain?: number}} [o]  pan: -1 (left speaker) … 1 (right speaker);
 *        gain: a factor on the effect's volume in the mix
 */
export function playSound(engine, name, o = {}) {
  if (!engine?.ready || !engine.ctx || !engine.master) return;
  const now = engine.ctx.currentTime;
  const last = lastPlayed.get(name) ?? -Infinity;
  if (now - last < (MIN_GAP[/** @type {keyof typeof MIN_GAP} */ (name)] ?? 0)) return;
  lastPlayed.set(name, now);
  if (name === 'collect' || name === 'hop') collectStep = now - last > COLLECT_RUN ? 0 : Math.min(collectStep + 1, COLLECT.length - 1);

  const varyDb = (Math.random() * 2 - 1) * VARY_DB;
  const rate = FIXED_PITCH.has(name) ? 1 : 1 + (Math.random() * 2 - 1) * VARY_PITCH;
  const volume = dB((MIX[name] ?? 0) + varyDb) * (balance.get(name) ?? 1) * (o.gain ?? 1);
  const hold = DUCK[/** @type {keyof typeof DUCK} */ (name)];
  if (hold) engine.duck(hold);
  if (engine.canPlay(name)) {
    engine.play(name, volume, { rate, pan: o.pan });
    return;
  }
  pitch = rate;
  try {
    SOUNDS[name](engine.ctx, engine.voice(volume, o.pan), now + 0.005);
  } finally {
    pitch = 1;
  }
}

/**
 * Measures every effect once, silently, and works out the gain that gives
 * each the same loudness (then MIX sets them apart on purpose). Runs once,
 * when sound becomes possible; until it is done the effects play as made.
 * @param {import('./audio.js').AudioEngine} engine
 */
export async function balanceSounds(engine) {
  const Offline = window.OfflineAudioContext || /** @type {any} */ (window).webkitOfflineAudioContext;
  if (!Offline || !engine.ctx) return;
  const rate = 22050;
  /** @type {Map<string, number>} */
  const loudness = new Map();
  for (const name of Object.keys(SOUNDS)) {
    try {
      const off = new Offline(1, rate * 4, rate);
      SOUNDS[name](off, off.destination, 0.01);
      loudness.set(name, measure(await off.startRendering()));
    } catch {
      // a sound that cannot be measured keeps its own volume
    }
  }
  // recordings that replace an effect are measured too
  for (const name of Object.keys(SOUNDS)) {
    const b = engine.buffers.get(name);
    if (b) loudness.set(name, measure(b));
  }
  const reference = loudness.get('success');
  if (!reference) return;
  for (const [name, l] of loudness) {
    if (l > 1e-5) balance.set(name, Math.max(0.2, Math.min(5, reference / l)));
  }
}

/**
 * Loudness of a sound, as the ear judges a short sound: the loudest moment
 * of its energy, measured over windows of 100 ms. The lowest notes count a
 * little less (small speakers and the ear both hear them less), by
 * measuring after a gentle high-pass.
 * @param {AudioBuffer} buffer
 */
function measure(buffer) {
  const d = buffer.getChannelData(0);
  const win = Math.max(1, Math.round(buffer.sampleRate * 0.1));
  const k = Math.exp((-2 * Math.PI * 120) / buffer.sampleRate);   // one-pole high-pass at 120 Hz
  let prevIn = 0;
  let prevOut = 0;
  let sum = 0;
  let best = 0;
  const ring = new Float64Array(win);
  for (let i = 0; i < d.length; i++) {
    const y = k * (prevOut + d[i] - prevIn);
    prevIn = d[i];
    prevOut = y;
    const e = y * y;
    sum += e - ring[i % win];
    ring[i % win] = e;
    if (sum > best) best = sum;
  }
  return Math.sqrt(best / win);
}

/** @param {number} db */
const dB = db => 10 ** (db / 20);

// ------------------------------------------------------------ shortcuts

/** @param {import('./audio.js').AudioEngine | undefined} engine */
export const successSound = engine => playSound(engine, 'success');
/** @param {import('./audio.js').AudioEngine | undefined} engine */
export const oopsSound = engine => playSound(engine, 'oops');
/** @param {import('./audio.js').AudioEngine | undefined} engine */
export const clickSound = engine => playSound(engine, 'click');
/** @param {import('./audio.js').AudioEngine | undefined} engine */
export const chapterSound = engine => playSound(engine, 'chapterEnd');
/** @param {import('./audio.js').AudioEngine | undefined} engine */
export const finaleSound = engine => playSound(engine, 'finale');
/** @param {import('./audio.js').AudioEngine | undefined} engine */
export const chimeSound = engine => playSound(engine, 'chime');

/**
 * One star of the result (0 = the first), each a little higher.
 * @param {import('./audio.js').AudioEngine | undefined} engine
 * @param {number} index
 */
export function starSound(engine, index) {
  starIndex = index;
  playSound(engine, 'star');
}

/**
 * A few seconds of a river heard from the train: rushing water (noise in two
 * bands that swells and settles) and the bubbling of small waves (short
 * notes that rise quickly), rendered once into a sound to loop.
 * @param {AudioContext} ctx
 * @returns {Promise<AudioBuffer>}
 */
export async function makeRiver(ctx) {
  const Offline = window.OfflineAudioContext || /** @type {any} */ (window).webkitOfflineAudioContext;
  const seconds = 8;
  const off = new Offline(1, Math.round(ctx.sampleRate * seconds), ctx.sampleRate);
  const t0 = 0;
  // noise as long as the whole sound, so no pattern repeats inside it
  const noise = off.createBuffer(1, off.length, off.sampleRate);
  const nd = noise.getChannelData(0);
  for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
  for (const [freq, q, level] of [[500, 0.8, 0.5], [1700, 1.2, 0.25]]) {
    const src = off.createBufferSource();
    src.buffer = noise;
    const band = off.createBiquadFilter();
    band.type = 'bandpass';
    band.frequency.value = freq;
    band.Q.value = q;
    const g = off.createGain();
    // the water swells and settles, slowly and unevenly
    for (let at = 0; at <= seconds; at += 0.5) g.gain.linearRampToValueAtTime(level * (0.7 + Math.random() * 0.5), t0 + at);
    src.connect(band).connect(g).connect(off.destination);
    src.start(t0);
  }
  for (let i = 0; i < 90; i++) {
    const at = t0 + Math.random() * (seconds - 0.1);
    const f = 350 + Math.random() * 700;
    sweep(off, off.destination, { t: at, from: f, to: f * 1.6, slide: 0.03, level: 0.05 + Math.random() * 0.05, length: 0.05, attack: 0.004 });
  }
  return off.startRendering();
}
