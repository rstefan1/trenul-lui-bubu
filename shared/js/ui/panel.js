/**
 * @file Shows the panel of a station mission, with a smooth way out.
 *
 * A panel that is replaced or removed does not simply vanish: it shrinks
 * and fades for a moment (CSS, transform and opacity only), while the new
 * one comes in on the same spot. The panel being removed no longer reacts
 * to touches.
 */

/** Must match the length of the `panel-out` animation in game.css. */
const LEAVE_MS = 250;

/**
 * Shows a panel in the missions' panel layer, or removes the current one.
 * @param {HTMLElement} root   the panel layer (#missionPanel)
 * @param {HTMLElement | null} node
 * @param {{bottom?: boolean}} [o]  bottom: at the bottom, so the scene stays visible
 */
export function showPanel(root, node, o = {}) {
  for (const old of [...root.children]) {
    if (old.classList.contains('is-leaving')) continue;
    old.classList.add('is-leaving');
    old.setAttribute('aria-hidden', 'true');
    setTimeout(() => {
      old.remove();
      if (!root.children.length) root.hidden = true;
    }, LEAVE_MS);
  }
  if (!node) return;
  root.hidden = false;
  root.classList.toggle('is-bottom', !!o.bottom);
  // in front of the panels that are leaving: missions find theirs as the first child
  root.prepend(node);
}

/**
 * Removes a control from the page (a gearbox, a big button, a ticket)
 * after its short way out.
 * @param {Element | null | undefined} node
 */
export function leave(node) {
  if (!node || node.classList.contains('is-leaving')) return;
  node.classList.add('is-leaving');
  setTimeout(() => node.remove(), LEAVE_MS);
}
