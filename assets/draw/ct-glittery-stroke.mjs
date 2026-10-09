import { applyGlitterGelImageData } from './ct-image-filter-pass.mjs';
import {
  drawBrushStrokeBaseOnCtx,
  strokePenCalligraphy,
  strokePointsBbox,
} from './ct-stroke-base.mjs';

const GLITTERY_PAINT_FX_INTENSITY = 96;

/** Stroke + pen Glittery — vivid gel glitter (no washed-out halos). */
export const GLITTERY_STROKE_BOOST = { alphaMul: 1, intensityMul: 1.48 };

/**
 * v1 `drawGlitteryPaintFxStroke` — raster base + gel glitter filter.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} pts
 * @param {number} lineWidth
 * @param {string} color
 * @param {'round'|'flat'|'taper'} endcap
 * @param {string[] | null} [palette]
 * @param {number} [amountMul] 0–1
 * @param {{ alphaMul?: number, intensityMul?: number }} [opts]
 */
export function drawGlitteryStroke(ctx, pts, lineWidth, color, endcap, palette, amountMul = 1, opts = {}) {
  if (!pts || pts.length < 2) return;
  const alphaMul = opts.alphaMul ?? 1;
  const intensityMul = opts.intensityMul ?? 1;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  const amountClamped = Math.max(0, Math.min(1, amountMul));
  const compositeAlpha = ctx.globalAlpha;
  const intensity = Math.round(
    GLITTERY_PAINT_FX_INTENSITY * intensityMul * (0.55 + 0.45 * amountClamped),
  );
  const pad = Math.max(12, lineWidth * 2.1);
  const bb = strokePointsBbox(pts, pad);
  if (!isFinite(bb.x0) || bb.w < 2 || bb.h < 2 || bb.w > 4096 || bb.h > 4096) {
    ctx.globalAlpha = compositeAlpha * Math.max(0, Math.min(1, amountClamped * alphaMul));
    if (endcap === 'flat') strokePenCalligraphy(ctx, pts, lineWidth, color, palette);
    else drawBrushStrokeBaseOnCtx(ctx, pts, lineWidth, color, endcap);
    ctx.restore();
    return;
  }
  const c = document.createElement('canvas');
  c.width = bb.w;
  c.height = bb.h;
  const tc = c.getContext('2d');
  if (!tc) {
    ctx.restore();
    return;
  }
  tc.globalAlpha = 1;
  tc.translate(-bb.x0, -bb.y0);
  if (palette && palette.length > 1) {
    const n = pts.length;
    const numSegs = palette.length;
    for (let seg = 0; seg < numSegs; seg++) {
      const i0 = Math.floor((seg / numSegs) * n);
      const i1 = Math.min(n, Math.floor(((seg + 1) / numSegs) * n));
      if (i1 <= i0) continue;
      const slice = pts.slice(i0, i1);
      if (slice.length < 2) continue;
      drawBrushStrokeBaseOnCtx(tc, slice, lineWidth, palette[seg % palette.length] || color, endcap);
    }
  } else if (endcap === 'flat') {
    strokePenCalligraphy(tc, pts, lineWidth, color, null);
  } else {
    drawBrushStrokeBaseOnCtx(tc, pts, lineWidth, color, endcap);
  }
  let img;
  try {
    img = tc.getImageData(0, 0, bb.w, bb.h);
  } catch {
    ctx.drawImage(c, bb.x0, bb.y0);
    ctx.restore();
    return;
  }
  const alphaMask = new Uint8Array(bb.w * bb.h);
  for (let p = 0; p < alphaMask.length; p++) alphaMask[p] = img.data[p * 4 + 3];
  const seed = (Math.sin(pts[0].x * 12.9898 + pts[0].y * 78.233) * 43758.5453) % 1;
  applyGlitterGelImageData(img, intensity, seed * 999.13);
  const d = img.data;
  for (let p = 0; p < alphaMask.length; p++) {
    const i = p * 4;
    if (alphaMask[p] < 8) {
      d[i] = 0;
      d[i + 1] = 0;
      d[i + 2] = 0;
      d[i + 3] = 0;
      continue;
    }
    d[i] = Math.min(255, Math.round(d[i] * 1.16 + 14));
    d[i + 1] = Math.min(255, Math.round(d[i + 1] * 1.16 + 14));
    d[i + 2] = Math.min(255, Math.round(d[i + 2] * 1.16 + 14));
    d[i + 3] = Math.min(255, Math.max(alphaMask[p], d[i + 3]));
  }
  tc.putImageData(img, 0, 0);
  ctx.globalAlpha = compositeAlpha;
  ctx.drawImage(c, bb.x0, bb.y0);
  ctx.restore();
}
