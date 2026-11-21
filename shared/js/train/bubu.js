/**
 * @file Bubu, the plush ladybug.
 *
 * Bubu is a real photo of the toy (cut out, transparent background), so the
 * children recognise her. She is drawn as an image wherever she appears.
 */

const image = new Image();
image.decoding = 'async';

/**
 * Starts loading Bubu's photo (relative to the page that loads the game).
 * @param {string} url
 * @returns {Promise<HTMLImageElement>}
 */
export function loadBubu(url) {
  return new Promise(resolve => {
    image.onload = () => resolve(image);
    image.onerror = () => resolve(image);   // the game still works with a fallback
    image.src = url;
  });
}

/**
 * Draws Bubu centred at (x, y).
 * @param {CanvasRenderingContext2D} c
 * @param {number} x
 * @param {number} y
 * @param {number} size   width and height
 * @param {number} [tilt=0]  radians
 */
export function drawBubu(c, x, y, size, tilt = 0) {
  c.save();
  c.translate(x, y);
  if (tilt) c.rotate(tilt);
  if (image.complete && image.naturalWidth) {
    c.drawImage(image, -size / 2, -size / 2, size, size);
  } else {
    // fallback while loading: a simple red ladybug
    c.fillStyle = '#e53935';
    c.beginPath();
    c.arc(0, 0, size * 0.42, 0, Math.PI * 2);
    c.fill();
  }
  c.restore();
}
