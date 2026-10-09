/** Color Time! — per-tool HUD specs (remember last Line/Pressure/color when switching). */

import { getCtStarFxPreset, getCtToolPreset, wellTextureForTool } from './ct-tool-presets.mjs';
import { getActiveStarBrushFx } from './ct-q400.mjs';
import { inheritsColorTray, mountCtColorTrayForTool, applyCtTrayWellTextures } from './ct-color-trays.mjs';
import { activateCtTrayWellIndex, setCtLineColor, syncCtColorTrayMirrors } from './ct-paint-bar.mjs';
import { setCtVSliderByLabel } from './ct-vsliders.mjs';
import { getActiveCtColor } from './ct-color-tray.mjs';

/**
 * @typedef {{
 *   strokeWidth: number,
 *   pressure: number,
 *   strokeColor?: string,
 *   smoothing?: number,
 * }} CtToolHudSpecs
 */

/** @type {Record<string, CtToolHudSpecs>} */
const lastToolSpecs = Object.create(null);

/** @param {string} label */
function readSlider(label) {
  const input = document.querySelector(`.ct-vslider__input[aria-label="${label}"]`);
  if (!(input instanceof HTMLInputElement)) return NaN;
  return Number(input.value);
}

/** Snapshot current gutter HUD for a tool (call before leaving it). */
export function captureCtToolSpecs(toolKey) {
  if (!toolKey) return;
  const strokeWidth = readSlider('Brush size');
  const pressure = readSlider('Pressure');
  /** @type {CtToolHudSpecs} */
  const specs = {
    strokeWidth: Number.isFinite(strokeWidth) ? strokeWidth : 12,
    pressure: Number.isFinite(pressure) ? pressure : 0,
  };
  const color = getActiveCtColor();
  if (color && !inheritsColorTray(toolKey)) {
    specs.strokeColor = color;
  }
  const smoothInput = document.getElementById('ct-overclock-smoothing');
  if (smoothInput instanceof HTMLInputElement && toolKey === 'star') {
    const s = Number(smoothInput.value);
    if (Number.isFinite(s)) specs.smoothing = s;
  }
  lastToolSpecs[toolKey] = specs;
}

/** @param {string} toolKey */
function defaultSpecsForTool(toolKey) {
  const preset = getCtToolPreset(toolKey);
  if (toolKey === 'star') {
    const hud = getCtStarFxPreset(getActiveStarBrushFx());
    return {
      strokeWidth: hud.strokeWidth,
      pressure: hud.pressure,
      strokeColor: hud.strokeColor,
      smoothing: hud.smoothing,
    };
  }
  if (preset) {
    return {
      strokeWidth: preset.strokeWidth,
      pressure: preset.pressure,
      strokeColor: preset.strokeColor,
      smoothing: preset.smoothing,
    };
  }
  /* eraser / bucket / osbard — no factory HUD; keep whatever is on the sliders. */
  return null;
}

/** @param {string} hex */
function normalizeHex(hex) {
  const h = String(hex || '').trim().replace(/^#/, '').toLowerCase();
  if (h.length === 3) return h.split('').map((c) => c + c).join('');
  return h;
}

/** Select tray toe whose well matches hex (after tray mount). */
export function selectCtColorWell(hex) {
  const target = normalizeHex(hex);
  if (!target) return false;

  let matchedIndex = -1;
  document.querySelectorAll('#ct-color-tray .dd-ct-toe').forEach((toe, index) => {
    const well = toe.querySelector('.dd-ct-well');
    if (!(well instanceof HTMLElement)) return;
    const bg = well.dataset.wellColor || well.style.backgroundColor;
    if (!bg) return;
    if (normalizeHex(bg) === target) matchedIndex = index;
  });

  if (matchedIndex < 0) return false;
  activateCtTrayWellIndex(matchedIndex);
  syncCtColorTrayMirrors();
  setCtLineColor(`#${target}`);
  return true;
}

function activeToolKey() {
  const active = document.querySelector('.dd-q400-tool--active');
  if (active instanceof HTMLElement && active.id) {
    return active.id.replace(/^ct-btn-/, '');
  }
  return 'pencil';
}

/** @param {CtToolHudSpecs} hud @param {string} toolKey */
function applyHudSpecs(hud, toolKey) {
  if (Number.isFinite(hud.strokeWidth)) {
    setCtVSliderByLabel('Brush size', hud.strokeWidth);
  }
  if (Number.isFinite(hud.pressure)) {
    setCtVSliderByLabel('Pressure', hud.pressure);
  }
  if (Number.isFinite(hud.smoothing)) {
    const smoothInput = document.getElementById('ct-overclock-smoothing');
    if (smoothInput instanceof HTMLInputElement) {
      smoothInput.value = String(Math.max(0, Math.min(100, Math.round(hud.smoothing))));
      smoothInput.dispatchEvent(new Event('input', { bubbles: true }));
    }
  }
  if (hud.strokeColor && !inheritsColorTray(toolKey)) {
    selectCtColorWell(hud.strokeColor);
  }
}

/** @param {string} toolKey */
export function applyCtToolPreset(toolKey) {
  const preset = getCtToolPreset(toolKey);
  const brushFx = toolKey === 'star' ? getActiveStarBrushFx() : preset?.brushFx;

  if (!inheritsColorTray(toolKey)) {
    mountCtColorTrayForTool(toolKey, { brushFx });
  }

  const remembered = lastToolSpecs[toolKey];
  const hud = remembered ?? defaultSpecsForTool(toolKey);
  if (hud) applyHudSpecs(hud, toolKey);

  const tray = document.getElementById('ct-color-tray');
  if (tray instanceof HTMLElement) {
    tray.dataset.ctWellTexture = wellTextureForTool(toolKey, { brushFx });
    applyCtTrayWellTextures(tray.dataset.ctWellTexture);
  }

  window.dispatchEvent(new CustomEvent('ct-tool-preset-applied', { detail: { toolKey, preset, remembered: !!remembered } }));
}

/**
 * Color Star! mode picked — remount tray + apply remembered fx specs or Studio defaults for that brush-fx.
 * @param {string} brushFx
 */
export function applyCtStarBrushFx(brushFx) {
  if (activeToolKey() !== 'star') return;
  mountCtColorTrayForTool('star', { brushFx });
  const fxKey = `star:${brushFx}`;
  const remembered = lastToolSpecs[fxKey] ?? lastToolSpecs.star;
  const hud = remembered ?? getCtStarFxPreset(brushFx);
  applyHudSpecs(hud, 'star');
  /* Keep plain `star` memory in sync so leaving/returning star restores this fx size. */
  lastToolSpecs.star = { ...hud };
  lastToolSpecs[fxKey] = { ...hud };
  const tray = document.getElementById('ct-color-tray');
  if (tray instanceof HTMLElement) {
    tray.dataset.ctWellTexture = wellTextureForTool('star', { brushFx });
    applyCtTrayWellTextures(tray.dataset.ctWellTexture);
  }
}
