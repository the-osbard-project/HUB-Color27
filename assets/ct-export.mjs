/** Color Time! — stage flatten (PNG) + project document builder. */

import {
  CT_CANVAS_SIZE,
  CT_CANVAS_W,
  CT_CANVAS_H,
  getCtCanvasPreset,
  getDrawCanvas,
} from './ct-canvas.mjs';
import { canvasColorAt, getBackdropOpacity, getCanvasColorSliderValue, isCanvasBackgroundTransparent } from './ct-canvas-color.mjs';
import { getCtStrokes } from './ct-draw.mjs';
import { getActiveBackpackPage } from './ct-backpack.mjs';
import {
  CT_LAYER_STACK_MAX,
  exportLayerStack,
  getLayerCanvases,
  getLayerStrokeCanvas,
  getLayerFloatCanvas,
  getLayerOpacity,
  getActiveLayerIndex,
  CT_LAYER_COUNT,
} from './ct-layers.mjs';
import { CT_FLOATING_STACK_MAX, exportFloatingStack } from './ct-stage-objects.mjs';

/**
 * CT-native `.oss` — not Studio OSS v2.
 * Layer/floating stacks use extensible `items[]` + `maxLayers` for future CT (e.g. 9 layers).
 */
export const CT_PROJECT_FORMAT = 'color-time';
export const CT_PROJECT_VERSION = 3;

/**
 * Validate + normalize a parsed `.oss` document for load.
 * @param {unknown} raw
 * @returns {Record<string, unknown> & { strokes: unknown[] } | null}
 */
export function parseCtProjectDocument(raw) {
  if (!raw || typeof raw !== 'object') return null;
  const doc = /** @type {Record<string, unknown>} */ (raw);
  const format = doc.format ?? doc.app;
  if (format !== CT_PROJECT_FORMAT) return null;
  return {
    ...doc,
    strokes: Array.isArray(doc.strokes) ? doc.strokes : [],
  };
}

/**
 * Composite visible stage art for export.
 * @param {{ includeBackdrop?: boolean }} [opts] When true, paints the rainbow desk tint first.
 * @returns {HTMLCanvasElement | null}
 */
export function flattenStageCanvas(opts = {}) {
  const includeBackdrop = opts.includeBackdrop === true;
  const off = document.createElement('canvas');
  off.width = CT_CANVAS_W;
  off.height = CT_CANVAS_H;
  const ctx = off.getContext('2d', { alpha: true });
  if (!ctx) return null;

  ctx.clearRect(0, 0, off.width, off.height);

  if (includeBackdrop) {
    const colorValue = getCanvasColorSliderValue();
    if (!isCanvasBackgroundTransparent(colorValue)) {
      const color = canvasColorAt(colorValue);
      if (color && color !== 'transparent') {
        ctx.save();
        ctx.globalAlpha = getBackdropOpacity();
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, off.width, off.height);
        ctx.restore();
      }
    }
  }

  for (let i = CT_LAYER_COUNT - 1; i >= 0; i -= 1) {
    const layer = getLayerCanvases()[i];
    const strokes = getLayerStrokeCanvas(i);
    const floats = getLayerFloatCanvas(i);
    const op = getLayerOpacity(i);
    ctx.save();
    ctx.globalAlpha = op;
    if (layer instanceof HTMLCanvasElement) ctx.drawImage(layer, 0, 0);
    if (strokes instanceof HTMLCanvasElement) ctx.drawImage(strokes, 0, 0);
    if (floats instanceof HTMLCanvasElement) ctx.drawImage(floats, 0, 0);
    ctx.restore();
  }

  const live = getDrawCanvas();
  if (live instanceof HTMLCanvasElement) {
    ctx.save();
    ctx.globalAlpha = getLayerOpacity(getActiveLayerIndex());
    ctx.drawImage(live, 0, 0);
    ctx.restore();
  }

  return off;
}

/**
 * PNG export — art layers + floating only (alpha preserved).
 * Desk rainbow / paper tint is CSS preview and stays out of the flat file;
 * it is still stored on `.oss` as `canvas.backdrop`.
 */
export function exportStagePngBlob() {
  const canvas = flattenStageCanvas({ includeBackdrop: false });
  if (!canvas) return Promise.resolve(null);
  return new Promise((resolve) => {
    canvas.toBlob((blob) => resolve(blob), 'image/png');
  });
}

function canvasBackgroundHex() {
  const v = getCanvasColorSliderValue();
  if (isCanvasBackgroundTransparent(v)) return 'transparent';
  return canvasColorAt(v);
}

/** @param {string} [title] */
export function buildCtProjectDocument(title) {
  const page = getActiveBackpackPage();
  const safeTitle = String(title || 'Untitled').trim() || 'Untitled';
  return {
    format: CT_PROJECT_FORMAT,
    version: CT_PROJECT_VERSION,
    app: CT_PROJECT_FORMAT,
    title: safeTitle,
    savedAt: new Date().toISOString(),
    canvas: {
      size: CT_CANVAS_SIZE,
      w: CT_CANVAS_W,
      h: CT_CANVAS_H,
      preset: getCtCanvasPreset(),
      printCanvas: false,
      /** Desk backdrop tint — preview + `.oss` only; not baked into flat PNG. */
      backdrop: canvasBackgroundHex(),
      colorValue: getCanvasColorSliderValue(),
      backdropOpacity: getBackdropOpacity(),
    },
    page: page ?? undefined,
    layers: exportLayerStack(),
    strokes: getCtStrokes(),
    floating: exportFloatingStack(),
    capabilities: {
      maxLayers: CT_LAYER_STACK_MAX,
      maxFloatingLayers: CT_FLOATING_STACK_MAX,
    },
  };
}

/** @param {string} [title] */
export function buildCtProjectBlob(title) {
  return new Blob([JSON.stringify(buildCtProjectDocument(title), null, 2)], {
    type: 'application/json',
  });
}
