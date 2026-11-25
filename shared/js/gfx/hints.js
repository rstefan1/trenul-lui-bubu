/**
 * @file The hint note: a yellow label whose tip points at what the child
 * should touch, and says what to do with it ("Verifică farurile", "Pune
 * nisip!"). Missions use it so that no child is left guessing.
 */

import { clamp } from '../core/math.js';
import { fillRoundRect } from './shapes.js';
import { zoomed } from './ui-style.js';

/**
 * Draws the note with its tip on a point (the label is kept on screen, and
 * bigger on phones). It is drawn through the camera's zoom, like the
 * missions, but keeps its size on screen when the camera moves in.
 * @param {CanvasRenderingContext2D} c
 * @param {import('../core/stage.js').Stage} stage
 * @param {number} x
 * @param {number} y      the tip of the note
 * @param {string} text   what to do there
 * @param {boolean} [below=false]  the label hangs under the point, its tip upwards
 *        (when the room above is taken, e.g. by a card at the top of the screen)
 */
export function drawTouchNote(c, stage, x, y, text, below = false) {
  zoomed(c, stage.zoomedUi, x, y, () => {
    c.font = '800 21px "Baloo 2", system-ui, sans-serif';
    const w = Math.max(150, c.measureText(text).width + 30);
    const h = 44;
    const bx = clamp(x - w / 2, stage.viewLeft + 10, stage.viewRight - 10 - w);
    const by = below ? y + 14 : y - 14 - h;
    const base = below ? by + 1 : by + h - 1;
    fillRoundRect(c, bx, by, w, h, 14, '#ffcf3f');
    c.fillStyle = '#ffcf3f';
    c.beginPath();
    c.moveTo(x - 10, base);
    c.lineTo(x + 10, base);
    c.lineTo(x, y);
    c.closePath();
    c.fill();
    c.fillStyle = '#1b2440';
    c.textAlign = 'center';
    c.textBaseline = 'middle';
    c.fillText(text, bx + w / 2, by + h / 2 + 1);
  });
}
