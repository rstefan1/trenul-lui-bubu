/**
 * @file The four chapters of the winter journey.
 *
 * Each chapter is a part of the journey that can be played in one sitting
 * (about 10–15 minutes) and has its own "wow" moment.
 */

/** @type {import('../../shared/js/game/chapters.js').ChapterData[]} */
export const WINTER_CHAPTERS = [
  {
    id: 'mures',
    title: 'Câmpia și Mureșul',
    from: 'timisoara',
    to: 'deva',
    teaser: 'După-amiaza de Ajun, apusul pe Valea Mureșului și prima ninsoare.',
  },
  {
    id: 'transilvania',
    title: 'Prin Transilvania',
    from: 'deva',
    to: 'dej',
    teaser: 'Seara de Ajun și orașele luminate de Crăciun.',
  },
  {
    id: 'munti',
    title: 'Noaptea de Crăciun în munți',
    from: 'dej',
    to: 'campulung',
    teaser: 'Miezul nopții, viaductele sub lună și târgul fermecat.',
  },
  {
    id: 'bucovina',
    title: 'Bucovina în zori',
    from: 'campulung',
    to: 'putna',
    teaser: 'Răsăritul în Bucovina și Crăciunul la Putna.',
  },
];
