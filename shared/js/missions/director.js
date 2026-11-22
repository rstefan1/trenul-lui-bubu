/**
 * @file The mission director: decides which mission runs when.
 *
 * The plan of a journey (see route-01/js/missions-data.js) lists the travel
 * missions of every segment and the mission of every station. The director
 * watches the journey and:
 *
 *   - when the train stops at a station, starts that station's mission and
 *     lets the train leave only after it is finished (stations without a
 *     mission get a short stop);
 *   - while the train runs, starts each travel mission when its window
 *     opens and asks it to wrap up when the window closes;
 *   - when a mission finishes, records its stars and shows the result.
 *
 * Mission classes are looked up in a registry by type, so a journey's plan
 * is pure data and new kinds of missions can be added without touching the
 * director.
 *
 * When the train is ready to leave a station (its mission finished, or the
 * short stop over), the director emits "ready" (station), the locomotive
 * whistles and the train leaves once the whistle is over; at the last
 * station it emits "complete" (station) instead: the journey is over. If the `holdAt`
 * policy says so (e.g. at the end of a chapter), the train then waits until
 * {@link MissionDirector#release} is called.
 */

import { playSound, starSound, successSound } from '../audio/effects.js';
import { Emitter } from '../core/emitter.js';
import { starDelay } from '../ui/mission-hud.js';

/**
 * @typedef {object} TravelMissionPlan
 * @property {number} segment   index of the segment
 * @property {number} from      window start, fraction of the segment
 * @property {number} to        window end, fraction of the segment
 * @property {string} type      key in the registry
 * @property {import('./mission.js').MissionConfig & Record<string, unknown>} config
 *
 * @typedef {object} StationMissionPlan
 * @property {string} type
 * @property {import('./mission.js').MissionConfig & Record<string, unknown>} config
 *
 * @typedef {object} Moment
 * @property {number} segment
 * @property {number} at       fraction of the segment
 * @property {string} kicker
 * @property {string} title
 * @property {string} text
 *
 * @typedef {object} MissionPlan
 * @property {TravelMissionPlan[]} travel
 * @property {Record<string, StationMissionPlan>} stations   by station id
 * @property {Moment[]} [moments]   short announcements during the journey (surprises)
 *
 * @typedef {new (ctx: import('./mission.js').MissionContext, config: any) => import('./mission.js').Mission} MissionClass
 */

/** Seconds a station without a mission keeps the train. */
const PLAIN_STOP = 4;
/** Seconds between the arrival and a station mission (time to see the station sign). */
const BEFORE_STATION_MISSION = 2;
/** Seconds between the result of a station mission and the departure. */
const AFTER_RESULT = 2.4;

/** Seconds the doors take to close before the whistle. */
const DOORS_CLOSE = 1.1;

export class MissionDirector extends Emitter {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {MissionPlan} plan
   * @param {Record<string, MissionClass>} registry
   */
  constructor(ctx, plan, registry) {
    super();
    this.ctx = ctx;
    this.plan = plan;
    this.registry = registry;
    /** @type {import('./mission.js').Mission[]} */
    this.active = [];
    /** Travel missions already started (by index in the plan). */
    this.started = new Set();
    /** Moments already announced (by index in the plan). */
    this.announced = new Set();
    /** Seconds until the train is ready to leave the station it waits at. */
    this.readyIn = Infinity;
    /** Seconds until the train leaves (while the locomotive whistles). */
    this.departIn = Infinity;
    /** The station mission holding the train, if any. */
    this.holding = false;
    /** True while the train waits for {@link release}. */
    this.held = false;
    /** @type {{entry: StationMissionPlan, wait: number} | null} station mission about to start */
    this.pending = null;
    /** @type {(station: import('../journey/route.js').Station) => boolean} */
    this.holdAt = () => false;

    ctx.journey.on('arrive', station => this.atStation(station));
  }

  /**
   * The train is stopped at a station: run its mission, or wait a little.
   * @param {import('../journey/route.js').Station} station
   * @param {{skipMission?: boolean, wait?: number}} [options]
   *        skipMission: the mission was already played (resuming a saved journey)
   */
  atStation(station, options = {}) {
    const entry = this.plan.stations[station.id];
    if (!entry || options.skipMission) {
      this.readyIn = options.wait ?? PLAIN_STOP;
      return;
    }
    this.holding = true;
    // the first station's mission starts at once (the train is already there)
    this.pending = { entry, wait: station.index === 0 ? 0 : BEFORE_STATION_MISSION };
  }

  /** Lets a held train leave. */
  release() {
    if (!this.held) return;
    this.held = false;
    this.leave();
  }

  /**
   * The train leaves the station: the doors close, the whistle blows, and
   * then the train departs.
   * @private
   */
  leave() {
    const audio = this.ctx.audio;
    if (!audio?.ready) {
      this.departIn = 0;
      return;
    }
    playSound(audio, 'doorsClose');
    this.departIn = DOORS_CLOSE;
    if (audio.canPlay('whistle')) {
      setTimeout(() => audio.play('whistle'), DOORS_CLOSE * 1000);
      this.departIn += audio.duration('whistle');
    }
  }

  /** Stops every mission and timer (when a chapter is started again, for example). */
  reset() {
    for (const m of this.active) m.dispose();
    this.active = [];
    this.ctx.hud.clearInstructions();
    this.started.clear();
    this.announced.clear();
    this.readyIn = Infinity;
    this.departIn = Infinity;
    this.holding = false;
    this.held = false;
    this.pending = null;
    this.ctx.hud.hideCounter();
    this.ctx.hud.hideAnnouncement();
  }

  /** @param {number} dt  game seconds */
  update(dt) {
    const j = this.ctx.journey;
    if (this.departIn !== Infinity && (this.departIn -= dt) <= 0) {
      this.departIn = Infinity;
      j.depart();
    }
    if (this.readyIn !== Infinity) {
      this.readyIn -= dt;
      if (this.readyIn <= 0) {
        this.readyIn = Infinity;
        const station = j.station;
        if (j.state === 'finished') {
          this.emit('complete', station);
          return;
        }
        this.emit('ready', station);
        if (this.holdAt(station)) this.held = true;
        else this.leave();
      }
    }

    if (this.pending && (this.pending.wait -= dt) <= 0) {
      const { entry } = this.pending;
      this.pending = null;
      this.launch(entry.type, entry.config, {});
    }

    if (j.state === 'running') {
      const u = j.segmentProgress;
      this.plan.travel.forEach((t, i) => {
        if (t.segment !== j.segment.index || this.started.has(i) || u < t.from || u >= t.to) return;
        this.started.add(i);
        this.launch(t.type, t.config, { duration: (t.to - t.from) * j.segment.profile.duration, window: t });
      });
      (this.plan.moments || []).forEach((m, i) => {
        if (m.segment !== j.segment.index || this.announced.has(i) || u < m.at) return;
        this.announced.add(i);
        this.ctx.hud.announce(m.title, m.text, m.kicker);
      });
      for (const m of this.active) {
        const w = /** @type {TravelMissionPlan | undefined} */ (m.window);
        if (w && (j.segment.index !== w.segment || u >= w.to)) m.wrapUp();
      }
    }

    for (const m of this.active) m.update(dt);
    for (const m of this.active.filter(x => x.finished)) this.finish(m);
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    for (const m of this.active) m.draw(c);
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    // the most recent mission gets the input
    const m = this.active[this.active.length - 1];
    if (m) m.pointerDown(p);
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerMove(p) {
    const m = this.active[this.active.length - 1];
    if (m) m.pointerMove(p);
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerUp(p) {
    const m = this.active[this.active.length - 1];
    if (m) m.pointerUp(p);
  }

  /**
   * Are there travel missions still running or still to start on the current trip?
   * @private
   */
  missionsLeftOnSegment() {
    const j = this.ctx.journey;
    if (this.active.some(x => x.window)) return true;
    return this.plan.travel.some((t, i) => t.segment === j.segment.index && !this.started.has(i));
  }

  /** True when a mission wants the pointer (the canvas then shows a hand cursor). */
  get wantsPointer() {
    return this.active.length > 0;
  }

  /**
   * @private
   * @param {string} type
   * @param {any} config
   * @param {{duration?: number, window?: TravelMissionPlan}} hints
   * @returns {import('./mission.js').Mission & {window?: TravelMissionPlan}}
   */
  launch(type, config, hints) {
    const Class = this.registry[type];
    if (!Class) throw new Error(`Unknown mission type "${type}"`);
    /** @type {import('./mission.js').Mission & {window?: TravelMissionPlan}} */
    const m = new Class(this.ctx, config);
    m.window = hints.window;
    this.active.push(m);
    m.start(hints);
    return m;
  }

  /**
   * @private
   * @param {import('./mission.js').Mission & {window?: TravelMissionPlan}} m
   */
  finish(m) {
    this.active.splice(this.active.indexOf(m), 1);
    m.dispose();
    if (!this.active.length) this.ctx.hud.clearInstructions();
    this.ctx.state.awardStars(m.id, m.stars);
    this.ctx.hud.showResult(m.stars, m.resultText);
    successSound(this.ctx.audio);
    this.ctx.world.train.react('joy');
    for (let i = 1; i <= m.stars; i++) setTimeout(() => starSound(this.ctx.audio, i - 1), starDelay(i) * 1000);
    // a travel mission finished early: if nothing else is left on this trip,
    // the train hurries to the next station instead of making the child wait
    if (m.window && this.ctx.journey.state === 'running' && !this.missionsLeftOnSegment()) this.ctx.journey.hurry();
    if (!m.window && this.holding) {
      this.holding = false;
      this.readyIn = AFTER_RESULT;
    }
  }
}
