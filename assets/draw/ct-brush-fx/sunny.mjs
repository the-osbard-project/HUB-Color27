import { drawSunnyStroke } from './warm-wash.mjs';

/**
 * Sunny — sunset glow along path + sun at pen-up (v1 `drawSunnyStroke`).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} points
 * @param {string} color
 * @param {string|null|undefined} fillColor
 * @param {number} width
 * @param {number} _opacity
 * @param {number} amount 0–100
 * @param {boolean} [showSunCore]
 */
export function drawSunny(ctx, points, color, fillColor, width, _opacity, amount, showSunCore = true) {
  drawSunnyStroke(ctx, points, color, fillColor, width, amount, showSunCore);
}
