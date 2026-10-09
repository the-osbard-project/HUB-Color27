/** Color27 — draw surface. Presets: Square 800×800 (default), Wide 800×600, Tall 600×800. */

import { mountCtLayers } from './ct-layers.mjs';
import { clientToStagePixels, getCanvasPaintRect } from './viewport/stage-coords.mjs';
import { getStageRotationDeg } from './viewport/stage-rotate.mjs';

/** Short-side scale reference (brush scaling). Square short side. */
export const CT_CANVAS_SIZE_STANDARD = 800;
/** Legacy print constant — unused in CT27 UI (no 300 PPI). */
export const CT_CANVAS_SIZE_PRINT = 2625;
export const CT_PRINT_DPI = 300;
export const KDP_MARGIN_IN = 0.0625;

/** @typedef {'square' | 'wide' | 'tall'} CtCanvasPreset */

export const CT_CANVAS_PRESETS = /** @type {const} */ (['square', 'wide', 'tall']);
export const CT_CANVAS_DEFAULT_PRESET = /** @type {CtCanvasPreset} */ ('square');

/** @type {Record<CtCanvasPreset, { w: number, h: number, label: string }>} */
export const CT_CANVAS_PRESET_DIMS = {
  square: { w: 800, h: 800, label: 'Square' },
  wide: { w: 800, h: 600, label: 'Wide' },
  tall: { w: 600, h: 800, label: 'Tall' },
};

const PRESET_STORAGE_KEY = 'ct27-canvas-preset';
const PRINT_CANVAS_STORAGE_KEY = 'ct-overclock-print-canvas';

try {
  localStorage.setItem(PRINT_CANVAS_STORAGE_KEY, '0');
} catch {
  /* ignore */
}

/** @returns {CtCanvasPreset} */
function readSavedPreset() {
  try {
    const v = localStorage.getItem(PRESET_STORAGE_KEY);
    if (v && CT_CANVAS_PRESETS.includes(/** @type {CtCanvasPreset} */ (v))) {
      return /** @type {CtCanvasPreset} */ (v);
    }
  } catch {
    /* ignore */
  }
  return CT_CANVAS_DEFAULT_PRESET;
}

/** @param {CtCanvasPreset} token */
function persistPreset(token) {
  try {
    localStorage.setItem(PRESET_STORAGE_KEY, token);
  } catch {
    /* ignore */
  }
}

/**
 * @param {string} token
 * @returns {{ w: number, h: number, preset: CtCanvasPreset }}
 */
export function canvasDimsForPreset(token) {
  const preset = CT_CANVAS_PRESETS.includes(/** @type {CtCanvasPreset} */ (token))
    ? /** @type {CtCanvasPreset} */ (token)
    : CT_CANVAS_DEFAULT_PRESET;
  const dims = CT_CANVAS_PRESET_DIMS[preset];
  return { w: dims.w, h: dims.h, preset };
}

/**
 * @param {number} w
 * @param {number} h
 * @returns {CtCanvasPreset | null}
 */
export function matchCtCanvasPreset(w, h) {
  const rw = Math.round(w);
  const rh = Math.round(h);
  for (const token of CT_CANVAS_PRESETS) {
    const dims = CT_CANVAS_PRESET_DIMS[token];
    if (dims.w === rw && dims.h === rh) return token;
  }
  return null;
}

const boot = canvasDimsForPreset(readSavedPreset());

export let CT_CANVAS_SIZE = Math.min(boot.w, boot.h);
export let CT_CANVAS_W = boot.w;
export let CT_CANVAS_H = boot.h;
/** @type {CtCanvasPreset} */
export let CT_CANVAS_PRESET = boot.preset;

/** Legacy aliases — factory defaults match Square. */
export const CT_CANVAS_W_DEFAULT = CT_CANVAS_PRESET_DIMS.square.w;
export const CT_CANVAS_H_DEFAULT = CT_CANVAS_PRESET_DIMS.square.h;

/** @returns {number} */
export function getCtCanvasSize() {
  return CT_CANVAS_SIZE;
}

/** @returns {number} */
export function getCtCanvasWidth() {
  return CT_CANVAS_W;
}

/** @returns {number} */
export function getCtCanvasHeight() {
  return CT_CANVAS_H;
}

/** @returns {{ w: number, h: number, preset: CtCanvasPreset }} */
export function getCtCanvasDims() {
  return { w: CT_CANVAS_W, h: CT_CANVAS_H, preset: CT_CANVAS_PRESET };
}

/** @returns {CtCanvasPreset} */
export function getCtCanvasPreset() {
  return CT_CANVAS_PRESET;
}

/** @returns {number} */
export function ctCanvasScaleFactor() {
  return CT_CANVAS_SIZE / CT_CANVAS_SIZE_STANDARD;
}

/** @returns {number} */
export function kdpMarginPx() {
  return KDP_MARGIN_IN * CT_PRINT_DPI;
}

/** @param {number} size */
export function normalizeCtCanvasSize(size) {
  return size === CT_CANVAS_SIZE_PRINT ? CT_CANVAS_SIZE_PRINT : CT_CANVAS_SIZE_STANDARD;
}

/** @type {HTMLCanvasElement | null} */
let drawCanvas = null;

/** @type {HTMLElement | null} */
let kdpGuidesRoot = null;

/** @type {string} */
let canvasFileLabel = 'Untitled';

export function getCtCanvasMount() {
  const stack = document.getElementById('ct-canvas-stack');
  return stack instanceof HTMLElement ? stack : null;
}

export function getCtStageScroll() {
  const scroll = document.getElementById('dd-stage-scroll');
  return scroll instanceof HTMLElement ? scroll : null;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {number} clientX
 * @param {number} clientY
 */
export function canvasStagePointXY(canvas, clientX, clientY) {
  const rect = getCanvasPaintRect(canvas);
  if (!rect || !(rect.width > 0) || !(rect.height > 0)) return { x: 0, y: 0 };
  return clientToStagePixels(canvas, rect, clientX, clientY, getStageRotationDeg());
}

export function canvasStagePoint(canvas, e) {
  return canvasStagePointXY(canvas, e.clientX, e.clientY);
}

/** @returns {HTMLCanvasElement | null} */
export function getDrawCanvas() {
  return drawCanvas;
}

/** @returns {CanvasRenderingContext2D | null} */
export function getDrawContext() {
  return drawCanvas?.getContext('2d') ?? null;
}

/** @param {string} color */
export function fillCanvasBackground(color) {
  const mount = getCtCanvasMount();
  if (mount instanceof HTMLElement) {
    mount.style.backgroundColor = color;
  }
}

export function clearDrawSurface() {
  const ctx = getDrawContext();
  if (!ctx || !drawCanvas) return;
  ctx.save();
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, drawCanvas.width, drawCanvas.height);
  ctx.restore();
}

/** Redraw committed strokes (project replay). */
export function redrawStrokes(strokes, drawStroke) {
  clearDrawSurface();
  for (const stroke of strokes) {
    drawStroke(stroke);
  }
}

/** @param {'draw' | 'shape'} mode */
export function setCtCanvasSessionMode(mode) {
  const mount = getCtCanvasMount();
  if (mount instanceof HTMLElement) {
    mount.classList.toggle('ct-canvas-stack--shape', mode === 'shape');
  }
}

function ensureKdpGuides(mount) {
  if (kdpGuidesRoot instanceof HTMLElement && mount.contains(kdpGuidesRoot)) return;
  kdpGuidesRoot = document.createElement('div');
  kdpGuidesRoot.id = 'ct-kdp-guides';
  kdpGuidesRoot.className = 'ct-kdp-guides';
  kdpGuidesRoot.setAttribute('aria-hidden', 'true');
  for (const side of ['top', 'right', 'bottom', 'left']) {
    const band = document.createElement('div');
    band.className = `ct-kdp-guide ct-kdp-guide--${side}`;
    kdpGuidesRoot.appendChild(band);
  }
  mount.appendChild(kdpGuidesRoot);
}

export function syncCtKdpGuides() {
  const mount = getCtCanvasMount();
  if (!(mount instanceof HTMLElement)) return;
  mount.classList.remove('ct-canvas-stack--print');
  kdpGuidesRoot?.remove();
  kdpGuidesRoot = null;
  void ensureKdpGuides;
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {number} w
 * @param {number} h
 */
export function resizeCanvasKeepPixels(canvas, w, h) {
  if (canvas.width === w && canvas.height === h) return;
  const prev = document.createElement('canvas');
  prev.width = canvas.width;
  prev.height = canvas.height;
  prev.getContext('2d')?.drawImage(canvas, 0, 0);
  canvas.width = w;
  canvas.height = h;
  canvas.getContext('2d')?.drawImage(prev, 0, 0);
}

/**
 * @param {number} w
 * @param {number} h
 * @param {{ keepPixels?: boolean }} [opts]
 */
function applyDimsToMountedCanvases(w, h, opts = {}) {
  const keepPixels = opts.keepPixels !== false;
  const mount = getCtCanvasMount();
  if (!mount) return;
  mount.querySelectorAll('canvas').forEach((node) => {
    if (!(node instanceof HTMLCanvasElement)) return;
    if (keepPixels) resizeCanvasKeepPixels(node, w, h);
    else {
      node.width = w;
      node.height = h;
    }
  });
}

/**
 * @param {number} w
 * @param {number} h
 * @param {CtCanvasPreset} preset
 * @param {{ keepPixels?: boolean }} [opts]
 */
function commitCanvasDims(w, h, preset, opts = {}) {
  const keepPixels = opts.keepPixels !== false;
  CT_CANVAS_W = w;
  CT_CANVAS_H = h;
  CT_CANVAS_SIZE = Math.min(w, h);
  CT_CANVAS_PRESET = preset;
  persistPreset(preset);
  applyDimsToMountedCanvases(w, h, { keepPixels });
  if (drawCanvas && (drawCanvas.width !== w || drawCanvas.height !== h)) {
    if (keepPixels) resizeCanvasKeepPixels(drawCanvas, w, h);
    else {
      drawCanvas.width = w;
      drawCanvas.height = h;
    }
  }
  syncCtKdpGuides();
  syncCtCanvasSizeReadout();
  window.dispatchEvent(
    new CustomEvent('ct-canvas-size-changed', {
      detail: { size: CT_CANVAS_SIZE, w, h, width: w, height: h, preset },
    }),
  );
}

/**
 * Apply a Canvas Settings preset.
 * @param {string} token
 * @param {{ keepPixels?: boolean }} [opts]
 */
export function applyCtCanvasPreset(token, opts = {}) {
  const dims = canvasDimsForPreset(token);
  commitCanvasDims(dims.w, dims.h, dims.preset, opts);
}

/**
 * Legacy short-side API — keeps current preset shape (no print scale).
 * @param {number} [_size]
 * @param {{ keepPixels?: boolean }} [opts]
 */
export function applyCtCanvasSize(_size, opts = {}) {
  applyCtCanvasPreset(CT_CANVAS_PRESET, opts);
}

/**
 * Open / restore from `.oss` (w×h or legacy size).
 * @param {{ w?: number, h?: number, size?: number, preset?: string }} spec
 * @param {{ keepPixels?: boolean }} [opts]
 */
export function applyCtCanvasSpec(spec, opts = {}) {
  if (spec?.preset && CT_CANVAS_PRESETS.includes(/** @type {CtCanvasPreset} */ (spec.preset))) {
    applyCtCanvasPreset(spec.preset, opts);
    return;
  }
  if (spec?.w != null && spec?.h != null && spec.w > 0 && spec.h > 0) {
    const match = matchCtCanvasPreset(spec.w, spec.h);
    if (match) {
      applyCtCanvasPreset(match, opts);
      return;
    }
    /* Unknown size — nearest preset by aspect, prefer square. */
    const ratio = spec.w / spec.h;
    if (ratio > 1.15) applyCtCanvasPreset('wide', opts);
    else if (ratio < 0.87) applyCtCanvasPreset('tall', opts);
    else applyCtCanvasPreset('square', opts);
    return;
  }
  applyCtCanvasPreset(CT_CANVAS_DEFAULT_PRESET, opts);
}

/** @param {string | null | undefined} name */
export function setCtCanvasFileLabel(name) {
  canvasFileLabel = name?.trim() || 'Untitled';
  syncCtCanvasSizeReadout();
}

function syncCtCanvasSizeReadout() {
  const el = document.getElementById('ct-canvas-size');
  if (!(el instanceof HTMLElement)) return;
  el.textContent = `${CT_CANVAS_W} × ${CT_CANVAS_H} · File: ${canvasFileLabel}`;
}

export function initCtCanvas() {
  const scroll = getCtStageScroll();
  const mount = getCtCanvasMount();
  if (!scroll || !mount) return;

  const dims = canvasDimsForPreset(readSavedPreset());
  CT_CANVAS_W = dims.w;
  CT_CANVAS_H = dims.h;
  CT_CANVAS_SIZE = Math.min(dims.w, dims.h);
  CT_CANVAS_PRESET = dims.preset;

  mount.replaceChildren();
  mount.classList.add('ct-canvas-stack');
  scroll.setAttribute('role', 'region');
  scroll.setAttribute('aria-label', 'Drawing canvas');
  scroll.tabIndex = 0;

  mountCtLayers(mount, { w: CT_CANVAS_W, h: CT_CANVAS_H });

  drawCanvas = document.createElement('canvas');
  drawCanvas.id = 'ct-draw-canvas';
  drawCanvas.className = 'ct-draw-canvas';
  drawCanvas.width = CT_CANVAS_W;
  drawCanvas.height = CT_CANVAS_H;
  drawCanvas.setAttribute('aria-hidden', 'true');
  mount.appendChild(drawCanvas);
  scroll.dataset.ctTool = scroll.dataset.ctTool ?? 'pencil';

  syncCtKdpGuides();
  syncCtCanvasSizeReadout();
  window.addEventListener('ct-canvas-size-changed', syncCtCanvasSizeReadout);
  window.addEventListener('ct-open', (e) => {
    setCtCanvasFileLabel(e.detail?.fileName ?? null);
  });
  window.addEventListener('ct-save', (e) => {
    setCtCanvasFileLabel(e.detail?.fileName ?? null);
  });
}

/** Re-export for draw tools. */
export { getLayerStrokeContext } from './ct-layers.mjs';
