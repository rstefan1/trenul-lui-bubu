/**
 * @file Entry point of the freight journey (Putna → Vișeu de Jos).
 *
 * Wires the shared engine to the freight journey's content: builds the route, the
 * journey, the world view and the mission director, starts the render loop
 * and hands over to the campaign (introduction, menu, chapters, saving).
 *
 * The teacher can open every chapter with ?profesor.
 *
 * Testing helpers (URL parameters; they bypass the menu and do not save):
 *   ?from=<station id>   start stopped at that station (e.g. ?from=salva)
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
import { ArchesMission } from '../../shared/js/missions/arches-mission.js';
import { BalanceMission } from '../../shared/js/missions/balance-mission.js';
import { CouplingMission } from '../../shared/js/missions/coupling-mission.js';
import { DescentMission } from '../../shared/js/missions/descent-mission.js';
import { LogsMission } from '../../shared/js/missions/logs-mission.js';
import { PassingTrainMission } from '../../shared/js/missions/passing-train-mission.js';
import { PotteryMission } from '../../shared/js/missions/pottery-mission.js';
import { WishlistMission } from '../../shared/js/missions/wishlist-mission.js';
import { CraneMission } from '../../shared/js/missions/crane-mission.js';
import { DriverCheckMission } from '../../shared/js/missions/driver-check-mission.js';
import { MissionDirector } from '../../shared/js/missions/director.js';
import { SandMission } from '../../shared/js/missions/sand-mission.js';
import { SawMission } from '../../shared/js/missions/saw-mission.js';
import { TracksMission } from '../../shared/js/missions/tracks-mission.js';
import { SignalsMission } from '../../shared/js/missions/signals-mission.js';
import { SledWorkshopMission } from '../../shared/js/missions/sled-workshop-mission.js';
import { StrapsMission } from '../../shared/js/missions/straps-mission.js';
import { WhistleMission } from '../../shared/js/missions/whistle-mission.js';
import { loadBubu } from '../../shared/js/train/bubu.js';
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
import { WorldView } from '../../shared/js/world/world-view.js';
import { FREIGHT_CHAPTERS } from './chapters-data.js';
import { FREIGHT_MISSIONS } from './missions-data.js';
import { FREIGHT_PLACES, travelPlace } from './ambience-data.js';
import { FREIGHT_ROUTE } from './route-data.js';

/** Mission types used by the freight journey. */
const MISSION_TYPES = {
  arches: ArchesMission,
  balance: BalanceMission,
  coupling: CouplingMission,
  crane: CraneMission,
  descent: DescentMission,
  logs: LogsMission,
  'passing-train': PassingTrainMission,
  pottery: PotteryMission,
  wishlist: WishlistMission,
  'driver-check': DriverCheckMission,
  sand: SandMission,
  saw: SawMission,
  tracks: TracksMission,
  signals: SignalsMission,
  'sled-workshop': SledWorkshopMission,
  straps: StrapsMission,
  whistle: WhistleMission,
};

/**
 * What the flat wagons carry, from the front: each load is put on its
 * wagon by a station mission, which sets the flag.
 * @type {Array<{flag: string, load: string}>}
 */
const WAGON_LOADS = [
  { flag: 'loaded-provisions', load: 'provisions' },
  { flag: 'loaded-sleds', load: 'sleds' },
  { flag: 'loaded-water', load: 'water' },
  { flag: 'loaded-logs', load: 'logs' },
];

const params = new URLSearchParams(location.search);
const timeScale = clamp(Number(params.get('speed')) || 1, 0.25, 20);
/** Testing: start straight in the journey, without the menu and without saving. */
const testMode = ['from', 'at', 'skip'].some(p => params.has(p));

const byId = (/** @type {string} */ id) => /** @type {HTMLElement} */ (document.getElementById(id));

// ------------------------------------------------------------ model and view
const canvas = /** @type {HTMLCanvasElement} */ (byId('game'));
const stage = new Stage(canvas);
const route = new Route(FREIGHT_ROUTE);
const journey = new Journey(route);
const startIndex = Math.max(0, route.stations.findIndex(s => s.id === params.get('from')));
journey.placeAt(startIndex);

const state = new GameState();
const world = new WorldView(stage, journey);
const hud = new Hud(route, { month: 11 });
const missionHud = new MissionHud(state);
world.flags = state.flags;
// ------------------------------------------------------------ sound
const audio = new AudioEngine();
audio.register('train', '../shared/assets/sounds/train.mp3');
audio.register('whistle', '../shared/assets/sounds/whistle.mp3', { normalize: true });
audio.register('brakes', '../shared/assets/sounds/brakes.mp3', { normalize: true });
// the sounds of the places (see ambience-data.js)
for (const [name, file] of [
  ['station-platform', 'railway-station-platform'], ['station-crowd', 'station-crowd'], ['town-square', 'town-square'],
  ['winter-wind', 'winter-wind'], ['freight-train', 'freight-train-passing'],
]) audio.register(name, `../shared/assets/sounds/${file}.mp3`, { normalize: true, lazy: true });
// the water of the rivers along the way, made in code
audio.registerGenerated('river', makeRiver);
setupSoundButton(audio, /** @type {HTMLButtonElement} */ (byId('btnSound')));
// every effect is measured once, so they can all be heard equally well
audio.on('unlock', () => setTimeout(() => balanceSounds(audio), 1500));
const railSound = new RailSound(audio, 'train', 'brakes');
const windSound = new WindSound(audio);
/** The train sounds its whistle this far before a tunnel (stage units); the tunnel it last whistled for. */
const HORN_AHEAD = 700;
let hornedFor = -1;
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
 * The place the train waits at, for its sounds (null while it runs, on the
 * menus, and at stations without a place).
 * @returns {import('./ambience-data.js').FreightPlace | null}
 */
function placeNow() {
  if (overlays.some(o => !o.hidden)) return null;
  if (journey.state === 'running') {
    // on the way: the landscape (nothing inside a tunnel)
    if (world.features.placeAt(journey.distance) === 'tunnel') return null;
    return travelPlace(journey.stationIndex, route.biomeAt(journey.distance));
  }
  // a mission that moves between places (up a forest hill to a fair…) says where it is
  const moving = director.active.find(m => m.soundOfPlace !== undefined);
  const station = route.stations[journey.stationIndex];
  const key = moving ? moving.soundOfPlace : station && FREIGHT_MISSIONS.stations[station.id]?.ambience;
  return key ? FREIGHT_PLACES[key] ?? null : null;
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
  { stage, journey, world, state, hud: missionHud, panel: byId('missionPanel'), audio },
  FREIGHT_MISSIONS,
  MISSION_TYPES,
);

// the train shows what the player chose and collected
state.on('change', (/** @type {string} */ what) => {
  if (what === 'locoColor') world.train.setLocoColor(state.locoColor);
  if (what === 'flags') {
    world.flags = state.flags;
    world.train.setCargo(WAGON_LOADS.map(w => (state.flags.has(w.flag) ? w.load : null)));
    // from Salva, a second locomotive pulls too
    world.train.setHelper(state.flags.has('second-loco'));
  }
});
journey.on('arrive', (/** @type {import('../../shared/js/journey/route.js').Station} */ station) => {
  hud.showStation(station.name);
  // a freight train has no doors to open: only the station's chime
  setTimeout(() => chimeSound(audio), 1500);
});

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
  updateSound();
  canvas.style.cursor = director.wantsPointer ? 'pointer' : 'default';
});

/**
 * How much the place echoes: a big station hall more than a small halt, a
 * tunnel most, the open fields almost not at all.
 */
function roomNow() {
  if (world.features.placeAt(journey.distance) === 'tunnel') return 0.45;
  if (journey.state !== 'running') return route.stations[journey.stationIndex]?.size === 'large' ? 0.3 : 0.18;
  return 0.06;
}

/** The sound problem already reported in the console (reported only once). */
let soundError = '';

/**
 * The sounds that follow the game every frame: the train, the wind, the
 * whistle before tunnels and the music. A failure here is reported once and
 * never stops the rest of the frame (or the other sounds).
 */
function updateSound() {
  const parts = [
    () => railSound.update(journey.speed, {
      paused: missionHud.paused,
      toStop: journey.toStop,
      place: world.features.placeAt(journey.distance),
    }),
    () => windSound.update(world.snow.intensity, missionHud.paused),
    () => {
      // a whistle before every tunnel
      const tunnel = world.features.nextTunnel(journey.distance);
      if (journey.state === 'running' && tunnel - journey.distance < HORN_AHEAD && tunnel !== hornedFor) {
        hornedFor = tunnel;
        audio.play('whistle', 0.6);
      }
    },
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
  Object.assign(window, { trenulDebug: { stage, journey, world, state, director, audio } });
  // compare the landscape at full and at capped resolution (key L or the button)
  const button = document.createElement('button');
  button.className = 'debug-btn';
  button.type = 'button';
  const label = () => { button.textContent = world.landscape.fullResolution ? 'Peisaj: rezoluție întreagă' : 'Peisaj: rezoluție redusă'; };
  const toggle = () => { world.landscape.setFullResolution(!world.landscape.fullResolution); label(); };
  button.addEventListener('click', toggle);
  window.addEventListener('keydown', e => { if (e.code === 'KeyL') toggle(); });
  label();
  document.body.append(button);
}

loop.start();
if (testMode) {
  startTest();
} else {
  const campaign = new Campaign({
    journey, director, world, state, hud, missionHud,
    store: new SaveStore('trenul-lui-bubu/route-02'),
    book: new ChapterBook(route, FREIGHT_CHAPTERS, FREIGHT_MISSIONS),
    screens: new ChapterScreens(audio),
    teacher: params.has('profesor'),
  });
  campaign.open();
}
