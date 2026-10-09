/** Color Time! — q300 Arrt: layers + Set (Studio Shapes popup). */



import { attachQ300ShapesPopup } from './ct-q300-shapes-popup.mjs';
import { attachCtArrtTogglePopup } from './ct-q300-arrt-popup.mjs';

import { attachShapeTool } from './shapes/shape-tool.mjs';

import {

  setCtCanvasSessionMode,

} from './ct-canvas.mjs';

import {
  getActiveLayerIndex,

  getLayerCanvas,

  initCtLayerTiles,
  initCtLayerReorder,

  redrawLayer,

} from './ct-layers.mjs';

import { placeFloatingShape } from './ct-stage-objects.mjs';
import { isCtSelectBoundingBoxEnabled, setCtSelectBoundingBoxEnabled } from './ct-overclock.mjs';

import {

  getCtSessionMode,

  getCtShapeType,

  setCtSessionMode,

  setCtShapeType,

} from './ct-tool-state.mjs';

import { getActiveCtColor, getActiveCtFillColor } from './ct-color-tray.mjs';
import { brushSizeFromSlider } from './ct-draw-pencil.mjs';



/** @type {ReturnType<typeof attachShapeTool> | null} */

let shapeTool = null;



function sliderValue(label) {

  const input = document.querySelector(`.ct-vslider__input[aria-label="${label}"]`);

  return input instanceof HTMLInputElement ? Number(input.value) : 50;

}



function strokeWidthFromHud() {
  return brushSizeFromSlider(sliderValue('Brush size'));
}

/** @param {object} el */
function commitShapeElement(el) {
  const layerIndex = getActiveLayerIndex();
  placeFloatingShape(el, layerIndex);
}



function detachShapeTool() {

  shapeTool?.detach?.();

  shapeTool?.clearPolygonState?.();

  shapeTool = null;

}



function attachShapeToolToActiveLayer() {

  detachShapeTool();

  const canvas = getLayerCanvas(getActiveLayerIndex());

  if (!(canvas instanceof HTMLCanvasElement)) return;



  shapeTool = attachShapeTool(canvas, {

    screenToStage: (x, y) => {

      const r = canvas.getBoundingClientRect();

      return {

        x: ((x - r.left) / r.width) * canvas.width,

        y: ((y - r.top) / r.height) * canvas.height,

      };

    },

    getShapeType: getCtShapeType,

    getStrokeColor: getActiveCtColor,

    getFillColor: getActiveCtFillColor,

    getLineWidth: strokeWidthFromHud,

    getEndcap: () => 'round',

    getRounded: () => {
      const input = document.getElementById('ct-rounded');
      if (!(input instanceof HTMLInputElement)) return 0;
      const v = Math.round(Number(input.value));
      return Number.isFinite(v) ? Math.max(0, Math.min(50, v)) : 0;
    },

    redrawStage: () => redrawLayer(getActiveLayerIndex()),

    onElementCommit: (el) => commitShapeElement(el),

  });

}



function applySessionMode(mode) {

  setCtCanvasSessionMode(mode);

  const setBtn = document.getElementById('ct-btn-set');

  setBtn?.classList.toggle('dd-rail-btn--active', mode === 'shape');



  if (mode === 'shape') {
    if (isCtSelectBoundingBoxEnabled()) setCtSelectBoundingBoxEnabled(false);
    attachShapeToolToActiveLayer();

  } else {

    detachShapeTool();

  }

  window.dispatchEvent(new CustomEvent('ct-session-mode-changed', { detail: { mode } }));
}



function enterShapeMode() {

  setCtSessionMode('shape');

  applySessionMode('shape');

}



function enterDrawMode() {

  setCtSessionMode('draw');

  applySessionMode('draw');

}



export function initCtQ300() {

  initCtLayerTiles();
  initCtLayerReorder();



  const setBtn = document.getElementById('ct-btn-set');

  const popup = document.getElementById('ct-set-popup');



  attachQ300ShapesPopup({

    panel: popup,

    trigger: setBtn,

    getShapeType: getCtShapeType,

    onShapePick: (shape) => {

      setCtShapeType(shape);

      enterShapeMode();

    },

  });

  attachCtArrtTogglePopup({
    panel: document.getElementById('ct-overclock-popup'),
    trigger: document.getElementById('ct-btn-overclock'),
  });



  setBtn?.addEventListener('click', () => {

    if (getCtSessionMode() !== 'shape') {

      enterShapeMode();

    }

  });



  document.querySelectorAll('.dd-q400-tool').forEach((btn) => {

    btn.addEventListener('click', () => {

      if (getCtSessionMode() === 'shape') enterDrawMode();

    });

  });



  window.addEventListener('ct-active-layer-changed', () => {

    if (getCtSessionMode() === 'shape') attachShapeToolToActiveLayer();

  });



  window.addEventListener('ct-backpack-layer-full', () => {

    const el = document.getElementById('dd-toast');

    if (el instanceof HTMLElement) {

      el.textContent = 'All layers are full — clear a layer first';

      el.hidden = false;

      window.setTimeout(() => { el.hidden = true; }, 3200);

    }

  });



  applySessionMode('draw');

}


