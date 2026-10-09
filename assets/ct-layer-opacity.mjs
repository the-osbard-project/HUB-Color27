/** Color Time! — Opacity fader ↔ Layers 1–5 + canvas backdrop. */

import { getDrawCanvas } from './ct-canvas.mjs';
import { getBackdropOpacity, setBackdropOpacity } from './ct-canvas-color.mjs';
import { getActiveLayerIndex, getLayerOpacity, setLayerOpacity } from './ct-layers.mjs';

const OPACITY_LABEL = 'Opacity per stroke';

/** @type {'layer' | 'backdrop'} */
let opacityTarget = 'layer';

function opacityInput() {
  return document.querySelector(`.ct-vslider__input[aria-label="${OPACITY_LABEL}"]`);
}

/** @param {number} pct 0–100 */
function writeOpacitySlider(pct) {
  const input = opacityInput();
  if (!(input instanceof HTMLInputElement)) return;
  const v = Math.max(0, Math.min(100, Math.round(pct)));
  input.value = String(v);
}

function syncBackdropTileActive() {
  const bg = document.getElementById('ct-layer-bg');
  bg?.classList.toggle('is-active', opacityTarget === 'backdrop');
  if (opacityTarget === 'backdrop') {
    document.querySelectorAll('.ct-layer-tile[data-layer]').forEach((btn) => {
      btn.classList.remove('is-active');
      btn.setAttribute('aria-pressed', 'false');
    });
  }
}

function syncLiveDrawOpacity() {
  const draw = getDrawCanvas();
  if (!draw) return;
  if (opacityTarget === 'backdrop') {
    draw.style.opacity = '1';
    return;
  }
  draw.style.opacity = String(getLayerOpacity(getActiveLayerIndex()));
}

/** Sync fader + live draw overlay to the current opacity target. */
export function syncOpacitySliderToTarget() {
  if (opacityTarget === 'backdrop') {
    writeOpacitySlider(getBackdropOpacity() * 100);
  } else {
    writeOpacitySlider(getLayerOpacity(getActiveLayerIndex()) * 100);
  }
  syncLiveDrawOpacity();
}

/** @param {number} pct 0–100 */
function applyOpacityFromSlider(pct) {
  const op = Math.max(0, Math.min(1, pct / 100));
  if (opacityTarget === 'backdrop') {
    setBackdropOpacity(op);
    return;
  }
  setLayerOpacity(getActiveLayerIndex(), op);
  syncLiveDrawOpacity();
}

export function selectPaintLayerOpacityTarget() {
  opacityTarget = 'layer';
  document.getElementById('ct-layer-bg')?.classList.remove('is-active');
  const active = getActiveLayerIndex() + 1;
  document.querySelectorAll('.ct-layer-tile[data-layer]').forEach((btn) => {
    const on = Number(btn.getAttribute('data-layer')) === active;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  syncOpacitySliderToTarget();
}

export function selectBackdropOpacityTarget() {
  opacityTarget = 'backdrop';
  syncBackdropTileActive();
  syncOpacitySliderToTarget();
}

export function initCtLayerOpacity() {
  const input = opacityInput();
  input?.addEventListener('input', () => {
    if (!(input instanceof HTMLInputElement)) return;
    applyOpacityFromSlider(Number(input.value));
  });

  window.addEventListener('ct-active-layer-changed', () => {
    selectPaintLayerOpacityTarget();
  });

  /* Same-layer re-click after backdrop — setActiveLayerIndex no-ops, so retarget here. */
  document.querySelectorAll('.ct-layer-tile[data-layer]').forEach((btn) => {
    btn.addEventListener('click', () => {
      selectPaintLayerOpacityTarget();
    });
  });

  document.getElementById('ct-layer-bg')?.addEventListener('click', () => {
    selectBackdropOpacityTarget();
  });

  opacityTarget = 'layer';
  syncOpacitySliderToTarget();
}
