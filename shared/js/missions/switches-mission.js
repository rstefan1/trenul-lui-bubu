/**
 * @file Station mission "program the switches" (Dej, a railway junction).
 *
 * A shunting locomotive must push the wagon with the presents onto a given
 * track. Seen as a map, the station is a tree: at every switch the line
 * splits in two (up or down), and the ends are the numbered tracks. The
 * child writes a small program — one choice, UP or DOWN, for each switch,
 * in order — and runs it. The locomotive executes it step by step; if it
 * ends on another track, the program can be corrected and run again.
 *
 * This is the informatics mission of the journey: planning a sequence of
 * instructions before running it, and debugging it when it is wrong. (The
 * path to track k is also k written in binary — a fact the teacher may
 * enjoy pointing out.)
 *
 * Configuration (besides id/title/text):
 *   levels    depth of the switch tree for every level, e.g. [2, 3, 3]
 *   doneText, fact
 */

import { approach, lerp } from '../core/math.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { fillCircle, fillRoundRect, fillStar, glow } from '../gfx/shapes.js';
import { el } from '../ui/dom.js';
import { starsForMistakes } from './mission.js';
import { SceneMission } from './scene-mission.js';

/** Speed of the shunting locomotive (stage units per second). */
const SPEED = 320;

/**
 * @typedef {import('./mission.js').MissionConfig & {levels: number[], doneText: string, fact: string}} SwitchesConfig
 * @typedef {{x: number, y: number}} Point
 */

export class SwitchesMission extends SceneMission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {SwitchesConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    this.level = 0;
    this.depth = 2;
    /** Target track (0-based, from the top). */
    this.target = 0;
    /** @type {Array<0 | 1>} the program: 0 = up, 1 = down */
    this.program = [];
    /** @type {'edit' | 'run' | 'result' | 'done'} */
    this.step = 'edit';
    this.stepT = 0;
    /** Distance travelled along the route while running. */
    this.runDist = 0;
    /** @type {Point[]} */
    this.route = [];
    this.mistakes = 0;
    this.time = 0;
    this.message = '';
    this.particles = new Particles();
    /** Layout (animated when the instructions card goes away). */
    this.box = { left: 0, top: 0, right: 0, bottom: 0 };
    /** @type {HTMLElement | null} */
    this.slots = null;
    /** @type {HTMLElement | null} */
    this.runButton = null;
    /** Whether the last run reached the target. */
    this.success = false;
  }

  start() {
    this.phase = 'running';
    this.ctx.hud.announce(this.config.title, this.config.text, 'Misiune', 10);
    this.startLevel(0);
    this.box = this.freeBox();
  }

  /**
   * @private
   * @param {number} level
   */
  startLevel(level) {
    this.level = level;
    this.depth = this.config.levels[level];
    const n = 2 ** this.depth;
    // a target whose path goes both up and down (more interesting)
    let t;
    do t = Math.floor(Math.random() * n);
    while (this.depth > 1 && (t === 0 || t === n - 1));
    this.target = t;
    this.program = [];
    this.step = 'edit';
    this.runDist = 0;
    this.message = `Du vagonul cu daruri pe linia ${t + 1}!`;
    this.ctx.hud.setCounter('🚦', level, this.config.levels.length);
    this.buildPanel();
  }

  // ------------------------------------------------------------ the program panel

  /** @private */
  buildPanel() {
    this.slots = el('ol', { class: 'program' });
    const up = el('button', { class: 'program-btn', type: 'button' }, ['⬆ SUS']);
    const down = el('button', { class: 'program-btn', type: 'button' }, ['⬇ JOS']);
    const erase = el('button', { class: 'program-btn program-btn--erase', type: 'button', 'aria-label': 'Șterge ultima comandă' }, ['⌫']);
    const run = el('button', { class: 'big-btn program-run', type: 'button' }, ['▶ Pornește']);
    up.addEventListener('click', () => this.add(0));
    down.addEventListener('click', () => this.add(1));
    erase.addEventListener('click', () => {
      if (this.step !== 'edit') return;
      this.program.pop();
      this.refreshPanel();
    });
    run.addEventListener('click', () => this.run());
    this.runButton = run;
    this.setPanel(el('div', { class: 'panel panel--bottom program-panel' }, [
      el('p', { class: 'program-title' }, ['Programul: pentru fiecare macaz, în ordine, alege SUS sau JOS']),
      this.slots,
      el('div', { class: 'program-buttons' }, [up, down, erase, run]),
    ]));
    this.refreshPanel();
  }

  /** @private */
  refreshPanel() {
    if (!this.slots) return;
    const active = this.step === 'run' ? this.switchIndexAt(this.runDist) : -1;
    this.slots.replaceChildren(...Array.from({ length: this.depth }, (_, i) => {
      const v = this.program[i];
      const label = v === undefined ? '?' : v === 0 ? '⬆ SUS' : '⬇ JOS';
      return el('li', { class: `program-slot${v === undefined ? ' is-empty' : ''}${i === active ? ' is-running' : ''}` }, [
        el('span', { class: 'program-slot__n' }, [`Macazul ${i + 1}`]), el('span', {}, [label]),
      ]);
    }));
    if (this.runButton) /** @type {HTMLButtonElement} */ (this.runButton).disabled = this.program.length < this.depth || this.step !== 'edit';
  }

  /**
   * @private
   * @param {0 | 1} dir
   */
  add(dir) {
    if (this.step !== 'edit' || this.program.length >= this.depth) return;
    this.program.push(dir);
    this.refreshPanel();
  }

  /** @private Runs the program. */
  run() {
    if (this.step !== 'edit' || this.program.length < this.depth) return;
    this.step = 'run';
    this.runDist = 0;
    this.route = this.routeFor(this.program);
    this.message = 'Programul rulează…';
    this.refreshPanel();
  }

  // ------------------------------------------------------------ geometry

  /** @private The free rectangle between the card (or the HUD) and the program panel. */
  freeBox() {
    const stage = this.ctx.stage;
    const cardBottom = this.ctx.hud.cardBottom;
    const top = Math.max(stage.viewTop + 200, cardBottom ? stage.toStage(0, cardBottom + 24).y : 0);
    const panel = this.ctx.panel.firstElementChild;
    const panelTop = panel ? panel.getBoundingClientRect().top : window.innerHeight;
    const bottom = Math.min(stage.viewBottom - 20, stage.toStage(0, panelTop - 12).y);
    return { left: stage.viewLeft + 60, top, right: stage.viewRight - 60, bottom: Math.max(top + 200, bottom) };
  }

  /** Vertical position of a track end (0-based, from the top). */
  trackY(/** @type {number} */ k) {
    const n = 2 ** this.depth;
    const b = this.box;
    return b.top + 40 + ((k + 0.5) / n) * (b.bottom - b.top - 50);
  }

  /** Horizontal position of the switches of a level (0 = the first switch). */
  levelX(/** @type {number} */ i) {
    const b = this.box;
    const start = b.left + 150;
    const end = b.right - 230;
    return lerp(start, end, i / this.depth);
  }

  /**
   * A switch: level i, index j (from the top). Its height is the middle of
   * the tracks it leads to.
   * @param {number} i
   * @param {number} j
   * @returns {Point}
   */
  node(i, j) {
    const span = 2 ** (this.depth - i);
    return { x: this.levelX(i), y: (this.trackY(j * span) + this.trackY((j + 1) * span - 1)) / 2 };
  }

  /**
   * The route of the locomotive for a program.
   * @param {Array<0 | 1>} program
   * @returns {Point[]}
   */
  routeFor(program) {
    const b = this.box;
    const first = this.node(0, 0);
    const pts = [{ x: b.left + 20, y: first.y }, first];
    let j = 0;
    for (let i = 0; i < this.depth; i++) {
      j = j * 2 + program[i];
      const next = i + 1 < this.depth ? this.node(i + 1, j) : { x: this.levelX(this.depth), y: this.trackY(j) };
      const here = pts[pts.length - 1];
      pts.push({ x: here.x + 40, y: here.y }, { x: next.x - 40, y: next.y }, next);
    }
    pts.push({ x: b.right - 76, y: pts[pts.length - 1].y });
    return pts;
  }

  /** Track reached by a program (0-based). */
  trackOf(/** @type {Array<0 | 1>} */ program) {
    return program.reduce((/** @type {number} */ j, d) => j * 2 + d, 0);
  }

  /**
   * A point at a distance along a polyline.
   * @param {Point[]} pts
   * @param {number} d
   * @returns {Point & {done: boolean}}
   */
  along(pts, d) {
    for (let i = 1; i < pts.length; i++) {
      const len = Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
      if (d <= len) {
        const k = len ? d / len : 1;
        return { x: lerp(pts[i - 1].x, pts[i].x, k), y: lerp(pts[i - 1].y, pts[i].y, k), done: false };
      }
      d -= len;
    }
    const last = pts[pts.length - 1];
    return { ...last, done: true };
  }

  /**
   * Which switch the locomotive is at or heading to, while running.
   * @param {number} d
   */
  switchIndexAt(d) {
    const p = this.along(this.route, d);
    for (let i = 0; i < this.depth; i++) if (p.x < this.levelX(i) + 20) return i;
    return this.depth;
  }

  // ------------------------------------------------------------ update

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    this.updateFade(dt);
    const to = this.freeBox();
    for (const k of /** @type {const} */ (['left', 'top', 'right', 'bottom'])) this.box[k] = approach(this.box[k], to[k], 5, dt);

    // the map may move (the instructions card goes away, the panel changes):
    // the route always follows the current layout
    if (this.step !== 'edit') this.route = this.routeFor(this.program);
    if (this.step === 'run') {
      const before = this.switchIndexAt(this.runDist);
      this.runDist += SPEED * dt;
      if (this.switchIndexAt(this.runDist) !== before) this.refreshPanel();
      // stop when the wagon (pushed in front of the locomotive) reaches the buffer stop
      if (this.along(this.route, this.runDist + 70).done) this.arrive();
    } else if (this.step === 'result') {
      this.stepT += dt;
      if (this.stepT > 1.8) this.afterResult();
    }
  }

  /** @private The locomotive stopped at the end of a track. */
  arrive() {
    this.step = 'result';
    this.stepT = 0;
    const reached = this.trackOf(this.program);
    this.success = reached === this.target;
    if (this.success) {
      this.message = `Corect! Vagonul a ajuns pe linia ${reached + 1}.`;
      const end = this.route[this.route.length - 1];
      this.particles.burst(end.x, end.y, SPARKS, 30, 280);
    } else {
      this.mistakes += 1;
      this.message = `Vagonul a ajuns pe linia ${reached + 1}, dar trebuia pe linia ${this.target + 1}. Corectează programul!`;
    }
    this.refreshPanel();
  }

  /** @private */
  afterResult() {
    if (!this.success) {
      this.step = 'edit';
      this.runDist = 0;
      this.message = `Du vagonul cu daruri pe linia ${this.target + 1}!`;
      this.refreshPanel();
      return;
    }
    if (this.level + 1 < this.config.levels.length) {
      this.startLevel(this.level + 1);
      return;
    }
    this.step = 'done';
    this.ctx.hud.setCounter('🚦', this.config.levels.length, this.config.levels.length);
    this.showEnding({
      doneText: this.config.doneText,
      fact: this.config.fact,
      stars: starsForMistakes(this.mistakes, 2, 0),
      result: this.mistakes === 0 ? 'Programe fără nicio greșeală – ca un informatician adevărat!' : 'Bravo! Ai programat toate macazurile.',
      delay: 0.6,
    });
  }

  // ------------------------------------------------------------ drawing

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const stage = this.ctx.stage;
    c.save();
    c.globalAlpha = this.fade;
    // the station seen from above, at night
    c.fillStyle = '#1d2b4f';
    c.fillRect(stage.viewLeft, stage.viewTop, stage.viewRight - stage.viewLeft, stage.viewBottom - stage.viewTop);
    c.fillStyle = '#e3e9f3';
    const b = this.box;
    fillRoundRect(c, b.left, b.top, b.right - b.left, b.bottom - b.top, 24, '#dfe6f1');
    // the task, in big letters
    c.fillStyle = '#1b2440';
    c.font = '800 26px "Baloo 2", system-ui, sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(this.message, (b.left + b.right) / 2, b.top + 22);

    this.drawTracks(c);
    this.drawTrain(c);
    this.particles.draw(c);
    c.restore();
  }

  /**
   * The tracks, switches and numbered platforms.
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  drawTracks(c) {
    const n = 2 ** this.depth;
    const b = this.box;
    /** @type {Point[][]} */
    const lines = [];
    const first = this.node(0, 0);
    lines.push([{ x: b.left + 20, y: first.y }, first]);
    for (let i = 0; i < this.depth; i++) {
      for (let j = 0; j < 2 ** i; j++) {
        const a = this.node(i, j);
        for (const d of [0, 1]) {
          const cj = j * 2 + d;
          const z = i + 1 < this.depth ? this.node(i + 1, cj) : { x: this.levelX(this.depth), y: this.trackY(cj) };
          lines.push([a, { x: a.x + 40, y: a.y }, { x: z.x - 40, y: z.y }, z]);
        }
      }
    }
    for (let k = 0; k < n; k++) lines.push([{ x: this.levelX(this.depth), y: this.trackY(k) }, { x: b.right - 70, y: this.trackY(k) }]);

    // rails: a dark bed with a light line in the middle (like a station map)
    for (const [width, color] of [[14, '#5f6b7e'], [4, '#c9d3df']]) {
      c.strokeStyle = /** @type {string} */ (color);
      c.lineWidth = /** @type {number} */ (width);
      c.lineJoin = 'round';
      c.lineCap = 'round';
      for (const line of lines) {
        c.beginPath();
        line.forEach((p, i) => (i ? c.lineTo(p.x, p.y) : c.moveTo(p.x, p.y)));
        c.stroke();
      }
    }

    // platforms with their numbers; the target shines
    for (let k = 0; k < n; k++) {
      const y = this.trackY(k);
      const target = k === this.target;
      if (target) glow(c, b.right - 40, y, 50, 'rgba(255,215,90,0.6)', 'rgba(255,215,90,0)');
      fillRoundRect(c, b.right - 64, y - 18, 48, 36, 9, target ? '#ffd23f' : '#ffffff');
      c.fillStyle = '#1f4f9c';
      c.font = '800 22px "Baloo 2", system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(String(k + 1), b.right - 40, y + 1);
      if (target) {
        c.fillStyle = '#e53935';
        fillStar(c, b.right - 6, y, 10, 4);
      }
    }

    // the switches: numbered; while running, they show the programmed way
    const running = this.step === 'run' || this.step === 'result';
    let j = 0;
    for (let i = 0; i < this.depth; i++) {
      for (let jj = 0; jj < 2 ** i; jj++) {
        const p = this.node(i, jj);
        const onPath = running && jj === j;
        c.fillStyle = onPath ? '#ffd23f' : '#1f4f9c';
        c.beginPath();
        c.arc(p.x, p.y, 15, 0, Math.PI * 2);
        c.fill();
        c.fillStyle = onPath ? '#1b2440' : '#ffffff';
        c.font = '800 16px "Baloo 2", system-ui, sans-serif';
        c.fillText(onPath ? (this.program[i] === 0 ? '⬆' : '⬇') : String(i + 1), p.x, p.y + 1);
      }
      if (running) j = j * 2 + this.program[i];
    }
  }

  /**
   * The shunting locomotive pushing the wagon with presents.
   * @private
   * @param {CanvasRenderingContext2D} c
   */
  drawTrain(c) {
    const route = this.step === 'edit' ? this.routeFor([...this.program, 0, 0, 0, 0].slice(0, this.depth)) : this.route;
    const d = this.step === 'edit' ? 0 : this.runDist;
    const head = this.along(route, d + 70);
    const tail = this.along(route, d);
    const angle = Math.atan2(head.y - tail.y, head.x - tail.x);
    // wagon in front (with presents), locomotive behind it
    for (const [p, isWagon] of [[head, true], [tail, false]]) {
      const q = /** @type {Point} */ (p);
      c.save();
      c.translate(q.x, q.y);
      c.rotate(angle);
      if (isWagon) {
        fillRoundRect(c, -30, -16, 60, 32, 6, '#8d5524');
        for (const [gx, col] of [[-14, '#e53935'], [2, '#1e88e5'], [16, '#43a047']]) {
          fillRoundRect(c, /** @type {number} */ (gx) - 7, -10, 14, 14, 3, /** @type {string} */ (col));
        }
      } else {
        fillRoundRect(c, -28, -15, 56, 30, 8, '#e0472e');
        fillRoundRect(c, -24, -10, 20, 20, 4, '#ffe39a');
        c.fillStyle = '#ffd23f';
        fillCircle(c, 26, 0, 4);
      }
      c.restore();
    }
  }
}
