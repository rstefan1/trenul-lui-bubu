/**
 * @file Tinting of horizontal bands of the scene.
 *
 * The time of day (golden afternoon, sunset, night, sunrise) is rendered by
 * laying translucent colour washes over the drawings — but only over the
 * drawings, not over the transparent parts (otherwise the sky behind a
 * mountain range would be tinted twice). The compositor draws a band into a
 * scratch canvas, washes it with `source-atop` (which only touches pixels
 * that are already painted) and copies the band back.
 *
 * When there is nothing to tint (daytime), the band is drawn directly, so
 * the common case costs nothing extra. Several washes (e.g. a layer's haze
 * and the time of day) are first merged into one, so a band is washed with a
 * single fill: laying colour A at alpha a, then colour B at alpha b, is the
 * same as laying one colour C at alpha c, with
 *   c = 1 − (1 − a)(1 − b)   and   C = (A·a·(1 − b) + B·b) / c.
 */

/**
 * @typedef {object} Wash
 * @property {string} color  CSS colour
 * @property {number} alpha  0..1; washes under 0.003 are skipped
 * @property {import('./color.js').Rgb} [rgb]  the same colour as numbers (lets washes be merged)
 */

/**
 * Merges washes into one with the same effect (see the file comment).
 * Washes without numbers are kept as they are.
 * @param {ReadonlyArray<Wash>} washes  the active ones, in order
 * @returns {ReadonlyArray<Wash>}
 */
export function mergeWashes(washes) {
  if (washes.length < 2 || washes.some(w => !w.rgb)) return washes;
  let alpha = 0;
  let rgb = [0, 0, 0];
  for (const w of washes) {
    const a = Math.min(1, w.alpha);
    const next = 1 - (1 - alpha) * (1 - a);
    const src = /** @type {import('./color.js').Rgb} */ (w.rgb);
    rgb = rgb.map((v, i) => (v * alpha * (1 - a) + src[i] * a) / next);
    alpha = next;
  }
  const color = `rgb(${Math.round(rgb[0])},${Math.round(rgb[1])},${Math.round(rgb[2])})`;
  return [{ color, alpha, rgb: /** @type {import('./color.js').Rgb} */ (rgb) }];
}

export class BandCompositor {
  constructor() {
    this.buffer = document.createElement('canvas');
    this.bctx = /** @type {CanvasRenderingContext2D} */ (this.buffer.getContext('2d'));
  }

  /**
   * Matches the scratch canvas to the size of the main canvas.
   * @param {HTMLCanvasElement} target
   */
  resize(target) {
    if (this.buffer.width !== target.width || this.buffer.height !== target.height) {
      this.buffer.width = target.width;
      this.buffer.height = target.height;
    }
  }

  /**
   * Draws a band of the scene, tinted with the given washes.
   *
   * `paint` must stay inside [top, bottom] (in the current user space of
   * `ctx`): only those rows are copied back.
   *
   * @param {CanvasRenderingContext2D} ctx  destination (its transform is reused)
   * @param {number} top
   * @param {number} bottom
   * @param {(c: CanvasRenderingContext2D) => void} paint
   * @param {ReadonlyArray<Wash>} washes
   */
  draw(ctx, top, bottom, paint, washes) {
    const active = mergeWashes(washes.filter(w => w.alpha > 0.003));
    if (active.length === 0) {
      paint(ctx);
      return;
    }
    const m = ctx.getTransform();
    const y0 = Math.max(0, Math.floor(m.d * top + m.f));
    const y1 = Math.min(this.buffer.height, Math.ceil(m.d * bottom + m.f));
    if (y1 <= y0) return;
    const w = this.buffer.width;
    const b = this.bctx;

    b.setTransform(1, 0, 0, 1, 0, 0);
    b.globalAlpha = 1;
    b.globalCompositeOperation = 'source-over';
    b.clearRect(0, y0, w, y1 - y0);

    b.setTransform(m);
    b.save();
    paint(b);
    b.restore();

    b.setTransform(1, 0, 0, 1, 0, 0);
    b.globalCompositeOperation = 'source-atop';
    for (const wash of active) {
      b.globalAlpha = Math.min(1, wash.alpha);
      b.fillStyle = wash.color;
      b.fillRect(0, y0, w, y1 - y0);
    }
    b.globalAlpha = 1;
    b.globalCompositeOperation = 'source-over';

    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.drawImage(this.buffer, 0, y0, w, y1 - y0, 0, y0, w, y1 - y0);
    ctx.restore();
  }
}
