/**
 * @file The missions of the winter journey.
 *
 * `travel` lists the missions played while the train runs (segment index =
 * position in WINTER_ROUTE.segments, window as fractions of the segment);
 * `stations` maps station ids to the mission played while the train waits
 * there. Mission types are registered in main.js.
 *
 * For now there is one mission of each kind, to try them out.
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
  },
};
