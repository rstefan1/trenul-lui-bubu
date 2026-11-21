/**
 * @file Station mission "light the fortress" (Deva).
 *
 * Three acts:
 *
 *   1. the ride — Bubu climbs the hill in the cabin of the inclined lift
 *      (the child only watches, a few seconds);
 *   2. the torches — it is dark on the walls; the child moves Bubu's
 *      lantern (mouse or finger) and holds its light over every torch until
 *      it catches fire. Half-way, a gust of wind blows one torch out, which
 *      has to be lit again;
 *   3. the fortress shines — sparkles, a real fact about the place, and a
 *      button to go back to the train.
 *
 * Stars depend on how long the torches took (generously).
 */

import { approach, clamp, easeInOut, lerp } from '../core/math.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { fillStar, glow } from '../gfx/shapes.js';
import { drawBubu } from '../train/bubu.js';
import { el } from '../ui/dom.js';
import { Mission } from './mission.js';
import { devaLayout, drawDevaBackground, drawDevaFortress, drawDevaTorches, drawLiftCabin } from './scenes/deva-fortress.js';

/** Seconds of the ride up the hill. */
const RIDE_TIME = 5;
/** Seconds the lantern must stay on a torch to light it. */
const LIGHT_TIME = 0.6;
/** Radius of the lantern's light. */
const BEAM_R = 115;
/** With a finger, the light is this far above the touch point (stage units). */
const TOUCH_LIFT = 90;
/** Seconds of the fade between the world and the scene. */
const FADE = 0.6;

/**
 * @typedef {import('./mission.js').MissionConfig & {
 *   lightText: string, windText: string, doneText: string, fact: string
 * }} LanternConfig
 */

export class LanternMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {LanternConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {'ride' | 'light' | 'shine' | 'leave'} */
    this.act = 'ride';
    this.time = 0;
    this.actTime = 0;
    this.fade = 0;
    this.layout = devaLayout(ctx.stage.width);
    /** @type {boolean[]} */
    this.lit = this.layout.torches.map(() => false);
    /** @type {number[]} seconds the lantern has spent on each torch */
    this.heat = this.layout.torches.map(() => 0);
    this.beam = { x: this.layout.bubu.x + 150, y: this.layout.bubu.y - 80 };
    this.windDone = false;
    this.lightSeconds = 0;
    this.glowAll = 0;
    this.particles = new Particles();
  }

  start() {
    this.phase = 'running';
    this.ctx.world.train.setBubuVisible(false);
    this.ctx.hud.announce(this.config.title, this.config.text);
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    this.aim(p);
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerMove(p) {
    this.aim(p);
  }

  /**
   * Moves the lantern's light. With a finger, the light is a little above
   * the touch point, so the finger does not hide the torch.
   * @private
   * @param {import('../core/input.js').PointerInfo} p
   */
  aim(p) {
    this.beam.x = p.x;
    this.beam.y = p.type === 'touch' ? p.y - TOUCH_LIFT : p.y;
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.actTime += dt;
    this.particles.update(dt);
    this.fade = approach(this.fade, this.act === 'leave' ? 0 : 1, 1 / FADE * 3, dt);

    if (this.act === 'ride' && this.actTime >= RIDE_TIME) {
      this.setAct('light');
      this.ctx.hud.announce(this.config.title, this.config.lightText, 'Misiune', 0);
    } else if (this.act === 'light') {
      this.lightSeconds += dt;
      this.updateTorches(dt);
    } else if (this.act === 'shine') {
      this.glowAll = Math.min(1, this.glowAll + dt / 1.5);
      if (Math.random() < dt * 3) {
        const L = this.layout;
        this.particles.burst(lerp(L.wallLeft, L.wallRight, Math.random()), L.wallTop - 60 - Math.random() * 120, SPARKS, 16, 240);
      }
    } else if (this.act === 'leave' && this.fade < 0.02) {
      const s = this.lightSeconds;
      this.complete(s <= 25 ? 3 : s <= 45 ? 2 : 1, 'Cetatea Devei strălucește din nou deasupra orașului!');
    }
  }

  /**
   * @private
   * @param {number} dt
   */
  updateTorches(dt) {
    const { torches } = this.layout;
    torches.forEach((t, i) => {
      if (this.lit[i]) return;
      const near = Math.hypot(t.x - this.beam.x, t.y - this.beam.y) < BEAM_R * 0.7;
      this.heat[i] = near ? this.heat[i] + dt : Math.max(0, this.heat[i] - dt * 0.5);
      if (this.heat[i] >= LIGHT_TIME) {
        this.lit[i] = true;
        this.heat[i] = 0;
        this.particles.burst(t.x, t.y - 14, ['#ffd54f', '#ff9a2e', '#ffffff'], 18, 200);
      }
    });
    const count = this.lit.filter(Boolean).length;
    if (!this.windDone && count === 3) {
      // a gust of wind blows out one of the lit torches
      this.windDone = true;
      const i = this.lit.findIndex(Boolean);
      this.lit[i] = false;
      const t = torches[i];
      this.particles.burst(t.x, t.y - 10, ['#d7dce8', '#ffffff'], 14, 160);
      this.ctx.hud.announce(this.config.title, this.config.windText, 'Misiune', 0);
    }
    if (count === torches.length) {
      this.setAct('shine');
      this.ctx.hud.hideAnnouncement();
      this.showFact();
    }
  }

  /**
   * @private
   * @param {'ride' | 'light' | 'shine' | 'leave'} act
   */
  setAct(act) {
    this.act = act;
    this.actTime = 0;
  }

  /** @private The fact and the button back to the train. */
  showFact() {
    const next = el('button', { class: 'big-btn', type: 'button' }, ['Înapoi la tren! 🚂']);
    next.addEventListener('click', () => {
      this.setPanel(null);
      this.setAct('leave');
    });
    setTimeout(() => {
      this.setPanel(el('div', { class: 'panel panel--bottom' }, [
        el('p', { class: 'puzzle-solved' }, [this.config.doneText]),
        el('p', { class: 'fact' }, [el('b', {}, ['Știai că? ']), this.config.fact]),
        next,
      ]));
    }, 1600);
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const stage = this.ctx.stage;
    const L = this.layout;
    const view = { top: stage.viewTop, bottom: stage.viewBottom };
    c.save();
    c.globalAlpha = this.fade;
    drawDevaBackground(c, L, this.ctx.world.light, view);
    drawDevaFortress(c, L, this.glowAll, this.time);

    if (this.act === 'ride') {
      const k = easeInOut(clamp(this.actTime / RIDE_TIME, 0, 1));
      const { liftFrom: a, liftTo: b } = L;
      const slope = Math.atan2(b.y - a.y, b.x - a.x);
      drawLiftCabin(c, lerp(a.x, b.x, k), lerp(a.y, b.y, k), slope, (cc, x, y, s) => drawBubu(cc, x, y, s));
    } else {
      // Bubu at the top of the lift, holding up her lantern
      drawBubu(c, L.bubu.x, L.bubu.y, 80, Math.sin(this.time * 2) * 0.05);
    }

    if (this.act === 'light') this.drawDarkness(c);
    drawDevaTorches(c, L, this.lit, this.time);
    if (this.act === 'light') this.drawHeat(c);
    if (this.act === 'shine' || this.act === 'leave') {
      // a Christmas star appears above the big tower
      const k = clamp(this.actTime / 1.2, 0, 1);
      const sx = (L.wallLeft + L.wallRight) / 2;
      glow(c, sx, L.wallTop - 215, 90 * k, 'rgba(255,230,140,0.7)', 'rgba(255,230,140,0)');
      c.fillStyle = '#ffd23f';
      fillStar(c, sx, L.wallTop - 215, 28 * k, 11 * k);
    }
    this.particles.draw(c);
    c.restore();
  }

  /**
   * Night on the walls: everything is darker except the lantern's light,
   * which falls from Bubu's lantern as a cone.
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  drawDarkness(c) {
    const stage = this.ctx.stage;
    const { x, y } = this.beam;
    c.fillStyle = 'rgba(5,10,32,0.55)';
    c.beginPath();
    c.rect(stage.viewLeft, stage.viewTop, stage.viewRight - stage.viewLeft, stage.viewBottom - stage.viewTop);
    c.arc(x, y, BEAM_R, 0, Math.PI * 2);
    c.fill('evenodd');
    // soft edge and the cone from the lantern
    glow(c, x, y, BEAM_R * 1.25, 'rgba(255,240,190,0.25)', 'rgba(255,240,190,0)');
    const b = this.layout.bubu;
    const g = c.createLinearGradient(b.x, b.y, x, y);
    g.addColorStop(0, 'rgba(255,240,190,0.35)');
    g.addColorStop(1, 'rgba(255,240,190,0.05)');
    const ang = Math.atan2(y - b.y, x - b.x) + Math.PI / 2;
    c.fillStyle = g;
    c.beginPath();
    c.moveTo(b.x + 26, b.y - 20);
    c.lineTo(x + Math.cos(ang) * BEAM_R * 0.8, y + Math.sin(ang) * BEAM_R * 0.8);
    c.lineTo(x - Math.cos(ang) * BEAM_R * 0.8, y - Math.sin(ang) * BEAM_R * 0.8);
    c.closePath();
    c.fill();
  }

  /**
   * A ring that fills up while the lantern warms a torch.
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  drawHeat(c) {
    this.layout.torches.forEach((t, i) => {
      const k = this.heat[i] / LIGHT_TIME;
      if (k <= 0 || this.lit[i]) return;
      c.strokeStyle = 'rgba(255,200,90,0.95)';
      c.lineWidth = 6;
      c.beginPath();
      c.arc(t.x, t.y - 4, 26, -Math.PI / 2, -Math.PI / 2 + k * Math.PI * 2);
      c.stroke();
    });
  }

  /**
   * @private
   * @param {HTMLElement | null} node
   */
  setPanel(node) {
    const root = this.ctx.panel;
    root.replaceChildren();
    root.hidden = !node;
    root.classList.toggle('is-bottom', !!node);
    if (node) root.append(node);
  }

  dispose() {
    this.setPanel(null);
    this.ctx.hud.hideAnnouncement();
    this.ctx.world.train.setBubuVisible(true);
  }
}
