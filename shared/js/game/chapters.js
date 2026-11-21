/**
 * @file Chapters: the journey divided into parts that can be played in
 * separate sessions.
 *
 * A chapter runs from the departure from its first station to the moment
 * the train is ready to leave its last station. It owns the travel missions
 * of its segments and the missions of the stations it arrives at (the very
 * first chapter also owns the mission of the first station).
 */

/**
 * @typedef {object} ChapterData
 * @property {string} id
 * @property {string} title
 * @property {string} from      station id where the chapter starts
 * @property {string} to        station id where it ends
 * @property {string} teaser    one sentence about what awaits
 *
 * @typedef {ChapterData & {number: number, fromIndex: number, toIndex: number, missions: string[]}} Chapter
 */

export class ChapterBook {
  /**
   * @param {import('../journey/route.js').Route} route
   * @param {ChapterData[]} data
   * @param {import('../missions/director.js').MissionPlan} plan
   */
  constructor(route, data, plan) {
    const indexOf = (/** @type {string} */ id) => {
      const i = route.stations.findIndex(s => s.id === id);
      if (i < 0) throw new Error(`Unknown station "${id}" in the chapters`);
      return i;
    };
    /** @type {Chapter[]} */
    this.chapters = data.map((c, n) => {
      const fromIndex = indexOf(c.from);
      const toIndex = indexOf(c.to);
      const missions = [];
      for (const t of plan.travel) {
        if (t.segment >= fromIndex && t.segment < toIndex) missions.push(t.config.id);
      }
      for (const [id, entry] of Object.entries(plan.stations)) {
        const i = indexOf(id);
        if ((i > fromIndex && i <= toIndex) || (i === 0 && fromIndex === 0)) missions.push(entry.config.id);
      }
      return { ...c, number: n + 1, fromIndex, toIndex, missions };
    });
    for (let i = 1; i < this.chapters.length; i++) {
      if (this.chapters[i].fromIndex !== this.chapters[i - 1].toIndex) {
        throw new Error('Every chapter must start where the previous one ended');
      }
    }
  }

  /**
   * The chapter the train is in when it waits at (or travels from) a station.
   * @param {number} stationIndex
   * @returns {Chapter}
   */
  atStation(stationIndex) {
    return this.chapters.find(c => stationIndex >= c.fromIndex && stationIndex < c.toIndex)
      ?? this.chapters[this.chapters.length - 1];
  }

  /**
   * The chapter that ends at a station, if any.
   * @param {number} stationIndex
   * @returns {Chapter | undefined}
   */
  endingAt(stationIndex) {
    return this.chapters.find(c => c.toIndex === stationIndex);
  }

  /**
   * @param {Chapter} chapter
   * @returns {Chapter | undefined}
   */
  next(chapter) {
    return this.chapters[chapter.number];
  }

  /**
   * Stars earned in a chapter, and the maximum.
   * @param {Chapter} chapter
   * @param {import('./state.js').GameState} state
   * @returns {{stars: number, max: number}}
   */
  stars(chapter, state) {
    let stars = 0;
    for (const id of chapter.missions) stars += state.stars.get(id) || 0;
    return { stars, max: chapter.missions.length * 3 };
  }
}
