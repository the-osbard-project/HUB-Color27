export const ZOOM_MIN = 0.5;
export const ZOOM_MAX = 2;
export const ZOOM_STEP = 0.1;

/**
 * Stage view zoom — 50%–200%.
 * @param {{
 *   onChange?: (zoom: number) => void,
 *   onLayout?: (options?: { preserveScroll?: boolean, recenter?: boolean, adjustScroll?: boolean }) => void,
 * }} opts
 */
export function createStageZoom(opts = {}) {
  const { onChange, onLayout } = opts;
  let zoom = 1;

  function setZoom(z, options = {}) {
    zoom = Math.max(ZOOM_MIN, Math.min(ZOOM_MAX, z));
    onLayout?.(options);
    onChange?.(zoom);
  }

  function zoomIn() {
    setZoom(zoom + ZOOM_STEP, { adjustScroll: true });
  }

  function zoomOut() {
    setZoom(zoom - ZOOM_STEP, { adjustScroll: true });
  }

  function reset() {
    setZoom(1, { recenter: true });
  }

  function zoomToPage() {
    setZoom(1, { recenter: true });
  }

  /**
   * @param {HTMLElement | null | undefined} wheelEl
   */
  function attachShiftWheelZoom(wheelEl) {
    if (!wheelEl) return { detach() {} };
    const onWheel = (e) => {
      if (!e.shiftKey) return;
      e.preventDefault();
      e.stopPropagation();
      const dy = e.deltaY !== 0 ? e.deltaY : e.deltaX;
      if (dy > 0) zoomOut();
      else zoomIn();
    };
    wheelEl.addEventListener('wheel', onWheel, { passive: false, capture: true });
    return {
      detach() {
        wheelEl.removeEventListener('wheel', onWheel, { capture: true });
      },
    };
  }

  return {
    getZoom: () => zoom,
    setZoom,
    zoomIn,
    zoomOut,
    reset,
    zoomToPage,
    attachShiftWheelZoom,
  };
}

/**
 * = zoom in, - zoom out, 7 = 100% + center.
 * @param {ReturnType<typeof createStageZoom>} stageZoom
 * @param {{ onRecenter?: () => void, isBlocked?: (e: KeyboardEvent) => boolean }} opts
 */
export function attachZoomKeys(stageZoom, opts = {}) {
  const isBlocked = opts.isBlocked ?? (() => false);

  function onKeyDown(e) {
    if (isBlocked(e)) return;
    if (e.key === '=' || e.key === '+' || e.code === 'Equal' || e.code === 'NumpadAdd') {
      e.preventDefault();
      stageZoom.zoomIn();
      return;
    }
    if (e.key === '-' || e.code === 'Minus' || e.code === 'NumpadSubtract') {
      e.preventDefault();
      stageZoom.zoomOut();
      return;
    }
    if (e.code === 'Digit7' || e.code === 'Numpad7' || e.key === '7') {
      e.preventDefault();
      if (opts.onRecenter) opts.onRecenter();
      else stageZoom.zoomToPage();
    }
  }

  window.addEventListener('keydown', onKeyDown);
  return {
    detach() {
      window.removeEventListener('keydown', onKeyDown);
    },
  };
}
