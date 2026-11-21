/**
 * @file What the player sees of the missions outside the canvas: the
 * briefing (what to do, shown with the game paused), the short announcement
 * card, the progress counter, the result with stars, and the total of stars
 * in the heads-up display.
 *
 * The briefing exists because children read at very different speeds: the
 * game waits until the child presses "Am înțeles!", and the "?" button shows
 * the same instructions again (pausing again) while the mission lasts.
 */

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function byId(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

/** Seconds an announcement stays on screen by default. */
const ANNOUNCE_SECONDS = 6;
/** Seconds before a briefing opens (a new scene can fade in first). */
const BRIEFING_DELAY = 0.6;
/** Seconds the result stays on screen. */
const RESULT_SECONDS = 3.6;

export class MissionHud {
  /** @param {import('../game/state.js').GameState} state */
  constructor(state) {
    this.el = {
      card: byId('missionCard'),
      kicker: byId('missionKicker'),
      title: byId('missionTitle'),
      text: byId('missionText'),
      counter: byId('missionCounter'),
      result: byId('missionResult'),
      resultStars: byId('missionResultStars'),
      resultText: byId('missionResultText'),
      stars: byId('hudStars'),
      briefing: byId('briefing'),
      briefingKicker: byId('briefingKicker'),
      briefingTitle: byId('briefingTitle'),
      briefingText: byId('briefingText'),
      briefingOk: byId('btnBriefingOk'),
      help: byId('btnHelp'),
    };
    this.cardTimer = 0;
    this.resultTimer = 0;
    this.briefingTimer = 0;
    /** True while the briefing is open: the game does not advance. */
    this.paused = false;
    /** @type {{title: string, text: string, kicker: string} | null} instructions of the current mission */
    this.brief = null;
    this.el.briefingOk.addEventListener('click', () => this.closeBriefing());
    this.el.help.addEventListener('click', () => this.openBriefing());
    state.on('change', (/** @type {string} */ what) => {
      if (what === 'stars') this.el.stars.textContent = String(state.totalStars);
    });
  }

  /**
   * Shows the announcement card.
   * @param {string} title
   * @param {string} text
   * @param {string} [kicker='Misiune']
   * @param {number} [seconds]  0 = stays until replaced or hidden
   */
  announce(title, text, kicker = 'Misiune', seconds = ANNOUNCE_SECONDS) {
    const { card } = this.el;
    this.el.kicker.textContent = kicker;
    this.el.title.textContent = title;
    this.el.text.textContent = text;
    clearTimeout(this.cardTimer);
    show(card);
    if (seconds > 0) this.cardTimer = window.setTimeout(() => this.hideAnnouncement(), seconds * 1000);
  }

  /**
   * Gives the child the instructions of a mission (or of a new step of it):
   * the game pauses until they are read and closed, and the "?" button can
   * show them again.
   * @param {string} title
   * @param {string} text
   * @param {string} [kicker='Misiune']
   */
  instruct(title, text, kicker = 'Misiune') {
    this.hideAnnouncement();
    this.brief = { title, text, kicker };
    clearTimeout(this.briefingTimer);
    this.briefingTimer = window.setTimeout(() => this.openBriefing(), BRIEFING_DELAY * 1000);
    show(this.el.help);
  }

  /** Opens the briefing with the current instructions and pauses the game. */
  openBriefing() {
    if (!this.brief) return;
    const { briefing, briefingKicker, briefingTitle, briefingText, briefingOk } = this.el;
    briefingKicker.textContent = this.brief.kicker;
    briefingTitle.textContent = this.brief.title;
    briefingText.textContent = this.brief.text;
    this.paused = true;
    show(briefing);
    briefingOk.focus({ preventScroll: true });
  }

  /** Closes the briefing; the game goes on. */
  closeBriefing() {
    if (!this.paused) return;
    this.paused = false;
    hide(this.el.briefing);
  }

  /** The mission is over: no more instructions to show. */
  clearInstructions() {
    clearTimeout(this.briefingTimer);
    this.brief = null;
    this.closeBriefing();
    hide(this.el.help);
  }

  /**
   * Bottom edge of the heads-up display (clock, route, stars) in CSS pixels,
   * so that things to touch are never placed under it.
   * @returns {number}
   */
  get hudBottom() {
    let bottom = 0;
    for (const node of document.querySelectorAll('.hud > *')) {
      const r = node.getBoundingClientRect();
      if (r.width && r.top < window.innerHeight / 2) bottom = Math.max(bottom, r.bottom);
    }
    return bottom;
  }

  /**
   * Bottom edge of the announcement card in CSS pixels (0 when hidden), so
   * that a mission can keep important things below it.
   * @returns {number}
   */
  get cardBottom() {
    const { card } = this.el;
    return card.hidden ? 0 : card.getBoundingClientRect().bottom;
  }

  hideAnnouncement() {
    clearTimeout(this.cardTimer);
    hide(this.el.card);
  }

  /**
   * Shows (or updates) the progress counter, e.g. "🎄 3 / 10".
   * @param {string} icon
   * @param {number} value
   * @param {number} total
   * @param {string} [extra]  more information after the count (e.g. gifts left)
   */
  setCounter(icon, value, total, extra = '') {
    const { counter } = this.el;
    counter.textContent = `${icon} ${value}${total ? ` / ${total}` : ''}${extra ? ` · ${extra}` : ''}`;
    counter.classList.remove('is-bumped');
    void counter.offsetWidth;   // restart the bump animation
    counter.classList.add('is-bumped');
    show(counter);
  }

  hideCounter() {
    hide(this.el.counter);
  }

  /**
   * Shows the result of a mission.
   * @param {number} stars  1..3
   * @param {string} text
   */
  showResult(stars, text) {
    this.hideAnnouncement();
    const { result, resultStars, resultText } = this.el;
    resultStars.replaceChildren(...[1, 2, 3].map(i => {
      const s = document.createElement('span');
      s.className = i <= stars ? 'star is-won' : 'star';
      s.textContent = '★';
      s.style.animationDelay = `${0.15 * i}s`;
      return s;
    }));
    resultText.textContent = text;
    clearTimeout(this.resultTimer);
    show(result);
    this.resultTimer = window.setTimeout(() => hide(result), RESULT_SECONDS * 1000);
  }
}

/** @param {HTMLElement} node */
function show(node) {
  node.hidden = false;
  requestAnimationFrame(() => node.classList.add('is-visible'));
}

/** @param {HTMLElement} node */
function hide(node) {
  node.classList.remove('is-visible');
  setTimeout(() => {
    if (!node.classList.contains('is-visible')) node.hidden = true;
  }, 350);
}
