/**
 * @file The route: stations, timetable and what lies between the stations.
 *
 * A route is described declaratively (see winter/js/route-data.js): a list
 * of stations with their timetable and, for every pair of consecutive
 * stations, a segment with its play duration, landscapes, structures and
 * weather. This module validates that description and turns it into
 * world geometry: every station gets a distance along the line, and every
 * feature gets its world position.
 *
 * Adding a station to the game means adding one entry to the data file.
 */

import { piecewise } from '../core/math.js';
import { hashString } from '../core/random.js';
import { parseTime } from '../world/clock.js';
import { MotionPlan, tripLength } from './motion.js';

/**
 * @typedef {object} StationData
 * @property {string} id
 * @property {string} name          as written on the station building
 * @property {string} [short]       shorter name for the progress bar
 * @property {string} [arrive]      "DD HH:MM" (missing for the first station)
 * @property {string} [depart]      "DD HH:MM" (missing for the last station)
 * @property {'large' | 'small'} size
 *
 * @typedef {object} FeatureData
 * @property {'viaduct' | 'bridge' | 'tunnel'} type
 * @property {number} at       start, as a fraction of the segment (0..1)
 * @property {number} length   in world units
 * @property {number} [depth]  valley depth for viaducts and bridges
 *
 * @typedef {object} SegmentData
 * @property {number} duration                       play seconds from station to station, not counting
 *                                                   the slow crossing of viaducts
 * @property {Array<[number, string]>} biomes        [fraction, biome id], sorted
 * @property {FeatureData[]} [features]
 * @property {Array<[number, number]>} [snowfall]    [fraction, intensity 0..1]
 * @property {Array<[number, number]>} [cover]       [fraction, snow on the ground 0..1]
 * @property {Array<[number, number, number]>} [slow] [from, to, speed]: stretches with a lower speed
 * @property {string} [train]                        train id (default: "night")
 *
 * @typedef {object} RouteData
 * @property {number} firstDay       day of month of the first day
 * @property {StationData[]} stations
 * @property {SegmentData[]} segments  one fewer than stations
 */

/**
 * @typedef {object} Station
 * @property {number} index
 * @property {string} id
 * @property {string} name
 * @property {string} short
 * @property {'large' | 'small'} size
 * @property {number} arrive      minutes (NaN for the first station)
 * @property {number} depart      minutes (NaN for the last station)
 * @property {number} distance    world position of the train front when stopped here
 */

/**
 * @typedef {object} Segment
 * @property {number} index
 * @property {Station} from
 * @property {Station} to
 * @property {MotionPlan} profile
 * @property {number} start   world position of the start
 * @property {number} length
 * @property {Array<[number, string]>} biomes
 * @property {Array<[number, number]>} snowfall
 * @property {Array<[number, number]>} cover
 * @property {string} train
 */

/** Motion parameters shared by every segment. */
export const CRUISE_SPEED = 560;
export const ACCELERATION = 140;

/** Stations keep this free distance on both sides (no viaducts in stations). */
const STATION_CLEARANCE = 1200;

/** Speed over viaducts: slow enough to admire the valley. */
export const VIADUCT_SPEED = 210;
/** The slow zone of a viaduct starts this far before it… */
const SLOW_BEFORE = 200;
/** …and lasts until the whole train (at most this long) has crossed it. */
const SLOW_AFTER = 1450;

export class Route {
  /** @param {RouteData} data */
  constructor(data) {
    if (data.segments.length !== data.stations.length - 1) {
      throw new Error('A route needs exactly one segment between every two stations');
    }
    this.firstDay = data.firstDay;

    /** @type {Station[]} */
    this.stations = data.stations.map((s, index) => ({
      index,
      id: s.id,
      name: s.name,
      short: s.short || s.name,
      size: s.size,
      arrive: s.arrive ? parseTime(s.arrive, data.firstDay) : NaN,
      depart: s.depart ? parseTime(s.depart, data.firstDay) : NaN,
      distance: 0,
    }));

    /** @type {Segment[]} */
    this.segments = [];
    /** @type {import('../world/features.js').Feature[]} */
    this.features = [];

    let distance = 0;
    data.segments.forEach((seg, index) => {
      const from = this.stations[index];
      const to = this.stations[index + 1];
      const length = tripLength(seg.duration, CRUISE_SPEED, ACCELERATION);
      const limits = (seg.features || [])
        .filter(f => f.type === 'viaduct')
        .map(f => ({ from: f.at * length - SLOW_BEFORE, to: f.at * length + f.length + SLOW_AFTER, speed: VIADUCT_SPEED }))
        .concat((seg.slow || []).map(([from, to, speed]) => ({ from: from * length, to: to * length, speed })));
      const profile = new MotionPlan(length, CRUISE_SPEED, ACCELERATION, limits);
      from.distance = distance;
      this.segments.push({
        index,
        from,
        to,
        profile,
        start: distance,
        length: profile.length,
        biomes: seg.biomes,
        snowfall: seg.snowfall || [[0, 0]],
        cover: seg.cover || [[0, 1]],
        train: seg.train || 'night',
      });
      for (const f of seg.features || []) {
        const x0 = distance + f.at * profile.length;
        const x1 = x0 + f.length;
        if (x0 < distance + STATION_CLEARANCE || x1 > distance + profile.length - STATION_CLEARANCE) {
          throw new Error(`The ${f.type} at ${f.at} between ${from.id} and ${to.id} is too close to a station`);
        }
        this.features.push({ type: f.type, x0, x1, depth: f.depth ?? 0, seed: hashString(`${from.id}|${f.at}`) });
      }
      distance += profile.length;
    });
    this.stations[this.stations.length - 1].distance = distance;
    this.length = distance;

    for (const s of this.stations) {
      this.features.push({ type: 'station', x: s.distance, name: s.name, size: s.size, seed: hashString(s.id) });
    }
  }

  /**
   * Segment containing a world position (clamped to the route).
   * @param {number} distance
   * @returns {Segment}
   */
  segmentAt(distance) {
    for (const s of this.segments) {
      if (distance < s.start + s.length) return s;
    }
    return this.segments[this.segments.length - 1];
  }

  /**
   * Biome at a world position. Before the start and after the end, the first
   * and last biomes continue.
   * @param {number} distance
   * @returns {string}
   */
  biomeAt(distance) {
    const seg = this.segmentAt(Math.max(0, distance));
    const u = (distance - seg.start) / seg.length;
    let id = seg.biomes[0][1];
    for (const [at, biome] of seg.biomes) if (u >= at) id = biome;
    return id;
  }

  /**
   * Weather on a segment at a fraction of it.
   * @param {Segment} seg
   * @param {number} u  0..1
   * @returns {{snowfall: number, cover: number}}
   */
  weather(seg, u) {
    return { snowfall: piecewise(seg.snowfall, u), cover: piecewise(seg.cover, u) };
  }
}
