/**
 * @file The animation loop.
 *
 * Calls `step(dt)` once per display frame with the elapsed time in seconds.
 * The step is clamped so a slow frame (or a tab coming back to the
 * foreground) never makes the simulation jump. The loop stops while the tab
 * is hidden, so the game uses no CPU in the background.
 */

/** Longest simulated step, in seconds. */
const MAX_STEP = 0.05;

export class GameLoop {
  /** @param {(dt: number) => void} step */
  constructor(step) {
    this.step = step;
    this.handle = 0;
    this.last = 0;
    this.running = false;
    this.frame = this.frame.bind(this);
    document.addEventListener('visibilitychange', () => {
      if (document.hidden) this.pause();
      else if (this.running) this.resume();
    });
  }

  start() {
    this.running = true;
    this.resume();
  }

  stop() {
    this.running = false;
    this.pause();
  }

  /** @private */
  resume() {
    if (this.handle) return;
    this.last = performance.now();
    this.handle = requestAnimationFrame(this.frame);
  }

  /** @private */
  pause() {
    cancelAnimationFrame(this.handle);
    this.handle = 0;
  }

  /**
   * @private
   * @param {number} now
   */
  frame(now) {
    this.handle = requestAnimationFrame(this.frame);
    const dt = Math.min(MAX_STEP, Math.max(0, (now - this.last) / 1000));
    this.last = now;
    this.step(dt);
  }
}
