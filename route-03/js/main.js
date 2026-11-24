/**
 * @file Entry point of the New Year's Eve journey (Vișeu de Sus → Paltin,
 * on the forest railway).
 *
 * Wires the shared engine to the journey's content: builds the route, the
 * journey, the world view and the mission director, starts the render loop
 * and hands over to the campaign (introduction, menu, chapters, saving).
 * It also draws the smoke of the steam locomotive, keeps the children at
 * the windows of the coaches once they have boarded, and shows the new
 * date after midnight.
 *
 * The teacher can open every chapter with ?profesor.
 *
 * Testing helpers (URL parameters; they bypass the menu and do not save):
 *   ?from=<station id>   start stopped at that station (e.g. ?from=cozia)
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
import { AnimalsOnLineMission } from '../../shared/js/missions/animals-on-line-mission.js';
import { BridgeRepairMission } from '../../shared/js/missions/bridge-repair-mission.js';
import { DepartureSignalMission } from '../../shared/js/missions/departure-signal-mission.js';
import { MissionDirector } from '../../shared/js/missions/director.js';
import { FirewoodMission } from '../../shared/js/missions/firewood-mission.js';
import { FireworksMission } from '../../shared/js/missions/fireworks-mission.js';
import { HeadcountMission } from '../../shared/js/missions/headcount-mission.js';
import { SnowySignalMission } from '../../shared/js/missions/snowy-signal-mission.js';
import { StokerMission } from '../../shared/js/missions/stoker-mission.js';
import { TicketsMission } from '../../shared/js/missions/tickets-mission.js';
import { TrackRepairMission } from '../../shared/js/missions/track-repair-mission.js';
import { WaterCraneMission } from '../../shared/js/missions/water-crane-mission.js';
import { WheelTapMission } from '../../shared/js/missions/wheel-tap-mission.js';
import { loadBubu } from '../../shared/js/train/bubu.js';
import { SteamPlume } from '../../shared/js/train/steam.js';
import { ChapterScreens } from '../../shared/js/ui/chapter-screens.js';
import { Hud } from '../../shared/js/ui/hud.js';
import { MissionHud } from '../../shared/js/ui/mission-hud.js';
import { AudioEngine, setupSoundButton } from '../../shared/js/audio/audio.js';
import { balanceSounds, chimeSound, clickSound, finaleSound, makeRiver, playSound } from '../../shared/js/audio/effects.js';
import { Ambience } from '../../shared/js/audio/ambience.js';
import { Music } from '../../shared/js/audio/music.js';
import { RAIL_VOLUME, RailSound } from '../../shared/js/audio/rail-sound.js';
import { WindSound } from '../../shared/js/audio/wind-sound.js';
import { O_BRAD_FRUMOS } from '../../shared/js/audio/songs.js';
import { setupExitButton, setupFullscreen, showOverlay } from '../../shared/js/ui/screens.js';
import { keepScreenAwake } from '../../shared/js/ui/wake-lock.js';
import { DAY } from '../../shared/js/world/clock.js';
import { WorldView } from '../../shared/js/world/world-view.js';
import { FOREST_CHAPTERS } from './chapters-data.js';
import { BOARDED_FLAG, CHILDREN, CLEARING_FLAG, FOREST_MISSIONS } from './missions-data.js';
import { FOREST_PLACES, travelPlace } from './ambience-data.js';
import { FOREST_ROUTE } from './route-data.js';

/** Mission types used by the New Year's Eve journey. */
const MISSION_TYPES = {
  animals: AnimalsOnLineMission,
  'bridge-repair': BridgeRepairMission,
  'departure-signal': DepartureSignalMission,
  firewood: FirewoodMission,
  fireworks: FireworksMission,
  headcount: HeadcountMission,
  'snowy-signal': SnowySignalMission,
  stoker: StokerMission,
  tickets: TicketsMission,
  'track-repair': TrackRepairMission,
  'water-crane': WaterCraneMission,
  'wheel-tap': WheelTapMission,
};

/** The station missions that move the children themselves (on and off the train). */
const MOVE_CHILDREN = [TicketsMission, HeadcountMission, FireworksMission];

/** What the HUD shows as the date once it is past midnight. */
const NEW_YEAR_DATE = '1 ianuarie · Anul Nou';

const params = new URLSearchParams(location.search);
const timeScale = clamp(Number(params.get('speed')) || 1, 0.25, 20);
/** Testing: start straight in the journey, without the menu and without saving. */
const testMode = ['from', 'at', 'skip'].some(p => params.has(p));

const byId = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));

// ------------------------------------------------------------ model and view
const canvas = /** @type {HTMLCanvasElement} */ (byId('game'));
const stage = new Stage(canvas);
const route = new Route(FOREST_ROUTE);
const journey = new Journey(route);
const startIndex = Math.max(0, route.stations.findIndex(s => s.id === params.get('from')));
journey.placeAt(startIndex);

const state = new GameState();
const world = new WorldView(stage, journey);
const hud = new Hud(route, { month: 11, dayLabels: { 31: 'Revelion' } });
const missionHud = new MissionHud(state);
const steam = new SteamPlume();
world.flags = state.flags;
// ------------------------------------------------------------ sound
const audio = new AudioEngine();
audio.register('train', '../shared/assets/sounds/train.mp3');
audio.register('whistle', '../shared/assets/sounds/whistle.mp3', { normalize: true });
audio.register('brakes', '../shared/assets/sounds/brakes.mp3', { normalize: true });
// the sounds of the places (see ambience-data.js)
for (const [name, file] of [
  ['station-platform', 'railway-station-platform'], ['station-crowd', 'station-crowd'], ['winter-wind', 'winter-wind'],
]) audio.register(name, `../shared/assets/sounds/${file}.mp3`, { normalize: true, lazy: true });
// the water of the Vaser, made in code
audio.registerGenerated('river', makeRiver);
setupSoundButton(audio, /** @type {HTMLButtonElement} */ (byId('btnSound')));
// every effect is measured once, so they can all be heard equally well
audio.on('unlock', () => setTimeout(() => balanceSounds(audio), 1500));
const railSound = new RailSound(audio, 'train', 'brakes');
const windSound = new WindSound(audio);
// every button clicks softly
document.addEventListener('click', e => {
  if (e.target instanceof Element && e.target.closest('button')) clickSound(audio);
});
const music = new Music(audio);
// the places are matched to the running train: never louder than the journey
const ambience = new Ambience(audio, { sound: 'train', volume: RAIL_VOLUME }, (name, o) => playSound(audio, /** @type {any} */ (name), o));
/** The overlays (menu, intro, chapter end, finale): "O, brad frumos" plays over them. */
const overlays = [...document.querySelectorAll('.overlay')];

/**
 * The place the train waits at, for its sounds (null on the menus and at
 * stations without a place).
 * @returns {import('./ambience-data.js').ForestPlace | null}
 */
function placeNow() {
  if (overlays.some(o => !o.hidden)) return null;
  if (journey.state === 'running') return travelPlace(route.biomeAt(journey.distance));
  const station = route.stations[journey.stationIndex];
  const key = station && FOREST_MISSIONS.stations[station.id]?.ambience;
  return key ? FOREST_PLACES[key] ?? null : null;
}

/**
 * The music for what is on screen: a carol on the menu and on the chapter
 * screens (it is still the time of the winter holidays); nothing on the way
 * and at the stations, where only the train and the places are heard.
 * @returns {[import('../../shared/js/audio/songs.js').Song | null, number, {far?: boolean}]}
 */
function musicNow() {
  if (overlays.some(o => !o.hidden)) return [O_BRAD_FRUMOS, 0.5, {}];
  return [null, 0, { far: true }];
}

const director = new MissionDirector(
  // the missions of this journey also reach the locomotive's steam (a jet from the whistle, black smoke)
  /** @type {import('../../shared/js/missions/mission.js').MissionContext} */ ({ stage, journey, world, state, hud: missionHud, panel: byId('missionPanel'), audio, steam }),
  FOREST_MISSIONS,
  MISSION_TYPES,
);

journey.on('arrive', (/** @type {import('../../shared/js/journey/route.js').Station} */ station) => {
  hud.showStation(station.name);
  setTimeout(() => chimeSound(audio), 1500);
});

/**
 * The children at the windows of the coaches: once they have boarded they
 * stay there (also after a chapter is started again), until they get off at
 * Paltin. While one of the missions that move them runs (the tickets, the
 * snowball fight, the fireworks), they are left alone.
 */
function keepChildren() {
  if (director.active.some(m => MOVE_CHILDREN.some(type => m instanceof type))) return;
  const train = world.train;
  const seated = train.passengers.filter(p => p.leaving < 0);
  if (!state.flags.has(BOARDED_FLAG) || state.flags.has(CLEARING_FLAG)) {
    if (seated.length && state.flags.has(CLEARING_FLAG)) train.leaveAll();
    return;
  }
  if (seated.length === CHILDREN.length) return;
  train.passengers = CHILDREN.map(c => ({ emoji: c.emoji, seat: c.seat, leaving: -1 }));
}

/** The smoke of the locomotive: from the top of its chimney, while it is on screen. */
function updateSteam(/** @type {number} */ dt) {
  const r = world.train.locoParts.chimney?.[0];
  const top = r ? world.trainToStage({ x: r[0] + r[2] / 2, y: r[1] + 8 }) : null;
  steam.shade = 1 - 0.6 * world.light.night;
  steam.update(dt, top, journey.speed);
}

// ------------------------------------------------------------ input and loop
const input = new PointerInput(stage);
input.on('down', (/** @type {import('../../shared/js/core/input.js').PointerInfo} */ p) => {
  world.train.lookAt(p.x);   // Bubu turns towards what the child touches
  director.pointerDown(p);
});
input.on('move', (/** @type {import('../../shared/js/core/input.js').PointerInfo} */ p) => director.pointerMove(p));
input.on('up', (/** @type {import('../../shared/js/core/input.js').PointerInfo} */ p) => director.pointerUp(p));

setupFullscreen(/** @type {HTMLButtonElement} */ (byId('btnFullscreen')));
setupExitButton(
  /** @type {HTMLButtonElement} */ (byId('btnExit')), byId('exitDialog'),
  /** @type {HTMLButtonElement} */ (byId('btnExitChapters')), /** @type {HTMLButtonElement} */ (byId('btnExitStay')), missionHud,
);
keepScreenAwake();

loadBubu('../shared/assets/bubu.webp');
// texts painted on the train (coach numbers) need the game font
document.fonts?.ready.then(() => world.train.setLocoColor(state.locoColor));

const dateEl = byId('hudDate');
const loop = new GameLoop(dt => {
  // while the child reads a mission's instructions, the game waits
  const step = missionHud.paused ? 0 : dt * timeScale;
  director.update(step);
  journey.update(step);
  world.update(step);
  keepChildren();
  updateSteam(step);
  render();
  hud.update(journey);
  // past midnight it is a new day, in a new month and a new year
  if (journey.clock >= DAY && dateEl.textContent !== NEW_YEAR_DATE) dateEl.textContent = NEW_YEAR_DATE;
  updateSound();
  canvas.style.cursor = director.wantsPointer ? 'pointer' : 'default';
});

/** How much the place echoes: a station a little, the open valley almost not at all. */
function roomNow() {
  return journey.state !== 'running' ? 0.18 : 0.06;
}

/** The sound problem already reported in the console (reported only once). */
let soundError = '';

/**
 * The sounds that follow the game every frame: the train, the wind, the
 * music and the places. A failure here is reported once and never stops the
 * rest of the frame (or the other sounds).
 */
function updateSound() {
  const parts = [
    () => railSound.update(journey.speed, {
      paused: missionHud.paused,
      toStop: journey.toStop,
      place: world.features.placeAt(journey.distance),
    }),
    () => windSound.update(world.snow.intensity, missionHud.paused),
    () => music.update(...musicNow()),
    () => ambience.update(placeNow()),
    () => audio.setSpace(roomNow()),
  ];
  for (const part of parts) {
    try {
      part();
    } catch (err) {
      if (String(err) !== soundError) console.error('Sound:', (soundError = String(err)));
    }
  }
}

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
  // the smoke rises over the world, through the camera's zoom
  ctx.save();
  world.applyZoom(ctx);
  steam.draw(ctx);
  ctx.restore();
  director.draw(ctx);
  ctx.restore();
}

// ------------------------------------------------------------ test mode
async function startTest() {
  director.on('complete', () => setTimeout(async () => {
    finaleSound(audio);
    await showOverlay(byId('finale'), byId('btnAgain'));
    // "Înapoi la meniu": the same page without the test parameters (a reload
    // would only start the tested mission again)
    location.href = location.pathname;
  }, 2500));
  // testing from a later station: the children are already on the train
  if (startIndex > 0) state.setFlag(BOARDED_FLAG);
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

if (params.has('debug')) {
  Object.assign(window, { trenulDebug: { stage, journey, world, state, director, audio, steam } });
}

loop.start();
if (testMode) {
  startTest();
} else {
  const campaign = new Campaign({
    journey, director, world, state, hud, missionHud,
    store: new SaveStore('trenul-lui-bubu/route-03'),
    book: new ChapterBook(route, FOREST_CHAPTERS, FOREST_MISSIONS),
    screens: new ChapterScreens(audio),
    teacher: params.has('profesor'),
  });
  campaign.open();
}
