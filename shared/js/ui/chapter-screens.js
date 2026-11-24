/**
 * @file The screens around the chapters: the main menu with the chapter
 * cards, and the screen shown when a chapter is finished.
 *
 * The screens only show information and report the player's choice; the
 * campaign (game/campaign.js) decides what happens next.
 */

import { chapterSound, finaleSound } from '../audio/effects.js';
import { el } from './dom.js';
import { showOverlay } from './screens.js';

/**
 * @typedef {object} ChapterCard
 * @property {import('../game/chapters.js').Chapter} chapter
 * @property {'locked' | 'open' | 'current' | 'done'} status
 * @property {number} stars
 * @property {number} max
 * @property {string} route   e.g. "Timișoara → Deva"
 *
 * @typedef {object} MenuModel
 * @property {ChapterCard[]} cards
 * @property {string} primaryLabel   "Începe călătoria" / "Continuă călătoria"
 * @property {string} traveler       "" or a greeting with the traveller's name
 * @property {boolean} canReset
 *
 * @typedef {{kind: 'continue'} | {kind: 'chapter', chapter: import('../game/chapters.js').Chapter}
 *   | {kind: 'reset'}} MenuChoice
 */

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function byId(id) {
  const node = document.getElementById(id);
  if (!node) throw new Error(`Missing element #${id}`);
  return node;
}

export class ChapterScreens {
  /** @param {import('../audio/audio.js').AudioEngine} [audio]  for the fanfares */
  constructor(audio) {
    this.audio = audio;
  }

  /**
   * Shows the main menu and resolves with the player's choice.
   * @param {MenuModel} model
   * @returns {Promise<MenuChoice>}
   */
  menu(model) {
    const overlay = byId('menu');
    const list = byId('chapterList');
    const primary = byId('btnContinue');
    const traveler = byId('menuTraveler');
    const reset = byId('btnReset');
    primary.textContent = `🚂 ${model.primaryLabel}`;
    traveler.textContent = model.traveler;
    traveler.hidden = !model.traveler;
    reset.hidden = !model.canReset;

    return new Promise(resolve => {
      /** @param {MenuChoice} choice */
      const choose = choice => {
        overlay.classList.remove('is-visible');
        setTimeout(() => { overlay.hidden = true; }, 350);
        primary.onclick = null;
        reset.onclick = null;
        resolve(choice);
      };
      list.replaceChildren(...model.cards.map(card => this.card(card, choose)));
      primary.onclick = () => choose({ kind: 'continue' });
      reset.onclick = () => {
        // the browser's own confirmation dialog: simple, and understood by every child
        if (window.confirm('Sigur vrei să începi de la capăt? Se vor șterge stelele și tot drumul făcut.')) {
          choose({ kind: 'reset' });
        }
      };
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add('is-visible'));
    });
  }

  /**
   * One chapter card.
   * @private
   * @param {ChapterCard} card
   * @param {(choice: MenuChoice) => void} choose
   */
  card(card, choose) {
    const { chapter, status } = card;
    const locked = status === 'locked';
    const badge = {
      locked: '🔒 Încă nu ai ajuns aici',
      open: 'Poți juca din nou',
      current: '🚂 Ești aici',
      done: '✔ Terminat',
    }[status];
    const button = el('button', {
      class: `chapter-card is-${status}`, type: 'button', disabled: locked,
      'aria-label': locked ? `Capitolul ${chapter.number}, încuiat` : `Capitolul ${chapter.number}: ${chapter.title}`,
    }, [
      el('span', { class: 'chapter-card__number' }, [String(chapter.number)]),
      el('span', { class: 'chapter-card__body' }, [
        el('span', { class: 'chapter-card__title' }, [locked ? '? ? ?' : chapter.title]),
        el('span', { class: 'chapter-card__route' }, [locked ? 'Surpriză…' : card.route]),
        el('span', { class: 'chapter-card__badge' }, [badge]),
      ]),
      el('span', { class: 'chapter-card__stars' }, [locked ? '' : `★ ${card.stars}/${card.max}`]),
    ]);
    if (!locked) {
      button.addEventListener('click', () => choose(status === 'current' ? { kind: 'continue' } : { kind: 'chapter', chapter }));
    }
    return el('li', {}, [button]);
  }

  /**
   * The end of a chapter.
   * @param {object} info
   * @param {import('../game/chapters.js').Chapter} info.chapter
   * @param {number} info.stars
   * @param {number} info.max
   * @param {import('../game/chapters.js').Chapter | undefined} info.next
   * @param {boolean} info.canContinue  false when replaying a chapter
   * @returns {Promise<'next' | 'menu'>}
   */
  chapterEnd({ chapter, stars, max, next, canContinue }) {
    byId('chapterEndKicker').textContent = `Capitolul ${chapter.number} – terminat!`;
    byId('chapterEndTitle').textContent = chapter.title;
    byId('chapterEndStars').textContent = `★ ${stars} din ${max} stele`;
    const nextText = byId('chapterEndNext');
    nextText.textContent = next && canContinue ? `Urmează capitolul ${next.number}: ${next.title}. ${next.teaser}` : '';
    nextText.hidden = !nextText.textContent;
    const go = byId('btnNextChapter');
    const pause = byId('btnPause');
    go.hidden = !canContinue || !next;
    pause.textContent = canContinue ? 'Fac o pauză' : 'Înapoi la meniu';
    return new Promise(resolve => {
      const done = (/** @type {'next' | 'menu'} */ choice) => {
        go.onclick = null;
        pause.onclick = null;
        const overlay = byId('chapterEnd');
        overlay.classList.remove('is-visible');
        setTimeout(() => { overlay.hidden = true; }, 350);
        resolve(choice);
      };
      go.onclick = () => done('next');
      pause.onclick = () => done('menu');
      const overlay = byId('chapterEnd');
      chapterSound(this.audio);
      overlay.hidden = false;
      requestAnimationFrame(() => overlay.classList.add('is-visible'));
    });
  }

  /** Bubu introduces herself. */
  intro() {
    return showOverlay(byId('intro'), byId('btnStart'));
  }

  /**
   * The end of the whole journey, with all the stars gathered.
   * @param {number} [stars]
   * @param {number} [max]
   */
  finale(stars, max) {
    const line = byId('finaleStars');
    line.hidden = stars === undefined;
    line.textContent = stars === undefined ? '' : `Ai adunat ${stars} stele din ${max} în toată călătoria!`;
    finaleSound(this.audio);
    return showOverlay(byId('finale'), byId('btnAgain'));
  }
}
