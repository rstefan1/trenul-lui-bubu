/**
 * @file Station mission "the spoon museum" (a memory game, Câmpulung
 * Moldovenesc).
 *
 * Twelve cards lie face down; under each is a carved wooden spoon. The
 * child turns two at a time; matching spoons stay up, different ones turn
 * back after a moment. All pairs found: the museum's fact and back to the
 * train.
 *
 * Configuration (besides id/title/text):
 *   motifs    carving of every pair (see MOTIFS)
 *   doneText, fact
 */

import { TAU } from '../core/math.js';
import { fillCircle, fillStar } from '../gfx/shapes.js';
import { el } from '../ui/dom.js';
import { SceneMission } from './scene-mission.js';

/** Seconds two different cards stay up before turning back. */
const PEEK = 0.9;

/**
 * Carvings on the spoons' handles; each draws in a small box centred at
 * (0, 0), about 30 units wide.
 * @type {Readonly<Record<string, (c: CanvasRenderingContext2D) => void>>}
 */
const MOTIFS = Object.freeze({
  star: c => fillStar(c, 0, 0, 15, 6),
  heart: c => {
    c.beginPath();
    c.moveTo(0, 12);
    c.bezierCurveTo(-20, -2, -8, -16, 0, -6);
    c.bezierCurveTo(8, -16, 20, -2, 0, 12);
    c.fill();
  },
  sun: c => {
    fillCircle(c, 0, 0, 8);
    c.lineWidth = 3;
    c.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i * TAU) / 8;
      c.moveTo(Math.cos(a) * 11, Math.sin(a) * 11);
      c.lineTo(Math.cos(a) * 16, Math.sin(a) * 16);
    }
    c.stroke();
  },
  fir: c => {
    for (let i = 0; i < 3; i++) {
      c.beginPath();
      c.moveTo(0, -15 + i * 8);
      c.lineTo(10 + i * 2, -3 + i * 8);
      c.lineTo(-10 - i * 2, -3 + i * 8);
      c.closePath();
      c.fill();
    }
  },
  flower: c => {
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6;
      fillCircle(c, Math.cos(a) * 8, Math.sin(a) * 8, 5);
    }
    fillCircle(c, 0, 0, 4);
  },
  bird: c => {
    c.beginPath();
    c.ellipse(0, 2, 12, 7, 0, 0, TAU);
    c.fill();
    fillCircle(c, 10, -5, 5);
    c.beginPath();
    c.moveTo(14, -5);
    c.lineTo(20, -3);
    c.lineTo(14, -2);
    c.fill();
    c.beginPath();
    c.moveTo(-10, 0);
    c.lineTo(-20, -8);
    c.lineTo(-16, 4);
    c.fill();
  },
});

/** Wood colours of the spoons, one per motif (a second clue). */
const WOODS = ['#c08a52', '#a86b3c', '#d4a373', '#9c6b45', '#b5835a', '#c99a6b'];

/**
 * @typedef {import('./mission.js').MissionConfig & {motifs: string[], doneText: string, fact: string}} MemoryConfig
 */

export class MemoryMission extends SceneMission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {MemoryConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {string[]} motif of every card, shuffled */
    this.cards = [...config.motifs, ...config.motifs].sort(() => Math.random() - 0.5);
    /** @type {Set<number>} cards that stay face up */
    this.matched = new Set();
    /** @type {number[]} cards turned in the current try */
    this.open = [];
    this.tries = 0;
    /** @type {HTMLButtonElement[]} */
    this.buttons = [];
    this.locked = false;
  }

  start() {
    this.phase = 'running';
    this.ctx.hud.announce(this.config.title, this.config.text, 'Misiune', 7);
    this.ctx.hud.setCounter('🥄', 0, this.config.motifs.length);
    this.buttons = this.cards.map((motif, i) => {
      const front = el('canvas', { class: 'memory-card__front', width: '120', height: '160' });
      this.paintSpoon(/** @type {CanvasRenderingContext2D} */ (front.getContext('2d')), motif);
      const b = /** @type {HTMLButtonElement} */ (el('button', { class: 'memory-card', type: 'button', 'aria-label': `Cartonașul ${i + 1}` }, [
        el('span', { class: 'memory-card__back', 'aria-hidden': 'true' }), front,
      ]));
      b.addEventListener('click', () => this.turn(i));
      return b;
    });
    this.setPanel(el('div', { class: 'panel memory-panel' }, [
      el('p', { class: 'program-title' }, ['Întoarce câte două cartonașe și găsește lingurile la fel.']),
      el('div', { class: 'memory-grid' }, this.buttons),
    ]));
  }

  /**
   * Draws a carved wooden spoon.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {string} motif
   */
  paintSpoon(c, motif) {
    const wood = WOODS[this.config.motifs.indexOf(motif) % WOODS.length];
    c.fillStyle = '#fff8ec';
    c.fillRect(0, 0, 120, 160);
    c.fillStyle = wood;
    // bowl
    c.beginPath();
    c.ellipse(60, 120, 26, 32, 0, 0, TAU);
    c.fill();
    c.fillStyle = 'rgba(0,0,0,0.15)';
    c.beginPath();
    c.ellipse(60, 122, 18, 24, 0, 0, TAU);
    c.fill();
    // handle with the carving at the top
    c.fillStyle = wood;
    c.fillRect(54, 46, 12, 50);
    c.beginPath();
    c.ellipse(60, 34, 26, 24, 0, 0, TAU);
    c.fill();
    c.save();
    c.translate(60, 34);
    c.fillStyle = '#6d3f1e';
    c.strokeStyle = '#6d3f1e';
    (MOTIFS[motif] ?? MOTIFS.star)(c);
    c.restore();
  }

  /**
   * Turns a card.
   * @private
   * @param {number} i
   */
  turn(i) {
    if (this.locked || this.matched.has(i) || this.open.includes(i)) return;
    this.open.push(i);
    this.buttons[i].classList.add('is-up');
    if (this.open.length < 2) return;
    this.tries += 1;
    const [a, b] = this.open;
    if (this.cards[a] === this.cards[b]) {
      this.matched.add(a);
      this.matched.add(b);
      this.buttons[a].classList.add('is-matched');
      this.buttons[b].classList.add('is-matched');
      this.open = [];
      this.ctx.hud.setCounter('🥄', this.matched.size / 2, this.config.motifs.length);
      if (this.matched.size === this.cards.length) this.finish();
      return;
    }
    this.locked = true;
    setTimeout(() => {
      for (const k of this.open) this.buttons[k].classList.remove('is-up');
      this.open = [];
      this.locked = false;
    }, PEEK * 1000);
  }

  /** @private */
  finish() {
    const pairs = this.config.motifs.length;
    const extra = this.tries - pairs;
    setTimeout(() => this.showEnding({
      doneText: this.config.doneText,
      fact: this.config.fact,
      stars: extra <= pairs ? 3 : extra <= pairs * 2 ? 2 : 1,
      result: `Ai găsit toate perechile din ${this.tries} încercări!`,
      delay: 0,
    }), 700);
  }

  /** @param {number} dt */
  update(dt) {
    this.updateFade(dt);
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const stage = this.ctx.stage;
    c.save();
    c.globalAlpha = this.fade;
    // a museum room with wooden walls and spoons on display
    c.fillStyle = '#5d4037';
    c.fillRect(stage.viewLeft, stage.viewTop, stage.viewRight - stage.viewLeft, stage.viewBottom - stage.viewTop);
    c.fillStyle = 'rgba(0,0,0,0.12)';
    for (let x = stage.viewLeft; x < stage.viewRight; x += 60) c.fillRect(x, stage.viewTop, 4, stage.viewBottom - stage.viewTop);
    c.fillStyle = '#8d6e63';
    c.fillRect(stage.viewLeft, stage.viewBottom - 120, stage.viewRight - stage.viewLeft, 120);
    c.restore();
  }
}
