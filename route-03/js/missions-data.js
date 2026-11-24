/**
 * @file The missions of the New Year's Eve journey: what Bubu does on the
 * way and at every station.
 *
 * Bubu works for the forest railway: she checks the children's tickets,
 * feeds the fire of the steam locomotive, sends the other trains off,
 * mends the bridge and the line, fills the wood box and the water tank,
 * checks the wheels and counts the children. At Paltin, the crate the
 * children kept since the camp is opened: it holds the fireworks.
 *
 * Every mission's `fact` (or the facts inside it) teaches something true
 * about the forest railway or the mountains around it. No brand or
 * company names.
 */

import { DAY } from '../../shared/js/world/clock.js';

/**
 * The children of the camp, one at every window of the train: their look
 * (shared/js/gfx/children.js), their coach and their window seat. The seats
 * are the windows of the coaches as the train lists them (back of the train
 * first): coach 3 has seats 0–2, coach 2 has 3–5, coach 1 has 6–8.
 *
 * The first five show their tickets to Bubu at Vișeu de Sus; the others
 * are already on the train, with their teacher.
 */
export const CHILDREN = [
  { look: 0, coach: 1, seat: 6 },
  { look: 1, coach: 2, seat: 3 },
  { look: 2, coach: 3, seat: 0 },
  { look: 3, coach: 1, seat: 8 },
  { look: 4, coach: 2, seat: 5 },
  { look: 5, coach: 3, seat: 2 },
  { look: 6, coach: 1, seat: 7 },
  { look: 7, coach: 2, seat: 4 },
  { look: 8, coach: 3, seat: 1 },
];
/** How many of them show their tickets to Bubu. */
const CHECKED = 5;

/** Set when the children are on the train (after their tickets were checked). */
export const BOARDED_FLAG = 'children-boarded';
/** Set when the children get off at Paltin, for the fireworks. */
export const CLEARING_FLAG = 'children-at-clearing';

/** @type {import('../../shared/js/missions/director.js').MissionPlan} */
export const FOREST_MISSIONS = {
  travel: [
    // Vișeu de Sus → Valea Scradei: Bubu feeds the fire
    {
      segment: 0,
      from: 0.01,
      to: 0.9,
      type: 'stoker',
      config: {
        id: 'stoker-viseu',
        title: 'Fochistul',
        text: 'Locomotiva mocăniței merge cu lemne! Ține acul ceasului de abur în zona verde: când coboară, apasă „Pune lemne!”. Dar nu prea multe, că iese fum negru!',
      },
    },
    // Valea Scradei → Novăț: the wooden bridge broken by the flood…
    {
      segment: 1,
      from: 0.01,
      to: 0.4,
      type: 'bridge-repair',
      config: {
        id: 'bridge-novat',
        title: 'Podul stricat',
        text: 'Viitura din toamnă a smuls scânduri din podul de lemn de peste pârâu. Trenul se oprește înainte de pod: pune scânduri noi în găuri și bate-le cuiele.',
        holes: 4,
        fact: 'Viiturile au stricat de mai multe ori linia mocăniței, dar de fiecare dată oamenii au reparat-o.',
      },
    },
    // …and, further on, signals covered with snow
    {
      segment: 1,
      from: 0.4,
      to: 0.92,
      type: 'snowy-signal',
      config: {
        id: 'signals-novat',
        title: 'Semnalele înzăpezite',
        text: 'Zăpada a acoperit felinarele semnalelor de lângă linie, iar mecanicii nu le mai văd. Trenul se oprește singur: freacă zăpada de pe fiecare semnal.',
        signals: 2,
        fact: 'Semnalele le spun mecanicilor dacă linia e liberă: roșu înseamnă „Oprește!”, verde înseamnă „Poți merge!”.',
      },
    },
    // Novăț → Glîmboaca: stones on the line, and a cracked sleeper
    {
      segment: 2,
      from: 0.01,
      to: 0.92,
      type: 'track-repair',
      config: {
        id: 'track-glimboaca',
        title: 'Linia ruptă',
        text: 'Au căzut pietre de pe munte, iar o traversă de sub șină s-a rupt. Trenul se oprește singur: dă pietrele la o parte și pune o traversă nouă.',
        stones: 3,
        spikes: 2,
        fact: 'Linia mocăniței e îngustă: șinele sunt la 76 de centimetri una de alta, cam jumătate cât la trenurile mari.',
      },
    },
    // Glîmboaca → Cozia: animals on the line
    {
      segment: 3,
      from: 0.01,
      to: 0.94,
      type: 'animals',
      config: {
        id: 'animals-cozia',
        title: 'Animalele de pe linie',
        text: 'În pădurea sălbatică, animalele mai ies pe linie. Când vezi unul, apasă „Fluieră!”: se sperie și fuge în pădure.',
        animals: [
          { emoji: '🦌', name: 'Un cerb' },
          { emoji: '🦊', name: 'O vulpe' },
          { emoji: '🐗', name: 'Un mistreț' },
        ],
        fact: 'În pădurile de pe Valea Vaserului trăiesc cerbi, căprioare, mistreți, vulpi și chiar urși.',
      },
    },
    // Cozia → Novicior: it snows, and the plough pushes through snowdrifts
    {
      segment: 4,
      from: 0.01,
      to: 0.9,
      type: 'stoker',
      config: {
        id: 'snow-novicior',
        title: 'Ninsoarea din pădure',
        text: 'Ninge, iar pe linie sunt nămeți! Plugul locomotivei îi împinge, dar consumă mult abur. Pune lemne pe foc ca acul să stea în zona verde.',
        drifts: 3,
      },
    },
    // Novicior → Paltin: up high it is cold in the coaches; hot tea for the children
    {
      segment: 5,
      from: 0.02,
      to: 0.95,
      type: 'tea',
      config: {
        id: 'tea-paltin',
        title: 'Ceai cald pentru copii',
        text: 'Cu cât urcăm, cu atât e mai frig. Când un copil tremură la geam și spune „Brr!”, atinge-i geamul: Bubu îi aduce o cană de ceai cald.',
        seats: CHILDREN.map(c => c.seat),
        count: 5,
        fact: 'Sus la munte e mai frig decât în vale: cu cât urci mai sus, cu atât aerul e mai rece.',
      },
    },
  ],

  stations: {
    'viseu-de-sus': {
      ambience: 'station',
      type: 'tickets',
      config: {
        id: 'tickets-viseu',
        title: 'Controlorul de bilete',
        text: 'Azi, Bubu lucrează la mocănița din Vișeu de Sus, una dintre ultimele căi ferate forestiere cu abur din Europa. Câțiva copii au urcat deja cu doamna învățătoare; ceilalți vin cu biletele: verifică-le și arată-le vagonul.',
        route: { from: 'Vișeu de Sus', to: 'Paltin', toIcon: '🌲', day: 31, otherPlace: '🏙️ Vișeu de Jos' },
        children: CHILDREN.slice(0, CHECKED).map((c, i) => ({ look: c.look, coach: c.coach, ticket: /** @type {const} */ (['good', 'day', 'good', 'drawing', 'place'])[i] })),
        seats: [[6, 8], [3, 5], [0, 2]],
        aboard: CHILDREN.slice(CHECKED).map(c => c.seat),
        flag: BOARDED_FLAG,
      },
    },
    'valea-scradei': {
      ambience: 'forest',
      type: 'departure-signal',
      config: {
        id: 'signal-scradei',
        title: 'Semnalul de plecare',
        text: 'Linia are un singur fir, așa că trenurile se întâlnesc în gări. Trimite-le pe drum: mută macazul, apoi ridică paleta verde.',
        trains: ['logs', 'trolley'],
        fact: 'Pe o linie cu un singur fir, trenurile se întâlnesc numai în gări. Impiegatul de mișcare le dă voie să plece ridicând paleta.',
      },
    },
    novat: {
      ambience: 'forest',
      type: 'firewood',
      config: {
        id: 'firewood-novat',
        title: 'Lemne pentru locomotivă',
        text: 'Lângă magazia din Novăț e o grămadă de lemne. Umple lada de lângă cabină, dar numai cu lemne bune de pus pe foc!',
        need: 6,
        items: [
          { icon: '🪵', label: 'Lemn uscat de fag', good: true },
          { icon: '🪵', label: 'Butuc uscat', good: true },
          { icon: '🪵', label: 'Lemn uscat de brad', good: true },
          { icon: '🪵', label: 'Lemn uscat', good: true },
          { icon: '🪵', label: 'Butuc de fag uscat', good: true },
          { icon: '🪵', label: 'Bucată de lemn uscat', good: true },
          { icon: '💧', label: 'Buștean ud', good: false, why: 'E ud! Lemnul ud face mult fum și foc puțin.' },
          { icon: '🍄', label: 'Lemn putrezit', good: false, why: 'E putred și moale. Arde prost și nu face abur.' },
          { icon: '🌿', label: 'Crenguțe subțiri', good: false, why: 'Crenguțele ard într-o clipă. Locomotiva are nevoie de lemne groase.' },
          { icon: '❄️', label: 'Bulgăre de zăpadă', good: false, why: 'Zăpada stinge focul! O lăsăm copiilor, la joacă.' },
        ],
        fact: 'Locomotivele mocăniței ard lemne, nu cărbuni. Lemnul uscat face mult abur, iar cel ud mai mult fum decât foc.',
      },
    },
    glimboaca: {
      ambience: 'forest',
      type: 'water-crane',
      config: {
        id: 'water-glimboaca',
        title: 'Apa pentru cazan',
        text: 'Locomotiva are nevoie de apă. Adu brațul macaralei de apă peste locomotivă, ține apăsat ca să curgă apa și oprește-o în zona verde.',
        fact: 'O locomotivă cu abur bea multă apă: o fierbe în cazan, iar aburul o face să meargă. De aceea, în gări sunt macarale de apă.',
      },
    },
    cozia: {
      ambience: 'forest',
      type: 'wheel-tap',
      config: {
        id: 'wheels-cozia',
        title: 'Ciocănitorul de roți',
        text: 'Înainte de urcușul spre Paltin, verificăm roțile vagoanelor. Lovește fiecare roată cu ciocanul: o roată bună sună „ting!”, una crăpată sună „bonc”.',
        cracked: [2, 9],
        fact: 'Revizorii de vagoane lovesc roțile cu un ciocan: o roată bună sună limpede, una crăpată sună înfundat.',
      },
    },
    novicior: {
      ambience: 'forest',
      type: 'headcount',
      config: {
        id: 'headcount-novicior',
        title: 'Numărătoarea',
        text: 'Copiii coboară să se joace în zăpadă. Când îi chemi înapoi, numără-i: e toată lumea în tren?',
        children: CHILDREN.map(c => ({ look: c.look, seat: c.seat })),
        hiding: 4,
        snowmen: 3,
        hideIn: 2,
        fact: 'Înainte de plecare, conductorul se asigură că toți călătorii sunt în tren.',
      },
    },
    paltin: {
      ambience: 'forest',
      type: 'fireworks',
      config: {
        id: 'fireworks-paltin',
        title: 'Lada misterioasă',
        text: 'Am ajuns la Paltin! Copiii deschid lada din tabără: sunt artificii pentru Revelion! Pune rachetele pe semnele din luminiș, departe de brazi și de tren.',
        rockets: 5,
        children: CHILDREN.map(c => c.look),
        flag: CLEARING_FLAG,
        midnight: DAY,
        wish: 'La mulți ani!',
        fact: 'Artificiile le aprind numai oamenii mari, departe de copaci, de case și de oameni. Acum așteptăm miezul nopții…',
      },
    },
  },
};
