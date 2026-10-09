/**
 * v1 `canvas.js` → `updateCanvasWrapSize()` — 90% vertical fit, zoom-inner positioning, scroll centering.
 * Fixes zoom drift: scale lives on `.oss-stage-zoom-inner`, not the flex-centered wrap.
 */

/** Logical px margin on canvas-wrap for off-canvas strokes (matches v1 pointer clamp). */
export const OFF_CANVAS_MARGIN_PX = 50;

/**
 * Visible q200 bounds — scroll lane size (stable during pan; no q400 rect math).
 * @param {HTMLElement | null} q200El
 * @param {HTMLElement | null} scrollEl
 */
export function getStageAvailableSize(q200El, scrollEl) {
  if (!q200El) return { w: 0, h: 0 };
  // q200 lane size — stable when scrollbars appear mid-pan (avoids pen-up layout thrash).
  return { w: q200El.clientWidth, h: q200El.clientHeight };
}

/**
 * @param {{
 *   q200El: HTMLElement | null,
 *   scrollEl: HTMLElement | null,
 *   zoomWrapEl: HTMLElement | null,
 *   zoomInnerEl: HTMLElement | null,
 *   canvasWrapEl: HTMLElement | null,
 *   canvas: HTMLCanvasElement | null,
 *   gridOverlayEl?: HTMLElement | null,
 *   getZoom: () => number,
 *   isPanning?: () => boolean,
 * }} opts
 */
export function createStageLayout(opts) {
  const {
    q200El,
    scrollEl,
    zoomWrapEl,
    zoomInnerEl,
    canvasWrapEl,
    canvas,
    gridOverlayEl,
    getZoom,
    isPanning,
  } = opts;

  /**
   * @param {{ preserveScroll?: boolean, recenter?: boolean, force?: boolean, adjustScroll?: boolean }} [layoutOpts]
   * preserveScroll — skip all scroll writes (project restore).
   * recenter — snap scroll to canvas center (key 7 / RESET).
   * adjustScroll — ratio-adjust scroll when max range changes (zoom in/out only).
   * force — run even when layout key unchanged.
   * default — restore exact scroll after DOM (pan / Boo / resize).
   */
  let lastLayoutKey = '';
  /** @type {ReturnType<typeof setTimeout> | undefined} */
  let pendingLayoutTimer;
  /** @type {number} */
  let pendingScrollRaf = 0;

  function isPanBlocked() {
    return isPanning?.() ?? false;
  }

  function cancelPendingScrollApply() {
    if (pendingScrollRaf) {
      cancelAnimationFrame(pendingScrollRaf);
      pendingScrollRaf = 0;
    }
  }

  /** @param {() => void} applyFn @param {{ force?: boolean }} [applyOpts] */
  function scheduleScrollApply(applyFn, applyOpts = {}) {
    cancelPendingScrollApply();
    pendingScrollRaf = requestAnimationFrame(() => {
      pendingScrollRaf = 0;
      if (!applyOpts.force && isPanBlocked()) return;
      applyFn();
    });
  }

  function update(layoutOpts = {}) {
    if (!canvasWrapEl || !q200El || !canvas?.width || !canvas?.height) return;
    if (isPanBlocked() && !layoutOpts.recenter && !layoutOpts.force) return;
    cancelPendingScrollApply();

    const logicalW = canvas.width;
    const logicalH = canvas.height;
    const zoom = getZoom();
    const { w: availableW, h: availableH } = getStageAvailableSize(q200El, scrollEl);
    if (!availableW || !availableH) return;

    const savedScrollLeft = scrollEl?.scrollLeft ?? 0;
    const savedScrollTop = scrollEl?.scrollTop ?? 0;

    const oldMaxL =
      scrollEl && !layoutOpts.recenter
        ? Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth)
        : 0;
    const oldMaxT =
      scrollEl && !layoutOpts.recenter
        ? Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight)
        : 0;

    const layoutKey = `${Math.round(availableW)}|${Math.round(availableH)}|${logicalW}|${logicalH}|${zoom}`;
    if (
      !layoutOpts.recenter &&
      !layoutOpts.preserveScroll &&
      !layoutOpts.force &&
      layoutKey === lastLayoutKey
    ) {
      return;
    }
    lastLayoutKey = layoutKey;
    const targetH = 0.9 * availableH;
    const targetW = 0.9 * availableW;

    let scale = targetH / logicalH;
    let displayW = logicalW * scale;
    let displayH = logicalH * scale;
    if (displayW > targetW) {
      scale = targetW / logicalW;
      displayW = targetW;
      displayH = logicalH * scale;
    }

    const m = OFF_CANVAS_MARGIN_PX;
    const padPx = m * (displayW / logicalW);
    const padPy = m * (displayH / logicalH);
    const wrapTotalW = displayW + 2 * padPx;
    const wrapTotalH = displayH + 2 * padPy;

    canvasWrapEl.style.boxSizing = 'content-box';
    canvasWrapEl.style.padding = `${padPy}px ${padPx}px ${padPy}px ${padPx}px`;
    canvasWrapEl.style.width = `${displayW}px`;
    canvasWrapEl.style.height = `${displayH}px`;

    if (canvas.style?.removeProperty) {
      canvas.style.removeProperty('width');
      canvas.style.removeProperty('height');
    }

    if (gridOverlayEl) {
      gridOverlayEl.style.left = `${padPx}px`;
      gridOverlayEl.style.top = `${padPy}px`;
      gridOverlayEl.style.width = `${displayW}px`;
      gridOverlayEl.style.height = `${displayH}px`;
      gridOverlayEl.style.right = 'auto';
      gridOverlayEl.style.bottom = 'auto';
    }

    const scaledW = wrapTotalW * zoom;
    const scaledH = wrapTotalH * zoom;
    /* v1: lane size for scroll padding — scrollEl, not q200 (scrollbar gutter stable) */
    const laneW = scrollEl?.clientWidth ?? availableW;
    const laneH = scrollEl?.clientHeight ?? availableH;
    const vw = laneW;
    const vh = laneH;

    const rawInnerLeft = (1.8 * scaledW - wrapTotalW) / 2;
    const minLeftForCenter = vw / 2 - scaledW / 2;
    let innerLeft = Math.max(0, rawInnerLeft, minLeftForCenter);
    innerLeft += vw / 2;

    const padTop = 0.9 * scaledH;
    const rawInnerTop = padTop + (scaledH - wrapTotalH) / 2;
    const minTopForCenter = vh / 2 - scaledH / 2;
    const innerTop = Math.max(0, rawInnerTop, minTopForCenter);

    if (zoomInnerEl) {
      zoomInnerEl.style.width = `${wrapTotalW}px`;
      zoomInnerEl.style.height = `${wrapTotalH}px`;
      zoomInnerEl.style.transform = zoom === 1 ? '' : `scale(${zoom})`;
      zoomInnerEl.style.transformOrigin = 'center center';
      zoomInnerEl.style.left = `${innerLeft}px`;
      zoomInnerEl.style.top = `${innerTop}px`;
    }

    const contentWidth = 2 * innerLeft + scaledW;
    const contentHeight = vh + 2 * (innerTop + scaledH / 2);

    if (zoomWrapEl) {
      zoomWrapEl.style.width = `${contentWidth}px`;
      zoomWrapEl.style.height = `${contentHeight}px`;
    }

    if (!document.documentElement.classList.contains('ct-stage-laid-out')) {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          document.documentElement.classList.add('ct-stage-laid-out');
        });
      });
    }

    if (scrollEl) {
      scrollEl.classList.add('is-zoomed-in');

      if (layoutOpts.preserveScroll) return;

      const maxL = Math.max(0, contentWidth - scrollEl.clientWidth);
      const maxT = Math.max(0, contentHeight - scrollEl.clientHeight);

      // Pan lives on scroll position — only recenter when explicitly asked (RESET / key 7).
      if (layoutOpts.recenter) {
        const canvasCenterX = innerLeft + scaledW / 2;
        const canvasCenterY = innerTop + scaledH / 2;
        const targetScrollLeft = Math.max(0, Math.min(contentWidth - vw, canvasCenterX - vw / 2));
        const targetScrollTop = Math.max(0, Math.min(contentHeight - vh, canvasCenterY - vh / 2));
        const writeRecenter = () => {
          const maxL2 = Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth);
          const maxT2 = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
          scrollEl.scrollLeft = Math.max(0, Math.min(maxL2, targetScrollLeft));
          scrollEl.scrollTop = Math.max(0, Math.min(maxT2, targetScrollTop));
        };
        writeRecenter();
        scheduleScrollApply(writeRecenter, { force: true });
        return;
      }

      if (layoutOpts.adjustScroll) {
        const savedScrollLeft = scrollEl.scrollLeft;
        const savedScrollTop = scrollEl.scrollTop;
        let nextScrollLeft = savedScrollLeft;
        let nextScrollTop = savedScrollTop;
        if (oldMaxL !== maxL && oldMaxL > 0) {
          nextScrollLeft = (savedScrollLeft / oldMaxL) * maxL;
        }
        if (oldMaxT !== maxT && oldMaxT > 0) {
          nextScrollTop = (savedScrollTop / oldMaxT) * maxT;
        }
        const maxL2 = Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth);
        const maxT2 = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
        scrollEl.scrollLeft = Math.max(0, Math.min(maxL2, nextScrollLeft));
        scrollEl.scrollTop = Math.max(0, Math.min(maxT2, nextScrollTop));
      } else if (!layoutOpts.preserveScroll) {
        const maxL2 = Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth);
        const maxT2 = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
        scrollEl.scrollLeft = Math.max(0, Math.min(maxL2, savedScrollLeft));
        scrollEl.scrollTop = Math.max(0, Math.min(maxT2, savedScrollTop));
      }
      /* Default: restore scroll after DOM writes — lane drag owns position */
    }
  }

  function clearPendingLayout() {
    clearTimeout(pendingLayoutTimer);
    pendingLayoutTimer = undefined;
    cancelPendingScrollApply();
  }

  /** Schedule layout after chrome resize; never runs during an active pan drag. */
  function scheduleUpdate(layoutOpts = {}) {
    if (isPanBlocked() && !layoutOpts.recenter && !layoutOpts.force) return;
    clearPendingLayout();
    pendingLayoutTimer = setTimeout(() => {
      pendingLayoutTimer = undefined;
      if (isPanBlocked() && !layoutOpts.recenter && !layoutOpts.force) return;
      update(layoutOpts);
    }, 50);
  }

  /** @param {HTMLElement | null | undefined} observeEl */
  function attachResizeObserver(observeEl = q200El) {
    if (!observeEl || typeof ResizeObserver === 'undefined') {
      return { detach() {} };
    }
    /** @type {ReturnType<typeof setTimeout> | undefined} */
    let debounceTimer;
    const ro = new ResizeObserver(() => {
      if (isPanBlocked()) return;
      clearTimeout(debounceTimer);
      debounceTimer = setTimeout(() => {
        if (isPanBlocked()) return;
        requestAnimationFrame(() => update());
      }, 120);
    });
    ro.observe(observeEl);
    return {
      detach() {
        clearTimeout(debounceTimer);
        clearTimeout(pendingLayoutTimer);
        ro.disconnect();
      },
    };
  }

  return { update, scheduleUpdate, clearPendingLayout, cancelPendingScrollApply, attachResizeObserver };
}
