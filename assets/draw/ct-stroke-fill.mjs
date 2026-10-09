import { isTransparentColor } from './ct-color-utils.mjs';

/** FX that only paint particles/spray — no closed-path interior fill (v1 `paintFxSkipsInteriorFill`). */
const SKIP_INTERIOR_FILL = new Set([
  'dotty',
  'starry',
  'soapy',
  'splattery',
  'sparkly',
  'sunny',
  'washy',
  'watery',
]);

/**
 * @param {string|null|undefined} fx
 */
export function paintFxSkipsInteriorFill(fx) {
  if (!fx || fx === 'brushy') return false;
  return SKIP_INTERIOR_FILL.has(fx);
}

/**
 * Inkscape-style interior fill: close centerline into a polygon (v1 `fillBrushStrokeCenterlinePolygon`).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} points
 * @param {string} fillColor
 * @param {number} [fillOpacity=1]
 */
export function fillStrokeCenterlinePolygon(ctx, points, fillColor, fillOpacity = 1) {
  if (!points || points.length < 2 || isTransparentColor(fillColor)) return;
  ctx.save();
  const prevAlpha = ctx.globalAlpha;
  ctx.globalAlpha = prevAlpha * Math.max(0, Math.min(1, fillOpacity));
  ctx.fillStyle = fillColor;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
