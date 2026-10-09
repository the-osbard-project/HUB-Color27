/** Color Time! — brush FX orchestrator (Studio brush-fx.mjs; Color Star! popup modes). */

import { CT_CANVAS_SIZE } from '../ct-canvas.mjs';
import { drawBrushy } from './ct-brushy.mjs';
import { drawDotty } from './ct-brush-fx/dotty.mjs';
import { drawFurry } from './ct-brush-fx/furry.mjs';
import { drawStarry } from './ct-brush-fx/starry.mjs';
import { drawSunny } from './ct-brush-fx/sunny.mjs';
import { drawWashy } from './ct-brush-fx/washy.mjs';
import { drawGlowy } from './ct-brush-fx/glowy.mjs';
import { drawGlittery } from './ct-brush-fx/glittery.mjs';
import { drawInky } from './ct-brush-fx/inky.mjs';
import { isTransparentColor } from './ct-color-utils.mjs';
import { fillStrokeCenterlinePolygon, paintFxSkipsInteriorFill } from './ct-stroke-fill.mjs';
import { WET_WINDOW_SEC_DEFAULT } from './ct-marker-wet.mjs';

const BRUSH_FX_DEFAULT = 'brushy';

export const BRUSH_FX_IDS = [
  'brushy',
  'dotty',
  'furry',
  'glittery',
  'inky',
  'glowy',
  'sunny',
  'starry',
  'washy',
  'watery',
];

const BRUSH_FX_SUPPORTED = new Set(BRUSH_FX_IDS);

const BRUSH_FX_MIX_FX = new Set(['dotty', 'sunny', 'washy', 'watery']);

/** Star FX modes driven by Blend/Splatter (amount); Starry/Glowy/Furry/Inky unchanged. */
const STAR_FX_OVERCLOCK_MIX = new Set([...BRUSH_FX_MIX_FX, 'glittery']);

/** @param {string | undefined} fx */
export function starFxUsesOverclockMix(fx) {
  return STAR_FX_OVERCLOCK_MIX.has(normalizeBrushFx(fx));
}

/**
 * @param {string | undefined} fx
 */
export function normalizeBrushFx(fx) {
  const next = String(fx || '').toLowerCase().trim();
  let id = next === 'fuzzy' ? 'furry' : next;
  if (id === 'magical' || id === 'soft') id = 'inky';
  return BRUSH_FX_SUPPORTED.has(id) ? id : BRUSH_FX_DEFAULT;
}

/**
 * @param {number | undefined} amount
 */
export function normalizeBrushAmount(amount) {
  const n = Number(amount);
  if (!Number.isFinite(n)) return 50;
  return Math.max(0, Math.min(100, n));
}

/**
 * @param {object} stroke
 * @param {boolean} [livePreview]
 */
function resolveBrushyMarkerWetOpts(stroke, livePreview = false) {
  if (stroke.markerWetOpts) {
    const n = Number(stroke._layerIndex ?? stroke.layerIndex ?? stroke.markerWetOpts.layerIndex);
    if (Number.isFinite(n) && n !== stroke.markerWetOpts.layerIndex) {
      return { ...stroke.markerWetOpts, layerIndex: n };
    }
    return stroke.markerWetOpts;
  }
  if (stroke.markerCommitMs == null) return livePreview ? { stamp: false } : null;
  return {
    layerIndex: Number.isFinite(Number(stroke._layerIndex ?? stroke.layerIndex))
      ? Number(stroke._layerIndex ?? stroke.layerIndex)
      : 0,
    logicalW: CT_CANVAS_SIZE,
    logicalH: CT_CANVAS_SIZE,
    commitMs: stroke.markerCommitMs,
    wetWindowSec: stroke.wetWindowSec ?? WET_WINDOW_SEC_DEFAULT,
    stamp: !livePreview,
  };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{
 *   id?: string,
 *   points: { x: number, y: number, t?: number, wf?: number }[],
 *   color: string,
 *   fillColor?: string | null,
 *   fillOpacity?: number,
 *   palette?: string[] | null,
 *   width: number,
 *   opacity?: number,
 *   fx?: string,
 *   amount?: number,
 *   showSunCore?: boolean,
 *   endcap?: 'round' | 'flat' | 'taper',
 *   pressure?: number,
 *   smoothing?: number,
 *   livePreview?: boolean,
 *   pigmentMix?: number,
 *   smudge?: number,
 *   markerCommitMs?: number,
 *   wetWindowSec?: number,
 *   layerIndex?: number,
 *   markerWetOpts?: object | null,
 * }} stroke
 */
export function drawBrushFxStroke(ctx, stroke) {
  const points = stroke.points || [];
  if (points.length < 2) return;
  const fx = normalizeBrushFx(stroke.fx);
  const amountRaw = normalizeBrushAmount(stroke.amount);
  const amount =
    BRUSH_FX_MIX_FX.has(fx) || fx === 'glittery' || fx === 'glowy' ? amountRaw : 50;
  const color = stroke.color || '#2b2b2b';
  const fillColor = stroke.fillColor ?? null;
  const fillOpacity = Number.isFinite(stroke.fillOpacity) ? stroke.fillOpacity : 1;
  const palette = stroke.palette ?? null;
  const width = Math.max(1, Number(stroke.width) || 1);
  const opacity = Number.isFinite(stroke.opacity) ? stroke.opacity : 0.9;
  const showSunCore = stroke.showSunCore !== false;
  const endcap = stroke.endcap === 'flat' || stroke.endcap === 'taper' ? stroke.endcap : 'round';
  const pressure = Number(stroke.pressure) || 0;
  const livePreview = stroke.livePreview === true;

  if (BRUSH_FX_MIX_FX.has(fx) && amount <= 0 && fx !== 'dotty') {
    drawBrushy(ctx, points, color, width, opacity, fillColor, endcap, pressure, livePreview, fillOpacity);
    return;
  }

  switch (fx) {
    case 'dotty':
      drawDotty(ctx, points, color, fillColor, width, amount);
      return;
    case 'furry':
      drawFurry(ctx, points, color, width, opacity, amount);
      return;
    case 'starry':
      drawStarry(ctx, points, color, palette ?? undefined, width, opacity, amount);
      return;
    case 'sunny':
      drawSunny(ctx, points, color, fillColor, width, opacity, amount, showSunCore);
      return;
    case 'washy':
    case 'watery':
      drawWashy(ctx, points, color, fillColor, width, opacity, amount);
      return;
    case 'glowy':
      drawGlowy(ctx, points, color, width, opacity);
      return;
    case 'glittery':
      drawGlittery(ctx, points, color, width, opacity, amount, palette ?? undefined);
      return;
    case 'inky': {
      if (fillColor && !isTransparentColor(fillColor) && !paintFxSkipsInteriorFill('inky')) {
        fillStrokeCenterlinePolygon(ctx, points, fillColor, fillOpacity);
      }
      drawInky(ctx, points, color, width, opacity);
      return;
    }
    default:
      drawBrushy(ctx, points, color, width, opacity, fillColor, endcap, pressure, livePreview, fillOpacity, {
        pigmentMix: stroke.pigmentMix,
        smudge: stroke.smudge,
        markerWetOpts: resolveBrushyMarkerWetOpts(stroke, livePreview),
      });
  }
}
