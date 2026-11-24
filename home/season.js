/**
 * @file The season of the home page, chosen before the page is drawn (it
 * runs in <head>, as a plain script, so the page never shows in another
 * season's colours first).
 *
 * The season follows the calendar, the way children learn it at school
 * (winter: December–February, spring: March–May, summer: June–August,
 * autumn: September–November). To see another season, add it to the
 * address: ?anotimp=iarna, ?anotimp=primavara, ?anotimp=vara or
 * ?anotimp=toamna.
 *
 * The page is marked with data-season="winter|spring|summer|autumn" on
 * <html>; home/home.css colours the page with it and home/landscape.js
 * draws that season's landscape.
 */
(function () {
  'use strict';

  /** month (0 = January) -> season */
  var BY_MONTH = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer',
    'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];

  /** the names in the address */
  var ASKED = { iarna: 'winter', primavara: 'spring', vara: 'summer', toamna: 'autumn' };

  /** the seasons whose landscape is drawn already; the others show summer for now */
  var READY = ['summer'];

  /** the colour of the browser's bar in every season */
  var BAR = { winter: '#2b4f8f', spring: '#7cc4f2', summer: '#3d9be9', autumn: '#e0904a' };

  var asked = (window.location.search.match(/[?&]anotimp=([a-z]+)/) || [])[1];
  var season = ASKED[asked] || BY_MONTH[new Date().getMonth()];
  if (READY.indexOf(season) < 0) { season = 'summer'; }

  document.documentElement.setAttribute('data-season', season);
  var bar = document.querySelector('meta[name="theme-color"]');
  if (bar) { bar.setAttribute('content', BAR[season]); }
})();
