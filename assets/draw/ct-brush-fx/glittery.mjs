import { drawGlitteryStroke, GLITTERY_STROKE_BOOST } from '../ct-glittery-stroke.mjs';

/**
 * Brush FX — Glittery (gel glitter stroke, ported from pen Glittery).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} points
 * @param {string} color
 * @param {number} width
 * @param {number} opacity
 * @param {number} amount 0–100
 * @param {string[] | null | undefined} palette
 */
export function drawGlittery(ctx, points, color, width, opacity, amount, palette) {
  const amountMul = Math.max(0, Math.min(1, amount / 100));
  ctx.save();
  ctx.globalAlpha *= opacity;
  drawGlitteryStroke(ctx, points, width, color, 'round', palette ?? null, amountMul, GLITTERY_STROKE_BOOST);
  ctx.restore();
}
