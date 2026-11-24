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
    title: 'Bucovina, cu platformele goale',
    from: 'putna',
    to: 'vatra-dornei',
    teaser: 'Răsăritul la Putna, Bubu mecanic de locomotivă și urcușul spre Mestecăniș.',
  },
  {
    id: 'maramures',
    title: 'Peste munți, spre Maramureș',
    from: 'vatra-dornei',
    to: 'viseu-de-jos',
    teaser: 'Viaductele pe lumină și marile viaducte de la Dealu Ștefăniței.',
  },
];
