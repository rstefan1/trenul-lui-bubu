/**
 * @file The missions of the winter journey.
 *
 * `travel` lists the missions played while the train runs (segment index =
 * position in WINTER_ROUTE.segments, window as fractions of the segment);
 * `stations` maps station ids to the mission played while the train waits
 * there. Mission types are registered in main.js.
 *
 * For now there are only a few missions, to try out each kind.
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
        text: 'În satele de pe Valea Mureșului, copiii așteaptă în curte. Atinge ecranul ca Bubu să arunce un dar: el cade în cercul auriu. Ochește doar curțile unde te așteaptă un copil!',
        houses: 14,
        empty: 4,
        spare: 3,
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
        text: 'Acum conduci tu trenul! Pe firul electric atârnă clopoței, iar fiecare sună doar dacă treci pe sub el cu viteza scrisă pe tăbliță. Alege viteza cu butoanele din dreapta: ÎNCET, MEDIU sau REPEDE. Jos vezi ce clopoței urmează.',
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
      type: 'delivery',
      config: {
        id: 'candles-cluj-dej',
        title: 'Ferestrele cu lumânări',
        text: 'E noapte și copiii așteaptă în casă, la fereastră, cu o lumânare aprinsă. Aruncă darul ca să cadă la ușa lor exact când lumânarea arde – dacă e stinsă, copilul nu-l vede!',
        houses: 12,
        empty: 3,
        spare: 4,
        mode: 'windows',
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
        text: 'Bradul cel mare din Piața Unirii nu se aprinde: s-au încurcat firele! Atinge piesele de pe panou ca să le rotești și du curentul de la generator ⚡ până la brad.',
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
  },
};
