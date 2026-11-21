/**
 * @file Station mission "a hat for Bubu" (Rădăuți).
 *
 * At the Christmas fair in Rădăuți, Bubu tries on the festive hats of
 * Bucovina: the black hat with a red band and a feather, the tall lambskin
 * cap, the hat with flowers, the red headscarf, the crown of flowers and the
 * hat with beads. The child picks one (and may change their mind), sees it
 * on Bubu at once, then presses "Gata!". Every choice is a good one: a calm,
 * happy stop before the end of the journey. Bubu keeps the hat on (at her
 * window and at Putna) until the end.
 *
 * Configuration (besides id/title/text): doneText, fact
 */

import { TAU } from '../core/math.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { HATS, drawBubuHat } from '../gfx/hats.js';
import { fillCircle, fillRoundRect, fillStar, glow } from '../gfx/shapes.js';
import { drawBubu } from '../train/bubu.js';
import { el } from '../ui/dom.js';
import { SceneMission } from './scene-mission.js';


/**
 * @typedef {import('./mission.js').MissionConfig & {doneText: string, fact: string}} CostumeConfig
 */

export class CostumeMission extends SceneMission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {CostumeConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    this.hat = -1;
    /** Seconds since the hat was put on (for a little bounce). */
    this.hatT = 9;
    this.time = 0;
    this.done = false;
    this.particles = new Particles();
    /** @type {HTMLButtonElement | null} */
    this.ready = null;
  }

  start() {
    this.phase = 'running';
    this.ctx.hud.instruct(this.config.title, this.config.text);
    const buttons = HATS.map((hat, i) => {
      const icon = /** @type {HTMLCanvasElement} */ (el('canvas', { class: 'costume-icon', width: '120', height: '120' }));
      const ic = /** @type {CanvasRenderingContext2D} */ (icon.getContext('2d'));
      // the widest hat is about 1.25 units wide and 0.8 tall: keep a margin all round
      ic.translate(60, 80);
      ic.scale(80, 80);
      hat.draw(ic);
      const b = /** @type {HTMLButtonElement} */ (el('button', { class: 'costume-btn', type: 'button', 'aria-label': hat.name, title: hat.name }, [icon]));
      b.addEventListener('click', () => {
        this.pick(i);
        buttons.forEach((x, k) => x.classList.toggle('is-picked', k === i));
      });
      return b;
    });
    this.ready = /** @type {HTMLButtonElement} */ (el('button', { class: 'big-btn', type: 'button', disabled: true }, ['Gata! ✨']));
    this.ready.addEventListener('click', () => this.finish());
    this.setPanel(el('div', { class: 'panel costume-panel' }, [
      el('p', { class: 'program-title' }, ['Alege o pălărie pentru Bubu:']),
      el('div', { class: 'costume-grid' }, buttons),
      this.ready,
    ]));
  }

  /**
   * @private
   * @param {number} i
   */
  pick(i) {
    if (this.done) return;
    this.hat = i;
    this.hatT = 0;
    const b = this.bubu;
    this.particles.burst(b.x, b.y - b.size * 0.4, SPARKS, 14, 180);
    if (this.ready) this.ready.disabled = false;
  }

  /** @private */
  finish() {
    if (this.done || this.hat < 0) return;
    this.done = true;
    // Bubu keeps the hat until the end of the journey
    this.ctx.state.setHat(this.hat);
    this.setPanel(null);
    const b = this.bubu;
    this.particles.burst(b.x, b.y, SPARKS, 40, 320);
    this.showEnding({
      doneText: this.config.doneText,
      fact: this.config.fact,
      stars: 3,
      result: `Bubu poartă ${HATS[this.hat].name.toLowerCase()}!`,
      delay: 1.4,
    });
  }

  /** Where Bubu stands: in the free space above the panel. */
  get bubu() {
    const stage = this.ctx.stage;
    const hud = this.ctx.hud;
    const top = stage.toStage(0, Math.max(hud.hudBottom, hud.cardBottom)).y + 20;
    const card = this.ctx.panel.hidden ? null : this.ctx.panel.firstElementChild;
    const panel = card ? card.getBoundingClientRect() : null;
    const bottom = panel ? stage.toStage(0, panel.top).y - 20 : stage.viewBottom - 40;
    const size = Math.max(130, Math.min(300, (bottom - top) * 0.6));
    return { x: stage.width / 2, y: bottom - size * 0.55, size };
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.hatT += dt;
    this.particles.update(dt);
    this.updateFade(dt);
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const stage = this.ctx.stage;
    c.save();
    c.globalAlpha = this.fade;
    // a Christmas morning at the fair: soft light, garlands
    const g = c.createLinearGradient(0, stage.viewTop, 0, stage.viewBottom);
    g.addColorStop(0, '#f6c18b');
    g.addColorStop(0.6, '#fbe3c0');
    g.addColorStop(1, '#eef3fb');
    c.fillStyle = g;
    c.fillRect(stage.viewLeft, stage.viewTop, stage.viewRight - stage.viewLeft, stage.viewBottom - stage.viewTop);
    const w = stage.viewRight - stage.viewLeft;
    for (let row = 0; row < 2; row++) {
      const y = stage.viewTop + 150 + row * 70;
      const wave = (/** @type {number} */ x) => y + Math.sin(((x - stage.viewLeft) / w) * TAU * 3 + row) * 18;
      c.strokeStyle = '#6d4c41';
      c.lineWidth = 2;
      c.beginPath();
      for (let x = stage.viewLeft; x <= stage.viewRight; x += 20) c.lineTo(x, wave(x));
      c.stroke();
      for (let x = stage.viewLeft + 20; x < stage.viewRight; x += 46) {
        c.fillStyle = ['#e53935', '#ffd23f', '#1e88e5', '#43a047'][Math.floor(x / 46 + row) % 4];
        fillCircle(c, x, wave(x) + 6, 7);
      }
    }
    // Bubu on a little wooden stand, with her hat
    const b = this.bubu;
    glow(c, b.x, b.y, b.size * 1.1, 'rgba(255,255,255,0.7)', 'rgba(255,255,255,0)');
    fillRoundRect(c, b.x - b.size * 0.75, b.y + b.size * 0.42, b.size * 1.5, b.size * 0.14, 12, '#8d6e63');
    const y = b.y + Math.sin(this.time * 2.4) * b.size * 0.015;
    drawBubu(c, b.x, y, b.size, 0);
    // the hat drops onto the head with a little bounce
    const drop = this.hatT < 0.35 ? (1 - this.hatT / 0.35) ** 2 * b.size * 0.4 : 0;
    drawBubuHat(c, this.hat, b.x, y, b.size, drop);
    if (this.done) {
      c.fillStyle = '#ffd23f';
      for (let i = 0; i < 5; i++) {
        const a = this.time * 0.8 + (i * TAU) / 5;
        fillStar(c, b.x + Math.cos(a) * b.size * 0.8, y + Math.sin(a) * b.size * 0.5, 12, 5);
      }
    }
    this.particles.draw(c);
    c.restore();
  }
}
