/** Color Time! — 5 movable layers (top rail tile = top on stage: L1 top, L5 bottom). */

import { CT_CANVAS_SIZE, CT_CANVAS_W, CT_CANVAS_H } from './ct-canvas.mjs';
import { drawShapeElement } from './shapes/shape-paint.mjs';
import { clearStrokesForLayer, getCtStrokes } from './ct-draw.mjs';

function requestHistoryCheckpoint() {
  window.dispatchEvent(new Event('ct-history-checkpoint'));
}

export const CT_LAYER_COUNT = 5;

/** @returns {(null)[]} */
function emptyRasterSrc() {
  return Array.from({ length: CT_LAYER_COUNT }, () => null);
}

/** @returns {object[][]} */
function emptyShapeLists() {
  return Array.from({ length: CT_LAYER_COUNT }, () => []);
}

/** @returns {number[]} */
function fullOpacityList() {
  return Array.from({ length: CT_LAYER_COUNT }, () => 1);
}

/** Reserved for `.oss` stack metadata — future CT may mount up to this many layers. */
export const CT_LAYER_STACK_MAX = 9;

export const CT_LAYER_STACK_SCHEMA = 1;

/** 0-based legacy default for backpack helpers that still hard-code a layer. Prefer active layer. */
export const CT_BACKPACK_LAYER_INDEX = 0;

/** @deprecated use CT_BACKPACK_LAYER_INDEX */
export const CT_LINE_ART_LAYER_INDEX = CT_BACKPACK_LAYER_INDEX;

/** @type {HTMLCanvasElement[]} */
let layerCanvases = [];

/** @type {HTMLCanvasElement[]} */
let layerStrokeCanvases = [];

/** @type {HTMLCanvasElement[]} floating imports / arrange objects (between strokes and next layer) */
let layerFloatCanvases = [];

/** @type {(string | null)[]} raster src per layer (backpack line art) */
let layerRasterSrc = emptyRasterSrc();

/** @type {object[][]} */
let layerShapes = emptyShapeLists();

/** @type {number[]} 0–1 opacity per paint layer (CSS + export) */
let layerOpacity = fullOpacityList();

/** @type {((ctx: CanvasRenderingContext2D, layerIndex: number, scaleX: number, scaleY: number) => void) | null} */
let floatingThumbPainter = null;
/** @type {((layerIndex: number) => boolean) | null} */
let floatingThumbHasContent = null;
/**
 * Optional: paint only flood/wand barriers for a layer (strokes · images — not fillable shapes).
 * @type {((ctx: CanvasRenderingContext2D, layerIndex: number) => void) | null}
 */
let floodBarrierPainter = null;

/** @type {number} 0 = Layer 1 */
let activeLayerIndex = 0;

/** @returns {HTMLCanvasElement[]} */
export function getLayerCanvases() {
  return layerCanvases;
}

/** @param {number} index 0-based */
export function getLayerStrokeCanvas(index) {
  return layerStrokeCanvases[index] ?? null;
}

/** @param {number} index 0-based */
export function getLayerFloatCanvas(index) {
  return layerFloatCanvases[index] ?? null;
}

/** @param {number} index 0-based */
export function getLayerFloatContext(index) {
  return layerFloatCanvases[index]?.getContext('2d') ?? null;
}

/** @param {number} index 0-based */
export function getLayerStrokeContext(index) {
  return layerStrokeCanvases[index]?.getContext('2d') ?? null;
}

export function clearAllLayerStrokeSurfaces() {
  for (const canvas of layerStrokeCanvases) {
    const ctx = canvas?.getContext('2d');
    if (!ctx || !canvas) continue;
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
}

/** @param {number} index 0-based */
export function getLayerCanvas(index) {
  return layerCanvases[index] ?? null;
}

/** @param {number} index 0-based */
export function getLayerContext(index) {
  return layerCanvases[index]?.getContext('2d') ?? null;
}

export function getActiveLayerIndex() {
  return activeLayerIndex;
}

/** @param {number} index 0-based @returns {number} 0–1 */
export function getLayerOpacity(index) {
  const v = layerOpacity[index];
  return Number.isFinite(v) ? Math.max(0, Math.min(1, v)) : 1;
}

/** @param {number} index 0-based */
function applyLayerOpacityCss(index) {
  const op = String(getLayerOpacity(index));
  const layer = layerCanvases[index];
  const strokes = layerStrokeCanvases[index];
  const floats = layerFloatCanvases[index];
  if (layer) layer.style.opacity = op;
  if (strokes) strokes.style.opacity = op;
  if (floats) floats.style.opacity = op;
}

/**
 * @param {number} index 0-based
 * @param {number} opacity 0–1
 * @param {{ skipEvent?: boolean }} [opts]
 */
export function setLayerOpacity(index, opacity, opts = {}) {
  if (index < 0 || index >= CT_LAYER_COUNT) return;
  const next = Math.max(0, Math.min(1, Number(opacity)));
  if (!Number.isFinite(next)) return;
  if (Math.abs(getLayerOpacity(index) - next) < 0.0005) {
    applyLayerOpacityCss(index);
    return;
  }
  layerOpacity[index] = next;
  applyLayerOpacityCss(index);
  if (!opts.skipEvent) {
    window.dispatchEvent(new CustomEvent('ct-layer-opacity-changed', { detail: { index, opacity: next } }));
  }
}

export function resetAllLayerOpacities() {
  for (let i = 0; i < CT_LAYER_COUNT; i += 1) {
    layerOpacity[i] = 1;
    applyLayerOpacityCss(i);
  }
}

/** @param {number} index 0-based */
export function setActiveLayerIndex(index) {
  const next = Math.max(0, Math.min(CT_LAYER_COUNT - 1, index));
  if (next === activeLayerIndex) return;
  activeLayerIndex = next;
  syncLayerTileUi();
  window.dispatchEvent(new CustomEvent('ct-active-layer-changed', { detail: { index: next } }));
}

/** @param {HTMLElement} mount @param {number | { w: number, h: number }} [size] */
export function mountCtLayers(mount, size = CT_CANVAS_SIZE) {
  const w = typeof size === 'object' && size ? size.w : size;
  const h = typeof size === 'object' && size ? size.h : size;
  layerCanvases = [];
  layerStrokeCanvases = [];
  layerFloatCanvases = [];
  layerRasterSrc = emptyRasterSrc();
  layerShapes = emptyShapeLists();
  layerOpacity = fullOpacityList();
  activeLayerIndex = 0;

  for (let i = 0; i < CT_LAYER_COUNT; i++) {
    const canvas = document.createElement('canvas');
    canvas.className = 'ct-layer-canvas';
    canvas.dataset.layer = String(i + 1);
    canvas.width = w;
    canvas.height = h;
    canvas.setAttribute('aria-hidden', 'true');
    mount.appendChild(canvas);
    layerCanvases.push(canvas);

    const strokeCanvas = document.createElement('canvas');
    strokeCanvas.className = 'ct-layer-stroke-canvas';
    strokeCanvas.dataset.layer = String(i + 1);
    strokeCanvas.width = w;
    strokeCanvas.height = h;
    strokeCanvas.setAttribute('aria-hidden', 'true');
    mount.appendChild(strokeCanvas);
    layerStrokeCanvases.push(strokeCanvas);

    const floatCanvas = document.createElement('canvas');
    floatCanvas.className = 'ct-layer-float-canvas';
    floatCanvas.dataset.layer = String(i + 1);
    floatCanvas.width = w;
    floatCanvas.height = h;
    floatCanvas.setAttribute('aria-hidden', 'true');
    mount.appendChild(floatCanvas);
    layerFloatCanvases.push(floatCanvas);

    applyLayerOpacityCss(i);
  }
  syncLayerTileUi();
}

function syncLayerTileUi() {
  document.querySelectorAll('.ct-layer-tile[data-layer]').forEach((btn) => {
    const el = /** @type {HTMLElement} */ (btn);
    const layerNum = Number(el.dataset.layer);
    el.classList.toggle('is-active', layerNum === activeLayerIndex + 1);
    el.setAttribute('aria-pressed', layerNum === activeLayerIndex + 1 ? 'true' : 'false');
  });
  layerCanvases.forEach((canvas, i) => {
    canvas.classList.toggle('is-active', i === activeLayerIndex);
  });
  refreshLayerTilePreviews();
}

/** Raster or vector on layer canvas (not draw strokes). */
function layerHasRasterOrShapes(index) {
  const canvas = layerCanvases[index];
  if (!canvas) return false;
  if (layerShapes[index]?.length) return true;
  if (layerRasterSrc[index]) return true;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) return true;
  }
  return false;
}

/** Any painted pixels on the layer stroke surface (fills, brush, marker, etc.). */
function layerStrokeCanvasHasPixels(index) {
  const canvas = layerStrokeCanvases[index];
  if (!canvas) return false;
  const ctx = canvas.getContext('2d');
  if (!ctx) return false;
  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) return true;
  }
  return false;
}

/** Paint mini previews on q300 layer tiles (raster + strokes + floating imports). */
export function refreshLayerTilePreviews() {
  document.querySelectorAll('.ct-layer-tile[data-layer]').forEach((btn) => {
    const layerNum = Number(btn.getAttribute('data-layer'));
    const index = layerNum - 1;
    const thumb = btn.querySelector('.ct-layer-tile__thumb');
    const srcCanvas = layerCanvases[index];
    const strokeCanvas = layerStrokeCanvases[index];
    if (!(thumb instanceof HTMLCanvasElement) || !(srcCanvas instanceof HTMLCanvasElement)) return;
    const ctx = thumb.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, thumb.width, thumb.height);
    const hasLayer = layerHasRasterOrShapes(index);
    const hasStrokes = layerStrokeCanvasHasPixels(index);
    const hasFloating = floatingThumbHasContent?.(index) === true;
    const op = getLayerOpacity(index);
    ctx.save();
    ctx.globalAlpha = op;
    if (hasLayer || hasStrokes) {
      ctx.drawImage(srcCanvas, 0, 0, thumb.width, thumb.height);
      if (strokeCanvas instanceof HTMLCanvasElement && hasStrokes) {
        ctx.drawImage(strokeCanvas, 0, 0, thumb.width, thumb.height);
      }
    }
    if (hasFloating && floatingThumbPainter) {
      const scaleX = thumb.width / Math.max(1, srcCanvas.width);
      const scaleY = thumb.height / Math.max(1, srcCanvas.height);
      floatingThumbPainter(ctx, index, scaleX, scaleY);
    }
    ctx.restore();
    btn.classList.toggle('ct-layer-tile--empty', !hasLayer && !hasStrokes && !hasFloating);
  });
}

/**
 * Stage-objects registers painters so thumbs can show floating imports without a circular import.
 * @param {(ctx: CanvasRenderingContext2D, layerIndex: number, scaleX: number, scaleY: number) => void} painter
 * @param {(layerIndex: number) => boolean} hasContent
 */
export function registerFloatingLayerThumbHooks(painter, hasContent) {
  floatingThumbPainter = painter;
  floatingThumbHasContent = hasContent;
}

/**
 * Flood/wand sample barriers — stroke ink + images, not click-to-fill shapes.
 * @param {(ctx: CanvasRenderingContext2D, layerIndex: number) => void} painter
 */
export function registerFloodBarrierPainter(painter) {
  floodBarrierPainter = painter;
}

/** @param {number} index 0-based */
export function layerHasContent(index) {
  return layerHasRasterOrShapes(index) || layerStrokeCanvasHasPixels(index);
}

/** @param {number} startIndex 0-based — search upward (toward Layer 1) for an empty slot. */
export function findNextEmptyLayerAbove(startIndex) {
  for (let i = startIndex - 1; i >= 0; i--) {
    if (!layerHasContent(i)) return i;
  }
  return null;
}

/** @param {number} startIndex 0-based — search downward (toward last layer) for an empty slot. */
export function findNextEmptyLayerBelow(startIndex) {
  for (let i = startIndex + 1; i < CT_LAYER_COUNT; i++) {
    if (!layerHasContent(i)) return i;
  }
  return null;
}

/** @param {number} index 0-based */
export function getLayerShapeElements(index) {
  return layerShapes[index] ?? [];
}

/** @param {number} index 0-based @param {object[]} elements */
export function setLayerShapeElements(index, elements) {
  layerShapes[index] = [...elements];
  redrawLayer(index);
}

/** @param {number} index 0-based @param {object} el @param {{ skipHistory?: boolean }} [opts] */
export function commitShapeToLayer(index, el, { skipHistory = false } = {}) {
  if (!skipHistory) requestHistoryCheckpoint();
  layerShapes[index].push(el);
  redrawLayer(index);
  window.dispatchEvent(new CustomEvent('ct-shape-commit', { detail: { layerIndex: index, element: el } }));
}

/** @param {number} index 0-based @param {{ skipHistory?: boolean }} [opts] */
export function clearLayer(index, { skipHistory = false } = {}) {
  if (!skipHistory) requestHistoryCheckpoint();
  layerRasterSrc[index] = null;
  layerShapes[index] = [];
  clearStrokesForLayer(index);
  const ctx = getLayerContext(index);
  const canvas = layerCanvases[index];
  if (ctx && canvas) {
    ctx.save();
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.restore();
  }
  window.dispatchEvent(new CustomEvent('ct-layer-cleared', { detail: { index } }));
  refreshLayerTilePreviews();
}

export function clearAllLayers() {
  for (let i = 0; i < CT_LAYER_COUNT; i++) clearLayer(i, { skipHistory: true });
  resetAllLayerOpacities();
}

/**
 * @param {{ naturalWidth: number, naturalHeight: number }} img
 * @param {number} canvasSize
 * @param {'stretch' | 'contain' | 'actual'} mode
 * @returns {{ left: number, top: number, w: number, h: number }}
 */
/**
 * @param {{ naturalWidth: number, naturalHeight: number }} img
 * @param {number | { w: number, h: number }} canvasSize
 * @param {'stretch' | 'contain' | 'actual'} mode
 */
export function computeRasterImportRect(img, canvasSize, mode) {
  const cw = typeof canvasSize === 'object' ? canvasSize.w : canvasSize;
  const ch = typeof canvasSize === 'object' ? canvasSize.h : canvasSize;
  const nw = Math.max(1, img.naturalWidth || 1);
  const nh = Math.max(1, img.naturalHeight || 1);
  if (mode === 'stretch') {
    return { left: 0, top: 0, w: cw, h: ch };
  }
  if (mode === 'contain') {
    const scale = Math.min(cw / nw, ch / nh);
    const w = nw * scale;
    const h = nh * scale;
    return { left: (cw - w) / 2, top: (ch - h) / 2, w, h };
  }
  return {
    left: Math.round((cw - nw) / 2),
    top: Math.round((ch - nh) / 2),
    w: nw,
    h: nh,
  };
}

/**
 * Resolve fit mode for an import (may prompt when `fit === 'ask'` and art is larger than canvas).
 * @param {{ naturalWidth: number, naturalHeight: number }} img
 * @param {number | { w: number, h: number }} canvasSize
 * @param {'stretch' | 'contain' | 'actual' | 'ask'} fit
 * @returns {Promise<'stretch' | 'contain' | 'actual' | null>} null = cancelled
 */
export async function resolveRasterImportFit(img, canvasSize, fit) {
  if (fit === 'stretch' || fit === 'contain' || fit === 'actual') return fit;
  const cw = typeof canvasSize === 'object' ? canvasSize.w : canvasSize;
  const ch = typeof canvasSize === 'object' ? canvasSize.h : canvasSize;
  const larger = img.naturalWidth > cw || img.naturalHeight > ch;
  if (!larger) return 'actual';
  const choice = await chooseRasterImportFitDialog();
  if (choice === 'cancel') return null;
  return choice;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {CanvasImageSource & { naturalWidth: number, naturalHeight: number }} img
 * @param {number | { w: number, h: number }} canvasSize
 * @param {'stretch' | 'contain' | 'actual'} mode
 */
function drawRasterWithFit(ctx, img, canvasSize, mode) {
  const rect = computeRasterImportRect(img, canvasSize, mode);
  ctx.drawImage(img, rect.left, rect.top, rect.w, rect.h);
}

/**
 * When art is larger than the canvas: shrink to fit, place full size (may clip), or cancel.
 * @returns {Promise<'contain' | 'actual' | 'cancel'>}
 */
export function chooseRasterImportFitDialog() {
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'dd-dialog';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'ct-import-fit-title');

    const panel = document.createElement('div');
    panel.className = 'dd-dialog__panel';

    const title = document.createElement('p');
    title.id = 'ct-import-fit-title';
    title.className = 'dd-dialog__title';
    title.textContent = 'Import art';

    const detail = document.createElement('p');
    detail.className = 'dd-dialog__detail';
    detail.textContent = 'Shrink to fit art or full size art? (Full size art may be clipped.)';

    const actions = document.createElement('div');
    actions.className = 'dd-dialog__actions';

    function close(result) {
      overlay.remove();
      document.removeEventListener('keydown', onKeyDown);
      resolve(result);
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close('cancel');
      }
    }

    const shrinkBtn = document.createElement('button');
    shrinkBtn.type = 'button';
    shrinkBtn.className = 'dd-dialog__btn dd-dialog__btn--primary';
    shrinkBtn.textContent = 'Shrink to fit';
    shrinkBtn.addEventListener('click', () => close('contain'));

    const fullBtn = document.createElement('button');
    fullBtn.type = 'button';
    fullBtn.className = 'dd-dialog__btn';
    fullBtn.textContent = 'Full size';
    fullBtn.addEventListener('click', () => close('actual'));

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'dd-dialog__btn dd-dialog__btn--ghost';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => close('cancel'));

    actions.append(shrinkBtn, fullBtn, cancelBtn);
    panel.append(title, detail, actions);
    overlay.appendChild(panel);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close('cancel');
    });
    document.addEventListener('keydown', onKeyDown);
    document.body.appendChild(overlay);
    shrinkBtn.focus();
  });
}

/**
 * @param {number} index 0-based
 * @param {string} src
 * @param {number} [size]
 * @param {{ skipHistory?: boolean, fit?: 'stretch' | 'contain' | 'actual' | 'ask', preserveShapes?: boolean, preserveStrokes?: boolean }} [opts]
 *   stretch — fill canvas (backpack / legacy). contain — uniform shrink-to-fit.
 *   actual — 1:1 pixels centered (may clip). ask — prompt when larger than canvas.
 * @returns {Promise<boolean>} false if user cancelled the fit dialog
 */
export function loadRasterToLayer(index, src, size = CT_CANVAS_SIZE, opts = {}) {
  const {
    skipHistory = false,
    fit = 'stretch',
    preserveShapes = false,
    preserveStrokes = false,
  } = opts;
  return new Promise((resolve, reject) => {
    const ctx = getLayerContext(index);
    const canvas = layerCanvases[index];
    if (!ctx || !canvas) {
      reject(new Error('Layer canvas not ready'));
      return;
    }
    const drawSize = { w: canvas.width || CT_CANVAS_W, h: canvas.height || CT_CANVAS_H };
    void size;
    const img = new Image();
    img.onload = async () => {
      const mode = await resolveRasterImportFit(img, drawSize, fit);
      if (!mode) {
        resolve(false);
        return;
      }

      if (!skipHistory) requestHistoryCheckpoint();
      if (!preserveShapes) layerShapes[index] = [];
      if (!preserveStrokes) clearStrokesForLayer(index);

      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      drawRasterWithFit(ctx, img, drawSize, mode);
      ctx.restore();

      if (mode === 'stretch') {
        layerRasterSrc[index] = src;
      } else {
        syncLayerRasterSrcFromCanvas(index);
      }
      paintLayerShapes(index);
      refreshLayerTilePreviews();
      resolve(true);
    };
    img.onerror = () => reject(new Error(`Could not load layer image: ${src}`));
    img.src = src;
  });
}

/** @param {number} index 0-based */
function paintLayerShapes(index) {
  const ctx = getLayerContext(index);
  if (!ctx) return;
  for (const el of layerShapes[index]) {
    drawShapeElement(ctx, el);
  }
}

/** Redraw raster + vector shapes on one layer. */
export function redrawLayer(index) {
  const canvas = layerCanvases[index];
  const ctx = getLayerContext(index);
  if (!ctx || !canvas) return;

  const src = layerRasterSrc[index];
  const finish = () => {
    paintLayerShapes(index);
    refreshLayerTilePreviews();
  };

  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  if (src) {
    const img = new Image();
    img.src = src;
    if (img.complete && img.naturalWidth) {
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      finish();
      return;
    }
    ctx.restore();
    img.onload = () => {
      ctx.save();
      ctx.setTransform(1, 0, 0, 1, 0, 0);
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      ctx.restore();
      finish();
    };
    return;
  }

  ctx.restore();
  finish();
}

export function redrawAllLayers() {
  for (let i = 0; i < CT_LAYER_COUNT; i++) redrawLayer(i);
}

/**
 * Build bucket/wand sample for one layer only (raster + strokes + flood barriers).
 * Fillable shapes (square/circle/…) are omitted — click-to-fill changes their fillColor;
 * including them made object silhouettes punch holes in layer floods.
 * Does not include backdrop or content from other layers.
 * Reuses one offscreen canvas — allocating a full-size canvas per tap is costly on tablets.
 * @param {number} layerIndex 0-based
 */
let bucketSampleCanvas = /** @type {HTMLCanvasElement | null} */ (null);

export function buildLayerBucketSampleCanvas(layerIndex) {
  const w = CT_CANVAS_W;
  const h = CT_CANVAS_H;
  if (!bucketSampleCanvas || bucketSampleCanvas.width !== w || bucketSampleCanvas.height !== h) {
    bucketSampleCanvas = document.createElement('canvas');
    bucketSampleCanvas.width = w;
    bucketSampleCanvas.height = h;
  }
  const off = bucketSampleCanvas;
  const ctx = off.getContext('2d', { willReadFrequently: true });
  if (!ctx) return off;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.clearRect(0, 0, w, h);
  const idx = Math.max(0, Math.min(CT_LAYER_COUNT - 1, layerIndex));
  const layer = layerCanvases[idx];
  if (layer) ctx.drawImage(layer, 0, 0);
  const strokes = layerStrokeCanvases[idx];
  if (strokes) ctx.drawImage(strokes, 0, 0);
  if (floodBarrierPainter) {
    floodBarrierPainter(ctx, idx);
  } else {
    const floats = layerFloatCanvases[idx];
    if (floats) ctx.drawImage(floats, 0, 0);
  }
  return off;
}

/** Persist raster canvas pixels into layerRasterSrc after a pixel edit (e.g. wand). */
export function syncLayerRasterSrcFromCanvas(index) {
  const canvas = layerCanvases[index];
  if (!canvas) return;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;

  const { data } = ctx.getImageData(0, 0, canvas.width, canvas.height);
  let hasPixels = false;
  for (let i = 3; i < data.length; i += 4) {
    if (data[i] > 0) {
      hasPixels = true;
      break;
    }
  }

  if (hasPixels) {
    layerRasterSrc[index] = canvas.toDataURL('image/png');
    return;
  }
  if (!layerShapes[index]?.length) {
    layerRasterSrc[index] = null;
  }
}

/** Bake remaining stroke pixels onto raster and drop vector strokes after wand clear. */
export function finalizeLayerAfterWandClear(layerIndex) {
  const idx = Math.max(0, Math.min(CT_LAYER_COUNT - 1, layerIndex));
  const rasterCtx = getLayerContext(idx);
  const strokeCanvas = layerStrokeCanvases[idx];
  const strokeCtx = strokeCanvas?.getContext('2d') ?? null;

  if (rasterCtx && strokeCanvas && strokeCtx && layerStrokeCanvasHasPixels(idx)) {
    rasterCtx.drawImage(strokeCanvas, 0, 0);
    strokeCtx.clearRect(0, 0, strokeCanvas.width, strokeCanvas.height);
    clearStrokesForLayer(idx);
  }

  syncLayerRasterSrcFromCanvas(idx);
}

/** @returns {{ rasterSrc: (string|null)[], shapes: object[][], opacity: number[], activeLayer: number }} */
export function exportLayerState() {
  return {
    rasterSrc: [...layerRasterSrc],
    shapes: layerShapes.map((s) => structuredClone(s)),
    opacity: Array.from({ length: CT_LAYER_COUNT }, (_, i) => getLayerOpacity(i)),
    activeLayer: activeLayerIndex,
  };
}

/**
 * Layer stack for `.oss` — extensible `items[]` (future CT may save up to {@link CT_LAYER_STACK_MAX}).
 * @returns {{ schema: number, count: number, maxLayers: number, activeLayer: number, items: { rasterSrc: string|null, shapes: object[], opacity: number }[] }}
 */
export function exportLayerStack() {
  return {
    schema: CT_LAYER_STACK_SCHEMA,
    count: CT_LAYER_COUNT,
    maxLayers: CT_LAYER_STACK_MAX,
    activeLayer: activeLayerIndex,
    items: layerRasterSrc.map((rasterSrc, i) => ({
      rasterSrc,
      shapes: structuredClone(layerShapes[i] ?? []),
      opacity: getLayerOpacity(i),
    })),
  };
}

/**
 * @param {unknown} state
 * @returns {{ rasterSrc: (string|null)[], shapes: object[][], opacity: number[], activeLayer: number } | null}
 */
export function normalizeLayerStack(state) {
  if (!state || typeof state !== 'object') return null;
  const raw = /** @type {Record<string, unknown>} */ (state);
  if (raw.schema != null && Array.isArray(raw.items)) {
    const items = /** @type {{ rasterSrc?: string|null, shapes?: object[], opacity?: number }[]} */ (raw.items);
    return {
      rasterSrc: items.map((item) => item?.rasterSrc ?? null),
      shapes: items.map((item) => (Array.isArray(item?.shapes) ? structuredClone(item.shapes) : [])),
      opacity: items.map((item) => {
        const o = Number(item?.opacity);
        return Number.isFinite(o) ? Math.max(0, Math.min(1, o)) : 1;
      }),
      activeLayer: typeof raw.activeLayer === 'number' ? raw.activeLayer : 0,
    };
  }
  if (Array.isArray(raw.rasterSrc) || Array.isArray(raw.shapes) || Array.isArray(raw.opacity)) {
    const ops = Array.isArray(raw.opacity) ? raw.opacity : [];
    return {
      rasterSrc: Array.isArray(raw.rasterSrc) ? [...raw.rasterSrc] : [],
      shapes: Array.isArray(raw.shapes) ? raw.shapes.map((s) => structuredClone(s)) : [],
      opacity: Array.from({ length: CT_LAYER_COUNT }, (_, i) => {
        const o = Number(ops[i]);
        return Number.isFinite(o) ? Math.max(0, Math.min(1, o)) : 1;
      }),
      activeLayer: typeof raw.activeLayer === 'number' ? raw.activeLayer : 0,
    };
  }
  return null;
}

/** @param {unknown} state @param {{ skipHistory?: boolean }} [opts] */
export async function restoreLayerStack(state, opts = {}) {
  const normalized = normalizeLayerStack(state);
  if (!normalized) return;
  await restoreLayerVisualState(normalized, opts);
}

/** @param {{ rasterSrc?: (string|null)[], shapes?: object[][], opacity?: number[], activeLayer?: number } | null | undefined} state @param {{ skipHistory?: boolean }} [opts] */
export async function restoreLayerVisualState(state, opts = {}) {
  if (!state) return;
  const { skipHistory = false } = opts;
  const srcs = state.rasterSrc ?? [];
  const shapes = state.shapes ?? [];
  const ops = state.opacity ?? [];
  for (let i = 0; i < CT_LAYER_COUNT; i++) {
    layerShapes[i] = Array.isArray(shapes[i]) ? structuredClone(shapes[i]) : [];
    layerRasterSrc[i] = srcs[i] ?? null;
    const o = Number(ops[i]);
    layerOpacity[i] = Number.isFinite(o) ? Math.max(0, Math.min(1, o)) : 1;
    applyLayerOpacityCss(i);
    if (srcs[i]) {
      try {
        await loadRasterToLayer(i, srcs[i], CT_CANVAS_SIZE, {
          skipHistory,
          preserveShapes: true,
          preserveStrokes: true,
        });
      } catch {
        layerRasterSrc[i] = null;
        redrawLayer(i);
      }
    } else {
      redrawLayer(i);
    }
  }
  if (typeof state.activeLayer === 'number') {
    activeLayerIndex = Math.max(0, Math.min(CT_LAYER_COUNT - 1, state.activeLayer));
    syncLayerTileUi();
  } else {
    refreshLayerTilePreviews();
  }
}

/** @param {{ rasterSrc?: (string|null)[], shapes?: object[][], activeLayer?: number } | null | undefined} state */
export async function restoreLayerState(state) {
  clearAllLayers();
  if (!state) return;
  await restoreLayerVisualState(state);
}

/**
 * Swap all layer content between two indices (stack reorder via adjacent swap).
 * @param {number} i 0-based
 * @param {number} j 0-based
 * @param {{ skipHistory?: boolean }} [opts]
 */
export function swapLayerContent(i, j, opts = {}) {
  if (i === j || i < 0 || j < 0 || i >= CT_LAYER_COUNT || j >= CT_LAYER_COUNT) return;
  if (!opts.skipHistory) requestHistoryCheckpoint();
  window.dispatchEvent(new CustomEvent('ct-pre-layer-swap', { detail: { i, j } }));

  [layerRasterSrc[i], layerRasterSrc[j]] = [layerRasterSrc[j], layerRasterSrc[i]];
  [layerShapes[i], layerShapes[j]] = [layerShapes[j], layerShapes[i]];
  [layerOpacity[i], layerOpacity[j]] = [layerOpacity[j], layerOpacity[i]];
  applyLayerOpacityCss(i);
  applyLayerOpacityCss(j);

  for (const stroke of getCtStrokes()) {
    if (strokeLayerIndex(stroke) === i) stroke.layerIndex = j;
    else if (strokeLayerIndex(stroke) === j) stroke.layerIndex = i;
  }

  if (activeLayerIndex === i) activeLayerIndex = j;
  else if (activeLayerIndex === j) activeLayerIndex = i;

  redrawLayer(i);
  redrawLayer(j);
  window.dispatchEvent(new CustomEvent('ct-refresh-baked-strokes', { detail: { layerIndex: i } }));
  window.dispatchEvent(new CustomEvent('ct-refresh-baked-strokes', { detail: { layerIndex: j } }));
  syncLayerTileUi();
  window.dispatchEvent(new CustomEvent('ct-layer-order-changed', { detail: { i, j } }));
}

/** @param {number} stroke */
function strokeLayerIndex(stroke) {
  const n = Number(stroke?.layerIndex);
  return Number.isFinite(n) ? Math.max(0, Math.min(CT_LAYER_COUNT - 1, n)) : 0;
}

/**
 * Move layer content one step toward top (−1) or bottom (+1) of the stack.
 * @param {number} index 0-based
 * @param {-1 | 1} delta
 */
export function moveLayerAdjacent(index, delta) {
  const j = index + delta;
  if (j < 0 || j >= CT_LAYER_COUNT) return;
  swapLayerContent(index, j);
}

/** Move layer content from `from` to `to` (0-based). One history checkpoint. */
export function moveLayerTo(from, to) {
  if (from === to || from < 0 || to < 0 || from >= CT_LAYER_COUNT || to >= CT_LAYER_COUNT) return;
  requestHistoryCheckpoint();
  const step = from < to ? 1 : -1;
  let i = from;
  while (i !== to) {
    swapLayerContent(i, i + step, { skipHistory: true });
    i += step;
  }
}

export function initCtLayerReorder() {
  const track = document.querySelector('.ct-layer-stack-track');
  if (!(track instanceof HTMLElement)) return;

  /** @type {{ from: number, slot: HTMLElement, startX: number, startY: number, horizontal: boolean, dragged: boolean, pointerId: number } | null} */
  let drag = null;

  function trackIsHorizontal() {
    const dir = getComputedStyle(track).flexDirection;
    return dir === 'row' || dir === 'row-reverse';
  }

  function slotFromPoint(x, y) {
    const el = document.elementFromPoint(x, y);
    return el instanceof Element ? el.closest('.ct-layer-slot--reorder') : null;
  }

  function onMove(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const dx = e.clientX - drag.startX;
    const dy = e.clientY - drag.startY;
    const along = drag.horizontal ? dx : dy;
    if (!drag.dragged && Math.abs(along) > 6) {
      drag.dragged = true;
      drag.slot.classList.add('is-dragging');
      try {
        drag.slot.setPointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
    if (drag.dragged) {
      drag.slot.style.transform = drag.horizontal ? `translateX(${dx}px)` : `translateY(${dy}px)`;
    }
  }

  function suppressNextClick(slot) {
    const stop = (ev) => {
      ev.preventDefault();
      ev.stopPropagation();
    };
    slot.addEventListener('click', stop, { capture: true, once: true });
  }

  function onUp(e) {
    if (!drag || e.pointerId !== drag.pointerId) return;
    const { from, slot, dragged } = drag;
    window.removeEventListener('pointermove', onMove);
    window.removeEventListener('pointerup', onUp);
    window.removeEventListener('pointercancel', onUp);
    slot.classList.remove('is-dragging');
    slot.style.transform = '';
    drag = null;
    if (dragged) {
      e.preventDefault();
      suppressNextClick(slot);
      slot.style.pointerEvents = 'none';
      const over = slotFromPoint(e.clientX, e.clientY);
      slot.style.pointerEvents = '';
      const to = over ? Number(over.getAttribute('data-layer')) - 1 : from;
      if (Number.isFinite(to)) moveLayerTo(from, to);
      return;
    }
    setActiveLayerIndex(from);
  }

  track.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    const t = e.target;
    if (!(t instanceof Element) || t.closest('.ct-layer-tile__clear')) return;
    const slot = t.closest('.ct-layer-slot--reorder');
    if (!(slot instanceof HTMLElement) || !track.contains(slot)) return;
    const from = Number(slot.getAttribute('data-layer')) - 1;
    if (!Number.isFinite(from) || from < 0) return;
    drag = {
      from,
      slot,
      startX: e.clientX,
      startY: e.clientY,
      horizontal: trackIsHorizontal(),
      dragged: false,
      pointerId: e.pointerId,
    };
    window.addEventListener('pointermove', onMove);
    window.addEventListener('pointerup', onUp);
    window.addEventListener('pointercancel', onUp);
  });
}

export function initCtLayerTiles() {
  document.querySelectorAll('.ct-layer-tile[data-layer]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const layerNum = Number(btn.getAttribute('data-layer'));
      if (layerNum >= 1 && layerNum <= CT_LAYER_COUNT) {
        setActiveLayerIndex(layerNum - 1);
      }
    });
  });

  document.querySelectorAll('.ct-layer-tile__clear[data-layer]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      e.preventDefault();
      const layerNum = Number(btn.getAttribute('data-layer'));
      if (layerNum >= 1 && layerNum <= CT_LAYER_COUNT) {
        clearLayer(layerNum - 1);
      }
    });
  });

  window.addEventListener('ct-stroke-commit', () => refreshLayerTilePreviews());
  window.addEventListener('ct-active-layer-changed', () => refreshLayerTilePreviews());
  window.addEventListener('ct-floating-placed', () => refreshLayerTilePreviews());
  window.addEventListener('ct-floating-baked', () => refreshLayerTilePreviews());
  window.addEventListener('ct-floating-deleted', () => refreshLayerTilePreviews());
  window.addEventListener('ct-floating-image-ready', () => {
    for (let i = 0; i < CT_LAYER_COUNT; i += 1) {
      if ((layerShapes[i] || []).some((el) => el?.type === 'image')) redrawLayer(i);
    }
    refreshLayerTilePreviews();
  });

  syncLayerTileUi();
}

/**
 * Backpack image layer conflict — replace, use next empty layer, or cancel.
 * @param {number} layerNum 1-based layer number
 * @param {'above' | 'below'} [emptyDirection] where to search for the next empty layer
 * @returns {Promise<'replace' | 'next' | 'cancel'>}
 */
export function confirmLayerLineArtConflict(layerNum, emptyDirection = 'below') {
  const emptyHint = emptyDirection === 'above'
    ? 'above'
    : 'below';
  return new Promise((resolve) => {
    const overlay = document.createElement('div');
    overlay.className = 'dd-dialog';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', 'ct-layer-conflict-title');

    const panel = document.createElement('div');
    panel.className = 'dd-dialog__panel';

    const title = document.createElement('p');
    title.id = 'ct-layer-conflict-title';
    title.className = 'dd-dialog__title';
    title.textContent = `Layer ${layerNum} already has art`;

    const detail = document.createElement('p');
    detail.className = 'dd-dialog__detail';
    detail.textContent = `Replace the art on Layer ${layerNum}, or move this image to the next empty layer ${emptyHint}?`;

    const actions = document.createElement('div');
    actions.className = 'dd-dialog__actions';

    function close(result) {
      overlay.remove();
      document.removeEventListener('keydown', onKeyDown);
      resolve(result);
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close('cancel');
      }
    }

    const replaceBtn = document.createElement('button');
    replaceBtn.type = 'button';
    replaceBtn.className = 'dd-dialog__btn dd-dialog__btn--primary';
    replaceBtn.textContent = `Replace Layer ${layerNum}`;
    replaceBtn.addEventListener('click', () => close('replace'));

    const nextBtn = document.createElement('button');
    nextBtn.type = 'button';
    nextBtn.className = 'dd-dialog__btn';
    nextBtn.textContent = 'Next empty layer';
    nextBtn.addEventListener('click', () => close('next'));

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'dd-dialog__btn dd-dialog__btn--ghost';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => close('cancel'));

    actions.append(replaceBtn, nextBtn, cancelBtn);
    panel.append(title, detail, actions);
    overlay.appendChild(panel);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close('cancel');
    });
    document.addEventListener('keydown', onKeyDown);
    document.body.appendChild(overlay);
    replaceBtn.focus();
  });
}

/** @deprecated use confirmLayerLineArtConflict */
export function confirmLayer1LineArtConflict() {
  return confirmLayerLineArtConflict(1);
}
