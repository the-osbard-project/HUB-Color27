import { isTransparentColor } from '../draw/ct-color-utils.mjs';
import { lineCapFromEndcap } from './shape-geometry.mjs';
import { appendPolygonPath } from './polygon-edit.mjs';
import { getRotatePivot } from './shape-rotate.mjs';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Record<string, unknown>} el
 * @param {() => void} draw
 */
function withShapeRotation(ctx, el, draw) {
  const rot = typeof el.rotation === 'number' ? el.rotation : 0;
  if (rot === 0) {
    draw();
    return;
  }
  const pivot = getRotatePivot(el);
  if (!pivot) {
    draw();
    return;
  }
  ctx.save();
  ctx.translate(pivot.x, pivot.y);
  ctx.rotate(rot);
  ctx.translate(-pivot.x, -pivot.y);
  draw();
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{
 *   strokeColor?: string | null,
 *   fillColor?: string | null,
 *   lineWidth?: number,
 *   endcap?: string,
 *   rounded?: number,
 * }} paint
 */
function applyPaintStyles(ctx, paint) {
  const lw = paint.lineWidth ?? 18;
  ctx.lineWidth = lw;
  ctx.lineCap = lineCapFromEndcap(paint.endcap);
  ctx.lineJoin = 'miter';
  const stroke = paint.strokeColor;
  const fill = paint.fillColor;
  if (stroke != null && stroke !== '' && !isTransparentColor(stroke)) {
    ctx.strokeStyle = stroke;
  }
  if (fill != null && fill !== '' && !isTransparentColor(fill)) {
    ctx.fillStyle = fill;
  }
}

/**
 * Corner round amount for squares — UI / `el.rounded` use 0…CT_ROUNDED_MAX.
 * 0 = sharp; CT_ROUNDED_MAX = full quarter-circle (radius = half short side).
 */
export const CT_ROUNDED_MAX = 50;

/**
 * @param {number | undefined} roundAmt
 * @returns {number} 0…CT_ROUNDED_MAX
 */
export function normalizeSquareRounded(roundAmt) {
  const n = Number(roundAmt);
  if (!Number.isFinite(n) || n <= 0) return 0;
  /* Studio legacy 0–100 → CT 0–50 */
  if (n > CT_ROUNDED_MAX) return Math.min(CT_ROUNDED_MAX, Math.round((n / 100) * CT_ROUNDED_MAX));
  return Math.min(CT_ROUNDED_MAX, Math.round(n));
}

/**
 * @param {number} w
 * @param {number} h
 * @param {number | undefined} roundAmt
 */
function squareCornerRadius(w, h, roundAmt) {
  const amt = normalizeSquareRounded(roundAmt);
  if (amt <= 0) return 0;
  return (Math.min(w, h) / 2) * (amt / CT_ROUNDED_MAX);
}

/**
 * @param {string | null | undefined} color
 */
function canStroke(color) {
  return color != null && color !== '' && !isTransparentColor(color);
}

/**
 * @param {string | null | undefined} color
 */
function canFill(color) {
  return color != null && color !== '' && !isTransparentColor(color);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} w
 * @param {number} h
 * @param {number} radius
 */
function appendRoundRectPath(ctx, x, y, w, h, radius) {
  const r = Math.max(0, Math.min(radius, w / 2, h / 2));
  ctx.beginPath();
  if (r <= 0) {
    ctx.rect(x, y, w, h);
    return;
  }
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} left
 * @param {number} top
 * @param {number} w
 * @param {number} h
 * @param {number | undefined} roundPct
 * @param {boolean} doFill
 * @param {boolean} doStroke
 */
function drawRoundRect(ctx, left, top, w, h, roundPct, doFill, doStroke) {
  const boxW = Math.max(1, w);
  const boxH = Math.max(1, h);
  const radius = squareCornerRadius(boxW, boxH, roundPct);
  if (radius <= 0) {
    if (doFill) ctx.fillRect(left, top, boxW, boxH);
    if (doStroke) ctx.strokeRect(left, top, boxW, boxH);
    return;
  }
  appendRoundRectPath(ctx, left, top, boxW, boxH, radius);
  if (doFill) ctx.fill();
  if (doStroke) ctx.stroke();
}

/**
 * Live drag preview — v1 pointer.js drawShape (bbox shapes + line).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{
 *   strokeColor?: string | null,
 *   fillColor?: string | null,
 *   lineWidth?: number,
 *   endcap?: string,
 *   rounded?: number,
 * }} paint
 * @param {string} shapeType
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 */
export function drawShapePreview(ctx, paint, shapeType, x0, y0, x1, y1) {
  applyPaintStyles(ctx, paint);
  const stroke = paint.strokeColor;
  const fill = paint.fillColor;
  const left = Math.min(x0, x1);
  const top = Math.min(y0, y1);
  const w = Math.abs(x1 - x0);
  const h = Math.abs(y1 - y0);
  const cx = (x0 + x1) / 2;
  const cy = (y0 + y1) / 2;
  const rx = w / 2;
  const ry = h / 2;

  if (shapeType === 'circle') {
    ctx.beginPath();
    ctx.ellipse(cx, cy, Math.max(1, rx), Math.max(1, ry), 0, 0, 2 * Math.PI);
    if (canFill(fill)) ctx.fill();
    if (canStroke(stroke)) ctx.stroke();
    return;
  }
  if (shapeType === 'square') {
    drawRoundRect(ctx, left, top, w, h, paint.rounded, canFill(fill), canStroke(stroke));
    return;
  }
  if (shapeType === 'triangle') {
    const dragDown = y1 >= y0;
    const ptY = dragDown ? top : top + Math.max(1, h);
    const baseY = dragDown ? top + Math.max(1, h) : top;
    ctx.beginPath();
    ctx.moveTo(cx, ptY);
    ctx.lineTo(left, baseY);
    ctx.lineTo(left + Math.max(1, w), baseY);
    ctx.closePath();
    if (canFill(fill)) ctx.fill();
    if (canStroke(stroke)) ctx.stroke();
    return;
  }
  if (shapeType === 'line') {
    if (!canStroke(stroke)) return;
    ctx.beginPath();
    ctx.moveTo(x0, y0);
    ctx.lineTo(x1, y1);
    ctx.stroke();
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {ReturnType<typeof paintSettings>} paint
 * @param {{ phase: 'line' | 'pull', x1: number, y1: number, x2: number, y2: number, cx?: number, cy?: number }} curveState
 */
export function drawCurvePreview(ctx, paint, curveState) {
  if (!curveState) return;
  applyPaintStyles(ctx, paint);
  const stroke = paint.strokeColor;
  const fill = paint.fillColor;
  if (curveState.phase === 'pull') {
    ctx.beginPath();
    ctx.moveTo(curveState.x1, curveState.y1);
    ctx.quadraticCurveTo(curveState.cx, curveState.cy, curveState.x2, curveState.y2);
    ctx.lineTo(curveState.x1, curveState.y1);
    ctx.closePath();
    if (canFill(fill)) ctx.fill();
  }
  if (canStroke(stroke)) {
    if (curveState.phase === 'line') {
      ctx.beginPath();
      ctx.moveTo(curveState.x1, curveState.y1);
      ctx.lineTo(curveState.x2, curveState.y2);
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(curveState.x1, curveState.y1);
      ctx.quadraticCurveTo(curveState.cx, curveState.cy, curveState.x2, curveState.y2);
      ctx.stroke();
    }
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {ReturnType<typeof paintSettings>} paint
 * @param {{ points: { x: number, y: number }[] }} polygonState
 * @param {number} mouseX
 * @param {number} mouseY
 */
export function drawPolygonPreview(ctx, paint, polygonState, mouseX, mouseY) {
  if (!polygonState?.points?.length) return;
  if (!canStroke(paint.strokeColor)) return;
  applyPaintStyles(ctx, paint);
  const pts = polygonState.points;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
  if (pts.length > 1) ctx.lineTo(mouseX, mouseY);
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  const r0 = pts.length >= 2 ? 8 : 6;
  ctx.beginPath();
  ctx.arc(pts[0].x, pts[0].y, r0, 0, Math.PI * 2);
  ctx.fill();
  ctx.stroke();
}

/** @type {Map<string, HTMLImageElement>} */
const imageElementCache = new Map();

/** @param {string} src */
function getCachedImageElement(src) {
  let img = imageElementCache.get(src);
  if (img) return img;
  img = new Image();
  img.decoding = 'async';
  img.src = src;
  imageElementCache.set(src, img);
  return img;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Record<string, unknown>} el
 */
function drawImageShapeElement(ctx, el) {
  const src = typeof el.src === 'string' ? el.src : '';
  if (!src) return;
  const left = Number(el.left);
  const top = Number(el.top);
  const w = Math.max(1, Number(el.w) || 10);
  const h = Math.max(1, Number(el.h) || 10);
  const img = getCachedImageElement(src);
  const paint = () => {
    if (img.complete && img.naturalWidth > 0) {
      ctx.drawImage(img, left, top, w, h);
      return;
    }
    if (img.dataset.ctReadyHooked === '1') return;
    img.dataset.ctReadyHooked = '1';
    const notify = () => {
      window.dispatchEvent(new Event('ct-floating-image-ready'));
    };
    img.addEventListener('load', notify, { once: true });
    img.addEventListener('error', notify, { once: true });
  };
  withShapeRotation(ctx, el, paint);
}

/**
 * Committed vector shapes — v1 elements.js (shape types only, no plumple/select extras).
 * @param {CanvasRenderingContext2D} ctx
 * @param {Record<string, unknown>} el
 * @param {() => void} [onReady]
 */
export function drawShapeElement(ctx, el) {
  if (!el?.type) return;

  if (el.type === 'group' && Array.isArray(el.children)) {
    for (const child of el.children) drawShapeElement(ctx, child);
    return;
  }

  if (el.type === 'image') {
    drawImageShapeElement(ctx, el);
    return;
  }

  const lw = el.lineWidth != null ? Number(el.lineWidth) : 18;
  const stroke = el.strokeColor;
  const fill = el.fillColor;
  const endcap = el.endcap || 'round';
  const doStroke = canStroke(stroke);
  const doFill = canFill(fill);
  ctx.lineWidth = lw;
  ctx.lineCap = lineCapFromEndcap(endcap);
  if (el.type === 'square' || el.type === 'triangle' || el.type === 'polygon') ctx.lineJoin = 'miter';
  else ctx.lineJoin = 'round';
  if (doStroke) ctx.strokeStyle = stroke;
  if (doFill && canFill(fill)) ctx.fillStyle = fill;

  if (el.type === 'circle') {
    withShapeRotation(ctx, el, () => {
      const cx = Number(el.cx);
      const cy = Number(el.cy);
      const rx = Math.max(1, Number(el.rx) || 10);
      const ry = Math.max(1, Number(el.ry) || 10);
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, 2 * Math.PI);
      if (doFill) ctx.fill();
      if (doStroke) ctx.stroke();
    });
    return;
  }

  if (el.type === 'square') {
    withShapeRotation(ctx, el, () => {
      const left = Number(el.left);
      const top = Number(el.top);
      const w = Math.max(1, Number(el.w) || 10);
      const h = Math.max(1, Number(el.h) || 10);
      const rounded = normalizeSquareRounded(el.rounded);
      drawRoundRect(ctx, left, top, w, h, rounded, doFill, doStroke);
    });
    return;
  }

  if (el.type === 'triangle') {
    withShapeRotation(ctx, el, () => {
      const l = Number(el.left);
      const t = Number(el.top);
      const w = Math.max(1, Number(el.w) || 10);
      const h = Math.max(1, Number(el.h) || 10);
      const cx = l + w / 2;
      const ptY = el.dragDown ? t : t + h;
      const baseY = el.dragDown ? t + h : t;
      ctx.beginPath();
      ctx.moveTo(cx, ptY);
      ctx.lineTo(l, baseY);
      ctx.lineTo(l + w, baseY);
      ctx.closePath();
      if (doFill) ctx.fill();
      if (doStroke) ctx.stroke();
    });
    return;
  }

  if (el.type === 'line') {
    if (!doStroke) return;
    withShapeRotation(ctx, el, () => {
      ctx.beginPath();
      ctx.moveTo(Number(el.x0), Number(el.y0));
      ctx.lineTo(Number(el.x1), Number(el.y1));
      ctx.stroke();
    });
    return;
  }

  if (el.type === 'curve') {
    withShapeRotation(ctx, el, () => {
      const x1 = Number(el.x1);
      const y1 = Number(el.y1);
      const x2 = Number(el.x2);
      const y2 = Number(el.y2);
      const cpx = Number(el.cpx);
      const cpy = Number(el.cpy);
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.quadraticCurveTo(cpx, cpy, x2, y2);
      ctx.lineTo(x1, y1);
      ctx.closePath();
      if (doFill) ctx.fill();
      if (doStroke) {
        ctx.beginPath();
        ctx.moveTo(x1, y1);
        ctx.quadraticCurveTo(cpx, cpy, x2, y2);
        ctx.stroke();
      }
    });
    return;
  }

  if (el.type === 'polygon') {
    const pts = /** @type {{ x: number, y: number, cpx?: number, cpy?: number }[]} */ (el.points);
    if (!pts || pts.length < 2) return;
    withShapeRotation(ctx, el, () => {
      const isOpen = el.closed === false;
      ctx.beginPath();
      appendPolygonPath(ctx, pts, isOpen);
      if (isOpen && doFill) {
        ctx.lineTo(pts[0].x, pts[0].y);
        ctx.closePath();
        ctx.fill();
        ctx.beginPath();
        appendPolygonPath(ctx, pts, isOpen, { close: false });
      } else if (!isOpen && doFill) {
        ctx.fill();
      }
      if (doStroke) ctx.stroke();
    });
  }
}
