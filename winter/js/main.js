/**
 * @file Entry point of the winter journey.
 *
 * Wires the shared engine to the winter content: builds the route, the
 * journey, the world view and the mission director, starts the render loop
 * and shows Bubu's introduction.
 *
 * Testing helpers (URL parameters):
 *   ?from=<station id>   start stopped at that station (e.g. ?from=ilva-mica)
 *   ?speed=<factor>      run the journey faster (e.g. ?speed=4)
 *   ?skip                skip the introduction
 *   ?at=<seconds>        skip the introduction and the first station's mission
 *                        and fast-forward the journey
 *   ?debug               expose the game objects as window.trenulDebug (for
 *                        automated tests)
 */

import { PointerInput } from '../../shared/js/core/input.js';
import { GameLoop } from '../../shared/js/core/loop.js';
import { clamp } from '../../shared/js/core/math.js';
import { Stage } from '../../shared/js/core/stage.js';
import { GameState } from '../../shared/js/game/state.js';
import { Journey } from '../../shared/js/journey/journey.js';
import { Route } from '../../shared/js/journey/route.js';
import { CatchMission } from '../../shared/js/missions/catch-mission.js';
import { DeliveryMission } from '../../shared/js/missions/delivery-mission.js';
import { DepartureMission } from '../../shared/js/missions/departure-mission.js';
import { LanternMission } from '../../shared/js/missions/lantern-mission.js';
import { MissionDirector } from '../../shared/js/missions/director.js';
import { RotatePuzzleMission } from '../../shared/js/missions/rotate-puzzle-mission.js';
import { loadBubu } from '../../shared/js/train/bubu.js';
import { Hud } from '../../shared/js/ui/hud.js';
import { MissionHud } from '../../shared/js/ui/mission-hud.js';
import { setupFullscreen, showOverlay } from '../../shared/js/ui/screens.js';
import { WorldView } from '../../shared/js/world/world-view.js';
import { WINTER_MISSIONS } from './missions-data.js';
import { WINTER_ROUTE } from './route-data.js';

/** Mission types used by the winter journey. */
const MISSION_TYPES = {
  catch: CatchMission,
  delivery: DeliveryMission,
  departure: DepartureMission,
  lantern: LanternMission,
  'rotate-puzzle': RotatePuzzleMission,
};

const params = new URLSearchParams(location.search);
const timeScale = clamp(Number(params.get('speed')) || 1, 0.25, 20);

const byId = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));

// ------------------------------------------------------------ model and view
const canvas = /** @type {HTMLCanvasElement} */ (byId('game'));
const stage = new Stage(canvas);
const route = new Route(WINTER_ROUTE);
const journey = new Journey(route);
const startIndex = Math.max(0, route.stations.findIndex(s => s.id === params.get('from')));
journey.placeAt(startIndex);

const state = new GameState();
const world = new WorldView(stage, journey);
const hud = new Hud(route, { month: 11, dayLabels: { 24: 'Ajunul Crăciunului', 25: 'Crăciunul' } });
const missionHud = new MissionHud(state);
world.flags = state.flags;
const director = new MissionDirector(
  { stage, journey, world, state, hud: missionHud, panel: byId('missionPanel') },
  WINTER_MISSIONS,
  MISSION_TYPES,
);

// the train shows what the player chose and collected
state.on('change', (/** @type {string} */ what) => {
  if (what === 'locoColor') world.train.setLocoColor(state.locoColor);
  if (what === 'baubles') world.train.baubles = state.baubles;
  if (what === 'flags') world.flags = state.flags;
});
journey.on('arrive', (/** @type {import('../../shared/js/journey/route.js').Station} */ station) => {
  hud.showStation(station.name);
});
journey.on('finish', () => setTimeout(showFinale, 2500));

// ------------------------------------------------------------ input and loop
const input = new PointerInput(stage);
input.on('down', (/** @type {import('../../shared/js/core/input.js').PointerInfo} */ p) => director.pointerDown(p));
input.on('move', (/** @type {import('../../shared/js/core/input.js').PointerInfo} */ p) => director.pointerMove(p));

setupFullscreen(/** @type {HTMLButtonElement} */ (byId('btnFullscreen')));
loadBubu('../shared/assets/bubu.webp');
// texts painted on the train (car numbers) need the game font
document.fonts?.ready.then(() => world.train.setLocoColor(state.locoColor));

const loop = new GameLoop(dt => {
  const step = dt * timeScale;
  director.update(step);
  journey.update(step);
  world.update(step);
  render();
  hud.update(journey);
  canvas.style.cursor = director.wantsPointer ? 'pointer' : 'default';
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
  director.draw(ctx);
  ctx.restore();
}

// ------------------------------------------------------------ screens
async function showIntro() {
  if (!params.has('skip')) await showOverlay(byId('intro'), byId('btnStart'));
  director.atStation(journey.station);
}

async function showFinale() {
  await showOverlay(byId('finale'), byId('btnAgain'));
  location.reload();
}

/**
 * Simulates `seconds` of play instantly (testing helper, see ?at).
 * @param {number} seconds
 */
function fastForward(seconds) {
  journey.depart();
  const step = 1 / 30;
  for (let t = 0; t < seconds; t += step) {
    director.update(step);
    journey.update(step);
    world.update(step);
  }
}

if (params.has('debug')) Object.assign(window, { trenulDebug: { stage, journey, world, state, director } });

loop.start();
if (params.has('at')) fastForward(Number(params.get('at')) || 0);
else showIntro();
