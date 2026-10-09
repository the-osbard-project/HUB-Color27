/**
 * Stage chrome — Peeka-Boo / rails focus (hide q100/q300 + glass desk).
 * Chrome button lives in Window & UI popup; **A** still toggles.
 */

import { shouldBlockCtLetterShortcuts } from './ct-shortcuts.mjs';

const DESK_SIZE_KEY = 'oss-desk-size';
const CHROME_OPAQUE_KEY = 'oss-chrome-opaque';
const LEGACY_CHROME_COLLAPSED_KEY = 'oss-chrome-collapsed';
const CHROME_LAYOUT_SYNC_MS = 360;

/** @typedef {'standard' | 'hidden'} DeskSize */

const PEEK_HOLD_MS = 4000;
const PEEK_EDGE_PX = 16;

/** @type {{
 *   railsHidden: boolean,
 *   chromeOpaque: boolean,
 *   setStageFocus: (on: boolean, persist?: boolean) => void,
 *   toggleStageFocus: () => void,
 * } | null} */
let chromeApi = null;

export function isCtStageFocusOn() {
  return !!(chromeApi?.railsHidden && !chromeApi?.chromeOpaque);
}

export function toggleCtStageFocus() {
  chromeApi?.toggleStageFocus();
}

/** @param {boolean} on */
export function setCtStageFocus(on) {
  chromeApi?.setStageFocus(!!on);
}

/** Sync Peeka-Boo popcorn + Rails opt (solid = show/rails visible, faded = hide). */
export function syncCtRailsToggleUi() {
  const hidden = isCtStageFocusOn();
  const peeka = document.getElementById('ct-btn-peeka');
  if (peeka instanceof HTMLElement) {
    peeka.setAttribute('aria-pressed', hidden ? 'true' : 'false');
    peeka.classList.toggle('dd-q400-tool--active', hidden);
    peeka.title = hidden ? 'Show rails (A)' : 'Peeka-Boo (A)';
    peeka.setAttribute('aria-label', hidden ? 'Show rails (A)' : 'Peeka-Boo (A)');
  }
  const btn = document.getElementById('ct-window-rails');
  if (!(btn instanceof HTMLElement)) return;
  btn.setAttribute('aria-pressed', hidden ? 'true' : 'false');
  btn.classList.toggle('ct-tool-popup__opt--active', hidden);
  btn.classList.toggle('ct-window-rails--hidden', hidden);
  const icon = btn.querySelector('i');
  if (icon instanceof HTMLElement) {
    icon.className = 'ph-fill ph-ghost';
    icon.setAttribute('aria-hidden', 'true');
  }
  const label = btn.querySelector('span');
  if (label) label.textContent = hidden ? 'Show' : 'Hide';
  btn.title = hidden ? 'Show rails (A)' : 'Hide rails (A)';
}

/**
 * @param {{
 *   onLayoutSync?: () => void,
 *   onPeekaChange?: (glass: boolean) => void,
 *   onChromeChange?: (collapsed: boolean) => void,
 * }} [opts]
 */
export function attachStageChrome(opts = {}) {
  const onLayoutSync = opts.onLayoutSync ?? (() => {});
  const onPeekaChange = opts.onPeekaChange ?? (() => {});
  const onChromeChange = opts.onChromeChange ?? (() => {});

  let railsHidden = false;
  let chromeOpaque = true;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let chromeLayoutSyncTimer = null;
  /** @type {'left' | 'right' | null} */
  let peekSide = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let peekHideTimer = null;

  function isPhoneStack() {
    const root = document.documentElement;
    return (
      root.classList.contains('dd-layout--phone-stack') ||
      root.classList.contains('dd-layout--phone-wide-stack')
    );
  }

  function peekShouldHold() {
    if (peekSide === 'left' && document.getElementById('q100')?.matches(':hover')) return true;
    if (peekSide === 'right' && document.getElementById('q300')?.matches(':hover')) return true;
    return !!document.querySelector('.q300-shapes-popup:not([hidden]), .ct-q100-popup:not([hidden])');
  }

  function schedulePeekHide() {
    if (peekHideTimer) clearTimeout(peekHideTimer);
    peekHideTimer = setTimeout(() => {
      peekHideTimer = null;
      if (peekShouldHold()) {
        schedulePeekHide();
        return;
      }
      clearPeek();
    }, PEEK_HOLD_MS);
  }

  /** @param {'left' | 'right'} side */
  function setPeek(side) {
    if (peekSide !== side) {
      peekSide = side;
      document.body.classList.toggle('oss-chrome-peek-left', side === 'left');
      document.body.classList.toggle('oss-chrome-peek-right', side === 'right');
      syncChromePanelsLayout();
    }
    schedulePeekHide();
  }

  function clearPeek() {
    if (peekHideTimer) {
      clearTimeout(peekHideTimer);
      peekHideTimer = null;
    }
    if (!peekSide) {
      document.body.classList.remove('oss-chrome-peek-left', 'oss-chrome-peek-right');
      return;
    }
    peekSide = null;
    document.body.classList.remove('oss-chrome-peek-left', 'oss-chrome-peek-right');
    syncChromePanelsLayout();
  }

  function syncChromePanelsLayout() {
    if (chromeLayoutSyncTimer) clearTimeout(chromeLayoutSyncTimer);
    chromeLayoutSyncTimer = setTimeout(() => {
      chromeLayoutSyncTimer = null;
      onLayoutSync();
    }, CHROME_LAYOUT_SYNC_MS);
  }

  function syncDeskBodyClasses() {
    document.body.classList.remove('oss-desk-standard', 'oss-desk-compact', 'oss-desk-hidden', 'oss-huds-hidden');
    document.body.classList.add(railsHidden ? 'oss-desk-hidden' : 'oss-desk-standard');
    document.body.classList.toggle('oss-chrome-collapsed', railsHidden);
    document.body.classList.toggle('oss-chrome-locked', railsHidden);
    document.body.classList.toggle('oss-chrome-opaque', chromeOpaque);
    document.body.classList.toggle('oss-chrome-glass', !chromeOpaque);
    syncChromePanelsLayout();
  }

  function notifyFocusUi() {
    syncCtRailsToggleUi();
    try {
      window.dispatchEvent(
        new CustomEvent('ct-rails-focus-changed', {
          detail: { hidden: railsHidden && !chromeOpaque },
        }),
      );
    } catch {
      /* ignore */
    }
  }

  function persistState() {
    try {
      localStorage.setItem(DESK_SIZE_KEY, railsHidden ? 'hidden' : 'standard');
      if (railsHidden) localStorage.setItem(LEGACY_CHROME_COLLAPSED_KEY, '1');
      else localStorage.removeItem(LEGACY_CHROME_COLLAPSED_KEY);
      if (chromeOpaque) localStorage.setItem(CHROME_OPAQUE_KEY, '1');
      else localStorage.setItem(CHROME_OPAQUE_KEY, '0');
    } catch {
      /* ignore */
    }
  }

  /**
   * @param {boolean} on
   * @param {boolean} [persist]
   */
  function setStageFocus(on, persist = true) {
    if (!on) clearPeek();
    railsHidden = !!on;
    chromeOpaque = !on;
    if (persist) persistState();
    syncDeskBodyClasses();
    notifyFocusUi();
    onPeekaChange(!chromeOpaque);
    onChromeChange(railsHidden);
    try {
      window.dispatchEvent(
        new CustomEvent('oss-chrome-change', { detail: { collapsed: railsHidden } }),
      );
    } catch {
      /* ignore */
    }
  }

  function toggleStageFocus() {
    setStageFocus(!(railsHidden && !chromeOpaque));
  }

  /**
   * @param {boolean} opaque
   * @param {boolean} [persist]
   */
  function setChromeOpaque(opaque, persist = true) {
    setStageFocus(!opaque, persist);
  }

  function toggleChromeOpaque() {
    toggleStageFocus();
  }

  /**
   * @param {DeskSize} size
   * @param {boolean} [persist]
   */
  function setDeskSize(size, persist = true) {
    setStageFocus(size === 'hidden', persist);
  }

  function toggleRailsHidden() {
    toggleStageFocus();
  }

  try {
    const saved = localStorage.getItem(DESK_SIZE_KEY);
    if (saved === 'compact') {
      try {
        localStorage.setItem(DESK_SIZE_KEY, 'standard');
      } catch {
        /* ignore */
      }
    }
    const hiddenSaved = saved === 'hidden' || localStorage.getItem(LEGACY_CHROME_COLLAPSED_KEY) === '1';
    const glassSaved = localStorage.getItem(CHROME_OPAQUE_KEY) === '0';
    if (hiddenSaved || glassSaved) {
      railsHidden = true;
      chromeOpaque = false;
    }
  } catch {
    /* ignore */
  }

  chromeApi = {
    get railsHidden() {
      return railsHidden;
    },
    get chromeOpaque() {
      return chromeOpaque;
    },
    setStageFocus,
    toggleStageFocus,
  };

  syncDeskBodyClasses();
  notifyFocusUi();
  onChromeChange(railsHidden);

  function onStageChromeKeyDown(e) {
    if (e.key !== 'a' && e.key !== 'A') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.repeat || shouldBlockCtLetterShortcuts(e)) return;
    e.preventDefault();
    toggleStageFocus();
  }

  window.addEventListener('keydown', onStageChromeKeyDown);

  function onPeekPointerMove(e) {
    if (!railsHidden || isPhoneStack()) return;
    if (e.buttons) return;
    const x = e.clientX;
    const w = window.innerWidth;
    if (x <= PEEK_EDGE_PX) {
      setPeek('left');
      return;
    }
    if (x >= w - PEEK_EDGE_PX) {
      setPeek('right');
      return;
    }
    if (peekShouldHold() && peekHideTimer) {
      clearTimeout(peekHideTimer);
      peekHideTimer = null;
    } else if (peekSide && !peekHideTimer) {
      schedulePeekHide();
    }
  }

  window.addEventListener('pointermove', onPeekPointerMove, { passive: true });

  /**
   * @param {boolean} collapsed
   * @param {boolean} [persist]
   */
  function setChromeCollapsed(collapsed, persist = true) {
    setDeskSize(collapsed ? 'hidden' : 'standard', persist);
  }

  return {
    getDeskSize: () => (railsHidden ? 'hidden' : 'standard'),
    setDeskSize,
    toggleRailsHidden,
    isChromeOpaque: () => chromeOpaque,
    setChromeOpaque,
    toggleChromeOpaque,
    togglePeeka: toggleChromeOpaque,
    isChromeHidden: () => railsHidden,
    isChromeLocked: () => railsHidden,
    setChromeCollapsed,
    setChromeCollapsedLocked: setChromeCollapsed,
    detach() {
      chromeApi = null;
      window.removeEventListener('keydown', onStageChromeKeyDown);
      window.removeEventListener('pointermove', onPeekPointerMove);
      if (chromeLayoutSyncTimer) clearTimeout(chromeLayoutSyncTimer);
      clearPeek();
    },
  };
}
