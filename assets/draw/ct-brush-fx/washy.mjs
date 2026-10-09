import { drawWashyStroke } from './warm-wash.mjs';

/**
 * Washy — diluted paint wash (v1 `drawWashyStroke`).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} points
 * @param {string} color
 * @param {string|null|undefined} fillColor
 * @param {number} width
 * @param {number} _opacity
 * @param {number} amount 0–100
 */
export function drawWashy(ctx, points, color, fillColor, width, _opacity, amount) {
  drawWashyStroke(ctx, points, color, fillColor, width, amount);
}
