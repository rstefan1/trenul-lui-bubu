/**
 * @file Draws a train with Bubu at her window.
 *
 * The static body of the whole train (all cars, windows, emblems,
 * pantograph) is painted once into an offscreen canvas. Every frame only
 * this image is copied, and the parts that move or glow are drawn on top:
 * the turning wheels, Bubu (who sways gently with the train), the lit
 * windows and the headlight.
 *
 * Train coordinates: x = 0 at the front of the train, negative towards the
 * back; y = 0 on the rail top. The renderer is told where the front of the
 * train is on screen.
 *
 * Decorations. Baubles caught during the journey hang from fir garlands
 * along the roof edges, from the locomotive backwards. A car gets its
 * garland when its first bauble arrives. A string of coloured lights runs
 * along the cars under the windows; it lights up bit by bit (front to back)
 * and twinkles, brightest at night.
 */

import { createOffscreen, releaseCanvas } from '../core/canvas-cache.js';
import { TAU, approach, clamp } from '../core/math.js';
import { drawBauble, drawGarland } from '../gfx/ornaments.js';
import { fillCircle, glow } from '../gfx/shapes.js';
import { drawBubuHat } from '../gfx/hats.js';
import { drawBubu } from './bubu.js';
import { CAR_PAINTERS, WHEEL_R } from './cars.js';
import { TREE_WAGON } from './specs.js';

/** Vertical extent of the painted train, relative to the rail. */
const TOP = -262;
const BOTTOM = 6;
/** Bubu's size on screen (her window is a normal one; she leans out of it). */
const BUBU_SIZE = 80;
/** Distance between two garland hooks. */
const HOOK_SPACING = 58;
/** How far the garland hangs between hooks. */
const GARLAND_SAG = 7;
/** Radius of a bauble hanging on the train. */
export const HANGING_BAUBLE_R = 11;

/**
 * @typedef {object} LaidOutCar
 * @property {import('./specs.js').CarSpec} spec
 * @property {number} left   train x of the rear end
 * @property {import('./cars.js').CarGeometry} geo  in car coordinates
 */

/**
 * @typedef {object} TrainFrame
 * @property {number} frontX     screen x of the front of the train
 * @property {number} railY      screen y of the rail
 * @property {number} distance   travelled distance (turns the wheels)
 * @property {number} speed      current speed (Bubu sways more when fast)
 * @property {number} time       seconds
 * @property {number} lights     0..1, how strongly the windows glow
 * @property {number} headlight  0..1
 */

/** The kinds of car that are locomotives (the player chooses their colour). */
const LOCOS = new Set(['electricLoco', 'dieselLoco']);

/** Seconds a passenger needs to get off and walk away. */
const PASSENGER_LEAVE = 2.6;

/*
 * The train has weight: its body rides on springs above the wheels. Every
 * rail joint gives it a small knock (it dips and settles), and when the
 * train brakes or sets off the body leans forward or back a little before
 * the springs bring it back. Only the body moves; the wheels stay on the rail.
 */
/** Distance between two rail joints (stage units). */
const RAIL_JOINT = 180;
/** Spring stiffness and damping of the suspension. */
const SPRING = 160;
const DAMPING = 11;
/** Knock of a rail joint at full speed (units/s pushed into the spring). */
const JOINT_KNOCK = 22;
/** How far the body leans per unit of acceleration, and at most (stage units). */
const LEAN = 0.012;
const LEAN_MAX = 3;

/*
 * Bubu is alive at her window: she breathes, looks where the child touches,
 * hops for joy when a mission is won and droops a little after a mistake.
 */
/** Seconds Bubu's joy and her sadness last, and how long she keeps looking at a touch. */
const JOY_TIME = 1.1;
const SAD_TIME = 1.2;
const LOOK_TIME = 1.6;

export class TrainRenderer {
  /**
   * @param {import('../core/stage.js').Stage} stage
   * @param {import('./specs.js').TrainSpec} spec
   */
  constructor(stage, spec) {
    this.stage = stage;
    /** @type {HTMLCanvasElement | null} */
    this.body = null;
    /** @type {string | null} colour chosen by the player for the locomotive */
    this.locoColor = null;
    /** @type {string[]} colours of the baubles hanging on the train */
    this.baubles = [];
    /** How much of the string of lights is lit (0..1). */
    this.lightBulbs = 0;
    /** The hat Bubu wears at her window (index in HATS, −1 = none). */
    this.hat = -1;
    /**
     * Passengers a mission brought on board (animals of the forest), sitting
     * at windows; when they leave, they hop out and walk away.
     * @type {Array<{emoji: string, seat: number, leaving: number}>}
     */
    this.passengers = [];
    this.time = 0;
    /** @type {Array<string | null>} the loads of the flat wagons of a freight train, front to back */
    this.cargo = [];
    /** A second locomotive pushes at the back of the train (on a steep mountain line). */
    this.pusher = false;
    /** The train carries the flat wagon with the Christmas tree (after Vatra Dornei). */
    this.treeWagon = false;
    /** How far Bubu has appeared at her window (0 = not on the train yet). */
    this.bubuShown = 1;
    this.bubuTarget = 1;
    /** The body on its springs: height (dy, with its speed vy) and lean (dx), in stage units. */
    this.ride = { dy: 0, vy: 0, dx: 0, joint: 0, speed: 0 };
    /** @type {{kind: 'joy' | 'sad' | null, t: number}} Bubu's feeling of the moment */
    this.mood = { kind: null, t: 0 };
    /** Where Bubu looks (screen x) and for how long already. */
    this.look = { x: 0, t: Infinity };
    this.setSpec(spec);
    stage.on('resize', () => this.dropBody());
  }

  /**
   * Changes the composition (e.g. after changing trains in Suceava).
   * @param {import('./specs.js').TrainSpec} spec
   */
  setSpec(spec) {
    this.spec = spec;
    /** @type {LaidOutCar[]} */
    this.cars = [];
    let cursor = 0;
    // the tree wagon goes right behind a locomotive (a long train: there it is on
    // screen); a short railcar train, which stands further left, pulls it at the end
    const loco = spec.cars[0].kind === 'electricLoco';
    const cars = !this.treeWagon ? spec.cars : loco ? [spec.cars[0], TREE_WAGON, ...spec.cars.slice(1)] : [...spec.cars, TREE_WAGON];
    // the pushing locomotive: the same as the leading one, turned round, at the back
    if (this.pusher && spec.cars[0].kind === 'dieselLoco') cars.push({ ...spec.cars[0], pusher: true });
    cars.forEach((car) => {
      const left = cursor - car.length;
      this.cars.push({ spec: car, left, geo: /** @type {any} */ (null) });
      cursor = left - spec.gap;
    });
    /** Train x of the rear end. */
    this.rearX = cursor + spec.gap;
    this.dropBody();
  }

  /**
   * Forgets the painted body (it is painted again when next drawn), giving
   * its memory back at once.
   * @private
   */
  dropBody() {
    releaseCanvas(this.body);
    this.body = null;
  }

  /**
   * Adds (or removes) the flat wagon with the Christmas tree, right behind
   * the locomotive.
   * @param {boolean} on
   */
  setTreeWagon(on) {
    if (on === this.treeWagon) return;
    this.treeWagon = on;
    this.setSpec(this.spec);
  }

  /**
   * Adds (or removes) the locomotive pushing at the back of a freight train.
   * @param {boolean} on
   */
  setPusher(on) {
    if (on === this.pusher) return;
    this.pusher = on;
    this.setSpec(this.spec);
  }

  /**
   * Puts loads on the flat wagons of a freight train (or takes them off).
   * @param {Array<string | null>} cargo  one per wagon, front to back (a key of LOADS, or null)
   */
  setCargo(cargo) {
    if (cargo.length === this.cargo.length && cargo.every((x, i) => x === this.cargo[i])) return;
    this.cargo = cargo.slice();
    this.dropBody();
  }

  /**
   * Repaints the locomotive in another colour.
   * @param {string | null} color
   */
  setLocoColor(color) {
    this.locoColor = color;
    this.dropBody();
  }

  /**
   * Shows or hides Bubu at her window; she pops up (or ducks down) smoothly.
   * @param {boolean} visible
   * @param {boolean} [instant=false]
   */
  setBubuVisible(visible, instant = false) {
    this.bubuTarget = visible ? 1 : 0;
    if (instant) this.bubuShown = this.bubuTarget;
  }

  /**
   * @param {number} dt
   * @param {number} [speed=0]     of the train (for the suspension)
   * @param {number} [distance=0]  travelled (for the rail joints)
   */
  update(dt, speed = 0, distance = 0) {
    this.time += dt;
    this.bubuShown = approach(this.bubuShown, this.bubuTarget, 7, dt);
    this.updateRide(dt, speed, distance);
    this.mood.t += dt;
    this.look.t += dt;
    for (const p of this.passengers) if (p.leaving >= 0) p.leaving += dt;
    this.passengers = this.passengers.filter(p => p.leaving < PASSENGER_LEAVE);
  }

  /**
   * @private
   * @param {number} dt
   * @param {number} speed
   * @param {number} distance
   */
  updateRide(dt, speed, distance) {
    const r = this.ride;
    if (dt <= 0) return;
    // a knock at every rail joint, stronger the faster the train goes
    const joint = Math.floor(distance / RAIL_JOINT);
    if (joint !== r.joint) {
      r.joint = joint;
      r.vy += JOINT_KNOCK * clamp(speed / 500, 0, 1);
    }
    // the spring pulls the body back, the damper calms it
    r.vy += (-SPRING * r.dy - DAMPING * r.vy) * dt;
    r.dy += r.vy * dt;
    // braking leans the body forward (+x), setting off leans it back
    const accel = (speed - r.speed) / dt;
    r.speed = speed;
    r.dx = approach(r.dx, clamp(-accel * LEAN, -LEAN_MAX, LEAN_MAX), 4, dt);
  }

  /**
   * Bubu shows a feeling: joy (she hops) or sadness (she droops a little).
   * @param {'joy' | 'sad'} kind
   */
  react(kind) {
    this.mood = { kind, t: 0 };
  }

  /**
   * Bubu turns towards something the child touched.
   * @param {number} x  screen x
   */
  lookAt(x) {
    this.look = { x, t: 0 };
  }

  /**
   * A passenger sits down at a window.
   * @param {string} emoji
   * @param {number} seat  index in passengerWindows
   */
  addPassenger(emoji, seat) {
    this.passengers.push({ emoji, seat, leaving: -1 });
  }

  /** All passengers get off together and walk away. */
  leaveAll() {
    for (const p of this.passengers) if (p.leaving < 0) p.leaving = 0;
  }

  /**
   * The passengers at their windows, or hopping out onto the platform.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {TrainFrame} f
   */
  drawPassengers(c, f) {
    if (!this.passengers.length) return;
    const windows = this.passengerWindows;
    c.font = '44px "Segoe UI Emoji", "Apple Color Emoji", "Noto Color Emoji", sans-serif';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    for (const p of this.passengers) {
      const w = windows[Math.min(p.seat, windows.length - 1)];
      if (!w) continue;
      const sx = f.frontX + w.x;
      const sy = f.railY + w.y;
      const t = Math.max(0, p.leaving);
      if (p.leaving < 0) {
        c.fillText(p.emoji, sx, sy + Math.sin(this.time * 3 + p.seat) * 2);
        continue;
      }
      // hop down in front of the train, then walk off to the right and fade
      const hop = Math.min(1, t / 0.8);
      const x = sx + hop * 60 + Math.max(0, t - 0.8) * 120;
      const y = sy + (f.railY + 70 - sy) * hop - Math.sin(hop * Math.PI) * 90;
      c.save();
      c.globalAlpha = Math.max(0, Math.min(1, (PASSENGER_LEAVE - t) / 0.6));
      c.fillText(p.emoji, x, y);
      c.restore();
    }
  }

  /**
   * Where the baubles hang, front to back, in train coordinates.
   * @returns {Array<{x: number, y: number, car: number}>}
   */
  get baubleSlots() {
    this.ensureBody();
    return /** @type {Array<{x: number, y: number, car: number}>} */ (this.slots);
  }

  /**
   * Train coordinates of Bubu (centre of her window).
   * @returns {{x: number, y: number}}
   */
  get bubuPosition() {
    this.ensureBody();
    for (const car of this.cars) {
      const r = car.geo.bubuWindow;
      if (r) return { x: car.left + r[0] + r[2] / 2, y: r[1] + r[3] * 0.4 };
    }
    return { x: 0, y: -120 };
  }

  /**
   * Centres of the passenger windows (Bubu's excepted), back of the train
   * first, in train coordinates: where passengers a mission brings can sit.
   * @returns {Array<{x: number, y: number}>}
   */
  get passengerWindows() {
    this.ensureBody();
    const out = [];
    for (const car of this.cars) {
      if (car.spec.kind === 'electricLoco' || car.spec.kind === 'flatcar') continue;
      const b = car.geo.bubuWindow;
      for (const r of car.geo.windows) {
        if (b && r[0] === b[0] && r[1] === b[1]) continue;
        out.push({ x: car.left + r[0] + r[2] / 2, y: r[1] + r[3] * 0.55 });
      }
    }
    return out.sort((a, b) => a.x - b.x);
  }

  /**
   * Where the parts of the locomotive are (the driver checks them before
   * leaving), in train coordinates; empty if the locomotive has none to show.
   * @returns {Partial<Record<import('./cars.js').LocoPart, import('./cars.js').Rect[]>>}
   */
  get locoParts() {
    this.ensureBody();
    for (const car of this.cars) {
      const parts = car.geo.parts;
      if (!parts) continue;
      /** @type {Partial<Record<import('./cars.js').LocoPart, import('./cars.js').Rect[]>>} */
      const out = {};
      for (const [name, rects] of Object.entries(parts)) {
        out[/** @type {import('./cars.js').LocoPart} */ (name)] = rects.map(([x, y, w, h]) => /** @type {import('./cars.js').Rect} */ ([car.left + x, y, w, h]));
      }
      return out;
    }
    return {};
  }

  /**
   * Which car is at a point (train coordinates), if any.
   * @param {number} x
   * @param {number} y
   * @returns {import('./specs.js').CarSpec | null}
   */
  carAt(x, y) {
    if (y < -200 || y > 0) return null;
    for (const car of this.cars) {
      if (x >= car.left && x <= car.left + car.spec.length) return car.spec;
    }
    return null;
  }

  /** Total length of the train. */
  get length() {
    return -this.rearX;
  }

  /**
   * Train x of the centre of Bubu's window (negative: behind the front).
   * Stations use it to stop with Bubu in front of the station building.
   */
  get bubuOffset() {
    this.ensureBody();
    for (const car of this.cars) {
      const r = car.geo.bubuWindow;
      if (r) return car.left + r[0] + r[2] / 2;
    }
    return 0;
  }

  /** @private Paints the static body (and computes the geometry). */
  ensureBody() {
    if (this.body) return;
    const ratio = this.stage.pixelRatio;
    const { canvas, ctx } = createOffscreen({
      x: this.rearX - 20, y: TOP, width: -this.rearX + 40, height: BOTTOM - TOP, ratio,
    });
    const last = this.cars.length - 1;
    let wagon = 0;
    this.cars.forEach((car, i) => {
      let spec = LOCOS.has(car.spec.kind) && this.locoColor
        ? { ...car.spec, colors: { ...car.spec.colors, body: this.locoColor } }
        : car.spec;
      if (car.spec.kind === 'platform') {
        const cargo = this.cargo[wagon++];
        if (cargo) spec = { ...spec, cargo };
      }
      ctx.save();
      ctx.translate(car.left, 0);
      if (car.spec.pusher) {
        // turned round (its cab looks back), without Bubu (she drives the front one)
        ctx.translate(car.spec.length, 0);
        ctx.scale(-1, 1);
        const geo = CAR_PAINTERS[car.spec.kind](ctx, spec, { leading: false, trailing: false });
        car.geo = { ...geo, bubuWindow: null, parts: undefined, headlight: null, taillight: { x: 4, y: -52 } };
      } else {
        car.geo = CAR_PAINTERS[car.spec.kind](ctx, spec, { leading: i === 0, trailing: i === last });
      }
      ctx.restore();
    });
    this.body = canvas;
    this.layoutDecorations();
  }

  /** @private Computes the garland hooks, the bauble slots and the light bulbs of every car. */
  layoutDecorations() {
    /** @type {Array<{x: number, y: number, car: number}>} */
    this.slots = [];
    /** @type {Array<{x: number, y: number}>} bulbs of the string of lights, front to back */
    this.bulbs = [];
    for (const car of this.cars) {
      const L = car.spec.length;
      const y = car.spec.kind === 'electricLoco' ? -92 : -86;
      for (let x = L - 14; x > 10; x -= 28) this.bulbs.push({ x: car.left + x, y: y + (Math.round(x / 28) % 2) * 5 });
    }
    this.cars.forEach((car, index) => {
      const L = car.spec.length;
      const n = Math.max(2, Math.round((L - 30) / HOOK_SPACING) + 1);
      const step = (L - 30) / (n - 1);
      const y = car.geo.roofY + 6;
      car.hooks = Array.from({ length: n }, (_, i) => ({ x: car.left + 15 + i * step, y }));
      const bubu = car.geo.bubuWindow;
      // front to back: from the right end of the car to the left
      for (let i = n - 2; i >= 0; i--) {
        const x = car.hooks[i].x + step / 2;
        if (bubu && x > car.left + bubu[0] - 14 && x < car.left + bubu[0] + bubu[2] + 14) continue;
        this.slots.push({ x, y: y + GARLAND_SAG + 13, car: index });
      }
    });
  }

  /**
   * Draws the parts of the train that are tinted by the time of day: body,
   * wheels and Bubu.
   * @param {CanvasRenderingContext2D} c
   * @param {TrainFrame} f
   */
  drawBody(c, f) {
    this.ensureBody();
    this.drawWheels(c, f);
    c.save();
    c.translate(this.ride.dx, this.ride.dy);
    const x0 = f.frontX + this.rearX - 20;
    c.drawImage(/** @type {HTMLCanvasElement} */ (this.body), x0, f.railY + TOP, -this.rearX + 40, BOTTOM - TOP);
    this.drawDecorations(c, f);
    this.drawBubu(c, f);
    this.drawPassengers(c, f);
    c.restore();
  }

  /**
   * Garlands and baubles.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {TrainFrame} f
   */
  drawDecorations(c, f) {
    this.drawBulbs(c, f, false);
    this.drawBaubles(c, f);
  }

  /**
   * The garlands and the baubles hanging on them.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {TrainFrame} f
   */
  drawBaubles(c, f) {
    const count = Math.min(this.baubles.length, this.baubleSlots.length);
    if (count === 0) return;
    const decorated = new Set();
    for (let i = 0; i < count; i++) decorated.add(this.baubleSlots[i].car);
    c.save();
    c.translate(f.frontX, f.railY);
    for (const index of decorated) drawGarland(c, this.cars[index].hooks, GARLAND_SAG);
    for (let i = 0; i < count; i++) {
      const s = this.baubleSlots[i];
      const swing = Math.sin(f.time * 2.2 + i * 1.3) * 1.5;
      c.strokeStyle = '#c9a227';
      c.lineWidth = 1.5;
      c.beginPath();
      c.moveTo(s.x, s.y - 14);
      c.lineTo(s.x + swing, s.y - HANGING_BAUBLE_R);
      c.stroke();
      drawBauble(c, s.x + swing, s.y, HANGING_BAUBLE_R, this.baubles[i], false);
    }
    c.restore();
  }

  /**
   * The string of lights: the wire and dark bulbs in the tinted pass, the
   * glow of the lit bulbs in the lights pass.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {TrainFrame} f
   * @param {boolean} glowing
   */
  drawBulbs(c, f, glowing) {
    const bulbs = /** @type {Array<{x: number, y: number}>} */ (this.bulbs);
    const lit = Math.round(bulbs.length * this.lightBulbs);
    if (lit === 0) return;
    const colors = ['#ff5252', '#ffd740', '#40c4ff', '#69f0ae'];
    c.save();
    c.translate(f.frontX, f.railY);
    if (!glowing) {
      c.strokeStyle = '#2d3a2f';
      c.lineWidth = 1.5;
      c.beginPath();
      bulbs.slice(0, lit).forEach((b, i) => (i ? c.lineTo(b.x, b.y) : c.moveTo(b.x, b.y)));
      c.stroke();
    }
    for (let i = 0; i < lit; i++) {
      const b = bulbs[i];
      const color = colors[i % colors.length];
      const on = 0.6 + 0.4 * Math.sin(f.time * 3 + i * 1.7);
      if (glowing) {
        c.globalAlpha = on;
        glow(c, b.x, b.y, 14, 'rgba(255,240,180,0.55)', 'rgba(255,240,180,0)');
        c.fillStyle = color;
        fillCircle(c, b.x, b.y, 4);
        c.globalAlpha = 1;
      } else {
        c.fillStyle = color;
        fillCircle(c, b.x, b.y, 4);
      }
    }
    c.restore();
  }

  /**
   * Draws the glowing parts, on top of the tint: windows, Bubu's lamp-lit
   * face, the headlight beam and the tail light.
   * @param {CanvasRenderingContext2D} c
   * @param {TrainFrame} f
   */
  drawLights(c, f) {
    this.ensureBody();
    c.save();
    c.translate(this.ride.dx, this.ride.dy);
    this.drawLightsOnBody(c, f);
    c.restore();
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {TrainFrame} f
   */
  drawLightsOnBody(c, f) {
    if (f.lights > 0.02) {
      c.globalAlpha = f.lights;
      for (const car of this.cars) {
        const ox = f.frontX + car.left;
        for (const [x, y, w, h] of car.geo.windows) {
          glow(c, ox + x + w / 2, f.railY + y + h / 2, w * 1.1, 'rgba(255,214,120,0.35)', 'rgba(255,214,120,0)');
          c.fillStyle = '#ffe39a';
          c.fillRect(ox + x, f.railY + y, w, h);
        }
        const b = car.geo.bubuWindow;
        if (b) {
          // the warm lamp inside (as in the other windows), then Bubu in front of it, fully opaque
          glow(c, ox + b[0] + b[2] / 2, f.railY + b[1] + b[3] / 2, b[2] * 1.1, 'rgba(255,214,120,0.35)', 'rgba(255,214,120,0)');
          c.fillStyle = '#ffe39a';
          c.fillRect(ox + b[0], f.railY + b[1], b[2], b[3]);
          c.globalAlpha = 1;
          this.drawBubu(c, f);
          c.globalAlpha = f.lights;
        }
      }
      c.globalAlpha = 1;
      this.drawPassengers(c, f);
      // the baubles hang in front of the windows: lit by the warm light, never hidden by it
      c.globalAlpha = Math.min(1, f.lights * 1.2);
      this.drawBaubles(c, f);
      c.globalAlpha = 1;
    }
    if (this.lightBulbs > 0) {
      c.globalAlpha = 0.35 + 0.65 * Math.max(f.lights, 0.2);
      this.drawBulbs(c, f, true);
      c.globalAlpha = 1;
    }
    for (const car of this.cars) {
      const ox = f.frontX + car.left;
      const t = car.geo.taillight;
      if (t && f.lights > 0.05) {
        glow(c, ox + t.x, f.railY + t.y, 26, `rgba(255,60,60,${0.6 * f.lights})`, 'rgba(255,60,60,0)');
      }
      const h = car.geo.headlight;
      if (h && f.headlight > 0.02) {
        const hx = ox + h.x;
        const hy = f.railY + h.y;
        // beam along the track
        const g = c.createLinearGradient(hx, 0, hx + 520, 0);
        g.addColorStop(0, `rgba(255,244,200,${0.45 * f.headlight})`);
        g.addColorStop(1, 'rgba(255,244,200,0)');
        c.fillStyle = g;
        c.beginPath();
        c.moveTo(hx, hy - 6);
        c.lineTo(hx + 520, hy - 70);
        c.lineTo(hx + 520, hy + 60);
        c.lineTo(hx, hy + 6);
        c.closePath();
        c.fill();
        glow(c, hx, hy, 34, `rgba(255,250,220,${0.9 * f.headlight})`, 'rgba(255,250,220,0)');
      }
    }
  }

  /**
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {TrainFrame} f
   */
  drawWheels(c, f) {
    const angle = f.distance / WHEEL_R;
    const y = f.railY - WHEEL_R;
    for (const car of this.cars) {
      const ox = f.frontX + car.left;
      for (const wx of car.geo.wheels) {
        const x = ox + wx;
        c.fillStyle = '#2b2f38';
        fillCircle(c, x, y, WHEEL_R);
        c.fillStyle = '#8b95a5';
        fillCircle(c, x, y, WHEEL_R - 4);
        // spokes turn with the distance travelled
        c.strokeStyle = '#4a5160';
        c.lineWidth = 3;
        c.beginPath();
        for (let k = 0; k < 3; k++) {
          const a = angle + (k * TAU) / 3;
          c.moveTo(x, y);
          c.lineTo(x + Math.cos(a) * (WHEEL_R - 4), y + Math.sin(a) * (WHEEL_R - 4));
        }
        c.stroke();
        c.fillStyle = '#2b2f38';
        fillCircle(c, x, y, 3.5);
      }
    }
  }

  /**
   * Bubu at her open window, leaning out a little: her lower part is hidden
   * behind the wall under the window sill.
   * @private
   * @param {CanvasRenderingContext2D} c
   * @param {TrainFrame} f
   */
  drawBubu(c, f) {
    if (this.bubuShown < 0.01) return;
    const hidden = (1 - this.bubuShown) * BUBU_SIZE * 0.9;
    for (const car of this.cars) {
      const r = car.geo.bubuWindow;
      if (!r) continue;
      const cx = f.frontX + car.left + r[0] + r[2] / 2;
      const sill = f.railY + r[1] + r[3];
      const sway = clamp(f.speed / 500, 0, 1);
      let bob = Math.sin(f.time * 7) * 1.5 * sway + Math.sin(f.time * 1.3) * 1.2;
      let tilt = Math.sin(f.time * 2.1) * 0.05 * (0.3 + sway);
      // she breathes: a slow, tiny swell
      let squash = Math.sin(f.time * 2.4) * 0.012;
      // she looks towards what the child touched, then back
      if (this.look.t < LOOK_TIME) {
        const k = Math.sin(Math.min(1, this.look.t / LOOK_TIME) * Math.PI);
        tilt += clamp((this.look.x - cx) / 500, -1, 1) * 0.16 * k;
      }
      const m = this.mood;
      if (m.kind === 'joy' && m.t < JOY_TIME) {
        // two happy hops, squashing as she lands
        const hop = Math.abs(Math.sin((m.t / JOY_TIME) * Math.PI * 2));
        const fade = 1 - m.t / JOY_TIME;
        bob -= hop * 14 * fade;
        squash += (0.5 - hop) * 0.12 * fade;
      } else if (m.kind === 'sad' && m.t < SAD_TIME) {
        // she sinks a little and leans her head
        const k = Math.sin((m.t / SAD_TIME) * Math.PI);
        bob += 6 * k;
        tilt -= 0.14 * k;
      }
      const y = sill - BUBU_SIZE * 0.38 + bob + hidden;
      c.save();
      c.beginPath();
      c.rect(cx - BUBU_SIZE, sill - BUBU_SIZE * 1.5 - 20, BUBU_SIZE * 2, BUBU_SIZE * 1.5 + 20);
      c.clip();
      drawBubu(c, cx, y, BUBU_SIZE, tilt, squash);
      drawBubuHat(c, this.hat, cx, y - BUBU_SIZE * squash * 0.5, BUBU_SIZE);
      c.restore();
    }
  }
}
