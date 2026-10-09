/** Color Time! — dialog Escape, focus trap, and hidden-panel tabbing. */

const FOCUSABLE =
  'button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])';

/** @type {{ panel: HTMLElement, onClose: () => void } | null} */
let activeDialog = null;

/** @type {((e: KeyboardEvent) => void) | null} */
let escapeListener = null;

/** @type {((e: KeyboardEvent) => void) | null} */
let trapListener = null;

/** @param {HTMLElement} root */
function focusableElements(root) {
  return [...root.querySelectorAll(FOCUSABLE)].filter((el) => {
    if (!(el instanceof HTMLElement)) return false;
    if (el.closest('[hidden]')) return false;
    return el.getClientRects().length > 0;
  });
}

export function isCtDialogA11yActive() {
  return activeDialog != null;
}

/** @param {HTMLElement} panel */
export function disarmCtDialogA11yIfMatching(panel) {
  if (activeDialog?.panel === panel) disarmCtDialogA11y();
}

export function disarmCtDialogA11y() {
  if (activeDialog) {
    syncCtPanelTabbing(activeDialog.panel, false);
    activeDialog = null;
  }
  if (escapeListener) {
    document.removeEventListener('keydown', escapeListener);
    escapeListener = null;
  }
  if (trapListener) {
    document.removeEventListener('keydown', trapListener);
    trapListener = null;
  }
}

/** @deprecated use disarmCtDialogA11y */
export function disarmCtDialogEscape() {
  disarmCtDialogA11y();
}

/**
 * @param {HTMLElement} panel
 * @param {() => void} onClose
 */
export function armCtDialogA11y(panel, onClose) {
  disarmCtDialogA11y();
  activeDialog = { panel, onClose };
  syncCtPanelTabbing(panel, true);

  escapeListener = (e) => {
    if (e.key !== 'Escape') return;
    e.preventDefault();
    e.stopImmediatePropagation();
    const close = activeDialog?.onClose;
    disarmCtDialogA11y();
    close?.();
  };

  trapListener = (e) => {
    if (e.key !== 'Tab' || !activeDialog || activeDialog.panel !== panel) return;
    const nodes = focusableElements(panel);
    if (!nodes.length) return;
    const first = nodes[0];
    const last = nodes[nodes.length - 1];
    const active = document.activeElement;
    if (e.shiftKey) {
      if (active === first || !panel.contains(active)) {
        e.preventDefault();
        last.focus();
      }
    } else if (active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  document.addEventListener('keydown', escapeListener);
  document.addEventListener('keydown', trapListener);
}

/**
 * @param {HTMLElement} panel
 * @param {boolean} open
 */
export function syncCtPanelTabbing(panel, open) {
  if (!(panel instanceof HTMLElement)) return;
  panel.querySelectorAll(FOCUSABLE).forEach((el) => {
    if (!(el instanceof HTMLElement)) return;
    if (open) {
      if ('ctTabSaved' in el.dataset) {
        const saved = el.dataset.ctTabSaved;
        if (saved === '') el.removeAttribute('tabindex');
        else el.tabIndex = Number(saved);
        delete el.dataset.ctTabSaved;
      }
      return;
    }
    if (!('ctTabSaved' in el.dataset)) {
      el.dataset.ctTabSaved = el.hasAttribute('tabindex') ? String(el.tabIndex) : '';
    }
    el.tabIndex = -1;
  });
}

/** One-time: keep closed overlays out of the tab order. */
export function initCtHiddenPanels() {
  const ids = [
    'ct-osbard-popup',
    'ct-star-popup',
    'ct-set-popup',
    'ct-cast-popup',
    'ct-props-popup',
    'ct-overclock-popup',
    'ct-save-as-popup',
    'oss-hpp',
    'ct-hub-info',
    'ct-hub-legal',
  ];
  for (const id of ids) {
    const el = document.getElementById(id);
    if (!(el instanceof HTMLElement)) continue;
    const hubOpen = id === 'oss-hpp' && el.classList.contains('is-open');
    syncCtPanelTabbing(el, !el.hidden && hubOpen);
  }
}

/**
 * @param {HTMLElement} panel
 */
export function focusCtDialogPanel(panel) {
  requestAnimationFrame(() => {
    const closeBtn = panel.querySelector(
      '.ct-tool-popup__close, .q300-shapes-popup__close, .ct-save-as__cancel, .dd-hub-head__close, .ct-hub-info__close, .ct-hub-legal__close, [aria-label="Close"]',
    );
    if (closeBtn instanceof HTMLElement) {
      closeBtn.focus();
      return;
    }
    const first = panel.querySelector(FOCUSABLE);
    if (first instanceof HTMLElement) first.focus();
  });
}

/** @param {HTMLElement | null | undefined} trigger */
export function restoreCtDialogFocus(trigger) {
  if (trigger instanceof HTMLElement) trigger.focus();
}
