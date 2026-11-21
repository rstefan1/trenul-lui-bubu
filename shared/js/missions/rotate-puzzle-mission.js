/**
 * @file Station mission "rotating tiles puzzle".
 *
 * A picture of the town's landmark is cut into a grid of square tiles, and
 * most tiles are turned. Each touch turns a tile by a quarter; the picture
 * is whole again when every tile stands upright. A small preview shows what
 * the picture should look like. When it is solved, a short real fact about
 * the place is shown, and the child continues the journey with a button
 * (so there is time to read it).
 *
 * Stars depend on the number of extra turns beyond the minimum needed.
 *
 * Configuration (besides id/title/text):
 *   picture     key in LANDMARKS
 *   grid        tiles per side
 *   fact        a short real fact about the place
 *   solvedText  shown when the picture is complete
 */

import { createOffscreen } from '../core/canvas-cache.js';
import { LANDMARKS, PICTURE_SIZE } from '../gfx/landmarks.js';
import { el } from '../ui/dom.js';
import { Mission } from './mission.js';

/**
 * @typedef {import('./mission.js').MissionConfig & {
 *   picture: string, grid: number, fact: string, solvedText: string
 * }} RotatePuzzleConfig
 */

/** Tiles that start upright (a little help, so the start is not too daunting). */
const UPRIGHT_SHARE = 0.2;

export class RotatePuzzleMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {RotatePuzzleConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** Quarter turns of every tile (0 = upright). */
    /** @type {number[]} */
    this.turns = [];
    this.taps = 0;
    this.minimum = 0;
    this.solved = false;
    /** @type {HTMLButtonElement[]} */
    this.tiles = [];
    /** @type {HTMLElement | null} */
    this.grid = null;
    /** @type {HTMLElement | null} */
    this.footer = null;
  }

  start() {
    this.phase = 'running';
    const n = this.config.grid;
    const draw = LANDMARKS[this.config.picture];
    if (!draw) throw new Error(`Unknown picture "${this.config.picture}"`);

    // the picture, painted once at a resolution good for every screen
    const ratio = Math.min(2, (window.devicePixelRatio || 1)) * 1.2;
    const { canvas: picture, ctx } = createOffscreen({ x: 0, y: 0, width: PICTURE_SIZE, height: PICTURE_SIZE, ratio });
    draw(ctx);

    this.turns = Array.from({ length: n * n }, () => (Math.random() < UPRIGHT_SHARE ? 0 : 1 + Math.floor(Math.random() * 3)));
    this.minimum = this.turns.reduce((sum, t) => sum + ((4 - t) % 4), 0);

    const tileSrc = picture.width / n;
    /** @type {HTMLButtonElement[]} */
    const tiles = this.turns.map((turn, i) => {
      const cv = el('canvas', { width: String(Math.round(tileSrc)), height: String(Math.round(tileSrc)) });
      cv.getContext('2d')?.drawImage(picture, (i % n) * tileSrc, Math.floor(i / n) * tileSrc, tileSrc, tileSrc, 0, 0, cv.width, cv.height);
      const b = el('button', { class: 'puzzle-tile', type: 'button', 'aria-label': `Piesa ${i + 1}` }, [cv]);
      b.style.transform = `rotate(${turn * 90}deg)`;
      b.addEventListener('click', () => this.turn(i, b));
      return b;
    });
    this.tiles = tiles;

    const preview = el('canvas', { class: 'puzzle-preview', width: String(picture.width), height: String(picture.height) });
    preview.getContext('2d')?.drawImage(picture, 0, 0);

    this.grid = el('div', { class: 'puzzle-grid', style: `--n:${n}` }, tiles);
    this.footer = el('div', { class: 'puzzle-footer' }, [
      el('p', { class: 'panel-text' }, ['Atinge o piesă ca să o rotești.']),
    ]);
    this.setPanel(el('div', { class: 'panel panel--wide' }, [
      el('p', { class: 'panel-kicker' }, ['Misiune']),
      el('h2', { class: 'panel-title' }, [this.config.title]),
      el('p', { class: 'panel-text' }, [this.config.text]),
      el('div', { class: 'puzzle' }, [
        this.grid,
        el('figure', { class: 'puzzle-hint' }, [preview, el('figcaption', {}, ['Așa trebuie să arate'])]),
      ]),
      this.footer,
    ]));
    if (this.minimum === 0) this.turn(0, tiles[0]);   // never start already solved
  }

  /**
   * Turns a tile by a quarter (clockwise).
   * @private
   * @param {number} i
   * @param {HTMLElement} tile
   */
  turn(i, tile) {
    if (this.solved) return;
    this.taps += 1;
    this.turns[i] += 1;
    // the angle keeps growing, so the animation always turns the same way
    tile.style.transform = `rotate(${this.turns[i] * 90}deg)`;
    if (this.turns.every(t => t % 4 === 0)) this.solve();
  }

  /** @private */
  solve() {
    this.solved = true;
    const extra = this.taps - this.minimum;
    const stars = extra <= 3 ? 3 : extra <= 10 ? 2 : 1;
    setTimeout(() => {
      this.grid?.parentElement?.classList.add('is-solved');
      for (const t of this.tiles) t.disabled = true;
      const next = el('button', { class: 'big-btn', type: 'button' }, ['Mai departe! 🚂']);
      next.addEventListener('click', () => this.complete(stars, stars === 3
        ? 'Excelent! Ai refăcut imaginea din câteva mișcări!'
        : 'Bravo! Imaginea e din nou întreagă.'));
      this.footer?.replaceChildren(
        el('p', { class: 'puzzle-solved' }, [this.config.solvedText]),
        el('p', { class: 'fact' }, [el('b', {}, ['Știai că? ']), this.config.fact]),
        next,
      );
      next.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }, 450);
  }

  /**
   * @private
   * @param {HTMLElement | null} node
   */
  setPanel(node) {
    const root = this.ctx.panel;
    root.replaceChildren();
    root.hidden = !node;
    if (node) root.append(node);
  }

  dispose() {
    this.setPanel(null);
  }
}
