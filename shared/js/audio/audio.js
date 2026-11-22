/**
 * @file The game's sound engine: one Web Audio context, a master volume and
 * the sound switches (no music, no sound at all).
 *
 * The sounds are recordings (see shared/assets/sounds): the engine loads
 * them once, then plays them through a master volume. Browsers only allow
 * sound after the player has touched the page, so the context starts on the
 * first touch, click or key. The switches are remembered on the device.
 */

const MUTE_KEY = 'trenul-lui-bubu/muted';
const MUSIC_KEY = 'trenul-lui-bubu/music-off';

export class AudioEngine {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    /** @type {GainNode | null} */
    this.master = null;
    this.muted = readFlag(MUTE_KEY);
    /** The music is off (the other sounds can still be on). */
    this.musicOff = readFlag(MUSIC_KEY);
    /** @type {Map<string, {url: string, normalize: boolean}>} name → file of every sound */
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
      for (const [name, file] of this.files) this.fetch(name, file.url, file.normalize);
    }
    if (this.ctx.state === 'suspended' && !this.muted) this.ctx.resume();
  }

  /**
   * Declares a recorded sound; it is loaded as soon as sound is allowed.
   * @param {string} name
   * @param {string} url
   * @param {{normalize?: boolean}} [options]  normalize: make it as loud as it can be without distortion
   */
  register(name, url, options = {}) {
    const file = { url, normalize: !!options.normalize };
    this.files.set(name, file);
    if (this.ctx) this.fetch(name, file.url, file.normalize);
  }

  /**
   * @private
   * @param {string} name
   * @param {string} url
   * @param {boolean} normalize
   */
  async fetch(name, url, normalize) {
    try {
      const res = await fetch(url);
      if (!res.ok) return;   // the file is missing: the game simply stays silent
      const data = await res.arrayBuffer();
      const ctx = /** @type {AudioContext} */ (this.ctx);
      const buffer = await ctx.decodeAudioData(data);
      if (normalize) normalizeBuffer(buffer);
      this.buffers.set(name, buffer);
    } catch {
      // a broken file only means no sound
    }
  }

  /**
   * Can a recorded sound be heard right now (loaded, sound on)?
   * @param {string} name
   */
  canPlay(name) {
    return this.ready && this.buffers.has(name);
  }

  /**
   * Seconds a recorded sound lasts (0 if it is not loaded).
   * @param {string} name
   */
  duration(name) {
    return this.buffers.get(name)?.duration ?? 0;
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
   * Turns the music off or on (and remembers the choice).
   * @param {boolean} off
   */
  setMusicOff(off) {
    this.musicOff = off;
    writeFlag(MUSIC_KEY, off);
  }

  /**
   * Turns all sound off or on (and remembers the choice).
   * @param {boolean} muted
   */
  setMuted(muted) {
    this.muted = muted;
    writeFlag(MUTE_KEY, muted);
    if (this.master && this.ctx) this.master.gain.setTargetAtTime(muted ? 0 : 0.8, this.ctx.currentTime, 0.05);
    if (this.ctx && !muted && this.ctx.state === 'suspended') this.ctx.resume();
  }
}

/**
 * @param {string} key
 * @returns {boolean}
 */
function readFlag(key) {
  try {
    return localStorage.getItem(key) === '1';
  } catch {
    return false;
  }
}

/**
 * @param {string} key
 * @param {boolean} on
 */
function writeFlag(key, on) {
  try {
    localStorage.setItem(key, on ? '1' : '0');
  } catch {
    // private mode: the choice simply is not remembered
  }
}

/**
 * Scales a sound so its loudest sample reaches just under full scale.
 * @param {AudioBuffer} buffer
 */
function normalizeBuffer(buffer) {
  let peak = 0;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < d.length; i++) peak = Math.max(peak, Math.abs(d[i]));
  }
  if (peak < 1e-4) return;
  const k = 0.95 / peak;
  for (let c = 0; c < buffer.numberOfChannels; c++) {
    const d = buffer.getChannelData(c);
    for (let i = 0; i < d.length; i++) d[i] *= k;
  }
}

/**
 * Connects the sound button of the heads-up display. It has three states,
 * one after the other: everything on (🔊), no music (🔈: the train, the
 * whistle and the brakes are still heard), no sound at all (🔇).
 * @param {AudioEngine} engine
 * @param {HTMLButtonElement} button
 */
export function setupSoundButton(engine, button) {
  const refresh = () => {
    const state = engine.muted ? 'off' : engine.musicOff ? 'nomusic' : 'on';
    button.textContent = { on: '🔊', nomusic: '🔈', off: '🔇' }[state];
    const label = { on: 'Fără muzică', nomusic: 'Fără sunet', off: 'Pornește sunetul și muzica' }[state];
    button.title = label;
    button.setAttribute('aria-label', label);
  };
  button.addEventListener('click', () => {
    if (engine.muted) {
      engine.setMuted(false);
      engine.setMusicOff(false);
    } else if (engine.musicOff) {
      engine.setMuted(true);
    } else {
      engine.setMusicOff(true);
    }
    refresh();
  });
  refresh();
}
