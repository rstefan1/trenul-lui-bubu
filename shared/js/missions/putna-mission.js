/**
 * @file Station mission "Christmas at Putna" — the end of the journey.
 *
 * Bubu arrives at the monastery on Christmas morning. In front of the white
 * walls and the bell tower, the child rings the big bell (three touches;
 * the bell swings and rings over the hills). Then Bubu's Christmas tree,
 * brought all the way on the flat wagon, stands next to the church,
 * decorated with the baubles caught on the journey. The ending gives the
 * last fact; going back brings the end of the journey.
 *
 * Configuration (besides id/title/text):
 *   rings      how many times to ring the bell
 *   treeText   instructions while the tree is decorated
 *   doneText, fact
 */

import { clamp, easeOutBack } from '../core/math.js';
import { BAUBLE_COLORS, drawBauble } from '../gfx/ornaments.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { drawFir, fillCircle, fillRoundRect, fillStar, glow } from '../gfx/shapes.js';
import { drawBubuHat } from '../gfx/hats.js';
import { drawBubu } from '../train/bubu.js';
import { SceneMission } from './scene-mission.js';

/** Where the baubles hang on the big tree, as fractions of its height (x from the axis, y from the top). */
const SPOTS = [[0, 0.22], [-0.1, 0.36], [0.12, 0.4], [-0.2, 0.52], [0.04, 0.55], [0.22, 0.6], [-0.26, 0.7], [-0.06, 0.72], [0.16, 0.76], [0.3, 0.82], [-0.32, 0.84], [0, 0.88]];

/**
 * @typedef {import('./mission.js').MissionConfig & {rings: number, treeText: string, doneText: string, fact: string}} PutnaConfig
 */

export class PutnaMission extends SceneMission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {PutnaConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {'bell' | 'tree' | 'done'} */
    this.step = 'bell';
    /** The carol is silent while the bell rings over the hills. */
    this.quietMusic = true;
    // only the birds while the child rings the big bell (no other bell far away)
    this.soundOfPlace = 'putnaBell';
    this.stepT = 0;
    this.time = 0;
    this.rings = 0;
    /** The bell's swing (radians) and its speed. */
    this.swing = 0;
    this.swingV = 0;
    /** @type {number[]} seconds since each sound wave started */
    this.waves = [];
    /** Baubles hung on the tree so far (one per touch). */
    this.hung = 0;
    this.particles = new Particles();
  }

  start() {
    this.phase = 'running';
    this.ctx.hud.instruct(this.config.title, this.config.text);
    this.ctx.hud.setCounter('🔔', 0, this.config.rings);
  }

  /** Colours of the baubles to hang: those caught on the journey (at least a few). */
  get baubles() {
    const caught = this.ctx.state.baubles;
    const list = caught.length ? caught : BAUBLE_COLORS;
    return SPOTS.map((_, i) => list[i % list.length]);
  }

  /** The scene's layout: ground line and the size of things. */
  get layout() {
    const stage = this.ctx.stage;
    const hud = this.ctx.hud;
    const top = stage.toStage(0, Math.max(hud.hudBottom, hud.cardBottom)).y + 10;
    const ground = stage.viewBottom - 90;
    const h = ground - top;
    const w = stage.viewRight - stage.viewLeft;
    const k = Math.min(h / 600, w / 1100);
    return {
      top, ground, k,
      left: stage.viewLeft, right: stage.viewRight,
      tower: { x: stage.width / 2 - 300 * k, y: ground },
      church: { x: stage.width / 2 + 120 * k, y: ground },
      tree: { x: stage.width / 2 + 380 * k, y: ground, h: 330 * k },
    };
  }

  /** Where the bell hangs (its pivot). */
  get bell() {
    const L = this.layout;
    return { x: L.tower.x, y: L.tower.y - 360 * L.k, r: 46 * L.k };
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    const L = this.layout;
    if (this.step === 'bell') {
      const b = this.bell;
      const reach = Math.max(120 * L.k, 60);
      if (Math.hypot(p.x - b.x, p.y - (b.y + b.r)) > reach) return;
      this.swingV += this.swing > 0 ? -2.6 : 2.6;
      if (Math.abs(this.swingV) < 1) this.swingV = 2.6;
      this.rings += 1;
      this.sound('churchBell', b.x);
      this.waves.push(0);
      this.ctx.hud.setCounter('🔔', this.rings, this.config.rings);
      if (this.rings >= this.config.rings) {
        setTimeout(() => this.toTree(), 1800);
        this.step = 'done';
      }
    } else if (this.step === 'tree') {
      const t = L.tree;
      if (Math.abs(p.x - t.x) > t.h * 0.45 || p.y < t.y - t.h - 20 || p.y > t.y + 10) return;
      if (this.hung >= SPOTS.length) return;
      const [u, v] = SPOTS[this.hung];
      this.particles.burst(t.x + u * t.h, t.y - t.h + v * t.h, SPARKS, 10, 160);
      this.sound('collect', t.x + u * t.h);
      this.hung += 1;
      this.ctx.hud.setCounter('🎄', this.hung, SPOTS.length);
      if (this.hung >= SPOTS.length) this.finish();
    }
  }

  /** @private */
  toTree() {
    if (this.phase === 'finished') return;
    this.step = 'tree';
    this.quietMusic = false;
    this.soundOfPlace = 'putna';
    this.stepT = 0;
    this.ctx.hud.setCounter('🎄', 0, SPOTS.length);
    this.ctx.hud.instruct(this.config.title, this.config.treeText);
  }

  /** @private */
  finish() {
    this.step = 'done';
    this.stepT = 0;
    this.ctx.hud.hideCounter();
    const L = this.layout;
    this.particles.burst(L.tree.x, L.tree.y - L.tree.h, SPARKS, 50, 360);
    this.showEnding({
      doneText: this.config.doneText,
      fact: this.config.fact,
      stars: 3,
      result: 'Crăciun fericit la Putna!',
      delay: 1.6,
    });
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.stepT += dt;
    this.particles.update(dt);
    this.updateFade(dt);
    // the bell swings like a pendulum and slowly calms down
    this.swingV += -this.swing * 9 * dt;
    this.swingV *= Math.exp(-0.6 * dt);
    this.swing = clamp(this.swing + this.swingV * dt, -0.9, 0.9);
    this.waves = this.waves.map(w => w + dt).filter(w => w < 2.4);
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const stage = this.ctx.stage;
    const L = this.layout;
    c.save();
    c.globalAlpha = this.fade;
    // Christmas morning: a clear winter sky with the sun over the hills
    const g = c.createLinearGradient(0, stage.viewTop, 0, L.ground);
    g.addColorStop(0, '#7fb2e5');
    g.addColorStop(1, '#fde7c4');
    c.fillStyle = g;
    c.fillRect(L.left, stage.viewTop, L.right - L.left, stage.viewBottom - stage.viewTop);
    glow(c, L.left + (L.right - L.left) * 0.18, L.ground - 300 * L.k, 220 * L.k, 'rgba(255,240,190,0.85)', 'rgba(255,240,190,0)');
    c.fillStyle = '#fff3cf';
    fillCircle(c, L.left + (L.right - L.left) * 0.18, L.ground - 300 * L.k, 46 * L.k);
    // hills with forests
    for (const [base, amp, col] of [[L.ground - 190 * L.k, 50 * L.k, '#a9bede'], [L.ground - 110 * L.k, 40 * L.k, '#cbd8ec']]) {
      c.fillStyle = /** @type {string} */ (col);
      c.beginPath();
      c.moveTo(L.left, L.ground);
      for (let x = L.left; x <= L.right + 20; x += 20) c.lineTo(x, /** @type {number} */ (base) - Math.sin(x / 260) * /** @type {number} */ (amp) - Math.sin(x / 97) * /** @type {number} */ (amp) * 0.3);
      c.lineTo(L.right + 20, L.ground);
      c.closePath();
      c.fill();
    }
    for (let x = L.left + 20; x < L.right; x += 70) drawFir(c, x, L.ground - 140 * L.k + Math.sin(x / 260) * -40 * L.k, 60 * L.k, { color: '#3d6b5a', shade: '#335a4c', snowy: true });
    // the monastery's white wall
    c.fillStyle = '#f4f1ea';
    c.fillRect(L.left, L.ground - 90 * L.k, L.right - L.left, 90 * L.k);
    c.fillStyle = '#6d4c41';
    c.fillRect(L.left, L.ground - 100 * L.k, L.right - L.left, 14 * L.k);
    c.fillStyle = '#f4f8ff';
    c.fillRect(L.left, L.ground - 106 * L.k, L.right - L.left, 7 * L.k);
    this.drawChurch(c, L);
    this.drawTower(c, L);
    this.drawTree(c, L);
    // snow on the ground, and Bubu
    c.fillStyle = '#eef3fb';
    c.fillRect(L.left, L.ground, L.right - L.left, stage.viewBottom - L.ground);
    const bx = this.step === 'bell' || (this.step === 'done' && this.hung === 0) ? L.tower.x + 120 * L.k : L.tree.x - 170 * L.k;
    drawBubu(c, bx, L.ground - 40 * L.k, 90 * L.k, Math.sin(this.time * 2) * 0.06);
    drawBubuHat(c, this.ctx.state.hat, bx, L.ground - 40 * L.k, 90 * L.k);
    this.particles.draw(c);
    c.restore();
  }

  /**
   * The church: white walls, a big dark roof and a tower with a cross.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {any} L
   */
  drawChurch(c, L) {
    const { x, y } = L.church;
    const k = L.k;
    c.fillStyle = '#fbf8f1';
    c.fillRect(x - 170 * k, y - 170 * k, 340 * k, 170 * k);
    fillRoundRect(c, x + 150 * k, y - 150 * k, 60 * k, 150 * k, 30 * k, '#fbf8f1');
    c.fillStyle = '#4e342e';
    c.beginPath();
    c.moveTo(x - 200 * k, y - 160 * k);
    c.lineTo(x - 140 * k, y - 230 * k);
    c.lineTo(x + 160 * k, y - 230 * k);
    c.lineTo(x + 230 * k, y - 150 * k);
    c.closePath();
    c.fill();
    c.fillStyle = '#f4f8ff';
    c.beginPath();
    c.moveTo(x - 200 * k, y - 160 * k);
    c.lineTo(x - 140 * k, y - 230 * k);
    c.lineTo(x + 160 * k, y - 230 * k);
    c.lineTo(x + 230 * k, y - 150 * k);
    c.lineTo(x + 210 * k, y - 152 * k);
    c.lineTo(x + 150 * k, y - 218 * k);
    c.lineTo(x - 130 * k, y - 218 * k);
    c.lineTo(x - 182 * k, y - 160 * k);
    c.closePath();
    c.fill();
    c.fillStyle = '#fbf8f1';
    c.fillRect(x - 30 * k, y - 300 * k, 60 * k, 75 * k);
    c.fillStyle = '#4e342e';
    c.beginPath();
    c.moveTo(x - 42 * k, y - 296 * k);
    c.quadraticCurveTo(x, y - 370 * k, x + 42 * k, y - 296 * k);
    c.closePath();
    c.fill();
    c.fillStyle = '#e3b23c';
    c.fillRect(x - 3 * k, y - 400 * k, 6 * k, 44 * k);
    c.fillRect(x - 14 * k, y - 388 * k, 28 * k, 6 * k);
    c.fillStyle = '#5d4037';
    for (const wx of [-110, -40, 40, 110]) {
      c.beginPath();
      c.moveTo(x + (wx - 9) * k, y - 70 * k);
      c.lineTo(x + (wx - 9) * k, y - 112 * k);
      c.quadraticCurveTo(x + wx * k, y - 128 * k, x + (wx + 9) * k, y - 112 * k);
      c.lineTo(x + (wx + 9) * k, y - 70 * k);
      c.fill();
    }
    fillRoundRect(c, x - 22 * k, y - 66 * k, 44 * k, 66 * k, 18 * k, '#6d4c41');
  }

  /**
   * The bell tower with its swinging bell and the rings of sound.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {any} L
   */
  drawTower(c, L) {
    const { x, y } = L.tower;
    const k = L.k;
    c.fillStyle = '#f7f4ec';
    c.fillRect(x - 80 * k, y - 300 * k, 160 * k, 300 * k);
    // the open belfry
    c.fillStyle = '#3e2f27';
    c.beginPath();
    c.moveTo(x - 55 * k, y - 300 * k);
    c.lineTo(x - 55 * k, y - 400 * k);
    c.quadraticCurveTo(x, y - 450 * k, x + 55 * k, y - 400 * k);
    c.lineTo(x + 55 * k, y - 300 * k);
    c.closePath();
    c.fill();
    c.fillStyle = '#f7f4ec';
    c.fillRect(x - 90 * k, y - 470 * k, 180 * k, 30 * k);
    c.fillRect(x - 90 * k, y - 440 * k, 35 * k, 140 * k);
    c.fillRect(x + 55 * k, y - 440 * k, 35 * k, 140 * k);
    c.fillStyle = '#4e342e';
    c.beginPath();
    c.moveTo(x - 110 * k, y - 466 * k);
    c.lineTo(x, y - 540 * k);
    c.lineTo(x + 110 * k, y - 466 * k);
    c.closePath();
    c.fill();
    c.fillStyle = '#e3b23c';
    c.fillRect(x - 3 * k, y - 585 * k, 6 * k, 48 * k);
    c.fillRect(x - 13 * k, y - 572 * k, 26 * k, 6 * k);
    fillRoundRect(c, x - 26 * k, y - 220 * k, 52 * k, 220 * k, 22 * k, '#6d4c41');
    // the bell
    const b = this.bell;
    if (this.step === 'bell') glow(c, b.x, b.y + b.r, b.r * 2.6, `rgba(255,230,140,${0.3 + 0.15 * Math.sin(this.time * 4)})`, 'rgba(255,230,140,0)');
    c.save();
    c.translate(b.x, b.y);
    c.rotate(this.swing);
    c.fillStyle = '#c9952c';
    c.beginPath();
    c.moveTo(-b.r * 0.45, 0);
    c.quadraticCurveTo(-b.r * 0.6, b.r * 1.2, -b.r * 1.05, b.r * 1.7);
    c.lineTo(b.r * 1.05, b.r * 1.7);
    c.quadraticCurveTo(b.r * 0.6, b.r * 1.2, b.r * 0.45, 0);
    c.closePath();
    c.fill();
    c.fillStyle = '#e8b84a';
    c.fillRect(-b.r * 1.05, b.r * 1.5, b.r * 2.1, b.r * 0.2);
    c.fillStyle = '#7a5a20';
    fillCircle(c, 0, b.r * 1.8, b.r * 0.2);
    c.restore();
    // rings of sound
    for (const w of this.waves) {
      c.strokeStyle = `rgba(255,214,90,${0.8 * (1 - w / 2.4)})`;
      c.lineWidth = 6 * k + 2;
      c.beginPath();
      c.arc(b.x, b.y + b.r, b.r * 1.5 + w * 260 * k, -Math.PI * 0.9, -Math.PI * 0.1);
      c.stroke();
    }
  }

  /**
   * Bubu's tree, which travelled on the flat wagon; baubles appear one by one.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {any} L
   */
  drawTree(c, L) {
    // the tree comes after the bell has rung
    if (this.step === 'bell' || (this.step === 'done' && this.hung === 0)) return;
    const appear = this.step === 'tree' && this.hung === 0 ? easeOutBack(clamp(this.stepT / 0.8, 0, 1)) : 1;
    const t = L.tree;
    const h = t.h * appear;
    if (h <= 1) return;
    if (this.step === 'tree') glow(c, t.x, t.y - h / 2, h * 0.7, `rgba(255,240,170,${0.25 + 0.1 * Math.sin(this.time * 4)})`, 'rgba(255,240,170,0)');
    fillRoundRect(c, t.x - h * 0.12, t.y - h * 0.1, h * 0.24, h * 0.12, 4, '#a1887f');
    drawFir(c, t.x, t.y - h * 0.08, h, { snowy: true });
    const colors = this.baubles;
    for (let i = 0; i < this.hung; i++) {
      const [u, v] = SPOTS[i];
      drawBauble(c, t.x + u * h, t.y - h + v * h, Math.max(6, h * 0.035), colors[i]);
    }
    if (this.hung >= SPOTS.length) {
      // the star sits right on the tip of the tree (the fir stands on its pot,
      // so its tip is at y − 1.08 h); its lower points rest on the tip
      const R = 18;
      const sy = t.y - h * 1.08 - R * 0.55;
      c.fillStyle = '#ffd23f';
      glow(c, t.x, sy, 40, 'rgba(255,220,100,0.7)', 'rgba(255,220,100,0)');
      fillStar(c, t.x, sy, R, 8);
    }
  }
}
