/**
 * @file Biome "city": the outskirts of a big town (Timișoara, Arad, Cluj,
 * Suceava). Blocks of flats and church towers in the middle distance,
 * small houses, fences and street lamps next to the track.
 */

import { between, choose } from '../../core/random.js';
import { drawBareTree, drawHouse, glow, lightWindows } from '../../gfx/shapes.js';
import {
  EDGE_MARGIN, EDGE_Y, ROOFS, TILE_WIDTH, WALLS,
  drawForegroundTufts, drawNearGround, fillUnder, softRidge,
} from './terrain.js';

const BLOCK_COLORS = ['#e6dcc8', '#cfd9e2', '#ead2c3', '#d8e4d2', '#e9e1f0'];

/** @type {import('./index.js').Biome} */
export const city = {
  id: 'city',

  far(c, p) {
    fillUnder(c, softRidge(p.rng, EDGE_Y.far, 30), 720, p.pal.far);
  },

  mid(c, p) {
    const { rng, pal } = p;
    const groundY = 690;
    fillUnder(c, softRidge(rng, EDGE_Y.mid, 14), 800, pal.midGround);
    c.fillStyle = pal.midGround;
    c.fillRect(0, groundY - 4, TILE_WIDTH, 800 - groundY + 4);

    let x = EDGE_MARGIN;
    while (x < TILE_WIDTH - EDGE_MARGIN - 160) {
      if (rng() < 0.16) {
        drawChurch(c, p, x + 30, groundY, 0.8);
        x += 120;
        continue;
      }
      const w = between(rng, 70, 150);
      const h = between(rng, 80, 175);
      drawBlock(c, p, x, groundY, w, h);
      x += w + between(rng, 8, 40);
    }
  },

  near(c, p) {
    const { rng, pal } = p;
    const ground = EDGE_Y.near;
    drawNearGround(c, pal);
    let x = EDGE_MARGIN;
    while (x < TILE_WIDTH - EDGE_MARGIN - 120) {
      const kind = rng();
      if (kind < 0.45) {
        const w = between(rng, 80, 120);
        const rects = drawHouse(c, x, ground, w, between(rng, 55, 75), {
          wall: choose(rng, WALLS), roof: choose(rng, ROOFS), snowy: pal.snowy, chimney: rng() < 0.6,
        });
        if (rng() < 0.75) lightWindows(p.lights(), rects);
        x += w + between(rng, 30, 70);
      } else if (kind < 0.7) {
        drawStreetLamp(c, p, x + 10, ground);
        x += between(rng, 60, 120);
      } else {
        drawBareTree(c, x + 20, ground, between(rng, 70, 110), pal.bare, between(rng, -1, 1));
        x += between(rng, 50, 90);
      }
    }
    drawFence(c, ground);
    drawForegroundTufts(c, p, 10);
  },
};

/**
 * A block of flats with a grid of windows.
 * @param {CanvasRenderingContext2D} c
 * @param {import('./terrain.js').PaintContext} p
 * @param {number} x
 * @param {number} groundY
 * @param {number} w
 * @param {number} h
 */
function drawBlock(c, p, x, groundY, w, h) {
  const { rng, pal } = p;
  c.fillStyle = choose(rng, BLOCK_COLORS);
  c.fillRect(x, groundY - h, w, h);
  c.fillStyle = 'rgba(0,0,0,0.07)';
  c.fillRect(x + w * 0.72, groundY - h, w * 0.28, h);
  if (pal.snowy) {
    c.fillStyle = pal.snow;
    c.fillRect(x - 2, groundY - h - 5, w + 4, 7);
  }
  const cols = Math.max(2, Math.floor(w / 22));
  const rows = Math.max(2, Math.floor(h / 26));
  const cw = w / cols;
  const rh = h / rows;
  /** @type {Array<[number, number, number, number]>} */
  const lit = [];
  c.fillStyle = 'rgba(70,95,140,0.55)';
  for (let i = 0; i < cols; i++) {
    for (let j = 0; j < rows - 0.5; j++) {
      const wx = x + i * cw + cw * 0.28;
      const wy = groundY - h + j * rh + rh * 0.3;
      c.fillRect(wx, wy, cw * 0.44, rh * 0.42);
      if (rng() < 0.45) lit.push([wx, wy, cw * 0.44, rh * 0.42]);
    }
  }
  if (lit.length) lightWindows(p.lights(), lit, 0.6);
}

/**
 * A church with a tall tower (lowland style).
 * @param {CanvasRenderingContext2D} c
 * @param {import('./terrain.js').PaintContext} p
 * @param {number} x        centre of the tower
 * @param {number} groundY
 * @param {number} [scale=1]
 */
export function drawChurch(c, p, x, groundY, scale = 1) {
  const L = p.lights();
  for (const ctx of [c, L]) {
    ctx.save();
    ctx.translate(x, groundY);
    ctx.scale(scale, scale);
  }
  paintChurch(c, L, p.pal);
  c.restore();
  L.restore();
}

/**
 * The church in local coordinates: tower centred on x = 0, ground at y = 0.
 * @param {CanvasRenderingContext2D} c
 * @param {CanvasRenderingContext2D} L  lights layer
 * @param {import('./terrain.js').Palette} pal
 */
function paintChurch(c, L, pal) {
  const wall = '#f3ead8';
  // nave
  c.fillStyle = wall;
  c.fillRect(0, -60, 80, 60);
  c.fillStyle = '#9b4a37';
  c.beginPath();
  c.moveTo(-4, -60);
  c.lineTo(40, -88);
  c.lineTo(84, -60);
  c.closePath();
  c.fill();
  // tower
  c.fillStyle = wall;
  c.fillRect(-18, -130, 36, 130);
  c.fillStyle = 'rgba(0,0,0,0.07)';
  c.fillRect(6, -130, 12, 130);
  // spire
  c.fillStyle = '#4f6f62';
  c.beginPath();
  c.moveTo(-22, -130);
  c.lineTo(0, -205);
  c.lineTo(22, -130);
  c.closePath();
  c.fill();
  if (pal.snowy) {
    c.fillStyle = pal.snow;
    c.beginPath();
    c.moveTo(-6, -186);
    c.lineTo(0, -205);
    c.lineTo(6, -186);
    c.closePath();
    c.fill();
  }
  // cross
  c.fillStyle = '#e8c35a';
  c.fillRect(-1.5, -222, 3, 18);
  c.fillRect(-7, -216, 14, 3);
  // clock and a lit window
  c.fillStyle = '#fffaf0';
  c.beginPath();
  c.arc(0, -108, 9, 0, Math.PI * 2);
  c.fill();
  c.fillStyle = '#5b7aa6';
  c.fillRect(-6, -80, 12, 20);
  lightWindows(L, [[-6, -80, 12, 20]], 0.8);
}

/**
 * @param {CanvasRenderingContext2D} c
 * @param {import('./terrain.js').PaintContext} p
 * @param {number} x
 * @param {number} groundY
 */
export function drawStreetLamp(c, p, x, groundY) {
  c.fillStyle = '#4a5568';
  c.fillRect(x - 2.5, groundY - 120, 5, 120);
  c.fillRect(x - 2.5, groundY - 122, 26, 4);
  c.fillStyle = '#fff3c4';
  c.fillRect(x + 14, groundY - 120, 12, 6);
  const L = p.lights();
  glow(L, x + 20, groundY - 112, 70, 'rgba(255,214,120,0.55)', 'rgba(255,214,120,0)');
  L.fillStyle = '#fff2b0';
  L.fillRect(x + 14, groundY - 120, 12, 6);
}

/**
 * A low picket fence along the ground line, the whole tile wide.
 * @param {CanvasRenderingContext2D} c
 * @param {number} groundY
 */
export function drawFence(c, groundY) {
  c.fillStyle = '#8a6a50';
  c.fillRect(0, groundY - 22, TILE_WIDTH, 3);
  c.fillRect(0, groundY - 10, TILE_WIDTH, 3);
  for (let x = 6; x < TILE_WIDTH; x += 20) c.fillRect(x, groundY - 28, 4, 28);
}
