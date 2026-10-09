/** Color Time! — Overclock snap point helper. */

import { CT_CANVAS_SIZE, CT_CANVAS_SIZE_STANDARD, getDrawCanvas } from './ct-canvas.mjs';
import { CT_OVERCLOCK_GRID_DIVISIONS, getCtGridCellPx } from './ct-overclock-grid.mjs';
import { getCtOverclockSnapConfig } from './ct-overclock.mjs';

/** ~14 CSS px magnet — scaled into logical canvas space (critical on 2625 print). */
const SNAP_THRESHOLD_CSS_PX = 14;

/** @returns {number} snap magnet distance in logical canvas px */
export function getCtSnapThresholdLogical() {
  const canvas = getDrawCanvas() ?? document.getElementById('ct-object-overlay');
  if (canvas instanceof HTMLElement) {
    const w = canvas.getBoundingClientRect().width;
    if (w > 1) return Math.max(12, (SNAP_THRESHOLD_CSS_PX * CT_CANVAS_SIZE) / w);
  }
  return Math.max(12, SNAP_THRESHOLD_CSS_PX * (CT_CANVAS_SIZE / CT_CANVAS_SIZE_STANDARD));
}

/**
 * @param {{ w: number, h: number }} canvas
 * @param {{ center?: boolean, edge?: boolean, grid?: boolean }} snap
 */
function collectAxisTargets(canvas, snap) {
  /** @type {number[]} */
  const vertical = [];
  /** @type {number[]} */
  const horizontal = [];

  if (snap.center) {
    vertical.push(canvas.w / 2);
    horizontal.push(canvas.h / 2);
  }
  if (snap.edge) {
    vertical.push(0, canvas.w);
    horizontal.push(0, canvas.h);
  }
  if (snap.grid) {
    const n = CT_OVERCLOCK_GRID_DIVISIONS;
    for (let i = 0; i <= n; i++) {
      vertical.push((canvas.w * i) / n);
      horizontal.push((canvas.h * i) / n);
    }
  }

  return { vertical, horizontal };
}

/** @param {number[]} movingValues @param {number[]} targets @param {number} threshold */
function bestAxisShift(movingValues, targets, threshold) {
  let shift = 0;
  let bestDist = threshold;
  for (const value of movingValues) {
    for (const target of targets) {
      const delta = target - value;
      const dist = Math.abs(delta);
      if (dist < bestDist) {
        bestDist = dist;
        shift = delta;
      }
    }
  }
  return shift;
}

/**
 * @param {number} x
 * @param {number} y
 * @param {{ w?: number, h?: number }} [canvasSize]
 */
export function snapCtStagePoint(x, y, canvasSize = { w: CT_CANVAS_SIZE, h: CT_CANVAS_SIZE }) {
  const snap = getCtOverclockSnapConfig();
  if (!snap.center && !snap.edge && !snap.grid) return { x, y };
  const canvas = { w: canvasSize.w ?? CT_CANVAS_SIZE, h: canvasSize.h ?? CT_CANVAS_SIZE };
  const threshold = getCtSnapThresholdLogical();
  const targets = collectAxisTargets(canvas, snap);
  return {
    x: x + bestAxisShift([x], targets.vertical, threshold),
    y: y + bestAxisShift([y], targets.horizontal, threshold),
  };
}

/** @returns {import('./shapes/snap-guides.mjs').SnapConfig} */
export function getCtSnapGuidesConfig() {
  const snap = getCtOverclockSnapConfig();
  return {
    center: snap.center,
    edge: snap.edge,
    grid: snap.grid,
    gridCell: getCtGridCellPx(),
    gridDivisions: CT_OVERCLOCK_GRID_DIVISIONS,
    objects: false,
    threshold: getCtSnapThresholdLogical(),
  };
}
