/**
 * @file The season (the "mode") of the home page, chosen before the page is
 * drawn (it runs in <head>, as a plain script, so the page never shows in
 * another season's colours first). It works like the modes of
 * lumea-lui-bubu:
 *
 *   - MODE below says which season is on: "auto" (the usual setting) lets
 *     the calendar choose, the way children learn the seasons at school
 *     (winter: December–February, spring: March–May, summer: June–August,
 *     autumn: September–November); or one season, to keep it on whatever
 *     the date: "winter", "spring", "summer" or "autumn";
 *   - to see a season without changing this file, add it to the address:
 *     ?mode=winter, ?mode=spring, ?mode=summer or ?mode=autumn,
 *     e.g. http://localhost:8000/?mode=winter
 *
 * The page is marked with data-season="winter|spring|summer|autumn" on
 * <html>; home/home.css colours the page with it and home/landscape.js
 * draws that season's landscape.
 */
(function () {
  'use strict';

  /** which season is on: "auto" (the calendar chooses) or one season */
  var MODE = 'auto';

  /** month (0 = January) -> season */
  var BY_MONTH = ['winter', 'winter', 'spring', 'spring', 'spring', 'summer',
    'summer', 'summer', 'autumn', 'autumn', 'autumn', 'winter'];

  var SEASONS = ['winter', 'spring', 'summer', 'autumn'];

  /** the colour of the browser's bar in every season */
  var BAR = { winter: '#7fa8d8', spring: '#6fb8ee', summer: '#3d9be9', autumn: '#8fb3d8' };

  var asked = (window.location.search.match(/[?&]mode=([a-z]+)/) || [])[1];
  var season = SEASONS.indexOf(asked) >= 0 ? asked
    : SEASONS.indexOf(MODE) >= 0 ? MODE
      : BY_MONTH[new Date().getMonth()];

  document.documentElement.setAttribute('data-season', season);
  var bar = document.querySelector('meta[name="theme-color"]');
  if (bar) { bar.setAttribute('content', BAR[season]); }
})();
