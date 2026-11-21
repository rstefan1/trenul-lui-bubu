/**
 * @file What the player sees of the missions outside the canvas: the
 * announcement card (title + what to do), the progress counter, the result
 * with stars, and the total of stars in the heads-up display.
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
    };
    this.cardTimer = 0;
    this.resultTimer = 0;
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
    counter.textContent = `${icon} ${value} / ${total}${extra ? ` · ${extra}` : ''}`;
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
