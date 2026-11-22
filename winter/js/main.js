/**
 * @file Entry point of the winter journey.
 *
 * Wires the shared engine to the winter content: builds the route, the
 * journey, the world view and the mission director, starts the render loop
 * and hands over to the campaign (introduction, menu, chapters, saving).
 *
 * The teacher can open every chapter with ?profesor.
 *
 * Testing helpers (URL parameters; they bypass the menu and do not save):
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
import { Campaign } from '../../shared/js/game/campaign.js';
import { ChapterBook } from '../../shared/js/game/chapters.js';
import { SaveStore } from '../../shared/js/game/save.js';
import { GameState } from '../../shared/js/game/state.js';
import { Journey } from '../../shared/js/journey/journey.js';
import { Route } from '../../shared/js/journey/route.js';
import { BellsMission } from '../../shared/js/missions/bells-mission.js';
import { CandlesMission } from '../../shared/js/missions/candles-mission.js';
import { CatchMission } from '../../shared/js/missions/catch-mission.js';
import { CircuitMission } from '../../shared/js/missions/circuit-mission.js';
import { BirdsMission } from '../../shared/js/missions/birds-mission.js';
import { ChangeTrainMission } from '../../shared/js/missions/change-train-mission.js';
import { CostumeMission } from '../../shared/js/missions/costume-mission.js';
import { FrostMission } from '../../shared/js/missions/frost-mission.js';
import { PaintMission } from '../../shared/js/missions/paint-mission.js';
import { WhistleMission } from '../../shared/js/missions/whistle-mission.js';
import { PutnaMission } from '../../shared/js/missions/putna-mission.js';
import { SnowflakeMission } from '../../shared/js/missions/snowflake-mission.js';
import { ConnectStarsMission } from '../../shared/js/missions/connect-stars-mission.js';
import { EyesMission } from '../../shared/js/missions/eyes-mission.js';
import { ForestStopsMission } from '../../shared/js/missions/forest-stops-mission.js';
import { FairMission } from '../../shared/js/missions/fair-mission.js';
import { MemoryMission } from '../../shared/js/missions/memory-mission.js';
import { PhotoMission } from '../../shared/js/missions/photo-mission.js';
import { RhythmMission } from '../../shared/js/missions/rhythm-mission.js';
import { SnowboundMission } from '../../shared/js/missions/snowbound-mission.js';
import { DeliveryMission } from '../../shared/js/missions/delivery-mission.js';
import { DepartureMission } from '../../shared/js/missions/departure-mission.js';
import { LanternMission } from '../../shared/js/missions/lantern-mission.js';
import { MazeMission } from '../../shared/js/missions/maze-mission.js';
import { MissionDirector } from '../../shared/js/missions/director.js';
import { RotatePuzzleMission } from '../../shared/js/missions/rotate-puzzle-mission.js';
import { SequenceMission } from '../../shared/js/missions/sequence-mission.js';
import { SwitchesMission } from '../../shared/js/missions/switches-mission.js';
import { loadBubu } from '../../shared/js/train/bubu.js';
import { ChapterScreens } from '../../shared/js/ui/chapter-screens.js';
import { Hud } from '../../shared/js/ui/hud.js';
import { MissionHud } from '../../shared/js/ui/mission-hud.js';
import { AudioEngine, setupSoundButton } from '../../shared/js/audio/audio.js';
import { clickSound, finaleSound } from '../../shared/js/audio/effects.js';
import { stationChime } from '../../shared/js/audio/instruments.js';
import { Music } from '../../shared/js/audio/music.js';
import { RailSound } from '../../shared/js/audio/rail-sound.js';
import { CLOPOTEI, CRACIUN_FERICIT, FA_LA_LA, NOAPTE_DE_VIS, O_BRAD_FRUMOS } from '../../shared/js/audio/songs.js';
import { setupFullscreen, showOverlay } from '../../shared/js/ui/screens.js';
import { keepScreenAwake } from '../../shared/js/ui/wake-lock.js';
import { WorldView } from '../../shared/js/world/world-view.js';
import { WINTER_CHAPTERS } from './chapters-data.js';
import { WINTER_MISSIONS } from './missions-data.js';
import { WINTER_ROUTE } from './route-data.js';

/** Mission types used by the winter journey. */
const MISSION_TYPES = {
  bells: BellsMission,
  candles: CandlesMission,
  catch: CatchMission,
  circuit: CircuitMission,
  delivery: DeliveryMission,
  departure: DepartureMission,
  lantern: LanternMission,
  maze: MazeMission,
  'rotate-puzzle': RotatePuzzleMission,
  sequence: SequenceMission,
  switches: SwitchesMission,
  'connect-stars': ConnectStarsMission,
  eyes: EyesMission,
  fair: FairMission,
  'forest-stops': ForestStopsMission,
  memory: MemoryMission,
  photo: PhotoMission,
  rhythm: RhythmMission,
  snowbound: SnowboundMission,
  birds: BirdsMission,
  'change-train': ChangeTrainMission,
  costume: CostumeMission,
  frost: FrostMission,
  paint: PaintMission,
  putna: PutnaMission,
  snowflake: SnowflakeMission,
  whistle: WhistleMission,
};

const params = new URLSearchParams(location.search);
const timeScale = clamp(Number(params.get('speed')) || 1, 0.25, 20);
/** Testing: start straight in the journey, without the menu and without saving. */
const testMode = ['from', 'at', 'skip'].some(p => params.has(p));

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
// ------------------------------------------------------------ sound
const audio = new AudioEngine();
audio.register('train', '../shared/assets/sounds/train.mp3');
audio.register('whistle', '../shared/assets/sounds/whistle.mp3', { normalize: true });
audio.register('brakes', '../shared/assets/sounds/brakes.mp3', { normalize: true });
setupSoundButton(audio, /** @type {HTMLButtonElement} */ (byId('btnSound')));
const railSound = new RailSound(audio, 'train', 'brakes');
// every button clicks softly
document.addEventListener('click', e => {
  if (e.target instanceof Element && e.target.closest('button')) clickSound(audio);
});
const music = new Music(audio);
/** The carols the stations take turns with, so the same one does not come back too soon. */
const STATION_SONGS = [O_BRAD_FRUMOS, CLOPOTEI, NOAPTE_DE_VIS, FA_LA_LA, CRACIUN_FERICIT];
/** When the train last reached a station, and how long the carol waits for the chime (ms). */
let arrivedAt = -Infinity;
const CHIME_QUIET = 4000;
/** The overlays (menu, intro, chapter end, finale): "O, brad frumos" plays over them. */
const overlays = [...document.querySelectorAll('.overlay')];

/**
 * The music for what is on screen: carols on the menu, on the chapter
 * screens and while the train waits at a station (the stations take turns
 * through five carols); nothing while the train runs (only the train is
 * heard), and nothing during missions with sounds of their own.
 * @returns {[import('../../shared/js/audio/songs.js').Song | null, number]}
 */
function musicNow() {
  if (overlays.some(o => !o.hidden)) return [O_BRAD_FRUMOS, 0.5];
  if (journey.state === 'running') return [null, 0];
  if (director.active.some(m => m.quietMusic)) return [null, 0];
  // the station's chime first, then the carol
  if (performance.now() - arrivedAt < CHIME_QUIET) return [null, 0];
  return [STATION_SONGS[journey.stationIndex % STATION_SONGS.length], 0.35];
}

const director = new MissionDirector(
  { stage, journey, world, state, hud: missionHud, panel: byId('missionPanel'), audio },
  WINTER_MISSIONS,
  MISSION_TYPES,
);

// the train shows what the player chose and collected
state.on('change', (/** @type {string} */ what) => {
  if (what === 'locoColor') world.train.setLocoColor(state.locoColor);
  if (what === 'baubles') world.train.baubles = state.baubles;
  if (what === 'lightBulbs') world.train.lightBulbs = state.lightBulbs;
  if (what === 'hat') world.train.hat = state.hat;
  if (what === 'flags') {
    world.flags = state.flags;
    world.train.setTreeWagon(state.flags.has('tree-bought'));
  }
});
journey.on('arrive', (/** @type {import('../../shared/js/journey/route.js').Station} */ station) => {
  hud.showStation(station.name);
  // the station's chime, once the brakes have gone quiet (the carol waits for it)
  arrivedAt = performance.now();
  setTimeout(() => stationChime(audio), 900);
  // passengers brought on board by a mission get off at the next station
  if (world.train.passengers.length) setTimeout(() => world.train.leaveAll(), 700);
});

// ------------------------------------------------------------ input and loop
const input = new PointerInput(stage);
input.on('down', (/** @type {import('../../shared/js/core/input.js').PointerInfo} */ p) => director.pointerDown(p));
input.on('move', (/** @type {import('../../shared/js/core/input.js').PointerInfo} */ p) => director.pointerMove(p));
input.on('up', (/** @type {import('../../shared/js/core/input.js').PointerInfo} */ p) => director.pointerUp(p));

setupFullscreen(/** @type {HTMLButtonElement} */ (byId('btnFullscreen')));
keepScreenAwake();

loadBubu('../shared/assets/bubu.webp');
// texts painted on the train (car numbers) need the game font
document.fonts?.ready.then(() => world.train.setLocoColor(state.locoColor));

const loop = new GameLoop(dt => {
  // while the child reads a mission's instructions, the game waits
  const step = missionHud.paused ? 0 : dt * timeScale;
  director.update(step);
  journey.update(step);
  world.update(step);
  render();
  hud.update(journey);
  railSound.update(journey.speed, {
    paused: missionHud.paused,
    toStop: journey.toStop,
  });
  music.update(...musicNow());
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

// ------------------------------------------------------------ test mode
async function startTest() {
  director.on('complete', () => setTimeout(async () => {
    finaleSound(audio);
    await showOverlay(byId('finale'), byId('btnAgain'));
    location.reload();
  }, 2500));
  if (params.has('at')) fastForward(Number(params.get('at')) || 0);
  else director.atStation(journey.station);
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

if (params.has('debug')) Object.assign(window, { trenulDebug: { stage, journey, world, state, director, audio } });

loop.start();
if (testMode) {
  startTest();
} else {
  const campaign = new Campaign({
    journey, director, world, state, hud, missionHud,
    store: new SaveStore('trenul-lui-bubu/winter'),
    book: new ChapterBook(route, WINTER_CHAPTERS, WINTER_MISSIONS),
    screens: new ChapterScreens(audio),
    teacher: params.has('profesor'),
  });
  campaign.open();
}
