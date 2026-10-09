/** Color Time! — Color Star! tool (Studio attachBrush + brush-fx stack). */

import { CT_CANVAS_SIZE } from './ct-canvas.mjs';
import { getActiveStarBrushFx } from './ct-q400.mjs';
import { getCtRainbowPalette } from './ct-rainbow-fx.mjs';
import { drawBrushFxStroke, normalizeBrushAmount, normalizeBrushFx, starFxUsesOverclockMix } from './draw/ct-brush-fx.mjs';
import { brushSizeFromSlider, opacityFromSlider } from './ct-draw-pencil.mjs';
import { getCtStarFxPreset } from './ct-tool-presets.mjs';
import { cleanPenUpWormTail } from './draw/ct-stroke-pressure-path.mjs';
import { allocateCommitMs, prepareMarkerCommitPoints } from './draw/ct-marker-draw.mjs';
import { WET_WINDOW_SEC_DEFAULT } from './draw/ct-marker-wet.mjs';
import { getCtOverclockMix, getCtOverclockSmudge } from './ct-overclock.mjs';
import {
  prepareHudStrokePoints,
  hudPointFromEvent,
  hudPointsFromPointerMove,
} from './draw/ct-stroke-hud-runtime.mjs';
import {
  appendInkyPoint,
  inkySamplesFromEvent,
} from './draw/ct-inky-pen.mjs';
import { bindCtPaintTarget } from './ct-draw-paint-target.mjs';
import { isSubstantialStroke } from './draw/ct-stroke-commit.mjs';
import { CT_LAYER_COUNT } from './ct-layers.mjs';

const STAR_RAW_LINE_FX = new Set(['inky']);
const DEFAULT_STAR_FX_AMOUNT = 100;

/** Blend/Splatter (0–100) — splat amount for Color Star! FX, or pigment blend for Brushy. */
function fxAmount() {
  const fx = normalizeBrushFx(getActiveStarBrushFx());
  if (!starFxUsesOverclockMix(fx)) {
    const preset = getCtStarFxPreset(fx);
    return normalizeBrushAmount(preset?.amount ?? DEFAULT_STAR_FX_AMOUNT);
  }
  return getCtOverclockMix();
}

function pigmentMix() {
  return getCtOverclockMix();
}

function smudgeAmt() {
  return getCtOverclockSmudge();
}

/** @param {string} label */
function sliderValue(label) {
  const input = document.querySelector(`.ct-vslider__input[aria-label="${label}"]`);
  return input instanceof HTMLInputElement ? Number(input.value) : 50;
}

function pressureSetting() {
  const v = sliderValue('Pressure');
  return Number.isFinite(v) ? Math.max(0, Math.min(100, v)) : 0;
}

/** @param {HTMLCanvasElement} canvas @param {number} clientX @param {number} clientY */
function stagePoint(canvas, clientX, clientY) {
  const r = canvas.getBoundingClientRect();
  return {
    x: ((clientX - r.left) / r.width) * CT_CANVAS_SIZE,
    y: ((clientY - r.top) / r.height) * CT_CANVAS_SIZE,
  };
}

/** @param {string} fx */
function fillColorForFx(fx) {
  if (fx === 'sunny') return '#FFE94A';
  if (fx === 'watery' || fx === 'washy') return '#5E35B1';
  return null;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {object} stroke
 */
export function renderStarStroke(ctx, stroke) {
  drawBrushFxStroke(ctx, stroke);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   getColor: () => string,
 *   getPalette: () => string[] | null,
 *   getBrushSize: () => number,
 *   getOpacity: () => number,
 *   getPaintContext?: () => CanvasRenderingContext2D | null,
 *   getSmoothing?: () => number,
 *   getSimplify?: () => number,
 *   getLayerIndex?: () => number,
 *   isActive: () => boolean,
 *   onStrokeCommit?: (stroke: object) => void,
 * }} opts
 */
export function attachCtStar(canvas, opts) {
  const target = bindCtPaintTarget(canvas, opts);
  if (!target) {
    return { detach() {}, cancelStroke() {} };
  }
  const { eventCanvas, paintCtx } = target;

  let drawing = false;
  /** @type {{ x: number, y: number, t?: number, wf?: number }[]} */
  let points = [];
  /** @type {ImageData | null} */
  let baseImage = null;
  /** @type {number | null} */
  let draftCommitMs = null;

  function fxPreset() {
    return getCtStarFxPreset(fxNorm());
  }

  function width() {
    const w = brushSizeFromSlider(opts.getBrushSize());
    if (STAR_RAW_LINE_FX.has(fxNorm())) return w;
    return Math.max(6, w);
  }

  function smoothingSetting() {
    if (typeof opts.getSmoothing === 'function') return opts.getSmoothing();
    const hud = fxPreset();
    if (Number.isFinite(hud.smoothing)) return hud.smoothing;
    return 0;
  }

  function simplifySetting() {
    if (typeof opts.getSimplify === 'function') return opts.getSimplify();
    const hud = fxPreset();
    if (Number.isFinite(hud.simplify)) return hud.simplify;
    return 0;
  }

  function endcapSetting() {
    const cap = fxPreset().endcap;
    return cap === 'flat' || cap === 'taper' ? cap : 'round';
  }

  function opacity() {
    return opacityFromSlider(opts.getOpacity());
  }

  function fxNorm() {
    return normalizeBrushFx(getActiveStarBrushFx());
  }

  function brushyUsesMarkerWet() {
    return fxNorm() === 'brushy' && endcapSetting() === 'round';
  }

  function wetLayerIndex() {
    const n = Number(opts.getLayerIndex?.());
    return Number.isFinite(n) ? Math.max(0, Math.min(CT_LAYER_COUNT - 1, n)) : 0;
  }

  function markerWetOpts(stamp) {
    if (!brushyUsesMarkerWet() || draftCommitMs == null) return null;
    return {
      layerIndex: wetLayerIndex(),
      logicalW: CT_CANVAS_SIZE,
      logicalH: CT_CANVAS_SIZE,
      commitMs: draftCommitMs,
      wetWindowSec: WET_WINDOW_SEC_DEFAULT,
      stamp,
    };
  }

  function brushyStrokeExtras(stamp) {
    if (!brushyUsesMarkerWet()) return {};
    return {
      pigmentMix: pigmentMix(),
      smudge: smudgeAmt(),
      markerCommitMs: draftCommitMs,
      wetWindowSec: WET_WINDOW_SEC_DEFAULT,
      layerIndex: wetLayerIndex(),
      markerWetOpts: markerWetOpts(stamp),
    };
  }

  function pointFromEvent(e) {
    return hudPointFromEvent(e, (x, y) => stagePoint(eventCanvas, x, y), pressureSetting(), 'round');
  }

  function preparedPoints() {
    const fx = fxNorm();
    let pts = prepareHudStrokePoints(points, smoothingSetting(), width(), pressureSetting(), simplifySetting());
    if (fx === 'brushy' && pressureSetting() > 0) {
      pts = cleanPenUpWormTail(pts);
    }
    return pts;
  }

  function commitPoints() {
    const fx = fxNorm();
    const w = width();
    if (STAR_RAW_LINE_FX.has(fx)) {
      return points.map((p) => ({ x: p.x, y: p.y, t: p.t, wf: p.wf }));
    }
    const pts = preparedPoints();
    return prepareMarkerCommitPoints(pts, w).map((p) => ({ x: p.x, y: p.y, wf: p.wf, t: p.t }));
  }

  function liveStroke() {
    const fx = fxNorm();
    const pr = pressureSetting();
    const cap = endcapSetting();
    const pts = STAR_RAW_LINE_FX.has(fx) ? points : preparedPoints();
    return {
      points: pts,
      color: opts.getColor(),
      width: width(),
      opacity: opacity(),
      fx,
      palette: opts.getPalette(),
      pressure: pr,
      amount: fxAmount(),
      fillColor: fillColorForFx(fx),
      showSunCore: fx === 'sunny',
      endcap: cap,
      smoothing: smoothingSetting(),
      simplify: simplifySetting(),
      livePreview: fx === 'brushy' || STAR_RAW_LINE_FX.has(fx),
      ...brushyStrokeExtras(false),
    };
  }

  function paintLive() {
    const ctx = paintCtx();
    if (!ctx || !baseImage || points.length < 2) return;
    ctx.putImageData(baseImage, 0, 0);
    renderStarStroke(ctx, liveStroke());
  }

  function onDown(e) {
    if (!opts.isActive() || e.button !== 0) return;
    const ctx = paintCtx();
    if (!ctx) return;
    drawing = true;
    points = [];
    draftCommitMs = brushyUsesMarkerWet() ? allocateCommitMs() : null;
    baseImage = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    eventCanvas.setPointerCapture(e.pointerId);
    if (fxNorm() === 'inky') {
      const p = stagePoint(eventCanvas, e.clientX, e.clientY);
      p.t = typeof e.timeStamp === 'number' ? e.timeStamp : Date.now();
      points.push(p);
    } else {
      points.push(pointFromEvent(e));
    }
    e.preventDefault();
  }

  function onMove(e) {
    if (!drawing) return;
    const fx = fxNorm();
    if (fx === 'inky') {
      for (const sample of inkySamplesFromEvent(e, (x, y) => stagePoint(eventCanvas, x, y))) {
        appendInkyPoint(points, sample);
      }
    } else {
      for (const pt of hudPointsFromPointerMove(
        e,
        (x, y) => stagePoint(eventCanvas, x, y),
        pressureSetting(),
        'round',
      )) {
        const last = points[points.length - 1];
        if (last && last.x === pt.x && last.y === pt.y) continue;
        points.push(pt);
      }
    }
    paintLive();
    e.preventDefault();
  }

  function onUp(e) {
    if (!drawing) return;
    drawing = false;
    if (points.length >= 2 && isSubstantialStroke(points) && opts.onStrokeCommit) {
      const fx = fxNorm();
      const saved = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        tool: 'star',
        color: opts.getColor(),
        width: width(),
        opacity: opacity(),
        fx,
        palette: opts.getPalette(),
        pressure: pressureSetting(),
        amount: fxAmount(),
        fillColor: fillColorForFx(fx),
        showSunCore: fx === 'sunny',
        endcap: endcapSetting(),
        smoothing: smoothingSetting(),
        simplify: simplifySetting(),
        points: commitPoints(),
        ...brushyStrokeExtras(true),
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
