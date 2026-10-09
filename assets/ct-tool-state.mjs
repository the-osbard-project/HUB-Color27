/** Color Time! — q300 Set (shapes) session state. */

export const SHAPE_TYPE_IDS = /** @type {const} */ ([
  'circle',
  'square',
  'triangle',
  'polygon',
  'line',
  'curve',
]);

/** @typedef {'draw' | 'shape'} CtSessionMode */

/** @type {CtSessionMode} */
let sessionMode = 'draw';

/** @type {string} */
let shapeType = 'circle';

export function getCtSessionMode() {
  return sessionMode;
}

/** @param {CtSessionMode} mode */
export function setCtSessionMode(mode) {
  sessionMode = mode;
  window.dispatchEvent(new CustomEvent('ct-session-mode-changed', { detail: { mode } }));
}

export function getCtShapeType() {
  return shapeType;
}

/** @param {string} type */
export function setCtShapeType(type) {
  if (!SHAPE_TYPE_IDS.includes(type)) return;
  shapeType = type;
  window.dispatchEvent(new CustomEvent('ct-shape-type-changed', { detail: { shapeType: type } }));
}
