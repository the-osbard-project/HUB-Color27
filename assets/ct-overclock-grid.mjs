/** Color Time! — 20×20 fine grid · 4×4 major (5×5 cells each · 42 px @ 840). */

import { CT_CANVAS_SIZE } from './ct-canvas.mjs';

export const CT_OVERCLOCK_GRID_DIVISIONS = 20;
/** Major boxes across/down (each holds divisions/major = 5 fine cells). */
export const CT_OVERCLOCK_GRID_MAJOR = 4;

/** Same red family as KDP margin guides; grid overlay opacity. */
export const CT_GRID_KDP_RED = 'rgba(255, 0, 0, 0.15)';

function gridCellPx() {
  return CT_CANVAS_SIZE / CT_OVERCLOCK_GRID_DIVISIONS;
}

export function getCtGridCellPx() {
  return gridCellPx();
}

/** @type {HTMLElement | null} */
let gridOverlay = null;

export function syncCtOverclockGridColor() {
  if (!(gridOverlay instanceof HTMLElement)) return;
  gridOverlay.style.setProperty('--ct-grid-line', CT_GRID_KDP_RED);
  gridOverlay.style.setProperty('--ct-grid-major-line', CT_GRID_KDP_RED);
}

function syncGridVisibility() {
  if (!(gridOverlay instanceof HTMLElement)) return;
  const on = gridEnabledRef?.() ?? false;
  gridOverlay.hidden = !on;
  gridOverlay.setAttribute('aria-hidden', on ? 'false' : 'true');
}

function syncGridMetrics() {
  if (!(gridOverlay instanceof HTMLElement)) return;
  /* Percent of overlay = always N×N on the CSS stage (not logical-px cells). */
  gridOverlay.style.setProperty('--ct-grid-divisions', String(CT_OVERCLOCK_GRID_DIVISIONS));
  gridOverlay.style.setProperty('--ct-grid-major', String(CT_OVERCLOCK_GRID_MAJOR));
  gridOverlay.style.setProperty('--ct-grid-cell', `${gridCellPx()}px`);
}

/** @type {(() => boolean) | null} */
let gridEnabledRef = null;

/** @param {{ isGridEnabled: () => boolean }} opts */
export function initCtOverclockGrid(opts) {
  gridEnabledRef = opts.isGridEnabled;
  const mount = document.getElementById('dd-stage-scroll');
  if (!(mount instanceof HTMLElement)) return;

  gridOverlay = document.getElementById('ct-grid-overlay');
  if (!(gridOverlay instanceof HTMLElement)) {
    gridOverlay = document.createElement('div');
    gridOverlay.id = 'ct-grid-overlay';
    gridOverlay.className = 'ct-grid-overlay';
    gridOverlay.hidden = true;
    gridOverlay.setAttribute('aria-hidden', 'true');
    mount.appendChild(gridOverlay);
  }

  syncGridMetrics();
  syncGridVisibility();
  syncCtOverclockGridColor();

  window.addEventListener('ct-overclock-grid-changed', syncGridVisibility);
  window.addEventListener('ct-canvas-size-changed', syncGridMetrics);
}
