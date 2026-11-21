/**
 * @file Station mission "light the Christmas tree" (Cluj-Napoca).
 *
 * In Piața Unirii the big Christmas tree is dark: the cables are mixed up.
 * On an electric board, every tile carries a piece of cable (straight,
 * corner or T); touching a tile turns it by a quarter. Power flows from the
 * generator on the left through every connected tile — they glow at once,
 * so the child sees how far the current gets — and when it reaches the exit
 * on the right, the tree, the square and the church light up.
 *
 * The board is generated each time: a random path from the generator to the
 * exit guarantees a solution; the other tiles are random decoys.
 *
 * Stars depend on the number of turns beyond the minimum needed.
 */

import { approach } from '../core/math.js';
import { css } from '../gfx/color.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { drawFir, fillCircle, fillRoundRect, fillStar, glow } from '../gfx/shapes.js';
import { drawBubu } from '../train/bubu.js';
import { SceneMission } from './scene-mission.js';

const N = 1;
const E = 2;
const S = 4;
const W = 8;
const STEPS = [
  { bit: N, dx: 0, dy: -1, back: S },
  { bit: E, dx: 1, dy: 0, back: W },
  { bit: S, dx: 0, dy: 1, back: N },
  { bit: W, dx: -1, dy: 0, back: E },
];
/** Shapes of the cable pieces, in their unturned position. */
const STRAIGHT = N | S;
const CORNER = N | E;
const TEE = N | E | S;

/**
 * Turns a set of sides clockwise by a number of quarters.
 * @param {number} bits
 * @param {number} turns
 */
export const turnBits = (bits, turns) => {
  let b = bits;
  for (let i = 0; i < ((turns % 4) + 4) % 4; i++) b = ((b << 1) | (b >> 3)) & 15;
  return b;
};

/**
 * @typedef {object} Tile
 * @property {number} shape     STRAIGHT, CORNER or TEE
 * @property {number} turns     quarter turns done so far (only grows)
 * @property {number} shown     angle shown on screen (animated towards turns)
 * @property {number} solution  turns needed (path tiles), -1 for decoys
 *
 * @typedef {import('./mission.js').MissionConfig & {doneText: string, fact: string}} CircuitConfig
 */

export class CircuitMission extends SceneMission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {CircuitConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    this.time = 0;
    this.cols = 6;
    this.rows = 5;
    this.cell = 80;
    this.x0 = 0;
    this.y0 = 0;
    /** @type {Tile[]} */
    this.tiles = [];
    this.startRow = 0;
    this.exitRow = 0;
    /** @type {Uint8Array} powered tiles */
    this.powered = new Uint8Array(0);
    this.solved = false;
    this.lit = 0;
    this.taps = 0;
    this.minimum = 0;
    this.particles = new Particles();
    /** Where the tree and the church stand. */
    this.tree = { x: 0, y: 0, h: 300 };
    this.church = { x: 0, y: 0, h: 300 };
    this.vertical = false;
  }

  start() {
    this.phase = 'running';
    this.ctx.hud.announce(this.config.title, this.config.text, 'Misiune', 9);
    this.layout();
    this.generate();
    this.updatePower();
  }

  /** @private Places the board, the tree and the church on the free part of the screen. */
  layout() {
    const stage = this.ctx.stage;
    const cardBottom = this.ctx.hud.cardBottom;
    const top = Math.max(stage.viewTop + 110, cardBottom ? stage.toStage(0, cardBottom + 30).y : 0) + 10;
    const bottom = stage.viewBottom - 40;
    const left = stage.viewLeft + 60;
    const right = stage.viewRight - 60;
    const w = right - left;
    const h = bottom - top;
    const size = Math.max(84, 50 / stage.scale);
    this.vertical = w < h * 1.25;
    if (this.vertical) {
      this.cols = 5;
      this.rows = 5;
      this.cell = Math.min(w / (this.cols + 1), (h * 0.55) / this.rows, size * 1.3);
      this.x0 = left + (w - this.cell * this.cols) / 2 + this.cell * 0.3;
      this.y0 = bottom - this.cell * this.rows;
      this.tree = { x: left + w * 0.72, y: this.y0 - 40, h: Math.min(h * 0.4, 420) };
      this.church = { x: left + w * 0.25, y: this.y0 - 40, h: Math.min(h * 0.42, 440) };
    } else {
      this.cols = 6;
      this.rows = 5;
      this.cell = Math.min((w * 0.55) / this.cols, h / this.rows, size * 1.25);
      this.x0 = left + this.cell * 1.1;
      this.y0 = top + (h - this.cell * this.rows) / 2;
      const gridRight = this.x0 + this.cell * this.cols;
      this.tree = { x: gridRight + (right - gridRight) * 0.68, y: bottom - 10, h: Math.min(h * 0.95, 520) };
      this.church = { x: gridRight + (right - gridRight) * 0.16, y: bottom - 10, h: Math.min(h * 1.05, 560) };
    }
  }

  /** @private Builds a board with at least one solution. */
  generate() {
    const { cols, rows } = this;
    this.startRow = Math.floor(Math.random() * rows);
    this.exitRow = Math.floor(Math.random() * rows);
    const start = this.startRow * cols;
    const goal = this.exitRow * cols + cols - 1;

    // a random path from the generator to the exit (depth-first, backtracking)
    const seen = new Uint8Array(cols * rows);
    /** @type {number[]} */
    const path = [start];
    seen[start] = 1;
    while (path[path.length - 1] !== goal) {
      const cell = path[path.length - 1];
      const x = cell % cols;
      const y = Math.floor(cell / cols);
      const options = STEPS
        .map(s => ({ s, next: (y + s.dy) * cols + x + s.dx, nx: x + s.dx, ny: y + s.dy }))
        .filter(o => o.nx >= 0 && o.ny >= 0 && o.nx < cols && o.ny < rows && !seen[o.next])
        // a little bias to the right keeps the path from wandering forever
        .sort(() => Math.random() - 0.35);
      if (!options.length) {
        path.pop();
        continue;
      }
      seen[options[0].next] = 1;
      path.push(options[0].next);
    }

    /** @type {Map<number, number>} sides each path tile must connect */
    const need = new Map();
    path.forEach((cell, i) => {
      let bits = 0;
      const sideTo = (/** @type {number} */ other) => STEPS.find(s => cell + s.dy * cols + s.dx === other && Math.abs((other % cols) - (cell % cols)) <= 1)?.bit ?? 0;
      bits |= i === 0 ? W : sideTo(path[i - 1]);
      bits |= i === path.length - 1 ? E : sideTo(path[i + 1]);
      need.set(cell, bits);
    });

    this.tiles = [];
    this.minimum = 0;
    for (let cell = 0; cell < cols * rows; cell++) {
      const bits = need.get(cell);
      if (bits === undefined) {
        const shape = [STRAIGHT, CORNER, CORNER, TEE][Math.floor(Math.random() * 4)];
        const turns = Math.floor(Math.random() * 4);
        this.tiles.push({ shape, turns, shown: turns, solution: -1 });
        continue;
      }
      const shape = (bits === (N | S) || bits === (E | W)) ? STRAIGHT : CORNER;
      const solution = [0, 1, 2, 3].find(t => turnBits(shape, t) === bits) ?? 0;
      let turns = Math.floor(Math.random() * 4);
      if (turnBits(shape, turns) === bits) turns += 1;   // never start in the right position
      this.tiles.push({ shape, turns, shown: turns, solution });
      const d = (solution - turns + 8) % 4;
      this.minimum += shape === STRAIGHT ? Math.min(d, (d + 2) % 4) : d;
    }
  }

  /** @private Which tiles the current reaches from the generator. */
  updatePower() {
    const { cols, rows } = this;
    this.powered = new Uint8Array(cols * rows);
    const start = this.startRow * cols;
    const sides = (/** @type {number} */ cell) => turnBits(this.tiles[cell].shape, this.tiles[cell].turns);
    if (!(sides(start) & W)) return;
    this.powered[start] = 1;
    const queue = [start];
    for (let i = 0; i < queue.length; i++) {
      const cell = queue[i];
      const x = cell % cols;
      const y = Math.floor(cell / cols);
      for (const s of STEPS) {
        const nx = x + s.dx;
        const ny = y + s.dy;
        if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue;
        const next = ny * cols + nx;
        if (this.powered[next] || !(sides(cell) & s.bit) || !(sides(next) & s.back)) continue;
        this.powered[next] = 1;
        queue.push(next);
      }
    }
    const exit = this.exitRow * cols + cols - 1;
    if (this.powered[exit] && (sides(exit) & E) && !this.solved) this.solve();
  }

  /** @private The tree lights up. */
  solve() {
    this.solved = true;
    const extra = this.taps - this.minimum;
    this.particles.burst(this.tree.x, this.tree.y - this.tree.h * 0.9, SPARKS, 40, 320);
    this.showEnding({
      doneText: this.config.doneText,
      fact: this.config.fact,
      stars: extra <= 4 ? 3 : extra <= 12 ? 2 : 1,
      result: extra <= 4 ? 'Un electrician adevărat! Bradul s-a aprins din prima.' : 'Bravo! Bradul din Piața Unirii strălucește!',
      delay: 1.8,
    });
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    if (this.solved) return;
    const cx = Math.floor((p.x - this.x0) / this.cell);
    const cy = Math.floor((p.y - this.y0) / this.cell);
    if (cx < 0 || cy < 0 || cx >= this.cols || cy >= this.rows) return;
    this.tiles[cy * this.cols + cx].turns += 1;
    this.taps += 1;
    this.updatePower();
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    this.updateFade(dt);
    for (const t of this.tiles) t.shown = approach(t.shown, t.turns, 18, dt);
    if (this.solved) {
      this.lit = Math.min(1, this.lit + dt / 1.2);
      if (Math.random() < dt * 2.5) {
        this.particles.burst(this.tree.x + (Math.random() - 0.5) * 300, this.tree.y - this.tree.h * (0.6 + Math.random() * 0.5), SPARKS, 14, 220);
      }
    }
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    c.save();
    c.globalAlpha = this.fade;
    this.drawSquare(c);
    this.drawBoard(c);
    this.particles.draw(c);
    c.restore();
  }

  /**
   * Piața Unirii at night: the houses around, the church, the tree.
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  drawSquare(c) {
    const stage = this.ctx.stage;
    const light = this.ctx.world.light;
    const g = c.createLinearGradient(0, stage.viewTop, 0, stage.viewBottom);
    g.addColorStop(0, css(light.top));
    g.addColorStop(1, css(light.mid));
    c.fillStyle = g;
    c.fillRect(stage.viewLeft, stage.viewTop, stage.viewRight - stage.viewLeft, stage.viewBottom - stage.viewTop);

    // houses around the square, with lit windows
    const groundY = this.vertical ? this.y0 - 30 : stage.viewBottom - 40;
    for (let x = stage.viewLeft, i = 0; x < stage.viewRight; i++) {
      const w = 110 + ((i * 37) % 60);
      const h = 150 + ((i * 53) % 90);
      c.fillStyle = ['#3a4a7a', '#43518a', '#36456f'][i % 3];
      c.fillRect(x, groundY - h, w - 6, h);
      c.fillStyle = this.lit > 0 ? '#ffd877' : '#6b7aa6';
      for (let wy = groundY - h + 22; wy < groundY - 30; wy += 38) {
        for (let wx = x + 14; wx < x + w - 26; wx += 30) c.fillRect(wx, wy, 12, 18);
      }
      x += w;
    }
    // the square (snowy pavement)
    c.fillStyle = '#d9e2f0';
    c.fillRect(stage.viewLeft, groundY, stage.viewRight - stage.viewLeft, stage.viewBottom - groundY);

    this.drawChurch(c);
    this.drawTree(c);
  }

  /**
   * St. Michael's church: a tall Gothic tower with a spire and a long nave.
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  drawChurch(c) {
    const { x, y, h } = this.church;
    const k = h / 560;
    const stone = '#8d93a8';
    c.save();
    c.translate(x, y);
    c.scale(k, k);
    // nave
    c.fillStyle = stone;
    c.fillRect(-40, -230, 260, 230);
    c.fillStyle = '#6d7389';
    c.beginPath();
    c.moveTo(-50, -230);
    c.lineTo(90, -300);
    c.lineTo(230, -230);
    c.closePath();
    c.fill();
    // tower and spire
    c.fillStyle = stone;
    c.fillRect(-90, -400, 90, 400);
    c.fillStyle = '#5d7a74';
    c.beginPath();
    c.moveTo(-100, -400);
    c.lineTo(-45, -560);
    c.lineTo(10, -400);
    c.closePath();
    c.fill();
    c.fillStyle = '#e8c35a';
    c.fillRect(-47, -590, 4, 32);
    c.fillRect(-56, -580, 22, 4);
    // pointed (Gothic) windows, lit at the end
    const win = this.lit > 0 ? `rgba(255,214,120,${0.4 + 0.6 * this.lit})` : '#4d5675';
    c.fillStyle = win;
    for (const [wx, wy, ww, wh] of [[-66, -360, 42, 90], [-66, -230, 42, 110], [0, -190, 36, 120], [60, -190, 36, 120], [120, -190, 36, 120], [180, -190, 30, 120]]) {
      c.beginPath();
      c.moveTo(wx, wy + wh);
      c.lineTo(wx, wy + ww * 0.6);
      c.quadraticCurveTo(wx + ww / 2, wy - ww * 0.4, wx + ww, wy + ww * 0.6);
      c.lineTo(wx + ww, wy + wh);
      c.closePath();
      c.fill();
    }
    c.restore();
  }

  /**
   * The big Christmas tree, dark until the current reaches it.
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  drawTree(c) {
    const { x, y, h } = this.tree;
    if (this.lit > 0) glow(c, x, y - h * 0.45, h * 0.8, `rgba(255,220,130,${0.45 * this.lit})`, 'rgba(255,220,130,0)');
    drawFir(c, x, y, h, { snowy: true, color: '#2f6e4f', shade: '#245a41' });
    const colors = ['#ff5252', '#ffd740', '#40c4ff', '#69f0ae', '#ffffff'];
    for (let i = 0; i < 40; i++) {
      const t = i / 40;
      const yy = y - h * 0.12 - t * h * 0.78;
      const half = h * 0.46 * (0.95 - t * 0.85);
      const xx = x + Math.sin(i * 2.39) * half * 0.8;
      if (this.lit > 0) {
        c.fillStyle = colors[(i + Math.floor(this.time * 5)) % colors.length];
        glow(c, xx, yy, h * 0.025 + 6, 'rgba(255,240,180,0.6)', 'rgba(255,240,180,0)');
      } else {
        c.fillStyle = '#56607a';
      }
      fillCircle(c, xx, yy, Math.max(3, h * 0.011));
    }
    c.fillStyle = this.lit > 0 ? '#ffd23f' : '#7a7f8f';
    fillStar(c, x, y - h * 0.98, h * 0.06, h * 0.025);
    // Bubu waits next to the tree
    drawBubu(c, x - h * 0.42, y - 40, Math.max(60, h * 0.17), this.lit > 0 ? Math.sin(this.time * 6) * 0.15 : 0);
  }

  /**
   * The electric board: generator, tiles and the cable to the tree.
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  drawBoard(c) {
    const { x0, y0, cell, cols, rows } = this;
    fillRoundRect(c, x0 - 14, y0 - 14, cols * cell + 28, rows * cell + 28, 22, 'rgba(20,28,52,0.92)');
    // generator on the left of the start row
    const gy = y0 + (this.startRow + 0.5) * cell;
    fillRoundRect(c, x0 - cell * 1.05, gy - cell * 0.42, cell * 0.8, cell * 0.84, 12, '#f2b632');
    c.fillStyle = '#1b2440';
    c.font = `800 ${Math.round(cell * 0.5)}px "Baloo 2", system-ui, sans-serif`;
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText('⚡', x0 - cell * 0.65, gy + 2);
    this.cable(c, [[x0 - cell * 0.25, gy], [x0, gy]], true);
    // cable from the exit to the tree
    const ey = y0 + (this.exitRow + 0.5) * cell;
    const ex = x0 + cols * cell;
    const toTree = this.vertical
      ? [[ex, ey], [ex + cell * 0.45, ey], [ex + cell * 0.45, this.tree.y + 10], [this.tree.x, this.tree.y + 10]]
      : [[ex, ey], [ex + cell * 0.4, ey], [ex + cell * 0.4, this.tree.y - 6], [this.tree.x, this.tree.y - 6]];
    this.cable(c, toTree, this.solved);

    for (let i = 0; i < this.tiles.length; i++) {
      const t = this.tiles[i];
      const cx = x0 + ((i % cols) + 0.5) * cell;
      const cy = y0 + (Math.floor(i / cols) + 0.5) * cell;
      fillRoundRect(c, cx - cell * 0.46, cy - cell * 0.46, cell * 0.92, cell * 0.92, cell * 0.14, '#33405f');
      const on = !!this.powered[i];
      c.save();
      c.translate(cx, cy);
      c.rotate((t.shown * Math.PI) / 2);
      c.lineCap = 'round';
      if (on) {
        c.strokeStyle = 'rgba(255,214,90,0.35)';
        c.lineWidth = cell * 0.32;
        this.wires(c, t.shape, cell);
      }
      c.strokeStyle = on ? '#ffd54f' : '#8590a6';
      c.lineWidth = cell * 0.16;
      this.wires(c, t.shape, cell);
      c.fillStyle = on ? '#fff3c4' : '#a7b0c2';
      fillCircle(c, 0, 0, cell * 0.11);
      c.restore();
    }
  }

  /**
   * Cable pieces of one tile (in its own, unturned frame).
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {number} shape
   * @param {number} cell
   */
  wires(c, shape, cell) {
    const r = cell / 2;
    c.beginPath();
    if (shape & N) { c.moveTo(0, 0); c.lineTo(0, -r); }
    if (shape & E) { c.moveTo(0, 0); c.lineTo(r, 0); }
    if (shape & S) { c.moveTo(0, 0); c.lineTo(0, r); }
    if (shape & W) { c.moveTo(0, 0); c.lineTo(-r, 0); }
    c.stroke();
  }

  /**
   * A cable outside the board.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {number[][]} points
   * @param {boolean} on
   */
  cable(c, points, on) {
    c.strokeStyle = on ? '#ffd54f' : '#5d6680';
    c.lineWidth = Math.max(6, this.cell * 0.12);
    c.lineJoin = 'round';
    c.beginPath();
    points.forEach(([x, y], i) => (i ? c.lineTo(x, y) : c.moveTo(x, y)));
    c.stroke();
  }
}
