/**
 * @template {Element} T
 * @param {ParentNode} root
 * @param {string} selector
 * @param {{new(): T}} constructor
 * @returns {T}
 */
export function query(root, selector, constructor) {
  const element = root.querySelector(selector);
  if (!(element instanceof constructor)) throw new Error(`Élément requis absent : ${selector}`);
  return element;
}

/** @param {string} value */
export function escapeHTML(value) {
  /** @type {Record<string, string>} */
  const entities = {
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  };
  return value.replace(/[&<>"']/g, character => entities[character] ?? character);
}
