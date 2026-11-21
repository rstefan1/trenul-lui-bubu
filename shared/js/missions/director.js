/**
 * @file The mission director: decides which mission runs when.
 *
 * The plan of a journey (see winter/js/missions-data.js) lists the travel
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
 */

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

export class MissionDirector {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {MissionPlan} plan
   * @param {Record<string, MissionClass>} registry
   */
  constructor(ctx, plan, registry) {
    this.ctx = ctx;
    this.plan = plan;
    this.registry = registry;
    /** @type {import('./mission.js').Mission[]} */
    this.active = [];
    /** Travel missions already started (by index in the plan). */
    this.started = new Set();
    /** Moments already announced (by index in the plan). */
    this.announced = new Set();
    /** Pending departure, in seconds of game time. */
    this.departIn = Infinity;
    /** True while a station mission holds the train. */
    this.holding = false;
    /** @type {{entry: StationMissionPlan, wait: number} | null} station mission about to start */
    this.pending = null;

    ctx.journey.on('arrive', station => this.atStation(station));
  }

  /**
   * The train is stopped at a station and ready: run its mission, or wait a
   * little and leave.
   * @param {import('../journey/route.js').Station} station
   */
  atStation(station) {
    const j = this.ctx.journey;
    if (j.state === 'finished') return;
    const entry = this.plan.stations[station.id];
    if (!entry) {
      this.departIn = PLAIN_STOP;
      return;
    }
    this.holding = true;
    // the first station's mission starts at once (the train is already there)
    this.pending = { entry, wait: station.index === 0 ? 0 : BEFORE_STATION_MISSION };
  }

  /** @param {number} dt  game seconds */
  update(dt) {
    const j = this.ctx.journey;
    if (this.departIn !== Infinity) {
      this.departIn -= dt;
      if (this.departIn <= 0) {
        this.departIn = Infinity;
        j.depart();
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
    this.ctx.state.awardStars(m.id, m.stars);
    this.ctx.hud.showResult(m.stars, m.resultText);
    if (!m.window && this.holding) {
      this.holding = false;
      this.departIn = AFTER_RESULT;
    }
  }
}
