/**
 * @file The journey: where the train is, how fast it goes and what time it
 * is, as a small state machine.
 *
 *     ┌──────────┐ depart() ┌─────────┐ reaches station ┌──────────┐
 *     │ stopped  │ ───────► │ running │ ──────────────► │ stopped  │ … ► finished
 *     └──────────┘          └─────────┘                 └──────────┘
 *
 * The journey never departs on its own: whoever controls the game (for now
 * a simple timer, later the station missions) calls {@link Journey#depart}.
 * It announces what happens through events:
 *
 *   "arrive"  (station)            the train stopped at a station
 *   "depart"  (station, segment)   the train left a station
 *   "finish"  (station)            the train reached the last station
 *
 * The clock follows the timetable: while running it moves from the
 * departure time to the arrival time (with the distance travelled); while
 * stopped it moves towards the departure time in {@link DWELL_SECONDS} and
 * then waits there.
 *
 * Driving. Normally the train follows the planned motion of the segment. A
 * mission may take the controls ({@link Journey#takeControl}): the child
 * then chooses a speed and the train smoothly reaches it and keeps it. When
 * the mission gives the controls back, the rest of the trip
 * is planned again from the current position and speed, so the train still
 * stops exactly at the next station.
 */

import { Emitter } from '../core/emitter.js';
import { clamp, lerp, progress } from '../core/math.js';
import { MotionPlan } from './motion.js';
import { ACCELERATION, CRUISE_SPEED } from './route.js';

/** How much faster the train goes when it hurries to the next station. */
const HURRY = 1.7;

/** Speeds and accelerations while the child drives. */
export const MANUAL = Object.freeze({ maxSpeed: 620, minSpeed: 90, accelerate: 230, brake: 260 });

/**
 * @typedef {object} Controls
 * @property {number} target   the speed chosen by the child
 */

/** Play seconds a normal stop is expected to last (for the clock). */
export const DWELL_SECONDS = 6;

/** @typedef {'stopped' | 'running' | 'finished'} JourneyState */

export class Journey extends Emitter {
  /** @param {import('./route.js').Route} route */
  constructor(route) {
    super();
    this.route = route;
    /** @type {JourneyState} */
    this.state = 'stopped';
    /** Index of the station the train is at, or has just left. */
    this.stationIndex = 0;
    /** Seconds since departure (running) or since arrival (stopped). */
    this.elapsed = 0;
    this.distance = 0;
    this.speed = 0;
    this.clock = route.stations[0].depart;
    /** The planned motion being followed: its plan, where it started and for how long. */
    /** @type {{plan: MotionPlan, start: number, elapsed: number} | null} */
    this.leg = null;
    /** @type {Controls | null} set while a mission drives the train */
    this.controls = null;
  }

  /**
   * Gives the controls of the train to a mission (only while running).
   * @returns {Controls | null}
   */
  takeControl() {
    if (this.state !== 'running') return null;
    this.controls = { target: this.speed };
    return this.controls;
  }

  /** Takes the controls back and plans the rest of the trip. */
  releaseControl() {
    if (!this.controls) return;
    this.controls = null;
    this.replan(CRUISE_SPEED, false);
  }

  /**
   * The missions of this trip are done: the train hurries to the next
   * station (faster, and without the slow stretches kept for the missions —
   * it still slows down on the viaducts), so the child does not wait.
   */
  hurry() {
    if (this.state !== 'running' || this.controls) return;
    this.replan(CRUISE_SPEED * HURRY, true);
  }

  /**
   * Plans the rest of the trip from the current position and speed.
   * @private
   * @param {number} cruise
   * @param {boolean} skipMissionStretches
   */
  replan(cruise, skipMissionStretches) {
    const seg = this.segment;
    const offset = this.distance - seg.start;
    const remaining = seg.length - offset;
    const limits = seg.limits
      .filter(l => !(skipMissionStretches && l.kind === 'mission'))
      .map(l => ({ from: l.from - offset, to: l.to - offset, speed: l.speed, kind: l.kind }));
    this.leg = { plan: new MotionPlan(remaining, cruise, ACCELERATION * (cruise / CRUISE_SPEED), limits, this.speed), start: this.distance, elapsed: 0 };
  }

  /** @returns {import('./route.js').Station} */
  get station() {
    return this.route.stations[this.stationIndex];
  }

  /** The segment being travelled, or the next one when stopped. */
  get segment() {
    const i = Math.min(this.stationIndex, this.route.segments.length - 1);
    return this.route.segments[i];
  }

  /** The segment that leads to the current station (for the weather at stops). */
  get lastSegment() {
    return this.route.segments[Math.max(0, this.stationIndex - 1)];
  }

  /** The next station to be reached. */
  get nextStation() {
    const i = this.state === 'running' ? this.stationIndex + 1 : this.stationIndex;
    return this.route.stations[Math.min(i, this.route.stations.length - 1)];
  }

  /** Fraction of the current segment travelled (0 while stopped at its start). */
  get segmentProgress() {
    if (this.state !== 'running') return 0;
    return progress(0, this.segment.length, this.distance - this.segment.start);
  }

  /** Current weather. */
  get weather() {
    if (this.state === 'running') return this.route.weather(this.segment, this.segmentProgress);
    if (this.stationIndex === 0) return this.route.weather(this.segment, 0);
    return this.route.weather(this.lastSegment, 1);
  }

  /** Id of the train in use. */
  get trainId() {
    return this.state === 'running' || this.stationIndex === 0 ? this.segment.train : this.lastSegment.train;
  }

  /**
   * Places the train at a station (stopped). Used at the start and for
   * jumping to a station while testing.
   * @param {number} index
   */
  placeAt(index) {
    this.stationIndex = index;
    this.state = 'stopped';
    this.elapsed = 0;
    this.speed = 0;
    this.controls = null;
    this.leg = null;
    const st = this.station;
    this.distance = st.distance;
    this.clock = Number.isNaN(st.arrive) ? st.depart : st.arrive;
  }

  /** Leaves the current station. */
  depart() {
    if (this.state !== 'stopped' || this.stationIndex >= this.route.segments.length) return;
    const st = this.station;
    this.state = 'running';
    this.elapsed = 0;
    this.leg = { plan: this.segment.profile, start: this.segment.start, elapsed: 0 };
    this.emit('depart', st, this.segment);
  }

  /** @param {number} dt seconds */
  update(dt) {
    if (this.state === 'running') this.updateRunning(dt);
    else if (this.state === 'stopped') this.updateStopped(dt);
  }

  /** @private @param {number} dt */
  updateRunning(dt) {
    const seg = this.segment;
    this.elapsed += dt;
    const leg = /** @type {{plan: MotionPlan, start: number, elapsed: number}} */ (this.leg);
    let arrived = false;
    if (this.controls) {
      const c = MANUAL;
      const target = clamp(this.controls.target, c.minSpeed, c.maxSpeed);
      const rate = target > this.speed ? c.accelerate : c.brake;
      const delta = clamp(target - this.speed, -rate * dt, rate * dt);
      this.speed += delta;
      this.distance += this.speed * dt;
      // safety: never let a mission drive the train into the station
      const brake = (this.speed * this.speed) / (2 * ACCELERATION);
      if (seg.start + seg.length - this.distance < brake + 400) this.releaseControl();
    } else {
      leg.elapsed += dt;
      const m = leg.plan.at(leg.elapsed);
      this.distance = leg.start + m.position;
      this.speed = m.speed;
      arrived = leg.elapsed >= leg.plan.duration;
    }
    this.clock = lerp(seg.from.depart, seg.to.arrive, progress(seg.start, seg.start + seg.length, this.distance));
    if (arrived) {
      this.stationIndex += 1;
      this.state = this.stationIndex === this.route.stations.length - 1 ? 'finished' : 'stopped';
      this.elapsed = 0;
      this.speed = 0;
      this.clock = seg.to.arrive;
      this.emit('arrive', seg.to);
      if (this.state === 'finished') this.emit('finish', seg.to);
    }
  }

  /** @private @param {number} dt */
  updateStopped(dt) {
    this.elapsed += dt;
    const st = this.station;
    if (!Number.isNaN(st.arrive)) {
      this.clock = lerp(st.arrive, st.depart, progress(0, DWELL_SECONDS, this.elapsed));
    }
  }
}
