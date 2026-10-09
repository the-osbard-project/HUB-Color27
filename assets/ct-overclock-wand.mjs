/** Color Time! — Overclock magic wand (delete connected pixels). */

import { canvasStagePoint, getDrawCanvas } from './ct-canvas.mjs';
import {
  buildLayerBucketSampleCanvas,
  finalizeLayerAfterWandClear,
  getActiveLayerIndex,
  getLayerContext,
  getLayerStrokeContext,
  refreshLayerTilePreviews,
} from './ct-layers.mjs';
import { CT_WAND_TOLERANCE, setCtSelectBoundingBoxEnabled, isCtSelectBoundingBoxEnabled } from './ct-overclock.mjs';
import { floodClearAtCompositeSample, wandToleranceTo255 } from './draw/ct-flood.mjs';

/** @type {boolean} */
let wandActive = false;

export function isCtOverclockWandActive() {
  return wandActive;
}

/** @param {boolean} next */
export function setCtOverclockWandActive(next) {
  const on = !!next;
  if (on === wandActive) return wandActive;
  wandActive = on;
  document.body.classList.toggle('ct-overclock-wand-active', on);
  syncWandBtn();
  if (on && isCtSelectBoundingBoxEnabled()) {
    setCtSelectBoundingBoxEnabled(false);
  }
  window.dispatchEvent(new CustomEvent('ct-overclock-wand-changed', { detail: { active: on } }));
  return wandActive;
}

function syncWandBtn() {
  const btn = document.getElementById('ct-overclock-wand');
  if (!(btn instanceof HTMLButtonElement)) return;
  btn.setAttribute('aria-pressed', wandActive ? 'true' : 'false');
  btn.classList.toggle('is-active', wandActive);
}

function wandClearAtStage(x, y) {
  const layerIndex = getActiveLayerIndex();
  const sampleCanvas = buildLayerBucketSampleCanvas(layerIndex);
  const sampleCtx = sampleCanvas.getContext('2d');
  const rasterCtx = getLayerContext(layerIndex);
  const strokeCtx = getLayerStrokeContext(layerIndex);
  if (!sampleCtx) return false;

  const writeCtxs = [rasterCtx, strokeCtx].filter(Boolean);
  if (!writeCtxs.length) return false;

  window.dispatchEvent(new Event('ct-history-checkpoint'));

  const tol = wandToleranceTo255(CT_WAND_TOLERANCE);
  const changed = floodClearAtCompositeSample(sampleCtx, writeCtxs, x, y, tol);
  if (!changed) return false;

  finalizeLayerAfterWandClear(layerIndex);
  refreshLayerTilePreviews();
  window.dispatchEvent(new CustomEvent('ct-wand-cleared', { detail: { layerIndex, x, y } }));
  return true;
}

export function initCtOverclockWand() {
  syncWandBtn();

  const btn = document.getElementById('ct-overclock-wand');
  btn?.addEventListener('click', () => {
    setCtOverclockWandActive(!wandActive);
  });

  const canvas = getDrawCanvas();
  if (!(canvas instanceof HTMLCanvasElement)) return;

  canvas.addEventListener('pointerdown', (e) => {
    if (!wandActive || e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    const pt = canvasStagePoint(canvas, e);
    wandClearAtStage(pt.x, pt.y);
  }, true);

  document.querySelectorAll('.dd-q400-tool').forEach((toolBtn) => {
    toolBtn.addEventListener('click', () => {
      if (wandActive) setCtOverclockWandActive(false);
    });
  });
}
