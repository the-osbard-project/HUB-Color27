/**
 * q200 lane scroll pan:
 * - drag margins outside the canvas (primary button)
 * - hold G + drag anywhere in the lane (mouse / pen)
 * - middle-button (wheel-click) drag anywhere in the lane
 */

/** @param {EventTarget | null} el */
function isFormTyping(el) {
  if (!(el instanceof HTMLElement)) return false;
  if (el.isContentEditable) return true;
  const tag = el.tagName;
  if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  return !!el.closest?.('input, textarea, select, [contenteditable="true"], [contenteditable=""]');
}

/**
 * @param {HTMLElement} scrollEl
 * @param {{
 *   canvas?: HTMLCanvasElement | null,
 *   isTypingTarget?: (e: KeyboardEvent) => boolean,
 *   onPanChange?: () => void,
 *   onPanStart?: () => void,
 *   onPanEnd?: () => void,
 * }} [opts]
 */
export function attachStagePan(scrollEl, opts = {}) {
  const canvas = opts.canvas ?? null;
  const isTypingTarget = opts.isTypingTarget ?? (() => false);

  if (!scrollEl) {
    return {
      detach() {},
      isGrabHeld: () => false,
      isSpaceHeld: () => false,
      isPanning: () => false,
      isPanSession: () => false,
    };
  }

  /** @type {{ scrollLeft: number, scrollTop: number, clientX: number, clientY: number } | null} */
  let panStart = null;
  let activePointerId = null;
  let grabHeld = false;

  /** @param {EventTarget | null} t */
  function isOnCanvas(t) {
    if (!(t instanceof Node)) return false;
    if (canvas && (t === canvas || canvas.contains(t))) return true;
    return t instanceof Element && !!t.closest?.('.ct-stage-canvas-wrap');
  }

  /** Margin / stage-bg primary drag (not on canvas). */
  function canLaneMarginDrag(e) {
    if (e.button !== 0) return false;
    if (isFormTyping(e.target)) return false;
    return !isOnCanvas(e.target);
  }

  /** G-hold primary drag — includes canvas. */
  function canGrabDrag(e) {
    if (e.button !== 0) return false;
    if (!grabHeld) return false;
    if (isFormTyping(e.target)) return false;
    return true;
  }

  /** Wheel-click (middle button) drag — includes canvas. */
  function canMiddleDrag(e) {
    if (e.button !== 1) return false;
    if (isFormTyping(e.target)) return false;
    return true;
  }

  function syncPanClasses() {
    scrollEl.classList.toggle('is-pan-ready', grabHeld && !panStart);
    scrollEl.classList.toggle('is-panning', !!panStart);
  }

  /** @param {PointerEvent} e */
  function applyPanScrollFromEvent(e) {
    if (!panStart) return;
    const maxL = Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth);
    const maxT = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
    scrollEl.scrollLeft = Math.max(
      0,
      Math.min(maxL, panStart.scrollLeft + (panStart.clientX - e.clientX)),
    );
    scrollEl.scrollTop = Math.max(
      0,
      Math.min(maxT, panStart.scrollTop + (panStart.clientY - e.clientY)),
    );
  }

  /** @param {PointerEvent} [e] */
  function finishPan(e) {
    if (!panStart) return;
    panStart = null;
    activePointerId = null;
    syncPanClasses();
    opts.onPanChange?.();
    opts.onPanEnd?.();
    if (e?.pointerId != null) {
      try {
        scrollEl.releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  }

  /** @param {PointerEvent} e */
  function beginPan(e) {
    e.preventDefault();
    e.stopPropagation();
    opts.onPanStart?.();
    panStart = {
      scrollLeft: scrollEl.scrollLeft,
      scrollTop: scrollEl.scrollTop,
      clientX: e.clientX,
      clientY: e.clientY,
    };
    activePointerId = e.pointerId;
    syncPanClasses();
    opts.onPanChange?.();
    try {
      scrollEl.setPointerCapture(e.pointerId);
    } catch {
      panStart = null;
      activePointerId = null;
      syncPanClasses();
    }
  }

  function handlePointerDownCapture(e) {
    if (e.currentTarget !== scrollEl) return;
    if (!(e.target instanceof Node) || !scrollEl.contains(e.target)) return;
    if (canMiddleDrag(e) || canGrabDrag(e) || canLaneMarginDrag(e)) {
      beginPan(e);
    }
  }

  function docPanMoveCapture(ev) {
    if (!panStart) return;
    if (ev.pointerId !== activePointerId) return;
    applyPanScrollFromEvent(ev);
    ev.preventDefault();
    ev.stopPropagation();
  }

  function docPanEndCapture(ev) {
    if (!panStart) return;
    finishPan(ev);
    ev.stopPropagation();
  }

  function forceEndLaneDrag() {
    if (!panStart) return;
    finishPan(undefined);
  }

  function setGrabHeld(on) {
    if (grabHeld === on) return;
    grabHeld = on;
    if (!on && panStart) finishPan(undefined);
    syncPanClasses();
  }

  /** @param {KeyboardEvent} e */
  function onKeyDown(e) {
    if (e.code !== 'KeyG' && e.key.toLowerCase() !== 'g') return;
    if (e.ctrlKey || e.metaKey || e.altKey) return;
    if (e.repeat) return;
    if (isTypingTarget(e) || isFormTyping(e.target) || isFormTyping(document.activeElement)) return;
    e.preventDefault();
    setGrabHeld(true);
  }

  /** @param {KeyboardEvent} e */
  function onKeyUp(e) {
    if (e.code !== 'KeyG' && e.key.toLowerCase() !== 'g') return;
    setGrabHeld(false);
  }

  function onWindowBlur() {
    setGrabHeld(false);
    forceEndLaneDrag();
  }

  /** Block browser middle-click autoscroll / open-link. */
  function blockMiddleChrome(e) {
    if (e.button !== 1) return;
    if (!(e.target instanceof Node) || !scrollEl.contains(e.target)) return;
    e.preventDefault();
  }

  function blockSpaceScrollOnLane(e) {
    if (e.code !== 'Space') return;
    if (isFormTyping(e.target) || isFormTyping(document.activeElement)) return;
    e.preventDefault();
  }

  scrollEl.addEventListener('pointerdown', handlePointerDownCapture, true);
  scrollEl.addEventListener('mousedown', blockMiddleChrome, true);
  scrollEl.addEventListener('auxclick', blockMiddleChrome, true);
  scrollEl.addEventListener('keydown', blockSpaceScrollOnLane, true);
  document.addEventListener('pointermove', docPanMoveCapture, true);
  document.addEventListener('pointerup', docPanEndCapture, true);
  document.addEventListener('pointercancel', docPanEndCapture, true);
  window.addEventListener('keydown', onKeyDown, true);
  window.addEventListener('keyup', onKeyUp, true);
  scrollEl.addEventListener('lostpointercapture', forceEndLaneDrag);
  window.addEventListener('blur', onWindowBlur);

  return {
    isGrabHeld: () => grabHeld,
    /** Alias — Studio26 Space-pan gate name. */
    isSpaceHeld: () => grabHeld,
    isPanning: () => panStart !== null,
    isPanSession: () => panStart !== null || grabHeld,
    detach() {
      scrollEl.removeEventListener('pointerdown', handlePointerDownCapture, true);
      scrollEl.removeEventListener('mousedown', blockMiddleChrome, true);
      scrollEl.removeEventListener('auxclick', blockMiddleChrome, true);
      scrollEl.removeEventListener('keydown', blockSpaceScrollOnLane, true);
      document.removeEventListener('pointermove', docPanMoveCapture, true);
      document.removeEventListener('pointerup', docPanEndCapture, true);
      document.removeEventListener('pointercancel', docPanEndCapture, true);
      window.removeEventListener('keydown', onKeyDown, true);
      window.removeEventListener('keyup', onKeyUp, true);
      scrollEl.removeEventListener('lostpointercapture', forceEndLaneDrag);
      window.removeEventListener('blur', onWindowBlur);
      scrollEl.classList.remove('is-panning', 'is-pan-ready');
    },
  };
}

/** @param {HTMLElement | null} scrollEl */
export function centerStageScroll(scrollEl) {
  if (!scrollEl) return;
  const maxLeft = Math.max(0, scrollEl.scrollWidth - scrollEl.clientWidth);
  const maxTop = Math.max(0, scrollEl.scrollHeight - scrollEl.clientHeight);
  scrollEl.scrollLeft = maxLeft / 2;
  scrollEl.scrollTop = maxTop / 2;
}
