/**
 * @file The campaign: chapters, saved progress and the flow between the
 * menu and the journey.
 *
 *   menu ──► continue the journey ──► … stations … ──► end of a chapter
 *    ▲                                                     │
 *    └──────────── pause / replay finished ◄───────────────┘
 *
 * The main journey is saved after every station (when the train is ready to
 * leave it), so the child can stop at any time and continue another day.
 * Chapters unlock one after another. A finished chapter can be replayed:
 * the replay starts from a copy of the state the player had at the start of
 * that chapter, does not touch the saved journey, and only keeps the better
 * stars. After the whole journey is finished once, every chapter is open.
 * The teacher can open every chapter with a URL parameter, to check them.
 */

/**
 * @typedef {object} CampaignParts
 * @property {import('../journey/journey.js').Journey} journey
 * @property {import('../missions/director.js').MissionDirector} director
 * @property {import('../world/world-view.js').WorldView} world
 * @property {import('./state.js').GameState} state
 * @property {import('../ui/hud.js').Hud} hud
 * @property {import('../ui/mission-hud.js').MissionHud} missionHud
 * @property {import('./save.js').SaveStore} store
 * @property {import('./chapters.js').ChapterBook} book
 * @property {import('../ui/chapter-screens.js').ChapterScreens} screens
 * @property {boolean} teacher   every chapter is open
 */

/** Seconds between the start of a chapter and the departure. */
const CHAPTER_START_DELAY = 2.5;

export class Campaign {
  /** @param {CampaignParts} parts */
  constructor(parts) {
    /** @type {import('../journey/journey.js').Journey} */ this.journey = parts.journey;
    /** @type {import('../missions/director.js').MissionDirector} */ this.director = parts.director;
    /** @type {import('../world/world-view.js').WorldView} */ this.world = parts.world;
    /** @type {import('./state.js').GameState} */ this.state = parts.state;
    /** @type {import('../ui/hud.js').Hud} */ this.hud = parts.hud;
    /** @type {import('../ui/mission-hud.js').MissionHud} */ this.missionHud = parts.missionHud;
    /** @type {import('./save.js').SaveStore} */ this.store = parts.store;
    /** @type {import('./chapters.js').ChapterBook} */ this.book = parts.book;
    /** @type {import('../ui/chapter-screens.js').ChapterScreens} */ this.screens = parts.screens;
    this.teacher = parts.teacher;
    this.save = this.store.load();
    /** @type {'menu' | 'main' | 'replay'} */
    this.mode = 'menu';
    /** @type {import('./chapters.js').Chapter | null} the chapter being replayed */
    this.replaying = null;

    this.director.holdAt = station => this.mode !== 'menu' && !!this.book.endingAt(station.index);
    this.director.on('ready', (/** @type {import('../journey/route.js').Station} */ s) => this.onReady(s));
    this.director.on('complete', () => this.onFinish());
  }

  /** Shows the introduction the first time, then the menu. */
  async open() {
    this.placeTrain(this.save.stationIndex ?? 0, this.save.state);
    if (!this.save.introSeen) {
      await this.screens.intro();
      this.save.introSeen = true;
      this.store.save(this.save);
    }
    await this.menu();
  }

  // ------------------------------------------------------------ menu

  /** @private */
  async menu() {
    this.mode = 'menu';
    this.state.load(this.save.state);
    const frontier = this.frontier();
    const cards = this.book.chapters.map(chapter => {
      const done = this.isDone(chapter);
      const current = !this.save.finished && chapter === frontier;
      const status = /** @type {'locked' | 'open' | 'current' | 'done'} */ (
        current ? 'current' : done ? 'done' : (this.teacher ? 'open' : 'locked'));
      const { stars, max } = this.book.stars(chapter, this.state);
      const route = this.journey.route;
      return { chapter, status, stars, max, route: `${route.stations[chapter.fromIndex].short} → ${route.stations[chapter.toIndex].short}` };
    });
    const started = this.save.stationIndex !== null;
    const choice = await this.screens.menu({
      cards,
      primaryLabel: this.save.finished ? 'Călătorește din nou' : started ? 'Continuă călătoria' : 'Începe călătoria',
      traveler: this.state.travelerName ? `Bine ai revenit, ${this.state.travelerName}!` : '',
      canReset: started,
    });
    if (choice.kind === 'intro') {
      await this.screens.intro();
      await this.menu();
    } else if (choice.kind === 'reset') {
      this.store.clear();
      this.save = { ...this.store.load(), introSeen: true };
      this.store.save(this.save);
      await this.menu();
    } else if (choice.kind === 'chapter') {
      this.replay(choice.chapter);
    } else if (this.save.finished) {
      this.replay(this.book.chapters[0]);
    } else {
      this.continueJourney();
    }
  }

  /**
   * The chapter the saved journey is in.
   * @private
   */
  frontier() {
    return this.save.stationIndex === null ? this.book.chapters[0] : this.book.atStation(this.save.stationIndex);
  }

  /**
   * @private
   * @param {import('./chapters.js').Chapter} chapter
   */
  isDone(chapter) {
    return this.save.finished || (this.save.stationIndex !== null && this.save.stationIndex >= chapter.toIndex);
  }

  // ------------------------------------------------------------ playing

  /** @private Continues the saved journey (or starts it). */
  continueJourney() {
    this.mode = 'main';
    this.replaying = null;
    this.director.reset();
    const index = this.save.stationIndex;
    if (index === null) {
      // a brand new journey: the first station's mission starts at once
      this.state.load(null);
      this.save.chapterStart[this.book.chapters[0].id] = this.state.toJSON();
      this.placeTrain(0, null);
      this.announceChapter(this.book.chapters[0]);
      this.director.atStation(this.journey.station);
      return;
    }
    this.placeTrain(index, this.save.state);
    const chapter = this.book.atStation(index);
    if (index === chapter.fromIndex) {
      this.save.chapterStart[chapter.id] ??= this.state.toJSON();
      this.store.save(this.save);
      this.announceChapter(chapter);
    } else {
      this.hud.showStation(this.journey.station.name, 2.5);
    }
    this.director.atStation(this.journey.station, { skipMission: true, wait: CHAPTER_START_DELAY });
  }

  /**
   * Plays a chapter again, from the state at its start.
   * @private
   * @param {import('./chapters.js').Chapter} chapter
   */
  replay(chapter) {
    this.mode = 'replay';
    this.replaying = chapter;
    this.director.reset();
    const snapshot = this.save.chapterStart[chapter.id] ?? null;
    this.placeTrain(chapter.fromIndex, snapshot);
    this.announceChapter(chapter);
    if (chapter.fromIndex === 0) this.director.atStation(this.journey.station);
    else this.director.atStation(this.journey.station, { skipMission: true, wait: CHAPTER_START_DELAY });
  }

  /**
   * Puts the train at a station with a given state, without transitions.
   * @private
   * @param {number} index
   * @param {import('./state.js').GameStateData | null} data
   */
  placeTrain(index, data) {
    this.journey.placeAt(index);
    this.state.load(data);
    this.world.train.setBubuVisible(true, true);
    this.world.snap();
  }

  /**
   * @private
   * @param {import('./chapters.js').Chapter} chapter
   */
  announceChapter(chapter) {
    this.missionHud.announce(chapter.title, chapter.teaser, `Capitolul ${chapter.number}`, 4);
  }

  // ------------------------------------------------------------ events

  /**
   * The train is ready to leave a station: save, and stop at the end of a chapter.
   * @private
   * @param {import('../journey/route.js').Station} station
   */
  async onReady(station) {
    if (this.mode === 'main') {
      this.save.stationIndex = station.index;
      this.save.state = this.state.toJSON();
      const ending = this.book.endingAt(station.index);
      const next = ending && this.book.next(ending);
      if (next) this.save.chapterStart[next.id] ??= this.state.toJSON();
      this.store.save(this.save);
    }
    const chapter = this.book.endingAt(station.index);
    if (!chapter || this.mode === 'menu') return;

    if (this.mode === 'replay') this.keepBestStars();
    const { stars, max } = this.book.stars(chapter, this.state);
    const choice = await this.screens.chapterEnd({
      chapter, stars, max, next: this.book.next(chapter), canContinue: this.mode === 'main',
    });
    if (choice === 'next') {
      const next = this.book.next(chapter);
      if (next) this.announceChapter(next);
      this.director.release();
    } else {
      await this.menu();
    }
  }

  /** @private The whole journey is over. */
  async onFinish() {
    if (this.mode === 'main') {
      this.save.finished = true;
      this.save.stationIndex = this.journey.station.index;
      this.save.state = this.state.toJSON();
      this.store.save(this.save);
    } else if (this.mode === 'replay') {
      this.keepBestStars();
    }
    await new Promise(r => setTimeout(r, 800));
    let stars = 0;
    let max = 0;
    for (const chapter of this.book.chapters) {
      const s = this.book.stars(chapter, this.state);
      stars += s.stars;
      max += s.max;
    }
    await this.screens.finale(stars, max);
    await this.menu();
  }

  /** @private Copies better stars from a replay into the saved journey. */
  keepBestStars() {
    const saved = new Map(this.save.state?.stars ?? []);
    for (const [id, n] of this.state.stars) saved.set(id, Math.max(n, saved.get(id) || 0));
    if (this.save.state) {
      this.save.state.stars = [...saved];
      this.store.save(this.save);
    }
  }
}
