/** Color Time! — q300 Arrt popup positioning + toggle (Set · Cast · Props). */

import {
  armCtDialogA11y,
  disarmCtDialogA11y,
  disarmCtDialogA11yIfMatching,
  focusCtDialogPanel,
  restoreCtDialogFocus,
} from './ct-dialog-a11y.mjs';

/** @type {{ panel: HTMLElement, trigger: HTMLElement }[]} */
const registered = [];

/** Close all Arrt popups except optional keep panel. */
export function closeCtArrtPopups(exceptPanel = null) {
  for (const { panel, trigger } of registered) {
    if (panel === exceptPanel) continue;
    disarmCtDialogA11yIfMatching(panel);
    panel.hidden = true;
    trigger.classList.remove('dd-rail-btn--flyout-open');
    trigger.setAttribute('aria-expanded', 'false');
  }
  if (!exceptPanel) {
    disarmCtDialogA11y();
  }
}

function getHullLayout() {
  const viewport = document.getElementById('viewport-container');
  const frame = document.getElementById('dd-frame');
  const scaleRaw = frame
    ? parseFloat(getComputedStyle(frame).getPropertyValue('--dd-scale'))
    : 1;
  const scale = Number.isFinite(scaleRaw) && scaleRaw > 0 ? scaleRaw : 1;
  const styles = getComputedStyle(document.body);
  const w = parseFloat(styles.getPropertyValue('--dd-w'));
  const h = parseFloat(styles.getPropertyValue('--dd-h'));
  return {
    viewport,
    scale,
    hull: { w: w || 1152, h: h || 864 },
  };
}

/**
 * Place popup to the left of the trigger (q300 right rail → toward stage).
 * Uses hull px inside scaled .dd-viewport (same space as Color Star! popups).
 * @param {HTMLElement} panel
 * @param {HTMLElement} trigger
 */
export function positionCtArrtPopup(panel, trigger) {
  const gap = 8;
  const pad = 12;
  const { viewport, scale, hull } = getHullLayout();
  if (!viewport) return;

  panel.style.position = 'absolute';
  panel.style.right = 'auto';
  panel.style.bottom = 'auto';
  panel.style.transform = 'none';
  panel.style.zIndex = '35';

  requestAnimationFrame(() => {
    const v = viewport.getBoundingClientRect();
    const b = trigger.getBoundingClientRect();
    const pw = panel.offsetWidth;
    const ph = panel.offsetHeight;

    let left = (b.left - v.left) / scale - gap - pw;
    let top = (b.top - v.top) / scale;

    left = Math.max(pad, Math.min(left, hull.w - pw - pad));
    top = Math.max(pad, Math.min(top, hull.h - ph - pad));

    panel.style.left = `${left}px`;
    panel.style.top = `${top}px`;
  });
}

/**
 * @param {{
 *   panel: HTMLElement | null,
 *   trigger: HTMLElement | null,
 *   onOpen?: () => void,
 *   onClose?: () => void,
 * }} opts
 */
export function attachCtArrtTogglePopup(opts) {
  const { panel, trigger } = opts;
  if (!panel || !trigger) {
    return { close() {}, detach() {} };
  }

  const closeBtn = panel.querySelector('.q300-shapes-popup__close');
  registered.push({ panel, trigger });

  function close() {
    panel.hidden = true;
    trigger.classList.remove('dd-rail-btn--flyout-open');
    trigger.setAttribute('aria-expanded', 'false');
    disarmCtDialogA11y();
    restoreCtDialogFocus(trigger);
    opts.onClose?.();
  }

  function open() {
    closeCtArrtPopups(panel);
    panel.hidden = false;
    trigger.classList.add('dd-rail-btn--flyout-open');
    trigger.setAttribute('aria-expanded', 'true');
    positionCtArrtPopup(panel, trigger);
    armCtDialogA11y(panel, close);
    focusCtDialogPanel(panel);
    opts.onOpen?.();
  }

  function toggle() {
    if (panel.hidden) open();
    else close();
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });

  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    close();
  });

  function onDocPointerDown(e) {
    if (panel.hidden) return;
    const t = /** @type {Node} */ (e.target);
    if (panel.contains(t) || trigger.contains(t)) return;
    close();
  }

  function onResize() {
    if (!panel.hidden) positionCtArrtPopup(panel, trigger);
  }

  document.addEventListener('pointerdown', onDocPointerDown);
  window.addEventListener('resize', onResize);

  return {
    close,
    open,
    toggle,
    detach() {
      const idx = registered.findIndex((r) => r.panel === panel);
      if (idx >= 0) registered.splice(idx, 1);
      document.removeEventListener('pointerdown', onDocPointerDown);
      window.removeEventListener('resize', onResize);
    },
  };
}
