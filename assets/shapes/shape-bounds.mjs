import {
  getStrokeElementBounds,
  hitTestStrokeElementAt,
  isSelectableStrokeElement,
  isStrokeElement,
  translateStrokeElement,
} from './stroke-element.mjs';

/**
 * Axis-aligned bounds for v2 shape elements (bbox shapes + line/curve/polygon + paint strokes).
 * @param {Record<string, unknown>} el
 * @returns {{ left: number, top: number, right: number, bottom: number } | null}
 */
export function getShapeBounds(el) {
  if (!el?.type) return null;

  if (isStrokeElement(el)) {
    return getStrokeElementBounds(el);
  }

  if (el.type === 'text') {
    const scale = typeof el.scale === 'number' && el.scale > 0 ? el.scale : 1;
    const x = Number(el.x);
    const y = Number(el.y);
    const boxW = Math.max(
      1,
      Number(el.wrapWidth) > 0
        ? Number(el.wrapWidth)
        : Number(el.width) > 0
          ? Number(el.width)
          : 100,
    );
    const boxH = Math.max(1, Number(el.height) > 0 ? Number(el.height) : 24);
    const w = boxW * scale;
    const h = boxH * scale;
    const rot = typeof el.rotation === 'number' ? el.rotation : 0;
    if (rot === 0) {
      return { left: x - w / 2, top: y - h / 2, right: x + w / 2, bottom: y + h / 2 };
    }
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const halfW = w / 2;
    const halfH = h / 2;
    const corners = [
      { x: x + -halfW * cos - -halfH * sin, y: y + -halfW * sin + -halfH * cos },
      { x: x + halfW * cos - -halfH * sin, y: y + halfW * sin + -halfH * cos },
      { x: x + halfW * cos - halfH * sin, y: y + halfW * sin + halfH * cos },
      { x: x + -halfW * cos - halfH * sin, y: y + -halfW * sin + halfH * cos },
    ];
    return {
      left: Math.min(...corners.map((p) => p.x)),
      top: Math.min(...corners.map((p) => p.y)),
      right: Math.max(...corners.map((p) => p.x)),
      bottom: Math.max(...corners.map((p) => p.y)),
    };
  }

  if (el.type === 'circle') {
    const cx = Number(el.cx);
    const cy = Number(el.cy);
    const rx = Math.max(1, Number(el.rx) || 10);
    const ry = Math.max(1, Number(el.ry) || 10);
    return { left: cx - rx, top: cy - ry, right: cx + rx, bottom: cy + ry };
  }

  if (el.type === 'square' || el.type === 'triangle' || el.type === 'image') {
    const left = Number(el.left);
    const top = Number(el.top);
    const w = Math.max(1, Number(el.w) || 10);
    const h = Math.max(1, Number(el.h) || 10);
    const rot = typeof el.rotation === 'number' ? el.rotation : 0;
    if (rot === 0) {
      return { left, top, right: left + w, bottom: top + h };
    }
    const cx = left + w / 2;
    let cy;
    if (el.type === 'triangle') {
      const ptY = el.dragDown ? top : top + h;
      const baseY = el.dragDown ? top + h : top;
      cy = (ptY + baseY) / 2;
    } else {
      cy = top + h / 2;
    }
    const halfW = w / 2;
    const halfH = h / 2;
    const cos = Math.cos(rot);
    const sin = Math.sin(rot);
    const corners = [
      { x: cx + -halfW * cos - -halfH * sin, y: cy + -halfW * sin + -halfH * cos },
      { x: cx + halfW * cos - -halfH * sin, y: cy + halfW * sin + -halfH * cos },
      { x: cx + halfW * cos - halfH * sin, y: cy + halfW * sin + halfH * cos },
      { x: cx + -halfW * cos - halfH * sin, y: cy + -halfW * sin + halfH * cos },
    ];
    return {
      left: Math.min(...corners.map((p) => p.x)),
      top: Math.min(...corners.map((p) => p.y)),
      right: Math.max(...corners.map((p) => p.x)),
      bottom: Math.max(...corners.map((p) => p.y)),
    };
  }

  if (el.type === 'line') {
    const x0 = Number(el.x0);
    const y0 = Number(el.y0);
    const x1 = Number(el.x1);
    const y1 = Number(el.y1);
    return {
      left: Math.min(x0, x1),
      top: Math.min(y0, y1),
      right: Math.max(x0, x1),
      bottom: Math.max(y0, y1),
    };
  }

  if (el.type === 'curve') {
    const xs = [Number(el.x1), Number(el.x2), Number(el.cpx)];
    const ys = [Number(el.y1), Number(el.y2), Number(el.cpy)];
    return {
      left: Math.min(...xs),
      top: Math.min(...ys),
      right: Math.max(...xs),
      bottom: Math.max(...ys),
    };
  }

  if (el.type === 'polygon') {
    const pts = /** @type {{ x: number, y: number, cpx?: number, cpy?: number }[]} */ (el.points);
    if (!pts?.length) return null;
    let left = pts[0].x;
    let top = pts[0].y;
    let right = pts[0].x;
    let bottom = pts[0].y;
    for (let i = 0; i < pts.length; i++) {
      left = Math.min(left, pts[i].x);
      top = Math.min(top, pts[i].y);
      right = Math.max(right, pts[i].x);
      bottom = Math.max(bottom, pts[i].y);
      if (pts[i].cpx != null && pts[i].cpy != null) {
        left = Math.min(left, pts[i].cpx);
        top = Math.min(top, pts[i].cpy);
        right = Math.max(right, pts[i].cpx);
        bottom = Math.max(bottom, pts[i].cpy);
      }
    }
    return { left, top, right, bottom };
  }

  if (el.type === 'group' && Array.isArray(el.children)) {
    let box = null;
    for (const child of el.children) {
      const b = getShapeBounds(child);
      if (!b) continue;
      if (!box) box = { ...b };
      else {
        box.left = Math.min(box.left, b.left);
        box.top = Math.min(box.top, b.top);
        box.right = Math.max(box.right, b.right);
        box.bottom = Math.max(box.bottom, b.bottom);
      }
    }
    return box;
  }

  return null;
}

/**
 * Unrotated local frame for selection chrome (handles / oriented box).
 * Differs from {@link getShapeBounds} when rotation expands the world AABB.
 * @param {Record<string, unknown>} el
 * @returns {{ left: number, top: number, right: number, bottom: number } | null}
 */
export function getShapeFrameBounds(el) {
  if (!el?.type) return null;

  if (isStrokeElement(el)) {
    return getStrokeElementBounds(el);
  }

  if (el.type === 'text') {
    const scale = typeof el.scale === 'number' && el.scale > 0 ? el.scale : 1;
    const x = Number(el.x);
    const y = Number(el.y);
    const boxW = Math.max(
      1,
      Number(el.wrapWidth) > 0
        ? Number(el.wrapWidth)
        : Number(el.width) > 0
          ? Number(el.width)
          : 100,
    );
    const boxH = Math.max(1, Number(el.height) > 0 ? Number(el.height) : 24);
    const w = boxW * scale;
    const h = boxH * scale;
    return { left: x - w / 2, top: y - h / 2, right: x + w / 2, bottom: y + h / 2 };
  }

  if (el.type === 'circle') {
    const cx = Number(el.cx);
    const cy = Number(el.cy);
    const rx = Math.max(1, Number(el.rx) || 10);
    const ry = Math.max(1, Number(el.ry) || 10);
    return { left: cx - rx, top: cy - ry, right: cx + rx, bottom: cy + ry };
  }

  if (el.type === 'square' || el.type === 'triangle' || el.type === 'image') {
    const left = Number(el.left);
    const top = Number(el.top);
    const w = Math.max(1, Number(el.w) || 10);
    const h = Math.max(1, Number(el.h) || 10);
    return { left, top, right: left + w, bottom: top + h };
  }

  if (el.type === 'line' || el.type === 'curve' || el.type === 'polygon' || el.type === 'group') {
    /* These store geometry in local space; world AABB from getShapeBounds is fine when unrotated.
       When rotated, polygon/line still use point AABB as the local frame. */
    if (el.type === 'group') {
      let box = null;
      for (const child of /** @type {Record<string, unknown>[]} */ (el.children || [])) {
        const b = getShapeFrameBounds(child);
        if (!b) continue;
        if (!box) box = { ...b };
        else {
          box.left = Math.min(box.left, b.left);
          box.top = Math.min(box.top, b.top);
          box.right = Math.max(box.right, b.right);
          box.bottom = Math.max(box.bottom, b.bottom);
        }
      }
      return box;
    }
    return getShapeBounds({ ...el, rotation: 0 });
  }

  return getShapeBounds({ ...el, rotation: 0 });
}

/**
 * @param {{ left: number, top: number, right: number, bottom: number }} box
 * @param {number} x
 * @param {number} y
 * @param {number} [pad]
 */
export function pointInBounds(box, x, y, pad = 4) {
  return x >= box.left - pad && x <= box.right + pad && y >= box.top - pad && y <= box.bottom + pad;
}

/**
 * Text hit in local box space (v1 getFillToolPartText bbox).
 * @param {Record<string, unknown>} el
 * @param {number} x
 * @param {number} y
 * @param {number} [pad]
 */
export function hitTestTextAt(el, x, y, pad = 4) {
  if (el.type !== 'text' || !String(el.text || '').trim()) return false;
  const scale = typeof el.scale === 'number' && el.scale > 0 ? el.scale : 1;
  const boxW = Math.max(
    1,
    Number(el.wrapWidth) > 0
      ? Number(el.wrapWidth)
      : Number(el.width) > 0
        ? Number(el.width)
        : 100,
  );
  const boxH = Math.max(1, Number(el.height) > 0 ? Number(el.height) : 24);
  const dx = x - Number(el.x);
  const dy = y - Number(el.y);
  const rot = typeof el.rotation === 'number' ? el.rotation : 0;
  const c = Math.cos(-rot);
  const s = Math.sin(-rot);
  const lx = (dx * c - dy * s) / scale;
  const ly = (dx * s + dy * c) / scale;
  const halfW = boxW / 2 + pad;
  const halfH = boxH / 2 + pad;
  return lx >= -halfW && lx <= halfW && ly >= -halfH && ly <= halfH;
}

/**
 * Top-most hit (last in array = on top).
 * @param {Record<string, unknown>[]} elements
 * @param {number} x
 * @param {number} y
 * @returns {Record<string, unknown> | null}
 */
export function hitTestShapeAt(elements, x, y) {
  if (!Array.isArray(elements)) return null;
  for (let i = elements.length - 1; i >= 0; i--) {
    const el = elements[i];
    if (isSelectableStrokeElement(el)) {
      if (hitTestStrokeElementAt(el, x, y)) return el;
      continue;
    }
    if (el.type === 'text') {
      if (hitTestTextAt(el, x, y)) return el;
      continue;
    }
    const box = getShapeBounds(el);
    if (box && pointInBounds(box, x, y)) return el;
  }
  return null;
}

/**
 * @param {Record<string, unknown>} el
 * @param {number} dx
 * @param {number} dy
 */
export function translateShapeElement(el, dx, dy) {
  if (!el?.type) return;
  if (isStrokeElement(el)) {
    translateStrokeElement(el, dx, dy);
    return;
  }
  if (el.type === 'circle') {
    el.cx = Number(el.cx) + dx;
    el.cy = Number(el.cy) + dy;
    return;
  }
  if (el.type === 'square' || el.type === 'triangle' || el.type === 'image') {
    el.left = Number(el.left) + dx;
    el.top = Number(el.top) + dy;
    return;
  }
  if (el.type === 'line') {
    el.x0 = Number(el.x0) + dx;
    el.y0 = Number(el.y0) + dy;
    el.x1 = Number(el.x1) + dx;
    el.y1 = Number(el.y1) + dy;
    return;
  }
  if (el.type === 'curve') {
    el.x1 = Number(el.x1) + dx;
    el.y1 = Number(el.y1) + dy;
    el.x2 = Number(el.x2) + dx;
    el.y2 = Number(el.y2) + dy;
    el.cpx = Number(el.cpx) + dx;
    el.cpy = Number(el.cpy) + dy;
    return;
  }
  if (el.type === 'polygon' && Array.isArray(el.points)) {
    for (const p of el.points) {
      p.x += dx;
      p.y += dy;
      if (p.cpx != null) p.cpx += dx;
      if (p.cpy != null) p.cpy += dy;
    }
    return;
  }
  if (el.type === 'text') {
    el.x = Number(el.x) + dx;
    el.y = Number(el.y) + dy;
    return;
  }
  if (el.type === 'group' && Array.isArray(el.children)) {
    for (const child of el.children) translateShapeElement(child, dx, dy);
  }
}

/**
 * @param {Record<string, unknown>} el
 */
export function cloneShapeElement(el) {
  return structuredClone(el);
}
