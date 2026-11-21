/**
 * @file The game's sound engine: one Web Audio context, a master volume and
 * the "no sound" switch.
 *
 * All sounds are synthesised (no audio files): sound modules ask the engine
 * for its context and connect to its output. Browsers only allow sound after
 * the player has touched the page, so the context starts on the first touch,
 * click or key. Muting is remembered on the device.
 */

const MUTE_KEY = 'trenul-lui-bubu/muted';

export class AudioEngine {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    /** @type {GainNode | null} */
    this.master = null;
    this.muted = readMuted();
    /** @type {AudioBuffer | null} two seconds of white noise, shared by the sounds */
    this.noise = null;
    const unlock = () => this.unlock();
    for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, unlock, { capture: true });
    // stop everything while the page is hidden (another tab, phone locked)
    document.addEventListener('visibilitychange', () => {
      if (!this.ctx) return;
      if (document.hidden) this.ctx.suspend();
      else if (!this.muted) this.ctx.resume();
    });
  }

  /** True once sound can actually be heard. */
  get ready() {
    return !!this.ctx && this.ctx.state === 'running' && !this.muted;
  }

  /** @private Creates (or resumes) the audio context after a user gesture. */
  unlock() {
    if (!this.ctx) {
      const Ctx = window.AudioContext || /** @type {any} */ (window).webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = this.muted ? 0 : 0.8;
      this.master.connect(this.ctx.destination);
      this.noise = makeNoise(this.ctx);
    }
    if (this.ctx.state === 'suspended' && !this.muted) this.ctx.resume();
  }

  /**
   * Turns all sound off or on (and remembers the choice).
   * @param {boolean} muted
   */
  setMuted(muted) {
    this.muted = muted;
    try {
      localStorage.setItem(MUTE_KEY, muted ? '1' : '0');
    } catch {
      // private mode: the choice simply is not remembered
    }
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
    if (this.ctx && !muted && this.ctx.state === 'suspended') this.ctx.resume();
  }
}

/** @returns {boolean} */
function readMuted() {
  try {
    return localStorage.getItem(MUTE_KEY) === '1';
  } catch {
    return false;
  }
}

/**
 * Two seconds of white noise.
 * @param {AudioContext} ctx
 */
function makeNoise(ctx) {
  const buffer = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < data.length; i++) data[i] = Math.random() * 2 - 1;
  return buffer;
}

/**
 * Connects the "no sound" button of the heads-up display.
 * @param {AudioEngine} engine
 * @param {HTMLButtonElement} button
 */
export function setupSoundButton(engine, button) {
  const refresh = () => {
    button.textContent = engine.muted ? '🔇' : '🔊';
    const label = engine.muted ? 'Pornește sunetul' : 'Fără sunet';
    button.title = label;
    button.setAttribute('aria-label', label);
    button.setAttribute('aria-pressed', String(engine.muted));
  };
  button.addEventListener('click', () => {
    engine.setMuted(!engine.muted);
    refresh();
  });
  refresh();
}
