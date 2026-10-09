import { drawRoughenStrokePass } from '../ct-image-filter-pass.mjs';

/**
 * Furry — furry edge via v1 roughen image pass (`paint-fx.js` + `object-filters.js`).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} points
 * @param {string} color
 * @param {number} width
 * @param {number} opacity
 * @param {number} _amount
 */
export function drawFurry(ctx, points, color, width, opacity, _amount) {
  void _amount;
  void opacity;
  drawRoughenStrokePass(ctx, points, color, width, 1);
}
