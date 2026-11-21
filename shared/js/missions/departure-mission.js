/**
 * @file Station mission "departure": everything a traveller does before
 * the train leaves, in three short steps.
 *
 *   1. The ticket — the child writes their name next to Bubu's and chooses
 *      the colour of the locomotive (the train behind changes at once).
 *   2. The luggage — only what is useful on a winter journey goes into the
 *      suitcase; the wrong things are sent back with a funny remark.
 *      Items can be dragged into the suitcase or simply tapped.
 *   3. Boarding — reading the ticket, the child finds Bubu's coach by the
 *      number painted on it; Bubu then hops from the platform to her window.
 *
 * Useful knowledge is woven in: what a ticket says, and that the coach
 * number is written on the train.
 *
 * Stars depend on the number of mistakes (wrong items, wrong coaches).
 */

import { clamp, easeInOut, lerp } from '../core/math.js';
import { Particles, SPARKS } from '../gfx/particles.js';
import { drawBubu } from '../train/bubu.js';
import { TRACK_Y } from '../world/track.js';
import { el } from '../ui/dom.js';
import { Mission, starsForMistakes } from './mission.js';

/**
 * @typedef {object} TicketData
 * @property {string} train
 * @property {string} from
 * @property {string} to
 * @property {string} change   where the train is changed
 * @property {string} date
 * @property {string} time
 * @property {number} car
 * @property {number} seat
 *
 * @typedef {object} LuggageItem
 * @property {string} id
 * @property {string} icon    an emoji
 * @property {string} label
 * @property {string} [reply] what Bubu says when it is wrongly chosen (only for useless items)
 *
 * @typedef {object} DepartureConfig
 * @property {string} id
 * @property {string} title
 * @property {string} text
 * @property {TicketData} ticket
 * @property {Array<{color: string, label: string}>} locoColors
 * @property {LuggageItem[]} needed
 * @property {LuggageItem[]} useless
 * @property {string} boardingText
 * @property {string} tip         "traveller's tip" shown while boarding
 */

/** Seconds of Bubu's hop from the platform to the window. */
const HOP_TIME = 0.9;
/** A pointer that moved less than this (CSS px) is a tap, not a drag. */
const TAP_DISTANCE = 8;

export class DepartureMission extends Mission {
  /**
   * @param {import('./mission.js').MissionContext} ctx
   * @param {DepartureConfig} config
   */
  constructor(ctx, config) {
    super(ctx, config);
    this.config = config;
    this.mistakes = 0;
    /** @type {'ticket' | 'luggage' | 'boarding' | 'hop' | 'done'} */
    this.step = 'ticket';
    this.time = 0;
    this.hopT = 0;
    /** Time when Bubu reached her window. */
    this.doneAt = 0;
    this.particles = new Particles();
    /** @type {HTMLElement | null} */
    this.chip = null;
  }

  start() {
    this.phase = 'running';
    this.ctx.world.train.setBubuVisible(false, true);
    this.showTicket();
  }

  // ------------------------------------------------------------ step 1: ticket

  /** @private */
  showTicket() {
    const t = this.config.ticket;
    const state = this.ctx.state;
    const input = el('input', {
      class: 'ticket-input', type: 'text', maxlength: '18', autocomplete: 'off',
      placeholder: 'scrie numele tău', 'aria-label': 'Numele tău',
    });
    input.value = state.travelerName;
    const done = el('button', { class: 'big-btn', type: 'button' }, ['Gata! ✔']);
    const hint = el('p', { class: 'panel-hint' }, ['Scrie-ți numele pe bilet, lângă Bubu.']);
    const refresh = () => {
      const ok = input.value.trim().length >= 2;
      done.disabled = !ok;
      hint.hidden = ok;
    };
    input.addEventListener('input', refresh);
    input.addEventListener('keydown', e => { if (e.key === 'Enter' && !done.disabled) done.click(); });

    const swatches = this.config.locoColors.map(({ color, label }, i) => {
      const b = el('button', {
        class: 'swatch', type: 'button', title: label, 'aria-label': `Locomotivă ${label}`,
        style: `--swatch:${color}`, 'aria-pressed': String((state.locoColor ?? this.config.locoColors[0].color) === color),
      });
      b.addEventListener('click', () => {
        state.setLocoColor(color);
        for (const s of swatches) s.setAttribute('aria-pressed', String(s === b));
      });
      if (i === 0 && !state.locoColor) state.setLocoColor(color);
      return b;
    });

    done.addEventListener('click', () => {
      state.setTravelerName(input.value);
      this.showLuggage();
    });

    this.setPanel(el('div', { class: 'panel' }, [
      el('p', { class: 'panel-kicker' }, ['Misiune']),
      el('h2', { class: 'panel-title' }, [this.config.title]),
      el('p', { class: 'panel-text' }, [this.config.text]),
      el('div', { class: 'ticket' }, [
        el('div', { class: 'ticket-head' }, [el('span', {}, ['Bilet de tren']), el('span', {}, [t.train])]),
        el('p', { class: 'ticket-route' }, [
          el('b', {}, [t.from]), ' → ', el('b', {}, [t.to]),
          el('small', {}, [`schimbare de tren la ${t.change}`]),
        ]),
        el('dl', { class: 'ticket-grid' }, [
          ticketField('Data', t.date), ticketField('Plecare', t.time),
          ticketField('Vagon', String(t.car)), ticketField('Loc', String(t.seat)),
        ]),
        el('label', { class: 'ticket-name' }, ['Călători: Bubu și ', input]),
      ]),
      hint,
      el('p', { class: 'panel-text' }, ['Alege culoarea locomotivei:']),
      el('div', { class: 'swatches' }, swatches),
      done,
    ]));
    refresh();
    // on phones, opening the keyboard by itself would hide the ticket
    if (matchMedia('(pointer: fine)').matches) input.focus();
  }

  // ------------------------------------------------------------ step 2: luggage

  /** @private */
  showLuggage() {
    this.step = 'luggage';
    const needed = new Set(this.config.needed.map(i => i.id));
    const items = shuffle([...this.config.needed, ...this.config.useless]);
    let packed = 0;
    const count = el('p', { class: 'suitcase-count' }, [`0 / ${needed.size}`]);
    const inside = el('div', { class: 'suitcase-inside' });
    const suitcase = el('div', { class: 'suitcase' }, [el('div', { class: 'suitcase-handle' }), el('div', { class: 'suitcase-body' }, [inside]), count]);
    const says = el('span', {}, ['Ce luăm la drum? E iarnă și drumul e lung!']);

    /**
     * @param {LuggageItem} item
     * @param {HTMLElement} node
     */
    const choose = (item, node) => {
      if (needed.has(item.id)) {
        node.classList.add('is-packed');
        node.disabled = true;
        inside.append(el('span', { class: 'packed-item' }, [item.icon]));
        packed += 1;
        count.textContent = `${packed} / ${needed.size}`;
        says.textContent = `Da! ${item.label} – bună idee!`;
        if (packed === needed.size) {
          suitcase.classList.add('is-closed');
          says.textContent = 'Bagajul e gata! Mulțumesc! Acum hai la tren!';
          setTimeout(() => this.startBoarding(), 1600);
        }
      } else {
        this.mistakes += 1;
        node.classList.remove('is-wrong');
        void node.offsetWidth;   // restart the shake animation
        node.classList.add('is-wrong');
        says.textContent = item.reply || `Hmm, ${item.label.toLowerCase()} nu ne trebuie acum.`;
      }
    };

    const buttons = items.map(item => {
      const node = el('button', { class: 'luggage-item', type: 'button' }, [
        el('span', { class: 'luggage-icon', 'aria-hidden': 'true' }, [item.icon]), el('span', {}, [item.label]),
      ]);
      makeDraggable(node, suitcase, () => choose(item, node));
      return node;
    });

    this.setPanel(el('div', { class: 'panel panel--wide' }, [
      el('p', { class: 'panel-kicker' }, ['Misiune']),
      el('h2', { class: 'panel-title' }, ['Bagajul lui Bubu']),
      el('p', { class: 'panel-text' }, ['Trage în valiză (sau atinge) doar lucrurile de care Bubu are nevoie într-o călătorie de iarnă.']),
      el('div', { class: 'luggage' }, [el('div', { class: 'luggage-items' }, buttons), suitcase]),
      el('p', { class: 'bubu-says' }, [el('img', { src: '../shared/assets/bubu.webp', alt: '', width: '56', height: '56' }), says]),
    ]));
  }

  // ------------------------------------------------------------ step 3: boarding

  /** @private */
  startBoarding() {
    this.step = 'boarding';
    this.setPanel(null);
    const t = this.config.ticket;
    this.ctx.hud.instruct('Urcarea în tren', this.config.boardingText);
    this.chip = el('div', { class: 'ticket-chip' }, [
      el('span', { class: 'ticket-chip__label' }, ['Biletul lui Bubu']),
      el('span', {}, [`Vagon ${t.car} · Loc ${t.seat}`]),
      el('small', {}, [this.config.tip]),
    ]);
    document.body.append(this.chip);
  }

  /** @param {import('../core/input.js').PointerInfo} p */
  pointerDown(p) {
    if (this.step !== 'boarding') return;
    const car = this.ctx.world.carAtStage(p.x, p.y);
    if (!car) return;
    const target = this.config.ticket.car;
    if (car.number === target) {
      this.step = 'hop';
      this.hopT = 0;
      this.ctx.hud.announce('Urcarea în tren', 'Bravo! Bubu urcă în vagonul ' + target + '.', 'Misiune', 2.5);
      return;
    }
    this.mistakes += 1;
    const msg = car.number === undefined
      ? 'Aceasta e locomotiva – acolo stă mecanicul! Caută vagonul scris pe bilet.'
      : `Acesta e vagonul ${car.number}. Uită-te pe bilet: Bubu are loc în vagonul ${target}.`;
    this.ctx.hud.announce('Urcarea în tren', msg, 'Misiune', 0);
  }

  // ------------------------------------------------------------ canvas

  /** @param {number} dt */
  update(dt) {
    this.time += dt;
    this.particles.update(dt);
    if (this.step === 'hop') {
      this.hopT += dt;
      if (this.hopT >= HOP_TIME) {
        this.step = 'done';
        const train = this.ctx.world.train;
        train.setBubuVisible(true, true);
        const b = this.ctx.world.trainToStage(train.bubuPosition);
        this.particles.burst(b.x, b.y, SPARKS, 24, 260);
        this.doneAt = this.time;
      }
    }
    if (this.step === 'done' && this.time - this.doneAt > 0.9) {
      this.complete(starsForMistakes(this.mistakes, 3, 1), this.resultFor(this.mistakes));
    }
  }

  /** @param {CanvasRenderingContext2D} c */
  draw(c) {
    const size = 110;
    const ground = this.platformSpot();
    if (this.step === 'boarding' || this.step === 'ticket' || this.step === 'luggage') {
      const bob = Math.sin(this.time * 3) * 5;
      drawBubu(c, ground.x, ground.y - size / 2 + bob, size, Math.sin(this.time * 2) * 0.06);
    } else if (this.step === 'hop') {
      const k = easeInOut(clamp(this.hopT / HOP_TIME, 0, 1));
      const to = this.ctx.world.trainToStage(this.ctx.world.train.bubuPosition);
      const x = lerp(ground.x, to.x, k);
      const y = lerp(ground.y - size / 2, to.y, k) - Math.sin(Math.PI * k) * 160;
      drawBubu(c, x, y, lerp(size, 88, k), k * 6.28);
    }
    this.particles.draw(c);
  }

  /**
   * Where Bubu waits on the platform: in front of the train, a little to the
   * left of her coach.
   * @private
   */
  platformSpot() {
    const b = this.ctx.world.trainToStage(this.ctx.world.train.bubuPosition);
    return { x: Math.max(this.ctx.stage.viewLeft + 80, b.x - 190), y: TRACK_Y + 70 - this.ctx.world.cameraY };
  }

  // ------------------------------------------------------------ helpers

  /**
   * Replaces the mission's panel.
   * @private
   * @param {HTMLElement | null} node
   */
  setPanel(node) {
    const root = this.ctx.panel;
    root.replaceChildren();
    root.hidden = !node;
    if (node) root.append(node);
  }

  /** @private @param {number} mistakes */
  resultFor(mistakes) {
    const name = this.ctx.state.travelerName;
    if (mistakes <= 1) return `Perfect, ${name}! Bagajul e făcut și Bubu e în vagonul ei. Pornim!`;
    if (mistakes <= 3) return `Bravo, ${name}! Bubu e gata de drum. Pornim!`;
    return `Gata, ${name}! Cu puțin ajutor, Bubu e în tren. Pornim!`;
  }

  dispose() {
    this.setPanel(null);
    this.chip?.remove();
    this.ctx.hud.hideAnnouncement();
  }
}

/**
 * @param {string} label
 * @param {string} value
 */
function ticketField(label, value) {
  return el('div', {}, [el('dt', {}, [label]), el('dd', {}, [value])]);
}

/**
 * Fisher–Yates shuffle (returns a new array).
 * @template T
 * @param {T[]} items
 * @returns {T[]}
 */
function shuffle(items) {
  const a = items.slice();
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/**
 * Lets an element be dragged onto a target, or simply tapped. Both end in
 * `choose()`; a drag that ends elsewhere puts the element back.
 * @param {HTMLElement} node
 * @param {HTMLElement} target
 * @param {() => void} choose
 */
function makeDraggable(node, target, choose) {
  /** @type {{x: number, y: number, id: number} | null} */
  let start = null;
  let moved = false;
  node.addEventListener('pointerdown', e => {
    if (/** @type {HTMLButtonElement} */ (node).disabled) return;
    start = { x: e.clientX, y: e.clientY, id: e.pointerId };
    moved = false;
    node.setPointerCapture(e.pointerId);
  });
  node.addEventListener('pointermove', e => {
    if (!start || e.pointerId !== start.id) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (!moved && Math.hypot(dx, dy) < TAP_DISTANCE) return;
    moved = true;
    node.classList.add('is-dragging');
    node.style.transform = `translate(${dx}px, ${dy}px) scale(1.08)`;
    target.classList.toggle('is-target', isOver(e, target));
  });
  const end = (/** @type {PointerEvent} */ e) => {
    if (!start || e.pointerId !== start.id) return;
    const dropped = !moved || isOver(e, target);
    start = null;
    node.classList.remove('is-dragging');
    node.style.transform = '';
    target.classList.remove('is-target');
    if (dropped && e.type === 'pointerup') choose();
  };
  node.addEventListener('pointerup', end);
  node.addEventListener('pointercancel', end);
  // keyboard users: Enter/Space produce a click without pointer events
  node.addEventListener('click', e => { if (e.detail === 0) choose(); });
}

/**
 * @param {PointerEvent} e
 * @param {HTMLElement} target
 */
function isOver(e, target) {
  const r = target.getBoundingClientRect();
  return e.clientX >= r.left && e.clientX <= r.right && e.clientY >= r.top && e.clientY <= r.bottom;
}
