/** Color Time! — Marker (Studio attachMarker + watery default, copied as-is). */

import { CT_CANVAS_SIZE, CT_CANVAS_W, CT_CANVAS_H } from './ct-canvas.mjs';
import { CT_LAYER_COUNT } from './ct-layers.mjs';
import { drawAcrylicMarkerStroke } from './draw/ct-marker-acrylic.mjs';
import {
  allocateCommitMs,
  drawMarkerStroke,
  prepareMarkerCommitPoints,
} from './draw/ct-marker-draw.mjs';
import { beginLayerReplay, WET_WINDOW_SEC_DEFAULT } from './draw/ct-marker-wet.mjs';
import { fillStrokeCenterlinePolygon } from './draw/ct-stroke-fill.mjs';
import { isTransparentColor } from './draw/ct-color-utils.mjs';
import {
  CT_BUILTIN_SMOOTHING,
  prepareHudStrokePoints,
  hudPointFromEvent,
  hudPointsFromPointerMove,
} from './draw/ct-stroke-hud-runtime.mjs';
import { hudStrokeOpacity, hudFillOpacity } from './draw/ct-hud-paint-opacity.mjs';
import { resolveMarkerEndcap } from './draw/ct-marker-config.mjs';
import { resetStrokePressureSession } from './draw/ct-stroke-pressure.mjs';
import { bindCtPaintTarget } from './ct-draw-paint-target.mjs';
import { isSubstantialStroke } from './draw/ct-stroke-commit.mjs';
import { getCtOverclockMix, getCtOverclockSmudge } from './ct-overclock.mjs';

/** Studio MARKER_TIP_PRESETS.brush */
const MARKER_BRUSH_WIDTH = 12;
const MARKER_BRUSH_PRESSURE = 75;
const MARKER_DEFAULT_INK = 'watery';
const MARKER_DEFAULT_TIP = 'brush';

function sliderValue(label) {
  const input = document.querySelector(`.ct-vslider__input[aria-label="${label}"]`);
  return input instanceof HTMLInputElement ? Number(input.value) : 50;
}

function markerLineWidth() {
  return Math.max(1, Math.round(sliderValue('Brush size') || MARKER_BRUSH_WIDTH));
}

function markerPressureSetting() {
  const v = sliderValue('Pressure');
  return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : MARKER_BRUSH_PRESSURE;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} stroke
 */
export function renderMarkerStroke(ctx, stroke) {
  if (!stroke.points || stroke.points.length < 2) return;
  const ink = stroke.markerInk ?? MARKER_DEFAULT_INK;
  const w = stroke.width ?? MARKER_BRUSH_WIDTH;
  const cap = stroke.endcap ?? 'round';
  const pressure = stroke.pressure ?? MARKER_BRUSH_PRESSURE;
  const hud = prepareHudStrokePoints(stroke.points, stroke.smoothing ?? 0, w, pressure, 0);
  const pts = prepareMarkerCommitPoints(hud, w);
  if (ink === 'acry') {
    drawAcrylicMarkerStroke(ctx, {
      points: pts,
      color: stroke.color,
      width: w,
      endcap: cap,
      pressure,
      opacity: stroke.opacity ?? 1,
    });
    return;
  }
  drawMarkerStroke(ctx, {
    points: pts,
    color: stroke.color,
    width: w,
    endcap: cap,
    taper: stroke.taper ?? 0,
    palette: stroke.palette,
    amountMul: stroke.opacity ?? 1,
    pigmentMix: stroke.pigmentMix ?? 50,
    smudge: stroke.smudge ?? 100,
    markerWetOpts:
      stroke.markerCommitMs != null
        ? {
            layerIndex: Number.isFinite(Number(stroke._layerIndex ?? stroke.layerIndex))
              ? Number(stroke._layerIndex ?? stroke.layerIndex)
              : 0,
            logicalW: CT_CANVAS_SIZE,
            logicalH: CT_CANVAS_SIZE,
            commitMs: stroke.markerCommitMs,
            wetWindowSec: stroke.wetWindowSec ?? WET_WINDOW_SEC_DEFAULT,
            stamp: true,
          }
        : null,
  });
}

/** Reset wet grids before replaying marker strokes in document order. */
export function resetMarkerWetReplay() {
  for (let i = 0; i < CT_LAYER_COUNT; i += 1) {
    beginLayerReplay(i, CT_CANVAS_W, CT_CANVAS_H);
  }
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   getColor: () => string,
 *   getPalette?: () => string[],
 *   getLayerIndex?: () => number,
 *   getPaintContext?: () => CanvasRenderingContext2D | null,
 *   getSmoothing?: () => number,
 *   isActive: () => boolean,
 *   onStrokeCommit?: (stroke: object) => void,
 * }} opts
 */
export function attachCtMarker(canvas, opts) {
  const target = bindCtPaintTarget(canvas, opts);
  if (!target) {
    return { detach() {}, cancelStroke() {} };
  }
  const { eventCanvas, paintCtx } = target;

  let drawing = false;
  let color = opts.getColor();
  const fillColor = null;
  /** @type {{ x: number, y: number, wf?: number }[]} */
  let points = [];
  /** @type {ImageData | null} */
  let baseImage = null;
  /** @type {number | null} */
  let draftCommitMs = null;

  function stagePoint(clientX, clientY) {
    const r = eventCanvas.getBoundingClientRect();
    return {
      x: ((clientX - r.left) / r.width) * eventCanvas.width,
      y: ((clientY - r.top) / r.height) * eventCanvas.height,
    };
  }

  function endcap() {
    return resolveMarkerEndcap(MARKER_DEFAULT_TIP, 'round');
  }

  function pressureSetting() {
    return markerPressureSetting();
  }

  function pointFromEvent(e) {
    return hudPointFromEvent(e, stagePoint, pressureSetting(), endcap());
  }

  function strokeOpacity() {
    return hudStrokeOpacity({ opacity: 1, getStrokeOpacity: () => 1 }, 1);
  }

  function smoothingSetting() {
    if (typeof opts.getSmoothing === 'function') return opts.getSmoothing();
    return CT_BUILTIN_SMOOTHING;
  }

  function markerDrawPoints(raw = points) {
    const w = markerLineWidth();
    const hud = prepareHudStrokePoints(raw, smoothingSetting(), w, pressureSetting(), 0);
    return prepareMarkerCommitPoints(hud, w);
  }

  function wetLayerIndex() {
    const n = Number(opts.getLayerIndex?.());
    return Number.isFinite(n) ? Math.max(0, Math.min(CT_LAYER_COUNT - 1, n)) : 0;
  }

  function wetOpts(stamp) {
    if (draftCommitMs == null) return null;
    return {
      layerIndex: wetLayerIndex(),
      logicalW: CT_CANVAS_SIZE,
      logicalH: CT_CANVAS_SIZE,
      commitMs: draftCommitMs,
      wetWindowSec: WET_WINDOW_SEC_DEFAULT,
      stamp,
    };
  }

  function drawMarkerLayer(pointsArg, stamp) {
    const ctx = paintCtx();
    if (!ctx) return;
    const w = markerLineWidth();
    const cap = endcap();
    const pts = markerDrawPoints(pointsArg);
    ctx.save();
    if (fillColor && !isTransparentColor(fillColor) && pts.length >= 2) {
      fillStrokeCenterlinePolygon(ctx, pts, fillColor, hudFillOpacity({}));
    }
    ctx.globalAlpha = ctx.globalAlpha * strokeOpacity();
    drawMarkerStroke(ctx, {
      points: pts,
      color,
      width: w,
      endcap: cap,
      taper: 0,
      palette: opts.getPalette?.(),
      pigmentMix: getCtOverclockMix(),
      smudge: getCtOverclockSmudge(),
      markerWetOpts: wetOpts(stamp),
    });
    ctx.restore();
  }

  function paintCurrentPath() {
    const ctx = paintCtx();
    if (!ctx || !baseImage || points.length < 2) return;
    ctx.putImageData(baseImage, 0, 0);
    drawMarkerLayer(points, false);
  }

  function onDown(e) {
    if (!opts.isActive() || e.button !== 0) return;
    const ctx = paintCtx();
    if (!ctx) return;
    resetStrokePressureSession();
    color = opts.getColor();
    drawing = true;
    points = [];
    draftCommitMs = allocateCommitMs();
    baseImage = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    eventCanvas.setPointerCapture(e.pointerId);
    points.push(pointFromEvent(e));
    e.preventDefault();
  }

  function onMove(e) {
    if (!drawing) return;
    for (const pt of hudPointsFromPointerMove(e, stagePoint, pressureSetting(), endcap())) {
      const last = points[points.length - 1];
      if (last && last.x === pt.x && last.y === pt.y) continue;
      points.push(pt);
    }
    paintCurrentPath();
    e.preventDefault();
  }

  function onUp(e) {
    if (!drawing) return;
    drawing = false;
    if (points.length >= 2 && isSubstantialStroke(points) && opts.onStrokeCommit) {
      const commitMs = draftCommitMs;
      const w = markerLineWidth();
      const cap = endcap();
      const saved = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        tool: 'marker',
        color,
        fillColor: null,
        width: w,
        endcap: cap,
        taper: 0,
        pressure: pressureSetting(),
        smoothing: smoothingSetting(),
        markerTip: MARKER_DEFAULT_TIP,
        markerInk: MARKER_DEFAULT_INK,
        opacity: strokeOpacity(),
        fillOpacity: 1,
        palette: opts.getPalette?.(),
        pigmentMix: getCtOverclockMix(),
        smudge: getCtOverclockSmudge(),
        markerCommitMs: commitMs,
        wetWindowSec: WET_WINDOW_SEC_DEFAULT,
        layerIndex: wetLayerIndex(),
        points: points.map((p) => ({ x: p.x, y: p.y, wf: p.wf, t: p.t })),
      };
      const ctx = paintCtx();
      if (ctx && baseImage) ctx.putImageData(baseImage, 0, 0);
      opts.onStrokeCommit(saved);
    } else if (baseImage) {
      const ctx = paintCtx();
      if (ctx) ctx.putImageData(baseImage, 0, 0);
    }
    points = [];
    baseImage = null;
    draftCommitMs = null;
    if (e?.pointerId != null) {
      try {
        eventCanvas.releasePointerCapture(e.pointerId);
      } catch {
        /* released */
      }
    }
  }

  eventCanvas.addEventListener('pointerdown', onDown);
  eventCanvas.addEventListener('pointermove', onMove);
  eventCanvas.addEventListener('pointerup', onUp);
  eventCanvas.addEventListener('pointercancel', onUp);

  return {
    cancelStroke() {
      drawing = false;
      points = [];
      const ctx = paintCtx();
      if (baseImage && ctx) ctx.putImageData(baseImage, 0, 0);
      baseImage = null;
      draftCommitMs = null;
    },
    detach() {
      eventCanvas.removeEventListener('pointerdown', onDown);
      eventCanvas.removeEventListener('pointermove', onMove);
      eventCanvas.removeEventListener('pointerup', onUp);
      eventCanvas.removeEventListener('pointercancel', onUp);
    },
  };
}
