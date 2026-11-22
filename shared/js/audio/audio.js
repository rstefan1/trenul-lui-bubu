/**
 * @file The game's sound engine: one Web Audio context, a master volume and
 * the sound switches (no music, no sound at all).
 *
 * The sounds are recordings (see shared/assets/sounds): the engine loads
 * them once, then plays them through a master volume. Browsers only allow
 * sound after the player has touched the page, so the context starts on the
 * first touch, click or key. The switches are remembered on the device.
 *
 * The mix, from the sources to the speakers:
 *
 *   effects, train → master ─┬──────────────────────────→ out → speakers
 *                            └→ reverb (the room) → wet ─↗
 *   music → musicBus → duck ─┬──────────────────────────↗
 *                            └→ reverb
 *
 * "out" is the mute switch. The reverb gives every place its own room (a
 * station hall, a tunnel, the open fields); "duck" briefly lowers the music
 * while an important sound plays, so it is always heard clearly.
 */

const MUTE_KEY = 'trenul-lui-bubu/muted';
const MUSIC_KEY = 'trenul-lui-bubu/music-off';
/** Overall volume when the sound is on. */
const VOLUME = 0.8;
/** Milliseconds to fade out before the engine pauses when the sound is turned off. */
const MUTE_FADE_MS = 300;
/** Seconds of the reverb's tail. */
const REVERB_TAIL = 2.4;
/** How much of the music goes into the room, compared with the effects. */
const MUSIC_IN_ROOM = 0.6;
/** The music under an important sound (share of its volume), and the times to go down and back up. */
const DUCK_LEVEL = 0.35;
const DUCK_DOWN = 0.04;
const DUCK_UP = 0.35;

export class AudioEngine {
  constructor() {
    /** @type {AudioContext | null} */
    this.ctx = null;
    /** @type {GainNode | null} where the effects (and the train) go */
    this.master = null;
    /** @type {GainNode | null} where the music goes */
    this.musicBus = null;
    /** @type {GainNode | null} the mute switch, just before the speakers */
    this.out = null;
    /** @type {GainNode | null} how much of the room is heard */
    this.wet = null;
    /** @type {GainNode | null} lowers the music under important sounds */
    this.ducker = null;
    this.muted = readFlag(MUTE_KEY);
    /** The music is off (the other sounds can still be on). */
    this.musicOff = readFlag(MUSIC_KEY);
    /** @type {Map<string, {url: string, normalize: boolean}>} name → file of every sound */
    this.files = new Map();
    /** @type {Map<string, AudioBuffer>} sounds ready to play */
    this.buffers = new Map();
    /** @type {Record<string, Array<() => void>>} */
    this.listeners = {};
    const unlock = () => this.unlock();
    // iOS only counts some of these as a gesture that may start sound
    for (const type of ['pointerdown', 'touchend', 'click', 'keydown']) window.addEventListener(type, unlock, { capture: true });
    // iOS: play even with the ring/silent switch on silent (Safari 16.4+), like a game, not like a notification
    const session = /** @type {any} */ (navigator).audioSession;
    if (session) {
      try {
        session.type = 'playback';
      } catch {
        // not allowed: the switch decides, as before
      }
    }
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
      const ctx = new Ctx();
      this.ctx = ctx;
      this.out = ctx.createGain();
      this.out.gain.value = this.muted ? 0 : VOLUME;
      this.out.connect(ctx.destination);
      const room = ctx.createConvolver();
      room.buffer = makeRoom(ctx, REVERB_TAIL);
      this.wet = ctx.createGain();
      this.wet.gain.value = 0;
      room.connect(this.wet).connect(this.out);
      this.master = ctx.createGain();
      this.master.connect(this.out);
      this.master.connect(room);
      this.musicBus = ctx.createGain();
      this.ducker = ctx.createGain();
      this.musicBus.connect(this.ducker).connect(this.out);
      const musicRoom = ctx.createGain();
      musicRoom.gain.value = MUSIC_IN_ROOM;
      this.ducker.connect(musicRoom).connect(room);
      for (const [name, file] of this.files) this.fetch(name, file.url, file.normalize);
      this.emit('unlock');
      // the sound was left off last time: the engine waits, paused, until it is turned on
      if (this.muted) ctx.suspend();
    }
    // "suspended" after a pause, "interrupted" on iOS after a call or an alarm
    if (this.ctx.state !== 'running' && !this.muted && !document.hidden) this.ctx.resume();
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
   * @param {{rate?: number, pan?: number}} [o]  rate: playback speed (and pitch); pan: -1 left … 1 right
   */
  play(name, volume = 1, o = {}) {
    const buffer = this.buffers.get(name);
    if (!this.ready || !buffer || !this.ctx || !this.master) return;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    src.playbackRate.value = o.rate ?? 1;
    src.connect(this.voice(volume, o.pan ?? 0));
    src.start();
  }

  /**
   * The way in for one sound: its volume and its place between the left
   * and the right speaker.
   * @param {number} volume
   * @param {number} [pan=0]  -1 left … 1 right
   * @returns {AudioNode}
   */
  voice(volume, pan = 0) {
    const ctx = /** @type {AudioContext} */ (this.ctx);
    const g = ctx.createGain();
    g.gain.value = volume;
    if (pan && ctx.createStereoPanner) {
      const p = ctx.createStereoPanner();
      p.pan.value = Math.max(-1, Math.min(1, pan));
      g.connect(p).connect(/** @type {GainNode} */ (this.master));
    } else {
      g.connect(/** @type {GainNode} */ (this.master));
    }
    return g;
  }

  /**
   * Lowers the music for a moment, so an important sound is heard clearly.
   * @param {number} [hold=0.8]  seconds the music stays low
   */
  duck(hold = 0.8) {
    if (!this.ctx || !this.ducker) return;
    const g = this.ducker.gain;
    const now = this.ctx.currentTime;
    g.cancelScheduledValues(now);
    g.setTargetAtTime(DUCK_LEVEL, now, DUCK_DOWN / 3);
    g.setTargetAtTime(1, now + hold, DUCK_UP);
  }

  /**
   * The room the sounds are heard in: 0 = open fields (almost dry), up to
   * about 0.5 = a tunnel. Changes gently.
   * @param {number} amount
   */
  setSpace(amount) {
    if (!this.ctx || !this.wet || Math.abs(this.wet.gain.value - amount) < 0.005) return;
    this.wet.gain.setTargetAtTime(amount, this.ctx.currentTime, 0.4);
  }

  /**
   * Listens to the engine ("unlock": sound has just become possible).
   * @param {string} type
   * @param {() => void} fn
   */
  on(type, fn) {
    (this.listeners[type] ??= []).push(fn);
  }

  /**
   * @private
   * @param {string} type
   */
  emit(type) {
    for (const fn of this.listeners[type] ?? []) fn();
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
   * Turns all sound off or on (and remembers the choice). With the sound
   * off, the whole sound engine is paused (after a quick fade), so it costs
   * no processor time and no battery; it goes on from where it was when the
   * sound is turned on again.
   * @param {boolean} muted
   */
  setMuted(muted) {
    this.muted = muted;
    writeFlag(MUTE_KEY, muted);
    if (!this.out || !this.ctx) return;
    const ctx = this.ctx;
    this.out.gain.setTargetAtTime(muted ? 0 : VOLUME, ctx.currentTime, 0.05);
    if (!muted) {
      if (ctx.state !== 'running' && !document.hidden) ctx.resume();
      return;
    }
    // pause once the fade is over, unless the sound was turned on again meanwhile
    setTimeout(() => {
      if (this.muted && ctx.state === 'running') ctx.suspend();
    }, MUTE_FADE_MS);
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
 * The echo of a room, made up: two channels of noise that die away
 * exponentially, a little darker as they fade (high sounds are absorbed
 * first), with the two channels different for a wide, natural space.
 * @param {BaseAudioContext} ctx
 * @param {number} seconds
 */
function makeRoom(ctx, seconds) {
  const length = Math.round(ctx.sampleRate * seconds);
  const buffer = ctx.createBuffer(2, length, ctx.sampleRate);
  for (let c = 0; c < 2; c++) {
    const d = buffer.getChannelData(c);
    let low = 0;
    for (let i = 0; i < length; i++) {
      const t = i / length;
      // a one-pole low-pass that closes as the echo fades
      const k = 0.9 - 0.75 * t;
      low += k * ((Math.random() * 2 - 1) - low);
      d[i] = low * Math.pow(1 - t, 3) * 0.6;
    }
  }
  return buffer;
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
