/** Color Time! — starry spray along path (Studio brush-fx/starry.mjs port). */

import { smoothStrokePoints } from './ct-stroke-smooth.mjs';

/** @param {number} i @param {number} x @param {number} y */
function lxSeed(i, x, y) {
  const v = Math.sin((i + 1) * 12.9898 + (x + 1) * 78.233 + (y + 1) * 45.164) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} outerR
 * @param {number} innerR
 * @param {number} rotation
 */
function drawStarAt(ctx, cx, cy, outerR, innerR, rotation) {
  ctx.beginPath();
  for (let i = 0; i < 10; i += 1) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = rotation + (Math.PI * i) / 5;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} points
 * @param {string} color
 * @param {readonly string[]} [palette]
 * @param {number} lineWidth
 * @param {number} opacity
 */
export function drawStarryStroke(ctx, points, color, palette, lineWidth, opacity) {
  if (!points || points.length < 2) return;
  const pts = smoothStrokePoints(points, 40, lineWidth);
  const n = pts.length;
  const trayPalette = palette?.length ? palette : [];

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  const step = Math.max(1, Math.floor(n / 25));
  for (let i = 0; i < n; i += step) {
    const p = pts[i];
    const seed = i * 31;
    const outerR = Math.max(0.8, lineWidth * (0.15 + lxSeed(seed + 19, p.y, p.x) * 0.25));
    const ox = (lxSeed(seed + 1, p.x, p.y) - 0.5) * lineWidth;
    const oy = (lxSeed(seed + 2, p.y, p.x) - 0.5) * lineWidth;
    const tx = p.x + ox;
    const ty = p.y + oy;
    const tpLen = trayPalette.length;
    const colorIndex = tpLen ? Math.floor(lxSeed(seed + 17, tx, ty) * tpLen) % tpLen : 0;
    ctx.fillStyle = tpLen ? trayPalette[colorIndex] : color;
    ctx.globalAlpha = opacity * (0.82 + lxSeed(seed + 23, tx, ty) * 0.18);
    const innerR = outerR * (0.35 + lxSeed(seed + 29, tx, ty) * 0.25);
    const rotation = lxSeed(seed + 37, ty, tx) * Math.PI * 2;
    drawStarAt(ctx, tx, ty, outerR, innerR, rotation);
  }
  ctx.restore();
}
