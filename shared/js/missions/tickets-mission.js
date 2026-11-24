/**
 * @file Station mission "the ticket inspector": Bubu works for the forest
 * railway, and the children come one at a time to the steps of the train
 * with their tickets.
 *
 * Every ticket is easy to read even for the youngest: where to (with a
 * little picture), the date and the coach. For each child the player:
 *
 *   1. decides whether the ticket is good: "Îl compostez" punches it (a hole
 *      appears, "clanc!"); a ticket for another day, for another place, or a
 *      drawing instead of a ticket is sent back with "Nu e bun", and the
 *      child comes back from the ticket office with a good one;
 *   2. shows the child to the coach written on the ticket (1, 2 or 3): the
 *      child then sits at a window of that coach.
 *
 * Wrong choices are gentle mistakes, explained by Bubu.
 *
 * Configuration (besides id/title/text):
 *   route      {from, to, toIcon, day, otherPlace} — what a good ticket says (and
 *              where the ticket for another trip goes)
 *   children   [{emoji, coach, ticket}] — in order; ticket: "good" | "day" | "place" | "drawing"
 *   seats      [[seat, seat…] per coach] — window seats of every coach (see TrainRenderer.passengerWindows)
 *   flag       set at the end (all the children are on the train)
 */

import { el } from '../ui/dom.js';
import { showPanel } from '../ui/panel.js';
import { Mission, starsForMistakes } from './mission.js';

/**
 * @typedef {'good' | 'day' | 'place' | 'drawing'} TicketKind
 * @typedef {{emoji: string, coach: number, ticket: TicketKind}} TicketChild
 * @typedef {import('./mission.js').MissionConfig & {
 *   route: {from: string, to: string, toIcon: string, day: number, otherPlace: string},
 *   children: TicketChild[], seats: number[][], flag: string,
 * }} TicketsConfig
 */

/**
 * What Bubu says when a wrong ticket is sent back.
 * @param {'day' | 'place' | 'drawing'} kind
 * @param {string} to  where the train goes
 */
const why = (kind, to) => ({
  day: 'Biletul ăsta e pentru ieri! Mergi la casa de bilete și cere unul pentru azi.',
  place: `Biletul ăsta e pentru alt drum! Noi mergem la ${to}. Cere altul la casa de bilete.`,
  drawing: 'Ce desen frumos! Dar nu e bilet. Cere unul adevărat la casa de bilete.',
})[kind];

export class TicketsMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {TicketsConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    this.current = 0;
    this.mistakes = 0;
    /** @type {'check' | 'coach' | 'busy'} what the player decides now */
    this.step = 'check';
    /** The ticket of the current child (it becomes good after the ticket office). */
    /** @type {TicketKind} */
    this.ticket = 'good';
    this.punched = false;
    this.time = 0;
    this.doneAt = -1;
    /** @type {Record<string, HTMLElement>} */
    this.ui = {};
    /** Seats already taken in every coach. */
    this.taken = config.seats.map(() => 0);
  }

  start() {
    this.phase = 'running';
    const face = el('span', { class: 'wish-child', 'aria-hidden': 'true' });
    const says = el('p', { class: 'wish-says' });
    const count = el('span', { class: 'wish-count' });
    const ticket = el('div', { class: 'ticket-card' });
    const actions = el('div', { class: 'ticket-actions' });
    const reply = el('span', {});
    this.ui = { face, says, count, ticket, actions, reply };
    showPanel(this.ctx.panel, el('div', { class: 'panel panel--wide tickets-panel' }, [
      el('p', { class: 'panel-kicker' }, ['Misiune']),
      el('h2', { class: 'panel-title' }, [this.config.title]),
      el('p', { class: 'panel-text' }, [this.config.text]),
      el('div', { class: 'wish-bubble' }, [face, says, count]),
      el('div', { class: 'ticket-row' }, [ticket, actions]),
      el('p', { class: 'bubu-says' }, [el('img', { src: '../shared/assets/bubu.webp', alt: '', width: '56', height: '56' }), reply]),
    ]));
    this.showChild();
  }

  /** @private The next child comes with a ticket. */
  showChild() {
    const c = this.config.children[this.current];
    this.ticket = c.ticket;
    this.punched = false;
    this.ui.face.textContent = c.emoji;
    this.ui.says.textContent = '„Bună ziua! Poftiți biletul meu.”';
    this.ui.count.textContent = `${this.current + 1} / ${this.config.children.length}`;
    this.ui.reply.textContent = 'E bun biletul?';
    this.showTicket();
    this.askCheck();
  }

  /** @private Draws the ticket of the current child. */
  showTicket() {
    const r = this.config.route;
    const c = this.config.children[this.current];
    const t = this.ticket;
    const node = this.ui.ticket;
    node.replaceChildren();
    node.classList.toggle('is-drawing', t === 'drawing');
    node.classList.toggle('is-punched', this.punched);
    if (t === 'drawing') {
      node.append(el('span', { class: 'ticket-drawing', 'aria-hidden': 'true' }, ['🚂☀️🌲']), el('p', { class: 'ticket-line' }, ['(un desen)']));
      return;
    }
    node.append(
      el('p', { class: 'ticket-head' }, ['🚂 BILET · Mocănița']),
      el('p', { class: 'ticket-line' }, ['De la: ', el('b', {}, [r.from])]),
      el('p', { class: 'ticket-line ticket-big' }, ['La: ', el('b', {}, [t === 'place' ? r.otherPlace : `${r.toIcon} ${r.to}`])]),
      el('p', { class: 'ticket-line ticket-big' }, ['Data: ', el('b', {}, [`${t === 'day' ? r.day - 1 : r.day} decembrie`])]),
      el('p', { class: 'ticket-line' }, ['Vagonul: ', el('b', { class: 'ticket-coach' }, [String(c.coach)])]),
      el('span', { class: 'ticket-hole', 'aria-hidden': 'true' }),
    );
  }

  /** @private The two buttons: punch it, or send it back. */
  askCheck() {
    this.step = 'check';
    const ok = el('button', { class: 'luggage-item ticket-btn', type: 'button' }, [
      el('span', { class: 'luggage-icon', 'aria-hidden': 'true' }, ['✅']), el('span', {}, ['E bun! Îl compostez']),
    ]);
    const bad = el('button', { class: 'luggage-item ticket-btn', type: 'button' }, [
      el('span', { class: 'luggage-icon', 'aria-hidden': 'true' }, ['❌']), el('span', {}, ['Nu e bun']),
    ]);
    ok.addEventListener('click', () => this.check(true, ok));
    bad.addEventListener('click', () => this.check(false, bad));
    this.ui.actions.replaceChildren(ok, bad);
  }

  /**
   * @private
   * @param {boolean} good  the player says the ticket is good
   * @param {HTMLElement} button
   */
  check(good, button) {
    if (this.step !== 'check') return;
    const isGood = this.ticket === 'good';
    if (good !== isGood) {
      this.mistakes += 1;
      this.oops();
      shake(button);
      this.ui.reply.textContent = isGood
        ? `Uită-te bine: e pentru ${this.config.route.to}, pe ${this.config.route.day} decembrie. E un bilet bun!`
        : 'Mai uită-te o dată: unde merge și în ce zi?';
      return;
    }
    if (isGood) {
      this.punched = true;
      this.showTicket();
      this.sound('tock');
      this.ui.reply.textContent = 'Clanc! În ce vagon urcă?';
      this.askCoach();
      return;
    }
    // to the ticket office and back with a good ticket
    this.step = 'busy';
    this.sound('collect');
    this.ui.reply.textContent = why(/** @type {'day' | 'place' | 'drawing'} */ (this.ticket), this.config.route.to);
    this.ui.actions.replaceChildren();
    setTimeout(() => {
      if (this.phase === 'finished') return;
      this.ui.says.textContent = '„Gata, am luat bilet nou de la casa de bilete!”';
      this.ticket = 'good';
      this.showTicket();
      this.ui.reply.textContent = 'E bun acum?';
      this.askCheck();
    }, 2200);
  }

  /** @private The coach buttons. */
  askCoach() {
    this.step = 'coach';
    const buttons = this.config.seats.map((_, i) => {
      const b = el('button', { class: 'luggage-item ticket-btn', type: 'button' }, [
        el('span', { class: 'luggage-icon', 'aria-hidden': 'true' }, ['🚃']), el('span', {}, [`Vagonul ${i + 1}`]),
      ]);
      b.addEventListener('click', () => this.board(i + 1, b));
      return b;
    });
    this.ui.actions.replaceChildren(...buttons);
  }

  /**
   * @private
   * @param {number} coach
   * @param {HTMLElement} button
   */
  board(coach, button) {
    if (this.step !== 'coach') return;
    const c = this.config.children[this.current];
    if (coach !== c.coach) {
      this.mistakes += 1;
      this.oops();
      shake(button);
      this.ui.reply.textContent = 'Uită-te pe bilet: ce vagon scrie acolo?';
      return;
    }
    this.step = 'busy';
    this.sound('hop');
    const seats = this.config.seats[coach - 1];
    const seat = seats[this.taken[coach - 1]++ % seats.length];
    this.ctx.world.train.addPassenger(c.emoji, seat);
    this.ui.reply.textContent = `Drum bun! Copilul urcă în vagonul ${coach}.`;
    this.ui.actions.replaceChildren();
    this.current += 1;
    setTimeout(() => {
      if (this.phase === 'finished') return;
      if (this.current < this.config.children.length) this.showChild();
      else this.showEnd();
    }, 1100);
  }

  /** @private Everyone is on the train. */
  showEnd() {
    this.ui.face.textContent = '🎉';
    this.ui.says.textContent = 'Toți copiii sunt în tren, cu biletele compostate!';
    this.ui.count.textContent = '';
    this.ui.ticket.replaceChildren();
    this.ui.ticket.hidden = true;
    this.ui.reply.textContent = `Putem pleca spre ${this.config.route.to}!`;
    const go = el('button', { class: 'big-btn', type: 'button' }, ['Pornim! 🚂']);
    go.addEventListener('click', () => {
      showPanel(this.ctx.panel, null);
      this.ctx.state.setFlag(this.config.flag);
      this.doneAt = this.time;
    });
    this.ui.actions.replaceChildren(go);
  }

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    if (this.doneAt >= 0 && this.time - this.doneAt > 0.6) {
      this.complete(starsForMistakes(this.mistakes, 2, 0), this.mistakes === 0
        ? 'Perfect! Ai verificat fiecare bilet ca un controlor adevărat.'
        : 'Bravo! Toți copiii au bilete bune și stau în vagonul lor.');
    }
  }

  dispose() {
    showPanel(this.ctx.panel, null);
  }
}

/**
 * Shakes a button (a gentle "no").
 * @param {HTMLElement} button
 */
function shake(button) {
  button.classList.remove('is-wrong');
  void button.offsetWidth;   // restart the animation
  button.classList.add('is-wrong');
}
