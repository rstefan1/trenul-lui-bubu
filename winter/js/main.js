/**
 * @file Entry point of the winter journey.
 *
 * Wires the shared engine to the winter route: builds the route and the
 * journey, starts the render loop, shows Bubu's introduction and drives the
 * stops at the stations.
 *
 * Stations have no missions yet: the train simply stops for a few seconds
 * ({@link PLACEHOLDER_STOP}) and leaves again. The missions will plug into
 * the "arrive" event.
 *
 * Testing helpers (URL parameters):
 *   ?from=<station id>   start stopped at that station (e.g. ?from=ilva-mica)
 *   ?speed=<factor>      run the journey faster (e.g. ?speed=4)
 *   ?skip                skip the introduction
 *   ?at=<seconds>        skip the introduction and fast-forward the journey
 */

import { GameLoop } from '../../shared/js/core/loop.js';
import { clamp } from '../../shared/js/core/math.js';
import { Stage } from '../../shared/js/core/stage.js';
import { Journey } from '../../shared/js/journey/journey.js';
import { Route } from '../../shared/js/journey/route.js';
import { loadBubu } from '../../shared/js/train/bubu.js';
import { Hud } from '../../shared/js/ui/hud.js';
import { setupFullscreen, showOverlay } from '../../shared/js/ui/screens.js';
import { WorldView } from '../../shared/js/world/world-view.js';
import { WINTER_ROUTE } from './route-data.js';

/** Seconds the train waits in a station, until the missions exist. */
const PLACEHOLDER_STOP = 4;
/** Seconds between pressing "Hai la drum!" and the train moving off. */
const START_DELAY = 1.2;

const params = new URLSearchParams(location.search);
const timeScale = clamp(Number(params.get('speed')) || 1, 0.25, 20);

const canvas = /** @type {HTMLCanvasElement} */ (document.getElementById('game'));
const stage = new Stage(canvas);
const route = new Route(WINTER_ROUTE);
const journey = new Journey(route);
const startIndex = Math.max(0, route.stations.findIndex(s => s.id === params.get('from')));
journey.placeAt(startIndex);

const world = new WorldView(stage, journey);
const hud = new Hud(route, { month: 11, dayLabels: { 24: 'Ajunul Crăciunului', 25: 'Crăciunul' } });
setupFullscreen(/** @type {HTMLButtonElement} */ (document.getElementById('btnFullscreen')));
loadBubu('../shared/assets/bubu.webp');

/** Pending departure: seconds left (counted in game time, so ?speed applies). */
let departIn = Infinity;

journey.on('arrive', station => {
  hud.showStation(station.name);
  if (journey.state !== 'finished') departIn = PLACEHOLDER_STOP;
});
journey.on('finish', () => {
  setTimeout(showFinale, 2500);
});

const loop = new GameLoop(dt => {
  const step = dt * timeScale;
  if (departIn !== Infinity) {
    departIn -= step;
    if (departIn <= 0) {
      departIn = Infinity;
      journey.depart();
    }
  }
  journey.update(step);
  world.update(step);
  render();
  hud.update(journey);
});

function render() {
  const ctx = stage.ctx;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.fillStyle = '#0b1a3a';
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  stage.applyTransform(ctx);
  ctx.save();
  ctx.beginPath();
  ctx.rect(stage.viewLeft, stage.viewTop, stage.viewRight - stage.viewLeft, stage.viewBottom - stage.viewTop);
  ctx.clip();
  world.draw(ctx);
  ctx.restore();
}

async function showIntro() {
  if (!params.has('skip')) {
    await showOverlay(/** @type {HTMLElement} */ (document.getElementById('intro')),
      /** @type {HTMLElement} */ (document.getElementById('btnStart')));
  }
  hud.showStation(journey.station.name, 2.5);
  departIn = START_DELAY;
}

async function showFinale() {
  await showOverlay(/** @type {HTMLElement} */ (document.getElementById('finale')),
    /** @type {HTMLElement} */ (document.getElementById('btnAgain')));
  location.reload();
}

/**
 * Simulates `seconds` of play instantly (testing helper, see ?at).
 * @param {number} seconds
 */
function fastForward(seconds) {
  departIn = 0;
  const step = 1 / 30;
  for (let t = 0; t < seconds; t += step) {
    if (departIn !== Infinity && (departIn -= step) <= 0) {
      departIn = Infinity;
      journey.depart();
    }
    journey.update(step);
    world.update(step);
  }
}

loop.start();
if (params.has('at')) fastForward(Number(params.get('at')) || 0);
else showIntro();
