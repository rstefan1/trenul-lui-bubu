/**
 * @file The drawing stage: a full-window canvas with a resolution-independent
 * coordinate system.
 *
 * Every scene is drawn in "stage units". The stage is always
 * {@link STAGE_HEIGHT} units high; its width follows the shape of the window
 * (between {@link MIN_WIDTH} and {@link MAX_WIDTH}), so the game fills the
 * window without black bars on any laptop, tablet or phone.
 *
 * On windows that are taller than wide (phones held upright) the stage is
 * MIN_WIDTH wide and the window shows more than 900 units vertically:
 * `viewTop` (negative) and `viewBottom` (> 900) tell the scene how far the
 * visible area extends, so the sky can continue upwards and the ground
 * downwards.
 */

import { clamp } from './math.js';
import { Emitter } from './emitter.js';

export const STAGE_HEIGHT = 900;
export const MIN_WIDTH = 900;
export const MAX_WIDTH = 2400;

/** Device pixel ratio cap: sharper than this is invisible but costs a lot. */
const MAX_DPR = 2;

/**
 * Screen pixels per stage unit below which what the child must see or touch
 * on the canvas is drawn bigger (see {@link Stage#ui}): laptops and tablets
 * stay above it, phones (about 0.43) fall below it.
 */
const UI_SCALE = 0.72;
/** The most that {@link Stage#ui} enlarges. */
const MAX_UI = 1.8;

export class Stage extends Emitter {
  /** @param {HTMLCanvasElement} canvas */
  constructor(canvas) {
    super();
    this.canvas = canvas;
    this.ctx = /** @type {CanvasRenderingContext2D} */ (canvas.getContext('2d'));
    this.height = STAGE_HEIGHT;
    this.width = 1600;
    /** Screen pixels per stage unit. */
    this.scale = 1;
    /** Device pixels per CSS pixel (capped). */
    this.dpr = 1;
    this.offsetX = 0;
    this.offsetY = 0;
    this.viewTop = 0;
    this.viewBottom = STAGE_HEIGHT;
    /** How far the world's camera has moved in (set by the world view; 1: not at all). */
    this.zoom = 1;

    const onResize = () => this.resize();
    window.addEventListener('resize', onResize);
    // Some mobile browsers report the new size slightly after rotating.
    window.addEventListener('orientationchange', () => setTimeout(onResize, 300));
    if (window.visualViewport) window.visualViewport.addEventListener('resize', onResize);
    this.resize();
  }

  /** Recomputes the mapping between stage units and the window. */
  resize() {
    const cw = window.innerWidth;
    const ch = window.innerHeight;
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.canvas.width = Math.max(1, Math.round(cw * this.dpr));
    this.canvas.height = Math.max(1, Math.round(ch * this.dpr));

    this.width = clamp((STAGE_HEIGHT * cw) / Math.max(1, ch), MIN_WIDTH, MAX_WIDTH);
    this.scale = Math.min(cw / this.width, ch / STAGE_HEIGHT);
    this.offsetX = (cw - this.width * this.scale) / 2;
    // On tall screens keep the stage slightly below the middle: the extra
    // room above shows more sky, which looks better than extra ground.
    const free = ch - STAGE_HEIGHT * this.scale;
    this.offsetY = free > 0 ? free * 0.6 : free / 2;
    this.viewTop = -this.offsetY / this.scale;
    this.viewBottom = (ch - this.offsetY) / this.scale;
    this.emit('resize', this);
  }

  /** Device pixels per stage unit (what offscreen canvases should use). */
  get pixelRatio() {
    return this.scale * this.dpr;
  }

  /**
   * How much bigger the missions draw the things the child must see or
   * touch (buttons, signs, targets, their texts): 1 on laptops and tablets,
   * up to {@link MAX_UI} on phones, where the whole stage is shrunk to fit
   * a small screen and they would otherwise be too small for a finger.
   */
  get ui() {
    return clamp(UI_SCALE / this.scale, 1, MAX_UI);
  }

  /**
   * {@link ui} for what is drawn through the camera's zoom (hint notes over
   * the world): the same size on screen whether the camera has moved in or not.
   */
  get zoomedUi() {
    return this.ui / this.zoom;
  }

  /** Width of the visible area in stage units (may exceed `width`). */
  get viewLeft() {
    return -this.offsetX / this.scale;
  }

  get viewRight() {
    return this.width + this.offsetX / this.scale;
  }

  /**
   * Converts a pointer position (CSS pixels) to stage units.
   * @param {number} clientX
   * @param {number} clientY
   * @returns {{x: number, y: number}}
   */
  toStage(clientX, clientY) {
    return {
      x: (clientX - this.offsetX) / this.scale,
      y: (clientY - this.offsetY) / this.scale,
    };
  }

  /**
   * Sets the transform of a context so that it draws in stage units.
   * @param {CanvasRenderingContext2D} ctx
   */
  applyTransform(ctx) {
    const k = this.pixelRatio;
    ctx.setTransform(k, 0, 0, k, this.offsetX * this.dpr, this.offsetY * this.dpr);
  }
}
