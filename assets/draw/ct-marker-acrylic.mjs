/** Color Time! — matte acrylic marker (Studio marker-acrylic.mjs; brushy underlay → watery round stack). */

import { drawMarkerStroke } from './ct-marker-draw.mjs';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} points
 */
function tracePath(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i += 1) ctx.lineTo(points[i].x, points[i].y);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{
 *   points: { x: number, y: number, wf?: number }[],
 *   color: string,
 *   width: number,
 *   opacity?: number,
 *   endcap?: 'round'|'flat'|'taper',
 *   pressure?: number,
 * }} stroke
 */
export function drawAcrylicMarkerStroke(ctx, stroke) {
  const points = stroke.points || [];
  if (points.length < 2) return;

  const color = stroke.color || '#2b2b2b';
  const width = Math.max(1, Number(stroke.width) || 12);
  const opacity = Number.isFinite(stroke.opacity) ? stroke.opacity : 1;
  const endcap = stroke.endcap === 'flat' || stroke.endcap === 'taper' ? stroke.endcap : 'round';
  const pressure = Math.max(0, Math.min(100, Number(stroke.pressure) || 0));
  const baseW = width * 1.45;

  drawMarkerStroke(ctx, {
    points,
    color,
    width: baseW * 0.85,
    endcap,
    taper: endcap === 'taper' ? pressure : 0,
    markerWetOpts: { stamp: false },
  });

  ctx.save();
  ctx.lineCap = endcap === 'flat' ? 'butt' : 'round';
  ctx.lineJoin = 'round';
  for (let i = 0; i < 3; i += 1) {
    const centerBias = (i + 0.5) / 3;
    const k = 0.88 + (centerBias - 0.5) * 0.22;
    ctx.strokeStyle = tone(color, k);
    ctx.globalAlpha = opacity * (0.55 + (1 - Math.abs(centerBias - 0.5) * 1.6) * 0.35);
    ctx.lineWidth = baseW * (0.5 + 0.25 * (1 - Math.abs(centerBias - 0.5) * 2));
    tracePath(ctx, points);
    ctx.stroke();
  }
  ctx.globalAlpha = opacity;
  ctx.strokeStyle = color;
  ctx.lineWidth = baseW * 0.42;
  tracePath(ctx, points);
  ctx.stroke();
  ctx.restore();
}

/** @param {string} hex @param {number} f */
function tone(hex, f) {
  const h = String(hex || '#000000').replace('#', '');
  const n = parseInt(h.length === 3 ? h.split('').map((c) => c + c).join('') : h, 16);
  const r = Math.max(0, Math.min(255, Math.round(((n >> 16) & 255) * f)));
  const g = Math.max(0, Math.min(255, Math.round(((n >> 8) & 255) * f)));
  const b = Math.max(0, Math.min(255, Math.round((n & 255) * f)));
  const as2 = (v) => v.toString(16).padStart(2, '0');
  return `#${as2(r)}${as2(g)}${as2(b)}`;
}
