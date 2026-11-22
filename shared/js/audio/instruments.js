/**
 * @file The game's little instruments, synthesised: the music box that
 * plays the carols (and the notes of the missions), a hand bell, and the
 * soft chime that announces a station.
 * Both are made of a few sine partials that ring and fade, so they sound
 * like small metal bells and fit together.
 */

/** Semitones of the note names. */
const STEPS = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };

/**
 * Frequency of a note name like "C5" or "F#4".
 * @param {string} name
 */
export function freqOf(name) {
  const m = /^([A-G])(#|b)?(-?\d)$/.exec(name);
  if (!m) return 440;
  const semis = STEPS[/** @type {keyof typeof STEPS} */ (m[1])] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  const midi = (Number(m[3]) + 1) * 12 + semis;
  return 440 * 2 ** ((midi - 69) / 12);
}

/**
 * One note of the music box: a bright, bell-like tone that rings and fades.
 * @param {BaseAudioContext} ctx
 * @param {AudioNode} out
 * @param {number} f       frequency
 * @param {number} t       start time
 * @param {number} length  seconds the note is meant to last (longer notes ring longer)
 * @param {number} [level=0.22]
 */
export function musicBox(ctx, out, f, t, length, level = 0.22) {
  const decay = Math.max(0.6, Math.min(2.2, length * 2.2));
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(level, t + 0.004);
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
 * A hand bell: a clear strike with the slightly "out of tune" overtones of
 * a real bell, ringing for a while.
 * @param {BaseAudioContext} ctx
 * @param {AudioNode} out
 * @param {number} f  frequency of the strike note
 * @param {number} t
 * @param {number} [level=0.25]
 */
export function handBell(ctx, out, f, t, level = 0.25) {
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(level, t + 0.003);
  g.gain.exponentialRampToValueAtTime(0.0001, t + 2.4);
  g.connect(out);
  for (const [ratio, amount, decay] of [[1, 1, 2.4], [2.0, 0.5, 1.6], [2.76, 0.35, 1.1], [5.4, 0.18, 0.6], [8.9, 0.08, 0.3]]) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f * ratio;
    const pg = ctx.createGain();
    pg.gain.setValueAtTime(amount, t);
    pg.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(pg).connect(g);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  }
}

/**
 * A big church bell: the deep hum, the strike note and the overtones of a
 * real bell (with its minor third, which gives the bell its typical
 * sound), the low ones ringing for many seconds.
 * @param {BaseAudioContext} ctx
 * @param {AudioNode} out
 * @param {number} f  frequency of the strike note ("prime")
 * @param {number} t
 * @param {number} [level=0.35]
 */
export function churchBell(ctx, out, f, t, level = 0.35) {
  const g = ctx.createGain();
  g.gain.value = level;
  g.connect(out);
  // [ratio to the prime, amount, seconds to fade]
  const partials = [[0.5, 0.6, 7], [1, 0.8, 5], [1.19, 0.45, 4], [1.5, 0.3, 3], [2, 0.7, 3.5], [2.52, 0.25, 2], [3, 0.2, 1.6], [4.2, 0.12, 0.9]];
  for (const [ratio, amount, decay] of partials) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f * ratio;
    const pg = ctx.createGain();
    pg.gain.setValueAtTime(0.0001, t);
    pg.gain.exponentialRampToValueAtTime(amount, t + 0.006);
    pg.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(pg).connect(g);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  }
  // the clapper's strike: a short metallic clang
  const clang = ctx.createOscillator();
  clang.type = 'triangle';
  clang.frequency.value = f * 5.3;
  const cg = ctx.createGain();
  cg.gain.setValueAtTime(0.0001, t);
  cg.gain.exponentialRampToValueAtTime(0.15, t + 0.002);
  cg.gain.exponentialRampToValueAtTime(0.0001, t + 0.15);
  clang.connect(cg).connect(g);
  clang.start(t);
  clang.stop(t + 0.2);
}

/**
 * One bar of a station chime: a soft vibraphone tone (a pure note with the
 * high fourth and tenth partials of a metal bar) that rings for a while.
 * @param {BaseAudioContext} ctx
 * @param {AudioNode} out
 * @param {number} f
 * @param {number} t
 * @param {number} level
 */
function chimeBar(ctx, out, f, t, level) {
  const ring = 2.6;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0.0001, t);
  g.gain.exponentialRampToValueAtTime(level, t + 0.012);
  g.gain.exponentialRampToValueAtTime(0.0001, t + ring);
  g.connect(out);
  for (const [ratio, amount, decay] of [[1, 1, ring], [2, 0.25, 1.2], [4, 0.15, 0.5], [10, 0.03, 0.15]]) {
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.value = f * ratio;
    const pg = ctx.createGain();
    pg.gain.setValueAtTime(amount, t);
    pg.gain.exponentialRampToValueAtTime(0.0001, t + decay);
    osc.connect(pg).connect(g);
    osc.start(t);
    osc.stop(t + decay + 0.05);
  }
}

/** The three rising notes of the station chime, and the time between them. */
const CHIME = ['G5', 'B5', 'D6'];
const CHIME_STEP = 0.42;

/**
 * The "ding-ding-dong" heard in a station before an announcement. A
 * recording registered as "station-chime" is played instead, if there is one.
 * @param {import('./audio.js').AudioEngine | undefined} engine
 * @param {number} [level=0.4]
 */
export function stationChime(engine, level = 0.4) {
  if (!engine?.ready || !engine.ctx || !engine.master) return;
  if (engine.canPlay('station-chime')) {
    engine.play('station-chime');
    return;
  }
  const t = engine.ctx.currentTime + 0.01;
  CHIME.forEach((note, i) => chimeBar(/** @type {AudioContext} */ (engine.ctx), /** @type {GainNode} */ (engine.master), freqOf(note), t + i * CHIME_STEP, level));
}

/**
 * Plays a note on the music box right away (for the missions).
 * @param {import('./audio.js').AudioEngine | undefined} engine
 * @param {string} note       e.g. "E5"
 * @param {{length?: number, level?: number}} [o]
 */
export function playNote(engine, note, o = {}) {
  if (!engine?.ready || !engine.ctx || !engine.master) return;
  musicBox(engine.ctx, engine.master, freqOf(note), engine.ctx.currentTime + 0.005, o.length ?? 0.5, o.level ?? 0.3);
}

/**
 * Rings a hand bell right away (for the missions).
 * @param {import('./audio.js').AudioEngine | undefined} engine
 * @param {string} note
 * @param {number} [level]
 */
export function ringBell(engine, note, level) {
  if (!engine?.ready || !engine.ctx || !engine.master) return;
  handBell(engine.ctx, engine.master, freqOf(note), engine.ctx.currentTime + 0.005, level);
}
