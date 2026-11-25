/**
 * @file Bubu's depot: first the locomotives, each standing in its bay (the
 * child picks one), then the chosen locomotive in the workshop, where it is
 * decorated. The address remembers the choice (depot/#steam), so the
 * browser's back button goes back to the bays.
 */

import { el } from '../shared/js/ui/dom.js';
import { DEPOT_LOCOS, depotLoco } from '../shared/js/depot/locos.js';
import { drawLocoPicture } from '../shared/js/depot/loco-picture.js';

const bays = /** @type {HTMLElement} */ (document.getElementById('bays'));
const workshop = /** @type {HTMLElement} */ (document.getElementById('workshop'));
const back = /** @type {HTMLAnchorElement} */ (document.getElementById('back'));
const backLabel = /** @type {HTMLElement} */ (document.getElementById('backLabel'));
const subtitle = /** @type {HTMLElement} */ (document.getElementById('subtitle'));

/** @type {Array<{canvas: HTMLCanvasElement, car: import('../shared/js/train/specs.js').CarSpec}>} the pictures to draw again when the page changes size */
let pictures = [];

/** Draws every locomotive picture on the page (again). */
function drawPictures() {
  for (const p of pictures) if (p.canvas.isConnected && p.canvas.clientWidth) drawLocoPicture(p.canvas, p.car);
}

/**
 * A locomotive in its bay: the arched door of the depot with its number,
 * the locomotive standing inside, its name and the journey it pulls.
 * @param {import('../shared/js/depot/locos.js').DepotLoco} loco
 * @param {number} i
 */
function bay(loco, i) {
  const canvas = el('canvas', { class: 'bay-loco', 'aria-hidden': 'true' });
  pictures.push({ canvas, car: loco.car });
  return el('li', { class: `bay bay--${loco.id}` }, [
    el('a', { class: 'bay-card', href: `#${loco.id}` }, [
      el('span', { class: 'bay-plate', 'aria-hidden': 'true' }, [String(i + 1)]),
      el('span', { class: 'bay-door' }, [canvas]),
      el('span', { class: 'bay-words' }, [
        el('span', { class: 'bay-name' }, [loco.name]),
        el('span', { class: 'bay-about' }, [loco.nickname]),
        el('span', { class: 'bay-route' }, [`🚆 Ruta ${loco.route} · ${loco.journey}`]),
      ]),
      el('span', { class: 'bay-go' }, ['🎨 Alege-o']),
    ]),
  ]);
}

/**
 * The workshop with the chosen locomotive.
 * @param {import('../shared/js/depot/locos.js').DepotLoco} loco
 */
function showWorkshop(loco) {
  const canvas = el('canvas', { class: 'workshop-loco', 'aria-hidden': 'true' });
  pictures = [{ canvas, car: loco.car }];
  workshop.replaceChildren(
    el('h2', { class: 'workshop-title', id: 'workshopTitle' }, [loco.name]),
    el('div', { class: 'workshop-stage' }, [canvas]),
    el('p', { class: 'workshop-note' }, ['Aici o vei decora: culori, fundițe, globuri și lumini. Atelierul se deschide în curând!']),
    el('a', { class: 'workshop-other', href: '#' }, ['🚂 Alege altă locomotivă']),
  );
  bays.hidden = true;
  workshop.hidden = false;
  back.href = '#';
  backLabel.textContent = 'Locomotivele';
  subtitle.textContent = 'Decorează locomotiva!';
}

/** The bays with all the locomotives. */
function showBays() {
  pictures = [];
  bays.replaceChildren(...DEPOT_LOCOS.map(bay));
  workshop.hidden = true;
  workshop.replaceChildren();
  bays.hidden = false;
  back.href = '../';
  backLabel.textContent = 'Toate călătoriile';
  subtitle.textContent = 'Alege o locomotivă!';
}

/** Shows what the address asks for: a locomotive (#electric) or the bays. */
function route() {
  const loco = depotLoco(location.hash.slice(1));
  if (loco) showWorkshop(loco);
  else showBays();
  window.scrollTo({ top: 0, behavior: 'instant' });
  drawPictures();
}

/**
 * Back to the bays: back in the history when the child came from them (so
 * the browser's back button does not return to the workshop), otherwise
 * (the workshop was opened from its address) by changing the address.
 */
function toBays() {
  if (history.state?.fromBays) history.back();
  else { history.replaceState(null, '', location.pathname); route(); }
}

back.addEventListener('click', e => {
  if (back.getAttribute('href') !== '#') return;
  e.preventDefault();
  toBays();
});
bays.addEventListener('click', e => {
  const link = /** @type {HTMLElement} */ (e.target).closest('a.bay-card');
  if (!link) return;
  e.preventDefault();
  history.pushState({ fromBays: true }, '', link.getAttribute('href'));
  route();
});
workshop.addEventListener('click', e => {
  if (!(/** @type {HTMLElement} */ (e.target).closest('a.workshop-other'))) return;
  e.preventDefault();
  toBays();
});
addEventListener('popstate', route);
addEventListener('hashchange', route);

let waiting = false;
addEventListener('resize', () => {
  if (waiting) return;
  waiting = true;
  requestAnimationFrame(() => { waiting = false; drawPictures(); });
});

route();
