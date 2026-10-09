/** Studio — q200 zoom, pan, and recenter. */

import { getDrawCanvas } from './ct-canvas.mjs';
import { shouldBlockCtLetterShortcuts } from './ct-shortcuts.mjs';
import { createStageView } from './viewport/stage-view.mjs';

/** @type {ReturnType<typeof createStageView> | null} */
let stageView = null;

export function getCtStageView() {
  return stageView;
}

export function getCtStageZoom() {
  return stageView?.getZoom() ?? 1;
}

export function initCtStageView() {
  const q200El = document.getElementById('q200');
  const scrollEl = document.getElementById('dd-stage-scroll');
  const zoomWrapEl = document.getElementById('ct-stage-zoom-wrap');
  const zoomInnerEl = document.getElementById('ct-stage-zoom-inner');
  const canvasWrapEl = document.getElementById('ct-stage-canvas-wrap');
  const canvas = getDrawCanvas();
  if (!(q200El instanceof HTMLElement) || !(scrollEl instanceof HTMLElement)) return;
  if (!(zoomWrapEl instanceof HTMLElement) || !(zoomInnerEl instanceof HTMLElement)) return;
  if (!(canvasWrapEl instanceof HTMLElement) || !(canvas instanceof HTMLCanvasElement)) return;

  stageView = createStageView({
    q200El,
    scrollEl,
    zoomWrapEl,
    zoomInnerEl,
    canvasWrapEl,
    canvas,
    isTypingTarget: shouldBlockCtLetterShortcuts,
    onZoomKeyRecenter: () => stageView?.zoomToPage(),
  });

  /* 7 = zoom 100% + upright rotate + center (wired inside createStageView.resetView) */

  stageView.attachResizeObserver(q200El);
  stageView.requestLayout({ recenter: true, force: true });

  window.addEventListener('ct-canvas-size-changed', () => {
    stageView?.requestLayout({ force: true, recenter: true });
  });
  window.addEventListener('dd-profile-changed', () => {
    stageView?.scheduleLayout({ force: true });
  });
  window.addEventListener('oss-chrome-change', () => {
    stageView?.scheduleLayout({ force: true, recenter: true });
    window.setTimeout(() => {
      stageView?.requestLayout({ force: true, recenter: true });
    }, 400);
  });
}
