/**
 * @file Full-screen overlays (intro, end) and the fullscreen button.
 *
 * The overlays' content is written in each season's HTML page; this module
 * only shows and hides them.
 */

/**
 * Shows an overlay and resolves when its main button is pressed.
 * @param {HTMLElement} overlay
 * @param {HTMLElement} button
 * @returns {Promise<void>}
 */
export function showOverlay(overlay, button) {
  overlay.hidden = false;
  requestAnimationFrame(() => overlay.classList.add('is-visible'));
  return new Promise(resolve => {
    button.addEventListener('click', () => {
      overlay.classList.remove('is-visible');
      setTimeout(() => { overlay.hidden = true; }, 350);
      resolve();
    }, { once: true });
  });
}

/**
 * Wires the fullscreen button; hides it where the browser does not allow
 * pages to go fullscreen (e.g. iPhone).
 * @param {HTMLButtonElement} button
 */
export function setupFullscreen(button) {
  const root = document.documentElement;
  if (!root.requestFullscreen) {
    button.hidden = true;
    return;
  }
  button.addEventListener('click', () => {
    if (document.fullscreenElement) document.exitFullscreen();
    else root.requestFullscreen().catch(() => {});
  });
}
