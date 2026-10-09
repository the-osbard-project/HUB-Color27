/**
 * Color Time! — Pencil (Studio graphite waxy port).
 */

import { canvasStagePoint, ctCanvasScaleFactor } from './ct-canvas.mjs';
import { drawWaxyStroke, GRAPHITE_WAXY_SPACING, polylineLength } from './draw/ct-waxy-stroke.mjs';
import { bindCtPaintTarget } from './ct-draw-paint-target.mjs';
import { isSubstantialStroke } from './draw/ct-stroke-commit.mjs';

const GRAPHITE_DEFAULT_WIDTH = 12;

/** @param {number} v Studio HUD strokeWidth (slider stores literal px @ 840, scaled for print canvas) */
export function brushSizeFromSlider(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return Math.round(GRAPHITE_DEFAULT_WIDTH * ctCanvasScaleFactor());
  const base = Math.max(1, Math.min(200, Math.round(n)));
  return Math.max(1, Math.min(512, Math.round(base * ctCanvasScaleFactor())));
}

/** @param {number} v 1–100 */
export function opacityFromSlider(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0.95;
  return Math.max(0.05, Math.min(1, n / 100));
}

/** @param {number} v Studio HUD pressure 0–100 */
export function pressureFromSlider(v) {
  const n = Number(v);
  if (!Number.isFinite(n)) return 0.03;
  return Math.max(0, Math.min(1, n / 100));
}

/** @param {{ w?: number }[]} points @param {number} fallback */
function effectiveWidth(points, fallback) {
  const widths = points.map((p) => p.w).filter((w) => Number.isFinite(w));
  if (!widths.length) return fallback;
  return widths.reduce((a, b) => a + b, 0) / widths.length;
}

/**
 * Replay / bake — same raw path + grain density as live incremental draw (no publish resample).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ points: { x: number, y: number, w?: number }[], color: string, opacity?: number, width?: number }} stroke
 */
export function renderPencilStroke(ctx, stroke) {
  if (!stroke.points || stroke.points.length < 2) return;
  const width = stroke.width ?? effectiveWidth(stroke.points, GRAPHITE_DEFAULT_WIDTH);
  const opacity = stroke.opacity ?? 0.95;
  drawWaxyStroke(ctx, stroke.points, stroke.color, width, opacity, GRAPHITE_WAXY_SPACING);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   getColor: () => string,
 *   getBrushSize: () => number,
 *   getOpacity: () => number,
 *   getPressure: () => number,
 *   getPaintContext?: () => CanvasRenderingContext2D | null,
 *   isActive: () => boolean,
 *   onStrokeCommit?: (stroke: object) => void,
 * }} opts
 */
export function attachCtPencil(canvas, opts) {
  const target = bindCtPaintTarget(canvas, opts);
  if (!target) {
    return { detach() {}, cancelStroke() {} };
  }
  const { eventCanvas, paintCtx } = target;

  let drawing = false;
  /** @type {{ x: number, y: number, w: number }[]} */
  let points = [];
  /** @type {ImageData | null} */
  let baseImage = null;
  /** Arc length already stamped during live draw (incremental waxy — avoids grain reshuffle). */
  let liveStampedThrough = 0;
  /** Brush width locked at stroke start so grain spacing stays stable while drawing. */
  let livePreviewWidth = GRAPHITE_DEFAULT_WIDTH;

  function baseWidth() {
    return brushSizeFromSlider(opts.getBrushSize());
  }

  function widthAt(e) {
    const base = baseWidth();
    const pr = pressureFromSlider(opts.getPressure());
    const tip = e.pressure > 0 ? e.pressure : 0.5;
    const factor = 1 - pr * 0.65 + pr * tip * 0.65;
    return Math.max(1, base * factor);
  }

  function paintLive() {
    const ctx = paintCtx();
    if (!ctx || !baseImage || points.length < 2) return;
    const totalLen = polylineLength(points);
    if (liveStampedThrough <= 0) {
      ctx.putImageData(baseImage, 0, 0);
    }
    drawWaxyStroke(
      ctx,
      points,
      opts.getColor(),
      livePreviewWidth,
      opacityFromSlider(opts.getOpacity()),
      GRAPHITE_WAXY_SPACING,
      {
        minDist: liveStampedThrough,
        maxDist: totalLen,
        skipBaseStroke: liveStampedThrough > 0,
      },
    );
    liveStampedThrough = totalLen;
  }

  function resetLivePreview() {
    points = [];
    liveStampedThrough = 0;
    livePreviewWidth = GRAPHITE_DEFAULT_WIDTH;
    baseImage = null;
  }

  function onDown(e) {
    if (!opts.isActive() || e.button !== 0) return;
    const ctx = paintCtx();
    if (!ctx) return;
    drawing = true;
    points = [];
    liveStampedThrough = 0;
    livePreviewWidth = baseWidth();
    baseImage = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    eventCanvas.setPointerCapture(e.pointerId);
    const p = canvasStagePoint(eventCanvas, e);
    points.push({ x: p.x, y: p.y, w: widthAt(e) });
    e.preventDefault();
  }

  function onMove(e) {
    if (!drawing) return;
    /** @type {PointerEvent[]} */
    let events = [e];
    if (typeof e.getCoalescedEvents === 'function') {
      const coalesced = e.getCoalescedEvents();
      if (coalesced?.length) events = coalesced;
    }
    for (const ce of events) {
      const p = canvasStagePoint(eventCanvas, ce);
      const last = points[points.length - 1];
      if (last && last.x === p.x && last.y === p.y) continue;
      points.push({ x: p.x, y: p.y, w: widthAt(ce) });
    }
    paintLive();
    e.preventDefault();
  }

  function onUp(e) {
    if (!drawing) return;
    drawing = false;
    if (points.length >= 2 && isSubstantialStroke(points) && opts.onStrokeCommit) {
      opts.onStrokeCommit({
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        tool: 'pencil',
        points: [...points],
        color: opts.getColor(),
        opacity: opacityFromSlider(opts.getOpacity()),
        width: livePreviewWidth,
        pressure: pressureFromSlider(opts.getPressure()),
        skipCanvasReplay: true,
      });
    } else if (baseImage) {
      const ctx = paintCtx();
      if (ctx) ctx.putImageData(baseImage, 0, 0);
    }
    resetLivePreview();
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
      const ctx = paintCtx();
      if (baseImage && ctx) ctx.putImageData(baseImage, 0, 0);
      resetLivePreview();
    },
    detach() {
      eventCanvas.removeEventListener('pointerdown', onDown);
      eventCanvas.removeEventListener('pointermove', onMove);
      eventCanvas.removeEventListener('pointerup', onUp);
      eventCanvas.removeEventListener('pointercancel', onUp);
    },
  };
}
