/**
 * @file Bubu's depot: first the locomotives, each standing in its bay (the
 * child picks one), then the chosen locomotive in the workshop, where it is
 * decorated: its colours, a bow, baubles, a string of lights and stickers.
 * Every choice is kept at once (shared/js/depot/style.js) and the journeys
 * pulled by that locomotive show it so. The address remembers the choice
 * (depot/#electric), so the browser's back button goes back to the bays.
 */

import { el } from '../shared/js/ui/dom.js';
import { DEPOT_LOCOS, depotLoco } from '../shared/js/depot/locos.js';
import { LocoPicture } from '../shared/js/depot/loco-picture.js';
import {
  BAUBLE_SETS, BOWS, LIGHT_SETS, PALETTES, STICKERS, STICKER_SLOTS, loadStyle, plainStyle, saveStyle,
} from '../shared/js/depot/style.js';
import { canDecorate, drawBow, drawDecorLights, drawSticker } from '../shared/js/train/loco-decor.js';
import { drawBauble } from '../shared/js/gfx/ornaments.js';

const bays = /** @type {HTMLElement} */ (document.getElementById('bays'));
const workshop = /** @type {HTMLElement} */ (document.getElementById('workshop'));
const back = /** @type {HTMLAnchorElement} */ (document.getElementById('back'));
const backLabel = /** @type {HTMLElement} */ (document.getElementById('backLabel'));
const subtitle = /** @type {HTMLElement} */ (document.getElementById('subtitle'));

/** @typedef {import('../shared/js/depot/locos.js').DepotLoco} DepotLoco */
/** @typedef {import('../shared/js/depot/style.js').LocoStyle} LocoStyle */

/** @type {Array<{picture: LocoPicture, loco: DepotLoco}>} the pictures on the page */
let pictures = [];
/** The frame request that makes the lights of the workshop's locomotive twinkle. */
let frame = 0;

/** Draws every locomotive picture on the page (again), at its size on the page. */
function drawPictures() {
  for (const { picture, loco } of pictures) {
    if (!picture.canvas.isConnected || !picture.canvas.clientWidth) continue;
    if (picture.car) { picture.fit(); picture.draw(performance.now() / 1000); } else picture.show(loco.car, loadStyle(loco.id));
  }
}

/** Keeps the lights of the workshop's locomotive twinkling (only while it has lights). */
function animate() {
  cancelAnimationFrame(frame);
  const tick = () => {
    const live = pictures.filter(p => p.picture.animated && p.picture.canvas.isConnected);
    if (!live.length) return;
    for (const p of live) p.picture.draw(performance.now() / 1000);
    frame = requestAnimationFrame(tick);
  };
  frame = requestAnimationFrame(tick);
}

/**
 * A locomotive in its bay: the arched door of the depot with its number,
 * the locomotive standing inside (as the child decorated it), its name and
 * the journey it pulls.
 * @param {DepotLoco} loco
 * @param {number} i
 */
function bay(loco, i) {
  const canvas = el('canvas', { class: 'bay-loco', 'aria-hidden': 'true' });
  pictures.push({ picture: new LocoPicture(canvas), loco });
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

/* ------------------------------------------------------------ the workshop */

/**
 * A small picture drawn on a canvas, for a button of the workshop.
 * @param {(c: CanvasRenderingContext2D) => void} paint  draws in a 60 × 40 box
 */
function icon(paint) {
  const canvas = el('canvas', { class: 'tool-icon', width: '120', height: '80', 'aria-hidden': 'true' });
  const c = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
  c.scale(2, 2);
  paint(c);
  return canvas;
}

/** The "none" picture: an empty circle crossed out. */
const NONE_ICON = () => icon(c => {
  c.strokeStyle = '#b0a58c';
  c.lineWidth = 3;
  c.beginPath();
  c.arc(30, 20, 13, 0, Math.PI * 2);
  c.moveTo(21, 29);
  c.lineTo(39, 11);
  c.stroke();
});

/**
 * The tools of the workshop: each opens its own choices.
 * @type {ReadonlyArray<{id: string, icon: string, label: string}>}
 */
const TOOLS = [
  { id: 'colors', icon: '🎨', label: 'Culori' },
  { id: 'bow', icon: '🎀', label: 'Fundiță' },
  { id: 'baubles', icon: '🔴', label: 'Globuri' },
  { id: 'lights', icon: '💡', label: 'Beculețe' },
  { id: 'stickers', icon: '⭐', label: 'Abțibilduri' },
];

/**
 * A choice button: pressed when it is the one chosen.
 * @param {{label: string, pressed: boolean, onPick: () => void, content: Node, cls?: string, style?: string}} o
 */
const choice = o => el('button', {
  class: `choice ${o.cls || ''}`, type: 'button', title: o.label, 'aria-label': o.label,
  'aria-pressed': String(o.pressed), ...(o.style ? { style: o.style } : {}), onclick: o.onPick,
}, [o.content]);

/**
 * The workshop of a locomotive that can be decorated.
 * @param {DepotLoco} loco
 */
function decorate(loco) {
  let style = loadStyle(loco.id);
  let tool = 'colors';
  const canvas = el('canvas', { class: 'workshop-loco', 'aria-hidden': 'true' });
  const picture = new LocoPicture(canvas);
  pictures = [{ picture, loco }];
  const panel = el('div', { class: 'tool-panel', role: 'tabpanel' });
  const saved = el('p', { class: 'workshop-saved', 'aria-live': 'polite' }, ['Tot ce alegi se păstrează singur.']);

  /** @param {LocoStyle} next */
  const change = next => {
    style = next;
    saveStyle(loco.id, style);
    picture.show(loco.car, style);
    animate();
    saved.textContent = '✔ Păstrat! Așa va merge și pe drum.';
    showPanel();
  };

  const tabs = TOOLS.map(t => el('button', {
    class: 'tool', type: 'button', role: 'tab', 'aria-selected': String(t.id === tool),
    onclick: () => {
      tool = t.id;
      for (const b of tabs) b.setAttribute('aria-selected', String(b.dataset.tool === tool));
      showPanel();
    },
    'data-tool': t.id,
  }, [el('span', { class: 'tool-emoji', 'aria-hidden': 'true' }, [t.icon]), el('span', {}, [t.label])]));

  /** The choices of the tool that is open. */
  function showPanel() {
    panel.replaceChildren(...(PANELS[tool]?.() ?? []));
  }

  /** @type {Record<string, () => Node[]>} */
  const PANELS = {
    colors: () => /** @type {const} */ ([['body', 'Locomotiva'], ['band', 'Dunga'], ['roof', 'Acoperișul']]).map(([part, name]) =>
      el('div', { class: 'choice-row' }, [
        el('p', { class: 'choice-label' }, [name]),
        el('div', { class: 'choices' }, PALETTES[part].map(s => choice({
          label: `${name}: ${s.name}`,
          cls: 'swatch-choice',
          style: `--swatch:${s.color}`,
          pressed: (style.colors[part] ?? loco.car.colors[part]) === s.color,
          content: el('span', { class: 'sr-only' }, [s.name]),
          onPick: () => change({ ...style, colors: { ...style.colors, [part]: s.color === loco.car.colors[part] ? null : s.color } }),
        }))),
      ])),
    bow: () => [el('div', { class: 'choices' }, [
      choice({ label: 'Fără fundiță', pressed: !style.bow, content: NONE_ICON(), onPick: () => change({ ...style, bow: null }) }),
      ...BOWS.map(b => choice({
        label: `Fundiță ${b.name}`, pressed: style.bow === b.color,
        content: icon(c => drawBow(c, 30, 18, b.color)),
        onPick: () => change({ ...style, bow: b.color }),
      })),
    ])],
    baubles: () => [el('div', { class: 'choices' }, [
      choice({ label: 'Fără globuri', pressed: !style.baubles, content: NONE_ICON(), onPick: () => change({ ...style, baubles: null }) }),
      ...Object.entries(BAUBLE_SETS).map(([id, set]) => choice({
        label: `Globuri ${set.name.toLowerCase()}`, pressed: style.baubles === id, cls: 'choice--named',
        content: el('span', { class: 'choice-stack' }, [
          icon(c => [14, 30, 46].forEach((x, i) => drawBauble(c, x, 22, 8, set.colors[i % set.colors.length], false))),
          el('span', { class: 'choice-name' }, [set.name]),
        ]),
        onPick: () => change({ ...style, baubles: id }),
      })),
    ])],
    lights: () => [el('div', { class: 'choices' }, [
      choice({ label: 'Fără beculețe', pressed: !style.lights, content: NONE_ICON(), onPick: () => change({ ...style, lights: null }) }),
      ...Object.entries(LIGHT_SETS).map(([id, set]) => choice({
        label: `Beculețe ${set.name.toLowerCase()}`, pressed: style.lights === id, cls: 'choice--named',
        content: el('span', { class: 'choice-stack' }, [
          icon(c => {
            const fake = { ...plainStyle(), lights: id };
            const bulbs = [8, 19, 30, 41, 52].map((x, i) => ({ x, y: 18 + (i % 2) * 4 }));
            drawDecorLights(c, bulbs, fake, 0.3, true);
            drawDecorLights(c, bulbs, fake, 0.3, false);
          }),
          el('span', { class: 'choice-name' }, [set.name]),
        ]),
        onPick: () => change({ ...style, lights: id }),
      })),
    ])],
    stickers: () => [
      el('p', { class: 'choice-label' }, [`Alege până la ${STICKER_SLOTS} abțibilduri pentru lateral (ai pus ${style.stickers.length}). Atinge-l din nou ca să-l dezlipești.`]),
      el('div', { class: 'choices' }, Object.entries(STICKERS).map(([id, name]) => choice({
        label: name, pressed: style.stickers.includes(id),
        content: icon(c => drawSticker(c, id, 30, 20, 17)),
        onPick: () => {
          const on = style.stickers.includes(id);
          // a fourth one takes the place of the first
          const stickers = on ? style.stickers.filter(s => s !== id) : [...style.stickers, id].slice(-STICKER_SLOTS);
          change({ ...style, stickers });
        },
      }))),
    ],
  };

  // "as it came": a second touch within a few seconds confirms
  let armed = 0;
  const reset = el('button', { class: 'workshop-reset', type: 'button' }, ['↺ Ca la început']);
  reset.addEventListener('click', () => {
    if (!armed) {
      reset.textContent = 'Sigur? Mai apasă o dată';
      armed = window.setTimeout(() => { armed = 0; reset.textContent = '↺ Ca la început'; }, 3000);
      return;
    }
    clearTimeout(armed);
    armed = 0;
    reset.textContent = '↺ Ca la început';
    change(plainStyle());
  });

  workshop.replaceChildren(
    el('h2', { class: 'workshop-title', id: 'workshopTitle' }, [loco.name]),
    el('div', { class: 'workshop-stage' }, [canvas]),
    el('p', { class: 'workshop-where' }, [`Așa o vei vedea în Ruta ${loco.route} · ${loco.journey}`]),
    el('div', { class: 'tools', role: 'tablist', 'aria-label': 'Ce decorezi' }, tabs),
    panel,
    saved,
    el('div', { class: 'workshop-actions' }, [reset, el('a', { class: 'workshop-other', href: '#' }, ['🚂 Altă locomotivă'])]),
  );
  showPanel();
}

/**
 * The workshop with the chosen locomotive.
 * @param {DepotLoco} loco
 */
function showWorkshop(loco) {
  if (canDecorate(loco.car.kind)) decorate(loco);
  else {
    // its workshop is not ready yet
    const canvas = el('canvas', { class: 'workshop-loco', 'aria-hidden': 'true' });
    pictures = [{ picture: new LocoPicture(canvas), loco }];
    workshop.replaceChildren(
      el('h2', { class: 'workshop-title', id: 'workshopTitle' }, [loco.name]),
      el('div', { class: 'workshop-stage' }, [canvas]),
      el('p', { class: 'workshop-note' }, ['Atelierul pentru această locomotivă se deschide în curând!']),
      el('a', { class: 'workshop-other', href: '#' }, ['🚂 Alege altă locomotivă']),
    );
  }
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
  animate();
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
