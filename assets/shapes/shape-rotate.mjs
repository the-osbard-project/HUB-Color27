/** Minimal rotation pivots for CT shape paint (no Studio selection deps). */

import { getSelectionUiScale as getSelectionUiScaleFromTransform } from './shape-transform.mjs';

/** @param {Record<string, unknown> | null | undefined} el */
export function getRotatePivot(el) {
  if (!el?.type) return null;
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
  if (el.type === 'line' || el.type === 'curve') {
    const x0 = Number(el.x0);
    const y0 = Number(el.y0);
    const x1 = Number(el.x1);
    const y1 = Number(el.y1);
    return { x: (x0 + x1) / 2, y: (y0 + y1) / 2 };
  }
  return null;
}

/** @param {Record<string, unknown> | null | undefined} el */
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

/** Re-export for polygon-edit and other callers that import from shape-rotate. */
export function getSelectionUiScale(zoom = 1) {
  return getSelectionUiScaleFromTransform(zoom);
}
