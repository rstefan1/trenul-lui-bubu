/**
 * @file The missions of the winter journey.
 *
 * `travel` lists the missions played while the train runs (segment index =
 * position in WINTER_ROUTE.segments, window as fractions of the segment);
 * `stations` maps station ids to the mission played while the train waits
 * there. Mission types are registered in main.js.
 */

/** @type {import('../../shared/js/missions/director.js').MissionPlan} */
export const WINTER_MISSIONS = {
  travel: [
    {
      segment: 0,
      from: 0.06,
      to: 0.9,
      type: 'catch',
      config: {
        id: 'baubles-timisoara-arad',
        title: 'Globurile fugite',
        text: 'Vântul a luat globurile de la târgul din Timișoara! Atinge globurile, ca Bubu să le prindă.',
        count: 8,
        goal: 6,
      },
    },
    {
      segment: 1,
      from: 0.1,
      to: 0.86,
      type: 'delivery',
      config: {
        id: 'gifts-mures-valley',
        title: 'Daruri pe Valea Mureșului',
        text: 'Copiii din sate așteaptă daruri. Când trenul se oprește lângă un copil, atinge ecranul ca Bubu să-i arunce darul.',
        houses: 6,
        empty: 2,
        spare: 2,
        pace: { far: 520, brake: 450 },
      },
    },
    {
      segment: 2,
      from: 0.08,
      to: 0.85,
      type: 'bells',
      config: {
        id: 'bells-deva-alba',
        title: 'Clopoțeii de pe linie',
        text: 'Acum conduci tu trenul! Un clopoțel sună doar dacă treci pe sub el cu viteza cerută. Alege ÎNCET sau REPEDE din butoanele din stânga.',
        bells: 6,
      },
    },
    {
      segment: 3,
      from: 0.08,
      to: 0.9,
      type: 'sequence',
      config: {
        id: 'lights-alba-cluj',
        title: 'Beculețele în ordine',
        text: 'Uită-te în ce ordine se aprind beculețele. Apoi atinge-le și tu în aceeași ordine.',
        rounds: 3,
        start: 2,
      },
    },
    {
      segment: 4,
      from: 0.1,
      to: 0.86,
      type: 'candles',
      config: {
        id: 'candles-cluj-dej',
        title: 'Lumânări la ferestre',
        text: 'E noapte. Atinge casele unde un copil stă la fereastră, ca Bubu să-i aprindă o lumânare.',
        houses: 5,
        empty: 1,
        pace: { far: 520, slow: 110, brake: 450, near: { ahead: 60, behind: 420 } },
      },
    },
    {
      segment: 5,
      from: 0.06,
      to: 0.62,
      type: 'connect-stars',
      config: {
        id: 'stars-dej-ilva',
        title: 'Steaua colindătorilor',
        text: 'Pe cer apar stele cu numere. Atinge-le în ordine: 1, 2, 3… Ce desen apare?',
        shapes: ['star', 'tree'],
      },
    },
    {
      segment: 6,
      from: 0.04,
      to: 0.97,
      type: 'photo',
      config: {
        id: 'photos-viaducts',
        title: 'Fotografii de pe viaducte',
        text: 'Când trenul trece pe un viaduct, caută un animal în vale. Atinge-l ca să-i faci o fotografie.',
        animals: ['🦌', '🦊', '🦉', '🐇'],
        pace: { far: 480, slow: 120 },
      },
    },
    {
      segment: 7,
      from: 0.4,
      to: 0.98,
      type: 'snowbound',
      config: {
        id: 'snowbound',
        title: 'Trenul s-a înzăpezit!',
        text: 'Ninge foarte tare! Un nămete mare a acoperit linia și trenul trebuie să se oprească.',
        digText: 'Ajut-o pe Bubu să dea zăpada la o parte: atinge nămetele de multe ori sau mișcă degetul peste el.',
        signalText: 'E prea multă zăpadă pentru Bubu. Atinge lanterna de 3 ori, ca să cheme plugul de zăpadă!',
        ploughText: 'Vine plugul de zăpadă! El curăță toată linia.',
      },
    },
    {
      segment: 8,
      from: 0.33,
      to: 0.92,
      type: 'forest-stops',
      config: {
        id: 'forest-friends',
        title: 'Prietenii pădurii',
        text: 'Animalele pădurii vor să meargă cu trenul! Când vezi un animal care așteaptă, apasă „Oprește trenul”. După ce urcă, apasă „Pornește trenul”.',
        animals: [
          { emoji: '🦊', stop: 'Stația Vulpiței' },
          { emoji: '🐇', stop: 'Stația Iepurașului' },
          { emoji: '🐻', stop: 'Stația Ursulețului' },
        ],
      },
    },
    {
      segment: 9,
      from: 0.08,
      to: 0.9,
      type: 'snowflake',
      config: {
        id: 'snowflakes-campulung-gura',
        title: 'Fulgii gemeni',
        text: 'Uită-te la fulgul din căsuța de sus, din stânga. Atinge fulgii care arată exact la fel!',
        goal: 6,
        models: 2,
      },
    },
    {
      segment: 10,
      from: 0.08,
      to: 0.9,
      type: 'frost',
      config: {
        id: 'frost-gura-suceava',
        title: 'Flori de gheață',
        text: 'Pe geam au apărut flori de gheață! Mișcă degetul pe geam ca să vezi ce se ascunde dedesubt.',
        pictures: ['fortress', 'star', 'sleigh'],
      },
    },
    {
      segment: 11,
      from: 0.1,
      to: 0.86,
      type: 'birds',
      config: {
        id: 'birds-suceava-radauti',
        title: 'Păsărelele de iarnă',
        text: 'Iarna, păsările găsesc greu mâncare. Atinge căsuțele goale lângă care așteaptă păsări, ca Bubu să le pună semințe.',
        feeders: 6,
        full: 2,
        pace: { far: 520, slow: 110, brake: 450, near: { ahead: 60, behind: 420 } },
      },
    },
    {
      segment: 12,
      from: 0.12,
      to: 0.8,
      type: 'whistle',
      config: {
        id: 'whistle-bucovina',
        title: 'Fluierul trenului',
        text: 'Copiii au ieșit lângă linie să vadă trenul. Când treci pe lângă ei, apasă „Fluieră!”.',
        groups: 3,
        pace: { far: 540, slow: 150, brake: 450, near: { ahead: 60, behind: 420 } },
      },
    },

  ],

  moments: [
    {
      segment: 1,
      at: 0.47,
      kicker: 'Surpriză',
      title: 'Ninge! ❄️',
      text: 'Primii fulgi de zăpadă! Uită-te cum se face totul alb.',
    },
    {
      segment: 5,
      at: 0.667,
      kicker: 'Ora 00:00',
      title: 'E Crăciun! 🎄',
      text: 'Clopotele bat la miezul nopții. Crăciun fericit!',
    },
    {
      segment: 11,
      at: 0.02,
      kicker: 'Suceava – Rădăuți',
      title: 'Cu trenul cel mic',
      text: 'Bubu merge mai departe cu un tren mic și verde. Se face ziuă!',
    },
    {
      segment: 12,
      at: 0.04,
      kicker: 'Bună dimineața!',
      title: 'Răsare soarele',
      text: 'Soarele răsare peste dealuri. Mai e puțin până la Putna!',
    },
  ],

  stations: {
    timisoara: {
      ambience: 'station',
      type: 'departure',
      config: {
        id: 'departure-timisoara',
        title: 'Plecarea din Timișoara',
        text: 'Înainte de drum, completează biletul lui Bubu.',
        ticket: {
          train: 'IR 1765',
          from: 'Timișoara Nord',
          to: 'Putna',
          change: 'Suceava',
          date: '24 decembrie',
          time: '15:00',
          car: 3,
          seat: 45,
        },
        locoColors: [
          { color: '#d8382f', label: 'roșie' },
          { color: '#2e8b57', label: 'verde' },
          { color: '#2f6fd0', label: 'albastră' },
          { color: '#7e57c2', label: 'mov' },
          { color: '#f08a24', label: 'portocalie' },
          { color: '#e8559a', label: 'roz' },
        ],
        needed: [
          { id: 'scarf', icon: '🧣', label: 'Fularul' },
          { id: 'gloves', icon: '🧤', label: 'Mănușile' },
          { id: 'socks', icon: '🧦', label: 'Șosetele groase' },
          { id: 'gifts', icon: '🎁', label: 'Cadourile' },
          { id: 'toothbrush', icon: '🪥', label: 'Periuța de dinți' },
          { id: 'torch', icon: '🔦', label: 'Lanterna' },
        ],
        useless: [
          { id: 'swimsuit', icon: '🩱', label: 'Costumul de baie', reply: 'Costum de baie? Brrr! Afară sunt minus zece grade!' },
          { id: 'ring', icon: '🛟', label: 'Colacul de înot', reply: 'Nu mergem la mare, mergem la munte, prin zăpadă!' },
          { id: 'parasol', icon: '⛱️', label: 'Umbrela de plajă', reply: 'Umbrela de plajă o luăm vara. Acum e iarnă!' },
          { id: 'flipflops', icon: '🩴', label: 'Șlapii', reply: 'Cu șlapii prin zăpadă? Nici vorbă!' },
          { id: 'watermelon', icon: '🍉', label: 'Pepenele', reply: 'Pepene în decembrie? Mai bine luăm cozonac!' },
        ],
        boardingText: 'În ce vagon are loc Bubu? Uită-te pe bilet, apoi atinge vagonul.',
        tip: 'Numărul vagonului e scris pe tren, pe o tăbliță albă.',
      },
    },

    arad: {
      ambience: 'town',
      type: 'rotate-puzzle',
      config: {
        id: 'puzzle-arad',
        title: 'Ceasul din Arad',
        text: 'Vântul a răsucit piesele imaginii. Atinge piesele ca să le întorci la loc!',
        picture: 'arad-city-hall',
        grid: 4,
        solvedText: 'Ceasul din turn arată ora 16:00. Trenul pleacă la 16:03, deci repede înapoi în tren!',
        fact: 'Primăria din Arad se numește Palatul Administrativ. Are un turn înalt, cu ceas.',
      },
    },

    deva: {
      ambience: 'hilltop',
      type: 'lantern',
      config: {
        id: 'lanterns-deva',
        title: 'Felinarele Cetății Deva',
        text: 'Cetatea Deva este sus, pe un deal. Bubu urcă până acolo cu un lift care merge pe deal.',
        lightText: 'S-au stins felinarele de pe ziduri! Mută lanterna lui Bubu peste un felinar și ține-o acolo până se aprinde.',
        windText: 'Vântul a stins un felinar. Aprinde-l din nou!',
        doneText: 'Toate felinarele ard! Cetatea se vede din tren.',
        fact: 'Dealul pe care stă Cetatea Deva a fost, demult, un vulcan.',
        flag: 'deva-fortress-lit',
      },
    },

    'alba-iulia': {
      ambience: 'fortress',
      type: 'maze',
      config: {
        id: 'maze-alba-iulia',
        title: 'Labirintul cetății',
        text: 'Aleile din cetate sunt un labirint! Du-o pe Bubu la brad și adună stelele. Atinge aleea pe unde vrei să meargă.',
        hidden: 3,
        doneText: 'Bubu a ajuns la bradul din mijlocul cetății!',
        fact: 'Cetatea Alba Carolina are forma unei stele. Aici s-a hotărât Marea Unire, la 1 Decembrie 1918.',
      },
    },

    'cluj-napoca': {
      ambience: 'town',
      type: 'circuit',
      config: {
        id: 'circuit-cluj',
        title: 'Bradul din Piața Unirii',
        text: 'Bradul din piață nu se aprinde. Atinge bucățile de cablu ca să le rotești după linia punctată, până la brad.',
        doneText: 'Bradul s-a aprins și toată piața strălucește!',
        fact: 'În Piața Unirii din Cluj-Napoca este Biserica Sfântul Mihail, una dintre cele mai mari biserici din țară.',
      },
    },

    dej: {
      ambience: 'yard',
      type: 'switches',
      config: {
        id: 'switches-dej',
        title: 'Macazurile din Dej',
        text: 'Vagonul cu daruri trebuie să ajungă pe linia cerută. Atinge cercurile albastre ca să muți macazurile, apoi pornește trenul.',
        levels: [2, 3],
        doneText: 'Toate vagoanele cu daruri au ajuns pe liniile bune!',
        fact: 'Macazul este o bucată de șină care se mută și alege drumul trenului. Funcționează ca „dacă… atunci…” dintr-un program.',
      },
    },

    'ilva-mica': {
      type: 'rhythm',
      config: {
        id: 'carollers-ilva',
        title: 'Colindătorii din gară',
        text: 'Au venit colindătorii! Atinge ecranul când nota ajunge în cercul tobei.',
        // the notes caught play "Clopoței, clopoței" (the tune of "Jingle Bells")
        tempo: 80,
        beats: [0, 1, 2, 4, 5, 6, 8, 9, 10, 11, 12, 16, 17, 18, 19, 20, 21, 22, 24, 25, 26, 27, 28, 30],
        melody: ['E5', 'E5', 'E5', 'E5', 'E5', 'E5', 'E5', 'G5', 'C5', 'D5', 'E5', 'F5', 'F5', 'F5', 'F5', 'F5', 'E5', 'E5', 'E5', 'D5', 'D5', 'E5', 'D5', 'G5'],
        doneText: 'Colindătorii i-au dat lui Bubu un colac cald!',
        fact: 'În noaptea de Ajun, copiii merg cu colindul din casă în casă. Primesc colaci, mere și nuci.',
      },
    },
    'vatra-dornei': {
      ambience: 'fair',
      type: 'fair',
      config: {
        id: 'fair-vatra-dornei',
        title: 'Târgul fermecat',
        text: 'Pe deal s-a deschis un târg fermecat, unde vând doar animalele pădurii! Bubu urcă până acolo cu sania.',
        climbText: 'Mișcă sania în sus și în jos și prinde bănuții 🪙. Cu ei vei cumpăra un brad!',
        fairText: 'Alege un brad pentru bunici. Pe vagon încape un brad de cel mult 1,80 m. Ai grijă să ai destui bănuți!',
        trees: [{ height: 1.2, price: 5 }, { height: 1.6, price: 8 }, { height: 2.1, price: 6 }, { height: 2.6, price: 9 }],
        maxHeight: 1.8,
        flag: 'tree-bought',
        doneText: 'Bradul e pe vagon și merge cu noi până la Putna!',
        fact: 'Vatra Dornei este un oraș de munte, cunoscut pentru apa minerală.',
      },
    },
    mestecanis: {
      ambience: 'forest',
      type: 'eyes',
      config: {
        id: 'eyes-mestecanis',
        title: 'Ochii din pădure',
        text: 'În pădurea întunecată clipesc perechi de ochi. Atinge-i ca să vezi ce animale sunt!',
        animals: ['🦉', '🦊', '🦌', '🐿️', '🐻'],
        doneText: 'Toate animalele pădurii au ieșit să vadă trenul lui Bubu!',
        fact: 'Mestecăniș este un pas de munte, adică un loc pe unde drumul trece peste munți.',
      },
    },
    campulung: {
      type: 'memory',
      config: {
        id: 'spoons-campulung',
        title: 'Muzeul lingurilor de lemn',
        text: 'Bubu vizitează un muzeu cu linguri de lemn. Uită-te bine la linguri, apoi găsește perechile!',
        motifs: ['star', 'heart', 'sun', 'fir'],
        doneText: 'Ai găsit toate perechile de linguri!',
        fact: 'La Câmpulung Moldovenesc este un muzeu cu mii de linguri de lemn, adunate de un singur om.',
      },
    },
    'gura-humorului': {
      ambience: 'monastery',
      type: 'paint',
      config: {
        id: 'paint-voronet',
        title: 'Pictează Voronețul',
        text: 'Ajut-o pe Bubu să picteze biserica! Alege o culoare de jos, apoi atinge părțile cu același număr.',
        doneText: 'Biserica e gata pictată!',
        fact: 'Mănăstirea Voroneț este pictată și pe dinafară. Albastrul ei se numește „albastru de Voroneț”.',
      },
    },
    suceava: {
      ambience: 'station',
      type: 'change-train',
      config: {
        id: 'change-suceava',
        title: 'Schimbăm trenul',
        text: 'Aici Bubu schimbă trenul. Uită-te pe bilet unde merge Bubu, apoi atinge pe tabelă trenul potrivit.',
        platformText: 'Acum atinge trenul de la linia scrisă pe tabelă.',
        destination: 'Putna',
        train: 'regional',
        departures: [
          { time: '06:35', to: 'București Nord', platform: 1 },
          { time: '06:50', to: 'Putna', via: 'Rădăuți', platform: 2, ok: true },
          { time: '07:05', to: 'Iași', platform: 3 },
          { time: '07:20', to: 'Vatra Dornei', platform: 1 },
        ],
        doneText: 'Bubu și bradul ei au urcat în trenul spre Putna!',
        fact: 'Suceava a fost capitala Moldovei pe vremea lui Ștefan cel Mare.',
      },
    },
    radauti: {
      ambience: 'street',
      type: 'costume',
      config: {
        id: 'costume-radauti',
        title: 'O pălărie pentru Bubu',
        text: 'La târgul din Rădăuți, Bubu probează pălării de sărbătoare. Alege una, apoi apasă „Gata!”.',
        doneText: 'Bubu e gata de sărbătoare!',
        fact: 'De sărbători, bărbații din Bucovina poartă pălării negre cu mărgele, flori sau pene.',
      },
    },
    putna: {
      ambience: 'putna',
      type: 'putna',
      config: {
        id: 'christmas-putna',
        title: 'Crăciun la Putna',
        text: 'Am ajuns la Mănăstirea Putna! Atinge clopotul de 3 ori.',
        treeText: 'Bradul lui Bubu a ajuns! Atinge bradul ca să agăți globurile prinse pe drum.',
        rings: 3,
        doneText: 'Clopotul a sunat, iar bradul lui Bubu strălucește!',
        fact: 'Mănăstirea Putna a fost construită de Ștefan cel Mare. Tot aici este și mormântul lui.',
      },
    },

  },
};
