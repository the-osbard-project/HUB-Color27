import { drawGlowyPenStroke } from '../ct-glowy-pen.mjs';

/**
 * Brush FX — Glowy (highlighter stroke, ported from pen Glowy).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} points
 * @param {string} color
 * @param {number} width
 * @param {number} opacity
 */
export function drawGlowy(ctx, points, color, width, opacity) {
  void opacity;
  drawGlowyPenStroke(ctx, points, color, width, 'flat');
}
