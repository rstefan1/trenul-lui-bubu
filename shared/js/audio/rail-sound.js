/**
 * @file The sound of the train on the rails, as heard from Bubu's coach:
 * the "ta-dam … ta-dam" of the wheels over the rail joints, on top of the
 * deep rolling rumble of steel wheels on steel rails.
 *
 * The rails are laid in lengths of about 25 m with a small gap between
 * them. Every axle knocks when it rolls over a gap; the two axles of a
 * bogie are close together, so a bogie makes a quick "ta-dam". The module
 * watches the train's distance and plays a knock whenever an axle crosses a
 * joint, so the rhythm follows the real wheels: it speeds up and slows down
 * with the train and stops when it stops.
 *
 * To sound natural rather than electronic, a knock is made only of filtered
 * noise (a heavy clunk, a faint metallic ring and a low thud), every knock
 * varies a little, and knocks far from Bubu's window are softer and duller
 * than those right under her.
 */

/** Distance between two rail joints (stage units; a coach is ~330 long, about 26 m). */
const JOINT = 320;
/** Below this speed the wheels are too slow to knock. */
const MIN_SPEED = 25;
/** At most this many knocks start in one frame (a jump in time would be noisy). */
const MAX_PER_FRAME = 8;
/** How quickly knocks fade with their distance from the listener (stage units). */
const HEARING = 420;

export class RailSound {
  /** @param {import('./audio.js').AudioEngine} engine */
  constructor(engine) {
    this.engine = engine;
    /** @type {number | null} distance at the last update */
    this.last = null;
    /** @type {GainNode | null} everything the rails make goes through here */
    this.bus = null;
    /** @type {{gain: GainNode, filter: BiquadFilterNode, hiss: GainNode} | null} */
    this.rumble = null;
  }

  /**
   * @param {number} distance   front of the train (stage units travelled)
   * @param {number} speed      stage units per second
   * @param {number[]} axles    x of every axle relative to the front of the train (≤ 0)
   * @param {{listener: number, tunnel: boolean, paused: boolean}} view
   *        listener: x of Bubu's window relative to the front of the train
   */
  update(distance, speed, axles, view) {
    const last = this.last;
    this.last = distance;
    const e = this.engine;
    if (!e.ready || !e.ctx || !e.master) return;
    this.ensureNodes();
    const moving = view.paused ? 0 : speed;
    this.updateRumble(moving, view.tunnel);
    if (last === null || moving < MIN_SPEED || distance <= last || distance - last > JOINT) return;
    const pace = Math.min(1, 0.45 + speed / 1000);
    let played = 0;
    for (const a of axles) {
      const before = Math.floor((last + a) / JOINT);
      const now = Math.floor((distance + a) / JOINT);
      if (now === before) continue;
      // nearer wheels are louder and brighter; far ones only a soft thud
      const near = 1 / (1 + Math.abs(a - view.listener) / HEARING);
      this.knock(pace * near, near, view.tunnel);
      if (++played >= MAX_PER_FRAME) break;
    }
  }

  /** @private The bus for the rail sounds: a gentle cabin-like filter. */
  ensureNodes() {
    if (this.bus) return;
    const e = this.engine;
    const ctx = /** @type {AudioContext} */ (e.ctx);
    const cabin = ctx.createBiquadFilter();
    cabin.type = 'lowpass';
    cabin.frequency.value = 3200;
    cabin.Q.value = 0.5;
    this.bus = ctx.createGain();
    this.bus.gain.value = 0.9;
    this.bus.connect(cabin).connect(/** @type {GainNode} */ (e.master));
  }

  /**
   * One wheel over one joint.
   * @private
   * @param {number} loud        0..1
   * @param {number} brightness  0..1 (1 = right under the listener)
   * @param {boolean} tunnel
   */
  knock(loud, brightness, tunnel) {
    const e = this.engine;
    const ctx = /** @type {AudioContext} */ (e.ctx);
    const bus = /** @type {GainNode} */ (this.bus);
    const noise = /** @type {AudioBuffer} */ (e.noise);
    const t = ctx.currentTime + 0.004 + Math.random() * 0.006;
    const vary = 0.85 + Math.random() * 0.3;
    const level = loud * vary * (tunnel ? 1.3 : 1);

    /**
     * A burst of filtered noise.
     * @param {BiquadFilterType} type
     * @param {number} freq
     * @param {number} q
     * @param {number} peak
     * @param {number} decay  seconds to fade
     */
    const burst = (type, freq, q, peak, decay) => {
      const src = ctx.createBufferSource();
      src.buffer = noise;
      const f = ctx.createBiquadFilter();
      f.type = type;
      f.frequency.value = freq;
      f.Q.value = q;
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(Math.max(0.0002, peak), t + 0.0015);
      g.gain.exponentialRampToValueAtTime(0.0001, t + decay);
      src.connect(f).connect(g).connect(bus);
      src.start(t, Math.random() * 1.8, decay + 0.02);
    };

    // the clunk of the wheel dropping into the gap and hitting the next rail
    burst('lowpass', (tunnel ? 650 : 850) * (0.7 + 0.5 * brightness) * vary, 0.9, 0.55 * level, 0.075);
    // the low thud carried by the sleepers
    burst('lowpass', 140, 0.7, 0.5 * level, 0.11);
    // a faint ring of steel, only from wheels close by
    if (brightness > 0.45) burst('bandpass', 2300 + Math.random() * 500, 9, 0.06 * level * brightness, 0.05);
  }

  /**
   * The rolling rumble under the knocks: deep, louder and a little brighter
   * when faster, plus a faint hiss of the rails.
   * @private
   * @param {number} speed
   * @param {boolean} tunnel
   */
  updateRumble(speed, tunnel) {
    const e = this.engine;
    const ctx = /** @type {AudioContext} */ (e.ctx);
    if (!this.rumble) {
      const brown = makeBrownNoise(ctx);
      const source = ctx.createBufferSource();
      source.buffer = brown;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 220;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(/** @type {GainNode} */ (this.bus));
      source.start();
      const hissSrc = ctx.createBufferSource();
      hissSrc.buffer = e.noise;
      hissSrc.loop = true;
      const hissFilter = ctx.createBiquadFilter();
      hissFilter.type = 'bandpass';
      hissFilter.frequency.value = 1800;
      hissFilter.Q.value = 0.6;
      const hiss = ctx.createGain();
      hiss.gain.value = 0;
      hissSrc.connect(hissFilter).connect(hiss).connect(/** @type {GainNode} */ (this.bus));
      hissSrc.start();
      this.rumble = { gain, filter, hiss };
    }
    const k = speed < MIN_SPEED ? 0 : Math.min(1, speed / 600);
    const now = ctx.currentTime;
    this.rumble.gain.gain.setTargetAtTime(k * (tunnel ? 0.75 : 0.45), now, 0.3);
    this.rumble.filter.frequency.setTargetAtTime(160 + k * 220, now, 0.3);
    this.rumble.hiss.gain.setTargetAtTime(k * (tunnel ? 0.012 : 0.02), now, 0.3);
  }
}

/**
 * Four seconds of brown noise (deeper than white noise, like a rumble).
 * @param {AudioContext} ctx
 */
function makeBrownNoise(ctx) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 4, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  let last = 0;
  for (let i = 0; i < data.length; i++) {
    last = (last + 0.02 * (Math.random() * 2 - 1)) / 1.02;
    data[i] = last * 3.5;
  }
  return buffer;
}
