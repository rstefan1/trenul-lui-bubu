/**
 * @file Station mission "light the fortress" (Deva).
 *
 * Three acts:
 *
 *   1. the ride — Bubu climbs the hill in the cabin of the inclined lift
 *      (the child only watches, a few seconds); then the view zooms in on
 *      the fortress, as large as the screen allows below the instructions;
 *   2. the torches — it is dark on the walls; the child moves Bubu's
 *      lantern (mouse or finger) and holds its light over every torch until
 *      it catches fire. Half-way, a gust of wind blows one torch out, which
 *      has to be lit again;
 *   3. the fortress shines — sparkles, a real fact about the place, and a
 *      button to go back to the train.
 *
 * Stars depend on how long the torches took (generously). When the mission
 * ends it sets its `flag` in the game state, so the fortress seen from the
 * train keeps its torches burning.
 */

import { clamp, easeInOut, lerp } from '../core/math.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { fillStar, glow } from '../gfx/shapes.js';
import { drawBubu } from '../train/bubu.js';
import { SceneMission } from './scene-mission.js';
import { devaLayout, drawDevaBackground, drawDevaFortress, drawDevaTorches, drawLiftCabin } from '../gfx/scenes/deva-fortress.js';

/** Seconds of the ride up the hill. */
const RIDE_TIME = 5;
/** Seconds the lantern must stay on a torch to light it. */
const LIGHT_TIME = 0.6;
/** Radius of the lantern's light. */
const BEAM_R = 115;
/** With a finger, the light is this far above the touch point (stage units). */
const TOUCH_LIFT = 90;
/** Seconds of the zoom from the whole hill to the fortress. */
const ZOOM_TIME = 1.4;
/** Height of the fortress from the Christmas star above it to the foot of its walls, at zoom 1. */
const FORTRESS_H = 400;

/**
 * @typedef {import('./mission.js').MissionConfig & {
 *   lightText: string, windText: string, doneText: string, fact: string, flag?: string
 * }} LanternConfig
 */

export class LanternMission extends SceneMission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {LanternConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {'ride' | 'light' | 'shine'} */
    this.act = 'ride';
    this.time = 0;
    this.actTime = 0;
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
    // the camera: the scene point `focus` is shown at `screen`, magnified `zoom` times
    const L = this.layout;
    this.focus = { x: (L.wallLeft + L.wallRight) / 2, y: L.wallTop - 250 + FORTRESS_H / 2 };
    this.cam = { zoom: 1, x: this.focus.x, y: this.focus.y };
    /** @type {{zoom: number, x: number, y: number} | null} camera at the start of a zoom */
    this.zoomFrom = null;
  }

  /**
   * The largest view of the fortress that fits between the instructions card
   * and the bottom of the screen.
   * @private
   * @param {number} [reserveBottom=0]  CSS pixels kept free at the bottom (for a panel)
   */
  fortressView(reserveBottom = 0) {
    const stage = this.ctx.stage;
    const L = this.layout;
    const cardBottom = this.ctx.hud.cardBottom;
    const top = Math.max(stage.viewTop + 110, cardBottom ? stage.toStage(0, cardBottom + 16).y : 0);
    const bottom = stage.toStage(0, window.innerHeight - reserveBottom).y - 30;
    const span = L.wallRight - L.wallLeft + 140;   // walls and corner towers
    const zoom = Math.max(1, Math.min(2.6, (bottom - top) / FORTRESS_H, (stage.width * 0.86) / span));
    return { zoom, x: stage.width / 2, y: top + (FORTRESS_H * zoom) / 2 };
  }

  /**
   * Scene → screen.
   * @param {{x: number, y: number}} p
   */
  toScreen(p) {
    const { zoom, x, y } = this.cam;
    return { x: x + (p.x - this.focus.x) * zoom, y: y + (p.y - this.focus.y) * zoom };
  }

  /**
   * Screen → scene.
   * @param {{x: number, y: number}} p
   */
  toScene(p) {
    const { zoom, x, y } = this.cam;
    return { x: this.focus.x + (p.x - x) / zoom, y: this.focus.y + (p.y - y) / zoom };
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  applyCamera(c) {
    const { zoom, x, y } = this.cam;
    c.translate(x, y);
    c.scale(zoom, zoom);
    c.translate(-this.focus.x, -this.focus.y);
  }

  start() {
    this.phase = 'running';
    this.ctx.world.train.setBubuVisible(false);
    this.ctx.hud.instruct(this.config.title, this.config.text);
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
    this.updateFade(dt);

    if (this.act === 'ride' && this.actTime >= RIDE_TIME) {
      this.setAct('light');
      this.ctx.hud.instruct(this.config.title, this.config.lightText);
      this.zoomFrom = { ...this.cam };
    } else if (this.act === 'light') {
      if (this.actTime <= ZOOM_TIME + 0.1) {
        // zoom in on the fortress (the target follows the card's real height)
        const to = this.fortressView();
        const k = easeInOut(clamp(this.actTime / ZOOM_TIME, 0, 1));
        const from = this.zoomFrom ?? this.cam;
        this.cam = { zoom: lerp(from.zoom, to.zoom, k), x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k) };
      }
      this.lightSeconds += dt;
      this.updateTorches(dt);
    } else if (this.act === 'shine') {
      this.glowAll = Math.min(1, this.glowAll + dt / 1.5);
      if (this.actTime <= ZOOM_TIME + 0.1) {
        // step back a little, so the lit fortress stays visible above the fact panel
        const to = this.fortressView(Math.min(340, window.innerHeight * 0.45));
        const k = easeInOut(clamp(this.actTime / ZOOM_TIME, 0, 1));
        const from = this.zoomFrom ?? this.cam;
        this.cam = { zoom: lerp(from.zoom, to.zoom, k), x: lerp(from.x, to.x, k), y: lerp(from.y, to.y, k) };
      }
      if (Math.random() < dt * 3) {
        const L = this.layout;
        this.particles.burst(lerp(L.wallLeft, L.wallRight, Math.random()), L.wallTop - 60 - Math.random() * 120, SPARKS, 16, 240);
      }
    }
  }

  /**
   * @private
   * @param {number} dt
   */
  updateTorches(dt) {
    const { torches } = this.layout;
    const beam = this.toScene(this.beam);
    torches.forEach((t, i) => {
      if (this.lit[i]) return;
      const near = Math.hypot(t.x - beam.x, t.y - beam.y) < (BEAM_R * 0.7) / this.cam.zoom;
      this.heat[i] = near ? this.heat[i] + dt : Math.max(0, this.heat[i] - dt * 0.5);
      if (this.heat[i] >= LIGHT_TIME) {
        this.lit[i] = true;
        this.heat[i] = 0;
        this.particles.burst(t.x, t.y - 14, ['#ffd54f', '#ff9a2e', '#ffffff'], 18, 200);
        this.sound('flame', t.x);
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
      this.sound('gust', t.x);
      this.ctx.hud.instruct(this.config.title, this.config.windText);
    }
    if (count === torches.length) {
      this.setAct('shine');
      this.zoomFrom = { ...this.cam };
      if (this.config.flag) this.ctx.state.setFlag(this.config.flag);
      const s = this.lightSeconds;
      this.showEnding({
        doneText: this.config.doneText,
        fact: this.config.fact,
        stars: s <= 25 ? 3 : s <= 45 ? 2 : 1,
        result: 'Cetatea Devei strălucește din nou deasupra orașului!',
        delay: 1.6,
      });
    }
  }

  /**
   * @private
   * @param {'ride' | 'light' | 'shine'} act
   */
  setAct(act) {
    this.act = act;
    this.actTime = 0;
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const stage = this.ctx.stage;
    const L = this.layout;
    const view = { top: stage.viewTop, bottom: stage.viewBottom };
    c.save();
    c.globalAlpha = this.fade;
    // the background must cover the whole screen, whatever the zoom
    const tl = this.toScene({ x: stage.viewLeft, y: stage.viewTop });
    const br = this.toScene({ x: stage.viewRight, y: stage.viewBottom });
    c.save();
    this.applyCamera(c);
    drawDevaBackground(c, L, this.ctx.world.light, {
      top: Math.min(view.top, tl.y), bottom: Math.max(view.bottom, br.y), left: tl.x, right: br.x,
    });
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

    c.restore();
    if (this.act === 'light') this.drawDarkness(c);
    c.save();
    this.applyCamera(c);
    drawDevaTorches(c, L, this.lit, this.time);
    if (this.act === 'light') this.drawHeat(c);
    if (this.act === 'shine') {
      // a Christmas star appears above the big tower
      const k = clamp(this.actTime / 1.2, 0, 1);
      const sx = (L.wallLeft + L.wallRight) / 2;
      glow(c, sx, L.wallTop - 215, 90 * k, 'rgba(255,230,140,0.7)', 'rgba(255,230,140,0)');
      c.fillStyle = '#ffd23f';
      fillStar(c, sx, L.wallTop - 215, 28 * k, 11 * k);
    }
    this.particles.draw(c);
    c.restore();
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
    const b = this.toScreen(this.layout.bubu);
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

  dispose() {
    super.dispose();
    this.ctx.world.train.setBubuVisible(true);
  }
}
