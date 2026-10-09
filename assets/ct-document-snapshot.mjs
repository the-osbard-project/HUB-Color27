/** Color Time! — full document snapshot for undo / save. */

import { getCtStrokes, setCtStrokes } from './ct-draw.mjs';
import { exportLayerState, restoreLayerVisualState } from './ct-layers.mjs';
import {
  getBackdropOpacity,
  getCanvasColorSliderValue,
  setBackdropOpacity,
  setCanvasColorSlider,
} from './ct-canvas-color.mjs';
import { exportFloatingState, restoreFloatingState } from './ct-stage-objects.mjs';

/** @typedef {{ strokes: object[], layers: ReturnType<typeof exportLayerState>, canvasColor: number, backdropOpacity: number, floating: ReturnType<typeof exportFloatingState> }} CtDocumentSnapshot */

/** @returns {CtDocumentSnapshot} */
export function captureCtDocumentSnapshot() {
  return {
    strokes: structuredClone(getCtStrokes()),
    layers: exportLayerState(),
    canvasColor: getCanvasColorSliderValue(),
    backdropOpacity: getBackdropOpacity(),
    floating: exportFloatingState(),
  };
}

/** @param {CtDocumentSnapshot} snap */
export async function applyCtDocumentSnapshot(snap) {
  if (snap.canvasColor != null) setCanvasColorSlider(snap.canvasColor);
  if (snap.backdropOpacity != null) setBackdropOpacity(snap.backdropOpacity, { skipEvent: true });
  await restoreLayerVisualState(snap.layers);
  setCtStrokes(snap.strokes ?? []);
  restoreFloatingState(snap.floating);
}
