/** Color Time! — Pastel (Studio softy waxy port). */

import { canvasStagePoint } from './ct-canvas.mjs';
import { drawWaxyStroke } from './draw/ct-waxy-stroke.mjs';
import { brushSizeFromSlider, opacityFromSlider } from './ct-draw-pencil.mjs';
import { bindCtPaintTarget } from './ct-draw-paint-target.mjs';
import { isSubstantialStroke } from './draw/ct-stroke-commit.mjs';
import { CT_DEFAULT_SIMPLIFY, preparePublishStrokePoints } from './draw/ct-stroke-hud-runtime.mjs';

/** @typedef {'chalky'|'oily'|'softy'} PastelMode */

const PASTEL_SPACING = { chalky: 0.85, oily: 0.275, softy: 0.55 };
const PASTEL_DEFAULTS = {
  chalky: { width: 22, opacity: 0.78, spacing: PASTEL_SPACING.chalky },
  oily: { width: 22, opacity: 0.55, spacing: PASTEL_SPACING.oily },
  softy: { width: 22, opacity: 0.7, spacing: PASTEL_SPACING.softy },
};

/** @param {PastelMode} mode */
function paramsForMode(mode) {
  return PASTEL_DEFAULTS[mode] ?? PASTEL_DEFAULTS.softy;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ points: { x: number, y: number }[], color: string, width?: number, opacity?: number, pastelMode?: PastelMode }} stroke
 */
export function renderPastelStroke(ctx, stroke) {
  if (!stroke.points || stroke.points.length < 2) return;
  const mode = stroke.pastelMode ?? 'softy';
  const base = paramsForMode(mode);
  const width = stroke.width ?? base.width;
  const simplify = Number.isFinite(Number(stroke.simplify)) ? Number(stroke.simplify) : CT_DEFAULT_SIMPLIFY;
  const centerline = preparePublishStrokePoints(stroke.points, width, { simplify });
  const opacity = stroke.opacity ?? base.opacity;
  drawWaxyStroke(ctx, centerline, stroke.color, width, opacity, base.spacing);
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   getColor: () => string,
 *   getBrushSize: () => number,
 *   getOpacity: () => number,
 *   getPastelMode?: () => PastelMode,
 *   getSimplify?: () => number,
 *   getPaintContext?: () => CanvasRenderingContext2D | null,
 *   isActive: () => boolean,
 *   onStrokeCommit?: (stroke: object) => void,
 * }} opts
 */
export function attachCtPastel(canvas, opts) {
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

  function modeParams() {
    const base = paramsForMode(opts.getPastelMode?.() ?? 'softy');
    const hudW = brushSizeFromSlider(opts.getBrushSize());
    return { ...base, width: Math.max(base.width, hudW) };
  }

  function opacity() {
    const { opacity: baseOp } = modeParams();
    return baseOp * opacityFromSlider(opts.getOpacity());
  }

  function simplifyAmt() {
    return opts.getSimplify?.() ?? CT_DEFAULT_SIMPLIFY;
  }

  function liveStroke() {
    const { width } = modeParams();
    return {
      points,
      color: opts.getColor(),
      width,
      opacity: opacity(),
      pastelMode: opts.getPastelMode?.() ?? 'softy',
      simplify: simplifyAmt(),
      livePreview: true,
    };
  }

  function paintLive() {
    const ctx = paintCtx();
    if (!ctx || !baseImage || points.length < 2) return;
    ctx.putImageData(baseImage, 0, 0);
    renderPastelStroke(ctx, liveStroke());
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
    renderPastelStroke(ctx, stroke);
  }

  function onUp(e) {
    if (!drawing) return;
    drawing = false;
    if (points.length >= 2 && isSubstantialStroke(points) && opts.onStrokeCommit) {
      const { width } = modeParams();
      const saved = {
        id: `stroke-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        tool: 'pastel',
        points: [...points],
        color: opts.getColor(),
        width,
        opacity: opacity(),
        pastelMode: opts.getPastelMode?.() ?? 'softy',
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
