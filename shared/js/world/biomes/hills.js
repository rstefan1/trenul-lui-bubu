/**
 * @file Biome "hills": rolling hills of Transylvania with villages on the
 * slopes, orchards and wells with a sweep (fântână cu cumpănă), and the
 * Apuseni/Retezat mountains far away.
 */

import { between, choose } from '../../core/random.js';
import { drawBareTree, drawFir, drawHouse, lightWindows } from '../../gfx/shapes.js';
import { drawChurch } from './city.js';
import {
  EDGE_MARGIN, EDGE_Y, ROOFS, TILE_WIDTH, WALLS,
  drawForegroundTufts, drawMountainRange, drawNearGround, fillUnder, softRidge,
} from './terrain.js';

/** @type {import('./index.js').Biome} */
export const hills = {
  id: 'hills',

  far(c, p) {
    drawMountainRange(c, p, { count: 6, height: [90, 200], width: [380, 620], bottom: 720, snowLine: 0.3 });
  },

  mid(c, p) {
    const { rng, pal } = p;
    const ridge = softRidge(rng, EDGE_Y.mid, 150, 3);
    fillUnder(c, ridge, 800, pal.midGround);
    // a second, lower hill line in front gives depth
    const front = softRidge(rng, EDGE_Y.mid + 40, 70, 2);
    fillUnder(c, x => Math.min(800, front(x)), 800, pal.midShade);

    let x = EDGE_MARGIN;
    while (x < TILE_WIDTH - EDGE_MARGIN) {
      const y = ridge(x) + 6;
      const r = rng();
      if (r < 0.25) {
        const rects = drawHouse(c, x, y, 28, 18, {
          wall: choose(rng, WALLS), roof: choose(rng, ROOFS), snowy: pal.snowy, windows: 1,
        });
        if (rng() < 0.8) lightWindows(p.lights(), rects, 0.7);
        x += between(rng, 34, 60);
      } else if (r < 0.5) {
        drawFir(c, x, y, between(rng, 34, 56), { snowy: pal.snowy });
        x += between(rng, 16, 30);
      } else if (r < 0.56 && x > 200 && x < TILE_WIDTH - 300) {
        drawChurch(c, p, x, y, 0.6);
        x += 90;
      } else {
        x += between(rng, 30, 80);
      }
    }
  },

  near(c, p) {
    const { rng, pal } = p;
    const ground = EDGE_Y.near;
    drawNearGround(c, pal);
    let x = EDGE_MARGIN;
    while (x < TILE_WIDTH - EDGE_MARGIN - 140) {
      const kind = rng();
      if (kind < 0.35) {
        const w = between(rng, 80, 115);
        const rects = drawHouse(c, x, ground, w, between(rng, 50, 68), {
          wall: choose(rng, WALLS), roof: choose(rng, ROOFS), snowy: pal.snowy, chimney: true,
        });
        lightWindows(p.lights(), rects);
        x += w + between(rng, 40, 90);
      } else if (kind < 0.5) {
        drawWell(c, x + 20, ground, pal.snowy);
        x += 130;
      } else if (kind < 0.8) {
        drawBareTree(c, x + 20, ground, between(rng, 80, 120), pal.bare, between(rng, -1, 1));
        x += between(rng, 50, 100);
      } else {
        drawFir(c, x + 20, ground, between(rng, 90, 140), { snowy: pal.snowy });
        x += between(rng, 50, 90);
      }
    }
    drawForegroundTufts(c, p, 12);
  },
};

/**
 * A well with a sweep, typical of Romanian villages.
 * @param {CanvasRenderingContext2D} c
 * @param {number} x  base of the post
 * @param {number} groundY
 * @param {boolean} snowy
 */
export function drawWell(c, x, groundY, snowy) {
  // the well
  c.fillStyle = '#8a6a50';
  c.fillRect(x + 50, groundY - 26, 34, 26);
  c.fillStyle = '#6b4f3a';
  c.fillRect(x + 48, groundY - 30, 38, 6);
  // post and sweep
  c.fillStyle = '#7a5a40';
  c.fillRect(x - 3, groundY - 80, 6, 80);
  c.strokeStyle = '#7a5a40';
  c.lineWidth = 5;
  c.lineCap = 'round';
  c.beginPath();
  c.moveTo(x - 40, groundY - 50);
  c.lineTo(x + 70, groundY - 110);
  c.stroke();
  c.lineWidth = 2;
  c.beginPath();
  c.moveTo(x + 66, groundY - 108);
  c.lineTo(x + 66, groundY - 40);
  c.stroke();
  c.fillStyle = '#5d4535';
  c.fillRect(x + 60, groundY - 44, 12, 10);
  if (snowy) {
    c.fillStyle = '#f4f8ff';
    c.fillRect(x + 48, groundY - 34, 38, 5);
  }
}
