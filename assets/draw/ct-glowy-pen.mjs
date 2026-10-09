import { strokePenCalligraphy } from './ct-stroke-base.mjs';
import { tracePath } from './ct-brush-fx/shared.mjs';

/**
 * Pen Glowy — bright highlighter stroke (v1 `drawGlowyBrightStrokeOnCtx` simplified for single canvas).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} points
 * @param {string} color
 * @param {number} width
 * @param {'round'|'flat'|'taper'} endcap
 */
export function drawGlowyPenStroke(ctx, points, color, width, endcap) {
  if (!points || points.length < 2) return;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha *= 0.92;
  if (endcap === 'flat') {
    strokePenCalligraphy(ctx, points, width, color);
  } else {
    ctx.strokeStyle = color;
    ctx.lineWidth = width;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    tracePath(ctx, points);
    ctx.stroke();
  }
  ctx.restore();
}
