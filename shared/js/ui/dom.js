/**
 * @file A tiny helper for building HTML from code, without innerHTML (so
 * text coming from the player, such as their name, can never inject markup).
 */

/**
 * Creates an element.
 * @template {keyof HTMLElementTagNameMap} K
 * @param {K} tag
 * @param {Record<string, string | boolean | ((e: Event) => void)>} [attrs]
 *        "class", plain attributes, booleans (present/absent) and on* listeners
 * @param {Array<Node | string | null | false>} [children]
 * @returns {HTMLElementTagNameMap[K]}
 */
export function el(tag, attrs = {}, children = []) {
  const node = document.createElement(tag);
  for (const [key, value] of Object.entries(attrs)) {
    if (typeof value === 'function') node.addEventListener(key.slice(2).toLowerCase(), value);
    else if (value === true) node.setAttribute(key, '');
    else if (value !== false) node.setAttribute(key, value);
  }
  for (const child of children) {
    if (child === null || child === false) continue;
    node.append(child);
  }
  return node;
}
