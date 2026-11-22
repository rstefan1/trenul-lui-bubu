/**
 * @file Keeps the screen awake while the game is open (Screen Wake Lock API).
 *
 * On phones and tablets the screen would otherwise dim and lock after a
 * short while without touches — e.g. while the child watches the train
 * between two missions. The browser releases the lock whenever the page is
 * hidden, so it is asked for again each time the page comes back. Browsers
 * only grant it after a touch, and only on secure pages (https or
 * localhost); where it is not available the game simply works as before.
 */

export function keepScreenAwake() {
  const wakeLock = /** @type {any} */ (navigator).wakeLock;
  if (!wakeLock) return;
  /** @type {{released: boolean} | null} */
  let lock = null;

  const request = async () => {
    if (document.hidden || (lock && !lock.released)) return;
    try {
      lock = await wakeLock.request('screen');
    } catch {
      // refused (battery saver, no gesture yet): try again on the next touch
    }
  };

  for (const type of ['pointerdown', 'keydown']) window.addEventListener(type, request, { capture: true });
  document.addEventListener('visibilitychange', request);
}
