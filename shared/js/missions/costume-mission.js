/**
 * @file Station mission "a hat for Bubu" (Rădăuți).
 *
 * At the Christmas fair in Rădăuți, Bubu tries on the festive hats of
 * Bucovina: the black hat with a red band and a feather, the tall lambskin
 * cap, the hat with flowers, the red headscarf, the crown of flowers and the
 * hat with beads. The child picks one (and may change their mind), sees it
 * on Bubu at once, then presses "Gata!". Every choice is a good one: a calm,
 * happy stop before the end of the journey.
 *
 * Configuration (besides id/title/text): doneText, fact
 */

import { TAU } from '../core/math.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { fillCircle, fillRoundRect, fillStar, glow } from '../gfx/shapes.js';
import { drawBubu } from '../train/bubu.js';
import { el } from '../ui/dom.js';
import { SceneMission } from './scene-mission.js';

/**
 * The hats. Each draws itself with its brim centred at (0, 0), for a head
 * one unit wide (the caller scales and places it).
 * @type {ReadonlyArray<{name: string, draw: (c: CanvasRenderingContext2D) => void}>}
 */
const HATS = [
  { name: 'Clop cu pană', draw: c => blackHat(c, 'feather') },
  { name: 'Căciulă de miel', draw: lambCap },
  { name: 'Clop cu flori', draw: c => blackHat(c, 'flowers') },
  { name: 'Basma cu flori', draw: headscarf },
  { name: 'Cunună de flori', draw: flowerCrown },
  { name: 'Clop cu mărgele', draw: c => blackHat(c, 'beads') },
];

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
      ic.translate(60, 82);
      ic.scale(96, 96);
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
    if (this.hat >= 0) {
      // the hat drops onto the head with a little bounce
      const drop = this.hatT < 0.35 ? (1 - this.hatT / 0.35) ** 2 * b.size * 0.4 : 0;
      c.save();
      c.translate(b.x, y - b.size * 0.3 - drop);
      c.rotate(-0.06);
      c.scale(b.size * 0.66, b.size * 0.66);
      HATS[this.hat].draw(c);
      c.restore();
    }
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

// ------------------------------------------------------------ the hats (unit head width, brim at 0, 0)

/**
 * The black felt hat of Bucovina, with a red woven band and an ornament.
 * @param {CanvasRenderingContext2D} c
 * @param {'feather' | 'flowers' | 'beads'} kind
 */
function blackHat(c, kind) {
  // brim
  c.fillStyle = '#1f1f1f';
  c.beginPath();
  c.ellipse(0, 0, 0.62, 0.13, 0, 0, TAU);
  c.fill();
  // crown, a little rounded on top
  const crown = c.createLinearGradient(-0.32, 0, 0.32, 0);
  crown.addColorStop(0, '#2a2a2a');
  crown.addColorStop(0.5, '#3b3b3b');
  crown.addColorStop(1, '#202020');
  c.fillStyle = crown;
  c.beginPath();
  c.moveTo(-0.32, 0);
  c.lineTo(-0.3, -0.34);
  c.quadraticCurveTo(0, -0.44, 0.3, -0.34);
  c.lineTo(0.32, 0);
  c.closePath();
  c.fill();
  // the red band with a little woven pattern
  c.fillStyle = '#c62828';
  c.fillRect(-0.32, -0.12, 0.64, 0.1);
  c.fillStyle = '#ffd23f';
  for (let i = 0; i < 7; i++) {
    c.beginPath();
    const x = -0.27 + i * 0.09;
    c.moveTo(x, -0.07);
    c.lineTo(x + 0.025, -0.1);
    c.lineTo(x + 0.05, -0.07);
    c.lineTo(x + 0.025, -0.04);
    c.closePath();
    c.fill();
  }
  if (kind === 'feather') {
    // a white feather and a green sprig at the side
    c.fillStyle = '#ffffff';
    c.beginPath();
    c.moveTo(0.22, -0.1);
    c.quadraticCurveTo(0.52, -0.42, 0.36, -0.72);
    c.quadraticCurveTo(0.3, -0.4, 0.17, -0.12);
    c.closePath();
    c.fill();
    c.strokeStyle = '#d0d0d0';
    c.lineWidth = 0.012;
    c.beginPath();
    c.moveTo(0.2, -0.11);
    c.quadraticCurveTo(0.4, -0.4, 0.36, -0.7);
    c.stroke();
    c.fillStyle = '#558b2f';
    c.beginPath();
    c.ellipse(0.16, -0.24, 0.035, 0.12, 0.5, 0, TAU);
    c.fill();
  } else if (kind === 'flowers') {
    // a bunch of flowers on the band
    for (const [x, y, col] of [[0.14, -0.14, '#e53935'], [0.24, -0.2, '#ffd23f'], [0.04, -0.18, '#1e88e5'], [0.2, -0.06, '#ec407a']]) {
      flower(c, /** @type {number} */ (x), /** @type {number} */ (y), 0.07, /** @type {string} */ (col));
    }
    c.fillStyle = '#558b2f';
    c.beginPath();
    c.ellipse(0.32, -0.12, 0.03, 0.08, 1, 0, TAU);
    c.fill();
  } else {
    // rows of coloured beads all around the crown
    const colors = ['#e53935', '#ffd23f', '#43a047', '#1e88e5', '#ffffff'];
    for (let row = 0; row < 3; row++) {
      for (let i = 0; i < 9; i++) {
        c.fillStyle = colors[(i + row) % colors.length];
        fillCircle(c, -0.28 + i * 0.07, -0.17 - row * 0.055, 0.022);
      }
    }
    c.fillStyle = '#ffd23f';
    c.fillRect(-0.32, -0.025, 0.64, 0.02);
  }
}

/**
 * A tall lambskin cap with curly fur.
 * @param {CanvasRenderingContext2D} c
 */
function lambCap(c) {
  // a rounded cap made of many curls of dark lambswool
  c.fillStyle = '#3e2c23';
  c.beginPath();
  c.moveTo(-0.38, 0.05);
  c.quadraticCurveTo(-0.42, -0.42, 0, -0.46);
  c.quadraticCurveTo(0.42, -0.42, 0.38, 0.05);
  c.quadraticCurveTo(0, 0.12, -0.38, 0.05);
  c.closePath();
  c.fill();
  // curls along the outline and all over, a little lighter
  for (let i = 0; i <= 12; i++) {
    const a = Math.PI + (i * Math.PI) / 12;
    c.fillStyle = '#4a352a';
    fillCircle(c, Math.cos(a) * 0.37, -0.2 + Math.sin(a) * 0.26, 0.06);
  }
  for (let i = 0; i < 18; i++) {
    const x = -0.28 + ((i * 37) % 57) / 100;
    const y = -0.04 - ((i * 53) % 34) / 100;
    c.fillStyle = i % 2 ? '#563f33' : '#33241d';
    fillCircle(c, x, y, 0.045);
  }
  // a band of brighter wool at the bottom
  c.fillStyle = '#5d4537';
  c.beginPath();
  c.ellipse(0, 0.04, 0.4, 0.07, 0, 0, TAU);
  c.fill();
}

/**
 * A red headscarf with flowers, tied under the chin.
 * @param {CanvasRenderingContext2D} c
 */
function headscarf(c) {
  c.fillStyle = '#c62828';
  c.beginPath();
  c.moveTo(-0.5, 0.36);
  c.quadraticCurveTo(-0.6, -0.3, 0, -0.36);
  c.quadraticCurveTo(0.6, -0.3, 0.5, 0.36);
  c.quadraticCurveTo(0.42, 0.02, 0.3, -0.04);
  c.quadraticCurveTo(0, -0.14, -0.3, -0.04);
  c.quadraticCurveTo(-0.42, 0.02, -0.5, 0.36);
  c.closePath();
  c.fill();
  // the knot and the two ends
  c.beginPath();
  c.ellipse(0.42, 0.4, 0.06, 0.05, 0, 0, TAU);
  c.fill();
  c.beginPath();
  c.moveTo(0.44, 0.42);
  c.lineTo(0.58, 0.6);
  c.lineTo(0.48, 0.62);
  c.closePath();
  c.fill();
  // flowers and a fringe
  for (const [x, y, col] of [[-0.3, -0.12, '#ffd23f'], [0, -0.24, '#ffffff'], [0.3, -0.12, '#ffd23f'], [-0.44, 0.16, '#ffffff'], [0.44, 0.16, '#ffffff']]) {
    flower(c, /** @type {number} */ (x), /** @type {number} */ (y), 0.06, /** @type {string} */ (col));
  }
  c.fillStyle = '#1b5e20';
  for (const [x, y] of [[-0.16, -0.2], [0.16, -0.2]]) {
    c.beginPath();
    c.ellipse(x, y, 0.025, 0.05, 0.8, 0, TAU);
    c.fill();
  }
}

/**
 * A crown of flowers with ribbons hanging at the back.
 * @param {CanvasRenderingContext2D} c
 */
function flowerCrown(c) {
  const colors = ['#e53935', '#ffd23f', '#ec407a', '#1e88e5', '#ffffff', '#ff7043'];
  // ribbons
  for (const [x, col] of [[-0.36, '#e53935'], [-0.3, '#ffd23f'], [0.3, '#1e88e5'], [0.36, '#43a047']]) {
    c.fillStyle = /** @type {string} */ (col);
    c.fillRect(/** @type {number} */ (x) - 0.02, -0.02, 0.04, 0.5);
  }
  // leaves
  c.fillStyle = '#558b2f';
  for (let i = 0; i < 9; i++) {
    const a = Math.PI + (i * Math.PI) / 8;
    c.beginPath();
    c.ellipse(Math.cos(a) * 0.4, -0.02 + Math.sin(a) * 0.16, 0.03, 0.08, a, 0, TAU);
    c.fill();
  }
  // flowers along a gentle arc
  for (let i = 0; i < 7; i++) {
    const a = Math.PI + ((i + 0.5) * Math.PI) / 7;
    flower(c, Math.cos(a) * 0.36, -0.04 + Math.sin(a) * 0.14, 0.075, colors[i % colors.length]);
  }
}

/**
 * A small five-petal flower.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {string} color
 */
function flower(c, x, y, r, color) {
  c.fillStyle = color;
  for (let i = 0; i < 5; i++) {
    const a = (i * TAU) / 5;
    fillCircle(c, x + Math.cos(a) * r * 0.55, y + Math.sin(a) * r * 0.55, r * 0.45);
  }
  c.fillStyle = color === '#ffd23f' ? '#e65100' : '#ffd23f';
  fillCircle(c, x, y, r * 0.32);
}
