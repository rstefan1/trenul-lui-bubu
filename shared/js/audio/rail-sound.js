/**
 * @file The sound of the train on the rails: the "ta-dam, ta-dam" of the
 * wheels over the rail joints, and a soft rolling rumble.
 *
 * The rails are laid in lengths of about 25 m, with a small gap between
 * them. Every axle of the train knocks when it rolls over a gap, so each
 * car makes a "ta-dam" (the two axles of a bogie, close together) as its
 * front bogie passes and another one as its rear bogie passes. The sound
 * follows the real wheels: the module watches the train's distance and
 * plays a knock whenever an axle crosses a joint, so the rhythm speeds up
 * and slows down with the train, and stops when it stops. Knocks are panned
 * left or right according to where the axle is on the screen, and are a
 * little louder and duller in tunnels.
 */

/** Distance between two rail joints (stage units; a coach is ~330 long, about 26 m). */
const JOINT = 320;
/** Below this speed the wheels are too slow to knock. */
const MIN_SPEED = 25;
/** At most this many knocks start in one frame (a jump in time would be noisy). */
const MAX_PER_FRAME = 6;

export class RailSound {
  /** @param {import('./audio.js').AudioEngine} engine */
  constructor(engine) {
    this.engine = engine;
    /** @type {number | null} distance at the last update */
    this.last = null;
    /** @type {{source: AudioBufferSourceNode, gain: GainNode, filter: BiquadFilterNode} | null} */
    this.rumble = null;
  }

  /**
   * @param {number} distance   front of the train (stage units travelled)
   * @param {number} speed      stage units per second
   * @param {number[]} axles    x of every axle relative to the front of the train (≤ 0)
   * @param {{anchorX: number, width: number, tunnel: boolean, paused: boolean}} view
   */
  update(distance, speed, axles, view) {
    const last = this.last;
    this.last = distance;
    const e = this.engine;
    if (!e.ready || !e.ctx || !e.master) return;
    this.updateRumble(view.paused ? 0 : speed, view.tunnel);
    if (last === null || view.paused || speed < MIN_SPEED || distance <= last || distance - last > JOINT) return;
    const loud = Math.min(1, 0.35 + speed / 900) * (view.tunnel ? 1.4 : 1);
    let played = 0;
    for (const a of axles) {
      const before = Math.floor((last + a) / JOINT);
      const now = Math.floor((distance + a) / JOINT);
      if (now === before) continue;
      const pan = Math.max(-1, Math.min(1, ((view.anchorX + a) / view.width) * 2 - 1));
      this.knock(loud, pan, view.tunnel);
      if (++played >= MAX_PER_FRAME) break;
    }
  }

  /**
   * One wheel over one joint: a short metallic click on top of a low thump.
   * @private
   * @param {number} loud  0..1.4
   * @param {number} pan   −1 (left) .. 1 (right)
   * @param {boolean} tunnel
   */
  knock(loud, pan, tunnel) {
    const e = this.engine;
    const ctx = /** @type {AudioContext} */ (e.ctx);
    const t = ctx.currentTime + 0.005;
    const out = ctx.createStereoPanner ? ctx.createStereoPanner() : null;
    if (out) {
      out.pan.value = pan * 0.7;
      out.connect(/** @type {GainNode} */ (e.master));
    }
    const dest = out ?? /** @type {GainNode} */ (e.master);
    // the thump: a low sine falling quickly in pitch
    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(tunnel ? 85 : 110, t);
    osc.frequency.exponentialRampToValueAtTime(45, t + 0.09);
    const g1 = ctx.createGain();
    g1.gain.setValueAtTime(0.0001, t);
    g1.gain.exponentialRampToValueAtTime(0.32 * loud, t + 0.004);
    g1.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
    osc.connect(g1).connect(dest);
    osc.start(t);
    osc.stop(t + 0.14);
    // the click: a burst of filtered noise, steel on steel
    const src = ctx.createBufferSource();
    src.buffer = e.noise;
    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.value = tunnel ? 1300 : 2100;
    bp.Q.value = 1.6;
    const g2 = ctx.createGain();
    g2.gain.setValueAtTime(0.0001, t);
    g2.gain.exponentialRampToValueAtTime(0.16 * loud, t + 0.002);
    g2.gain.exponentialRampToValueAtTime(0.0001, t + 0.05);
    src.connect(bp).connect(g2).connect(dest);
    src.start(t, Math.random() * 1.5, 0.08);
  }

  /**
   * The soft rolling rumble under the knocks, louder when faster.
   * @private
   * @param {number} speed
   * @param {boolean} tunnel
   */
  updateRumble(speed, tunnel) {
    const e = this.engine;
    const ctx = /** @type {AudioContext} */ (e.ctx);
    if (!this.rumble) {
      const source = ctx.createBufferSource();
      source.buffer = e.noise;
      source.loop = true;
      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.value = 180;
      const gain = ctx.createGain();
      gain.gain.value = 0;
      source.connect(filter).connect(gain).connect(/** @type {GainNode} */ (e.master));
      source.start();
      this.rumble = { source, gain, filter };
    }
    const level = speed < MIN_SPEED ? 0 : Math.min(1, speed / 600) * (tunnel ? 0.22 : 0.12);
    this.rumble.gain.gain.setTargetAtTime(level, ctx.currentTime, 0.25);
    this.rumble.filter.frequency.setTargetAtTime(140 + speed * 0.25, ctx.currentTime, 0.25);
  }
}
