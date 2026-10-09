import { getSelectionPivot, getSelectionUiScale, localDeltaToWorld, worldDeltaToLocal } from './shape-rotate.mjs';

/**
 * @param {Record<string, unknown>} el
 * @returns {{ vertices: { x: number, y: number }[], segmentHandles: { x: number, y: number, segmentIndex: number }[] } | null}
 */
export function getPolygonSelectionHandles(el) {
  if (!el || el.type !== 'polygon') return null;
  const pts = /** @type {{ x: number, y: number, cpx?: number, cpy?: number }[]} */ (el.points);
  if (!pts || pts.length < 2) return null;
  const n = pts.length;
  const isOpen = el.closed === false;
  const vertices = pts.map((p) => ({ x: p.x, y: p.y }));
  const segmentHandles = [];
  const segCount = isOpen ? n - 1 : n;
  for (let i = 0; i < segCount; i++) {
    const from = pts[i];
    const to = pts[(i + 1) % n];
    if (from.cpx != null && from.cpy != null) {
      segmentHandles.push({ x: from.cpx, y: from.cpy, segmentIndex: i });
    } else {
      segmentHandles.push({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2, segmentIndex: i });
    }
  }
  return { vertices, segmentHandles };
}

/** Map stored polygon coords to stage space when el.rotation is applied. */
export function polygonPointToWorld(el, vx, vy) {
  const rot = typeof el.rotation === 'number' ? el.rotation : 0;
  if (rot === 0) return { x: vx, y: vy };
  const pv = getSelectionPivot(el);
  if (!pv) return { x: vx, y: vy };
  const o = localDeltaToWorld(rot, vx - pv.x, vy - pv.y);
  return { x: pv.x + o.x, y: pv.y + o.y };
}

/** Map stage pointer coords into polygon local space. */
export function polygonWorldToLocal(el, wx, wy) {
  const rot = typeof el.rotation === 'number' ? el.rotation : 0;
  if (rot === 0) return { x: wx, y: wy };
  const pv = getSelectionPivot(el);
  if (!pv) return { x: wx, y: wy };
  const o = worldDeltaToLocal(rot, wx - pv.x, wy - pv.y);
  return { x: pv.x + o.x, y: pv.y + o.y };
}

/**
 * @param {number} x
 * @param {number} y
 * @param {Record<string, unknown>} el
 * @param {number} [pad]
 * @returns {{ type: 'vertex' | 'segment', index: number } | null}
 */
export function getPolygonHandleAt(x, y, el, pad = 16) {
  const h = getPolygonSelectionHandles(el);
  if (!h) return null;
  const hitPad = pad * getSelectionUiScale();
  for (let i = 0; i < h.vertices.length; i++) {
    const vw = polygonPointToWorld(el, h.vertices[i].x, h.vertices[i].y);
    if (Math.hypot(x - vw.x, y - vw.y) <= hitPad) return { type: 'vertex', index: i };
  }
  for (let j = 0; j < h.segmentHandles.length; j++) {
    const s = h.segmentHandles[j];
    const sw = polygonPointToWorld(el, s.x, s.y);
    if (Math.hypot(x - sw.x, y - sw.y) <= hitPad) return { type: 'segment', index: s.segmentIndex };
  }
  return null;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number, cpx?: number, cpy?: number }[]} pts
 * @param {boolean} isOpen
 * @param {{ close?: boolean }} [opts]
 */
export function appendPolygonPath(ctx, pts, isOpen, opts = {}) {
  const n = pts.length;
  const lastIdx = isOpen ? n - 1 : n;
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < lastIdx; i++) {
    const prev = pts[i - 1];
    if (prev.cpx != null && prev.cpy != null) {
      ctx.quadraticCurveTo(prev.cpx, prev.cpy, pts[i].x, pts[i].y);
    } else {
      ctx.lineTo(pts[i].x, pts[i].y);
    }
  }
  if (!isOpen) {
    const last = pts[n - 1];
    if (last.cpx != null && last.cpy != null) {
      ctx.quadraticCurveTo(last.cpx, last.cpy, pts[0].x, pts[0].y);
    } else {
      ctx.lineTo(pts[0].x, pts[0].y);
    }
    if (opts.close !== false) ctx.closePath();
  }
}
