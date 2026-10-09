/** Paint tools stored as selectable block elements (v1 parity). */
export const STROKE_ELEMENT_TOOLS = new Set([
  'pencil',
  'crayon',
  'pastel',
  'marker',
  'star',
  'bucket',
]);

/** @param {Record<string, unknown> | null | undefined} el */
export function isStrokeElement(el) {
  return !!el?.type && STROKE_ELEMENT_TOOLS.has(String(el.type));
}

/** Eraser paths are elements for z-order/replay but not selectable. */
export function isSelectableStrokeElement(el) {
  return isStrokeElement(el) && el.type !== 'eraser';
}

/**
 * @param {Record<string, unknown>} stroke committed draw payload (`tool`, `width`, …)
 */
export function strokePayloadToElement(stroke) {
  const tool = String(stroke.tool || 'brush');
  return {
    ...stroke,
    type: tool,
    lineWidth: stroke.width ?? stroke.lineWidth ?? 10,
  };
}

/**
 * @param {Record<string, unknown>} el
 * @param {{ layerIndex?: number, logicalW?: number, logicalH?: number }} [ctx]
 */
export function elementToStrokePayload(el, ctx = {}) {
  return {
    ...el,
    tool: String(el.type),
    width: Number(el.width ?? el.lineWidth ?? 10),
    _layerIndex: ctx.layerIndex,
    _logicalW: ctx.logicalW,
    _logicalH: ctx.logicalH,
  };
}

/**
 * @param {Record<string, unknown>} el
 * @returns {{ left: number, top: number, right: number, bottom: number } | null}
 */
export function getStrokeElementBounds(el) {
  if (!isStrokeElement(el) || el.type === 'eraser') return null;
  if (el.type === 'bucket') {
    const x = Number(el.x);
    const y = Number(el.y);
    if (!Number.isFinite(x) || !Number.isFinite(y)) return null;
    const pad = 8;
    return { left: x - pad, top: y - pad, right: x + pad, bottom: y + pad };
  }
  const pts = /** @type {{ x: number, y: number }[]} */ (el.points);
  if (!pts?.length) return null;
  const pad = Math.max(4, (Number(el.width ?? el.lineWidth ?? 10) / 2) || 5);
  let left = Infinity;
  let top = Infinity;
  let right = -Infinity;
  let bottom = -Infinity;
  for (const p of pts) {
    left = Math.min(left, p.x - pad);
    top = Math.min(top, p.y - pad);
    right = Math.max(right, p.x + pad);
    bottom = Math.max(bottom, p.y + pad);
  }
  return left === Infinity ? null : { left, top, right, bottom };
}

/**
 * @param {number} px
 * @param {number} py
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 */
function distToSegment(px, py, x0, y0, x1, y1) {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const len2 = dx * dx + dy * dy;
  if (len2 < 1e-6) return Math.hypot(px - x0, py - y0);
  let t = ((px - x0) * dx + (py - y0) * dy) / len2;
  t = Math.max(0, Math.min(1, t));
  return Math.hypot(px - (x0 + t * dx), py - (y0 + t * dy));
}

/**
 * @param {Record<string, unknown>} el
 * @param {number} x
 * @param {number} y
 */
export function hitTestStrokeElementAt(el, x, y) {
  if (!isSelectableStrokeElement(el)) return false;
  const box = getStrokeElementBounds(el);
  if (box) {
    const pad = 6;
    if (x >= box.left - pad && x <= box.right + pad && y >= box.top - pad && y <= box.bottom + pad) {
      return true;
    }
  }
  const pts = /** @type {{ x: number, y: number }[]} */ (el.points);
  if (!pts || pts.length < 2) return false;
  const half = Math.max(4, Number(el.width ?? el.lineWidth ?? 10) / 2);
  for (let i = 0; i < pts.length - 1; i++) {
    if (distToSegment(x, y, pts[i].x, pts[i].y, pts[i + 1].x, pts[i + 1].y) <= half) {
      return true;
    }
  }
  return false;
}

/**
 * @param {Record<string, unknown>} el
 * @param {number} dx
 * @param {number} dy
 */
export function translateStrokeElement(el, dx, dy) {
  if (el.type === 'bucket') {
    el.x = Number(el.x) + dx;
    el.y = Number(el.y) + dy;
    return;
  }
  const pts = /** @type {{ x: number, y: number }[]} */ (el.points);
  if (!pts?.length) return;
  for (const p of pts) {
    p.x += dx;
    p.y += dy;
  }
}

/** @param {{ strokes?: object[], elements?: object[] }} block */
export function migrateBlockStrokesToElements(block) {
  const strokes = block.strokes || [];
  if (!strokes.length) return;
  if (!block.elements) block.elements = [];
  for (const stroke of strokes) {
    block.elements.push(strokePayloadToElement(stroke));
  }
  block.strokes = [];
}
