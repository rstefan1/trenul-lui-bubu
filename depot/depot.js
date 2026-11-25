/**
 * @file Bubu's depot: first the locomotives, each standing in its bay (the
 * child picks one), then the chosen locomotive in the workshop, where it is
 * decorated: its colours, a pattern, a bow, a flag, stickers and the
 * child's name on a plate (nothing tied to a season).
 * Every choice is kept at once (shared/js/depot/style.js) and the journeys
 * pulled by that locomotive show it so. The address remembers the choice
 * (depot/#electric), so the browser's back button goes back to the bays.
 */

import { el } from '../shared/js/ui/dom.js';
import { DEPOT_LOCOS, depotLoco } from '../shared/js/depot/locos.js';
import { LocoPicture } from '../shared/js/depot/loco-picture.js';
import {
  BOWS, FLAGS, NAME_LENGTH, PALETTES, PATTERNS, STICKERS, STICKER_SLOTS, cleanName, loadStyle, plainStyle, saveStyle,
} from '../shared/js/depot/style.js';
import { canDecorate, drawBow, drawFlag, drawPattern, drawSticker } from '../shared/js/train/loco-decor.js';

const bays = /** @type {HTMLElement} */ (document.getElementById('bays'));
const workshop = /** @type {HTMLElement} */ (document.getElementById('workshop'));
const back = /** @type {HTMLAnchorElement} */ (document.getElementById('back'));
const backLabel = /** @type {HTMLElement} */ (document.getElementById('backLabel'));
const subtitle = /** @type {HTMLElement} */ (document.getElementById('subtitle'));

/** @typedef {import('../shared/js/depot/locos.js').DepotLoco} DepotLoco */
/** @typedef {import('../shared/js/depot/style.js').LocoStyle} LocoStyle */

/** @type {Array<{picture: LocoPicture, loco: DepotLoco}>} the pictures on the page */
let pictures = [];

/**
 * Draws every locomotive picture on the page (again), at its size on the page.
 * @param {boolean} [repaint=false]  paint the locomotives again too (the font of the name plates came)
 */
function drawPictures(repaint = false) {
  for (const { picture, loco } of pictures) {
    if (!picture.canvas.isConnected || !picture.canvas.clientWidth) continue;
    if (picture.car && !repaint) { picture.fit(); picture.draw(); } else picture.show(loco.car, picture.style ?? loadStyle(loco.id));
  }
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
  { id: 'pattern', icon: '✨', label: 'Model' },
  { id: 'bow', icon: '🎀', label: 'Fundiță' },
  { id: 'flag', icon: '🚩', label: 'Steguleț' },
  { id: 'stickers', icon: '⭐', label: 'Abțibilduri' },
  { id: 'name', icon: '✏️', label: 'Nume' },
];

/** The parts of the locomotive that can be painted, as the children call them. */
const PARTS = /** @type {const} */ ([['body', 'Locomotiva'], ['band', 'Dunga'], ['roof', 'Acoperișul']]);

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
  /** @type {'body' | 'band' | 'roof'} the part being painted */
  let part = 'body';
  const canvas = el('canvas', { class: 'workshop-loco', 'aria-hidden': 'true' });
  const picture = new LocoPicture(canvas);
  pictures = [{ picture, loco }];
  const panel = el('div', { class: 'tool-panel', role: 'tabpanel' });
  const saved = el('p', { class: 'workshop-saved', 'aria-live': 'polite' }, ['Tot ce alegi se păstrează singur.']);

  /**
   * @param {LocoStyle} next
   * @param {boolean} [redraw=true]  show the choices again (not while the child types the name)
   */
  const change = (next, redraw = true) => {
    style = next;
    saveStyle(loco.id, style);
    picture.show(loco.car, style);
    saved.textContent = '✔ Păstrat! Așa va merge și pe drum.';
    if (redraw) showPanel();
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
    panel.replaceChildren(...(PANELS[tool]?.() ?? []).filter(n => n !== null));
  }

  const body = () => style.colors.body ?? loco.car.colors.body;

  /** @type {Record<string, () => Array<Node | null>>} */
  const PANELS = {
    // first the part to paint (three small buttons), then one row of colours: short, so the locomotive stays in sight
    colors: () => [
      el('div', { class: 'parts', role: 'group', 'aria-label': 'Ce colorezi' }, PARTS.map(([id, name]) => el('button', {
        class: 'part', type: 'button', 'aria-pressed': String(id === part),
        onclick: () => { part = id; showPanel(); },
      }, [name]))),
      el('div', { class: 'choices' }, PALETTES[part].map(s => choice({
        label: `${PARTS.find(([id]) => id === part)?.[1]}: ${s.name}`,
        cls: 'swatch-choice',
        style: `--swatch:${s.color}`,
        pressed: (style.colors[part] ?? loco.car.colors[part]) === s.color,
        content: el('span', { class: 'sr-only' }, [s.name]),
        onPick: () => change({ ...style, colors: { ...style.colors, [part]: s.color === loco.car.colors[part] ? null : s.color } }),
      }))),
    ],
    pattern: () => [el('div', { class: 'choices' }, [
      choice({ label: 'Fără model', pressed: !style.pattern, content: NONE_ICON(), onPick: () => change({ ...style, pattern: null }) }),
      ...Object.entries(PATTERNS).map(([id, name]) => choice({
        label: name, pressed: style.pattern === id, cls: 'choice--named',
        content: el('span', { class: 'choice-stack' }, [
          icon(c => {
            c.fillStyle = body();
            c.fillRect(4, 4, 52, 32);
            drawPattern(c, id, [4, 4, 52, 32], body());
          }),
          el('span', { class: 'choice-name' }, [name]),
        ]),
        onPick: () => change({ ...style, pattern: id }),
      })),
    ])],
    bow: () => [el('div', { class: 'choices' }, [
      choice({ label: 'Fără fundiță', pressed: !style.bow, content: NONE_ICON(), onPick: () => change({ ...style, bow: null }) }),
      ...BOWS.map(b => choice({
        label: `Fundiță ${b.name}`, pressed: style.bow === b.color,
        content: icon(c => drawBow(c, 30, 18, b.color)),
        onPick: () => change({ ...style, bow: b.color }),
      })),
    ])],
    flag: () => [el('div', { class: 'choices' }, [
      choice({ label: 'Fără steguleț', pressed: !style.flag, content: NONE_ICON(), onPick: () => change({ ...style, flag: null }) }),
      ...Object.entries(FLAGS).map(([id, name]) => choice({
        label: `Steguleț ${name.toLowerCase()}`, pressed: style.flag === id,
        content: icon(c => drawFlag(c, id, 46, 48)),
        onPick: () => change({ ...style, flag: id }),
      })),
    ])],
    stickers: () => [
      el('p', { class: 'choice-label' }, [`Pune până la ${STICKER_SLOTS} abțibilduri (ai pus ${style.stickers.length}). Atinge-l din nou ca să-l dezlipești.`]),
      el('div', { class: 'choices' }, Object.entries(STICKERS).map(([id, name]) => choice({
        label: name, pressed: style.stickers.includes(id),
        content: icon(c => drawSticker(c, id, 30, 20, 17)),
        onPick: () => {
          const on = style.stickers.includes(id);
          // one more than fit takes the place of the first
          const stickers = on ? style.stickers.filter(s => s !== id) : [...style.stickers, id].slice(-STICKER_SLOTS);
          change({ ...style, stickers });
        },
      }))),
    ],
    name: () => {
      const input = el('input', {
        class: 'name-input', type: 'text', maxlength: String(NAME_LENGTH), autocomplete: 'off', spellcheck: 'false',
        placeholder: 'scrie un nume', 'aria-label': 'Numele de pe locomotivă',
      });
      input.value = style.name;
      input.addEventListener('input', () => {
        const name = cleanName(input.value);
        if (name !== input.value) input.value = name;
        change({ ...style, name: name.trim() }, false);
      });
      return [
        el('p', { class: 'choice-label' }, ['Scrie numele tău sau un nume pentru locomotivă. Apare pe o tăbliță, pe lateral.']),
        input,
        style.name ? el('button', { class: 'workshop-reset', type: 'button', onclick: () => change({ ...style, name: '' }) }, ['Șterge numele']) : null,
      ];
    },
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
    el('div', { class: 'workshop-grid' }, [
      // the locomotive stays in sight while the child chooses (beside the tools, or stuck at the top)
      el('div', { class: 'workshop-view' }, [
        el('div', { class: 'workshop-stage' }, [canvas]),
        el('p', { class: 'workshop-where' }, [`Așa o vei vedea în Ruta ${loco.route} · ${loco.journey}`]),
      ]),
      el('div', { class: 'workshop-tools' }, [
        el('div', { class: 'tools', role: 'tablist', 'aria-label': 'Ce decorezi' }, tabs),
        panel,
        saved,
        el('div', { class: 'workshop-actions' }, [reset, el('a', { class: 'workshop-other', href: '#' }, ['🚂 Altă locomotivă'])]),
      ]),
    ]),
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
// the name plates are written with the game's font: painted again once it has come
document.fonts?.ready.then(() => drawPictures(true));
