/** Color Time! — waxy graphite stroke (ported from Studio packages/draw/waxy-stroke.mjs). */

import { pseudo } from './ct-draw-rng.mjs';
import { tracePathSmooth } from './ct-brush-fx/shared.mjs';

/**
 * @param {string} hex
 * @param {number} mul
 */
function hexBrightness(hex, mul) {
  const h = hex.replace('#', '');
  if (h.length !== 6) return hex;
  const r = Math.min(255, Math.max(0, Math.round(parseInt(h.slice(0, 2), 16) * mul)));
  const g = Math.min(255, Math.max(0, Math.round(parseInt(h.slice(2, 4), 16) * mul)));
  const b = Math.min(255, Math.max(0, Math.round(parseInt(h.slice(4, 6), 16) * mul)));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
}

/** Ink → Graphite — one grain for every tray well. */
export const GRAPHITE_WAXY_SPACING = 0.8;

/**
 * @param {{ x: number, y: number }[]} points
 */
export function polylineLength(points) {
  if (!points || points.length < 2) return 0;
  let total = 0;
  for (let i = 1; i < points.length; i += 1) {
    total += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return total;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} points
 * @param {string} color
 * @param {number} lineWidth
 * @param {number} opacity
 * @param {number} [spacingMul]
 * @param {{ minDist?: number, maxDist?: number, skipBaseStroke?: boolean }} [opts]
 */
export function drawWaxyStroke(ctx, points, color, lineWidth, opacity, spacingMul = 1, opts = {}) {
  const minDist = Math.max(0, Number(opts.minDist) || 0);
  const maxDist = Number.isFinite(opts.maxDist) ? opts.maxDist : Infinity;
  const skipBaseStroke = opts.skipBaseStroke === true;
  const n = points.length;
  if (n < 2) return;
  const mul = Math.max(0.35, Number(spacingMul) || 1);

  ctx.save();
  if (!skipBaseStroke) {
    ctx.globalAlpha = 0;
    ctx.strokeStyle = color;
    ctx.lineWidth = Math.max(1, lineWidth * 1.05);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    tracePathSmooth(ctx, points);
    ctx.stroke();
  }

  ctx.globalAlpha = 0.75 * opacity;
  const targetStep = ((Math.max(0.5, lineWidth * 0.02) * 2) / 3) * mul;
  const segLens = new Array(n);
  let totalLen = 0;
  for (let i = 1; i < n; i += 1) {
    const sxd = points[i].x - points[i - 1].x;
    const syd = points[i].y - points[i - 1].y;
    segLens[i] = Math.hypot(sxd, syd);
    totalLen += segLens[i];
  }
  if (totalLen <= 0) {
    ctx.restore();
    return;
  }

  const totalStamps = Math.max(2, Math.floor(totalLen / targetStep));
  let segIdx = 1;
  let segAcc = 0;
  ctx.fillStyle = color;

  for (let s = 0; s < totalStamps; s += 1) {
    const seed = s * 13 + 7;
    const jitter = (pseudo(seed + 1, s, s) - 0.5) * targetStep * 0.6;
    const targetDist = Math.min(totalLen, Math.max(0, s * targetStep + jitter));
    if (targetDist < minDist) continue;
    if (targetDist > maxDist) break;
    while (segIdx < n && segAcc + segLens[segIdx] < targetDist) {
      segAcc += segLens[segIdx];
      segIdx += 1;
    }
    if (segIdx >= n) break;
    const p0 = points[segIdx - 1];
    const p1 = points[segIdx];
    const segLen = segLens[segIdx];
    if (!segLen) continue;
    const tInSeg = (targetDist - segAcc) / segLen;
    const dx = p1.x - p0.x;
    const dy = p1.y - p0.y;
    const dirx = dx / segLen;
    const diry = dy / segLen;
    const nvx = diry;
    const nvy = -dirx;
    const baseAngle = Math.atan2(diry, dirx);
    const cx = p0.x + dx * tInSeg;
    const cy = p0.y + dy * tInSeg;
    const widthRamp = Math.min(1, Math.max(0, (lineWidth - 1) / 19));
    const spreadMul = 0.4 + widthRamp * 0.44;
    const off = (pseudo(seed + 3, cx, cy) - 0.5) * lineWidth * spreadMul;
    const px = cx + nvx * off;
    const py = cy + nvy * off;
    if (pseudo(seed + 19, px, py) < 0.2) continue;
    const brightness = 0.9 + pseudo(seed + 5, px, py) * 0.2;
    const speckColor = hexBrightness(color, brightness);
    const halfW = Math.max(0.35, lineWidth * (0.08 + pseudo(seed + 7, py, px) * 0.08));
    const halfH = Math.max(0.25, halfW * (0.4 + pseudo(seed + 9, px, py) * 0.4));
    const skew = halfW * (0.35 + pseudo(seed + 21, px, py) * 0.5);
    const theta = baseAngle + (pseudo(seed + 11, px, py) - 0.5) * 0.9;
    const cosT = Math.cos(theta);
    const sinT = Math.sin(theta);
    const cornersLocal = [
      [-halfW - skew, -halfH],
      [halfW - skew, -halfH],
      [halfW + skew, halfH],
      [-halfW + skew, halfH],
    ];
    ctx.beginPath();
    for (let vi = 0; vi < 4; vi += 1) {
      const lx = cornersLocal[vi][0];
      const ly = cornersLocal[vi][1];
      const wx = px + lx * cosT - ly * sinT;
      const wy = py + lx * sinT + ly * cosT;
      if (vi === 0) ctx.moveTo(wx, wy);
      else ctx.lineTo(wx, wy);
    }
    ctx.closePath();
    ctx.fillStyle = speckColor;
    ctx.fill();
  }
  ctx.restore();
}
