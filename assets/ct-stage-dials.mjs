/**
 * Gutter dials — Ro' Tater (right) + Zoom popup (left).
 */

import { attachRotaterDial } from './viewport/stage-rotater-dial.mjs';
import { getCtStageView } from './ct-stage-view.mjs';

/** @type {HTMLElement | null} */
let zoomPopup = null;
/** @type {HTMLButtonElement | null} */
let zoomBtn = null;
/** @type {ReturnType<typeof attachRotaterDial> | null} */
let rotater = null;

function ensureZoomPopup() {
  if (zoomPopup) return zoomPopup;
  const el = document.createElement('div');
  el.id = 'ct-zoom-popup';
  el.className = 'ct-zoom-popup';
  el.hidden = true;
  el.setAttribute('role', 'dialog');
  el.setAttribute('aria-label', 'Canvas zoom');
  el.innerHTML = `
    <div class="ct-zoom-popup__head">
      <p class="ct-zoom-popup__title">Zoom</p>
      <button type="button" class="ct-zoom-popup__close" aria-label="Close zoom" title="Close">
        <i class="ph-fill ph-x" aria-hidden="true"></i>
      </button>
    </div>
    <div class="ct-zoom-popup__body" role="group" aria-label="Zoom in or out">
      <button type="button" class="ct-zoom-popup__btn" data-ct-zoom="in" aria-label="Zoom in" title="Zoom in">
        <i class="ph-fill ph-magnifying-glass-plus" aria-hidden="true"></i>
      </button>
      <button type="button" class="ct-zoom-popup__btn" data-ct-zoom="out" aria-label="Zoom out" title="Zoom out">
        <i class="ph-fill ph-magnifying-glass-minus" aria-hidden="true"></i>
      </button>
    </div>
  `;
  document.body.appendChild(el);
  zoomPopup = el;

  el.querySelector('.ct-zoom-popup__close')?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeZoomPopup();
  });
  el.querySelectorAll('[data-ct-zoom]').forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      const view = getCtStageView();
      if (!view) return;
      const dir = btn.getAttribute('data-ct-zoom');
      if (dir === 'in') view.zoomIn();
      else if (dir === 'out') view.zoomOut();
    });
  });

  return el;
}

function placeZoomPopup() {
  const popup = ensureZoomPopup();
  if (!(zoomBtn instanceof HTMLElement)) return;
  const r = zoomBtn.getBoundingClientRect();
  const pad = 8;
  popup.hidden = false;
  const pw = popup.offsetWidth || 140;
  const ph = popup.offsetHeight || 96;
  let left = r.right + pad;
  let top = r.bottom - ph;
  if (left + pw > window.innerWidth - 8) left = Math.max(8, r.left - pw - pad);
  if (top < 8) top = 8;
  if (top + ph > window.innerHeight - 8) top = Math.max(8, window.innerHeight - ph - 8);
  popup.style.left = `${Math.round(left)}px`;
  popup.style.top = `${Math.round(top)}px`;
}

export function closeZoomPopup() {
  if (!zoomPopup || zoomPopup.hidden) return;
  zoomPopup.hidden = true;
  zoomBtn?.setAttribute('aria-expanded', 'false');
}

function openZoomPopup() {
  ensureZoomPopup();
  placeZoomPopup();
  zoomBtn?.setAttribute('aria-expanded', 'true');
}

function toggleZoomPopup() {
  if (zoomPopup && !zoomPopup.hidden) closeZoomPopup();
  else openZoomPopup();
}

/** @param {MouseEvent} e */
function onDocPointerDown(e) {
  if (!zoomPopup || zoomPopup.hidden) return;
  const t = e.target;
  if (!(t instanceof Node)) return;
  if (zoomPopup.contains(t) || zoomBtn?.contains(t)) return;
  closeZoomPopup();
}

/** @param {KeyboardEvent} e */
function onDocKeyDown(e) {
  if (e.key === 'Escape' && zoomPopup && !zoomPopup.hidden) {
    e.preventDefault();
    closeZoomPopup();
  }
}

export function initCtStageDials() {
  const rotaterBtn = document.getElementById('ct-stage-rotater');
  const zBtn = document.getElementById('ct-stage-zoom');
  const view = getCtStageView();

  if (rotaterBtn instanceof HTMLElement && view?.stageRotate) {
    rotater?.detach();
    rotater = attachRotaterDial({
      btn: rotaterBtn,
      getRotationDeg: () => view.stageRotate.getRotationDeg(),
      setRotationDeg: (deg, opts) => view.stageRotate.setRotationDeg(deg, opts),
      onChange: () => rotater?.syncDial(),
    });
    window.addEventListener('ct-stage-rotation-changed', () => rotater?.syncDial());
  }

  if (zBtn instanceof HTMLButtonElement) {
    zoomBtn = zBtn;
    zBtn.setAttribute('aria-haspopup', 'dialog');
    zBtn.setAttribute('aria-expanded', 'false');
    zBtn.setAttribute('aria-controls', 'ct-zoom-popup');
    zBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleZoomPopup();
    });
  }

  document.addEventListener('pointerdown', onDocPointerDown, true);
  document.addEventListener('keydown', onDocKeyDown);
}
