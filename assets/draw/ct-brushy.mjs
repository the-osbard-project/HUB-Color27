/** Color Time! — Brushy FX (Studio brush-fx/brushy.mjs; round cap → Marker watery stack). */

import { isTransparentColor } from './ct-color-utils.mjs';
import { drawMarkerStroke } from './ct-marker-draw.mjs';
import { fillStrokeCenterlinePolygon, paintFxSkipsInteriorFill } from './ct-stroke-fill.mjs';
import { cleanPenUpWormTail } from './ct-stroke-pressure-path.mjs';

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number, wf?: number }[]} points
 * @param {string} color
 * @param {number} width
 * @param {number} opacity
 * @param {string|null|undefined} [fillColor]
 * @param {'round'|'flat'|'taper'} [endcap]
 * @param {number} [pressureSetting]
 * @param {boolean} [livePreview]
 * @param {number} [fillOpacity]
 * @param {{ pigmentMix?: number, smudge?: number, markerWetOpts?: object | null }} [extras]
 */
export function drawBrushy(
  ctx,
  points,
  color,
  width,
  opacity,
  fillColor,
  endcap = 'round',
  pressureSetting = 0,
  livePreview = false,
  fillOpacity = 1,
  extras = {},
) {
  if (points.length < 2) return;
  if (fillColor && !isTransparentColor(fillColor) && !paintFxSkipsInteriorFill('brushy')) {
    fillStrokeCenterlinePolygon(ctx, points, fillColor, fillOpacity);
  }
  const cap = endcap === 'flat' || endcap === 'taper' ? endcap : 'round';
  if (cap === 'round') {
    const trimmed =
      pressureSetting > 0 ? cleanPenUpWormTail(points) : points.map((p) => ({ ...p }));
    drawMarkerStroke(ctx, {
      points: trimmed,
      color,
      width,
      endcap: 'round',
      taper: 0,
      amountMul: opacity,
      pigmentMix: extras.pigmentMix,
      smudge: extras.smudge,
      markerWetOpts: extras.markerWetOpts ?? (livePreview ? { stamp: false } : null),
    });
  }
}
