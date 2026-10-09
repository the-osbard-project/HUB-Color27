/** Color Time! — backpack images on a paint layer (active layer by default). */

import {
  clearLayer,
  loadRasterToLayer,
  getLayerCanvas,
  getLayerContext,
  CT_BACKPACK_LAYER_INDEX,
} from './ct-layers.mjs';
import { CT_CANVAS_SIZE } from './ct-canvas.mjs';

/** @returns {HTMLCanvasElement | null} */
export function getLineArtCanvas() {
  return getLayerCanvas(CT_BACKPACK_LAYER_INDEX);
}

/** @returns {CanvasRenderingContext2D | null} */
export function getLineArtContext() {
  return getLayerContext(CT_BACKPACK_LAYER_INDEX);
}

/** @deprecated use mountCtLayers via initCtCanvas */
export function mountLineArtCanvas() {}

export function clearCtLineArt() {
  clearLayer(CT_BACKPACK_LAYER_INDEX);
}

/**
 * @param {string} src
 * @param {number} size
 */
export function loadCtLineArt(src, size = CT_CANVAS_SIZE) {
  return loadRasterToLayer(CT_BACKPACK_LAYER_INDEX, src, size);
}

/**
 * @param {number} layerIndex 0-based
 * @param {string} src
 * @param {number} size
 * @param {{ skipHistory?: boolean, fit?: 'stretch' | 'contain' | 'actual' | 'ask' }} [opts]
 */
export function loadCtLineArtToLayer(layerIndex, src, size = CT_CANVAS_SIZE, opts = {}) {
  return loadRasterToLayer(layerIndex, src, size, opts);
}
