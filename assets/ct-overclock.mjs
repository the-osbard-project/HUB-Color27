/** Color Time! — Overclock Tools prefs + popup wiring (q300 dock). */

import { applyCtCanvasSize, CT_CANVAS_SIZE, CT_CANVAS_SIZE_PRINT, CT_CANVAS_SIZE_STANDARD } from './ct-canvas.mjs';
import {
  CT_OVERCLOCK_GRID_DIVISIONS,
  initCtOverclockGrid,
  syncCtOverclockGridColor,
} from './ct-overclock-grid.mjs';
import {
  initCtOverclockWand,
  isCtOverclockWandActive,
  setCtOverclockWandActive,
} from './ct-overclock-wand.mjs';

export { isCtOverclockWandActive, CT_OVERCLOCK_GRID_DIVISIONS };

export const CT_WAND_TOLERANCE = 32;

const STORAGE = {
  selectBox: 'ct-overclock-select-bbox',
  grid: 'ct-overclock-grid',
  snap: 'ct-overclock-snap',
  smoothing: 'ct-overclock-smoothing',
  simplify: 'ct-overclock-simplify',
  mix: 'ct-overclock-mix',
  smudge: 'ct-overclock-smudge',
  printCanvas: 'ct-overclock-print-canvas',
};

/** @type {boolean} */
let printCanvasPref = readBool(STORAGE.printCanvas, false);
/** @type {boolean} */
let printCanvasLocked = false;

/** @type {boolean} */
let selectBoxEnabled = readBool(STORAGE.selectBox, false);
/** @type {boolean} */
let gridEnabled = readBool(STORAGE.grid, false);
/** @type {boolean} */
let snapEnabled = readBool(STORAGE.snap, false);

/** @param {string} key @param {boolean} fallback */
function readBool(key, fallback) {
  try {
    const v = localStorage.getItem(key);
    if (v === '1') return true;
    if (v === '0') return false;
  } catch {
    /* ignore */
  }
  return fallback;
}

/** @param {string} key @param {boolean} value */
function writeBool(key, value) {
  try {
    localStorage.setItem(key, value ? '1' : '0');
  } catch {
    /* ignore */
  }
}

/** @param {string} id */
function overclockInput(id) {
  const el = document.getElementById(id);
  return el instanceof HTMLInputElement ? el : null;
}

/** @param {string} id */
function overclockBtn(id) {
  const el = document.getElementById(id);
  return el instanceof HTMLButtonElement ? el : null;
}

/** @param {HTMLButtonElement} btn @param {boolean} on */
function syncToggleBtn(btn, on) {
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  btn.classList.toggle('is-active', on);
}

export function isCtSelectBoundingBoxEnabled() {
  return selectBoxEnabled;
}

/** @param {boolean} next */
export function setCtSelectBoundingBoxEnabled(next) {
  const on = !!next;
  if (on === selectBoxEnabled) return selectBoxEnabled;
  selectBoxEnabled = on;
  writeBool(STORAGE.selectBox, on);
  syncToggleBtn(overclockBtn('ct-overclock-select-box'), on);
  if (on && isCtOverclockWandActive()) {
    setCtOverclockWandActive(false);
  }
  window.dispatchEvent(new CustomEvent('ct-select-bbox-changed', { detail: { enabled: on } }));
  return selectBoxEnabled;
}

export function isCtOverclockGridEnabled() {
  return gridEnabled;
}

/** @param {boolean} next */
export function setCtOverclockGridEnabled(next) {
  const on = !!next;
  if (on === gridEnabled) return gridEnabled;
  gridEnabled = on;
  writeBool(STORAGE.grid, on);
  syncToggleBtn(overclockBtn('ct-overclock-grid'), on);
  window.dispatchEvent(new CustomEvent('ct-overclock-grid-changed', { detail: { enabled: on } }));
  return gridEnabled;
}

export function isCtOverclockSnapEnabled() {
  return snapEnabled;
}

/** @param {boolean} next */
export function setCtOverclockSnapEnabled(next) {
  const on = !!next;
  if (on === snapEnabled) return snapEnabled;
  snapEnabled = on;
  writeBool(STORAGE.snap, on);
  syncToggleBtn(overclockBtn('ct-overclock-snap'), on);
  window.dispatchEvent(new CustomEvent('ct-overclock-snap-changed', { detail: { enabled: on } }));
  return snapEnabled;
}

/** @returns {{ center: boolean, edge: boolean, grid: boolean }} */
export function getCtOverclockSnapConfig() {
  if (!snapEnabled) {
    return { center: false, edge: false, grid: false };
  }
  return { center: true, edge: true, grid: true };
}

/** CT27 — no Smoothing fader; baked high for clean kid lines. */
export function getCtOverclockSmoothing() {
  const input = overclockInput('ct-overclock-smoothing');
  if (!input) return 72;
  const v = Number(input.value);
  return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 72;
}

/** CT27 — no Simplify fader; mild bake. */
export function getCtOverclockSimplify() {
  const input = overclockInput('ct-overclock-simplify');
  if (!input) return 28;
  const v = Number(input.value);
  return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 28;
}

export function getCtOverclockMix() {
  const input = overclockInput('ct-overclock-mix');
  const v = input ? Number(input.value) : 50;
  return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 50;
}

export function getCtOverclockSmudge() {
  const input = overclockInput('ct-overclock-smudge');
  const v = input ? Number(input.value) : 100;
  return Number.isFinite(v) ? Math.max(0, Math.min(100, Math.round(v))) : 100;
}

function restoreSliderPrefs() {
  try {
    const smooth = localStorage.getItem(STORAGE.smoothing);
    const simplify = localStorage.getItem(STORAGE.simplify);
    const mix = localStorage.getItem(STORAGE.mix);
    const smudge = localStorage.getItem(STORAGE.smudge);
    const smoothInput = overclockInput('ct-overclock-smoothing');
    const simplifyInput = overclockInput('ct-overclock-simplify');
    const mixInput = overclockInput('ct-overclock-mix');
    const smudgeInput = overclockInput('ct-overclock-smudge');
    if (smoothInput && smooth != null && smooth !== '') {
      smoothInput.value = String(Math.max(0, Math.min(100, Math.round(Number(smooth)))));
    }
    if (simplifyInput && simplify != null && simplify !== '') {
      simplifyInput.value = String(Math.max(0, Math.min(100, Math.round(Number(simplify)))));
    }
    if (mixInput && mix != null && mix !== '') {
      mixInput.value = String(Math.max(0, Math.min(100, Math.round(Number(mix)))));
    }
    if (smudgeInput && smudge != null && smudge !== '') {
      smudgeInput.value = String(Math.max(0, Math.min(100, Math.round(Number(smudge)))));
    }
  } catch {
    /* ignore */
  }
}

function wireSliderPersist(input, storageKey) {
  input.addEventListener('input', () => {
    try {
      localStorage.setItem(storageKey, input.value);
    } catch {
      /* ignore */
    }
    window.dispatchEvent(new CustomEvent('ct-overclock-hud-changed'));
  });
}

function wireToggleBtn(id, getter, setter) {
  const btn = overclockBtn(id);
  if (!btn) return;
  syncToggleBtn(btn, getter());
  btn.addEventListener('click', () => {
    setter(!getter());
  });
}

export function isCtPrintCanvasPref() {
  return printCanvasPref;
}

export function isCtPrintCanvasLocked() {
  return printCanvasLocked;
}

/** @param {boolean} locked */
export function setCtPrintCanvasLocked(locked) {
  printCanvasLocked = !!locked;
  syncPrintCanvasCheckboxUi();
}

function syncPrintCanvasCheckboxUi() {
  const input = overclockInput('ct-overclock-print-canvas');
  const label = document.getElementById('ct-overclock-print-canvas-label');
  if (input) {
    input.checked = printCanvasLocked
      ? CT_CANVAS_SIZE === CT_CANVAS_SIZE_PRINT
      : printCanvasPref;
    input.disabled = printCanvasLocked;
  }
  if (label instanceof HTMLElement) {
    label.classList.toggle('is-locked', printCanvasLocked);
  }
}

/** @param {boolean} next @param {{ applyNow?: boolean }} [opts] */
export function setCtPrintCanvasPref(next, { applyNow = false } = {}) {
  const on = !!next;
  printCanvasPref = on;
  writeBool(STORAGE.printCanvas, on);
  const input = overclockInput('ct-overclock-print-canvas');
  if (input) input.checked = on;
  if (applyNow && !printCanvasLocked) {
    applyCtCanvasSize(on ? CT_CANVAS_SIZE_PRINT : CT_CANVAS_SIZE_STANDARD);
  }
  syncPrintCanvasCheckboxUi();
}

function wirePrintCanvasCheckbox() {
  const input = overclockInput('ct-overclock-print-canvas');
  if (!input) return;
  input.checked = printCanvasPref;
  input.addEventListener('change', () => {
    if (printCanvasLocked) {
      input.checked = CT_CANVAS_SIZE === CT_CANVAS_SIZE_PRINT;
      return;
    }
    setCtPrintCanvasPref(input.checked, { applyNow: true });
  });
  syncPrintCanvasCheckboxUi();
}

export function initCtOverclock() {
  /* CT27 — print-ready removed from Overclock; keep desk canvas only. */
  try {
    setCtPrintCanvasPref(false, { applyNow: false });
  } catch {
    /* ignore */
  }
  restoreSliderPrefs();

  const smoothInput = overclockInput('ct-overclock-smoothing');
  const simplifyInput = overclockInput('ct-overclock-simplify');
  const mixInput = overclockInput('ct-overclock-mix');
  const smudgeInput = overclockInput('ct-overclock-smudge');
  if (smoothInput) wireSliderPersist(smoothInput, STORAGE.smoothing);
  if (simplifyInput) wireSliderPersist(simplifyInput, STORAGE.simplify);
  if (mixInput) wireSliderPersist(mixInput, STORAGE.mix);
  if (smudgeInput) wireSliderPersist(smudgeInput, STORAGE.smudge);

  // Always start Select OFF (arrange mode is opt-in for the session).
  selectBoxEnabled = false;
  writeBool(STORAGE.selectBox, false);

  wireToggleBtn('ct-overclock-select-box', isCtSelectBoundingBoxEnabled, setCtSelectBoundingBoxEnabled);
  wireToggleBtn('ct-overclock-grid', isCtOverclockGridEnabled, setCtOverclockGridEnabled);
  wireToggleBtn('ct-overclock-snap', isCtOverclockSnapEnabled, setCtOverclockSnapEnabled);

  wireActionBtn('ct-overclock-flatten-layer', () => {
    window.dispatchEvent(new Event('ct-flatten-layer'));
  });
  wireActionBtn('ct-overclock-flatten-canvas', () => {
    window.dispatchEvent(new Event('ct-flatten-canvas'));
  });
  wireActionBtn('ct-overclock-copy', () => {
    window.dispatchEvent(new Event('ct-copy-floating'));
  });
  wireActionBtn('ct-overclock-paste', () => {
    window.dispatchEvent(new Event('ct-paste-floating'));
  });

  initCtOverclockGrid({ isGridEnabled: isCtOverclockGridEnabled });
  initCtOverclockWand();
  syncCtOverclockGridColor();
  wirePrintCanvasCheckbox();

  syncToggleBtn(overclockBtn('ct-overclock-select-box'), false);

  window.addEventListener('ct-canvas-bg-changed', syncCtOverclockGridColor);
  window.addEventListener('ct-canvas-size-changed', syncPrintCanvasCheckboxUi);
}

/** @param {string} id @param {() => void} onClick */
function wireActionBtn(id, onClick) {
  const btn = overclockBtn(id);
  if (!btn) return;
  btn.addEventListener('click', () => onClick());
}
