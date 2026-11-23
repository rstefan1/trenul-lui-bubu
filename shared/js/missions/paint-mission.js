/**
 * @file Station mission "paint the monastery" (paint by numbers, Gura
 * Humorului — the Voroneț monastery is nearby).
 *
 * A painted monastery church is drawn in outline; every part carries a
 * number. The palette at the bottom has the same numbers with their colours.
 * The child picks a colour and touches the parts with that number. A wrong
 * colour does not stick (the part only shakes). When everything is painted,
 * little saints appear on the blue walls, as on the real painted churches.
 *
 * Configuration (besides id/title/text): doneText, fact
 */

import { clamp } from '../core/math.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { fillCircle, fillRoundRect, glow } from '../gfx/shapes.js';
import { drawWinterValley } from '../gfx/scenes/winter-valley.js';
import { drawBubuHat } from '../gfx/hats.js';
import { drawBubu } from '../train/bubu.js';
import { el } from '../ui/dom.js';
import { SceneMission } from './scene-mission.js';

/** Size of the drawing in its own units. */
const DESIGN_W = 130;
const DESIGN_H = 100;

/** The palette: number → colour and name. */
const COLORS = [
  { n: 1, color: '#1f5fa8', name: 'albastru' },
  { n: 2, color: '#6d4c41', name: 'maro' },
  { n: 3, color: '#e3b23c', name: 'auriu' },
  { n: 4, color: '#c0392b', name: 'roșu' },
];

/**
 * The parts of the church, in drawing order: outline as a path in design
 * units, the colour number, and where the number is written.
 * @type {ReadonlyArray<{id: string, n: number, label: [number, number], path: (p: Path2D) => void}>}
 */
const PARTS = [
  { id: 'wall', n: 1, label: [44, 72], path: p => p.rect(18, 54, 84, 42) },
  { id: 'apse', n: 1, label: [111, 80], path: p => { p.moveTo(102, 60); p.lineTo(110, 60); p.quadraticCurveTo(122, 62, 122, 78); p.lineTo(122, 96); p.lineTo(102, 96); p.closePath(); } },
  { id: 'drum', n: 1, label: [68.4, 45], path: p => p.rect(52, 34, 20, 18) },
  { id: 'roof', n: 2, label: [86, 48], path: p => { p.moveTo(8, 58); p.lineTo(30, 42); p.lineTo(52, 42); p.lineTo(52, 52); p.lineTo(72, 52); p.lineTo(72, 42); p.lineTo(98, 42); p.lineTo(126, 62); p.lineTo(126, 64); p.lineTo(8, 60); p.closePath(); } },
  { id: 'cap', n: 2, label: [62, 27], path: p => { p.moveTo(48, 35); p.quadraticCurveTo(62, 10, 76, 35); p.closePath(); } },
  // the cross stands on the top of the cap (the curve above peaks at y 22.5)
  { id: 'cross', n: 3, label: [70, 13], path: p => { p.rect(61, 8, 2.6, 15.5); p.rect(57.5, 12, 9.6, 2.6); } },
  { id: 'win1', n: 3, label: [60, 72], path: p => { p.moveTo(56, 80); p.lineTo(56, 70); p.quadraticCurveTo(59, 64, 62, 70); p.lineTo(62, 80); p.closePath(); } },
  { id: 'win2', n: 3, label: [84, 72], path: p => { p.moveTo(80, 80); p.lineTo(80, 70); p.quadraticCurveTo(83, 64, 86, 70); p.lineTo(86, 80); p.closePath(); } },
  { id: 'win3', n: 3, label: [62, 44], path: p => { p.moveTo(59.5, 48); p.lineTo(59.5, 41); p.quadraticCurveTo(62, 37, 64.5, 41); p.lineTo(64.5, 48); p.closePath(); } },
  { id: 'door', n: 4, label: [36, 86], path: p => { p.moveTo(30, 96); p.lineTo(30, 82); p.quadraticCurveTo(36, 72, 42, 82); p.lineTo(42, 96); p.closePath(); } },
];

/**
 * @typedef {import('./mission.js').MissionConfig & {doneText: string, fact: string}} PaintConfig
 */

export class PaintMission extends SceneMission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {PaintConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {Map<string, Path2D>} */
    this.paths = new Map(PARTS.map(part => {
      const p = new Path2D();
      part.path(p);
      return [part.id, p];
    }));
    /** @type {Set<string>} */
    this.painted = new Set();
    /** @type {Map<string, number>} seconds a part still shakes */
    this.shake = new Map();
    /** @type {Map<string, number>} seconds since a part was painted */
    this.since = new Map();
    this.brush = 0;
    this.mistakes = 0;
    this.time = 0;
    this.doneT = -1;
    /** @type {HTMLButtonElement[]} */
    this.buttons = [];
    this.particles = new Particles();
    /** A small canvas only used to test points against the parts. */
    this.hit = /** @type {CanvasRenderingContext2D} */ (document.createElement('canvas').getContext('2d'));
  }

  start() {
    this.phase = 'running';
    this.ctx.hud.instruct(this.config.title, this.config.text);
    this.ctx.hud.setCounter('🎨', 0, PARTS.length);
    this.buttons = COLORS.map((col, i) => {
      const b = /** @type {HTMLButtonElement} */ (el('button', { class: 'paint-btn', type: 'button', style: `--paint: ${col.color}`, 'aria-label': `Culoarea ${col.n}, ${col.name}` }, [String(col.n)]));
      b.addEventListener('click', () => this.pick(i));
      return b;
    });
    this.setPanel(el('div', { class: 'panel paint-panel' }, [
      el('p', { class: 'program-title' }, ['Alege o culoare, apoi atinge părțile cu același număr.']),
      el('div', { class: 'paint-palette' }, this.buttons),
    ]));
    this.pick(0);
  }

  /**
   * @private
   * @param {number} i
   */
  pick(i) {
    this.brush = i;
    this.buttons.forEach((b, k) => b.classList.toggle('is-picked', k === i));
  }

  /** Where the drawing is: between the heads-up display and the palette. */
  get box() {
    const stage = this.ctx.stage;
    const hud = this.ctx.hud;
    const top = stage.toStage(0, Math.max(hud.hudBottom, hud.cardBottom)).y + 20;
    const card = this.ctx.panel.hidden ? null : this.ctx.panel.firstElementChild;
    const panel = card ? card.getBoundingClientRect() : null;
    const bottom = panel ? stage.toStage(0, panel.top).y - 16 : stage.viewBottom - 20;
    // the church takes most of the width; the bell tower and Bubu stand beside it
    const w = (stage.viewRight - stage.viewLeft) * 0.66;
    const scale = Math.max(1, Math.min(w / DESIGN_W, (bottom - top) / DESIGN_H));
    return { x: stage.width / 2 - (DESIGN_W * scale) / 2, y: bottom - DESIGN_H * scale, scale };
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    if (this.doneT >= 0) return;
    const b = this.box;
    const u = (p.x - b.x) / b.scale;
    const v = (p.y - b.y) / b.scale;
    // topmost part first; small parts get a little extra room
    let target = null;
    for (let i = PARTS.length - 1; i >= 0 && !target; i--) {
      const part = PARTS[i];
      if (this.inside(part.id, u, v) && !this.painted.has(part.id)) target = part;
    }
    // on a small screen a finger easily misses a small part: the nearest
    // number still to paint counts too
    if (!target) {
      let best = 22 / this.ctx.stage.scale / b.scale;
      for (const part of PARTS) {
        if (this.painted.has(part.id)) continue;
        const d = Math.hypot(part.label[0] - u, part.label[1] - v);
        if (d < best) {
          best = d;
          target = part;
        }
      }
    }
    if (!target) return;
    if (COLORS[this.brush].n === target.n) {
      this.painted.add(target.id);
      this.since.set(target.id, 0);
      this.particles.burst(p.x, p.y, [COLORS[this.brush].color, '#ffffff'], 14, 180);
      this.sound('brush', p.x);
      this.ctx.hud.setCounter('🎨', this.painted.size, PARTS.length);
      if (this.painted.size === PARTS.length) this.doneT = 0;
    } else {
      this.mistakes += 1;
      this.oops();
      this.shake.set(target.id, 0.45);
    }
  }

  /**
   * Is a point (design units) inside a part, or very near a small one?
   * @private
   * @param {string} id
   * @param {number} u
   * @param {number} v
   */
  inside(id, u, v) {
    const path = /** @type {Path2D} */ (this.paths.get(id));
    if (this.hit.isPointInPath(path, u, v)) return true;
    this.hit.lineWidth = 6;
    return ['cross', 'win1', 'win2', 'win3'].includes(id) && this.hit.isPointInStroke(path, u, v);
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    this.updateFade(dt);
    for (const [id, t] of this.shake) this.shake.set(id, Math.max(0, t - dt));
    for (const [id, t] of this.since) this.since.set(id, t + dt);
    if (this.doneT >= 0) {
      const before = this.doneT;
      this.doneT += dt;
      if (before < 0.1 && this.doneT >= 0.1) {
        const b = this.box;
        this.particles.burst(b.x + (DESIGN_W * b.scale) / 2, b.y + (DESIGN_H * b.scale) / 2, SPARKS, 40, 320);
      }
      if (before < 1.8 && this.doneT >= 1.8) {
        this.setPanel(null);
        this.showEnding({
          doneText: this.config.doneText,
          fact: this.config.fact,
          stars: this.mistakes <= 1 ? 3 : this.mistakes <= 4 ? 2 : 1,
          result: this.mistakes <= 1 ? 'Ai pictat mănăstirea fără nicio greșeală!' : 'Mănăstirea e pictată!',
          delay: 0.2,
        });
      }
    }
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const stage = this.ctx.stage;
    c.save();
    c.globalAlpha = this.fade;
    // a snowy night before dawn
    const g = c.createLinearGradient(0, stage.viewTop, 0, stage.viewBottom);
    g.addColorStop(0, '#0b1a45');
    g.addColorStop(0.7, '#2c4680');
    g.addColorStop(1, '#4b6299');
    c.fillStyle = g;
    c.fillRect(stage.viewLeft, stage.viewTop, stage.viewRight - stage.viewLeft, stage.viewBottom - stage.viewTop);
    c.fillStyle = 'rgba(255,255,255,0.8)';
    for (let i = 0; i < 50; i++) fillCircle(c, stage.viewLeft + ((i * 977) % 1000) / 1000 * (stage.viewRight - stage.viewLeft), stage.viewTop + ((i * 613) % 1000) / 1000 * (stage.viewBottom - stage.viewTop) * 0.5, (i % 3) * 0.5 + 0.7);
    const b = this.box;
    const ground = b.y + 95 * b.scale;
    // the mountains of Bucovina, the monastery's wall, its bell tower and Bubu with her brush
    drawWinterValley(c, { left: stage.viewLeft, right: stage.viewRight, top: stage.viewTop, bottom: ground + 30 }, 0, { slope: false });
    this.drawWall(c, ground, b.scale);
    c.fillStyle = '#dfe7f3';
    c.fillRect(stage.viewLeft, ground, stage.viewRight - stage.viewLeft, stage.viewBottom);
    this.drawTower(c, b.x - 17 * b.scale, ground, b.scale);
    this.drawPainter(c, b.x + (DESIGN_W + 13) * b.scale, ground, b.scale);
    this.drawSnow(c);

    c.save();
    c.translate(b.x, b.y);
    c.scale(b.scale, b.scale);
    const done = this.doneT >= 0;
    if (done) glow(c, DESIGN_W / 2, DESIGN_H / 2, 90, `rgba(255,230,150,${0.35 * clamp(this.doneT, 0, 1)})`, 'rgba(255,230,150,0)');
    for (const part of PARTS) {
      const path = /** @type {Path2D} */ (this.paths.get(part.id));
      const shake = this.shake.get(part.id) || 0;
      c.save();
      if (shake) c.translate(Math.sin(shake * 50) * shake * 2.5, 0);
      const painted = this.painted.has(part.id);
      c.fillStyle = painted ? COLORS[part.n - 1].color : '#fbf7ee';
      c.fill(path);
      if (painted) {
        const t = this.since.get(part.id) || 0;
        if (t < 0.4) {
          c.fillStyle = `rgba(255,255,255,${0.6 * (1 - t / 0.4)})`;
          c.fill(path);
        }
      }
      c.strokeStyle = '#3a2d26';
      c.lineWidth = 0.7;
      c.lineJoin = 'round';
      c.stroke(path);
      c.restore();
    }
    if (done) this.drawSaints(c, clamp(this.doneT / 0.8, 0, 1));
    // the numbers of the parts still to paint
    // (a little bigger on phones, as far as they stay apart)
    const lk = 1 + (this.ctx.stage.ui - 1) * 0.5;
    c.font = `800 ${(6 * lk).toFixed(1)}px "Baloo 2", system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (const part of PARTS) {
      if (this.painted.has(part.id)) continue;
      const [x, y] = part.label;
      const picked = COLORS[this.brush].n === part.n;
      c.fillStyle = picked ? '#ffd23f' : '#ffffff';
      fillCircle(c, x, y, 4.2 * lk);
      c.strokeStyle = '#3a2d26';
      c.lineWidth = 0.5;
      c.beginPath();
      c.arc(x, y, 4.2 * lk, 0, Math.PI * 2);
      c.stroke();
      c.fillStyle = '#1b2440';
      c.fillText(String(part.n), x, y + 0.3 * lk);
    }
    c.restore();
    this.particles.draw(c);
    c.restore();
  }

  /**
   * The white wall around the monastery, with a shingle roof and snow.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {number} ground
   * @param {number} k  scale of the drawing
   */
  drawWall(c, ground, k) {
    const stage = this.ctx.stage;
    const h = 26 * k;
    c.fillStyle = '#f2ede2';
    c.fillRect(stage.viewLeft, ground - h, stage.viewRight - stage.viewLeft, h);
    c.fillStyle = '#5d4037';
    c.fillRect(stage.viewLeft, ground - h - 4 * k, stage.viewRight - stage.viewLeft, 5 * k);
    c.fillStyle = '#f4f8ff';
    c.fillRect(stage.viewLeft, ground - h - 6 * k, stage.viewRight - stage.viewLeft, 2.5 * k);
  }

  /**
   * The bell tower beside the church.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {number} x  centre
   * @param {number} ground
   * @param {number} k
   */
  drawTower(c, x, ground, k) {
    c.fillStyle = '#f7f2e6';
    c.fillRect(x - 13 * k, ground - 62 * k, 26 * k, 62 * k);
    c.fillStyle = '#3e2f27';
    c.beginPath();
    c.moveTo(x - 7 * k, ground - 44 * k);
    c.lineTo(x - 7 * k, ground - 54 * k);
    c.quadraticCurveTo(x, ground - 60 * k, x + 7 * k, ground - 54 * k);
    c.lineTo(x + 7 * k, ground - 44 * k);
    c.fill();
    c.fillStyle = '#c9952c';
    c.beginPath();
    c.moveTo(x - 3 * k, ground - 53 * k);
    c.lineTo(x - 5 * k, ground - 46 * k);
    c.lineTo(x + 5 * k, ground - 46 * k);
    c.lineTo(x + 3 * k, ground - 53 * k);
    c.fill();
    c.fillStyle = '#5d4037';
    c.beginPath();
    c.moveTo(x - 18 * k, ground - 61 * k);
    c.lineTo(x, ground - 78 * k);
    c.lineTo(x + 18 * k, ground - 61 * k);
    c.closePath();
    c.fill();
    c.fillStyle = '#e3b23c';
    // the cross reaches a little into the tip of the roof, so it stands on it
    c.fillRect(x - 0.8 * k, ground - 88 * k, 1.6 * k, 11 * k);
    c.fillRect(x - 3 * k, ground - 85 * k, 6 * k, 1.6 * k);
    c.fillStyle = '#6d4c41';
    fillRoundRect(c, x - 5 * k, ground - 18 * k, 10 * k, 18 * k, 4 * k, '#6d4c41');
  }

  /**
   * Bubu next to the church with a brush dipped in the chosen colour.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {number} x
   * @param {number} ground
   * @param {number} k
   */
  drawPainter(c, x, ground, k) {
    const s = 22 * k;
    const bob = Math.sin(this.time * 2) * 0.6 * k;
    // the easel-like paint pot
    fillRoundRect(c, x + 6 * k, ground - 7 * k, 9 * k, 7 * k, 2 * k, '#8d6e63');
    c.fillStyle = COLORS[this.brush].color;
    c.fillRect(x + 6.5 * k, ground - 7 * k, 8 * k, 2 * k);
    drawBubu(c, x, ground - s * 0.5 + bob, s, Math.sin(this.time * 1.5) * 0.05);
    drawBubuHat(c, this.ctx.state.hat, x, ground - s * 0.5 + bob, s);
    // the brush, waving a little
    const a = -0.9 + Math.sin(this.time * 3) * 0.25;
    const bx = x - 8 * k;
    const by = ground - s * 0.45;
    c.strokeStyle = '#8d6e63';
    c.lineWidth = 1.6 * k;
    c.lineCap = 'round';
    c.beginPath();
    c.moveTo(bx, by);
    c.lineTo(bx + Math.cos(a) * 14 * k, by + Math.sin(a) * 14 * k);
    c.stroke();
    c.fillStyle = COLORS[this.brush].color;
    fillCircle(c, bx + Math.cos(a) * 15 * k, by + Math.sin(a) * 15 * k, 1.8 * k);
  }

  /**
   * A few big snowflakes falling slowly over the scene.
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  drawSnow(c) {
    const stage = this.ctx.stage;
    const w = stage.viewRight - stage.viewLeft;
    const h = stage.viewBottom - stage.viewTop;
    c.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 40; i++) {
      const x = stage.viewLeft + ((((i * 977) % 1000) / 1000) * w + Math.sin(this.time * 0.7 + i) * 20 + w) % w;
      const y = stage.viewTop + ((((i * 613) % 1000) / 1000) * h + this.time * (30 + (i % 4) * 10)) % h;
      fillCircle(c, x, y, 1.5 + (i % 3));
    }
  }

  /**
   * Little saints painted on the blue walls, in rows, with golden halos.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {number} k  0..1, how far they have appeared
   */
  drawSaints(c, k) {
    c.save();
    c.globalAlpha *= k;
    for (const [y, x0, x1] of [[63, 21, 52], [63, 66, 99], [86, 46, 99]]) {
      for (let x = x0; x < x1; x += 5.5) {
        if (x > 54 && x < 64 && y > 60 && y < 82) continue;
        if (x > 78 && x < 88 && y > 60 && y < 82) continue;
        c.fillStyle = '#e3b23c';
        fillCircle(c, x, y - 4, 1.6);
        c.fillStyle = '#f2d6b3';
        fillCircle(c, x, y - 4, 1);
        c.fillStyle = ['#c0392b', '#2e7d32', '#f4ecd8'][Math.round(x) % 3];
        c.fillRect(x - 1.3, y - 3, 2.6, 5);
      }
    }
    c.restore();
  }
}
