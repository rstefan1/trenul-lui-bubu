/**
 * @file The missions of the freight journey: what Bubu does on the way and
 * at every station.
 *
 * Bubu drives a freight train with four empty flat wagons from Putna to
 * Vișeu de Jos, where the children of a winter camp wait for her. Their
 * letter (the first mission) lists what they need; it is loaded on the
 * wagons at the stations on the way.
 *
 * Every mission's `fact` (or the facts inside it) teaches something true
 * about the railway or the places it passes. No brand or company names.
 */

/** @type {import('../../shared/js/missions/director.js').MissionPlan} */
export const FREIGHT_MISSIONS = {
  travel: [
    // Putna → Suceava Nord, at sunrise
    {
      segment: 0,
      from: 0.01,
      to: 0.9,
      type: 'signals',
      config: {
        id: 'signals-putna-suceava',
        title: 'Semnalele de pe linie',
        text: 'Tu conduci trenul! La semnalul roșu, apasă „Oprește trenul”. Când se face verde, apasă „Pornește trenul”. Pentru fiecare semnal trecut corect primești o steluță.',
        signals: ['green', 'red', 'green', 'red'],
      },
    },
    // Suceava Nord → Câmpulung Moldovenesc, up the Moldova valley
    {
      segment: 1,
      from: 0.01,
      to: 0.92,
      type: 'straps',
      config: {
        id: 'straps-suceava-campulung',
        title: 'Chingile încărcăturii',
        text: 'Pe Valea Moldovei sunt multe curbe, iar marfa de pe vagon se mișcă! Când o ladă se clatină, atinge-o ca să strângi chinga.',
        load: 'provisions',
        wagon: 0,
        shakes: [3, 0, 4, 2],
      },
    },
    // Câmpulung Moldovenesc → Vatra Dornei: the ramp up to the Mestecăniș pass, before the tunnel
    {
      segment: 2,
      from: 0.01,
      to: 0.64,
      type: 'sand',
      config: {
        id: 'sand-mestecanis',
        title: 'Urcușul cu nisip',
        text: 'Urcăm spre pasul Mestecăniș, iar șinele sunt înghețate. Când roțile patinează și scot scântei, apasă „Nisip!”.',
        slips: 3,
      },
    },
    // Vatra Dornei → Ilva Mică: the viaducts, by day
    {
      segment: 3,
      from: 0.01,
      to: 0.95,
      type: 'arches',
      config: {
        id: 'arches-ilva',
        title: 'Inspectorul de viaducte',
        text: 'Trecem din nou peste viaductele de la Crăciun, acum pe lumină! O arcadă e un gol rotunjit sus, ca o poartă, între doi stâlpi ai viaductului. Numără arcadele fiecărui viaduct și alege numărul corect.',
      },
    },
    // Ilva Mică → Salva: a freight train passes the other way
    {
      segment: 4,
      from: 0.01,
      to: 0.95,
      type: 'passing-train',
      config: {
        id: 'wagons-salva',
        title: 'Ce vagon trece?',
        text: 'Pe linia de alături vine un tren de marfă. În colțul din dreapta vezi ce vagon trebuie să găsești: atinge-l când trece!',
        wagons: ['coal', 'tank', 'covered', 'logs', 'tank', 'coal', 'covered', 'logs', 'tank', 'covered'],
        finds: 3,
      },
    },
    // Salva → Săcel: up to Dealu Ștefăniței and down over the great viaducts
    {
      segment: 5,
      from: 0.01,
      to: 0.92,
      type: 'descent',
      config: {
        id: 'descent-stefanita',
        title: 'Peste Dealu Ștefăniței',
        text: 'Urcușul e foarte greu. Claxonează de două ori: așa îi spui locomotivei din spate să împingă!',
        descentText: 'Coborâm peste marile viaducte, iar trenul încărcat prinde viteză! Ține apăsat „Frânează” ca acul să stea în zona verde.',
        topAt: 0.13,
      },
    },
    // Săcel → Vișeu de Jos: the children of Maramureș wave at the train
    {
      segment: 6,
      from: 0.12,
      to: 0.88,
      type: 'whistle',
      config: {
        id: 'whistle-maramures',
        title: 'Fluierul trenului',
        text: 'Am ajuns în Maramureș! Copiii din sate au ieșit lângă linie să vadă trenul. Când treci pe lângă ei, apasă „Fluieră!”.',
        groups: 5,
        greeting: 'Bună ziua, Bubu!',
        pace: { far: 540, slow: 150, brake: 450, near: { ahead: 60, behind: 420 } },
      },
    },
  ],

  stations: {
    'vatra-dornei': {
      ambience: 'station',
      type: 'balance',
      config: {
        id: 'balance-vatra-dornei',
        title: 'Cântarul vagonului',
        text: 'Încărcăm baxurile de apă minerală pe al treilea vagon. Pune fiecare teanc în stânga sau în dreapta, ca vagonul să stea drept.',
        stacks: [4, 3, 3, 2, 1, 1],
        flag: 'loaded-water',
        crateText: 'Un curier aduce o ladă sigilată pentru copii. Pe ea scrie: „A NU SE DESCHIDE ÎNAINTE DE 31 DECEMBRIE!” Ce-o fi în ea?',
        fact: 'Vatra Dornei este o stațiune cu multe izvoare de apă minerală.',
      },
    },
    'ilva-mica': {
      ambience: 'yard',
      type: 'logs',
      config: {
        id: 'logs-ilva-mica',
        title: 'Buștenii la fix',
        text: 'Ultimul vagon are 12 metri. Alege buștenii care îl umplu exact: fără loc gol și fără să iasă în afară!',
        length: 12,
        logs: [5, 5, 4, 3, 2],
        flag: 'loaded-logs',
        fact: 'Pe Valea Ilvei sunt păduri mari de brad. Lemnele de foc vor încălzi cabana copiilor.',
      },
    },
    salva: {
      ambience: 'yard',
      type: 'coupling',
      config: {
        id: 'coupling-salva',
        title: 'A doua locomotivă',
        text: 'Urcușul spre Dealu Ștefăniței e greu pentru un tren încărcat, așa că o a doua locomotivă ne așteaptă pe linie. Apropie trenul și apasă „Frânează” când ajungi la semnul verde.',
        flag: 'second-loco',
        fact: 'Pe rampele mari, trenurile grele sunt trase de două locomotive.',
      },
    },
    sacel: {
      ambience: 'village',
      type: 'pottery',
      config: {
        id: 'pottery-sacel',
        title: 'Ulciorul negru',
        text: 'Săcel e satul olarilor. Fă un ulcior negru, ca dar pentru copiii din tabără!',
        spins: 4,
        flag: 'jug',
        fact: 'La Săcel, olarii ard oalele într-un cuptor închis, plin de fum. Așa lutul se face negru și lucios.',
      },
    },
    'viseu-de-jos': {
      ambience: 'camp',
      type: 'wishlist',
      config: {
        id: 'wishlist-viseu',
        title: 'Lista copiilor',
        text: 'Am ajuns la Vișeu! Copiii din tabără vin pe rând și spun ce le trebuie. Dă-i fiecăruia ce are nevoie, din vagoane.',
        wagons: [
          { label: 'Vagonul 1', goods: [{ id: 'food', icon: '🥔', label: 'Cartofi și făină' }, { id: 'blankets', icon: '🧶', label: 'Pături de lână' }] },
          { label: 'Vagonul 2', goods: [{ id: 'sleds', icon: '🛷', label: 'Sănii' }] },
          { label: 'Vagonul 3', goods: [{ id: 'water', icon: '💧', label: 'Apă minerală' }] },
          { label: 'Vagonul 4', goods: [{ id: 'logs', icon: '🪵', label: 'Lemne de foc' }] },
        ],
        children: [
          { emoji: '🧒', says: 'Noaptea, în cabană, ne e frig când dormim!', wants: 'blankets' },
          { emoji: '👧', says: 'Afară e zăpadă mare. Vrem să ne dăm pe derdeluș!', wants: 'sleds' },
          { emoji: '👦', says: 'Soba s-a stins și nu mai avem cu ce face focul!', wants: 'logs' },
          { emoji: '🧒', says: 'Am alergat prin zăpadă și ne e sete!', wants: 'water' },
          { emoji: '👧', says: 'Ne e foame! Ce gătim diseară?', wants: 'food' },
        ],
        gift: {
          needs: 'jug', emoji: '👩‍🏫', says: 'Bubu, mi s-a spus că ai adus și un dar din Săcel…', wants: 'jug',
          good: { id: 'jug', icon: '🏺', label: 'Ulciorul negru' },
        },
        endText: 'Și lada misterioasă? Doamna învățătoare zâmbește: „O deschidem pe 31 decembrie, la Revelion. Bubu, rămâi cu noi?”',
        endButton: 'Rămân la Revelion! 🎉',
      },
    },
    campulung: {
      ambience: 'workshop',
      type: 'sled-workshop',
      config: {
        id: 'sleds-campulung',
        title: 'Atelierul de sănii',
        text: 'Meșterii din Câmpulung fac sănii de lemn. Construiește și tu una după model: alege piesele în ordine, de jos în sus.',
        parts: [
          { id: 'runners', icon: '〰️', label: 'Tălpile' },
          { id: 'posts', icon: '🪵', label: 'Picioarele' },
          { id: 'seat', icon: '🟫', label: 'Scândurile' },
          { id: 'rope', icon: '🪢', label: 'Sfoara' },
        ],
        decoys: [
          { id: 'wheels', icon: '🛞', label: 'Roțile', reply: 'Sania nu are roți! Alunecă pe zăpadă, pe tălpi.' },
          { id: 'pedals', icon: '🚲', label: 'Pedalele', reply: 'Pedale? Sania nu e bicicletă! O tragi de sfoară.' },
          { id: 'sail', icon: '⛵', label: 'Pânza', reply: 'Pânza e pentru bărci. Sania merge pe zăpadă, nu pe apă!' },
        ],
        wagon: 1,
        flag: 'loaded-sleds',
        doneText: 'Gata, sania e ca la carte! Meșterii au mai făcut trei, pentru toți copiii.',
        fact: 'La Câmpulung Moldovenesc este Muzeul Arta Lemnului. În Bucovina, meșterii fac din lemn case, porți, linguri și sănii.',
      },
    },
    'suceava-nord': {
      ambience: 'yard',
      type: 'crane',
      config: {
        id: 'crane-suceava',
        title: 'Macaraua din depozit',
        text: 'Încarcă primul vagon cu macaraua! Atinge pe rând lucrurile. Pune întâi lucrurile grele (jos), apoi pe cele ușoare (sus).',
        load: 'provisions',
        wagon: 0,
        items: [
          { item: 'potatoes', label: 'Lada cu cartofi', kg: 40 },
          { item: 'flour', label: 'Sacul cu făină', kg: 50 },
          { item: 'jars', label: 'Lada cu borcane', kg: 30 },
          { item: 'blankets-red', label: 'Păturile roșii', kg: 5 },
          { item: 'blankets-blue', label: 'Păturile albastre', kg: 5 },
        ],
        flag: 'loaded-provisions',
        fact: 'Lucrurile grele stau jos, iar cele ușoare sus. Așa vagonul e stabil și nimic nu se răstoarnă în curbe.',
      },
    },

    putna: {
      ambience: 'putna',
      type: 'driver-check',
      config: {
        id: 'driver-putna',
        title: 'Mecanic pentru o zi',
        text: 'O scrisoare pentru Bubu!',
        letter: {
          from: 'De la copiii din tabăra de iarnă de la Vișeu',
          lines: [
            'Dragă Bubu,',
            'Viscolul din noaptea de Crăciun a închis drumul peste munți. Acum doar trenul mai poate ajunge la noi! Ne-au rămas puține lemne pentru sobă, iar mâncarea se termină.',
            'Ne poți aduce, te rugăm:',
          ],
          needs: [
            { icon: '🍞', label: 'provizii' },
            { icon: '🧶', label: 'pături de lână' },
            { icon: '🛷', label: 'sănii' },
            { icon: '💧', label: 'apă minerală' },
            { icon: '🪵', label: 'lemne de foc' },
          ],
          sign: 'Te așteptăm! Copiii din tabără',
        },
        waybill: {
          train: 'Marfă 80428',
          from: 'Putna',
          to: 'Vișeu de Jos',
          date: '28 decembrie',
          time: '07:50',
          wagons: 'locomotivă diesel și 4 vagoane platformă, goale',
        },
        locoColors: [
          { color: '#e0662c', label: 'portocalie' },
          { color: '#d8382f', label: 'roșie' },
          { color: '#2e8b57', label: 'verde' },
          { color: '#2f6fd0', label: 'albastră' },
          { color: '#7e57c2', label: 'mov' },
          { color: '#f2b705', label: 'galbenă' },
          { color: '#e8559a', label: 'roz' },
          { color: '#17a2b8', label: 'turcoaz' },
          { color: '#1f3c88', label: 'bleumarin' },
          { color: '#5f6b7a', label: 'gri' },
        ],
        checkText: 'Înainte de plecare, mecanicul verifică locomotiva. Atinge pe rând fiecare lucru de pe fișă. Bubu îți arată unde este fiecare.',
        checks: [
          { part: 'headlights', hint: 'Verifică farurile', where: 'în fața locomotivei: un far jos și unul sus', icon: '💡', label: 'Farurile', fact: 'Farurile luminează linia în tunel și pe ceață. Și ziua sunt aprinse, ca trenul să se vadă de departe.' },
          { part: 'wheels', hint: 'Verifică roțile', where: 'jos, sub locomotivă', icon: '⚙️', label: 'Roțile', fact: 'Roțile trenului sunt din oțel. Locomotiva are 12 roți, așezate pe două boghiuri.' },
          { part: 'fuel', hint: 'Verifică rezervorul', where: 'sub locomotivă, între roți', icon: '⛽', label: 'Rezervorul de motorină', fact: 'Locomotiva diesel merge cu motorină. Rezervorul e plin: ajunge până la Vișeu!' },
          { part: 'wagon', hint: 'Verifică vagonul', where: 'primul vagon, chiar în spatele locomotivei', icon: '🚃', label: 'Primul vagon', fact: 'Vagonul e bine cuplat, iar platforma e goală. Pe drum vom umple toate vagoanele cu lucrurile de care au nevoie copiii!' },
          { part: 'horn', hint: 'Sună din claxon', where: 'pe acoperiș, deasupra cabinei din față', icon: '📯', label: 'Claxonul', fact: 'Cu claxonul, mecanicul anunță plecarea și îi avertizează pe toți că vine trenul.' },
        ],
      },
    },
  },
};
