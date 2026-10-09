/** Color Time! — floating (unbaked) stage objects + selection overlay. */

import { CT_CANVAS_SIZE, CT_CANVAS_W, CT_CANVAS_H, canvasStagePoint, getCtCanvasMount } from './ct-canvas.mjs';
import {
  commitShapeToLayer,
  getActiveLayerIndex,
  getLayerFloatCanvas,
  redrawLayer,
  registerFloatingLayerThumbHooks,
  registerFloodBarrierPainter,
  refreshLayerTilePreviews,
  CT_LAYER_COUNT,
} from './ct-layers.mjs';
import { drawShapeElement } from './shapes/shape-paint.mjs';
import { attachSelectTool } from './shapes/select-tool.mjs';
import {
  elementToStrokePayload,
  isStrokeElement,
  strokePayloadToElement,
} from './shapes/stroke-element.mjs';
import { getRotatePivot } from './shapes/shape-transform.mjs';
import { cloneShapeElement, hitTestShapeAt, translateShapeElement } from './shapes/shape-bounds.mjs';

import { newShapeElementId } from './shapes/shape-geometry.mjs';
import { replayStrokeToContext } from './ct-draw.mjs';
import { isCtSelectBoundingBoxEnabled, setCtSelectBoundingBoxEnabled } from './ct-overclock.mjs';

/** @returns {object[][]} */
function emptyFloatingByLayer() {
  return Array.from({ length: CT_LAYER_COUNT }, () => []);
}

/** @type {object[][]} */
let floatingByLayer = emptyFloatingByLayer();

export const CT_FLOATING_STACK_SCHEMA = 1;
export const CT_FLOATING_STACK_MAX = 9;

/** @type {string[]} */
let selectedIds = [];

/** In-app clipboard for floating selection (Ctrl+C / Ctrl+V). */
/** @type {Record<string, unknown>[] | null} */
let floatingClipboard = null;
let floatingPasteCount = 0;

const FLOATING_PASTE_NUDGE = 16;

/** @type {HTMLCanvasElement | null} */
let overlayCanvas = null;

/** @type {ReturnType<typeof attachSelectTool> | null} */
let selectTool = null;

const FLOATING_STROKE_TOOLS = new Set(['pencil', 'crayon', 'pastel', 'marker', 'star']);

function requestHistoryCheckpoint() {
  window.dispatchEvent(new Event('ct-history-checkpoint'));
}

function refreshBakedStrokes(layerIndex) {
  window.dispatchEvent(new CustomEvent('ct-refresh-baked-strokes', { detail: { layerIndex } }));
}

function appendBakedStroke(stroke, layerIndex, opts = {}) {
  window.dispatchEvent(new CustomEvent('ct-append-baked-stroke', {
    detail: {
      stroke,
      layerIndex,
      skipCanvasReplay: opts.skipCanvasReplay === true,
    },
  }));
}

function syncOverlayPointerEvents() {
  if (!(overlayCanvas instanceof HTMLCanvasElement)) return;
  /* Select on = arrange mode owns the stage (no drawing). Select off = draw through. */
  const intercept = isCtSelectBoundingBoxEnabled();
  overlayCanvas.classList.toggle('ct-object-overlay--active', intercept);
}

/** @param {Record<string, unknown>} el @param {CanvasRenderingContext2D} ctx */
function drawStrokeFloatingElement(ctx, el) {
  const payload = elementToStrokePayload(el);
  const rot = typeof el.rotation === 'number' ? el.rotation : 0;
  if (rot === 0) {
    replayStrokeToContext(ctx, payload);
    return;
  }
  const pivot = getRotatePivot(el);
  if (!pivot) {
    replayStrokeToContext(ctx, payload);
    return;
  }
  ctx.save();
  ctx.translate(pivot.x, pivot.y);
  ctx.rotate(rot);
  ctx.translate(-pivot.x, -pivot.y);
  replayStrokeToContext(ctx, payload);
  ctx.restore();
}

/** @param {CanvasRenderingContext2D} ctx @param {Record<string, unknown>} el */
function drawFloatingElement(ctx, el) {
  if (!el?.type) return;
  if (isStrokeElement(el)) {
    drawStrokeFloatingElement(ctx, el);
    return;
  }
  drawShapeElement(ctx, el);
}

export function getFloatingElements(layerIndex = getActiveLayerIndex()) {
  return floatingByLayer[layerIndex] ?? [];
}

export function hasFloatingSelection() {
  return selectedIds.length > 0;
}

export function hasFloatingOnLayer(layerIndex) {
  return (floatingByLayer[layerIndex]?.length ?? 0) > 0;
}

/** Drop floating objects on one layer without baking (e.g. Open → replace). */
export function clearFloatingOnLayer(layerIndex) {
  const list = floatingByLayer[layerIndex];
  if (!list?.length) return;
  const idSet = new Set(list.map((el) => String(el.id)));
  floatingByLayer[layerIndex] = [];
  selectedIds = selectedIds.filter((id) => !idSet.has(String(id)));
  syncOverlayPointerEvents();
  redrawObjectOverlay();
}

/** Remove selected floating objects on the active layer (Delete / Backspace). */
export function deleteSelectedFloating() {
  if (!selectedIds.length) return false;
  const layerIndex = getActiveLayerIndex();
  const idSet = new Set(selectedIds.map(String));
  requestHistoryCheckpoint();
  floatingByLayer[layerIndex] = floatingByLayer[layerIndex].filter((el) => !idSet.has(String(el.id)));
  selectedIds = [];
  syncOverlayPointerEvents();
  redrawObjectOverlay();
  window.dispatchEvent(new CustomEvent('ct-floating-deleted', { detail: { layerIndex } }));
  return true;
}

/**
 * Nudge selected floating objects (logical canvas px).
 * @param {number} dx
 * @param {number} dy
 * @param {{ checkpoint?: boolean }} [opts]
 */
export function nudgeSelectedFloating(dx, dy, opts = {}) {
  if (!selectedIds.length) return false;
  if (!dx && !dy) return false;
  const layerIndex = getActiveLayerIndex();
  const list = floatingByLayer[layerIndex] ?? [];
  const idSet = new Set(selectedIds.map(String));
  const targets = list.filter((el) => idSet.has(String(el.id)));
  if (!targets.length) return false;
  if (opts.checkpoint !== false) requestHistoryCheckpoint();
  for (const el of targets) {
    translateShapeElement(el, dx, dy);
  }
  redrawObjectOverlay();
  refreshLayerTilePreviews();
  return true;
}

/** Copy selected floating objects to the in-app clipboard. */
export function copySelectedFloating() {
  if (!selectedIds.length) return false;
  const list = getFloatingElements(getActiveLayerIndex());
  const idSet = new Set(selectedIds.map(String));
  /** @type {Record<string, unknown>[]} */
  const clones = [];
  for (const el of list) {
    if (!idSet.has(String(el.id))) continue;
    clones.push(cloneShapeElement(el));
  }
  if (!clones.length) return false;
  floatingClipboard = clones;
  floatingPasteCount = 0;
  return true;
}

export function hasFloatingClipboard() {
  return Array.isArray(floatingClipboard) && floatingClipboard.length > 0;
}

/**
 * Paste clipboard onto the active layer (nudged each paste).
 * Turns Select on so pasted objects can be arranged.
 */
export function pasteFloatingClipboard() {
  if (!hasFloatingClipboard()) return false;
  const layerIndex = getActiveLayerIndex();
  if (!floatingByLayer[layerIndex]) floatingByLayer[layerIndex] = [];

  if (!isCtSelectBoundingBoxEnabled()) {
    setCtSelectBoundingBoxEnabled(true);
  }

  floatingPasteCount += 1;
  const nudge = FLOATING_PASTE_NUDGE * floatingPasteCount;
  requestHistoryCheckpoint();

  /** @type {string[]} */
  const newIds = [];
  for (const item of /** @type {Record<string, unknown>[]} */ (floatingClipboard)) {
    const clone = cloneShapeElement(item);
    clone.id = newShapeElementId();
    translateShapeElement(clone, nudge, nudge);
    floatingByLayer[layerIndex].push(clone);
    newIds.push(String(clone.id));
  }
  selectedIds = newIds;
  syncOverlayPointerEvents();
  redrawObjectOverlay();
  refreshLayerTilePreviews();
  window.dispatchEvent(new CustomEvent('ct-floating-placed', { detail: { layerIndex, pasted: true } }));
  return true;
}

/** Select every floating object on the active layer (Select / arrange mode). */
export function selectAllFloatingOnActiveLayer() {
  const list = getFloatingElements(getActiveLayerIndex());
  selectedIds = list.map((el) => String(el.id)).filter(Boolean);
  syncOverlayPointerEvents();
  redrawObjectOverlay();
  return selectedIds.length;
}

const BUCKET_FILLABLE_TYPES = new Set(['circle', 'square', 'triangle', 'polygon']);

/**
 * Bucket on a floating shape → set its fill (objects have no pixels to flood).
 * @param {number} x
 * @param {number} y
 * @param {string} color
 * @param {number} [layerIndex]
 * @returns {boolean} true if a floating shape absorbed the fill
 */
export function tryBucketFillFloatingAt(x, y, color, layerIndex = getActiveLayerIndex()) {
  const list = floatingByLayer[layerIndex];
  if (!list?.length || !color) return false;
  const hit = hitTestShapeAt(list, x, y);
  if (!hit || !BUCKET_FILLABLE_TYPES.has(String(hit.type))) return false;
  const next = String(color);
  if (String(hit.fillColor ?? '') === next) return true;
  requestHistoryCheckpoint();
  hit.fillColor = next;
  redrawObjectOverlay();
  refreshLayerTilePreviews();
  window.dispatchEvent(new CustomEvent('ct-floating-filled', { detail: { layerIndex, element: hit } }));
  return true;
}

/** @param {KeyboardEvent} e */
function selectionNudgeStepPx(e) {
  const ctrl = e.ctrlKey || e.metaKey;
  const shift = e.shiftKey;
  const alt = e.altKey;
  if (ctrl && shift) return 25;
  if (alt) return 1;
  if (ctrl) return 50;
  if (shift) return 100;
  return 10;
}

/** @param {KeyboardEvent} e */
function shouldBlockStageDeleteKey(e) {
  const t = e.target;
  if (t instanceof HTMLElement) {
    if (t.isContentEditable) return true;
    const tag = t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  }
  if (document.querySelector('.dd-dialog')) return true;
  const hub = document.getElementById('oss-hpp');
  if (hub && !hub.hidden) return true;
  for (const id of ['ct-osbard-popup', 'ct-star-popup', 'ct-set-popup', 'ct-cast-popup', 'ct-props-popup', 'ct-overclock-popup', 'ct-save-as-popup', 'ct-hub-info', 'ct-hub-legal']) {
    const el = document.getElementById(id);
    if (el instanceof HTMLElement && !el.hidden) return true;
  }
  return false;
}

/** @returns {{ floating: object[][], selectedIds: string[] }} */
export function exportFloatingState() {
  return {
    floating: floatingByLayer.map((layer) => structuredClone(layer)),
    selectedIds: [...selectedIds],
  };
}

/**
 * Floating objects per layer for `.oss` — extensible `items[]`.
 * @returns {{ schema: number, count: number, maxLayers: number, selectedIds: string[], items: object[][] }}
 */
export function exportFloatingStack() {
  return {
    schema: CT_FLOATING_STACK_SCHEMA,
    count: floatingByLayer.length,
    maxLayers: CT_FLOATING_STACK_MAX,
    selectedIds: [...selectedIds],
    items: floatingByLayer.map((layer) => structuredClone(layer)),
  };
}

/**
 * @param {unknown} state
 * @returns {{ layers: object[][], selectedIds: string[] }}
 */
export function normalizeFloatingStack(state) {
  if (!state || typeof state !== 'object') {
    return { layers: emptyFloatingByLayer(), selectedIds: [] };
  }
  const raw = /** @type {Record<string, unknown>} */ (state);
  if (raw.schema != null && Array.isArray(raw.items)) {
    const items = /** @type {object[][]} */ (raw.items);
    return {
      layers: items.map((layer) => (Array.isArray(layer) ? structuredClone(layer) : [])),
      selectedIds: Array.isArray(raw.selectedIds) ? [...raw.selectedIds] : [],
    };
  }
  const legacy = Array.isArray(raw.floating) ? raw.floating : [];
  return {
    layers: legacy.map((layer) => (Array.isArray(layer) ? structuredClone(layer) : [])),
    selectedIds: Array.isArray(raw.selectedIds) ? [...raw.selectedIds] : [],
  };
}

/** @param {unknown} state */
export function restoreFloatingStack(state) {
  const { layers, selectedIds: ids } = normalizeFloatingStack(state);
  floatingByLayer = emptyFloatingByLayer();
  selectedIds = [];
  for (let i = 0; i < floatingByLayer.length; i++) {
    floatingByLayer[i] = Array.isArray(layers[i]) ? structuredClone(layers[i]) : [];
  }
  selectedIds = ids;
  syncOverlayPointerEvents();
  redrawObjectOverlay();
}

/** @param {{ floating?: object[][], selectedIds?: string[] } | null | undefined} state */
export function restoreFloatingState(state) {
  restoreFloatingStack(state);
}

function screenToStage(x, y) {
  if (!(overlayCanvas instanceof HTMLCanvasElement)) return { x: 0, y: 0 };
  const r = overlayCanvas.getBoundingClientRect();
  return {
    x: ((x - r.left) / r.width) * CT_CANVAS_SIZE,
    y: ((y - r.top) / r.height) * CT_CANVAS_SIZE,
  };
}

export function redrawObjectOverlay() {
  /* Floating art lives on per-layer float canvases so Open→image on L3 stays under L1/L2. */
  for (let i = 0; i < CT_LAYER_COUNT; i += 1) {
    const floatCanvas = getLayerFloatCanvas(i);
    const fctx = floatCanvas?.getContext('2d');
    if (!fctx || !floatCanvas) continue;
    fctx.save();
    fctx.setTransform(1, 0, 0, 1, 0, 0);
    fctx.clearRect(0, 0, floatCanvas.width, floatCanvas.height);
    for (const el of floatingByLayer[i] ?? []) {
      drawFloatingElement(fctx, el);
    }
    fctx.restore();
  }

  const canvas = overlayCanvas;
  const ctx = canvas?.getContext('2d');
  if (!ctx || !canvas) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  ctx.restore();
  selectTool?.drawSelectionOverlay?.();
}

function setSelectedIds(ids) {
  selectedIds = ids.map(String);
  syncOverlayPointerEvents();
  redrawObjectOverlay();
}

function bakeOneElement(el, layerIndex) {
  if (isStrokeElement(el)) {
    const payload = elementToStrokePayload(el, { layerIndex });
    appendBakedStroke({ ...payload, layerIndex }, layerIndex);
    return;
  }
  commitShapeToLayer(layerIndex, structuredClone(el), { skipHistory: true });
}

/**
 * @param {{ layerIndex?: number, all?: boolean, skipHistory?: boolean }} [opts]
 */
export function bakeFloatingElements(opts = {}) {
  const { all = false, skipHistory = false } = opts;
  let layerIndexes;
  if (all) layerIndexes = Array.from({ length: CT_LAYER_COUNT }, (_, i) => i);
  else if (typeof opts.layerIndex === 'number') layerIndexes = [opts.layerIndex];
  else layerIndexes = [getActiveLayerIndex()];

  let baked = false;
  for (const idx of layerIndexes) {
    const list = floatingByLayer[idx];
    if (!list.length) continue;
    if (!skipHistory && !baked) requestHistoryCheckpoint();
    baked = true;
    for (const el of list) {
      bakeOneElement(el, idx, { skipShapeHistory: true });
    }
    floatingByLayer[idx] = [];
    refreshBakedStrokes(idx);
  }

  if (baked) {
    selectedIds = [];
    syncOverlayPointerEvents();
    redrawObjectOverlay();
    window.dispatchEvent(new Event('ct-floating-baked'));
  }
}

/** @param {object} stroke @param {number} layerIndex */
export function placeFloatingStroke(stroke, layerIndex) {
  if (!floatingByLayer[layerIndex]) floatingByLayer[layerIndex] = [];
  const el = strokePayloadToElement(stroke);
  if (!el.id) el.id = stroke.id ?? newShapeElementId();
  floatingByLayer[layerIndex].push(el);
  /* Clear live-preview pixels from the bake surface; art lives on the float canvas. */
  refreshBakedStrokes(layerIndex);
  /* Auto-select only while arranging — draw mode keeps objects without boxes. */
  if (isCtSelectBoundingBoxEnabled()) {
    selectedIds = [String(el.id)];
  } else {
    selectedIds = [];
  }
  syncOverlayPointerEvents();
  redrawObjectOverlay();
  refreshLayerTilePreviews();
  window.dispatchEvent(new CustomEvent('ct-floating-placed', { detail: { layerIndex, element: el } }));
}

/** @param {object} el @param {number} layerIndex */
export function placeFloatingShape(el, layerIndex) {
  if (!floatingByLayer[layerIndex]) floatingByLayer[layerIndex] = [];
  const placed = { ...el };
  if (!placed.id) placed.id = newShapeElementId();
  floatingByLayer[layerIndex].push(placed);
  /* Wipe shape-tool preview from the layer canvas (shape stays on float canvas). */
  redrawLayer(layerIndex);
  if (isCtSelectBoundingBoxEnabled()) {
    selectedIds = [String(placed.id)];
  } else {
    selectedIds = [];
  }
  syncOverlayPointerEvents();
  redrawObjectOverlay();
  refreshLayerTilePreviews();
  window.dispatchEvent(new CustomEvent('ct-floating-placed', { detail: { layerIndex, element: placed } }));
}

/**
 * Place a movable raster image on the floating stack (Select: move / resize / rotate).
 * Does not bake sibling floating objects — multiple images can share a layer.
 * @param {{ src: string, left: number, top: number, w: number, h: number, id?: string, rotation?: number }} image
 * @param {number} layerIndex
 */
export function placeFloatingImage(image, layerIndex) {
  requestHistoryCheckpoint();
  const placed = {
    type: 'image',
    src: image.src,
    left: image.left,
    top: image.top,
    w: image.w,
    h: image.h,
    rotation: typeof image.rotation === 'number' ? image.rotation : 0,
    id: image.id || newShapeElementId(),
  };
  floatingByLayer[layerIndex].push(placed);
  selectedIds = [String(placed.id)];
  syncOverlayPointerEvents();
  redrawObjectOverlay();
  window.dispatchEvent(new CustomEvent('ct-floating-placed', { detail: { layerIndex, element: placed } }));
}

/** @param {object} stroke */
export function shouldFloatStroke(stroke) {
  return FLOATING_STROKE_TOOLS.has(String(stroke?.tool ?? ''));
}

/** @param {object} stroke @param {number} layerIndex @param {{ skipCanvasReplay?: boolean }} [opts] */
export function routeStrokeCommit(stroke, layerIndex, opts = {}) {
  if (shouldFloatStroke(stroke)) {
    placeFloatingStroke(stroke, layerIndex);
    return;
  }
  appendBakedStroke(stroke, layerIndex, opts);
  window.dispatchEvent(new CustomEvent('ct-stroke-commit', { detail: stroke }));
}

export function initCtStageObjects() {
  const mount = getCtCanvasMount();
  if (!(mount instanceof HTMLElement)) return;

  registerFloatingLayerThumbHooks(
    (ctx, layerIndex, scaleX, scaleY) => {
      const list = floatingByLayer[layerIndex];
      if (!list?.length) return;
      ctx.save();
      ctx.scale(scaleX, scaleY);
      for (const el of list) {
        drawFloatingElement(ctx, el);
      }
      ctx.restore();
    },
    (layerIndex) => hasFloatingOnLayer(layerIndex),
  );

  /* Flood/wand: ink + images bound the fill; squares/circles are click-to-fill only. */
  registerFloodBarrierPainter((ctx, layerIndex) => {
    const list = floatingByLayer[layerIndex];
    if (!list?.length) return;
    for (const el of list) {
      if (BUCKET_FILLABLE_TYPES.has(String(el.type))) continue;
      drawFloatingElement(ctx, el);
    }
  });

  window.addEventListener('ct-route-stroke-commit', (e) => {
    const detail = /** @type {CustomEvent<{ stroke: object, layerIndex: number, skipCanvasReplay?: boolean }>} */ (e).detail;
    if (!detail?.stroke) return;
    routeStrokeCommit(detail.stroke, detail.layerIndex, {
      skipCanvasReplay: detail.skipCanvasReplay === true,
    });
  });

  window.addEventListener('ct-select-bbox-changed', (e) => {
    const enabled = !!/** @type {CustomEvent<{ enabled: boolean }>} */ (e).detail?.enabled;
    if (enabled) {
      selectAllFloatingOnActiveLayer();
    } else {
      selectedIds = [];
      syncOverlayPointerEvents();
      redrawObjectOverlay();
    }
  });

  window.addEventListener('ct-flatten-layer', () => {
    bakeFloatingElements({ skipHistory: false });
  });
  window.addEventListener('ct-flatten-canvas', () => {
    bakeFloatingElements({ all: true, skipHistory: false });
  });
  window.addEventListener('ct-copy-floating', () => {
    if (!hasFloatingSelection()) return;
    copySelectedFloating();
  });
  window.addEventListener('ct-paste-floating', () => {
    if (!hasFloatingClipboard()) return;
    pasteFloatingClipboard();
  });

  window.addEventListener('ct-bucket-fill-at', (e) => {
    const detail = /** @type {CustomEvent<{ x: number, y: number, color: string, layerIndex: number, handled?: boolean }>} */ (e).detail;
    if (!detail || detail.handled) return;
    if (tryBucketFillFloatingAt(detail.x, detail.y, detail.color, detail.layerIndex)) {
      detail.handled = true;
    }
  });

  /* Eraser can't punch floating stroke objects yet — bake active layer so erase hits visible art. */
  window.addEventListener('ct-bake-before-erase', (e) => {
    const layerIndex = /** @type {CustomEvent<{ layerIndex: number }>} */ (e).detail?.layerIndex;
    if (typeof layerIndex !== 'number') return;
    if (!hasFloatingOnLayer(layerIndex)) return;
    bakeFloatingElements({ layerIndex, skipHistory: false });
  });

  window.addEventListener('ct-layer-opacity-changed', () => {
    redrawObjectOverlay();
    refreshLayerTilePreviews();
  });

  window.addEventListener('ct-floating-image-ready', () => {
    redrawObjectOverlay();
    refreshLayerTilePreviews();
  });

  overlayCanvas = document.createElement('canvas');
  overlayCanvas.id = 'ct-object-overlay';
  overlayCanvas.className = 'ct-object-overlay';
  overlayCanvas.width = CT_CANVAS_W;
  overlayCanvas.height = CT_CANVAS_H;
  overlayCanvas.setAttribute('aria-hidden', 'true');
  mount.appendChild(overlayCanvas);

  window.addEventListener('ct-canvas-size-changed', (e) => {
    const d = /** @type {CustomEvent<{ size?: number, w?: number, h?: number }>} */ (e).detail;
    const w = d?.w ?? CT_CANVAS_W;
    const h = d?.h ?? CT_CANVAS_H;
    if (!(overlayCanvas instanceof HTMLCanvasElement)) return;
    overlayCanvas.width = w;
    overlayCanvas.height = h;
    for (let i = 0; i < CT_LAYER_COUNT; i += 1) {
      const fc = getLayerFloatCanvas(i);
      if (fc instanceof HTMLCanvasElement) {
        fc.width = w;
        fc.height = h;
      }
    }
    redrawObjectOverlay();
  });

  selectTool = attachSelectTool(overlayCanvas, {
    screenToStage,
    getZoom: () => 1,
    getCanvasSize: () => ({ w: CT_CANVAS_W, h: CT_CANVAS_H }),
    getElements: () => getFloatingElements(getActiveLayerIndex()),
    getSelectedIds: () => selectedIds,
    setSelectedIds,
    isSelectMode: () => isCtSelectBoundingBoxEnabled(),
    // Deselect only — Flatten is the only bake path.
    onTapAway: () => {},
    onElementsChanged: () => requestHistoryCheckpoint(),
    redrawStage: redrawObjectOverlay,
  });

  document.querySelectorAll('.dd-q400-tool').forEach((btn) => {
    btn.addEventListener('click', () => {
      /* Leave arrange mode so paint tools can draw — objects stay floating. */
      if (isCtSelectBoundingBoxEnabled()) setCtSelectBoundingBoxEnabled(false);
    });
  });

  window.addEventListener('ct-active-layer-changed', (e) => {
    const next = /** @type {CustomEvent<{ index: number }>} */ (e).detail?.index;
    if (typeof next !== 'number') return;
    if (isCtSelectBoundingBoxEnabled()) {
      selectAllFloatingOnActiveLayer();
    } else {
      selectedIds = [];
      syncOverlayPointerEvents();
      redrawObjectOverlay();
    }
  });

  window.addEventListener('ct-session-mode-changed', () => {
    /* Objects stay floating across draw ↔ shape; Flatten bakes intentionally. */
    if (isCtSelectBoundingBoxEnabled()) {
      selectAllFloatingOnActiveLayer();
    } else {
      selectedIds = [];
      syncOverlayPointerEvents();
      redrawObjectOverlay();
    }
  });

  window.addEventListener('ct-layer-cleared', (e) => {
    const index = /** @type {CustomEvent<{ index: number }>} */ (e).detail?.index;
    if (typeof index !== 'number') return;
    clearFloatingOnLayer(index);
  });

  window.addEventListener('ct-pre-layer-swap', (e) => {
    const detail = /** @type {CustomEvent<{ i: number, j: number }>} */ (e).detail;
    const i = detail?.i;
    const j = detail?.j;
    if (typeof i !== 'number' || typeof j !== 'number') return;
    const t = floatingByLayer[i];
    floatingByLayer[i] = floatingByLayer[j];
    floatingByLayer[j] = t;
    selectedIds = [];
    if (isCtSelectBoundingBoxEnabled()) {
      selectAllFloatingOnActiveLayer();
    } else {
      syncOverlayPointerEvents();
      redrawObjectOverlay();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Delete' || e.key === 'Backspace') {
      if (shouldBlockStageDeleteKey(e)) return;
      if (!deleteSelectedFloating()) return;
      e.preventDefault();
      return;
    }

    if (
      e.key !== 'ArrowLeft' &&
      e.key !== 'ArrowRight' &&
      e.key !== 'ArrowUp' &&
      e.key !== 'ArrowDown'
    ) {
      return;
    }
    if (!hasFloatingSelection()) return;
    if (shouldBlockStageDeleteKey(e)) return;
    const step = selectionNudgeStepPx(e);
    let dx = 0;
    let dy = 0;
    if (e.key === 'ArrowLeft') dx = -step;
    else if (e.key === 'ArrowRight') dx = step;
    else if (e.key === 'ArrowUp') dy = -step;
    else dy = step;
    if (!nudgeSelectedFloating(dx, dy, { checkpoint: !e.repeat })) return;
    e.preventDefault();
    e.stopPropagation();
  });
}

/** Bake all floating before project reset / new doc. */
export function bakeAllFloatingBeforeReset() {
  bakeFloatingElements({ all: true, skipHistory: true });
}

export function clearFloatingState() {
  floatingByLayer = emptyFloatingByLayer();
  selectedIds = [];
  syncOverlayPointerEvents();
  redrawObjectOverlay();
}
