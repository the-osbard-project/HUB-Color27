/** Color Time! — q400 tool popups + color toe selection (shell UI). */

import { applyCtStarBrushFx } from './ct-tool-hud.mjs';
import { initGlitterStarIcon } from './ct-glitter-icon.mjs';
import { isCtRainbowFx, toggleCtRainbowFx } from './ct-rainbow-fx.mjs';
import {
  armCtDialogA11y,
  disarmCtDialogA11y,
  focusCtDialogPanel,
  restoreCtDialogFocus,
} from './ct-dialog-a11y.mjs';

let openPopup = null;
let openTrigger = null;

function getViewport() {
  return document.getElementById('viewport-container');
}

function getHullScale() {
  const frame = document.getElementById('dd-frame');
  if (!frame) return 1;
  const scale = parseFloat(getComputedStyle(frame).getPropertyValue('--dd-scale'));
  return Number.isFinite(scale) && scale > 0 ? scale : 1;
}

function getHullSize() {
  const styles = getComputedStyle(document.body);
  const w = parseFloat(styles.getPropertyValue('--dd-w'));
  const h = parseFloat(styles.getPropertyValue('--dd-h'));
  return { w: w || 1152, h: h || 864 };
}

/** Anchor inside scaled .dd-viewport (authored hull px, not screen px). */
function anchorPopup(btn, popup, placement = 'above') {
  const viewport = getViewport();
  if (!viewport || !btn || !popup) return;

  const scale = getHullScale();
  const hull = getHullSize();
  const v = viewport.getBoundingClientRect();
  const b = btn.getBoundingClientRect();
  const pw = popup.offsetWidth;
  const ph = popup.offsetHeight;
  const pad = 8;

  let left = (b.left + b.width / 2 - v.left) / scale - pw / 2;
  left = Math.max(pad, Math.min(left, hull.w - pw - pad));

  let top;
  if (placement === 'below') {
    top = (b.bottom - v.top) / scale + pad;
    top = Math.max(pad, Math.min(top, hull.h - ph - pad));
  } else {
    top = (b.top - v.top) / scale - ph - pad;
    top = Math.max(pad, Math.min(top, hull.h - ph - pad));
  }

  popup.style.left = `${left}px`;
  popup.style.top = `${top}px`;
}

export function closeToolPopup() {
  if (!openPopup || !openTrigger) return;
  const trigger = openTrigger;
  openPopup.hidden = true;
  openTrigger.classList.remove('dd-q400-tool--flyout-open');
  openTrigger.setAttribute('aria-expanded', 'false');
  openPopup = null;
  openTrigger = null;
  disarmCtDialogA11y();
  restoreCtDialogFocus(trigger);
}

/** @returns {string} active Color Star! brush-fx id (default Brushy) */
export function getActiveStarBrushFx() {
  const active = document.querySelector('#ct-star-popup .ct-tool-popup__opt--active');
  const fx = active instanceof HTMLElement ? active.dataset.brushFx : null;
  return fx || 'brushy';
}

/** @param {string} brushFx */
export function selectCtStarBrushFx(brushFx) {
  document.querySelectorAll('#ct-star-popup .ct-tool-popup__opt').forEach((opt) => {
    if (!(opt instanceof HTMLElement)) return;
    const on = opt.dataset.brushFx === brushFx;
    opt.classList.toggle('ct-tool-popup__opt--active', on);
    opt.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
  applyCtStarBrushFx(brushFx);
}

function initToolPopup({ triggerId, popupId }) {
  const btn = document.getElementById(triggerId);
  const popup = document.getElementById(popupId);
  const closeBtn = popup?.querySelector('.ct-tool-popup__close');
  if (!btn || !popup) return;

  btn.classList.add('dd-q400-tool--has-popup');
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-controls', popupId);

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const willOpen = popup.hidden;
    closeToolPopup();
    if (willOpen) {
      window.dispatchEvent(new Event('dd-close-hub'));
      popup.hidden = false;
      btn.classList.add('dd-q400-tool--flyout-open');
      btn.setAttribute('aria-expanded', 'true');
      openPopup = popup;
      openTrigger = btn;
      armCtDialogA11y(popup, closeToolPopup);
      focusCtDialogPanel(popup);
      requestAnimationFrame(() => anchorPopup(btn, popup));
    }
  });

  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    closeToolPopup();
  });

  popup.querySelectorAll('.ct-tool-popup__opt').forEach((opt) => {
    if (opt instanceof HTMLElement) {
      opt.setAttribute('aria-pressed', opt.classList.contains('ct-tool-popup__opt--active') ? 'true' : 'false');
    }
    opt.addEventListener('click', () => {
      popup.querySelectorAll('.ct-tool-popup__opt--active').forEach((el) => {
        el.classList.remove('ct-tool-popup__opt--active');
        if (el instanceof HTMLElement) el.setAttribute('aria-pressed', 'false');
      });
      opt.classList.add('ct-tool-popup__opt--active');
      if (opt instanceof HTMLElement) opt.setAttribute('aria-pressed', 'true');
      if (triggerId === 'ct-btn-star') {
        const fx = opt instanceof HTMLElement ? opt.dataset.brushFx : null;
        if (fx) applyCtStarBrushFx(fx);
      }
    });
  });

  popup.addEventListener('click', (e) => e.stopPropagation());

  if (popupId === 'ct-star-popup') {
    document.addEventListener(
      'pointerdown',
      (e) => {
        if (popup.hidden) return;
        if (popup.contains(e.target)) return;
        if (btn.contains(e.target)) return;
        closeToolPopup();
      },
      true,
    );
  }
}

function initColorTray() {
  /* Wells wired in ct-paint-bar.mjs (q400 + CT HUB trays). */
}

function schedulePopupAnchor() {
  requestAnimationFrame(() => {
    if (openPopup && openTrigger) anchorPopup(openTrigger, openPopup);
  });
}

function initStarRainbowButton() {
  const btn = document.getElementById('ct-star-rainbow');
  if (!(btn instanceof HTMLElement)) return;
  const sync = () => {
    btn.setAttribute('aria-pressed', isCtRainbowFx() ? 'true' : 'false');
  };
  sync();
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleCtRainbowFx();
    sync();
  });
  window.addEventListener('ct-rainbow-fx', sync);
}

export function initCtQ400() {
  initToolPopup({ triggerId: 'ct-btn-star', popupId: 'ct-star-popup' });
  initStarRainbowButton();
  const brushyOpt = document.querySelector('#ct-star-popup [data-brush-fx="brushy"]');
  if (brushyOpt instanceof HTMLElement) {
    brushyOpt.classList.add('ct-tool-popup__opt--active');
    brushyOpt.setAttribute('aria-pressed', 'true');
  }
  initColorTray();
  initGlitterStarIcon();

  window.addEventListener('resize', schedulePopupAnchor);
  window.addEventListener('dd-profile-changed', schedulePopupAnchor);
}
