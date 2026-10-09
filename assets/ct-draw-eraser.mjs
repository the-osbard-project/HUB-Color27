/** Color Time! — Eraser tool (Studio port). */

import { CT_CANVAS_SIZE } from './ct-canvas.mjs';
import { drawEraserStroke } from './draw/ct-eraser-stroke.mjs';
import { brushSizeFromSlider } from './ct-draw-pencil.mjs';
import { bindCtPaintTarget } from './ct-draw-paint-target.mjs';

/**
 * Snapshot + restore helpers for multi-surface live erase.
 * @param {CanvasRenderingContext2D | null | undefined} ctx
 * @returns {ImageData | null}
 */
function snap(ctx) {
  if (!ctx?.canvas) return null;
  try {
    return ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
  } catch {
    return null;
  }
}

/**
 * @param {CanvasRenderingContext2D | null | undefined} ctx
 * @param {ImageData | null} image
 */
function restore(ctx, image) {
  if (!ctx || !image) return;
  ctx.putImageData(image, 0, 0);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   getBrushSize: () => number,
 *   getCanvasBackground: () => string,
 *   getPaintContext?: () => CanvasRenderingContext2D | null,
 *   getFloatContext?: () => CanvasRenderingContext2D | null,
 *   getRasterContext?: () => CanvasRenderingContext2D | null,
 *   onPrepareErase?: () => void,
 *   isActive: () => boolean,
 *   onStrokeCommit?: (stroke: object) => void,
 * }} opts
 */
export function attachCtEraser(canvas, opts) {
  const target = bindCtPaintTarget(canvas, opts);
  if (!target) {
    return { detach() {}, cancelStroke() {} };
  }
  const { eventCanvas, paintCtx } = target;

  let drawing = false;
  /** @type {{ x: number, y: number }[]} */
  let points = [];
  /** @type {ImageData | null} */
  let baseStroke = null;
  /** @type {ImageData | null} */
  let baseFloat = null;
  /** @type {ImageData | null} */
  let baseRaster = null;

  function stagePoint(e) {
    const r = eventCanvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * CT_CANVAS_SIZE,
      y: ((e.clientY - r.top) / r.height) * CT_CANVAS_SIZE,
    };
  }

  function size() {
    return brushSizeFromSlider(opts.getBrushSize());
  }

  function floatCtx() {
    return opts.getFloatContext?.() ?? null;
  }

  function rasterCtx() {
    return opts.getRasterContext?.() ?? null;
  }

  function paintLive() {
    const stroke = paintCtx();
    if (!stroke || !baseStroke || points.length < 1) return;
    const endcap = 'round';
    const bg = opts.getCanvasBackground();
    const w = size();

    restore(stroke, baseStroke);
    drawEraserStroke(stroke, points, w, endcap, bg);

    const fctx = floatCtx();
    if (fctx && baseFloat) {
      restore(fctx, baseFloat);
      drawEraserStroke(fctx, points, w, endcap, bg);
    }

    const rctx = rasterCtx();
    if (rctx && baseRaster) {
      restore(rctx, baseRaster);
      drawEraserStroke(rctx, points, w, endcap, bg);
    }
  }

  function onDown(e) {
    if (!opts.isActive() || e.button !== 0) return;
    /* Floating pencil/etc. sit above the bake surface — flatten so erase hits what you see. */
    opts.onPrepareErase?.();
    const ctx = paintCtx();
    if (!ctx) return;
    drawing = true;
    points = [];
    baseStroke = snap(ctx);
    baseFloat = snap(floatCtx());
    baseRaster = snap(rasterCtx());
    eventCanvas.setPointerCapture(e.pointerId);
    points.push(stagePoint(e));
    paintLive();
    e.preventDefault();
  }

  function onMove(e) {
    if (!drawing) return;
    points.push(stagePoint(e));
    paintLive();
    e.preventDefault();
  }

  function onUp(e) {
    if (!drawing) return;
    drawing = false;
    if (points.length >= 1 && opts.onStrokeCommit) {
      opts.onStrokeCommit({
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        tool: 'eraser',
        width: size(),
        endcap: 'round',
        background: opts.getCanvasBackground(),
        points: points.map((p) => ({ x: p.x, y: p.y })),
        /* Live pass already wrote stroke (+ float/raster). Replay would double destination-out. */
        skipCanvasReplay: true,
      });
    }
    points = [];
    baseStroke = null;
    baseFloat = null;
    baseRaster = null;
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
      restore(paintCtx(), baseStroke);
      restore(floatCtx(), baseFloat);
      restore(rasterCtx(), baseRaster);
      baseStroke = null;
      baseFloat = null;
      baseRaster = null;
    },
    detach() {
      eventCanvas.removeEventListener('pointerdown', onDown);
      eventCanvas.removeEventListener('pointermove', onMove);
      eventCanvas.removeEventListener('pointerup', onUp);
      eventCanvas.removeEventListener('pointercancel', onUp);
    },
  };
}
