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
