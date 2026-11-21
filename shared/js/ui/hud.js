/**
 * @file The heads-up display: clock, progress along the route, next
 * station, and the banner shown when the train stops at a station.
 *
 * The HUD is plain HTML on top of the canvas (crisp text, accessible). The
 * DOM is touched only when something visible changes (the minute, the
 * station), never every frame — except the small train marker, which is
 * moved with a CSS transform.
 */

import { formatHourMinute, timeParts } from '../world/clock.js';

/** Romanian month names (the game is in Romanian). */
const MONTHS = ['ianuarie', 'februarie', 'martie', 'aprilie', 'mai', 'iunie', 'iulie',
  'august', 'septembrie', 'octombrie', 'noiembrie', 'decembrie'];

/**
 * @typedef {object} HudOptions
 * @property {number} month             0-based month of the journey
 * @property {Record<number, string>} [dayLabels]  e.g. {24: 'Ajunul Crăciunului'}
 */

export class Hud {
  /**
   * @param {import('../journey/route.js').Route} route
   * @param {HudOptions} options
   */
  constructor(route, options) {
    this.route = route;
    this.options = options;
    this.el = {
      date: byId('hudDate'),
      time: byId('hudTime'),
      track: byId('hudTrack'),
      marker: byId('hudMarker'),
      next: byId('hudNext'),
      banner: byId('stationBanner'),
      bannerName: byId('stationBannerName'),
    };
    this.lastMinute = -1;
    this.lastNext = '';
    this.bannerTimer = 0;
    this.buildDots();
  }

  /** @private One dot per station on the progress line. */
  buildDots() {
    const frag = document.createDocumentFragment();
    /** @type {HTMLElement[]} */
    this.dots = this.route.stations.map(st => {
      const dot = document.createElement('li');
      dot.className = 'route-dot';
      dot.style.left = `${(100 * st.distance) / this.route.length}%`;
      dot.title = st.name;
      frag.appendChild(dot);
      return dot;
    });
    this.el.track.appendChild(frag);
  }

  /** @param {import('../journey/journey.js').Journey} j */
  update(j) {
    const minute = Math.floor(j.clock);
    if (minute !== this.lastMinute) {
      this.lastMinute = minute;
      const p = timeParts(j.clock, this.route.firstDay);
      const label = this.options.dayLabels?.[p.day];
      this.el.date.textContent = `${p.day} ${MONTHS[this.options.month]}${label ? ` · ${label}` : ''}`;
      this.el.time.textContent = formatHourMinute(j.clock);
    }

    const frac = j.distance / this.route.length;
    this.el.marker.style.transform = `translateX(${(frac * this.el.track.clientWidth).toFixed(1)}px)`;

    const next = j.state === 'finished' ? '' : j.nextStation.short;
    const key = `${j.state}|${next}|${j.stationIndex}`;
    if (key !== this.lastNext) {
      this.lastNext = key;
      this.el.next.innerHTML = j.state === 'running'
        ? `Următoarea gară: <b>${escapeHtml(next)}</b>`
        : `Suntem în gara <b>${escapeHtml(j.station.short)}</b>`;
      this.dots.forEach((d, i) => {
        d.classList.toggle('is-passed', i < j.stationIndex || (i === j.stationIndex && j.state !== 'running'));
        d.classList.toggle('is-current', i === j.stationIndex && j.state !== 'running');
      });
    }
  }

  /**
   * Shows the big station sign for a few seconds.
   * @param {string} name
   * @param {number} [seconds=3.5]
   */
  showStation(name, seconds = 3.5) {
    this.el.bannerName.textContent = name;
    this.el.banner.hidden = false;
    // restart the CSS animation
    this.el.banner.classList.remove('is-visible');
    void this.el.banner.offsetWidth;
    this.el.banner.classList.add('is-visible');
    clearTimeout(this.bannerTimer);
    this.bannerTimer = window.setTimeout(() => {
      this.el.banner.classList.remove('is-visible');
      this.bannerTimer = window.setTimeout(() => { this.el.banner.hidden = true; }, 400);
    }, seconds * 1000);
  }
}

/**
 * @param {string} id
 * @returns {HTMLElement}
 */
function byId(id) {
  const el = document.getElementById(id);
  if (!el) throw new Error(`Missing element #${id}`);
  return el;
}

/** @param {string} text */
function escapeHtml(text) {
  return text.replace(/[&<>"']/g, ch => `&#${ch.charCodeAt(0)};`);
}
