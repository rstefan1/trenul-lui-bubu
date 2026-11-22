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
 * A big church bell, built the way a real bronze bell sounds:
 *
 *   - its partials: the deep hum (an octave below the strike note), the
 *     prime, the minor third that gives every church bell its colour, the
 *     fifth, the nominal (an octave above, the note one "hears" at the
 *     strike) and the higher ones; the low ones ring for many seconds, the
 *     high ones die away quickly, so the bell's colour darkens as it rings;
 *   - every partial is a pair of tones a hair apart (a real bell is never
 *     perfectly round), so the sound slowly "beats" — the warble of a bell;
 *   - the clapper's strike: a short, bright metallic clang;
 *   - the echo of the hills around it, coming back softer and darker.
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
  // [ratio to the prime, amount, seconds to fade, beat (Hz) between the pair]
  const partials = [
    [0.5, 0.7, 9, 0.6], [1, 0.75, 6.5, 0.9], [1.19, 0.5, 5, 1.3], [1.5, 0.28, 3.5, 1.1],
    [2, 0.8, 4, 1.6], [2.51, 0.3, 2.5, 2.1], [3, 0.25, 2, 2.4], [4.08, 0.16, 1.2, 3],
    [5.43, 0.08, 0.7, 3.5], [6.83, 0.05, 0.4, 4],
  ];
  for (const [ratio, amount, decay, beat] of partials) {
    for (const side of [-0.5, 0.5]) {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.value = f * ratio + side * beat;
      const pg = ctx.createGain();
      pg.gain.setValueAtTime(0.0001, t);
      pg.gain.exponentialRampToValueAtTime(amount * 0.5, t + 0.004);
      pg.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      osc.connect(pg).connect(g);
      osc.start(t);
      osc.stop(t + decay + 0.05);
    }
  }
  // the clapper's strike: a bright clang of metal, over in a moment
  const length = Math.round(ctx.sampleRate * 0.12);
  const noise = ctx.createBuffer(1, length, ctx.sampleRate);
  const d = noise.getChannelData(0);
  for (let i = 0; i < length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / length) ** 3;
  const strike = ctx.createBufferSource();
  strike.buffer = noise;
  const ring = ctx.createBiquadFilter();
  ring.type = 'bandpass';
  ring.frequency.value = f * 8;
  ring.Q.value = 6;
  const sg = ctx.createGain();
  sg.gain.value = 0.5;
  strike.connect(ring).connect(sg).connect(g);
  strike.start(t);
  // the hills answer: a soft, darker echo that fades
  const echo = ctx.createDelay(1);
  echo.delayTime.value = 0.42;
  const back = ctx.createGain();
  back.gain.value = 0.32;
  const dark = ctx.createBiquadFilter();
  dark.type = 'lowpass';
  dark.frequency.value = 1500;
  g.connect(echo).connect(dark).connect(back).connect(echo);
  const wet = ctx.createGain();
  wet.gain.value = 0.5;
  back.connect(wet).connect(out);
  // the echo loop feeds itself: undo it once the bell has died away
  setTimeout(() => {
    g.disconnect();
    back.disconnect();
  }, (t - ctx.currentTime + 12) * 1000);
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
 * The "ding-ding-dong" heard in a station before an announcement.
 * @param {BaseAudioContext} ctx
 * @param {AudioNode} out
 * @param {number} t
 * @param {number} [level=0.4]
 * @param {number} [pitch=1]  a factor on every note
 */
export function stationChime(ctx, out, t, level = 0.4, pitch = 1) {
  CHIME.forEach((note, i) => chimeBar(ctx, out, freqOf(note) * pitch, t + i * CHIME_STEP, level));
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
