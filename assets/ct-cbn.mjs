/**
 * Color27 — color-by-number mode.
 * CBN pages lock to a house tray with numbered wells; free-draw uses Pastel.
 * Numbers live on a paint-through overlay (see ct-cbn-overlay.mjs).
 */

import { mountCtColorTray } from './ct-color-trays.mjs';
import {
  clearCtCbnOverlay,
  initCtCbnOverlay,
  loadCtCbnOverlayForPage,
} from './ct-cbn-overlay.mjs';

/** Draw-desk tray (shared by all tools when not on a CBN page). */
export const CT27_DRAW_TRAY_ID = 'pastel:chalky';

/** House CBN tray — same brand ten; wells show 1–10. */
export const CT27_CBN_TRAY_ID = 'cbn:house';

/** @type {{ cbn: boolean, trayId: string | null, pageId: string | null, bundleId: string | null }} */
let cbnState = {
  cbn: false,
  trayId: null,
  pageId: null,
  bundleId: null,
};

export function isCtCbnMode() {
  return cbnState.cbn;
}

export function getCtCbnState() {
  return { ...cbnState };
}

/**
 * @param {{
 *   cbn?: boolean,
 *   trayId?: string | null,
 *   pageId?: string | null,
 *   bundleId?: string | null,
 *   pageSrc?: string | null,
 *   layerIndex?: number | null,
 * }} meta
 */
export function applyCtCbnPage(meta = {}) {
  const cbn = !!meta.cbn;
  const trayId = cbn
    ? (meta.trayId && String(meta.trayId)) || CT27_CBN_TRAY_ID
    : CT27_DRAW_TRAY_ID;
  cbnState = {
    cbn,
    trayId,
    pageId: meta.pageId ?? null,
    bundleId: meta.bundleId ?? null,
  };
  mountCtColorTray(trayId, { numbered: cbn });
  window.dispatchEvent(
    new CustomEvent('ct-cbn-mode', {
      detail: { ...cbnState },
    }),
  );

  if (cbn && meta.pageSrc) {
    void loadCtCbnOverlayForPage(String(meta.pageSrc), {
      layerIndex: typeof meta.layerIndex === 'number' ? meta.layerIndex : undefined,
    });
  } else {
    clearCtCbnOverlay();
  }

  return cbnState;
}

/** Clear CBN lock — back to shared Pastel draw tray. */
export function clearCtCbnPage() {
  return applyCtCbnPage({ cbn: false });
}

export function initCtCbn() {
  initCtCbnOverlay();
  clearCtCbnPage();
  window.addEventListener('ct-backpack-page-opened', (e) => {
    const d = e instanceof CustomEvent ? e.detail : null;
    const page = d && typeof d === 'object' ? d.page ?? d : null;
    if (!page || typeof page !== 'object') {
      clearCtCbnPage();
      return;
    }
    applyCtCbnPage({
      cbn: !!page.cbn,
      trayId: page.trayId ?? page.cbnTrayId ?? null,
      pageId: page.id ?? page.pageId ?? null,
      bundleId: page.bundleId ?? d.bundleId ?? null,
      pageSrc: page.src ?? null,
      layerIndex: typeof d.layerIndex === 'number' ? d.layerIndex : null,
    });
  });
  window.addEventListener('ct-backpack-page-cleared', () => {
    clearCtCbnPage();
  });
}
