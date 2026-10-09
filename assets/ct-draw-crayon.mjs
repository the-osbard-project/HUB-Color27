/** Color Time! — Crayon (Studio waxy port, wider spacing than Pencil). */

import { canvasStagePoint } from './ct-canvas.mjs';
import { drawWaxyStroke } from './draw/ct-waxy-stroke.mjs';
import { brushSizeFromSlider, opacityFromSlider } from './ct-draw-pencil.mjs';
import { bindCtPaintTarget } from './ct-draw-paint-target.mjs';
import { isSubstantialStroke } from './draw/ct-stroke-commit.mjs';
import {
  CT_DEFAULT_SIMPLIFY,
  preparePublishStrokePoints,
} from './draw/ct-stroke-hud-runtime.mjs';

export const CRAYON_WAXY_SPACING = 1;
const CRAYON_BASE_OPACITY = 0.75;

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ points: { x: number, y: number }[], color: string, width?: number, opacity?: number }} stroke
 */
export function renderCrayonStroke(ctx, stroke) {
  if (!stroke.points || stroke.points.length < 2) return;
  const width = stroke.width ?? 10;
  const simplify = Number.isFinite(Number(stroke.simplify)) ? Number(stroke.simplify) : CT_DEFAULT_SIMPLIFY;
  const centerline = preparePublishStrokePoints(stroke.points, width, { simplify });
  const opacity = stroke.opacity ?? CRAYON_BASE_OPACITY;
  drawWaxyStroke(ctx, centerline, stroke.color, width, opacity, CRAYON_WAXY_SPACING);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   getColor: () => string,
 *   getBrushSize: () => number,
 *   getOpacity: () => number,
 *   getSimplify?: () => number,
 *   getPaintContext?: () => CanvasRenderingContext2D | null,
 *   isActive: () => boolean,
 *   onStrokeCommit?: (stroke: object) => void,
 * }} opts
 */
export function attachCtCrayon(canvas, opts) {
  const target = bindCtPaintTarget(canvas, opts);
  if (!target) {
    return { detach() {}, cancelStroke() {} };
  }
  const { eventCanvas, paintCtx } = target;

  let drawing = false;
  /** @type {{ x: number, y: number }[]} */
  let points = [];
  /** @type {ImageData | null} */
  let baseImage = null;

  function width() {
    return brushSizeFromSlider(opts.getBrushSize());
  }

  function opacity() {
    return CRAYON_BASE_OPACITY * opacityFromSlider(opts.getOpacity());
  }

  function simplifyAmt() {
    return opts.getSimplify?.() ?? CT_DEFAULT_SIMPLIFY;
  }

  function liveStroke() {
    return {
      points,
      color: opts.getColor(),
      width: width(),
      opacity: opacity(),
      simplify: simplifyAmt(),
      livePreview: true,
    };
  }

  function paintLive() {
    const ctx = paintCtx();
    if (!ctx || !baseImage || points.length < 2) return;
    ctx.putImageData(baseImage, 0, 0);
    renderCrayonStroke(ctx, liveStroke());
  }

  function onDown(e) {
    if (!opts.isActive() || e.button !== 0) return;
    const ctx = paintCtx();
    if (!ctx) return;
    drawing = true;
    points = [];
    baseImage = ctx.getImageData(0, 0, ctx.canvas.width, ctx.canvas.height);
    eventCanvas.setPointerCapture(e.pointerId);
    points.push(canvasStagePoint(eventCanvas, e));
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
      points.push(p);
    }
    paintLive();
    e.preventDefault();
  }

  function paintCommitted(stroke) {
    const ctx = paintCtx();
    if (!ctx || !baseImage) return;
    ctx.putImageData(baseImage, 0, 0);
    renderCrayonStroke(ctx, stroke);
  }

  function onUp(e) {
    if (!drawing) return;
    drawing = false;
    if (points.length >= 2 && isSubstantialStroke(points) && opts.onStrokeCommit) {
      const saved = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        tool: 'crayon',
        points: [...points],
        color: opts.getColor(),
        width: width(),
        opacity: opacity(),
        simplify: simplifyAmt(),
      };
      paintCommitted(saved);
      opts.onStrokeCommit(saved);
    } else if (baseImage) {
      const ctx = paintCtx();
      if (ctx) ctx.putImageData(baseImage, 0, 0);
    }
    points = [];
    baseImage = null;
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
    },
    detach() {
      eventCanvas.removeEventListener('pointerdown', onDown);
      eventCanvas.removeEventListener('pointermove', onMove);
      eventCanvas.removeEventListener('pointerup', onUp);
      eventCanvas.removeEventListener('pointercancel', onUp);
    },
  };
}
