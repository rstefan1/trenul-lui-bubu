/**
 * @file Biome "forest": the mountains of northern Romania (Bârgău, Suhard,
 * Bucovina). High snowy peaks far away, steep slopes covered with firs in
 * the middle distance and big firs right next to the track.
 */

import { between } from '../../core/random.js';
import { drawFir, drawHouse, lightWindows } from '../../gfx/shapes.js';
import {
  EDGE_MARGIN, EDGE_Y, TILE_WIDTH,
  drawForegroundTufts, drawMountainRange, drawNearGround, fillUnder, softRidge,
} from './terrain.js';

/** @type {import('./index.js').Biome} */
export const forest = {
  id: 'forest',

  far(c, p) {
    drawMountainRange(c, p, { count: 7, height: [200, 330], width: [380, 640], bottom: 720, snowLine: 0.45 });
  },

  mid(c, p) {
    const { rng, pal } = p;
    const ridge = softRidge(rng, EDGE_Y.mid, 230, 3);
    fillUnder(c, ridge, 800, pal.midGround);
    // firs follow the slope, in two rows, densely
    for (const row of [0, 1]) {
      let x = EDGE_MARGIN - 40 + row * 9;
      while (x < TILE_WIDTH - EDGE_MARGIN + 40) {
        const y = ridge(x) + 8 + row * between(rng, 18, 40);
        drawFir(c, x, y, between(rng, 36, 62) + row * 8, {
          color: row ? '#2f6e4f' : '#3a7a5b', shade: row ? '#245a41' : '#2e6a4d', snowy: pal.snowy,
        });
        x += between(rng, 11, 20);
      }
    }
    // the lower slopes, below the trees
    const front = softRidge(rng, EDGE_Y.mid + 50, 60, 2);
    fillUnder(c, x => Math.min(800, front(x)), 800, pal.midShade);
  },

  near(c, p) {
    const { rng, pal } = p;
    const ground = EDGE_Y.near;
    drawNearGround(c, pal);
    let x = EDGE_MARGIN;
    const cabinAt = rng() < 0.5 ? between(rng, 300, TILE_WIDTH - 400) : -1;
    while (x < TILE_WIDTH - EDGE_MARGIN - 60) {
      if (cabinAt > 0 && Math.abs(x - cabinAt) < 60) {
        const rects = drawHouse(c, x, ground, 90, 52, { wall: '#9b6b47', roof: '#5a4032', snowy: pal.snowy, chimney: true, windows: 1 });
        lightWindows(p.lights(), rects);
        x += 150;
        continue;
      }
      const h = between(rng, 120, 250);
      drawFir(c, x, ground + between(rng, 0, 10), h, { snowy: pal.snowy });
      x += between(rng, h * 0.25, h * 0.55);
    }
    // rocks
    for (let i = 0; i < 4; i++) {
      const rx = between(rng, EDGE_MARGIN, TILE_WIDTH - EDGE_MARGIN);
      c.fillStyle = '#8a93a3';
      c.beginPath();
      c.ellipse(rx, ground + 2, between(rng, 18, 34), between(rng, 10, 18), 0, Math.PI, 0);
      c.fill();
      if (pal.snowy) {
        c.fillStyle = pal.snow;
        c.beginPath();
        c.ellipse(rx, ground - 8, 16, 6, 0, Math.PI, 0);
        c.fill();
      }
    }
    drawForegroundTufts(c, p, 10);
  },
};
