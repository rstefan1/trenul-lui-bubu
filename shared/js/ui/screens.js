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

/**
 * Wires the HUD's "leave" button: it opens a small window that asks where to
 * go: back to the journey's chapters (the page opens again, on its menu) or
 * to the list of journeys (its link); what was done up to the last station
 * stays saved. While the window is open the game waits, like during a
 * mission's briefing.
 * @param {HTMLButtonElement} button    the HUD button
 * @param {HTMLElement} dialog          the window
 * @param {HTMLButtonElement} chapters  the button that goes back to the chapters
 * @param {HTMLButtonElement} stay      the button that closes the window
 * @param {{paused: boolean}} game      what pauses the game (the mission HUD)
 */
export function setupExitButton(button, dialog, chapters, stay, game) {
  let wasPaused = false;
  const close = () => {
    if (dialog.hidden) return;
    game.paused = wasPaused;
    dialog.classList.remove('is-visible');
    setTimeout(() => { if (!dialog.classList.contains('is-visible')) dialog.hidden = true; }, 350);
    button.focus({ preventScroll: true });
  };
  button.addEventListener('click', () => {
    wasPaused = game.paused;
    game.paused = true;
    dialog.hidden = false;
    requestAnimationFrame(() => dialog.classList.add('is-visible'));
    stay.focus({ preventScroll: true });
  });
  stay.addEventListener('click', close);
  // the same page without the testing parameters: it opens on the menu
  chapters.addEventListener('click', () => { location.href = location.pathname; });
  dialog.addEventListener('keydown', e => { if (e.key === 'Escape') close(); });
}
