/**
 * @file Motion between two stations.
 *
 * The train accelerates, cruises and brakes to stop exactly at the next
 * station. On some stretches it must go slower (over the big viaducts, so
 * that the children can admire the valleys): there it brakes in time,
 * crosses slowly and accelerates again.
 *
 * The motion is planned once per segment, with the classic two-pass method
 * used for train and robot speed profiles:
 *
 *   1. along a fine grid of positions, the speed is capped by the cruising
 *      speed and by every speed limit;
 *   2. a forward pass caps the speed by what can be reached accelerating
 *      from the previous point (v² ≤ v₀² + 2·a·Δx);
 *   3. a backward pass caps it by what still allows braking in time for the
 *      next point (and for the stop at the end).
 *
 * Integrating Δx / v gives the time at every grid point; sampling the plan
 * at a time is then a binary search plus linear interpolation.
 */

/** Grid step, in world units. */
const STEP = 8;
/** Speed used instead of 0 when integrating time (avoids division by zero at the ends). */
const CREEP = 12;

/**
 * @typedef {object} SpeedLimit
 * @property {number} from   start, distance from the beginning of the trip
 * @property {number} to     end
 * @property {number} speed  maximum speed on [from, to]
 */

/**
 * @typedef {object} MotionSample
 * @property {number} position  distance from the start of the trip
 * @property {number} speed     current speed
 */

/**
 * Length of a trip that lasts `duration` seconds with a simple trapezoid
 * profile (accelerate, cruise, brake) and no speed limits.
 * @param {number} duration
 * @param {number} cruise
 * @param {number} accel
 * @returns {number}
 */
export function tripLength(duration, cruise, accel) {
  const ramp = cruise / accel;
  if (duration < 2 * ramp) throw new Error(`A trip of ${duration}s is too short to reach cruising speed`);
  return cruise * (duration - ramp);
}

export class MotionPlan {
  /**
   * @param {number} length    distance between the stations
   * @param {number} cruise    cruising speed
   * @param {number} accel     acceleration, also used for braking
   * @param {SpeedLimit[]} [limits]
   */
  constructor(length, cruise, accel, limits = []) {
    this.length = length;
    const n = Math.max(2, Math.ceil(length / STEP) + 1);
    const dx = length / (n - 1);
    const v = new Float64Array(n);

    // 1. caps
    for (let i = 0; i < n; i++) {
      const x = i * dx;
      let cap = cruise;
      for (const l of limits) if (x >= l.from && x <= l.to) cap = Math.min(cap, l.speed);
      v[i] = cap;
    }
    // 2. forward (acceleration) and 3. backward (braking) passes
    v[0] = 0;
    for (let i = 1; i < n; i++) v[i] = Math.min(v[i], Math.sqrt(v[i - 1] ** 2 + 2 * accel * dx));
    v[n - 1] = 0;
    for (let i = n - 2; i >= 0; i--) v[i] = Math.min(v[i], Math.sqrt(v[i + 1] ** 2 + 2 * accel * dx));

    // time at every grid point (trapezoidal rule on 1/v)
    const t = new Float64Array(n);
    for (let i = 1; i < n; i++) {
      t[i] = t[i - 1] + (2 * dx) / (Math.max(CREEP, v[i - 1]) + Math.max(CREEP, v[i]));
    }
    this.dx = dx;
    this.speeds = v;
    this.times = t;
    /** Seconds from departure to arrival. */
    this.duration = t[n - 1];
  }

  /**
   * Position and speed at time t (clamped to the trip).
   * @param {number} time  seconds since departure
   * @returns {MotionSample}
   */
  at(time) {
    const { times, speeds, dx } = this;
    const last = times.length - 1;
    if (time <= 0) return { position: 0, speed: 0 };
    if (time >= this.duration) return { position: this.length, speed: 0 };
    let lo = 0;
    let hi = last;
    while (hi - lo > 1) {
      const mid = (lo + hi) >> 1;
      if (times[mid] <= time) lo = mid;
      else hi = mid;
    }
    const k = (time - times[lo]) / (times[hi] - times[lo]);
    return {
      position: (lo + k) * dx,
      speed: speeds[lo] + (speeds[hi] - speeds[lo]) * k,
    };
  }
}
