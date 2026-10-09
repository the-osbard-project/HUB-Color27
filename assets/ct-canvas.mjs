/** Color27 — draw surface (MOAS booth 640×720; no 300 PPI). */

import { mountCtLayers } from './ct-layers.mjs';
import { clientToStagePixels, getCanvasPaintRect } from './viewport/stage-coords.mjs';
import { getStageRotationDeg } from './viewport/stage-rotate.mjs';

/** Short-side scale reference (legacy square callers). */
export const CT_CANVAS_SIZE_STANDARD = 640;
export const CT_CANVAS_SIZE_PRINT = 2625;
export const CT_PRINT_DPI = 300;
export const KDP_MARGIN_IN = 0.0625;

/** Factory default — same booth as MOAS. */
export const CT_CANVAS_W_DEFAULT = 640;
export const CT_CANVAS_H_DEFAULT = 720;

const PRINT_CANVAS_STORAGE_KEY = 'ct-overclock-print-canvas';

try {
  localStorage.setItem(PRINT_CANVAS_STORAGE_KEY, '0');
} catch {
  /* ignore */
}

/** Live binding — short side. */
export let CT_CANVAS_SIZE = CT_CANVAS_SIZE_STANDARD;
export let CT_CANVAS_W = CT_CANVAS_W_DEFAULT;
export let CT_CANVAS_H = CT_CANVAS_H_DEFAULT;

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

/** @returns {{ w: number, h: number }} */
export function getCtCanvasDims() {
  return { w: CT_CANVAS_W, h: CT_CANVAS_H };
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
  /* CT27 — print guides never on. */
  mount.classList.remove('ct-canvas-stack--print');
  kdpGuidesRoot?.remove();
  kdpGuidesRoot = null;
  void ensureKdpGuides;
}

function remountLayerStack(mount, w, h) {
  mount.querySelectorAll('.ct-layer-canvas, .ct-layer-stroke-canvas, .ct-layer-float-canvas').forEach((node) => node.remove());
  mountCtLayers(mount, { w, h });
}

/**
 * CT27 keeps a fixed booth. `size` is ignored except legacy callers.
 * @param {number} [_size]
 */
export function applyCtCanvasSize(_size) {
  CT_CANVAS_W = CT_CANVAS_W_DEFAULT;
  CT_CANVAS_H = CT_CANVAS_H_DEFAULT;
  CT_CANVAS_SIZE = Math.min(CT_CANVAS_W, CT_CANVAS_H);

  const mount = getCtCanvasMount();
  if (mount instanceof HTMLElement) {
    remountLayerStack(mount, CT_CANVAS_W, CT_CANVAS_H);
    if (drawCanvas) {
      drawCanvas.width = CT_CANVAS_W;
      drawCanvas.height = CT_CANVAS_H;
      clearDrawSurface();
    }
  }

  syncCtKdpGuides();
  window.dispatchEvent(
    new CustomEvent('ct-canvas-size-changed', {
      detail: { size: CT_CANVAS_SIZE, w: CT_CANVAS_W, h: CT_CANVAS_H },
    }),
  );
}

export function initCtCanvas() {
  const scroll = getCtStageScroll();
  const mount = getCtCanvasMount();
  if (!scroll || !mount) return;

  mount.replaceChildren();
  mount.classList.add('ct-canvas-stack');
  scroll.setAttribute('role', 'region');
  scroll.setAttribute('aria-label', 'Drawing canvas');
  scroll.tabIndex = 0;

  CT_CANVAS_W = CT_CANVAS_W_DEFAULT;
  CT_CANVAS_H = CT_CANVAS_H_DEFAULT;
  CT_CANVAS_SIZE = Math.min(CT_CANVAS_W, CT_CANVAS_H);

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
}

/** Re-export for draw tools. */
export { getLayerStrokeContext } from './ct-layers.mjs';
