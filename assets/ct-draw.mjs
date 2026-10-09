/** Color Time! — draw engine orchestration. */

import { getDrawCanvas, getDrawContext, fillCanvasBackground, clearDrawSurface, getLayerStrokeContext, CT_CANVAS_SIZE, CT_CANVAS_W, CT_CANVAS_H } from './ct-canvas.mjs';
import { CT_LAYER_COUNT, clearAllLayerStrokeSurfaces, refreshLayerTilePreviews, getLayerFloatContext, getLayerContext } from './ct-layers.mjs';
import { beginLayerReplay } from './draw/ct-marker-wet.mjs';
import { getCanvasBackgroundCss } from './ct-canvas-color.mjs';
import { attachCtPencil, renderPencilStroke } from './ct-draw-pencil.mjs';
import { attachCtEraser } from './ct-draw-eraser.mjs';
import { attachCtBucket, renderBucketFillOnLayer } from './ct-draw-bucket.mjs';
import { attachCtCrayon, renderCrayonStroke } from './ct-draw-crayon.mjs';
import { attachCtPastel, renderPastelStroke } from './ct-draw-pastel.mjs';
import { attachCtMarker, renderMarkerStroke, resetMarkerWetReplay } from './ct-draw-marker.mjs';
import { attachCtStar, renderStarStroke } from './ct-draw-star.mjs';
import { renderEraserStroke } from './draw/ct-eraser-stroke.mjs';
import { getActiveCtToolKey } from './ct-tool-select.mjs';
import { isCtOverclockWandActive } from './ct-overclock-wand.mjs';
import { getCtOverclockSmoothing, getCtOverclockSimplify, isCtSelectBoundingBoxEnabled } from './ct-overclock.mjs';
import { getActiveCtColor, ensureDefaultCtColor, onCtColorChange, getBucketCtColor } from './ct-color-tray.mjs';
import { getCtRainbowPalette } from './ct-rainbow-fx.mjs';

/** @type {object[]} */
let strokes = [];

/** @type {() => number} */
let activeLayerIndexProvider = () => 0;

/** @param {() => number} fn */
export function bindActiveLayerIndex(fn) {
  activeLayerIndexProvider = fn;
}

/** @param {object} stroke */
function strokeLayerIndex(stroke) {
  const n = Number(stroke?.layerIndex);
  return Number.isFinite(n) ? Math.max(0, Math.min(CT_LAYER_COUNT - 1, n)) : 0;
}

/** @param {number} layerIndex 0-based */
export function getStrokesForLayer(layerIndex) {
  return strokes.filter((s) => strokeLayerIndex(s) === layerIndex);
}

/** @param {number} layerIndex 0-based */
export function layerHasDrawStrokes(layerIndex) {
  return getStrokesForLayer(layerIndex).length > 0;
}

/** @param {number} layerIndex 0-based */
export function clearStrokesForLayer(layerIndex) {
  const next = strokes.filter((s) => strokeLayerIndex(s) !== layerIndex);
  if (next.length === strokes.length) {
    beginLayerReplay(layerIndex, CT_CANVAS_W, CT_CANVAS_H);
    return;
  }
  setCtStrokes(next);
}

/** @param {CanvasRenderingContext2D} ctx @param {object} stroke */
export function replayStrokeToContext(ctx, stroke) {
  if (stroke.tool === 'pencil') renderPencilStroke(ctx, stroke);
  else if (stroke.tool === 'eraser') renderEraserStroke(ctx, stroke);
  else if (stroke.tool === 'bucket') renderBucketFillOnLayer(ctx, stroke, strokeLayerIndex(stroke));
  else if (stroke.tool === 'crayon') renderCrayonStroke(ctx, stroke);
  else if (stroke.tool === 'pastel') renderPastelStroke(ctx, stroke);
  else if (stroke.tool === 'marker') {
    renderMarkerStroke(ctx, {
      ...stroke,
      markerInk: stroke.markerInk ?? 'watery',
      markerCommitMs: stroke.markerCommitMs ?? null,
    });
  } else if (stroke.tool === 'star') renderStarStroke(ctx, stroke);
}



/** @type {ReturnType<typeof attachCtPencil> | null} */

let pencil = null;

/** @type {ReturnType<typeof attachCtEraser> | null} */

let eraser = null;

/** @type {ReturnType<typeof attachCtBucket> | null} */

let bucket = null;

/** @type {ReturnType<typeof attachCtCrayon> | null} */

let crayon = null;

/** @type {ReturnType<typeof attachCtPastel> | null} */

let pastel = null;

/** @type {ReturnType<typeof attachCtMarker> | null} */

let marker = null;

/** @type {ReturnType<typeof attachCtStar> | null} */

let star = null;



function sliderValue(label) {

  const input = document.querySelector(`.ct-vslider__input[aria-label="${label}"]`);

  return input instanceof HTMLInputElement ? Number(input.value) : 50;

}



function isPencilActive() {

  return getActiveCtToolKey() === 'pencil';

}



function isEraserActive() {

  return getActiveCtToolKey() === 'eraser';

}



function isBucketActive() {

  return getActiveCtToolKey() === 'bucket';

}



function isCrayonActive() {

  return getActiveCtToolKey() === 'crayon';

}



function isPastelActive() {

  return getActiveCtToolKey() === 'pastel';

}



function isMarkerActive() {

  return getActiveCtToolKey() === 'marker';

}



function isStarActive() {

  return getActiveCtToolKey() === 'star';

}



/** @param {number} layerIndex 0-based */
export function refreshBakedStrokesOnLayer(layerIndex) {
  const ctx = getLayerStrokeContext(layerIndex);
  if (!ctx) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
  ctx.restore();
  if (getStrokesForLayer(layerIndex).some((s) => s.tool === 'marker' || (s.tool === 'star' && s.fx === 'brushy' && s.markerCommitMs != null))) {
    beginLayerReplay(layerIndex, CT_CANVAS_W, CT_CANVAS_H);
  }
  for (const stroke of getStrokesForLayer(layerIndex)) {
    replayStrokeToContext(ctx, stroke);
  }
  refreshLayerTilePreviews();
}

function replayStroke(stroke) {
  const ctx = getLayerStrokeContext(strokeLayerIndex(stroke));
  if (!ctx) return;
  replayStrokeToContext(ctx, stroke);
}



export function getCtStrokes() {

  return strokes;

}



function refillBackground() {
  /* Desk preview CSS — transparent page still paints white paper on stage. */
  fillCanvasBackground(getCanvasBackgroundCss());
}



export function setCtStrokes(next, { background } = {}) {

  strokes = [...next];

  if (!getDrawCanvas() || !getDrawContext()) return;

  if (background) fillCanvasBackground(background);

  else refillBackground();

  clearDrawSurface();
  clearAllLayerStrokeSurfaces();

  resetMarkerWetReplay();
  let markerReplaySeq = 0;
  for (const stroke of strokes) {
    if (stroke.tool === 'marker' && (stroke.markerInk ?? 'watery') !== 'acry' && stroke.markerCommitMs == null) {
      replayStroke({
        ...stroke,
        markerInk: 'watery',
        markerCommitMs: 1_000_000 + markerReplaySeq,
        wetWindowSec: 30,
        pigmentMix: stroke.pigmentMix ?? 50,
        smudge: stroke.smudge ?? 100,
      });
      markerReplaySeq += 1;
    } else if (
      stroke.tool === 'star' &&
      stroke.fx === 'brushy' &&
      stroke.markerCommitMs == null
    ) {
      replayStroke({
        ...stroke,
        markerCommitMs: 2_000_000 + markerReplaySeq,
        wetWindowSec: 30,
        pigmentMix: stroke.pigmentMix ?? 50,
        smudge: stroke.smudge ?? 100,
      });
      markerReplaySeq += 1;
    } else {
      replayStroke(stroke);
    }
  }

  refreshLayerTilePreviews();
}



export function clearCtDrawing() {

  setCtStrokes([]);

}



function cancelLiveStroke() {

  pencil?.cancelStroke();

  eraser?.cancelStroke();

  crayon?.cancelStroke();

  pastel?.cancelStroke();

  marker?.cancelStroke();

  star?.cancelStroke();

}

export function cancelCtLiveStroke() {
  cancelLiveStroke();
}



function currentCanvasBackground() {
  return getCanvasBackgroundCss();
}



export function initCtDraw() {

  ensureDefaultCtColor();

  const canvas = getDrawCanvas();

  if (!(canvas instanceof HTMLCanvasElement)) return;



  const commit = (stroke) => {
    window.dispatchEvent(new Event('ct-history-checkpoint'));
    const { livePreview, skipCanvasReplay, ...saved } = stroke;
    window.dispatchEvent(new CustomEvent('ct-route-stroke-commit', {
      detail: {
        stroke: saved,
        layerIndex: activeLayerIndexProvider(),
        skipCanvasReplay: skipCanvasReplay === true,
      },
    }));
  };

  window.addEventListener('ct-refresh-baked-strokes', (e) => {
    const idx = /** @type {CustomEvent<{ layerIndex: number }>} */ (e).detail?.layerIndex;
    if (typeof idx === 'number') refreshBakedStrokesOnLayer(idx);
  });

  window.addEventListener('ct-append-baked-stroke', (e) => {
    const detail = /** @type {CustomEvent<{ stroke: object, layerIndex: number, skipCanvasReplay?: boolean }>} */ (e).detail;
    if (!detail?.stroke) return;
    strokes.push({ ...detail.stroke, layerIndex: detail.layerIndex });
    if (!detail.skipCanvasReplay) {
      replayStroke({ ...detail.stroke, layerIndex: detail.layerIndex });
    }
    refreshLayerTilePreviews();
    window.dispatchEvent(new CustomEvent('ct-stroke-commit', { detail: detail.stroke }));
  });

  function activePaintContext() {
    return getLayerStrokeContext(activeLayerIndexProvider());
  }

  /* Pencil/crayon/etc. commit onto the float plane. Live preview must too, or the
   * new stroke paints under existing art on that layer until pointer-up. */
  function activeLiveStrokeContext() {
    return getLayerFloatContext(activeLayerIndexProvider()) ?? activePaintContext();
  }

  const paintContextOpts = { getPaintContext: activePaintContext };
  const liveStrokePaintOpts = { getPaintContext: activeLiveStrokeContext };



  pencil = attachCtPencil(canvas, {
    ...liveStrokePaintOpts,
    getColor: getActiveCtColor,

    getBrushSize: () => sliderValue('Brush size'),

    getOpacity: () => 100,

    getPressure: () => sliderValue('Pressure'),

    getSimplify: getCtOverclockSimplify,

    isActive: () => isPencilActive() && !isCtOverclockWandActive() && !isCtSelectBoundingBoxEnabled(),

    onStrokeCommit: commit,

  });



  eraser = attachCtEraser(canvas, {
    ...paintContextOpts,
    getBrushSize: () => sliderValue('Brush size'),

    getCanvasBackground: currentCanvasBackground,

    getFloatContext: () => getLayerFloatContext(activeLayerIndexProvider()),

    getRasterContext: () => getLayerContext(activeLayerIndexProvider()),

    onPrepareErase: () => {
      window.dispatchEvent(new CustomEvent('ct-bake-before-erase', {
        detail: { layerIndex: activeLayerIndexProvider() },
      }));
    },

    isActive: () => isEraserActive() && !isCtOverclockWandActive() && !isCtSelectBoundingBoxEnabled(),

    onStrokeCommit: commit,

  });



  bucket = attachCtBucket(canvas, {
    ...paintContextOpts,
    getColor: getBucketCtColor,
    getOpacity: () => 100,
    getLayerIndex: activeLayerIndexProvider,
    isActive: () => isBucketActive() && !isCtOverclockWandActive() && !isCtSelectBoundingBoxEnabled(),
    onFillCommit: commit,
  });



  crayon = attachCtCrayon(canvas, {
    ...liveStrokePaintOpts,
    getColor: getActiveCtColor,

    getBrushSize: () => sliderValue('Brush size'),

    getOpacity: () => 100,

    getSimplify: getCtOverclockSimplify,

    isActive: () => isCrayonActive() && !isCtOverclockWandActive() && !isCtSelectBoundingBoxEnabled(),

    onStrokeCommit: commit,

  });



  pastel = attachCtPastel(canvas, {
    ...liveStrokePaintOpts,
    getColor: getActiveCtColor,

    getBrushSize: () => sliderValue('Brush size'),

    getOpacity: () => 100,

    getSimplify: getCtOverclockSimplify,

    isActive: () => isPastelActive() && !isCtOverclockWandActive() && !isCtSelectBoundingBoxEnabled(),

    onStrokeCommit: commit,

  });



  marker = attachCtMarker(canvas, {
    ...liveStrokePaintOpts,
    getColor: getActiveCtColor,
    getPalette: getCtRainbowPalette,
    getLayerIndex: activeLayerIndexProvider,
    getSmoothing: getCtOverclockSmoothing,
    isActive: () => isMarkerActive() && !isCtOverclockWandActive() && !isCtSelectBoundingBoxEnabled(),
    onStrokeCommit: commit,
  });



  star = attachCtStar(canvas, {
    ...liveStrokePaintOpts,
    getColor: getActiveCtColor,

    getPalette: getCtRainbowPalette,

    getLayerIndex: activeLayerIndexProvider,

    getBrushSize: () => sliderValue('Brush size'),

    getOpacity: () => 100,

    getSmoothing: getCtOverclockSmoothing,
    getSimplify: getCtOverclockSimplify,

    isActive: () => isStarActive() && !isCtOverclockWandActive() && !isCtSelectBoundingBoxEnabled(),

    onStrokeCommit: commit,

  });



  document.querySelectorAll('.dd-q400-tool').forEach((btn) => {

    btn.addEventListener('click', () => cancelLiveStroke());

  });



  onCtColorChange(() => {

    /* live color for next stroke */

  });



  window.addEventListener('ct-canvas-bg-changed', () => {

    replayAllCtStrokes();

  });

  window.addEventListener('ct-active-layer-changed', () => {
    cancelLiveStroke();
  });

}



export function replayAllCtStrokes() {

  setCtStrokes(strokes);

}

