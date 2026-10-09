/** Color Time! — rainbow canvas-color slider ↔ stage backdrop + q300 thumb. */

import { fillCanvasBackground } from './ct-canvas.mjs';

/** Top of rainbow slider — white canvas backdrop. */
export const CT_CANVAS_COLOR_TOP = 100;

/** Snapshot / save sentinel — legacy transparent backdrop. */
export const CT_CANVAS_COLOR_TRANSPARENT = -1;

/** @deprecated legacy save value */
const CT_CANVAS_COLOR_TRANSPARENT_LEGACY = 101;

/** White (top) → rainbow → black (bottom); matches slider gradient. */
const CANVAS_COLOR_STOPS = [
  [100, [255, 255, 255]],
  [91, [239, 35, 60]],
  [82, [255, 112, 255]],
  [73, [255, 140, 0]],
  [64, [255, 193, 7]],
  [55, [56, 176, 0]],
  [46, [0, 194, 168]],
  [37, [0, 135, 249]],
  [28, [88, 54, 181]],
  [19, [161, 61, 45]],
  [10, [74, 74, 74]],
  [0, [0, 0, 0]],
];

/** Fresh desk / New — transparent page (stage still looks white for paper preview). */
let canvasBgTransparent = true;

/** Free hex from the page-color thumb. Null while the slider owns the color. */
let canvasHex = null;

/** One undo step for a drag across the rainbow field. */
let fieldSnap = false;

const FIELD_STOPS = [[255, 34, 85], [255, 204, 0], [51, 221, 51], [51, 170, 255], [153, 51, 255]];

/** 0–1 — fades desk paper without affecting paint layers. */
let backdropOpacity = 1;

function lerp(a, b, t) {
  return Math.round(a + (b - a) * t);
}

/** @param {string} value */
function isHexColor(value) {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

/** @param {number | string | null | undefined} value */
export function isCanvasBackgroundTransparent(value) {
  if (isHexColor(String(value ?? ''))) return false;
  const n = Number(value);
  if (n === CT_CANVAS_COLOR_TRANSPARENT || n === CT_CANVAS_COLOR_TRANSPARENT_LEGACY) return true;
  return canvasBgTransparent;
}

/** @param {string} hex @returns {[number, number, number] | null} */
function hexToRgb(hex) {
  if (!isHexColor(hex)) return null;
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

/** @param {[number, number, number]} rgb */
function rgbToHex(rgb) {
  return `#${rgb.map((n) => n.toString(16).padStart(2, '0')).join('')}`;
}

/** @param {number | string} value 0–100 @returns {[number, number, number] | null} */
export function canvasColorRgbAt(value) {
  if (isHexColor(String(value))) return hexToRgb(String(value));
  if (isCanvasBackgroundTransparent(value)) return null;
  const v = Number(value);
  for (let i = 0; i < CANVAS_COLOR_STOPS.length - 1; i += 1) {
    const [vHi, rgbHi] = CANVAS_COLOR_STOPS[i];
    const [vLo, rgbLo] = CANVAS_COLOR_STOPS[i + 1];
    if (v <= vHi && v >= vLo) {
      const t = (v - vLo) / (vHi - vLo);
      return [
        lerp(rgbLo[0], rgbHi[0], t),
        lerp(rgbLo[1], rgbHi[1], t),
        lerp(rgbLo[2], rgbHi[2], t),
      ];
    }
  }
  return [0, 0, 0];
}

/** @param {number | string} value 0–100 */
export function canvasColorAt(value) {
  const rgb = canvasColorRgbAt(value);
  if (!rgb) return 'transparent';
  return `rgb(${rgb[0]}, ${rgb[1]}, ${rgb[2]})`;
}

/** @returns {number} 0–1 */
export function getBackdropOpacity() {
  return backdropOpacity;
}

/**
 * @param {number} opacity 0–1
 * @param {{ skipEvent?: boolean }} [opts]
 */
export function setBackdropOpacity(opacity, opts = {}) {
  const next = Math.max(0, Math.min(1, Number(opacity)));
  if (!Number.isFinite(next)) return;
  if (Math.abs(backdropOpacity - next) < 0.0005) {
    reapplyBackdropPaint();
    return;
  }
  backdropOpacity = next;
  reapplyBackdropPaint();
  if (!opts.skipEvent) {
    window.dispatchEvent(new CustomEvent('ct-backdrop-opacity-changed', { detail: { opacity: next } }));
  }
}

export function resetBackdropOpacity() {
  backdropOpacity = 1;
  reapplyBackdropPaint();
}

function layerBgFillEl() {
  return document.getElementById('ct-layer-bg-fill');
}

function canvasColorInputEl() {
  return document.getElementById('ct-canvas-color');
}

function stageBackdropCss() {
  if (canvasBgTransparent) return '#ffffff';
  if (canvasHex) {
    const rgb = hexToRgb(canvasHex);
    if (!rgb) return 'transparent';
    return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${backdropOpacity})`;
  }
  const input = canvasColorInputEl();
  const v = input instanceof HTMLInputElement ? Number(input.value) : 100;
  const rgb = canvasColorRgbAt(v);
  if (!rgb) return 'transparent';
  return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${backdropOpacity})`;
}

/** Live page color, including a custom hex and backdrop opacity. */
export function getCanvasBackgroundCss() {
  return stageBackdropCss();
}

function reapplyBackdropPaint() {
  if (canvasBgTransparent) {
    applyTransparentUi();
    return;
  }
  const input = canvasColorInputEl();
  const v = input instanceof HTMLInputElement ? Number(input.value) : 100;
  applyColorUi(v);
}

function applyTransparentUi() {
  const layerBgBtn = document.getElementById('ct-layer-bg');
  fillCanvasBackground('#ffffff');
  layerBgBtn?.classList.add('ct-layer-bg--transparent');
  layerBgBtn?.style.removeProperty('--ct-layer-bg-preview');
  const hex = document.getElementById('ct-page-hex-input');
  if (hex instanceof HTMLInputElement && document.activeElement !== hex) hex.value = '';
}

function applyColorUi(v) {
  const layerBgBtn = document.getElementById('ct-layer-bg');
  const css = stageBackdropCss();
  fillCanvasBackground(css);
  if (layerBgBtn instanceof HTMLElement) {
    layerBgBtn.classList.remove('ct-layer-bg--transparent');
    layerBgBtn.style.removeProperty('--ct-layer-bg-preview');
  }
  const hex = document.getElementById('ct-page-hex-input');
  if (hex instanceof HTMLInputElement && document.activeElement !== hex && !canvasHex) {
    const rgb = canvasColorRgbAt(v);
    if (rgb) hex.value = rgbToHex(rgb);
  }
}

/** Sync rainbow slider, stage mount, and q300 backdrop thumb. */
export function syncCanvasColorUi(value) {
  const input = canvasColorInputEl();
  if (!(input instanceof HTMLInputElement)) return;

  const raw = Number(value);
  if (isCanvasBackgroundTransparent(value)) {
    canvasBgTransparent = true;
    applyTransparentUi();
    return;
  }

  canvasBgTransparent = false;
  const v = Math.max(0, Math.min(100, Number.isFinite(raw) ? raw : 100));
  input.value = String(v);
  applyColorUi(v);
}

/** @param {number | string} value 0–100, #rrggbb, or CT_CANVAS_COLOR_TRANSPARENT */
export function setCanvasColorSlider(value) {
  if (isHexColor(String(value))) {
    canvasBgTransparent = false;
    canvasHex = String(value).toLowerCase();
    applyColorUi(canvasHex);
    const hex = document.getElementById('ct-page-hex-input');
    if (hex instanceof HTMLInputElement) hex.value = canvasHex;
    return;
  }
  canvasHex = null;
  syncCanvasColorUi(value);
}

export function getCanvasColorSliderValue() {
  if (canvasBgTransparent) return CT_CANVAS_COLOR_TRANSPARENT;
  if (canvasHex) return canvasHex;
  const input = canvasColorInputEl();
  return input instanceof HTMLInputElement ? Number(input.value) : 100;
}

/** @param {{ skipHistory?: boolean }} [opts] */
export function resetCanvasColorSliderToTop(opts = {}) {
  if (!opts.skipHistory) {
    window.dispatchEvent(new Event('ct-history-checkpoint'));
  }
  backdropOpacity = 1;
  canvasHex = null;
  syncCanvasColorUi(CT_CANVAS_COLOR_TOP);
  window.dispatchEvent(new Event('ct-canvas-bg-changed'));
}

function mixRgb(a, b, t) {
  return a.map((v, i) => Math.round(v + (b[i] - v) * t));
}

function sampleField(tx, ty) {
  const t = Math.min(1, Math.max(0, tx)) * (FIELD_STOPS.length - 1);
  const i = Math.min(FIELD_STOPS.length - 2, Math.floor(t));
  let rgb = mixRgb(FIELD_STOPS[i], FIELD_STOPS[i + 1], t - i);
  const y = Math.min(1, Math.max(0, ty));
  if (y < 0.5) rgb = mixRgb([255, 255, 255], rgb, y / 0.5);
  else rgb = mixRgb(rgb, [28, 16, 36], (y - 0.5) / 0.5);
  return rgbToHex(rgb);
}

function fieldImage() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const ctx = canvas.getContext('2d');
  if (!ctx) return '';
  const img = ctx.createImageData(64, 64);
  for (let y = 0; y < 64; y += 1) {
    for (let x = 0; x < 64; x += 1) {
      const n = parseInt(sampleField(x / 63, y / 63).slice(1), 16);
      const p = (y * 64 + x) * 4;
      img.data[p] = (n >> 16) & 255;
      img.data[p + 1] = (n >> 8) & 255;
      img.data[p + 2] = n & 255;
      img.data[p + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  return canvas.toDataURL();
}

function showColorField(on) {
  const fill = layerBgFillEl();
  const btn = document.getElementById('ct-layer-bg');
  if (!(fill instanceof HTMLElement)) return;
  if (!on) {
    fill.style.background = '';
    btn?.classList.remove('is-field');
    fieldSnap = false;
    return;
  }
  if (!fill.dataset.field) fill.dataset.field = fieldImage();
  fill.style.background = `center / 100% 100% no-repeat url("${fill.dataset.field}")`;
  btn?.classList.add('is-field');
}

function closeHexUi() {
  const wrap = document.getElementById('ct-page-hex');
  const pick = document.getElementById('ct-layer-bg-rainbow');
  if (wrap instanceof HTMLElement) wrap.hidden = true;
  pick?.setAttribute('aria-expanded', 'false');
  showColorField(false);
}

/**
 * Transparent page (PNG/WebP keep alpha). Stage still shows white paper for desk preview.
 * @param {{ skipHistory?: boolean }} [opts]
 */
export function resetCanvasColorToTransparent(opts = {}) {
  closeHexUi();
  if (canvasBgTransparent && !canvasHex) {
    applyTransparentUi();
    return;
  }
  if (!opts.skipHistory) {
    window.dispatchEvent(new Event('ct-history-checkpoint'));
  }
  canvasHex = null;
  backdropOpacity = 1;
  canvasBgTransparent = true;
  applyTransparentUi();
  window.dispatchEvent(new Event('ct-canvas-bg-changed'));
}

function currentHexForField() {
  if (canvasHex) return canvasHex;
  if (canvasBgTransparent) return '';
  const input = canvasColorInputEl();
  const v = input instanceof HTMLInputElement ? Number(input.value) : 100;
  const rgb = canvasColorRgbAt(v);
  return rgb ? rgbToHex(rgb) : '';
}

function wirePageColorThumb() {
  const pick = document.getElementById('ct-layer-bg-rainbow');
  const wrap = document.getElementById('ct-page-hex');
  const hex = document.getElementById('ct-page-hex-input');
  const thumb = document.getElementById('ct-layer-bg');
  const clear = document.getElementById('ct-layer-bg-clear');

  pick?.addEventListener('click', (event) => {
    event.stopPropagation();
    event.preventDefault();
    if (!(wrap instanceof HTMLElement)) return;
    const closing = !wrap.hidden;
    if (closing) {
      const raw = hex instanceof HTMLInputElement ? hex.value.trim() : '';
      const next = (raw.startsWith('#') ? raw : `#${raw}`).toLowerCase();
      if (isHexColor(next) && next !== currentHexForField()) {
        window.dispatchEvent(new Event('ct-history-checkpoint'));
        setCanvasColorSlider(next);
        window.dispatchEvent(new Event('ct-canvas-bg-changed'));
      }
      closeHexUi();
      return;
    }
    wrap.hidden = false;
    pick.setAttribute('aria-expanded', 'true');
    if (hex instanceof HTMLInputElement) {
      hex.value = currentHexForField();
      hex.focus();
    }
    showColorField(true);
  });

  hex?.addEventListener('change', () => {
    if (!(hex instanceof HTMLInputElement)) return;
    const raw = hex.value.trim();
    const next = raw.startsWith('#') ? raw : `#${raw}`;
    if (!isHexColor(next)) return;
    window.dispatchEvent(new Event('ct-history-checkpoint'));
    setCanvasColorSlider(next.toLowerCase());
    window.dispatchEvent(new Event('ct-canvas-bg-changed'));
  });

  thumb?.addEventListener('pointerdown', (event) => {
    if (!(wrap instanceof HTMLElement) || wrap.hidden || event.button !== 0) return;
    event.preventDefault();
    event.stopPropagation();
    if (!fieldSnap) {
      window.dispatchEvent(new Event('ct-history-checkpoint'));
      fieldSnap = true;
    }
    const apply = (ev) => {
      const rect = thumb.getBoundingClientRect();
      const x = (ev.clientX - rect.left) / rect.width;
      const y = (ev.clientY - rect.top) / rect.height;
      setCanvasColorSlider(sampleField(x, y));
      window.dispatchEvent(new Event('ct-canvas-bg-changed'));
    };
    apply(event);
    const move = (ev) => apply(ev);
    const up = () => {
      window.removeEventListener('pointermove', move);
      window.removeEventListener('pointerup', up);
    };
    window.addEventListener('pointermove', move);
    window.addEventListener('pointerup', up);
  });

  clear?.addEventListener('click', (event) => {
    event.stopPropagation();
    event.preventDefault();
    resetCanvasColorToTransparent();
  });
}

export function initCanvasColor() {
  const canvasColorInput = canvasColorInputEl();

  function applyCanvasColor() {
    if (!canvasColorInput) return;
    canvasHex = null;
    canvasBgTransparent = false;
    syncCanvasColorUi(canvasColorInput.value);
    window.dispatchEvent(new Event('ct-canvas-bg-changed'));
  }

  canvasColorInput?.addEventListener('input', applyCanvasColor);
  wirePageColorThumb();

  resetCanvasColorToTransparent({ skipHistory: true });
}
