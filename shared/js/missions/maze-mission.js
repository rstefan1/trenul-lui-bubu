/**
 * @file Station mission "the fortress maze" (Alba Iulia).
 *
 * Seen from above, the paths between the walls of the fortress form a
 * maze. Bubu starts at the gate; the Christmas tree stands at the farthest
 * point. Three stars are hidden in dead ends. The child moves Bubu by
 * touching a square in a straight, open line from her, by dragging a finger
 * along the paths, or with the arrow keys. When Bubu reaches the tree it
 * lights up, and a real fact about the place is shown.
 *
 * The maze is generated anew every time (depth-first "recursive
 * backtracker", which gives long corridors that children enjoy), sized to
 * the screen so the squares stay comfortable to touch.
 *
 * Stars: three when every hidden star was found, two for some of them,
 * one for reaching the tree.
 */

import { clamp, lerp } from '../core/math.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { css } from '../gfx/color.js';
import { drawFir, fillCircle, fillStar, glow } from '../gfx/shapes.js';
import { drawBubu } from '../train/bubu.js';
import { SceneMission } from './scene-mission.js';

/** Wall bits of a cell. */
const N = 1;
const E = 2;
const S = 4;
const W = 8;
const DIRS = [
  { bit: N, dx: 0, dy: -1, back: S },
  { bit: E, dx: 1, dy: 0, back: W },
  { bit: S, dx: 0, dy: 1, back: N },
  { bit: W, dx: -1, dy: 0, back: E },
];
/** Preferred size of a square, in stage units. */
const CELL = 82;
/** Seconds Bubu needs to walk one square. */
const STEP_TIME = 0.14;

/**
 * @typedef {import('./mission.js').MissionConfig & {doneText: string, fact: string, hidden: number}} MazeConfig
 */

/**
 * A perfect maze (exactly one path between any two squares).
 * @param {number} cols
 * @param {number} rows
 * @returns {Uint8Array} open sides of every cell (N/E/S/W bits)
 */
export function generateMaze(cols, rows) {
  const open = new Uint8Array(cols * rows);
  const seen = new Uint8Array(cols * rows);
  const stack = [cols * (rows - 1)];   // start at the bottom-left gate
  seen[stack[0]] = 1;
  while (stack.length) {
    const cell = stack[stack.length - 1];
    const x = cell % cols;
    const y = Math.floor(cell / cols);
    const options = DIRS.filter(d => {
      const nx = x + d.dx;
      const ny = y + d.dy;
      return nx >= 0 && ny >= 0 && nx < cols && ny < rows && !seen[ny * cols + nx];
    });
    if (!options.length) {
      stack.pop();
      continue;
    }
    const d = options[Math.floor(Math.random() * options.length)];
    const next = (y + d.dy) * cols + x + d.dx;
    open[cell] |= d.bit;
    open[next] |= d.back;
    seen[next] = 1;
    stack.push(next);
  }
  return open;
}

/**
 * Distances (in steps) from a cell to every other cell.
 * @param {Uint8Array} open
 * @param {number} cols
 * @param {number} from
 * @returns {Int32Array}
 */
function distances(open, cols, from) {
  const dist = new Int32Array(open.length).fill(-1);
  dist[from] = 0;
  const queue = [from];
  for (let i = 0; i < queue.length; i++) {
    const cell = queue[i];
    for (const d of DIRS) {
      if (!(open[cell] & d.bit)) continue;
      const next = cell + d.dy * cols + d.dx;
      if (dist[next] < 0) {
        dist[next] = dist[cell] + 1;
        queue.push(next);
      }
    }
  }
  return dist;
}

export class MazeMission extends SceneMission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {MazeConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    this.time = 0;
    this.particles = new Particles();
    this.cols = 9;
    this.rows = 7;
    this.cell = CELL;
    this.x0 = 0;
    this.y0 = 0;
    /** @type {Uint8Array} */
    this.open = new Uint8Array(0);
    this.goal = 0;
    /** @type {Set<number>} cells with a star still to pick up */
    this.stars = new Set();
    this.found = 0;
    this.hiddenTotal = 0;
    /** Bubu: the cell she is in and the squares still to walk. */
    this.at = 0;
    /** @type {number[]} */
    this.path = [];
    this.stepT = 0;
    this.dragging = false;
    this.reached = false;
    /** @type {(e: KeyboardEvent) => void} */
    this.onKey = e => {
      const d = { ArrowUp: DIRS[0], ArrowRight: DIRS[1], ArrowDown: DIRS[2], ArrowLeft: DIRS[3] }[e.key];
      if (!d || this.reached) return;
      e.preventDefault();
      const from = this.path.length ? this.path[this.path.length - 1] : this.at;
      if (this.open[from] & d.bit) this.path.push(from + d.dy * this.cols + d.dx);
    };
  }

  start() {
    this.phase = 'running';
    this.ctx.hud.announce(this.config.title, this.config.text, 'Misiune', 9);
    this.layout();
    this.open = generateMaze(this.cols, this.rows);
    this.at = this.cols * (this.rows - 1);
    const dist = distances(this.open, this.cols, this.at);
    // the tree: the farthest square from the gate
    let far = 0;
    dist.forEach((d, i) => { if (d > dist[far]) far = i; });
    this.goal = far;
    // stars: the farthest dead ends (one open side), except the tree's square
    const deadEnds = [...dist.keys()]
      .filter(i => i !== far && i !== this.at && [N, E, S, W].filter(b => this.open[i] & b).length === 1)
      .sort((a, b) => dist[b] - dist[a]);
    for (const i of deadEnds.slice(0, this.config.hidden)) this.stars.add(i);
    this.hiddenTotal = this.stars.size;
    this.ctx.hud.setCounter('⭐', 0, this.stars.size);
    window.addEventListener('keydown', this.onKey);
  }

  /** @private Sizes the maze to the free part of the screen. */
  layout() {
    const stage = this.ctx.stage;
    const cardBottom = this.ctx.hud.cardBottom;
    const top = Math.max(stage.viewTop + 110, cardBottom ? stage.toStage(0, cardBottom + 30).y : 0) + 20;
    const bottom = stage.viewBottom - 50;
    const left = stage.viewLeft + 70;
    const right = stage.viewRight - 70;
    const w = right - left;
    const h = bottom - top;
    // squares at least about 48 screen pixels wide, so a finger can hit them
    const size = Math.max(CELL, 48 / stage.scale);
    this.cols = clamp(Math.floor(w / size), 6, 15);
    this.rows = clamp(Math.floor(h / size), 5, 13);
    this.cell = Math.min(w / this.cols, h / this.rows);
    this.x0 = left + (w - this.cell * this.cols) / 2;
    this.y0 = top + (h - this.cell * this.rows) / 2;
  }

  /**
   * Centre of a cell on screen.
   * @param {number} i
   */
  centre(i) {
    return { x: this.x0 + ((i % this.cols) + 0.5) * this.cell, y: this.y0 + (Math.floor(i / this.cols) + 0.5) * this.cell };
  }

  /**
   * The cell under a point, or -1.
   * @param {{x: number, y: number}} p
   */
  cellAt(p) {
    const cx = Math.floor((p.x - this.x0) / this.cell);
    const cy = Math.floor((p.y - this.y0) / this.cell);
    return cx >= 0 && cy >= 0 && cx < this.cols && cy < this.rows ? cy * this.cols + cx : -1;
  }

  /**
   * The open straight path from one cell to another in the same row or
   * column (without the start), or null if a wall is in the way.
   * @private
   * @param {number} from
   * @param {number} to
   * @returns {number[] | null}
   */
  straightPath(from, to) {
    const fx = from % this.cols;
    const fy = Math.floor(from / this.cols);
    const tx = to % this.cols;
    const ty = Math.floor(to / this.cols);
    if (fx !== tx && fy !== ty) return null;
    const d = DIRS.find(dd => dd.dx === Math.sign(tx - fx) && dd.dy === Math.sign(ty - fy));
    if (!d) return null;
    const out = [];
    let cell = from;
    while (cell !== to) {
      if (!(this.open[cell] & d.bit)) return null;
      cell += d.dy * this.cols + d.dx;
      out.push(cell);
    }
    return out;
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    if (this.reached) return;
    const target = this.cellAt(p);
    if (target < 0) return;
    const from = this.path.length ? this.path[this.path.length - 1] : this.at;
    if (target === from) {
      this.dragging = true;
      return;
    }
    const line = this.straightPath(from, target);
    if (line) {
      this.path.push(...line);
      this.dragging = true;
    }
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerMove(p) {
    if (!this.dragging || this.reached) return;
    const target = this.cellAt(p);
    const from = this.path.length ? this.path[this.path.length - 1] : this.at;
    if (target < 0 || target === from) return;
    const line = this.straightPath(from, target);
    if (line && line.length <= 2) this.path.push(...line);
  }

  pointerUp() {
    this.dragging = false;
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    this.updateFade(dt);
    if (!this.path.length || this.reached) return;
    this.stepT += dt;
    if (this.stepT < STEP_TIME) return;
    this.stepT = 0;
    this.at = /** @type {number} */ (this.path.shift());
    if (this.stars.delete(this.at)) {
      this.found += 1;
      const c = this.centre(this.at);
      this.particles.burst(c.x, c.y, SPARKS, 20, 240);
      this.ctx.hud.setCounter('⭐', this.found, this.hiddenTotal);
    }
    if (this.at === this.goal) this.reach();
  }

  /** @private Bubu is at the tree. */
  reach() {
    this.reached = true;
    this.path = [];
    this.ctx.hud.hideAnnouncement();
    const c = this.centre(this.goal);
    this.particles.burst(c.x, c.y - this.cell * 0.4, SPARKS, 40, 320);
    const { found, hiddenTotal } = this;
    this.showEnding({
      doneText: this.config.doneText,
      fact: this.config.fact,
      stars: found >= hiddenTotal ? 3 : found > 0 ? 2 : 1,
      result: found >= hiddenTotal
        ? 'Ai găsit toate stelele ascunse și ai ajuns la brad!'
        : `Ai ajuns la brad și ai găsit ${found} din ${hiddenTotal} stele ascunse.`,
    });
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const stage = this.ctx.stage;
    const light = this.ctx.world.light;
    c.save();
    c.globalAlpha = this.fade;
    // the night sky and the snowy fortress grounds
    const g = c.createLinearGradient(0, stage.viewTop, 0, stage.viewBottom);
    g.addColorStop(0, css(light.top));
    g.addColorStop(1, css(light.mid));
    c.fillStyle = g;
    c.fillRect(stage.viewLeft, stage.viewTop, stage.viewRight - stage.viewLeft, stage.viewBottom - stage.viewTop);
    this.drawFortress(c);
    this.drawStars(c);
    this.drawTree(c);
    this.drawBubu(c);
    this.particles.draw(c);
    c.restore();
  }

  /**
   * Ground, bastions and walls.
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  drawFortress(c) {
    const { x0, y0, cell, cols, rows } = this;
    const w = cols * cell;
    const h = rows * cell;
    // bastions: points sticking out at the corners and in the middle of the sides
    c.fillStyle = '#b98b68';
    const p = cell * 0.9;
    for (const [bx, by] of [[x0, y0], [x0 + w, y0], [x0, y0 + h], [x0 + w, y0 + h], [x0 + w / 2, y0], [x0 + w / 2, y0 + h], [x0, y0 + h / 2], [x0 + w, y0 + h / 2]]) {
      c.beginPath();
      c.moveTo(bx, by - p);
      c.lineTo(bx + p, by);
      c.lineTo(bx, by + p);
      c.lineTo(bx - p, by);
      c.closePath();
      c.fill();
    }
    c.fillStyle = '#b98b68';
    c.fillRect(x0 - cell * 0.18, y0 - cell * 0.18, w + cell * 0.36, h + cell * 0.36);
    // snowy courtyards
    c.fillStyle = '#e8eef8';
    c.fillRect(x0, y0, w, h);
    // lamps at a few crossings
    for (let i = 0; i < this.open.length; i += 7) {
      const ct = this.centre(i);
      glow(c, ct.x, ct.y, cell * 0.9, 'rgba(255,214,120,0.22)', 'rgba(255,214,120,0)');
    }
    // the walls
    c.strokeStyle = '#a0734f';
    c.lineCap = 'round';
    c.lineWidth = Math.max(6, cell * 0.16);
    c.beginPath();
    for (let i = 0; i < this.open.length; i++) {
      const x = x0 + (i % cols) * cell;
      const y = y0 + Math.floor(i / cols) * cell;
      if (!(this.open[i] & N)) { c.moveTo(x, y); c.lineTo(x + cell, y); }
      if (!(this.open[i] & W)) { c.moveTo(x, y); c.lineTo(x, y + cell); }
      if (i % cols === cols - 1 && !(this.open[i] & E)) { c.moveTo(x + cell, y); c.lineTo(x + cell, y + cell); }
      if (Math.floor(i / cols) === rows - 1 && !(this.open[i] & S)) { c.moveTo(x, y + cell); c.lineTo(x + cell, y + cell); }
    }
    c.stroke();
    // snow on top of the walls
    c.strokeStyle = 'rgba(255,255,255,0.75)';
    c.lineWidth = Math.max(2, cell * 0.05);
    c.stroke();
    // the gate (where Bubu starts)
    const gate = this.centre(this.cols * (this.rows - 1));
    c.fillStyle = '#6d4a32';
    c.fillRect(gate.x - cell * 0.3, y0 + h - 4, cell * 0.6, cell * 0.22);
  }

  /** @private @param {CanvasRenderingContext2D} c */
  drawStars(c) {
    for (const i of this.stars) {
      const ct = this.centre(i);
      const tw = 0.85 + 0.15 * Math.sin(this.time * 4 + i);
      glow(c, ct.x, ct.y, this.cell * 0.6, 'rgba(255,230,120,0.5)', 'rgba(255,230,120,0)');
      c.fillStyle = '#ffd23f';
      fillStar(c, ct.x, ct.y, this.cell * 0.28 * tw, this.cell * 0.12 * tw);
    }
  }

  /** @private @param {CanvasRenderingContext2D} c */
  drawTree(c) {
    const ct = this.centre(this.goal);
    const h = this.cell * 0.95;
    if (this.reached) glow(c, ct.x, ct.y, this.cell * 2.2, 'rgba(255,220,130,0.55)', 'rgba(255,220,130,0)');
    drawFir(c, ct.x, ct.y + h * 0.45, h, { snowy: true });
    if (this.reached) {
      const colors = ['#e53935', '#fbc02d', '#1e88e5', '#ffffff'];
      for (let k = 0; k < 9; k++) {
        c.fillStyle = colors[(k + Math.floor(this.time * 4)) % colors.length];
        fillCircle(c, ct.x + Math.sin(k * 2.1) * h * 0.22 * (k / 9 + 0.3), ct.y + h * 0.4 - (k / 9) * h * 0.75, Math.max(2.5, this.cell * 0.04));
      }
    }
    c.fillStyle = '#ffd23f';
    fillStar(c, ct.x, ct.y - h * 0.55, this.cell * 0.14, this.cell * 0.06);
  }

  /** @private @param {CanvasRenderingContext2D} c */
  drawBubu(c) {
    const from = this.centre(this.at);
    let x = from.x;
    let y = from.y;
    if (this.path.length) {
      const to = this.centre(this.path[0]);
      const k = clamp(this.stepT / STEP_TIME, 0, 1);
      x = lerp(from.x, to.x, k);
      y = lerp(from.y, to.y, k);
    }
    const hop = this.path.length ? Math.abs(Math.sin(this.time * 18)) * this.cell * 0.06 : 0;
    drawBubu(c, x, y - hop, this.cell * 0.82, this.reached ? Math.sin(this.time * 6) * 0.15 : 0);
  }

  dispose() {
    super.dispose();
    window.removeEventListener('keydown', this.onKey);
  }
}
