/**
 * Shared stroke geometry (v1 `paint-fx.js` excerpts).
 */

import { brushStrokeWidthPxFromPressure01, densifyMarkerPoints, resamplePathByDistance, ribbonWidthAt } from './ct-marker-path.mjs';
import { buildRibbonEdges, ribbonFillClosedPath } from './ct-ribbon-fill.mjs';

/**
 * @param {{ x: number, y: number }[]} pts
 * @param {number} pad
 */
export function strokePointsBbox(pts, pad) {
  let x0 = Infinity;
  let y0 = Infinity;
  let x1 = -Infinity;
  let y1 = -Infinity;
  for (const p of pts) {
    x0 = Math.min(x0, p.x);
    y0 = Math.min(y0, p.y);
    x1 = Math.max(x1, p.x);
    y1 = Math.max(y1, p.y);
  }
  x0 -= pad;
  y0 -= pad;
  x1 += pad;
  y1 += pad;
  return { x0, y0, w: Math.ceil(x1 - x0), h: Math.ceil(y1 - y0) };
}

/**
 * Angled flat-nib ribbon (Calligraphy / Inky).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} points
 * @param {number} lineWidth
 * @param {string} color
 * @param {string[] | null} [palette]
 * @param {number} nibRad nib angle in radians
 * @param {boolean} [roundCaps]
 * @param {boolean} [smoothEdges] quadratic edges instead of faceted lineTo
 */
export function strokeAngledNibRibbon(ctx, points, lineWidth, color, palette, nibRad, roundCaps = false, smoothEdges = false) {
  if (!points || points.length < 2) return;
  const n = points.length;
  const minFrac = 0.12;
  const tangentDir = (i) => {
    let dx;
    let dy;
    if (i === 0) {
      dx = points[1].x - points[0].x;
      dy = points[1].y - points[0].y;
    } else if (i === n - 1) {
      dx = points[n - 1].x - points[n - 2].x;
      dy = points[n - 1].y - points[n - 2].y;
    } else {
      dx = (points[i + 1].x - points[i - 1].x) * 0.5;
      dy = (points[i + 1].y - points[i - 1].y) * 0.5;
    }
    return Math.atan2(dy, dx);
  };
  const leftNormal = (i) => {
    const t = tangentDir(i);
    return { x: Math.sin(t), y: -Math.cos(t) };
  };
  const halfWidthAt = (i) => {
    const dir = tangentDir(i);
    const delta = dir - nibRad;
    const wf = minFrac + (1 - minFrac) * Math.abs(Math.sin(delta));
    return (lineWidth * wf * 0.5) || 0.25;
  };
  const widthAt = (i) => {
    if (!smoothEdges) return halfWidthAt(i);
    const span = 2;
    let sum = 0;
    let count = 0;
    for (let j = Math.max(0, i - span); j <= Math.min(n - 1, i + span); j++) {
      sum += halfWidthAt(j);
      count++;
    }
    return count > 0 ? sum / count : halfWidthAt(i);
  };
  const usePalette = palette && palette.length > 1;
  const numSegs = usePalette ? palette.length : 1;
  for (let seg = 0; seg < numSegs; seg++) {
    const i0 = usePalette ? Math.floor((seg / numSegs) * n) : 0;
    const i1 = usePalette ? Math.min(n, Math.floor(((seg + 1) / numSegs) * n)) : n;
    if (i1 <= i0) continue;
    ctx.fillStyle = usePalette ? palette[seg % palette.length] || color : color;
    const left = [];
    const right = [];
    for (let i = i0; i < i1; i++) {
      const nv = leftNormal(i);
      const half = widthAt(i);
      left.push({ x: points[i].x + nv.x * half, y: points[i].y + nv.y * half });
      right.push({ x: points[i].x - nv.x * half, y: points[i].y - nv.y * half });
    }
    if (left.length < 2) continue;
    ctx.beginPath();
    if (smoothEdges) {
      ctx.moveTo(left[0].x, left[0].y);
      for (let i = 1; i < left.length; i++) {
        const mx = (left[i - 1].x + left[i].x) * 0.5;
        const my = (left[i - 1].y + left[i].y) * 0.5;
        ctx.quadraticCurveTo(left[i - 1].x, left[i - 1].y, mx, my);
      }
      ctx.lineTo(left[left.length - 1].x, left[left.length - 1].y);
      const lastR = right[right.length - 1];
      ctx.lineTo(lastR.x, lastR.y);
      for (let i = right.length - 2; i >= 0; i--) {
        const mx = (right[i].x + right[i + 1].x) * 0.5;
        const my = (right[i].y + right[i + 1].y) * 0.5;
        ctx.quadraticCurveTo(right[i + 1].x, right[i + 1].y, mx, my);
      }
      ctx.lineTo(right[0].x, right[0].y);
    } else {
      ctx.moveTo(left[0].x, left[0].y);
      for (let i = 1; i < left.length; i++) ctx.lineTo(left[i].x, left[i].y);
      for (let i = right.length - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    }
    ctx.closePath();
    ctx.fill();
  }
  if (roundCaps) {
    for (const i of [0, n - 1]) {
      const r = widthAt(i);
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(points[i].x, points[i].y, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
}

/** v1 `strokePenCalligraphy` — 45° flat nib ribbon. */
export function strokePenCalligraphy(ctx, points, lineWidth, color, palette) {
  strokeAngledNibRibbon(ctx, points, lineWidth, color, palette, Math.PI / 4, false);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} pts
 * @param {number} lineWidth
 * @param {string} color
 * @param {'round'|'flat'|'square'} brushEndcap
 */
export function strokeBrushPolylineVariableWidth(ctx, pts, lineWidth, color, brushEndcap) {
  if (!pts || pts.length < 2) return;
  ctx.strokeStyle = color;
  const cap = brushEndcap === 'flat' ? 'square' : 'round';
  ctx.lineCap = cap;
  ctx.lineJoin = 'round';
  for (let i = 1; i < pts.length; i++) {
    const wf0 =
      pts[i - 1].wf != null && Number.isFinite(Number(pts[i - 1].wf))
        ? Number(pts[i - 1].wf)
        : null;
    const wf1 =
      pts[i].wf != null && Number.isFinite(Number(pts[i].wf)) ? Number(pts[i].wf) : wf0;
    const w0 = brushStrokeWidthPxFromPressure01(lineWidth, wf0);
    const w1 = brushStrokeWidthPxFromPressure01(lineWidth, wf1);
    ctx.lineWidth = (w0 + w1) * 0.5;
    ctx.beginPath();
    ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
    ctx.lineTo(pts[i].x, pts[i].y);
    ctx.stroke();
  }
}

/**
 * @param {CanvasRenderingContext2D} strokeCtx
 * @param {{ x: number, y: number }[]} pts
 * @param {number} lineWidth
 * @param {string} color
 * @param {'round'|'flat'|'taper'} brushEndcapNorm
 * @param {number} [taperAmount]
 */
export function drawBrushStrokeBaseOnCtx(strokeCtx, pts, lineWidth, color, brushEndcapNorm, taperAmount = 0) {
  const taper = Math.max(0, Math.min(100, taperAmount || 0));
  if (!pts || pts.length < 2 || !(lineWidth > 0)) return;
  strokeCtx.lineJoin = 'round';
  if (taper <= 0) {
    const cap = brushEndcapNorm === 'flat' ? 'flat' : 'round';
    strokeBrushPolylineVariableWidth(strokeCtx, pts, lineWidth, color, cap);
  } else {
    strokeBrushPolylineVariableWidth(strokeCtx, pts, lineWidth, color, 'round');
  }
}

/**
 * Round: marker-style variable-width strokes + round caps (soft ends, no ribbon steps).
 * Flat: pressure ribbon fill with square ends.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number, wf?: number }[]} rawPts
 * @param {number} lineWidth
 * @param {string} color
 * @param {number} opacity
 * @param {boolean} roundCaps
 */
export function drawBrushyPressureRibbon(ctx, rawPts, lineWidth, color, opacity, roundCaps) {
  const maxSpan = Math.max(0.75, Math.min(4, lineWidth * 0.35));
  let pts = densifyMarkerPoints(
    rawPts.map((p) => ({ ...p })),
    maxSpan,
  );
  let totalLen = 0;
  for (let i = 1; i < pts.length; i++) {
    totalLen += Math.hypot(pts[i].x - pts[i - 1].x, pts[i].y - pts[i - 1].y);
  }
  if (totalLen > 0) {
    const step = Math.max(0.35, lineWidth * 0.055);
    const target = Math.min(10000, Math.max(pts.length, Math.ceil(totalLen / step) + 1));
    if (target > pts.length) pts = resamplePathByDistance(pts, target);
  }
  const n = pts.length;
  if (n < 2) return;

  let minF = 1;
  let maxF = 0;
  for (const p of pts) {
    const fk = p.wf != null && Number.isFinite(Number(p.wf)) ? Number(p.wf) : 1;
    minF = Math.min(minF, fk);
    maxF = Math.max(maxF, fk);
  }

  const widthAt = (i) => {
    const wf = pts[i].wf != null && Number.isFinite(Number(pts[i].wf)) ? Number(pts[i].wf) : null;
    return brushStrokeWidthPxFromPressure01(lineWidth, wf);
  };

  if (roundCaps) {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.globalCompositeOperation = 'source-over';
    if (maxF - minF <= 0.001) {
      strokeBrushPolylineVariableWidth(ctx, pts, lineWidth, color, 'round');
    } else {
      const { left, right } = buildRibbonEdges(pts, n, widthAt, 1);
      ribbonFillClosedPath(ctx, pts, left, right, n, true, color);
    }
    ctx.restore();
    return;
  }

  if (maxF - minF <= 0.001) {
    ctx.save();
    ctx.globalAlpha = opacity;
    strokeBrushPolylineVariableWidth(ctx, pts, lineWidth, color, 'flat');
    ctx.restore();
    return;
  }

  let sumWf = 0;
  for (let mi = 0; mi < n; mi++) {
    const wf0 = pts[mi].wf != null && Number.isFinite(Number(pts[mi].wf)) ? Number(pts[mi].wf) : 1;
    sumWf += wf0;
  }
  const avgWf = sumWf / n;
  const feather = 1 + (1 - avgWf) * 0.28;

  const passes = [
    { outerScale: 1.2 * feather, alphaMul: 0.35 },
    { outerScale: 1.11 * feather, alphaMul: 0.55 },
    { outerScale: 1, alphaMul: 1 },
  ];

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  for (const p of passes) {
    ctx.globalAlpha = opacity * p.alphaMul;
    const { left, right } = buildRibbonEdges(pts, n, widthAt, p.outerScale);
    ribbonFillClosedPath(ctx, pts, left, right, n, false, color);
  }
  ctx.restore();
}

/**
 * Taper endcap ribbon (symmetric sin envelope) — not used for Round Brushy.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number, wf?: number }[]} rawPts
 * @param {number} lineWidth
 * @param {string} color
 * @param {number} opacity
 * @param {'round'|'flat'|'taper'} endcap
 * @param {number} taperAmount 0–100
 */
export function drawRibbonPressureStroke(
  ctx,
  rawPts,
  lineWidth,
  color,
  opacity,
  endcap,
  taperAmount = 0,
) {
  const cap = endcap === 'flat' || endcap === 'taper' ? endcap : 'round';
  const taper = Math.max(0, Math.min(100, taperAmount || 0));
  const maxSpan = Math.max(0.75, Math.min(4, lineWidth * 0.35));
  const pts = densifyMarkerPoints(
    rawPts.map((p) => ({ ...p })),
    maxSpan,
  );
  const n = pts.length;
  if (n < 2) return;

  if (cap === 'flat') {
    drawBrushStrokeBaseOnCtx(ctx, pts, lineWidth, color, cap, taper);
    return;
  }

  const ribbonSymmetric = cap === 'taper';
  const getW = ribbonWidthAt(pts, lineWidth, n, ribbonSymmetric, taper);

  let sumWf = 0;
  for (let mi = 0; mi < n; mi++) {
    const wf0 = pts[mi].wf != null && Number.isFinite(Number(pts[mi].wf)) ? Number(pts[mi].wf) : 1;
    sumWf += wf0;
  }
  const avgWf = sumWf / n;
  const feather = 1 + (1 - avgWf) * 0.28;

  const passes = [
    { outerScale: 1.2 * feather, alphaMul: 0.35 },
    { outerScale: 1.11 * feather, alphaMul: 0.55 },
    { outerScale: 1, alphaMul: 1 },
  ];

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  for (const p of passes) {
    ctx.globalAlpha = opacity * p.alphaMul;
    const { left, right } = buildRibbonEdges(pts, n, getW, p.outerScale);
    ribbonFillClosedPath(ctx, pts, left, right, n, true, color);
  }
  ctx.restore();
}
