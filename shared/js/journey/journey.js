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
 * departure time to the arrival time; while stopped it moves towards the
 * departure time in {@link DWELL_SECONDS} and then waits there.
 */

import { Emitter } from '../core/emitter.js';
import { lerp, progress } from '../core/math.js';

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
    const m = seg.profile.at(this.elapsed);
    this.distance = seg.start + m.position;
    this.speed = m.speed;
    this.clock = lerp(seg.from.depart, seg.to.arrive, progress(0, seg.profile.duration, this.elapsed));
    if (this.elapsed >= seg.profile.duration) {
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
