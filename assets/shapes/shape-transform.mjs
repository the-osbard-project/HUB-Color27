import { getShapeBounds, getShapeFrameBounds, translateShapeElement } from './shape-bounds.mjs';
import { isSelectableStrokeElement } from './stroke-element.mjs';
import { CT_CANVAS_SIZE, getDrawCanvas } from '../ct-canvas.mjs';

/** @typedef {'nw'|'ne'|'se'|'sw'} ResizeHandleId */

const RESIZABLE_TYPES = new Set([
  'circle',
  'square',
  'triangle',
  'polygon',
  'line',
  'curve',
  'group',
  'text',
  'image',
  'pencil',
  'crayon',
  'pastel',
  'marker',
  'star',
]);

const ROTATABLE_TYPES = new Set([
  'circle',
  'square',
  'triangle',
  'polygon',
  'group',
  'text',
  'image',
  'pencil',
  'crayon',
  'pastel',
  'marker',
  'star',
]);

/**
 * Scale selection chrome so handles stay ~constant on screen.
 * Accounts for zoom and CSS shrink (840 vs 2625 logical canvas).
 * @param {number} zoom
 */
export function getSelectionUiScale(zoom = 1) {
  let z = Number(zoom);
  if (!Number.isFinite(z) || z <= 0) z = 1;
  z = Math.max(0.25, Math.min(4, z));

  let displayFactor = 1;
  const canvas = getDrawCanvas() ?? document.getElementById('ct-object-overlay');
  if (canvas instanceof HTMLElement) {
    const w = canvas.getBoundingClientRect().width;
    if (w > 1) displayFactor = CT_CANVAS_SIZE / w;
  }

  /* ~12–16 CSS px handles at 1×; clamp so extreme shrink stays usable */
  return Math.max(1, Math.min(14, displayFactor / z));
}

/** @param {Record<string, unknown> | null | undefined} el */
export function canResizeElement(el) {
  if (!el?.type) return false;
  if (isSelectableStrokeElement(el)) return true;
  return RESIZABLE_TYPES.has(String(el.type));
}

/** @param {Record<string, unknown> | null | undefined} el */
export function canRotateElement(el) {
  if (!el?.type) return false;
  if (isSelectableStrokeElement(el)) return true;
  return ROTATABLE_TYPES.has(String(el.type));
}

/** Rotation pivot — always defined for rotatable types. */
export function getRotatePivot(el) {
  if (!el?.type) return null;
  if (el.type === 'group' && Array.isArray(el.children)) {
    const box = getShapeBounds(el);
    if (!box) return null;
    return { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
  }
  if (el.type === 'circle') return { x: Number(el.cx), y: Number(el.cy) };
  if (el.type === 'square' || el.type === 'triangle' || el.type === 'image') {
    const l = Number(el.left);
    const t = Number(el.top);
    const w = Math.max(1, Number(el.w) || 10);
    const h = Math.max(1, Number(el.h) || 10);
    if (el.type === 'triangle') {
      const cx = l + w / 2;
      const ptY = el.dragDown ? t : t + h;
      const baseY = el.dragDown ? t + h : t;
      return { x: cx, y: (ptY + baseY) / 2 };
    }
    return { x: l + w / 2, y: t + h / 2 };
  }
  if (el.type === 'polygon' && Array.isArray(el.points) && el.points.length) {
    let px = 0;
    let py = 0;
    for (const p of el.points) {
      px += p.x;
      py += p.y;
    }
    const n = el.points.length;
    return { x: px / n, y: py / n };
  }
  if (el.type === 'text') return { x: Number(el.x), y: Number(el.y) };
  const box = getShapeBounds(el);
  if (!box) return null;
  return { x: (box.left + box.right) / 2, y: (box.top + box.bottom) / 2 };
}

/** Oriented pivot — only when element already has rotation. */
export function getSelectionPivot(el) {
  const rot = typeof el?.rotation === 'number' ? el.rotation : 0;
  if (rot === 0) return null;
  return getRotatePivot(el);
}

export function worldDeltaToLocal(rot, dx, dy) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return { x: dx * c + dy * s, y: -dx * s + dy * c };
}

export function localDeltaToWorld(rot, lx, ly) {
  const c = Math.cos(rot);
  const s = Math.sin(rot);
  return { x: lx * c - ly * s, y: lx * s + ly * c };
}

function orientedResizeUsesCenterPivot(el) {
  const t = el?.type;
  return t === 'square' || t === 'circle' || t === 'text' || t === 'group' || t === 'image';
}

/**
 * Local-frame resize while rotated: bbox0 is the unrotated frame; pointer is world.
 * Returns a new local frame (left/top/right/bottom in element space).
 * @param {Record<string, unknown>} el
 * @param {{ left: number, top: number, right: number, bottom: number }} bbox0
 * @param {ResizeHandleId} handle
 * @param {number} px
 * @param {number} py
 */
export function orientedResizeToBBox(el, bbox0, handle, px, py) {
  if (!el || !bbox0 || !handle || !orientedResizeUsesCenterPivot(el)) return null;
  const rot = typeof el.rotation === 'number' ? el.rotation : 0;
  if (rot === 0) return null;
  const ox = (bbox0.left + bbox0.right) / 2;
  const oy = (bbox0.top + bbox0.bottom) / 2;
  /* Frame corners are already in local (unrotated) space. */
  const { left: L0, top: T0, right: R0, bottom: B0 } = bbox0;
  const uNW = { x: L0 - ox, y: T0 - oy };
  const uNE = { x: R0 - ox, y: T0 - oy };
  const uSE = { x: R0 - ox, y: B0 - oy };
  const uSW = { x: L0 - ox, y: B0 - oy };
  const uPt = worldDeltaToLocal(rot, px - ox, py - oy);
  let uTL;
  let uBR;
  if (handle === 'se') {
    uTL = uNW;
    uBR = uPt;
  } else if (handle === 'nw') {
    uTL = uPt;
    uBR = uSE;
  } else if (handle === 'ne') {
    uTL = { x: uSW.x, y: uPt.y };
    uBR = { x: uPt.x, y: uSW.y };
  } else if (handle === 'sw') {
    uTL = { x: uPt.x, y: uNE.y };
    uBR = { x: uNE.x, y: uPt.y };
  } else {
    return null;
  }
  const L = ox + Math.min(uTL.x, uBR.x);
  const T = oy + Math.min(uTL.y, uBR.y);
  const R = ox + Math.max(uTL.x, uBR.x);
  const B = oy + Math.max(uTL.y, uBR.y);
  if (R - L < 1 || B - T < 1) return null;
  return { left: L, top: T, right: R, bottom: B };
}

/**
 * World position of a local-frame point after element rotation about its pivot.
 * @param {Record<string, unknown>} el
 * @param {number} lx
 * @param {number} ly
 */
export function localFramePointToWorld(el, lx, ly) {
  const rot = typeof el.rotation === 'number' ? el.rotation : 0;
  const pivot = getRotatePivot(el);
  if (!pivot || rot === 0) return { x: lx, y: ly };
  const o = localDeltaToWorld(rot, lx - pivot.x, ly - pivot.y);
  return { x: pivot.x + o.x, y: pivot.y + o.y };
}

/**
 * @param {number} x
 * @param {number} y
 * @param {{ left: number, top: number, right: number, bottom: number }} bbox
 * @param {Record<string, unknown> | null | undefined} el
 * @param {number} uiScale
 * @returns {ResizeHandleId | null}
 */
export function getResizeHandleAt(x, y, bbox, el, uiScale = 1) {
  if (!bbox) return null;
  const pad = 16 * uiScale;
  const chromePad = 4 * uiScale;
  const rot = el && typeof el.rotation === 'number' ? el.rotation : 0;
  const pivot = rot !== 0 && el ? getRotatePivot(el) : null;
  const L = bbox.left - chromePad;
  const T = bbox.top - chromePad;
  const R = bbox.right + chromePad;
  const B = bbox.bottom + chromePad;

  if (pivot && rot !== 0 && el) {
    const corners = [
      { id: /** @type {ResizeHandleId} */ ('nw'), ...localFramePointToWorld(el, L, T) },
      { id: /** @type {ResizeHandleId} */ ('ne'), ...localFramePointToWorld(el, R, T) },
      { id: /** @type {ResizeHandleId} */ ('se'), ...localFramePointToWorld(el, R, B) },
      { id: /** @type {ResizeHandleId} */ ('sw'), ...localFramePointToWorld(el, L, B) },
    ];
    let best = /** @type {ResizeHandleId | null} */ (null);
    let bestDist = pad;
    for (const c of corners) {
      const d = Math.hypot(x - c.x, y - c.y);
      if (d <= bestDist) {
        bestDist = d;
        best = c.id;
      }
    }
    return best;
  }

  if (x >= L - pad && x <= L + pad && y >= T - pad && y <= T + pad) return 'nw';
  if (x >= R - pad && x <= R + pad && y >= T - pad && y <= T + pad) return 'ne';
  if (x >= R - pad && x <= R + pad && y >= B - pad && y <= B + pad) return 'se';
  if (x >= L - pad && x <= L + pad && y >= B - pad && y <= B + pad) return 'sw';
  return null;
}

/**
 * @param {Record<string, unknown>} el
 * @param {{ left: number, top: number, right: number, bottom: number }} bbox
 * @param {number} padSel
 * @param {number} uiScale
 */
export function getRotateHandleWorld(el, bbox, padSel, uiScale = 1) {
  if (!el || !bbox) return null;
  const rot = typeof el.rotation === 'number' ? el.rotation : 0;
  const mx = (bbox.left + bbox.right) / 2;
  const my = bbox.top - padSel - 24 * uiScale;
  if (rot !== 0) {
    return localFramePointToWorld(el, mx, my);
  }
  return { x: mx, y: my };
}

export function getRotateHandleAt(x, y, bbox, el, uiScale = 1) {
  if (!bbox) return false;
  const pad = 18 * uiScale;
  const padSel = 4 * uiScale;
  const rw = el ? getRotateHandleWorld(el, bbox, padSel, uiScale) : null;
  if (rw) return Math.hypot(x - rw.x, y - rw.y) <= pad;
  const cx = (bbox.left + bbox.right) / 2;
  const cy = bbox.top - 24 * uiScale;
  return Math.hypot(x - cx, y - cy) <= pad;
}

/** @param {Record<string, unknown>} el @param {number} sx @param {number} sy @param {number} ax @param {number} ay */
export function scaleOneElementAboutPoint(el, sx, sy, ax, ay) {
  if (!el?.type || !Number.isFinite(sx) || !Number.isFinite(sy) || sx <= 0 || sy <= 0) return;
  const tx = (x) => ax + ((Number.isFinite(x) ? x : 0) - ax) * sx;
  const ty = (y) => ay + ((Number.isFinite(y) ? y : 0) - ay) * sy;
  const lwScale = Math.sqrt(sx * sy);

  if (el.type === 'group' && Array.isArray(el.children)) {
    for (const child of el.children) scaleOneElementAboutPoint(child, sx, sy, ax, ay);
    return;
  }

  if (el.type === 'circle') {
    el.cx = tx(Number(el.cx));
    el.cy = ty(Number(el.cy));
    el.rx = Math.max(0.5, Number(el.rx || 10) * sx);
    el.ry = Math.max(0.5, Number(el.ry || 10) * sy);
    if (el.lineWidth != null) el.lineWidth = Math.max(0.25, Number(el.lineWidth) * lwScale);
    return;
  }
  if (el.type === 'square' || el.type === 'triangle' || el.type === 'image') {
    el.left = tx(Number(el.left));
    el.top = ty(Number(el.top));
    el.w = Math.max(1, Number(el.w || 10) * sx);
    el.h = Math.max(1, Number(el.h || 10) * sy);
    if (el.lineWidth != null) el.lineWidth = Math.max(0.25, Number(el.lineWidth) * lwScale);
    return;
  }
  if (el.type === 'polygon' && Array.isArray(el.points)) {
    for (const p of el.points) {
      p.x = tx(p.x);
      p.y = ty(p.y);
      if (p.cpx != null) p.cpx = tx(p.cpx);
      if (p.cpy != null) p.cpy = ty(p.cpy);
    }
    if (el.lineWidth != null) el.lineWidth = Math.max(0.25, Number(el.lineWidth) * lwScale);
    return;
  }
  if (el.type === 'line') {
    el.x0 = tx(Number(el.x0));
    el.y0 = ty(Number(el.y0));
    el.x1 = tx(Number(el.x1));
    el.y1 = ty(Number(el.y1));
    if (el.lineWidth != null) el.lineWidth = Math.max(0.25, Number(el.lineWidth) * lwScale);
    return;
  }
  if (el.type === 'curve') {
    el.x1 = tx(Number(el.x1));
    el.y1 = ty(Number(el.y1));
    el.x2 = tx(Number(el.x2));
    el.y2 = ty(Number(el.y2));
    el.cpx = tx(Number(el.cpx));
    el.cpy = ty(Number(el.cpy));
    if (el.lineWidth != null) el.lineWidth = Math.max(0.25, Number(el.lineWidth) * lwScale);
    return;
  }
  if (el.type === 'text') {
    el.x = tx(Number(el.x));
    el.y = ty(Number(el.y));
    if (el.width != null) el.width = Math.max(1, Number(el.width) * sx);
    if (el.wrapWidth != null) el.wrapWidth = Math.max(1, Number(el.wrapWidth) * sx);
    if (el.height != null) el.height = Math.max(1, Number(el.height) * sy);
    if (el.fontSize != null) el.fontSize = Math.max(3, Number(el.fontSize) * lwScale);
    if (el.textStrokeWidth != null) {
      el.textStrokeWidth = Math.max(0.25, Number(el.textStrokeWidth) * lwScale);
    }
    return;
  }
  if (isSelectableStrokeElement(el)) {
    const pts = /** @type {{ x: number, y: number }[]} */ (el.points);
    if (pts) {
      for (const p of pts) {
        p.x = tx(p.x);
        p.y = ty(p.y);
      }
    }
    const lw = Number(el.width ?? el.lineWidth ?? 10);
    const nextLw = Math.max(0.25, lw * lwScale);
    el.width = nextLw;
    el.lineWidth = nextLw;
  }
}

/** @param {Record<string, unknown>} el @param {{ left: number, top: number, right: number, bottom: number }} bbox */
export function applyBboxToElement(el, bbox) {
  if (!el || !bbox) return;
  if (el.type === 'group' && Array.isArray(el.children) && el.children.length) {
    const groupBbox = getShapeBounds(el);
    if (!groupBbox) return;
    const gw = Math.max(1, groupBbox.right - groupBbox.left);
    const gh = Math.max(1, groupBbox.bottom - groupBbox.top);
    const nw = Math.max(1, bbox.right - bbox.left);
    const nh = Math.max(1, bbox.bottom - bbox.top);
    const sx = nw / gw;
    const sy = nh / gh;
    const ax = (groupBbox.left + groupBbox.right) / 2;
    const ay = (groupBbox.top + groupBbox.bottom) / 2;
    for (const child of el.children) scaleOneElementAboutPoint(child, sx, sy, ax, ay);
    const u = getShapeBounds(el);
    if (u) {
      const dx = bbox.left - u.left;
      const dy = bbox.top - u.top;
      if (dx !== 0 || dy !== 0) {
        for (const child of el.children) translateShapeElement(child, dx, dy);
      }
    }
    return;
  }

  const l = bbox.left;
  const t = bbox.top;
  const r = bbox.right;
  const b = bbox.bottom;
  const w = Math.max(1, r - l);
  const h = Math.max(1, b - t);
  const cx = (l + r) / 2;
  const cy = (t + b) / 2;

  if (el.type === 'circle') {
    el.cx = cx;
    el.cy = cy;
    el.rx = w / 2;
    el.ry = h / 2;
    return;
  }
  if (el.type === 'square' || el.type === 'triangle' || el.type === 'image') {
    el.left = l;
    el.top = t;
    el.w = w;
    el.h = h;
    return;
  }
  if (el.type === 'polygon' && Array.isArray(el.points) && el.points.length >= 2) {
    const pts = el.points;
    let minX = pts[0].x;
    let minY = pts[0].y;
    let maxX = pts[0].x;
    let maxY = pts[0].y;
    for (let i = 1; i < pts.length; i++) {
      minX = Math.min(minX, pts[i].x);
      maxX = Math.max(maxX, pts[i].x);
      minY = Math.min(minY, pts[i].y);
      maxY = Math.max(maxY, pts[i].y);
    }
    const oldW = Math.max(1, maxX - minX);
    const oldH = Math.max(1, maxY - minY);
    const oldCx = (minX + maxX) / 2;
    const oldCy = (minY + maxY) / 2;
    for (const p of pts) {
      p.x = cx + ((p.x - oldCx) * w) / oldW;
      p.y = cy + ((p.y - oldCy) * h) / oldH;
      if (p.cpx != null && p.cpy != null) {
        p.cpx = cx + ((p.cpx - oldCx) * w) / oldW;
        p.cpy = cy + ((p.cpy - oldCy) * h) / oldH;
      }
    }
    return;
  }
  if (el.type === 'line') {
    el.x0 = l;
    el.y0 = t;
    el.x1 = r;
    el.y1 = b;
    return;
  }
  if (el.type === 'curve') {
    const ox = (Number(el.x1) + Number(el.x2)) / 2;
    const oy = (Number(el.y1) + Number(el.y2)) / 2;
    const ocpx = (el.cpx != null ? Number(el.cpx) : ox) - ox;
    const ocpy = (el.cpy != null ? Number(el.cpy) : oy) - oy;
    const oldW = Math.max(1, Math.abs(Number(el.x2) - Number(el.x1)));
    const oldH = Math.max(1, Math.abs(Number(el.y2) - Number(el.y1)));
    el.x1 = l;
    el.y1 = t;
    el.x2 = r;
    el.y2 = b;
    el.cpx = cx + ocpx * (w / oldW);
    el.cpy = cy + ocpy * (h / oldH);
    return;
  }
  if (el.type === 'text') {
    const contentW = Math.max(
      1,
      Number(el.wrapWidth) > 0 ? Number(el.wrapWidth) : Number(el.width) > 0 ? Number(el.width) : 100,
    );
    const contentH = Math.max(1, Number(el.height) > 0 ? Number(el.height) : 24);
    const scaleW = w / contentW;
    const scaleH = h / contentH;
    el.scale = Math.max(0.15, Math.min(scaleW, scaleH, 20));
    return;
  }
  if (isSelectableStrokeElement(el) && Array.isArray(el.points) && el.points.length >= 1) {
    const pts = /** @type {{ x: number, y: number }[]} */ (el.points);
    let minX = pts[0].x;
    let minY = pts[0].y;
    let maxX = pts[0].x;
    let maxY = pts[0].y;
    for (let i = 1; i < pts.length; i++) {
      minX = Math.min(minX, pts[i].x);
      maxX = Math.max(maxX, pts[i].x);
      minY = Math.min(minY, pts[i].y);
      maxY = Math.max(maxY, pts[i].y);
    }
    const oldW = Math.max(1, maxX - minX);
    const oldH = Math.max(1, maxY - minY);
    const oldCx = (minX + maxX) / 2;
    const oldCy = (minY + maxY) / 2;
    for (const p of pts) {
      p.x = cx + ((p.x - oldCx) * w) / oldW;
      p.y = cy + ((p.y - oldCy) * h) / oldH;
    }
    const lw = Number(el.width ?? el.lineWidth ?? 10);
    const lwScale = Math.sqrt((w / oldW) * (h / oldH));
    const nextLw = Math.max(0.25, lw * lwScale);
    el.width = nextLw;
    el.lineWidth = nextLw;
  }
}

/**
 * Scale AABB about its center (Inkscape Ctrl / Ctrl+Shift corner resize).
 * @param {{ left: number, top: number, right: number, bottom: number }} startBbox
 * @param {number} px
 * @param {number} py
 * @param {boolean} aspectLock
 */
function bboxFromCenterResize(startBbox, px, py, aspectLock) {
  const cx = (startBbox.left + startBbox.right) / 2;
  const cy = (startBbox.top + startBbox.bottom) / 2;
  const origW = Math.max(1, startBbox.right - startBbox.left);
  const origH = Math.max(1, startBbox.bottom - startBbox.top);
  let halfW = Math.max(4, Math.abs(px - cx));
  let halfH = Math.max(4, Math.abs(py - cy));
  if (aspectLock) {
    const aspect = origW / origH;
    if (halfW / halfH > aspect) halfH = halfW / aspect;
    else halfW = halfH * aspect;
    halfW = Math.max(4, halfW);
    halfH = Math.max(4, halfH);
  }
  return {
    left: cx - halfW,
    top: cy - halfH,
    right: cx + halfW,
    bottom: cy + halfH,
  };
}

/**
 * @param {{ left: number, top: number, right: number, bottom: number }} startBbox
 * @param {ResizeHandleId} handle
 * @param {number} px
 * @param {number} py
 * @param {Record<string, unknown>} el
 * @param {boolean} aspectLock
 * @param {boolean} [fromCenter] Inkscape-style: grow/shrink all sides about center
 */
export function bboxFromResizeDrag(startBbox, handle, px, py, el, aspectLock = false, fromCenter = false) {
  if (fromCenter) {
    const centered = bboxFromCenterResize(startBbox, px, py, aspectLock);
    if (el.type === 'text') {
      const newW = Math.max(8, centered.right - centered.left);
      const newH = Math.max(8, centered.bottom - centered.top);
      const cx = Number(el.x);
      const cy = Number(el.y);
      return {
        left: cx - newW / 2,
        top: cy - newH / 2,
        right: cx + newW / 2,
        bottom: cy + newH / 2,
      };
    }
    return centered;
  }

  const oriented = !aspectLock ? orientedResizeToBBox(el, startBbox, handle, px, py) : null;
  let l = startBbox.left;
  let t = startBbox.top;
  let r = startBbox.right;
  let b = startBbox.bottom;
  if (oriented) {
    l = oriented.left;
    t = oriented.top;
    r = oriented.right;
    b = oriented.bottom;
  } else {
    if (handle === 'nw') {
      l = px;
      t = py;
    } else if (handle === 'ne') {
      r = px;
      t = py;
    } else if (handle === 'se') {
      r = px;
      b = py;
    } else if (handle === 'sw') {
      l = px;
      b = py;
    }
    if (l > r) [l, r] = [r, l];
    if (t > b) [t, b] = [b, t];
  }

  if (aspectLock) {
    const origW = Math.max(1, startBbox.right - startBbox.left);
    const origH = Math.max(1, startBbox.bottom - startBbox.top);
    const aspect = origW / origH;
    let fx;
    let fy;
    if (handle === 'nw') {
      fx = startBbox.right;
      fy = startBbox.bottom;
    } else if (handle === 'ne') {
      fx = startBbox.left;
      fy = startBbox.bottom;
    } else if (handle === 'se') {
      fx = startBbox.left;
      fy = startBbox.top;
    } else {
      fx = startBbox.right;
      fy = startBbox.top;
    }
    let newW = Math.max(8, Math.abs(px - fx));
    let newH = Math.max(8, Math.abs(py - fy));
    if (newW / newH > aspect) newW = newH * aspect;
    else newH = newW / aspect;
    if (handle === 'nw') {
      l = fx - newW;
      t = fy - newH;
      r = fx;
      b = fy;
    } else if (handle === 'ne') {
      l = fx;
      t = fy - newH;
      r = fx + newW;
      b = fy;
    } else if (handle === 'se') {
      l = fx;
      t = fy;
      r = fx + newW;
      b = fy + newH;
    } else {
      l = fx - newW;
      t = fy;
      r = fx;
      b = fy + newH;
    }
  }

  if (el.type === 'text') {
    const newW = Math.max(8, r - l);
    const newH = Math.max(8, b - t);
    const cx = Number(el.x);
    const cy = Number(el.y);
    l = cx - newW / 2;
    t = cy - newH / 2;
    r = cx + newW / 2;
    b = cy + newH / 2;
  }

  if (r - l < 1 || b - t < 1) return null;
  return { left: l, top: t, right: r, bottom: b };
}
