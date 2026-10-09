import { getShapeBounds } from './shape-bounds.mjs';

/** @typedef {{ vertical: number[], horizontal: number[] }} SnapGuides */

/** @typedef {{ center?: boolean, edge?: boolean, grid?: boolean, gridCell?: number, gridDivisions?: number, objects?: boolean, threshold?: number }} SnapConfig */

const EMPTY_GUIDES = /** @type {SnapGuides} */ ({ vertical: [], horizontal: [] });

/**
 * @param {Record<string, unknown>[]} elements
 * @param {string[]} ids
 */
function selectionUnionBounds(elements, ids) {
  let minL = Infinity;
  let minT = Infinity;
  let maxR = -Infinity;
  let maxB = -Infinity;
  for (const id of ids) {
    const el = elements.find((e) => e.id === id);
    const box = el ? getShapeBounds(el) : null;
    if (!box) continue;
    minL = Math.min(minL, box.left);
    minT = Math.min(minT, box.top);
    maxR = Math.max(maxR, box.right);
    maxB = Math.max(maxB, box.bottom);
  }
  if (!Number.isFinite(minL)) return null;
  return { left: minL, top: minT, right: maxR, bottom: maxB };
}

/**
 * @param {SnapConfig} snap
 * @param {Record<string, unknown>[]} elements
 * @param {Set<string>} idSet
 * @param {{ w: number, h: number }} canvas
 */
function collectSnapTargets(snap, elements, idSet, canvas) {
  /** @type {number[]} */
  const vertical = [];
  /** @type {number[]} */
  const horizontal = [];

  if (snap.center) {
    vertical.push(canvas.w / 2);
    horizontal.push(canvas.h / 2);
  }
  if (snap.edge) {
    vertical.push(0, canvas.w);
    horizontal.push(0, canvas.h);
  }
  if (snap.grid) {
    const n =
      typeof snap.gridDivisions === 'number' && snap.gridDivisions > 0
        ? snap.gridDivisions
        : typeof snap.gridCell === 'number' && snap.gridCell > 0
          ? Math.round(canvas.w / snap.gridCell)
          : 0;
    if (n > 0) {
      for (let i = 0; i <= n; i++) {
        vertical.push((canvas.w * i) / n);
        horizontal.push((canvas.h * i) / n);
      }
    }
  }
  if (snap.objects !== false) {
    for (const el of elements) {
      if (!el?.id || idSet.has(String(el.id))) continue;
      const box = getShapeBounds(el);
      if (!box) continue;
      vertical.push(box.left, box.right, (box.left + box.right) / 2);
      horizontal.push(box.top, box.bottom, (box.top + box.bottom) / 2);
    }
  }

  return { vertical, horizontal };
}

/** @param {number[]} movingValues @param {number[]} targets @param {number} threshold */
function bestAxisSnap(movingValues, targets, threshold) {
  let shift = 0;
  let matchedTarget = null;
  let bestDist = threshold;
  for (const value of movingValues) {
    for (const target of targets) {
      const delta = target - value;
      const dist = Math.abs(delta);
      if (dist < bestDist) {
        bestDist = dist;
        shift = delta;
        matchedTarget = target;
      }
    }
  }
  return matchedTarget == null ? { shift: 0, guide: null } : { shift, guide: matchedTarget };
}

/**
 * @param {Record<string, unknown>[]} elements
 * @param {string[]} ids
 * @param {number} dx
 * @param {number} dy
 * @param {{ w: number, h: number }} canvas
 * @param {SnapConfig} [snap]
 */
export function computeTranslationSnap(elements, ids, dx, dy, canvas, snap = {}) {
  if (!snap.center && !snap.edge && !snap.grid) return { dx, dy, guides: EMPTY_GUIDES };
  const bounds = selectionUnionBounds(elements, ids);
  if (!bounds) return { dx, dy, guides: EMPTY_GUIDES };

  const threshold = typeof snap.threshold === 'number' ? snap.threshold : 12;
  const idSet = new Set(ids.map(String));
  const targets = collectSnapTargets(snap, elements, idSet, canvas);

  const cx = (bounds.left + bounds.right) / 2;
  const cy = (bounds.top + bounds.bottom) / 2;
  const xSnap = bestAxisSnap(
    [bounds.left + dx, bounds.right + dx, cx + dx],
    targets.vertical,
    threshold,
  );
  const ySnap = bestAxisSnap(
    [bounds.top + dy, bounds.bottom + dy, cy + dy],
    targets.horizontal,
    threshold,
  );

  const guides = /** @type {SnapGuides} */ ({ vertical: [], horizontal: [] });
  if (xSnap.guide != null) guides.vertical.push(xSnap.guide);
  if (ySnap.guide != null) guides.horizontal.push(ySnap.guide);

  return {
    dx: dx + xSnap.shift,
    dy: dy + ySnap.shift,
    guides,
  };
}

/** @param {Record<string, unknown>[]} elements @param {string[]} ids @param {number} dx @param {number} dy @param {{ w: number, h: number }} canvas @param {SnapConfig} [snap] */
export function applyTranslationSnap(elements, ids, dx, dy, canvas, snap = {}) {
  const result = computeTranslationSnap(elements, ids, dx, dy, canvas, snap);
  return { dx: result.dx, dy: result.dy };
}

/**
 * @param {{ left: number, top: number, right: number, bottom: number }} bbox
 * @param {{ w: number, h: number }} canvas
 * @param {SnapConfig} [snap]
 */
export function computeBBoxSnap(bbox, canvas, snap = {}) {
  if (!snap.center && !snap.edge && !snap.grid) return { bbox, guides: EMPTY_GUIDES };
  let l = bbox.left;
  let t = bbox.top;
  let r = bbox.right;
  let b = bbox.bottom;
  const threshold = typeof snap.threshold === 'number' ? snap.threshold : 12;
  const guides = /** @type {SnapGuides} */ ({ vertical: [], horizontal: [] });
  const idSet = new Set();
  const targets = collectSnapTargets(snap, [], idSet, canvas);

  const snapX = bestAxisSnap([l, r, (l + r) / 2], targets.vertical, threshold);
  let xShift = snapX.shift;
  if (snapX.guide != null) guides.vertical.push(snapX.guide);
  l += xShift;
  r += xShift;

  const snapY = bestAxisSnap([t, b, (t + b) / 2], targets.horizontal, threshold);
  let yShift = snapY.shift;
  if (snapY.guide != null) guides.horizontal.push(snapY.guide);
  t += yShift;
  b += yShift;

  if (r - l < 1 || b - t < 1) return { bbox, guides: EMPTY_GUIDES };
  return { bbox: { left: l, top: t, right: r, bottom: b }, guides };
}

export function applyBBoxSnap(bbox, canvas, snap = {}) {
  return computeBBoxSnap(bbox, canvas, snap).bbox;
}

/**
 * Snap moving edges while resizing (keeps opposite edges fixed).
 * @param {{ left: number, top: number, right: number, bottom: number }} bbox
 * @param {'nw'|'ne'|'se'|'sw'} handle
 * @param {{ w: number, h: number }} canvas
 * @param {SnapConfig} [snap]
 */
export function computeResizeBBoxSnap(bbox, handle, canvas, snap = {}) {
  if (!snap.center && !snap.edge && !snap.grid) return { bbox, guides: EMPTY_GUIDES };
  let l = bbox.left;
  let t = bbox.top;
  let r = bbox.right;
  let b = bbox.bottom;
  const threshold = typeof snap.threshold === 'number' && snap.threshold > 0 ? snap.threshold : 12;
  const guides = /** @type {SnapGuides} */ ({ vertical: [], horizontal: [] });
  const targets = collectSnapTargets(snap, [], new Set(), canvas);

  const moveL = handle === 'nw' || handle === 'sw';
  const moveR = handle === 'ne' || handle === 'se';
  const moveT = handle === 'nw' || handle === 'ne';
  const moveB = handle === 'sw' || handle === 'se';

  if (moveL) {
    const s = bestAxisSnap([l], targets.vertical, threshold);
    if (s.guide != null) {
      l = s.guide;
      guides.vertical.push(s.guide);
    }
  }
  if (moveR) {
    const s = bestAxisSnap([r], targets.vertical, threshold);
    if (s.guide != null) {
      r = s.guide;
      if (!guides.vertical.includes(s.guide)) guides.vertical.push(s.guide);
    }
  }
  if (moveT) {
    const s = bestAxisSnap([t], targets.horizontal, threshold);
    if (s.guide != null) {
      t = s.guide;
      guides.horizontal.push(s.guide);
    }
  }
  if (moveB) {
    const s = bestAxisSnap([b], targets.horizontal, threshold);
    if (s.guide != null) {
      b = s.guide;
      if (!guides.horizontal.includes(s.guide)) guides.horizontal.push(s.guide);
    }
  }

  if (l > r) [l, r] = [r, l];
  if (t > b) [t, b] = [b, t];
  if (r - l < 1 || b - t < 1) return { bbox, guides: EMPTY_GUIDES };
  return { bbox: { left: l, top: t, right: r, bottom: b }, guides };
}

export function applyResizeBBoxSnap(bbox, handle, canvas, snap = {}) {
  return computeResizeBBoxSnap(bbox, handle, canvas, snap).bbox;
}

/** @param {CanvasRenderingContext2D} ctx @param {SnapGuides | null | undefined} guides @param {{ w: number, h: number }} canvasSize @param {number} [uiScale] */
export function drawSnapGuides(ctx, guides, canvasSize, uiScale = 1) {
  if (!guides) return;
  const { vertical, horizontal } = guides;
  if (!vertical.length && !horizontal.length) return;

  const dash = [Math.max(4, 6 / uiScale), Math.max(3, 4 / uiScale)];
  const lineW = Math.max(1, 1.25 / uiScale);

  ctx.save();
  ctx.setLineDash(dash);
  ctx.lineWidth = lineW;

  if (vertical.length) {
    ctx.strokeStyle = 'rgba(255, 105, 180, 0.92)';
    for (const x of vertical) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvasSize.h);
      ctx.stroke();
    }
  }

  if (horizontal.length) {
    ctx.strokeStyle = 'rgba(72, 220, 255, 0.92)';
    for (const y of horizontal) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvasSize.w, y);
      ctx.stroke();
    }
  }

  ctx.restore();
}
