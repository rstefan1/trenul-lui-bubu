/**
 * @file The two chapters of the freight journey.
 *
 * Each chapter can be played in one sitting (about 10–15 minutes) and has
 * its own "wow" moment.
 */

/** @type {import('../../shared/js/game/chapters.js').ChapterData[]} */
export const FREIGHT_CHAPTERS = [
  {
    id: 'bucovina',
    title: 'Bucovina',
    from: 'putna',
    to: 'ilva-mica',
    teaser: 'Bubu mecanic de locomotivă, urcușul spre Mestecăniș și viaductele pe lumină.',
  },
  {
    id: 'maramures',
    title: 'Maramureș',
    from: 'ilva-mica',
    to: 'viseu-de-jos',
    teaser: 'Pădurile de la Dealu Ștefăniței, marile viaducte și sosirea la Vișeu.',
  },
];
