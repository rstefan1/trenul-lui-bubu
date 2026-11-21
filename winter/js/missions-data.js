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
        text: 'Vântul a luat globurile din târgul de Crăciun din Timișoara! Atinge-le, ca Bubu să le prindă cu plasa ei fermecată și să împodobească tot trenul.',
        count: 'fill',
        goal: 0.8,
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
        text: 'În satele de pe Valea Mureșului, copiii așteaptă în curte. Trenul oprește lângă fiecare copil care așteaptă: atunci atinge ecranul, ca Bubu să-i arunce un dar în cercul auriu.',
        houses: 12,
        empty: 3,
        spare: 3,
        pace: { far: 520 },
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
        text: 'Acum conduci tu trenul! Pe firul electric atârnă clopoței, iar fiecare sună doar dacă treci pe sub el cu viteza scrisă pe tăbliță. Alege viteza cu butoanele din dreapta: ÎNCET, MEDIU sau REPEDE. Deasupra trenului vezi ce viteză vrea următorul clopoțel.',
        bells: 9,
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
        text: 'Bubu vrea o ghirlandă de beculețe pentru tren! Uită-te în ce ordine se aprind beculețele, apoi atinge-le în aceeași ordine. La fiecare rundă reușită, pe tren se mai aprinde o bucată de ghirlandă.',
        rounds: 4,
        start: 3,
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
        text: 'E noapte. În unele case, câte un copil stă la geam și așteaptă trenul lui Bubu. Atinge casele unde vezi un copil la fereastră, ca Bubu să-i aprindă o lumânare de Crăciun.',
        houses: 12,
        empty: 4,
        pace: { far: 480, slow: 100 },
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
        text: 'Se apropie miezul nopții. Pe cer apar stele cu numere: atinge-le în ordine, 1, 2, 3…, și vezi ce desen apare!',
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
        text: 'Urmează viaductele cele mai frumoase! Când trenul trece pe un viaduct, uită-te în vale: acolo e un animal. Atinge-l ca să-l fotografiezi.',
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
        text: 'Ninge atât de tare încât un nămete uriaș a acoperit linia. Trenul trebuie să oprească!',
        digText: 'Ajut-o pe Bubu să curețe zăpada: freacă nămetele cu degetul sau cu mouse-ul (ține apăsat și mișcă), sau atinge-l de multe ori.',
        signalText: 'Restul zăpezii e prea mult pentru Bubu. Atinge lanterna de 3 ori, ca să facă semn plugului de zăpadă!',
        ploughText: 'Vine plugul de zăpadă! El curăță linia până la capăt.',
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
        text: 'Animalele pădurii vor să meargă cu trenul la Câmpulung! Când apare bula cu animalul care te așteaptă, apasă „Oprește trenul”: trenul oprește singur la stația lui. După ce animalul a urcat, apasă „Pornește trenul”.',
        animals: [
          { emoji: '🦊', stop: 'Stația Vulpiței' },
          { emoji: '🐇', stop: 'Stația Iepurașului' },
          { emoji: '🦌', stop: 'Stația Căprioarei' },
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
        text: 'Pe Valea Moldovei ninge cu fulgi mari. Uită-te la fulgul din chenarul din stânga sus, apoi atinge fulgii care arată exact la fel!',
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
        text: 'E atât de frig încât pe geam au crescut flori de gheață! Freacă geamul (ține apăsat și mișcă degetul sau mouse-ul) ca să vezi ce se ascunde dedesubt.',
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
        text: 'Iarna, păsărelele găsesc greu mâncare. Atinge căsuțele goale lângă care așteaptă păsări flămânde, ca Bubu să le umple cu semințe.',
        feeders: 9,
        full: 3,
        pace: { far: 480, slow: 100 },
      },
    },
    {
      segment: 12,
      from: 0.1,
      to: 0.86,
      type: 'delivery',
      config: {
        id: 'gifts-bucovina',
        title: 'Ultimele daruri',
        text: 'În satele Bucovinei, copiii au ieșit în curte în dimineața de Crăciun. Trenul oprește lângă fiecare copil care așteaptă: atunci atinge ecranul, ca Bubu să-i arunce un dar în cercul auriu.',
        houses: 9,
        empty: 2,
        spare: 3,
        where: 'în satele Bucovinei',
        pace: { far: 520 },
      },
    },
  ],

  moments: [
    {
      segment: 1,
      at: 0.47,
      kicker: 'Surpriză',
      title: 'Ninge! ❄️',
      text: 'Primii fulgi de zăpadă din călătoria lui Bubu! Uită-te cum se albește totul în jur.',
    },
    {
      segment: 5,
      at: 0.667,
      kicker: 'Ora 00:00',
      title: 'E Crăciun! 🎄',
      text: 'Clopotele din sate bat de miezul nopții. Crăciun fericit, Bubu! Crăciun fericit tuturor celor din tren!',
    },
    {
      segment: 11,
      at: 0.02,
      kicker: 'Suceava – Rădăuți',
      title: 'Cu trenul cel mic',
      text: 'Bubu merge mai departe cu un tren regional mic și verde. Se luminează de ziuă!',
    },
    {
      segment: 12,
      at: 0.04,
      kicker: 'Bună dimineața!',
      title: 'Răsare soarele',
      text: 'Soarele răsare peste dealurile Bucovinei. Mai e puțin până la Putna!',
    },
  ],

  stations: {
    timisoara: {
      type: 'departure',
      config: {
        id: 'departure-timisoara',
        title: 'Plecarea din Timișoara',
        text: 'Înainte de drum, completează biletul de tren al lui Bubu.',
        ticket: {
          train: 'IR 1745',
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
        boardingText: 'Uită-te pe bilet: în ce vagon are loc Bubu? Atinge vagonul potrivit, ca Bubu să urce în tren.',
        tip: 'Sfatul călătorului: numărul vagonului e scris pe tren, pe o tăbliță albă.',
      },
    },

    arad: {
      type: 'rotate-puzzle',
      config: {
        id: 'puzzle-arad',
        title: 'Ceasul din Arad',
        text: 'Vântul a răsucit piesele imaginii cu Palatul Administrativ din Arad. Întoarce-le la loc, ca Bubu să vadă cât e ceasul din turn!',
        picture: 'arad-city-hall',
        grid: 4,
        solvedText: 'Ceasul din turn arată ora 16:00. Trenul nostru pleacă din Arad la 16:03 – repede înapoi în vagon!',
        fact: 'Primăria din Arad se numește Palatul Administrativ și are în mijloc un turn înalt, cu ceas, care se vede de departe.',
      },
    },

    deva: {
      type: 'lantern',
      config: {
        id: 'lanterns-deva',
        title: 'Felinarele Cetății Deva',
        text: 'Deasupra orașului, pe un deal, stă Cetatea Devei. Bubu urcă până acolo cu liftul înclinat…',
        lightText: 'Pe ziduri s-au stins felinarele! Plimbă lanterna lui Bubu (cu mouse-ul sau cu degetul) și ține-o pe fiecare felinar până se aprinde.',
        windText: 'Uf! O pală de vânt a stins un felinar. Mai aprinde-l o dată!',
        doneText: 'Toate felinarele ard! Cetatea se vede acum din tren, de departe.',
        fact: 'Cetatea Deva a fost ridicată pe un deal care, cu milioane de ani în urmă, a fost un vulcan. Este pomenită în documente încă din anul 1269.',
        flag: 'deva-fortress-lit',
      },
    },

    'alba-iulia': {
      type: 'maze',
      config: {
        id: 'maze-alba-iulia',
        title: 'Labirintul cetății',
        text: 'Văzute de sus, aleile Cetății Alba Carolina sunt un labirint! Du-o pe Bubu la bradul de Crăciun și adună pe drum stelele ascunse. Atinge o căsuță în linie dreaptă cu Bubu sau trage cu degetul pe alei.',
        hidden: 3,
        doneText: 'Bubu a ajuns la bradul cel mare din mijlocul cetății!',
        fact: 'Cetatea Alba Carolina are forma unei stele cu șapte colțuri. Aici, la 1 Decembrie 1918, s-a hotărât Marea Unire – de aceea 1 Decembrie este Ziua Națională a României.',
      },
    },

    'cluj-napoca': {
      type: 'circuit',
      config: {
        id: 'circuit-cluj',
        title: 'Bradul din Piața Unirii',
        text: 'Bradul cel mare din Piața Unirii nu se aprinde: bucățile de cablu s-au răsucit! Atinge-le ca să le rotești, după linia punctată, ca să ducă curentul de la generator ⚡ până la priza bradului.',
        doneText: 'Bradul s-a aprins și toată piața strălucește!',
        fact: 'În Piața Unirii din Cluj-Napoca se află Biserica Sfântul Mihail, una dintre cele mai mari biserici gotice din România. De Crăciun, aici se ține un târg mare, cu un brad uriaș.',
      },
    },

    dej: {
      type: 'switches',
      config: {
        id: 'switches-dej',
        title: 'Macazurile din Dej',
        text: 'Dej este un nod de cale ferată, cu multe linii. O locomotivă mică trebuie să ducă vagonul cu daruri pe linia cerută. Atinge macazurile (cercurile albastre) ca să le muți SUS sau JOS, apoi pornește trenul.',
        levels: [2, 3, 3],
        doneText: 'Toate vagoanele cu daruri au ajuns pe liniile bune!',
        fact: 'La Dej se întâlnesc linii de cale ferată care vin din mai multe direcții. Macazul este o bucată de șină care se mută și alege pe unde merge trenul – exact ca o instrucțiune „dacă… atunci…” dintr-un program.',
      },
    },

    'ilva-mica': {
      type: 'rhythm',
      config: {
        id: 'carollers-ilva',
        title: 'Colindătorii din gară',
        text: 'E noaptea de Crăciun, iar în gara Ilva Mică au venit colindătorii! Ține ritmul colindului: atinge ecranul (sau apasă Space) când nota ajunge în cercul tobei.',
        tempo: 84,
        beats: [0, 2, 4, 5, 6, 8, 10, 12, 13, 14, 16, 18, 20, 21, 22, 24, 26, 28],
        doneText: 'Colindătorii i-au dăruit lui Bubu un colac cald!',
        fact: 'În noaptea de Ajun, copiii merg cu colindul din casă în casă, iar gazdele le dau colaci, mere și nuci. Steaua purtată de colindători amintește de steaua care i-a călăuzit pe magi.',
      },
    },
    'vatra-dornei': {
      type: 'fair',
      config: {
        id: 'fair-vatra-dornei',
        title: 'Târgul fermecat',
        text: 'Trenul stă mai mult la Vatra Dornei. Bubu urcă pe deal cu sania cu reni, la târgul fermecat de Crăciun.',
        climbText: 'Mișcă sania în sus și în jos (cu mouse-ul sau cu degetul) și prinde bănuții 🪙 de pe drum. Cu bănuții vei cumpăra bradul!',
        fairText: 'Alege un brad pentru bunici. Atenție: pe vagonul trenului încape un brad de cel mult 1,80 m, iar Bubu trebuie să aibă destui bănuți!',
        trees: [{ height: 1.2, price: 5 }, { height: 1.6, price: 8 }, { height: 2.1, price: 6 }, { height: 2.6, price: 9 }],
        maxHeight: 1.8,
        flag: 'tree-bought',
        doneText: 'Bradul e pe vagon și merge cu noi până la Putna!',
        fact: 'Vatra Dornei este o stațiune de munte cunoscută pentru izvoarele ei de apă minerală.',
      },
    },
    mestecanis: {
      type: 'eyes',
      config: {
        id: 'eyes-mestecanis',
        title: 'Ochii din pădure',
        text: 'Pe pasul Mestecăniș, în pădurea întunecată, clipesc perechi de ochi. Atinge-i ca să vezi ce animale stau ascunse!',
        animals: ['🦉', '🦊', '🦌', '🐿️', '🐻'],
        doneText: 'Toate animalele pădurii au ieșit să vadă trenul lui Bubu!',
        fact: 'Mestecăniș este un pas de munte: locul cel mai jos prin care drumurile și căile ferate pot trece dintr-o parte în alta a munților.',
      },
    },
    campulung: {
      type: 'memory',
      config: {
        id: 'spoons-campulung',
        title: 'Muzeul lingurilor de lemn',
        text: 'La Câmpulung Moldovenesc, Bubu vizitează un muzeu plin de linguri de lemn sculptate. Uită-te bine la linguri cât stau întoarse cu fața în sus, apoi găsește perechile la fel!',
        motifs: ['star', 'heart', 'sun', 'fir'],
        doneText: 'Ai găsit toate perechile de linguri sculptate!',
        fact: 'La Câmpulung Moldovenesc se află un muzeu cu mii de linguri de lemn sculptate, adunate de un singur om de-a lungul vieții.',
      },
    },
    'gura-humorului': {
      type: 'paint',
      config: {
        id: 'paint-voronet',
        title: 'Pictează Voronețul',
        text: 'Lângă Gura Humorului este Mănăstirea Voroneț, pictată și pe dinafară. Ajut-o pe Bubu să picteze biserica: alege o culoare de jos, apoi atinge părțile care au același număr.',
        doneText: 'Biserica e pictată, iar pe pereții albaștri au apărut sfinții!',
        fact: 'Mănăstirea Voroneț are pereții pictați și pe dinafară. Albastrul ei este atât de frumos și de rar, încât i se spune „albastru de Voroneț”.',
      },
    },
    suceava: {
      type: 'change-train',
      config: {
        id: 'change-suceava',
        title: 'Schimbăm trenul',
        text: 'Trenul de noapte se oprește aici, la Suceava. Bubu merge mai departe cu alt tren. Uită-te pe biletul lui Bubu (jos), apoi atinge pe tabelă trenul care merge acolo.',
        platformText: 'Acum găsește trenul! Atinge trenul de la linia scrisă pe tabelă.',
        destination: 'Putna',
        train: 'regional',
        departures: [
          { time: '06:35', to: 'București Nord', platform: 1 },
          { time: '06:50', to: 'Putna', via: 'Rădăuți', platform: 2, ok: true },
          { time: '07:05', to: 'Iași', platform: 3 },
          { time: '07:20', to: 'Vatra Dornei', platform: 1 },
        ],
        doneText: 'Bubu și bradul ei au urcat în trenul regional spre Putna!',
        fact: 'Suceava a fost capitala Moldovei pe vremea lui Ștefan cel Mare. Cetatea de Scaun a Sucevei se vede și azi, pe un deal din oraș.',
      },
    },
    radauti: {
      type: 'costume',
      config: {
        id: 'costume-radauti',
        title: 'O pălărie pentru Bubu',
        text: 'La târgul de Crăciun din Rădăuți, Bubu probează pălăriile de sărbătoare din Bucovina! Alege-i una (o poți schimba oricând), apoi apasă „Gata!”.',
        doneText: 'Bubu e gata de sărbătoare, ca o adevărată bucovineancă!',
        fact: 'De sărbători, în Bucovina, bărbații poartă clopuri negre împodobite cu mărgele, flori sau pene, iar femeile își pun basmale colorate.',
      },
    },
    putna: {
      type: 'putna',
      config: {
        id: 'christmas-putna',
        title: 'Crăciun la Putna',
        text: 'Am ajuns la Mănăstirea Putna, în dimineața de Crăciun! Atinge clopotul din turn de 3 ori, ca să vestească slujba.',
        treeText: 'Bradul lui Bubu a ajuns cu bine! Atinge bradul ca să agăți globurile pe care le-ai prins în călătorie.',
        rings: 3,
        doneText: 'Clopotul a vestit Crăciunul, iar bradul lui Bubu strălucește lângă biserică!',
        fact: 'Mănăstirea Putna a fost ridicată de Ștefan cel Mare în anul 1466. Tot aici este și mormântul lui.',
      },
    },

  },
};
