import { SHAPE_TYPE_IDS } from './ct-tool-state.mjs';
import { closeCtArrtPopups, positionCtArrtPopup } from './ct-q300-arrt-popup.mjs';
import {
  armCtDialogA11y,
  disarmCtDialogA11y,
  focusCtDialogPanel,
  restoreCtDialogFocus,
} from './ct-dialog-a11y.mjs';

/** @type {readonly { shape: string, label: string, icon: string, tip?: string }[]} */
const SHAPE_OPTIONS = [
  { shape: 'circle', label: 'Circle', icon: 'ph-fill ph-circle' },
  { shape: 'square', label: 'Square', icon: 'ph-fill ph-square' },
  { shape: 'triangle', label: 'Triangle', icon: 'ph-fill ph-triangle' },
  { shape: 'polygon', label: 'Polygon', icon: 'ph-fill ph-polygon' },
  {
    shape: 'line',
    label: 'Line',
    icon: 'ph-fill ph-line-segment',
    tip: 'Drag to draw a straight line. Hold Shift to lock common angles.',
  },
  {
    shape: 'curve',
    label: 'Curve',
    icon: 'ph-fill ph-bezier-curve',
    tip: 'Drag once to set the line, then drag again to bend it into a curve.',
  },
];

/**
 * Color Time! Set — Studio Shapes popup (2×3 grid).
 * @param {{
 *   panel?: HTMLElement | null,
 *   trigger?: HTMLElement | null,
 *   getShapeType?: () => string,
 *   onShapePick?: (shape: string) => void,
 *   setStatus?: (msg: string) => void,
 * }} els
 */
export function attachQ300ShapesPopup(els) {
  const { panel, trigger } = els;
  if (!panel || !trigger) {
    return { close() {}, syncFromState() {}, detach() {} };
  }

  const closeBtn = panel.querySelector('.q300-shapes-popup__close');
  const shapeBtns = panel.querySelectorAll('.q300-shapes-opt[data-shape]');

  if (trigger instanceof HTMLElement) {
    trigger.setAttribute('aria-expanded', 'false');
    trigger.setAttribute('aria-controls', panel.id || '');
  }

  shapeBtns.forEach((btn) => {
    const shape = btn.getAttribute('data-shape');
    const opt = SHAPE_OPTIONS.find((o) => o.shape === shape);
    if (!(btn instanceof HTMLButtonElement) || !opt) return;
    btn.setAttribute('aria-label', opt.tip ? `${opt.label}. ${opt.tip}` : opt.label);
    btn.setAttribute('aria-pressed', 'false');
  });

  function positionPanel() {
    positionCtArrtPopup(panel, trigger);
  }

  function close() {
    panel.hidden = true;
    trigger.setAttribute('aria-expanded', 'false');
    disarmCtDialogA11y();
    restoreCtDialogFocus(trigger);
  }

  function syncFromState() {
    const current = els.getShapeType?.() ?? 'circle';
    shapeBtns.forEach((btn) => {
      const el = /** @type {HTMLButtonElement} */ (btn);
      const isActive = el.getAttribute('data-shape') === current;
      el.classList.toggle('is-active', isActive);
      el.setAttribute('aria-pressed', isActive ? 'true' : 'false');
    });
  }

  function toggle() {
    const show = panel.hidden;
    if (show) {
      closeCtArrtPopups(panel);
      syncFromState();
      panel.hidden = false;
      trigger.setAttribute('aria-expanded', 'true');
      positionPanel();
      armCtDialogA11y(panel, close);
      focusCtDialogPanel(panel);
    } else {
      close();
    }
  }

  function pickShape(shape) {
    if (!SHAPE_TYPE_IDS.includes(shape)) return;
    els.onShapePick?.(shape);
    close();
  }

  trigger.addEventListener('click', (e) => {
    e.stopPropagation();
    toggle();
  });

  closeBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    close();
  });

  shapeBtns.forEach((btn) => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      pickShape(btn.getAttribute('data-shape') || '');
    });
  });

  function onDocPointerDown(e) {
    if (panel.hidden) return;
    const t = /** @type {Node} */ (e.target);
    if (panel.contains(t) || trigger.contains(t)) return;
    close();
  }

  function onResize() {
    if (!panel.hidden) positionPanel();
  }

  document.addEventListener('pointerdown', onDocPointerDown);
  window.addEventListener('resize', onResize);

  return {
    close,
    syncFromState,
    detach() {
      document.removeEventListener('pointerdown', onDocPointerDown);
      window.removeEventListener('resize', onResize);
    },
  };
}

export { SHAPE_OPTIONS };
