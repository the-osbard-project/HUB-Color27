import { lxSeed } from './shared.mjs';
import { smoothStrokePoints } from '../ct-stroke-smooth.mjs';

/**
 * 5-point star (v1 `drawStarAt`).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} outerR
 * @param {number} innerR
 * @param {number} rotation
 */
function drawStarAt(ctx, cx, cy, outerR, innerR, rotation) {
  const pointsCount = 5;
  ctx.beginPath();
  for (let i = 0; i < pointsCount * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = rotation + (Math.PI * i) / pointsCount;
    const x = cx + r * Math.cos(a);
    const y = cy + r * Math.sin(a);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * Starry spray along path (v1 `drawStarrySpray`).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} points
 * @param {string} color
 * @param {readonly string[]} [palette] tray colors; uses `color` if empty
 * @param {number} lineWidth
 * @param {number} _opacity
 * @param {number} _amount
 */
export function drawStarry(ctx, points, color, palette, lineWidth, _opacity, _amount) {
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
    ctx.globalAlpha = 0.82 + lxSeed(seed + 23, tx, ty) * 0.18;
    const innerR = outerR * (0.35 + lxSeed(seed + 29, tx, ty) * 0.25);
    const rotation = lxSeed(seed + 37, ty, tx) * Math.PI * 2;
    drawStarAt(ctx, tx, ty, outerR, innerR, rotation);
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}
