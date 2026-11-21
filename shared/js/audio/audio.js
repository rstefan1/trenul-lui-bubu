/**
 * @file The game's sound engine: one Web Audio context, a master volume and
 * the "no sound" switch.
 *
 * The sounds are recordings (see shared/assets/sounds): the engine loads
 * them once, then plays them through a master volume. Browsers only allow
 * sound after the player has touched the page, so the context starts on the
 * first touch, click or key. Muting is remembered on the device.
 */

const MUTE_KEY = 'trenul-lui-bubu/muted';

export class AudioEngine {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    /** @type {GainNode | null} */
    this.master = null;
    this.muted = readMuted();
    /** @type {Map<string, string>} name → file of every sound */
    this.files = new Map();
    /** @type {Map<string, AudioBuffer>} sounds ready to play */
    this.buffers = new Map();
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
      for (const [name, url] of this.files) this.fetch(name, url);
    }
    if (this.ctx.state === 'suspended' && !this.muted) this.ctx.resume();
  }

  /**
   * Declares a recorded sound; it is loaded as soon as sound is allowed.
   * @param {string} name
   * @param {string} url
   */
  register(name, url) {
    this.files.set(name, url);
    if (this.ctx) this.fetch(name, url);
  }

  /**
   * @private
   * @param {string} name
   * @param {string} url
   */
  async fetch(name, url) {
    try {
      const res = await fetch(url);
      if (!res.ok) return;   // the file is missing: the game simply stays silent
      const data = await res.arrayBuffer();
      const ctx = /** @type {AudioContext} */ (this.ctx);
      this.buffers.set(name, await ctx.decodeAudioData(data));
    } catch {
      // a broken file only means no sound
    }
  }

  /**
   * Plays a recorded sound once.
   * @param {string} name
   * @param {number} [volume=1]
   */
  play(name, volume = 1) {
    const buffer = this.buffers.get(name);
    if (!this.ready || !buffer || !this.ctx || !this.master) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const g = this.ctx.createGain();
    g.gain.value = volume;
    src.connect(g).connect(this.master);
    src.start();
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
