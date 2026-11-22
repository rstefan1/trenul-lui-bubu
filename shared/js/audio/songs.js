/**
 * @file The Christmas songs the game plays, written note by note (both
 * melodies are traditional / public domain).
 *
 * A song is a list of [note, beats] (note as "C5", "F#4", or null for a
 * rest), a tempo, the length of a bar, the beats before the first full bar
 * (a pickup), and one chord root per bar for the soft bass.
 */

/**
 * @typedef {object} Song
 * @property {string} title
 * @property {number} tempo        beats per minute
 * @property {number} bar          beats in a bar
 * @property {number} pickup       beats before the first full bar
 * @property {Array<[string | null, number]>} notes
 * @property {string[]} chords     root of the chord of every bar (after the pickup)
 * @property {boolean} [sleighBells]  jingle bells on every half beat
 */

/** "O, brad frumos" (the tune of "O Tannenbaum"), in 3/4. @type {Song} */
export const O_BRAD_FRUMOS = {
  title: 'O, brad frumos',
  tempo: 96,
  bar: 3,
  pickup: 1,
  notes: [
    ['G4', 1],
    // O, brad frumos, o, brad frumos,
    ['C5', 0.75], ['C5', 0.25], ['C5', 1.5], ['D5', 0.5],
    ['E5', 0.75], ['E5', 0.25], ['E5', 1.5], ['E5', 0.5],
    // cu cetina tot verde
    ['D5', 1], ['E5', 1], ['F5', 1],
    ['B4', 1], ['D5', 1], ['C5', 1],
    ['C5', 2], ['G5', 1],
    // tu ești copac de Crăciun, cu globuri și cu lumini
    ['G5', 0.75], ['G5', 0.25], ['E5', 1], ['A5', 1],
    ['G5', 0.75], ['G5', 0.25], ['F5', 1.5], ['F5', 0.5],
    ['F5', 0.75], ['F5', 0.25], ['D5', 1], ['G5', 1],
    ['F5', 0.75], ['F5', 0.25], ['E5', 1.5], ['G4', 0.5],
    // O, brad frumos, o, brad frumos, cu cetina tot verde
    ['C5', 0.75], ['C5', 0.25], ['C5', 1.5], ['D5', 0.5],
    ['E5', 0.75], ['E5', 0.25], ['E5', 1.5], ['E5', 0.5],
    ['D5', 1], ['E5', 1], ['F5', 1],
    ['B4', 1], ['D5', 1], ['C5', 1],
    ['C5', 3],
    [null, 3],
  ],
  chords: ['C', 'C', 'G', 'C', 'C', 'C', 'G', 'G', 'C', 'C', 'C', 'G', 'C', 'C', 'C'],
};

/** "Clopoței, clopoței" (the tune of "Jingle Bells", refrain), in 4/4. @type {Song} */
export const CLOPOTEI = {
  title: 'Clopoței, clopoței',
  tempo: 116,
  bar: 4,
  pickup: 0,
  sleighBells: true,
  notes: [
    // Clopoței, clopoței, vin cu sania
    ['E5', 1], ['E5', 1], ['E5', 2],
    ['E5', 1], ['E5', 1], ['E5', 2],
    ['E5', 1], ['G5', 1], ['C5', 1.5], ['D5', 0.5],
    ['E5', 4],
    ['F5', 1], ['F5', 1], ['F5', 1.5], ['F5', 0.5],
    ['F5', 1], ['E5', 1], ['E5', 1], ['E5', 0.5], ['E5', 0.5],
    ['E5', 1], ['D5', 1], ['D5', 1], ['E5', 1],
    ['D5', 2], ['G5', 2],
    // Clopoței, clopoței, …
    ['E5', 1], ['E5', 1], ['E5', 2],
    ['E5', 1], ['E5', 1], ['E5', 2],
    ['E5', 1], ['G5', 1], ['C5', 1.5], ['D5', 0.5],
    ['E5', 4],
    ['F5', 1], ['F5', 1], ['F5', 1.5], ['F5', 0.5],
    ['F5', 1], ['E5', 1], ['E5', 1], ['E5', 0.5], ['E5', 0.5],
    ['G5', 1], ['G5', 1], ['F5', 1], ['D5', 1],
    ['C5', 4],
    [null, 4],
  ],
  chords: ['C', 'C', 'C', 'C', 'F', 'C', 'G', 'G', 'C', 'C', 'C', 'C', 'F', 'C', 'G', 'C', 'C'],
};

/** "Noapte de vis" (the tune of "Stille Nacht" / "Silent Night", 1818), in 3/4. @type {Song} */
export const NOAPTE_DE_VIS = {
  title: 'Noapte de vis',
  tempo: 84,
  bar: 3,
  pickup: 0,
  notes: [
    ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
    ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
    ['D5', 2], ['D5', 1], ['B4', 3],
    ['C5', 2], ['C5', 1], ['G4', 3],
    ['A4', 2], ['A4', 1], ['C5', 1.5], ['B4', 0.5], ['A4', 1],
    ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
    ['A4', 2], ['A4', 1], ['C5', 1.5], ['B4', 0.5], ['A4', 1],
    ['G4', 1.5], ['A4', 0.5], ['G4', 1], ['E4', 3],
    ['D5', 2], ['D5', 1], ['F5', 1.5], ['D5', 0.5], ['B4', 1],
    ['C5', 3], ['E5', 3],
    ['C5', 1], ['G4', 1], ['E4', 1], ['G4', 1.5], ['F4', 0.5], ['D4', 1],
    ['C4', 3],
    [null, 3],
  ],
  chords: ['C', 'C', 'C', 'C', 'G', 'G', 'C', 'C', 'F', 'F', 'C', 'C', 'F', 'F', 'C', 'C', 'G', 'G', 'C', 'C', 'C', 'G', 'C', 'C'],
};

/** "Vă dorim un Crăciun fericit" (the tune of "We Wish You a Merry Christmas"), in 3/4. @type {Song} */
export const CRACIUN_FERICIT = {
  title: 'Vă dorim un Crăciun fericit',
  tempo: 132,
  bar: 3,
  pickup: 1,
  notes: [
    ['G4', 1],
    // Vă dorim un Crăciun fericit
    ['C5', 1], ['C5', 0.5], ['D5', 0.5], ['C5', 0.5], ['B4', 0.5],
    ['A4', 1], ['A4', 1], ['A4', 1],
    ['D5', 1], ['D5', 0.5], ['E5', 0.5], ['D5', 0.5], ['C5', 0.5],
    ['B4', 1], ['G4', 1], ['G4', 1],
    ['E5', 1], ['E5', 0.5], ['F5', 0.5], ['E5', 0.5], ['D5', 0.5],
    ['C5', 1], ['A4', 1], ['G4', 0.5], ['G4', 0.5],
    ['A4', 1], ['D5', 1], ['B4', 1],
    ['C5', 2], [null, 1],
    [null, 3],
  ],
  chords: ['C', 'F', 'D', 'G', 'E', 'F', 'G', 'C', 'C'],
};
