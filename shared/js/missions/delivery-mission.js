/**
 * @file Travel mission "deliver the gifts".
 *
 * Village houses pass in front of the train. At some of them a child waits
 * in the yard, waving; others are dark and empty. When the child touches the
 * screen, Bubu tosses a gift out of her window. A gift keeps the speed of
 * the train, so on screen it falls almost straight down, onto the spot
 * marked by a ring under Bubu's window: the trick is to throw at the right
 * moment, so that the gift lands just when a waiting child is there.
 *
 * Bubu's sack holds only a few gifts more than there are children, so
 * throwing at random does not work.
 *
 * Configuration (besides id/title/text):
 *   houses   how many houses pass by
 *   empty    how many of them are dark and empty (decoys)
 *   spare    gifts in the sack beyond one per child
 */

import { TAU, clamp } from '../core/math.js';
import { GIFT_COLORS, drawGift } from '../gfx/ornaments.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { drawHouse, fillCircle, glow, lightWindows } from '../gfx/shapes.js';
import { ROOFS, WALLS } from '../world/biomes/terrain.js';
import { Mission } from './mission.js';

/** Ground line of the yards in front of the track (stage units). */
const YARD_Y = 893;
/** Top of the band in which the houses are drawn (for the tint). */
const BAND_TOP = 720;
/** Gravity and initial toss of a gift (stage units, seconds). */
const GRAVITY = 1500;
const TOSS_UP = -420;
const TOSS_FORWARD = 50;
/** A gift lands on a child if it falls this close to them. */
const CATCH_RADIUS = 72;
/** Minimum time between two throws. */
const THROW_COOLDOWN = 0.4;

/**
 * @typedef {object} House
 * @property {number} worldX     left wall, in world units
 * @property {boolean} child     a child waits in the yard
 * @property {boolean} served
 * @property {number} servedAt   time when the gift arrived
 * @property {string} wall
 * @property {string} roof
 * @property {string} coat       colour of the child's coat
 * @property {number} phase
 *
 * @typedef {object} Gift
 * @property {number} x
 * @property {number} y
 * @property {number} vx
 * @property {number} vy
 * @property {string} color
 * @property {number} spin
 */

/**
 * @typedef {import('./mission.js').MissionConfig & {houses: number, empty: number, spare: number}} DeliveryConfig
 */

export class DeliveryMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {DeliveryConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    /** @type {House[]} */
    this.houses = [];
    /** @type {Gift[]} */
    this.gifts = [];
    this.particles = new Particles();
    this.time = 0;
    this.spawned = 0;
    this.nextWorldX = 0;
    this.spacing = 1200;
    this.children = 0;
    this.delivered = 0;
    this.sack = 0;
    this.cooldown = 0;
    /** @type {boolean[]} which houses have a child (decided at the start) */
    this.plan = [];
  }

  /** @param {{duration?: number, window?: {from: number, to: number}}} hints */
  start(hints) {
    super.start(hints);
    const { houses, empty, spare } = this.config;
    // decide which houses are empty, never two empty ones in a row and never the first
    const plan = Array(houses).fill(true);
    let placed = 0;
    while (placed < empty) {
      const i = 1 + Math.floor(Math.random() * (houses - 1));
      if (!plan[i] || !plan[i - 1] || plan[i + 1] === false) continue;
      plan[i] = false;
      placed += 1;
    }
    this.plan = plan;
    this.children = plan.filter(Boolean).length;
    this.sack = this.children + spare;

    const j = this.ctx.journey;
    const w = this.ctx.world;
    // spread the houses over the stretch of the segment where the mission runs
    const length = hints.window ? (hints.window.to - hints.window.from) * j.segment.length : 15000;
    this.spacing = Math.max(900, (length - this.ctx.stage.width) / houses);
    this.nextWorldX = j.distance - w.anchorX + this.ctx.stage.viewRight + 150;
    this.updateCounter();
  }

  /** @private */
  updateCounter() {
    this.ctx.hud.setCounter('🎁', this.delivered, this.children, `sac: ${this.sack}`);
  }

  /** Where a gift thrown now would land (stage units). */
  get landingX() {
    const w = this.ctx.world;
    const bubu = w.trainToStage(w.train.bubuPosition);
    const t = this.flightTime(bubu.y);
    return bubu.x + TOSS_FORWARD * t;
  }

  /**
   * @private
   * @param {number} fromY
   */
  flightTime(fromY) {
    const drop = YARD_Y - 20 - fromY;
    return (-TOSS_UP + Math.sqrt(TOSS_UP * TOSS_UP + 2 * GRAVITY * drop)) / GRAVITY;
  }

  /**
   * Screen x of a world position.
   * @param {number} worldX
   */
  toScreen(worldX) {
    return worldX - this.ctx.journey.distance + this.ctx.world.anchorX;
  }

  /** Screen x of a house's left wall. */
  houseX(/** @type {House} */ h) {
    return this.toScreen(h.worldX);
  }

  /** Screen x of the spot where the child stands. */
  childX(/** @type {House} */ h) {
    return this.houseX(h) + 190;
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.cooldown -= dt;
    this.particles.update(dt);
    const right = this.ctx.stage.viewRight;

    // new houses appear beyond the right edge, at regular distances
    while (this.phase === 'running' && this.spawned < this.config.houses
      && this.toScreen(this.nextWorldX) < right + 200) {
      const child = this.plan[this.spawned];
      this.houses.push({
        worldX: this.nextWorldX,
        child,
        served: false,
        servedAt: 0,
        wall: WALLS[this.spawned % WALLS.length],
        roof: ROOFS[(this.spawned * 3) % ROOFS.length],
        coat: GIFT_COLORS[(this.spawned * 5) % GIFT_COLORS.length],
        phase: Math.random() * TAU,
      });
      this.spawned += 1;
      this.nextWorldX += this.spacing * (0.85 + Math.random() * 0.3);
    }

    // gifts fly; when they reach the ground, a child may catch them
    for (let i = this.gifts.length - 1; i >= 0; i--) {
      const g = this.gifts[i];
      g.vy += GRAVITY * dt;
      g.x += g.vx * dt;
      g.y += g.vy * dt;
      if (g.y >= YARD_Y - 20 - this.ctx.world.cameraY) {
        this.gifts.splice(i, 1);
        this.land(g);
      }
    }

    // houses leave on the left
    const left = this.ctx.stage.viewLeft - 300;
    this.houses = this.houses.filter(h => this.houseX(h) > left);

    const out = this.spawned >= this.config.houses && this.houses.length === 0;
    const empty = this.sack === 0 && this.gifts.length === 0;
    if ((this.phase === 'wrapping' && this.gifts.length === 0) || out || empty) {
      this.ctx.hud.hideCounter();
      const n = this.delivered;
      const k = n / Math.max(1, this.children);
      this.complete(k >= 0.9 ? 3 : k >= 0.6 ? 2 : 1,
        n === this.children ? `Minunat! Toți cei ${n} copii au primit câte un dar!`
          : n > 0 ? `Ai dus daruri la ${n} copii din ${this.children}. Ce bucurie pe Valea Mureșului!`
            : 'De data asta darurile au căzut în zăpadă… dar copiii au văzut trenul lui Bubu!');
    }
  }

  /**
   * @private
   * @param {Gift} g
   */
  land(g) {
    let best = null;
    let bestDist = CATCH_RADIUS;
    for (const h of this.houses) {
      if (!h.child || h.served) continue;
      const d = Math.abs(this.childX(h) - g.x);
      if (d < bestDist) {
        best = h;
        bestDist = d;
      }
    }
    if (best) {
      best.served = true;
      best.servedAt = this.time;
      this.delivered += 1;
      this.particles.burst(g.x, YARD_Y - 70 - this.ctx.world.cameraY, [...SPARKS, g.color], 22, 260);
    } else {
      // a puff of snow (or grass) where it fell
      this.particles.burst(g.x, YARD_Y - 20 - this.ctx.world.cameraY, ['#ffffff', '#e3ecf8'], 10, 120);
    }
    this.updateCounter();
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    if (this.sack <= 0 || this.cooldown > 0 || this.phase === 'finished') return;
    this.cooldown = THROW_COOLDOWN;
    this.sack -= 1;
    const w = this.ctx.world;
    const bubu = w.trainToStage(w.train.bubuPosition);
    this.gifts.push({
      x: bubu.x,
      y: bubu.y - 10,
      vx: TOSS_FORWARD,
      vy: TOSS_UP,
      color: GIFT_COLORS[this.sack % GIFT_COLORS.length],
      spin: (Math.random() - 0.5) * 6,
    });
    this.updateCounter();
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const w = this.ctx.world;
    const glowK = w.glowStrength;
    // the houses, children and fences belong to the world: tinted, with the camera
    w.drawTinted(c, BAND_TOP, this.ctx.stage.viewBottom + w.cameraY + 10, b => {
      for (const h of this.houses) this.drawHouse(b, h);
    });
    c.save();
    c.translate(0, -w.cameraY);
    for (const h of this.houses) {
      // lit windows; the house of a happy child shines brighter
      const x = this.houseX(h);
      const rects = houseWindows(x);
      const strength = h.child ? Math.max(glowK, h.served ? 0.9 : 0.35) : 0;
      if (strength > 0.02) {
        c.globalAlpha = strength;
        lightWindows(c, rects);
        c.globalAlpha = 1;
      }
    }
    // the landing ring under Bubu
    if (this.phase === 'running' && this.sack > 0) {
      const lx = this.landingX;
      const pulse = 0.5 + 0.5 * Math.sin(this.time * 5);
      c.strokeStyle = `rgba(255,215,90,${0.55 + 0.35 * pulse})`;
      c.lineWidth = 4;
      c.setLineDash([8, 7]);
      c.beginPath();
      c.ellipse(lx, YARD_Y - 12, CATCH_RADIUS * 0.8, 12, 0, 0, TAU);
      c.stroke();
      c.setLineDash([]);
    }
    c.restore();

    for (const g of this.gifts) drawGift(c, g.x, g.y, 30, g.color, g.spin * this.time);
    this.particles.draw(c);
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {House} h
   */
  drawHouse(c, h) {
    const x = this.houseX(h);
    const snowy = this.ctx.world.cover > 0.5;
    drawHouse(c, x, YARD_Y, 130, 70, { wall: h.wall, roof: h.roof, snowy, chimney: true, windows: 2 });
    // smoke from the chimney of the houses where someone is home
    if (h.child) {
      c.fillStyle = 'rgba(235,235,240,0.55)';
      for (let i = 0; i < 3; i++) {
        const k = (this.time * 0.6 + i / 3) % 1;
        fillCircle(c, x + 95 + Math.sin(k * 6 + h.phase) * 6, YARD_Y - 125 - k * 60, 6 + k * 9);
      }
    }
    // fence
    c.fillStyle = '#8a6a50';
    c.fillRect(x - 20, YARD_Y - 26, 260, 4);
    for (let fx = x - 18; fx < x + 240; fx += 18) c.fillRect(fx, YARD_Y - 34, 5, 34);
    if (h.child) this.drawChild(c, h);
  }

  /**
   * A child in the yard: waves while waiting, jumps holding the gift after.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {House} h
   */
  drawChild(c, h) {
    const x = this.childX(h);
    const since = this.time - h.servedAt;
    const jump = h.served ? Math.abs(Math.sin(since * 7)) * 18 * clamp(1.6 - since * 0.4, 0, 1) : 0;
    const y = YARD_Y - jump;
    // body
    c.fillStyle = h.coat;
    c.beginPath();
    c.moveTo(x - 14, y - 4);
    c.lineTo(x - 10, y - 38);
    c.lineTo(x + 10, y - 38);
    c.lineTo(x + 14, y - 4);
    c.closePath();
    c.fill();
    c.fillStyle = '#3b4250';
    c.fillRect(x - 10, y - 4, 7, 6);
    c.fillRect(x + 3, y - 4, 7, 6);
    // head and hat
    c.fillStyle = '#f6d1b3';
    fillCircle(c, x, y - 48, 11);
    c.fillStyle = '#d32f2f';
    c.beginPath();
    c.moveTo(x - 12, y - 50);
    c.quadraticCurveTo(x, y - 72, x + 12, y - 50);
    c.closePath();
    c.fill();
    c.fillStyle = '#ffffff';
    fillCircle(c, x + 3, y - 66, 4);
    c.fillStyle = '#3b4250';
    fillCircle(c, x - 4, y - 48, 1.6);
    fillCircle(c, x + 4, y - 48, 1.6);
    // arms: waving, or holding the gift
    c.strokeStyle = h.coat;
    c.lineWidth = 6;
    c.lineCap = 'round';
    c.beginPath();
    if (h.served) {
      c.moveTo(x - 9, y - 32);
      c.lineTo(x - 10, y - 62);
      c.moveTo(x + 9, y - 32);
      c.lineTo(x + 10, y - 62);
      c.stroke();
      drawGift(c, x, y - 74, 26, GIFT_COLORS[(h.phase * 10 | 0) % GIFT_COLORS.length]);
    } else {
      const wave = Math.sin(this.time * 8 + h.phase) * 0.5;
      c.moveTo(x - 9, y - 32);
      c.lineTo(x - 18, y - 14);
      c.moveTo(x + 9, y - 32);
      c.lineTo(x + 9 + Math.sin(-1.2 + wave) * 22, y - 32 - Math.cos(-1.2 + wave) * 22);
      c.stroke();
      // a little glow, so waiting children are easy to spot
      glow(c, x, y - 40, 60, 'rgba(255,230,140,0.25)', 'rgba(255,230,140,0)');
    }
  }
}

/**
 * A small candle standing on a window sill, with a flickering flame.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} sill
 * @param {number} t  seconds (for the flicker)
 */
export function drawCandle(c, x, sill, t) {
  c.fillStyle = '#fff3e0';
  c.fillRect(x - 2.5, sill - 9, 5, 9);
  const f = 1 + Math.sin(t * 19) * 0.15;
  glow(c, x, sill - 13, 12, 'rgba(255,200,90,0.8)', 'rgba(255,200,90,0)');
  c.fillStyle = '#ffb300';
  c.beginPath();
  c.ellipse(x, sill - 13, 2.5, 4.5 * f, 0, 0, TAU);
  c.fill();
}

/**
 * The window rectangles of a mission house (same geometry as drawHouse).
 * @param {number} x
 * @returns {Array<[number, number, number, number]>}
 */
export function houseWindows(x) {
  const w = 130;
  const h = 70;
  const ww = w * 0.2;
  const wh = h * 0.34;
  return [1, 2].map(i => /** @type {[number, number, number, number]} */ ([x + (w * i) / 3 - ww / 2, YARD_Y - h * 0.68, ww, wh]));
}
