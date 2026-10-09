import { isTransparentColor } from '../ct-color-utils.mjs';
import { smoothStrokePoints } from '../ct-stroke-smooth.mjs';

export const SUNNY_DEFAULT_FILL = '#FFE94A';
export const SUNNY_DEFAULT_STROKE = '#FFAB40';
const WASHY_OPACITY_BOOST = 4 / 3;

/**
 * @param {string} hex
 * @param {number} a
 */
function sunnyColorWithAlpha(hex, a) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return `rgba(255,233,74,${a})`;
  const r = parseInt(h.slice(0, 2), 16);
  const g = parseInt(h.slice(2, 4), 16);
  const b = parseInt(h.slice(4, 6), 16);
  return `rgba(${r},${g},${b},${a})`;
}

/**
 * @param {string|null|undefined} strokeColor
 * @param {string|null|undefined} fillColorOpt
 */
export function resolveWarmWashFillColor(strokeColor, fillColorOpt) {
  if (fillColorOpt != null && fillColorOpt !== '' && !isTransparentColor(fillColorOpt)) {
    return fillColorOpt;
  }
  if (strokeColor != null && strokeColor !== '' && !isTransparentColor(strokeColor)) {
    return strokeColor;
  }
  return SUNNY_DEFAULT_FILL;
}

/**
 * @param {{ x: number, y: number }[]} points
 * @param {number} pad
 */
function boundsForPoints(points, pad) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of points) {
    if (p.x < minX) minX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.x > maxX) maxX = p.x;
    if (p.y > maxY) maxY = p.y;
  }
  const x0 = Math.floor(minX - pad);
  const y0 = Math.floor(minY - pad);
  return { x0, y0, w: Math.max(1, Math.ceil(maxX - minX + pad * 2)), h: Math.max(1, Math.ceil(maxY - minY + pad * 2)) };
}

/**
 * @param {CanvasRenderingContext2D} targetCtx
 * @param {{ x: number, y: number }[]} locPts
 */
function traceSmoothPath(targetCtx, locPts) {
  targetCtx.beginPath();
  targetCtx.moveTo(locPts[0].x, locPts[0].y);
  if (locPts.length === 2) {
    targetCtx.lineTo(locPts[1].x, locPts[1].y);
    return;
  }
  for (let i = 1; i < locPts.length - 1; i++) {
    const mx = (locPts[i].x + locPts[i + 1].x) * 0.5;
    const my = (locPts[i].y + locPts[i + 1].y) * 0.5;
    targetCtx.quadraticCurveTo(locPts[i].x, locPts[i].y, mx, my);
  }
  const end = locPts[locPts.length - 1];
  targetCtx.lineTo(end.x, end.y);
}

/**
 * @param {CanvasRenderingContext2D} targetCtx
 * @param {{ x: number, y: number }[]} locPts
 * @param {number} width
 * @param {string|CanvasGradient} color
 * @param {number} shadowBlur
 */
function strokeLayer(targetCtx, locPts, width, color, shadowBlur) {
  targetCtx.save();
  targetCtx.globalCompositeOperation = 'source-over';
  targetCtx.lineCap = 'butt';
  targetCtx.lineJoin = 'round';
  targetCtx.strokeStyle = color;
  targetCtx.lineWidth = width;
  if (shadowBlur > 0) {
    targetCtx.shadowColor = typeof color === 'string' ? color : '#000';
    targetCtx.shadowBlur = shadowBlur;
  }
  traceSmoothPath(targetCtx, locPts);
  targetCtx.stroke();
  targetCtx.restore();
}

/**
 * v1 `drawFluidWarmWashPath`
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} points
 * @param {number} lineWidth
 * @param {string} strokeColor
 * @param {string|null|undefined} fillColor
 * @param {number} alpha
 * @param {number} strength
 * @param {boolean} symmetricGlow
 */
function drawFluidWarmWashPath(ctx, points, lineWidth, strokeColor, fillColor, alpha, strength, symmetricGlow) {
  if (!points || points.length < 2) return;
  const w = Math.max(12, Number(lineWidth) || 100);
  const splashReach = w * 2.5;
  const stroke =
    strokeColor && !isTransparentColor(strokeColor) ? strokeColor : SUNNY_DEFAULT_STROKE;
  const fill = resolveWarmWashFillColor(stroke, fillColor);
  const strong = strength != null ? strength : 1;
  const pts = smoothStrokePoints(points, 92, splashReach);
  if (pts.length < 2) return;

  const pad = splashReach * 1.85;
  const bb = boundsForPoints(pts, pad);
  const oc = document.createElement('canvas');
  oc.width = bb.w;
  oc.height = bb.h;
  const octx = oc.getContext('2d');
  if (!octx) return;

  const local = pts.map((p) => ({ x: p.x - bb.x0, y: p.y - bb.y0 }));

  strokeLayer(octx, local, splashReach * 1.75, sunnyColorWithAlpha(fill, alpha * 0.28 * strong), splashReach * 0.3);
  strokeLayer(octx, local, splashReach * 1.2, sunnyColorWithAlpha(stroke, alpha * 0.24 * strong), splashReach * 0.14);
  if (symmetricGlow) {
    strokeLayer(octx, local, splashReach * 0.82, sunnyColorWithAlpha(fill, alpha * 0.3 * strong), splashReach * 0.1);
    strokeLayer(octx, local, Math.max(splashReach * 0.42, w * 0.5), sunnyColorWithAlpha(stroke, alpha * 0.38 * strong), 0);
  } else {
    const washGrad = octx.createLinearGradient(0, 0, oc.width, oc.height);
    washGrad.addColorStop(0, sunnyColorWithAlpha(fill, alpha * 0.4 * strong));
    washGrad.addColorStop(0.35, sunnyColorWithAlpha(fill, alpha * 0.34 * strong));
    washGrad.addColorStop(0.55, sunnyColorWithAlpha(stroke, alpha * 0.3 * strong));
    washGrad.addColorStop(0.78, sunnyColorWithAlpha(stroke, alpha * 0.32 * strong));
    washGrad.addColorStop(1, sunnyColorWithAlpha(stroke, alpha * 0.26 * strong));
    strokeLayer(octx, local, splashReach * 0.72, washGrad, 0);
    strokeLayer(octx, local, Math.max(splashReach * 0.38, w * 0.5), sunnyColorWithAlpha(stroke, alpha * 0.4 * strong), 0);
  }

  const blurPx = Math.max(4, splashReach * 0.1);
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.filter = `blur(${blurPx}px)`;
  ctx.drawImage(oc, bb.x0, bb.y0);
  ctx.filter = 'none';
  ctx.restore();
}

/**
 * Pen-up sun blob (v1 `drawSunnySunCore`).
 */
export function drawSunnySunCore(ctx, cx, cy, lineWidth, strokeColor, fillColor, amtMul) {
  const w = Math.max(12, Number(lineWidth) || 100);
  const sunR = w * 0.5;
  const splashReach = w * 2.5;
  const stroke =
    strokeColor && !isTransparentColor(strokeColor) ? strokeColor : SUNNY_DEFAULT_STROKE;
  const fill = resolveWarmWashFillColor(stroke, fillColor);
  const alpha = Math.max(0.15, Math.min(1, 0.72 * (amtMul != null ? amtMul : 1)));
  const sunEdge = Math.min(0.99, sunR / splashReach);

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  const sunGrad = ctx.createRadialGradient(cx, cy, 0, cx, cy, splashReach);
  const ringSpan = Math.max(0.01, 1 - sunEdge);
  sunGrad.addColorStop(0, sunnyColorWithAlpha(fill, Math.min(1, alpha + 0.08)));
  sunGrad.addColorStop(sunEdge * 0.5, sunnyColorWithAlpha(fill, alpha * 0.98));
  sunGrad.addColorStop(sunEdge * 0.88, sunnyColorWithAlpha(fill, alpha * 0.94));
  sunGrad.addColorStop(sunEdge * 0.96, sunnyColorWithAlpha(fill, alpha * 0.82));
  sunGrad.addColorStop(sunEdge * 0.99, sunnyColorWithAlpha(stroke, alpha * 0.45));
  sunGrad.addColorStop(sunEdge, sunnyColorWithAlpha(stroke, alpha * 0.34));
  sunGrad.addColorStop(sunEdge + ringSpan * 0.25, sunnyColorWithAlpha(stroke, alpha * 0.26));
  sunGrad.addColorStop(sunEdge + ringSpan * 0.5, sunnyColorWithAlpha(stroke, alpha * 0.17));
  sunGrad.addColorStop(sunEdge + ringSpan * 0.72, sunnyColorWithAlpha(stroke, alpha * 0.09));
  sunGrad.addColorStop(sunEdge + ringSpan * 0.88, sunnyColorWithAlpha(stroke, alpha * 0.04));
  sunGrad.addColorStop(1, sunnyColorWithAlpha(stroke, 0));
  ctx.fillStyle = sunGrad;
  ctx.beginPath();
  ctx.arc(cx, cy, splashReach, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} points
 * @param {string} strokeColor
 * @param {string|null|undefined} fillColor
 * @param {number} lineWidth
 * @param {number} amount 0–100
 * @param {boolean} [showSunCore]
 */
export function drawSunnyStroke(ctx, points, strokeColor, fillColor, lineWidth, amount, showSunCore = true) {
  if (!points?.length) return;
  let pts = points;
  if (pts.length < 2) {
    const p0 = pts[0];
    pts = [{ x: p0.x, y: p0.y }, { x: p0.x, y: p0.y }];
  }
  const amtMul = Math.max(0, Math.min(100, amount)) / 100;
  const alpha = Math.max(0.15, Math.min(1, 0.72 * amtMul));
  drawFluidWarmWashPath(ctx, pts, lineWidth, strokeColor, fillColor, alpha, 1.12, true);
  if (showSunCore) {
    const last = pts[pts.length - 1];
    drawSunnySunCore(ctx, last.x, last.y, lineWidth, strokeColor, fillColor, amtMul);
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} points
 * @param {string} strokeColor
 * @param {string|null|undefined} fillColor
 * @param {number} lineWidth
 * @param {number} amount 0–100
 */
export function drawWashyStroke(ctx, points, strokeColor, fillColor, lineWidth, amount) {
  if (!points?.length) return;
  let pts = points;
  if (pts.length < 2) {
    const p0 = pts[0];
    pts = [{ x: p0.x, y: p0.y }, { x: p0.x, y: p0.y }];
  }
  const amtMul = Math.max(0, Math.min(100, amount)) / 100;
  const alpha = Math.min(1, Math.max(0.15, 0.52 * amtMul * WASHY_OPACITY_BOOST));
  drawFluidWarmWashPath(ctx, pts, lineWidth, strokeColor, fillColor, alpha, 0.88, false);
}
