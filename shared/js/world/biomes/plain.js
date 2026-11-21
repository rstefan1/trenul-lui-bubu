/**
 * @file Biome "plain": the flat western lowlands (Banat, Crișana) and the
 * Mureș valley floor. Wide fields, rows of poplars, small villages with
 * a church, haystacks.
 */

import { between, choose } from '../../core/random.js';
import { drawBareTree, drawHouse, drawPoplar, lightWindows } from '../../gfx/shapes.js';
import { drawChurch } from './city.js';
import {
  EDGE_MARGIN, EDGE_Y, ROOFS, TILE_WIDTH, WALLS,
  drawForegroundTufts, drawNearGround, fillUnder, softRidge,
} from './terrain.js';

/** @type {import('./index.js').Biome} */
export const plain = {
  id: 'plain',

  far(c, p) {
    fillUnder(c, softRidge(p.rng, EDGE_Y.far, 22, 4), 720, p.pal.far);
  },

  mid(c, p) {
    const { rng, pal } = p;
    const groundY = 680;
    fillUnder(c, softRidge(rng, EDGE_Y.mid, 10), 800, pal.midGround);
    c.fillStyle = pal.midGround;
    c.fillRect(0, groundY - 2, TILE_WIDTH, 800 - groundY + 2);
    // field strips
    for (let y = groundY + 10; y < 780; y += 22) {
      let x = 0;
      while (x < TILE_WIDTH) {
        const w = between(rng, 120, 320);
        if (rng() < 0.45) {
          c.fillStyle = pal.snowy ? 'rgba(200,215,235,0.5)' : pal.field;
          c.fillRect(x, y, Math.min(w, TILE_WIDTH - x), 12);
        }
        x += w;
      }
    }
    // a village in the distance, with poplars around it
    const villageX = between(rng, 300, TILE_WIDTH - 500);
    for (let i = 0; i < 7; i++) {
      const hx = villageX + i * between(rng, 34, 46);
      const rects = drawHouse(c, hx, groundY, 30, 20, {
        wall: choose(rng, WALLS), roof: choose(rng, ROOFS), snowy: pal.snowy, windows: 1,
      });
      if (rng() < 0.8) lightWindows(p.lights(), rects, 0.7);
    }
    if (rng() < 0.7) drawChurch(c, p, villageX + 320, groundY, 0.42);
    let x = EDGE_MARGIN;
    while (x < TILE_WIDTH - EDGE_MARGIN) {
      if (x < villageX - 40 || x > villageX + 420) {
        if (rng() < 0.5) drawPoplar(c, x, groundY, between(rng, 50, 80), pal.snowy ? '#6f7f74' : '#73866a');
      }
      x += between(rng, 26, 70);
    }
  },

  near(c, p) {
    const { rng, pal } = p;
    const ground = EDGE_Y.near;
    drawNearGround(c, pal);
    let x = EDGE_MARGIN;
    while (x < TILE_WIDTH - EDGE_MARGIN - 120) {
      const kind = rng();
      if (kind < 0.35) {
        drawBareTree(c, x + 20, ground, between(rng, 80, 130), pal.bare, between(rng, -1, 1));
        x += between(rng, 60, 140);
      } else if (kind < 0.55) {
        drawHaystack(c, x + 30, ground, pal.snowy);
        x += between(rng, 90, 160);
      } else if (kind < 0.7) {
        const w = between(rng, 80, 110);
        const rects = drawHouse(c, x, ground, w, between(rng, 50, 65), {
          wall: choose(rng, WALLS), roof: choose(rng, ROOFS), snowy: pal.snowy, chimney: true,
        });
        lightWindows(p.lights(), rects);
        x += w + between(rng, 60, 120);
      } else {
        x += between(rng, 80, 200);   // open field
      }
    }
    drawForegroundTufts(c, p, 14);
  },
};

/**
 * @param {CanvasRenderingContext2D} c
 * @param {number} x  centre
 * @param {number} groundY
 * @param {boolean} snowy
 */
export function drawHaystack(c, x, groundY, snowy) {
  c.fillStyle = '#c9a25a';
  c.beginPath();
  c.moveTo(x - 34, groundY);
  c.quadraticCurveTo(x - 30, groundY - 70, x, groundY - 78);
  c.quadraticCurveTo(x + 30, groundY - 70, x + 34, groundY);
  c.closePath();
  c.fill();
  c.fillStyle = 'rgba(0,0,0,0.08)';
  c.beginPath();
  c.moveTo(x, groundY - 78);
  c.quadraticCurveTo(x + 30, groundY - 70, x + 34, groundY);
  c.lineTo(x + 6, groundY);
  c.closePath();
  c.fill();
  c.fillStyle = '#6b4a32';
  c.fillRect(x - 2, groundY - 92, 4, 16);
  if (snowy) {
    c.fillStyle = '#f4f8ff';
    c.beginPath();
    c.moveTo(x - 22, groundY - 52);
    c.quadraticCurveTo(x - 16, groundY - 74, x, groundY - 78);
    c.quadraticCurveTo(x + 16, groundY - 74, x + 22, groundY - 52);
    c.quadraticCurveTo(x, groundY - 58, x - 22, groundY - 52);
    c.fill();
  }
}
