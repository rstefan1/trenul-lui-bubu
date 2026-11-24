/**
 * @file Travel mission "the signals on the line": Bubu drives the train and
 * obeys the light signals along the track, as a real driver does.
 *
 * The child drives freely with one big button: "Oprește" slows the train
 * down gently until it stands still, "Pornește" sets it off again. The
 * signals show only two colours (the yellow of the real signals would
 * confuse the youngest children):
 *
 *   green   the line is clear: go past it                 → a star
 *   red     stop before it; once the train stands still,
 *           the light turns green and the child sets off   → a star
 *
 * The train never runs a red light: the child can stop it until it is close
 * to the signal (a stop asked for late brakes harder, still right before
 * the signal); if the child has not stopped it by then, the automatic brake
 * does, and that signal earns no star.
 *
 * Every signal is seen well in advance: the view pans forward so more of the
 * line ahead is on screen, a big marker at the right edge shows the colour
 * of a signal still beyond the screen, and the screen in the driver's cab
 * (high up on the right) shows its colour, how far it is and the speed.
 *
 * The mission takes the controls of the train and gives them back at the end.
 *
 * Configuration (besides id/title/text):
 *   signals   the colours of the signals, in order
 */

import { clamp } from '../core/math.js';
import { MANUAL } from '../journey/journey.js';
import { CRUISE_SPEED } from '../journey/route.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { fillCircle, fillRoundRect, glow } from '../gfx/shapes.js';
import { zoomed } from '../gfx/ui-style.js';
import { TRACK_Y } from '../world/track.js';
import { el } from '../ui/dom.js';
import { leave } from '../ui/panel.js';
import { Mission } from './mission.js';

/** @typedef {'green' | 'red'} SignalColor */

/**
 * @typedef {object} Signal
 * @property {number} worldX      where the mast stands
 * @property {SignalColor} color  what it shows now (a red turns green once the train stops)
 * @property {boolean} forced     the automatic brake had to stop the train for it
 * @property {boolean} passed
 * @property {boolean} good       passed the right way (it earned a star)
 * @property {number} t           seconds since it was passed or since the train waits at it
 *
 * @typedef {import('./mission.js').MissionConfig & {signals: SignalColor[]}} SignalsConfig
 */

/** Speed of the freight train while the child drives (stage units/s). */
const DRIVE_SPEED = 400;
/** Braking rate of the child's stops: gentle, the train slows down for a while. */
const BRAKE = 170;
/** Braking rate of the automatic brake: almost the train's own, so it waits until the very last moment. */
const AUTO_BRAKE = MANUAL.brake - 20;
/** The front of the train stops this far before a red signal. */
const STOP_BEFORE = 140;
/** The cab screen and the edge marker show a signal from this far. */
const SHOW_AHEAD = 3600;
/** Seconds a red signal keeps the stopped train before it turns green. */
const RED_WAIT = 1.6;
/** The first signal and the space between the signals. */
const FIRST_AHEAD = 2800;
const SPACING = [3000, 3800];
/** Where the front of the train stands on screen during the mission (share of the width). */
const LOOK_AHEAD = 0.42;
/** Speed shown on the cab screen for the timetable's cruising speed (km/h). */
const KMH_AT_CRUISE = 80;

/** @type {Record<SignalColor, string>} lamp colours: lit, and dark */
const LAMP = { green: '#3ee07a', red: '#ff4436' };
const LAMP_OFF = { green: '#1d3b2a', red: '#3d1a18' };
/** Order of the lamps on the signal, from the top. */
const LAMP_ORDER = /** @type {SignalColor[]} */ (['green', 'red']);

export class SignalsMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {SignalsConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {Signal[]} */
    this.signals = [];
    /** The child wants the train to run (false: it slows down, or stands still). */
    this.running = true;
    /** @type {Signal | null} the red signal the automatic brake stops the train for */
    this.forcedStop = null;
    /** Where the train is braking to (world x of its front), while it stops, and how hard. */
    this.stopAtX = Infinity;
    this.stopRate = BRAKE;
    /** @type {Signal | null} the red signal the train stands at, waiting for the green light */
    this.waitingAt = null;
    this.time = 0;
    this.doneT = 0;
    /** @type {import('../journey/journey.js').Controls | null} */
    this.controls = null;
    /** @type {HTMLButtonElement | null} */
    this.button = null;
    this.particles = new Particles();
    /** @type {(e: KeyboardEvent) => void} */
    this.onKey = e => {
      if (e.code !== 'Space' || this.ctx.hud.paused) return;
      e.preventDefault();
      this.toggle();
    };
  }

  /** @param {{duration?: number, window?: {from: number, to: number}}} hints */
  start(hints) {
    super.start(hints);
    const j = this.ctx.journey;
    this.controls = j.takeControl();
    if (this.controls) this.controls.target = DRIVE_SPEED;
    const seg = j.segment;
    const end = seg.start + (hints.window ? hints.window.to : 0.9) * seg.length - 600;
    const first = j.distance + FIRST_AHEAD;
    const n = this.config.signals.length;
    const spacing = clamp((end - first) / Math.max(1, n - 1), SPACING[0], SPACING[1]);
    this.signals = this.config.signals.map((color, i) => ({
      worldX: first + i * spacing, color, forced: false, passed: false, good: false, t: 0,
    }));
    // more of the line ahead on screen: the signals are seen early
    this.ctx.world.lookAhead(LOOK_AHEAD);

    this.button = /** @type {HTMLButtonElement} */ (el('button', { class: 'brake-btn', type: 'button' }));
    this.button.addEventListener('pointerdown', e => {
      e.preventDefault();
      this.toggle();
    });
    // keyboard users: Enter/Space produce a click without pointer events
    this.button.addEventListener('click', e => { if (e.detail === 0) this.toggle(); });
    document.body.append(this.button);
    window.addEventListener('keydown', this.onKey);
    this.refreshButton();
    this.ctx.hud.setCounter('⭐', 0, n);
  }

  /** The first signal the train has not passed yet. */
  get next() {
    return this.signals.find(s => !s.passed) ?? null;
  }

  /** The next signal, when it is close enough to be shown. */
  get shown() {
    const s = this.next;
    return s && s.worldX - this.ctx.journey.distance < SHOW_AHEAD ? s : null;
  }

  /** @private The big button: stop the train, or set it off again. */
  toggle() {
    if (!this.controls || this.phase !== 'running') return;
    const j = this.ctx.journey;
    const s = this.shown;
    if (!this.running || this.forcedStop) {
      if (s && s.color === 'red' && (j.speed < 3 || this.forcedStop)) {
        // still red: a driver waits for the green light
        this.ctx.hud.announce('Semnalele de pe linie', 'Semnalul e încă roșu. Așteaptă să se facă verde!', 'Misiune', 2.5);
        return;
      }
      this.running = true;
      this.stopAtX = Infinity;
    } else {
      this.running = false;
      // with a red signal ahead the train stops right before it (braking harder if asked late);
      // otherwise it slows down gently where it is
      const natural = j.distance + (j.speed * j.speed) / (2 * BRAKE);
      const red = s && s.color === 'red' ? s.worldX - STOP_BEFORE : Infinity;
      this.stopAtX = Math.min(natural, red);
      const gap = Math.max(1, this.stopAtX - j.distance);
      this.stopRate = Math.max(BRAKE, (j.speed * j.speed) / (2 * gap));
    }
    this.refreshButton();
  }

  /** @private */
  refreshButton() {
    if (!this.button) return;
    const stopping = !this.running || !!this.forcedStop;
    this.button.textContent = stopping ? '▶ Pornește trenul' : '✋ Oprește trenul';
    this.button.classList.toggle('is-stopped', stopping);
    const s = this.shown;
    // pulse when the child should act: a red ahead while running, a green while standing
    const urgent = !!s && ((s.color === 'red' && !stopping) || (s.color === 'green' && stopping && this.ctx.journey.speed < 3));
    this.button.classList.toggle('is-urgent', urgent);
  }

  /** Screen x of a world position. */
  toScreen(/** @type {number} */ x) {
    return x - this.ctx.journey.distance + this.ctx.world.anchorX;
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    const j = this.ctx.journey;
    for (const sig of this.signals) sig.t += dt;
    const s = this.next;
    if (this.controls) {
      // a red signal and the child has not stopped: the automatic brake starts slowing
      // the train down long before the signal, and stops it right before it
      if (s && s.color === 'red' && this.running && !this.forcedStop) {
        const gap = s.worldX - STOP_BEFORE - j.distance;
        if (gap < (j.speed * j.speed) / (2 * AUTO_BRAKE) + 10) {
          this.forcedStop = s;
          s.forced = true;
          this.stopAtX = s.worldX - STOP_BEFORE;
          this.stopRate = AUTO_BRAKE;
          this.oops();
          this.ctx.hud.announce('Frâna automată!', 'Semnalul e roșu! Frâna automată oprește trenul. La roșu, apasă tu „Oprește”.', 'Misiune', 4);
        }
      }
      if (this.running && !this.forcedStop) {
        this.controls.target = DRIVE_SPEED;
        this.controls.stopIn = undefined;
      } else {
        // a smooth stop at stopAtX, never faster than now
        const gap = this.stopAtX - j.distance;
        this.controls.target = gap < 4 ? 0 : Math.min(j.speed, Math.sqrt(2 * this.stopRate * gap));
        this.controls.stopIn = Math.max(0, gap);
      }
      // standing before a red signal: after a moment the light turns green
      if (s && s.color === 'red' && j.speed < 3 && s === this.shown) {
        if (this.waitingAt !== s) {
          this.waitingAt = s;
          s.t = 0;
        }
        if (s.t > RED_WAIT) {
          s.color = 'green';
          this.running = false;
          this.forcedStop = null;
          this.stopAtX = j.distance;
          this.sound('chirp', this.toScreen(s.worldX));
          this.ctx.hud.announce(s.forced ? 'S-a făcut verde' : 'Bravo!',
            s.forced ? 'Acum poți porni trenul!' : 'Ai oprit la roșu, ca un mecanic adevărat. S-a făcut verde: pornește trenul!', 'Misiune', 3);
        }
      }
      if (s && j.distance > s.worldX + 10) this.pass(s);
    }
    this.refreshButton();
    const over = this.signals.every(x => x.passed);
    this.doneT = over ? this.doneT + dt : 0;
    if (this.doneT > 1.2 || this.phase === 'wrapping') this.finishMission();
  }

  /**
   * The train goes past a signal (always on green: a red one stops it).
   * @private
   * @param {Signal} s
   */
  pass(s) {
    s.passed = true;
    s.t = 0;
    s.good = !s.forced;
    if (s.good) {
      const x = this.toScreen(s.worldX);
      this.particles.burst(x, TRACK_Y - 330 - this.ctx.world.cameraY, SPARKS, 16, 220);
      this.sound('ding', x);
    }
    this.ctx.hud.setCounter('⭐', this.signals.filter(x => x.good).length, this.signals.length);
  }

  /** @private */
  finishMission() {
    if (this.phase === 'finished') return;
    if (this.controls) {
      this.controls = null;
      this.ctx.journey.releaseControl();
    }
    this.ctx.hud.hideCounter();
    const total = this.signals.length;
    const good = this.signals.filter(s => s.good).length;
    this.complete(good >= total ? 3 : good >= total - 1 ? 2 : 1, good >= total
      ? 'Ai respectat toate semnalele, ca un mecanic adevărat!'
      : `Ai trecut corect de ${good} semnale din ${total}. Trenul a mers în siguranță!`);
  }

  // ------------------------------------------------------------ canvas

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const stage = this.ctx.stage;
    c.save();
    c.translate(0, -this.ctx.world.cameraY);
    for (const s of this.signals) {
      const x = this.toScreen(s.worldX);
      if (x > stage.viewLeft - 120 && x < stage.viewRight + 120) this.drawSignal(c, s, x);
    }
    c.restore();
    this.drawEdgeMarker(c);
    this.drawCabScreen(c);
    this.particles.draw(c);
  }

  /**
   * A light signal in front of the track: a tall mast (its head stands above
   * the train, so it never hides Bubu in the cab) with two lamps, one lit.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {Signal} s
   * @param {number} x
   */
  drawSignal(c, s, x) {
    const base = TRACK_Y + 56;
    const headTop = base - 430;
    // the mast and its concrete foot
    fillRoundRect(c, x - 18, base - 14, 36, 18, 4, '#9e9e9e');
    c.fillStyle = '#5f6b7a';
    c.fillRect(x - 5, headTop + 110, 10, base - headTop - 118);
    // a white sign with black stripes under the head, as on the real signals
    fillRoundRect(c, x - 16, headTop + 128, 32, 40, 4, '#ffffff');
    c.fillStyle = '#1d1d24';
    for (let k = 0; k < 3; k++) c.fillRect(x - 16, headTop + 134 + k * 12, 32, 5);
    // the head and its two lamps
    fillRoundRect(c, x - 30, headTop + 10, 60, 100, 14, '#1d1d24');
    LAMP_ORDER.forEach((color, i) => {
      const ly = headTop + 38 + i * 44;
      const on = s.color === color;
      if (on) glow(c, x, ly, 56, `${LAMP[color]}aa`, `${LAMP[color]}00`);
      c.fillStyle = on ? LAMP[color] : LAMP_OFF[color];
      fillCircle(c, x, ly, 16);
      if (on) {
        c.fillStyle = 'rgba(255,255,255,0.6)';
        fillCircle(c, x - 5, ly - 5, 5);
      }
    });
    // a star rises from it once it is passed the right way
    if (s.passed && s.good && s.t < 2) {
      c.save();
      c.globalAlpha = clamp(2 - s.t, 0, 1);
      c.fillStyle = '#ffd23f';
      c.font = '800 40px "Baloo 2", system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('★', x + 50, headTop - 10 - s.t * 30);
      c.restore();
    }
  }

  /**
   * A signal still beyond the right edge of the screen: a big lamp of its
   * colour with an arrow, so the child knows early what comes.
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  drawEdgeMarker(c) {
    const s = this.shown;
    if (!s) return;
    const stage = this.ctx.stage;
    if (this.toScreen(s.worldX) < stage.viewRight + 30) return;
    const k = stage.ui;
    const right = stage.viewRight - 16;
    const y = TRACK_Y - 300 - this.ctx.world.cameraY;
    const bob = Math.sin(this.time * 5) * 6;
    zoomed(c, k, right, y, () => {
      const cx = right - 52 + bob;
      fillRoundRect(c, cx - 40, y - 40, 80, 80, 20, '#1d1d24');
      glow(c, cx, y, 70, `${LAMP[s.color]}aa`, `${LAMP[s.color]}00`);
      c.fillStyle = LAMP[s.color];
      fillCircle(c, cx, y, 26);
      // the arrow: the signal is that way
      c.fillStyle = '#ffffff';
      c.beginPath();
      c.moveTo(cx + 46, y - 16);
      c.lineTo(cx + 62, y);
      c.lineTo(cx + 46, y + 16);
      c.closePath();
      c.fill();
    });
  }

  /**
   * The screen in the driver's cab, high up on the right: the next signal,
   * how far it is, and the speed of the train.
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  drawCabScreen(c) {
    const stage = this.ctx.stage;
    const j = this.ctx.journey;
    const k = stage.ui;
    const right = stage.viewRight - 20;
    const top = stage.toStage(0, this.ctx.hud.hudBottom).y + 24;
    const w = 236;
    const h = 112;
    const x0 = right - w;
    const s = this.shown;
    zoomed(c, k, right, top, () => {
      fillRoundRect(c, x0, top, w, h, 18, '#1b2440');
      fillRoundRect(c, x0 + 6, top + 6, w - 12, h - 12, 14, '#0e1630');
      // the lamp of the next signal (dark when none is close)
      const lx = x0 + 52;
      const ly = top + h / 2;
      if (s) glow(c, lx, ly, 56, `${LAMP[s.color]}99`, `${LAMP[s.color]}00`);
      c.fillStyle = s ? LAMP[s.color] : '#2b3550';
      fillCircle(c, lx, ly, 28);
      c.fillStyle = '#ffffff';
      c.textAlign = 'left';
      c.textBaseline = 'middle';
      c.font = '800 16px "Baloo 2", system-ui, sans-serif';
      c.fillText(s ? 'Semnalul următor' : 'Calea e liberă', x0 + 92, top + 30);
      c.font = '800 22px "Baloo 2", system-ui, sans-serif';
      c.fillStyle = '#ffe39a';
      if (s) {
        const meters = Math.max(0, Math.round((s.worldX - j.distance) / 100)) * 10;
        c.fillText(meters > 0 ? `peste ${meters} m` : 'aici', x0 + 92, top + 58);
      }
      // the speedometer
      c.font = '700 16px "Baloo 2", system-ui, sans-serif';
      c.fillStyle = '#9fb3d9';
      c.fillText(`${Math.round((j.speed / CRUISE_SPEED) * KMH_AT_CRUISE)} km/h`, x0 + 92, top + 86);
    });
  }

  dispose() {
    this.ctx.world.lookAhead(null);
    if (this.controls) this.ctx.journey.releaseControl();
    this.ctx.hud.hideCounter();
    leave(this.button);
    window.removeEventListener('keydown', this.onKey);
  }
}
