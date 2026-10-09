/** Color Time! — Bucket fill tool (samples active layer only). */

import { CT_CANVAS_SIZE } from './ct-canvas.mjs';
import { floodFillAtComposite } from './draw/ct-flood.mjs';
import { opacityFromSlider } from './ct-draw-pencil.mjs';
import { CT_LAYER_COUNT, buildLayerBucketSampleCanvas } from './ct-layers.mjs';
import { bindCtPaintTarget } from './ct-draw-paint-target.mjs';

/**
 * @param {CanvasRenderingContext2D} writeCtx
 * @param {{ x: number, y: number, color: string, tolerance?: number, opacity?: number }} stroke
 * @param {number} layerIndex 0-based
 */
export function renderBucketFillOnLayer(writeCtx, stroke, layerIndex) {
  const sampleCanvas = buildLayerBucketSampleCanvas(layerIndex);
  const sampleCtx = sampleCanvas.getContext('2d');
  if (!sampleCtx) return;
  floodFillAtComposite(
    sampleCtx,
    writeCtx,
    stroke.x,
    stroke.y,
    stroke.color,
    stroke.tolerance ?? 12,
    stroke.opacity ?? 1,
  );
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{
 *   getColor: () => string,
 *   getOpacity: () => number,
 *   getLayerIndex?: () => number,
 *   getPaintContext?: () => CanvasRenderingContext2D | null,
 *   isActive: () => boolean,
 *   onFillCommit?: (stroke: object) => void,
 * }} opts
 */
export function attachCtBucket(canvas, opts) {
  const target = bindCtPaintTarget(canvas, opts);
  if (!target) {
    return { detach() {} };
  }
  const { eventCanvas, paintCtx } = target;

  function stagePoint(e) {
    const r = eventCanvas.getBoundingClientRect();
    return {
      x: ((e.clientX - r.left) / r.width) * CT_CANVAS_SIZE,
      y: ((e.clientY - r.top) / r.height) * CT_CANVAS_SIZE,
    };
  }

  function onDown(e) {
    if (!opts.isActive() || e.button !== 0) return;
    const ctx = paintCtx();
    if (!ctx) return;
    const p = stagePoint(e);
    const color = opts.getColor();
    const opacity = opacityFromSlider(opts.getOpacity());
    const layerIndex = Number(opts.getLayerIndex?.());
    const idx = Number.isFinite(layerIndex) ? Math.max(0, Math.min(CT_LAYER_COUNT - 1, layerIndex)) : 0;

    /* Floating shapes are objects — fill their fillColor instead of flooding empty layer pixels. */
    const floatFill = { x: p.x, y: p.y, color, layerIndex: idx, handled: false };
    window.dispatchEvent(new CustomEvent('ct-bucket-fill-at', { detail: floatFill }));
    if (floatFill.handled) {
      e.preventDefault();
      return;
    }

    const sampleCanvas = buildLayerBucketSampleCanvas(idx);
    const sampleCtx = sampleCanvas.getContext('2d');
    if (!sampleCtx) return;
    const changed = floodFillAtComposite(sampleCtx, ctx, p.x, p.y, color, 12, opacity);
    if (changed && opts.onFillCommit) {
      opts.onFillCommit({
        id: `fill-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        tool: 'bucket',
        x: p.x,
        y: p.y,
        color,
        opacity,
        tolerance: 12,
        /* Already painted — same as pencil. Replaying flood doubles tablet lag. */
        skipCanvasReplay: true,
      });
    }
    e.preventDefault();
  }

  eventCanvas.addEventListener('pointerdown', onDown);

  return {
    detach() {
      eventCanvas.removeEventListener('pointerdown', onDown);
    },
  };
}
