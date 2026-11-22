/**
 * @file Station mission "the enchanted night fair" (Vatra Dornei).
 *
 * The long stop of the journey, in three acts:
 *
 *   1. up the hill — Bubu rides the reindeer sleigh up to the fair; the
 *      sleigh follows the mouse or the finger up and down, and catches the
 *      coins floating in the night;
 *   2. the enchanted fair — among stalls run by forest animals, four
 *      trees are for sale, each with its height and price.
 *      Bubu must choose one that fits on the train's flat wagon (at most
 *      1,80 m) and that she can pay for with the coins she caught. A wrong
 *      choice only gets a friendly explanation;
 *   3. down to the train — the sleigh glides back with the tree, and from
 *      now on a flat wagon with the tree travels at the back of the train.
 *
 * Configuration (besides id/title/text):
 *   climbText, fairText, doneText, fact
 *   trees     [{height (m), price (coins)}, …]
 *   maxHeight largest height that fits on the wagon (m)
 *   flag      set when the tree is bought (the train then pulls the tree wagon)
 */

import { approach, clamp, lerp } from '../core/math.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { drawFir, fillCircle, fillRoundRect, fillStar, glow } from '../gfx/shapes.js';
import { drawFairStalls } from '../gfx/scenes/fair-stalls.js';
import { drawWinterValley } from '../gfx/scenes/winter-valley.js';
import { drawSleighTeam } from '../gfx/sleigh.js';
import { SceneMission } from './scene-mission.js';

/** Seconds of the ride up the hill and down again. */
const CLIMB_TIME = 24;
const DOWN_TIME = 6;
/** Speed at which the coins glide towards the sleigh (stage units/s). */
const ITEM_SPEED = 300;

/**
 * @typedef {{height: number, price: number}} TreeOffer
 * @typedef {{x: number, y: number, taken: boolean, phase: number}} Item
 * @typedef {import('./mission.js').MissionConfig & {
 *   climbText: string, fairText: string, doneText: string, fact: string,
 *   trees: TreeOffer[], maxHeight: number, flag: string
 * }} FairConfig
 */

export class FairMission extends SceneMission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {FairConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {'climb' | 'fair' | 'down'} */
    this.act = 'climb';
    this.actTime = 0;
    this.time = 0;
    this.coins = 0;
    this.mistakes = 0;
    /** @type {Item[]} */
    this.items = [];
    this.spawnT = 0;
    this.sleighY = 0;
    this.targetY = 0;
    this.scroll = 0;
    /** @type {number} index of the tree bought (-1 = none yet) */
    this.chosen = -1;
    /** @type {{text: string, t: number, good: boolean}} */
    this.say = { text: '', t: 9, good: false };
    this.endingShown = false;
    this.particles = new Particles();
  }

  start() {
    this.phase = 'running';
    this.ctx.world.train.setBubuVisible(false);
    this.ctx.hud.instruct(this.config.title, this.config.climbText);
    this.ctx.hud.setCounter('🪙', 0, 0);
    const L = this.layout;
    this.sleighY = this.targetY = (L.top + L.bottom) / 2;
  }

  /** The free part of the screen (it grows when the instructions card goes away). */
  get layout() {
    const stage = this.ctx.stage;
    const cardBottom = this.ctx.hud.cardBottom;
    const top = Math.max(stage.viewTop + 140, cardBottom ? stage.toStage(0, cardBottom + 20).y : 0);
    return { top, bottom: stage.viewBottom - 60, left: stage.viewLeft, right: stage.viewRight, w: stage.viewRight - stage.viewLeft };
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerMove(p) {
    if (this.act === 'climb') this.targetY = p.type === 'touch' ? p.y - 60 : p.y;
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    if (this.act === 'climb') {
      this.pointerMove(p);
      return;
    }
    if (this.act !== 'fair' || this.chosen >= 0) return;
    const i = this.treeAt(p);
    if (i < 0) return;
    const offer = this.config.trees[i];
    const tall = offer.height > this.config.maxHeight;
    const dear = offer.price > this.coins;
    if (tall || dear) {
      this.mistakes += 1;
      this.oops();
      this.say = {
        text: tall ? `E prea înalt: are ${fmt(offer.height)} m, iar pe vagon încape cel mult ${fmt(this.config.maxHeight)} m.`
          : `Costă ${offer.price} bănuți, dar Bubu are doar ${this.coins}.`,
        t: 0,
        good: false,
      };
      return;
    }
    this.chosen = i;
    this.coins -= offer.price;
    this.ctx.hud.setCounter('🪙', this.coins, 0);
    this.say = { text: 'Ce brad frumos! Îl ducem la tren.', t: 0, good: true };
    const t = this.treeSpot(i);
    this.particles.burst(t.x, t.y - t.h / 2, SPARKS, 30, 280);
    this.sound('sparkle');
    setTimeout(() => this.setAct('down'), 1800);
  }

  /**
   * @private
   * @param {'climb' | 'fair' | 'down'} act
   */
  setAct(act) {
    this.act = act;
    this.actTime = 0;
    // the coins not caught stay behind on the hill
    this.items = [];
    if (act === 'fair') {
      // never leave Bubu without enough coins for a tree that fits
      const cheapest = Math.min(...this.config.trees.filter(t => t.height <= this.config.maxHeight).map(t => t.price));
      if (this.coins < cheapest) this.coins = cheapest;
      this.ctx.hud.setCounter('🪙', this.coins, 0);
      this.ctx.hud.instruct('Târgul fermecat', this.config.fairText);
    }
    if (act === 'down') {
      this.ctx.hud.hideAnnouncement();
      if (this.config.flag) this.ctx.state.setFlag(this.config.flag);
    }
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.actTime += dt;
    this.say.t += dt;
    this.particles.update(dt);
    this.updateFade(dt);
    const L = this.layout;

    if (this.act === 'climb') {
      this.scroll += ITEM_SPEED * dt;
      this.sleighY = approach(this.sleighY, clamp(this.targetY, L.top + 40, L.bottom - 40), 6, dt);
      this.spawnT -= dt;
      if (this.spawnT <= 0 && this.actTime < CLIMB_TIME - 3) {
        this.spawnT = 0.9;
        this.items.push({
          x: L.right + 40,
          y: lerp(L.top + 40, L.bottom - 60, Math.random()),
          taken: false,
          phase: Math.random() * 6,
        });
      }
      const sx = L.left + L.w * 0.22;
      for (const it of this.items) {
        it.x -= ITEM_SPEED * dt;
        if (!it.taken && Math.abs(it.x - (sx + 40)) < 70 && Math.abs(it.y - (this.sleighY - 30)) < 70) {
          it.taken = true;
          this.coins += 1;
          this.ctx.hud.setCounter('🪙', this.coins, 0);
          this.particles.burst(it.x, it.y, ['#ffd54f', '#fff3c4'], 10, 160);
          this.sound('collect');
        }
      }
      this.items = this.items.filter(it => !it.taken && it.x > L.left - 60);
      if (this.actTime >= CLIMB_TIME) this.setAct('fair');
    } else if (this.act === 'down') {
      this.scroll += ITEM_SPEED * 1.4 * dt;
      if (this.actTime >= DOWN_TIME && !this.endingShown) {
        this.endingShown = true;
        this.ctx.hud.hideCounter();
        this.showEnding({
          doneText: this.config.doneText,
          fact: this.config.fact,
          stars: this.mistakes === 0 ? 3 : this.mistakes <= 2 ? 2 : 1,
          result: this.mistakes === 0 ? 'Ai ales bradul potrivit din prima!' : 'Bradul a ajuns la tren!',
          delay: 0.2,
        });
      }
    }
  }

  // ------------------------------------------------------------ the fair

  /**
   * Where a tree for sale stands.
   * @param {number} i
   */
  treeSpot(i) {
    const L = this.layout;
    const n = this.config.trees.length;
    const ground = L.bottom - 70;
    const unit = Math.min(130, (ground - L.top - 70) / 2.8);   // stage units per metre
    const x = L.left + L.w * ((i + 0.5) / n) * 0.84 + L.w * 0.08;
    return { x, y: ground, h: this.config.trees[i].height * unit, unit };
  }

  /**
   * The tree under a point, or -1.
   * @param {{x: number, y: number}} p
   */
  treeAt(p) {
    for (let i = 0; i < this.config.trees.length; i++) {
      const t = this.treeSpot(i);
      if (Math.abs(p.x - t.x) < Math.max(70, t.h * 0.3) && p.y > t.y - t.h - 60 && p.y < t.y + 50) return i;
    }
    return -1;
  }

  // ------------------------------------------------------------ drawing

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const stage = this.ctx.stage;
    const L = this.layout;
    c.save();
    c.globalAlpha = this.fade;
    const g = c.createLinearGradient(0, stage.viewTop, 0, stage.viewBottom);
    g.addColorStop(0, '#071030');
    g.addColorStop(1, '#25386e');
    c.fillStyle = g;
    c.fillRect(stage.viewLeft, stage.viewTop, stage.viewRight - stage.viewLeft, stage.viewBottom - stage.viewTop);
    // stars and the moon
    c.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 70; i++) {
      fillCircle(c, stage.viewLeft + ((i * 977) % 1000) / 1000 * L.w, stage.viewTop + ((i * 613) % 1000) / 1000 * (L.bottom - stage.viewTop) * 0.6, (i % 3) * 0.6 + 0.7);
    }
    const moon = { x: L.right - 280, y: Math.max(stage.viewTop + 170, L.top + 40) };
    glow(c, moon.x, moon.y, 140, 'rgba(255,248,225,0.3)', 'rgba(255,248,225,0)');
    c.fillStyle = '#fff6d8';
    fillCircle(c, moon.x, moon.y, 44);

    if (this.act === 'fair') this.drawFair(c, L);
    else this.drawRide(c, L);
    this.particles.draw(c);

    if (this.say.t < 3.5) {
      c.globalAlpha = this.fade * clamp(3.5 - this.say.t, 0, 1);
      fillRoundRect(c, stage.width / 2 - 360, L.top - 10, 720, 50, 16, this.say.good ? 'rgba(46,157,87,0.95)' : 'rgba(198,40,40,0.95)');
      c.fillStyle = '#ffffff';
      c.font = '700 22px "Baloo 2", system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(this.say.text, stage.width / 2, L.top + 15);
    }
    c.restore();
  }

  /**
   * The sleigh ride (up with coins, or down with the tree).
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {{top: number, bottom: number, left: number, right: number, w: number}} L
   */
  drawRide(c, L) {
    // mountains, a valley with a village and many firs, scrolling by
    const stage = this.ctx.stage;
    drawWinterValley(c, { left: L.left, right: L.right, top: stage.viewTop, bottom: L.bottom + 60 }, this.scroll);
    for (const it of this.items) {
      const bob = Math.sin(this.time * 3 + it.phase) * 8;
      glow(c, it.x, it.y + bob, 34, 'rgba(255,215,90,0.45)', 'rgba(255,215,90,0)');
      c.fillStyle = '#f2b632';
      fillCircle(c, it.x, it.y + bob, 18);
      c.fillStyle = '#ffd54f';
      fillCircle(c, it.x, it.y + bob, 13);
      c.fillStyle = '#c79400';
      c.font = '800 16px "Baloo 2", system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText('B', it.x, it.y + bob + 1);
    }
    const sx = L.left + L.w * 0.22;
    const y = this.act === 'down' ? (L.top + L.bottom) / 2 + Math.sin(this.time * 2) * 20 : this.sleighY;
    const cargo = this.act === 'down'
      ? (/** @type {CanvasRenderingContext2D} */ cc, /** @type {number} */ x, /** @type {number} */ yy) => drawFir(cc, x, yy + 10, 110, { snowy: true })
      : undefined;
    drawSleighTeam(c, sx, y, 1.15, this.time, cargo);
  }

  /**
   * The fair: stalls with lights, and the four trees for sale with their
   * height and price, and a measuring stick showing what fits on the wagon.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {{top: number, bottom: number, left: number, right: number, w: number}} L
   */
  drawFair(c, L) {
    const ground = L.bottom - 70;
    const stage = this.ctx.stage;
    drawWinterValley(c, { left: L.left, right: L.right, top: stage.viewTop, bottom: ground + 40 }, this.scroll, { slope: false });
    c.fillStyle = '#dfe7f3';
    c.fillRect(L.left, ground, L.w, L.bottom + 200 - ground);
    // the open stalls of the fair, with their sellers and visitors
    drawFairStalls(c, { left: L.left, right: L.right, ground, height: (ground - L.top) * 0.5 }, this.time);
    // the trees for sale
    const max = this.config.maxHeight;
    this.config.trees.forEach((offer, i) => {
      const t = this.treeSpot(i);
      if (i === this.chosen) glow(c, t.x, t.y - t.h / 2, t.h, 'rgba(255,230,140,0.55)', 'rgba(255,230,140,0)');
      drawFir(c, t.x, t.y, t.h, { snowy: true });
      // the label: height and price
      const ly = t.y + 8;
      fillRoundRect(c, t.x - 66, ly, 132, 54, 10, '#fffaf0');
      c.fillStyle = '#1b2440';
      c.font = '800 20px "Baloo 2", system-ui, sans-serif';
      c.textAlign = 'center';
      c.textBaseline = 'middle';
      c.fillText(`📏 ${fmt(offer.height)} m`, t.x, ly + 16);
      c.fillStyle = '#b8860b';
      c.fillText(`🪙 ${offer.price}`, t.x, ly + 39);
    });
    // the measuring stick: the largest tree that fits on the wagon
    const unit = this.treeSpot(0).unit;
    const sx = L.left + 50;
    const top = ground - max * unit;
    c.fillStyle = '#ffffff';
    c.fillRect(sx - 5, top, 10, ground - top);
    c.fillStyle = '#e53935';
    for (let m = 0; m < max; m += 0.2) c.fillRect(sx - 5, ground - (m + 0.1) * unit, 10, 0.1 * unit);
    c.strokeStyle = '#ffd23f';
    c.lineWidth = 3;
    c.setLineDash([10, 8]);
    c.beginPath();
    c.moveTo(sx, top);
    c.lineTo(L.right - 40, top);
    c.stroke();
    c.setLineDash([]);
    c.fillStyle = '#ffd23f';
    c.font = '800 18px "Baloo 2", system-ui, sans-serif';
    c.textAlign = 'left';
    c.fillText(`încape pe vagon: cel mult ${fmt(max)} m`, sx + 14, top - 14);
    if (this.chosen >= 0) {
      c.fillStyle = '#ffd23f';
      const t = this.treeSpot(this.chosen);
      fillStar(c, t.x, t.y - t.h - 18, 18, 8);
    }
  }

  dispose() {
    super.dispose();
    this.ctx.world.train.setBubuVisible(true);
  }
}

/**
 * A height in metres with a decimal comma, as written in Romanian.
 * @param {number} m
 */
function fmt(m) {
  return m.toFixed(2).replace('.', ',');
}
