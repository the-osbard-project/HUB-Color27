/** v1 pointer.js shape geometry helpers */

export const LINE_CURVE_ANGLE_SNAP_DEG = 10;
export const POLYGON_CLOSE_THRESHOLD = 16;
export const POLYGON_DOUBLE_CLICK_MS = 1000;

/** @type {readonly string[]} */
export const SHAPE_TYPES_CONSTRAIN_SQUARE = ['circle', 'square', 'triangle'];

/**
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 */
export function constrainToSquare(x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const side = Math.max(Math.abs(dx), Math.abs(dy));
  return {
    x1: x0 + (dx >= 0 ? side : -side),
    y1: y0 + (dy >= 0 ? side : -side),
  };
}

/**
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 * @param {number} stepDeg
 */
export function snapLineEndpointToAngleStep(x0, y0, x1, y1, stepDeg) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const r = Math.hypot(dx, dy);
  if (r < 1e-6) return { x1, y1 };
  const stepRad = (stepDeg * Math.PI) / 180;
  const ang = Math.atan2(dy, dx);
  const snapped = Math.round(ang / stepRad) * stepRad;
  return { x1: x0 + r * Math.cos(snapped), y1: y0 + r * Math.sin(snapped) };
}

/**
 * @param {number} x1
 * @param {number} y1
 * @param {number} cpx
 * @param {number} cpy
 * @param {number} x2
 * @param {number} y2
 * @param {number} [steps]
 */
export function sampleQuadratic(x1, y1, cpx, cpy, x2, y2, steps = 24) {
  /** @type {{ x: number, y: number }[]} */
  const pts = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const u = 1 - t;
    pts.push({
      x: u * u * x1 + 2 * u * t * cpx + t * t * x2,
      y: u * u * y1 + 2 * u * t * cpy + t * t * y2,
    });
  }
  return pts;
}

/** @param {string | null | undefined} endcap */
export function lineCapFromEndcap(endcap) {
  return endcap === 'flat' ? 'butt' : 'round';
}

/** @param {PointerEvent} e */
export function pointerShiftDown(e) {
  return !!(e.shiftKey || e.getModifierState?.('Shift'));
}

export function newShapeElementId() {
  return `shape-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}
