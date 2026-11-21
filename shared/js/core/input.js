/**
 * @file Pointer input on the canvas, in stage units.
 *
 * Mouse, pen and touch are handled the same way (Pointer Events), so every
 * mission works on laptops, tablets and phones without special cases.
 * Listeners receive positions already converted to stage units.
 */

import { Emitter } from './emitter.js';

/**
 * @typedef {object} PointerInfo
 * @property {number} x       stage units
 * @property {number} y       stage units
 * @property {string} type    "mouse" | "touch" | "pen"
 */

export class PointerInput extends Emitter {
  /** @param {import('./stage.js').Stage} stage */
  constructor(stage) {
    super();
    this.stage = stage;
    this.down = false;
    /** @type {PointerInfo} */
    this.last = { x: 0, y: 0, type: 'mouse' };
    const canvas = stage.canvas;
    canvas.addEventListener('pointerdown', e => {
      this.down = true;
      this.emit('down', this.info(e));
    });
    canvas.addEventListener('pointermove', e => this.emit('move', this.info(e)));
    window.addEventListener('pointerup', e => {
      if (!this.down) return;
      this.down = false;
      this.emit('up', this.info(e));
    });
    window.addEventListener('pointercancel', () => { this.down = false; });
  }

  /**
   * @private
   * @param {PointerEvent} e
   * @returns {PointerInfo}
   */
  info(e) {
    const p = this.stage.toStage(e.clientX, e.clientY);
    this.last = { x: p.x, y: p.y, type: e.pointerType || 'mouse' };
    return this.last;
  }
}
