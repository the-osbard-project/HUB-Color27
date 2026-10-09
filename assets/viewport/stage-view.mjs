import { createStageLayout } from './stage-layout.mjs';
import { createStageZoom, attachZoomKeys } from './stage-zoom.mjs';
import { attachStagePan } from './stage-pan.mjs';
import { createStageRotate, attachRotateKeys } from './stage-rotate.mjs';

/** ms after lane drag — block resize-driven layout only */
const POST_PAN_LAYOUT_QUIET_MS = 400;

/**
 * Single door for q200 canvas lane — layout, zoom, pan, rotate, recenter.
 * @param {{
 *   q200El: HTMLElement | null,
 *   scrollEl: HTMLElement | null,
 *   zoomWrapEl: HTMLElement | null,
 *   zoomInnerEl: HTMLElement | null,
 *   canvasWrapEl: HTMLElement | null,
 *   canvas: HTMLCanvasElement | null,
 *   gridOverlayEl?: HTMLElement | null,
 *   isPanTool?: () => boolean,
 *   onPanChange?: () => void,
 *   onPanEnd?: () => void,
 *   onZoomChange?: (zoom: number) => void,
 *   isTypingTarget?: (e: KeyboardEvent) => boolean,
 *   onZoomKeyRecenter?: () => void,
 * }} opts
 */
export function createStageView(opts) {
  /** @type {{ isPanning: () => boolean, isPanSession: () => boolean, isSpaceHeld: () => boolean }} */
  const panGate = {
    isPanning: () => false,
    isPanSession: () => false,
    isSpaceHeld: () => false,
  };

  /** Pointer down in the scroll lane — freeze layout until that pointer is released. */
  /** @type {Set<number>} */
  const activeLanePointers = new Set();

  let layoutQuietUntil = 0;

  /** @type {ReturnType<typeof createStageLayout> | null} */
  let layout = null;

  function isScrollLaneBlocked() {
    return (
      activeLanePointers.size > 0 ||
      panGate.isPanSession() ||
      panGate.isPanning() ||
      Date.now() < layoutQuietUntil
    );
  }

  /** @param {PointerEvent} e */
  function onScrollLanePointerDown(e) {
    /* Primary + middle (wheel-click pan). */
    if ((e.button !== 0 && e.button !== 1) || !opts.scrollEl) return;
    if (!(e.target instanceof Node) || !opts.scrollEl.contains(e.target)) return;
    activeLanePointers.add(e.pointerId);
  }

  /** @param {PointerEvent} e */
  function onScrollLanePointerEnd(e) {
    requestAnimationFrame(() => {
      activeLanePointers.delete(e.pointerId);
    });
  }

  /** @param {{ preserveScroll?: boolean, recenter?: boolean, force?: boolean }} [layoutOpts] */
  function requestLayout(layoutOpts = {}) {
    layout?.update(layoutOpts);
  }

  /** @param {{ preserveScroll?: boolean, recenter?: boolean, force?: boolean, adjustScroll?: boolean }} [layoutOpts] */
  function scheduleLayout(layoutOpts = {}) {
    layout?.scheduleUpdate(layoutOpts);
  }

  function clearPendingLayout() {
    layout?.clearPendingLayout?.();
  }

  function onPanEndQuiet() {
    layoutQuietUntil = Date.now() + POST_PAN_LAYOUT_QUIET_MS;
    layout?.clearPendingLayout?.();
    opts.onPanEnd?.();
  }

  function notifyRotation() {
    window.dispatchEvent(
      new CustomEvent('ct-stage-rotation-changed', {
        detail: { deg: stageRotate.getRotationDeg() },
      }),
    );
  }

  const stageRotate = createStageRotate({
    targetEl: opts.canvasWrapEl,
    onChange: () => notifyRotation(),
  });

  const stageZoom = createStageZoom({
    onLayout: (layoutOpts) => requestLayout(layoutOpts),
    onChange: (zoom) => opts.onZoomChange?.(zoom),
  });

  layout = createStageLayout({
    q200El: opts.q200El,
    scrollEl: opts.scrollEl,
    zoomWrapEl: opts.zoomWrapEl,
    zoomInnerEl: opts.zoomInnerEl,
    canvasWrapEl: opts.canvasWrapEl,
    canvas: opts.canvas,
    gridOverlayEl: opts.gridOverlayEl,
    getZoom: () => stageZoom.getZoom(),
    isPanning: isScrollLaneBlocked,
  });

  const stagePan = opts.scrollEl
    ? attachStagePan(opts.scrollEl, {
        canvas: opts.canvas,
        isTypingTarget: opts.isTypingTarget,
        onPanStart: () => layout?.cancelPendingScrollApply?.(),
        onPanChange: opts.onPanChange,
        onPanEnd: onPanEndQuiet,
      })
    : {
        detach() {},
        isGrabHeld: () => false,
        isSpaceHeld: () => false,
        isPanning: () => false,
        isPanSession: () => false,
      };

  panGate.isPanning = () => stagePan.isPanning?.() ?? false;
  panGate.isPanSession = () => stagePan.isPanSession?.() ?? false;
  panGate.isSpaceHeld = () => stagePan.isSpaceHeld?.() ?? stagePan.isGrabHeld?.() ?? false;

  if (opts.scrollEl) {
    stageZoom.attachShiftWheelZoom(opts.scrollEl);
    document.addEventListener('pointerdown', onScrollLanePointerDown, true);
    document.addEventListener('pointerup', onScrollLanePointerEnd, true);
    document.addEventListener('pointercancel', onScrollLanePointerEnd, true);
  }

  function resetView() {
    stageRotate.reset();
    if (opts.onZoomKeyRecenter) opts.onZoomKeyRecenter();
    else stageZoom.zoomToPage();
  }

  const zoomKeys = attachZoomKeys(stageZoom, {
    isBlocked: opts.isTypingTarget ?? (() => false),
    onRecenter: () => resetView(),
  });

  const rotateKeys = attachRotateKeys(stageRotate, {
    isBlocked: opts.isTypingTarget ?? (() => false),
    onChange: () => notifyRotation(),
  });

  return {
    stageZoom,
    stageRotate,
    stagePan,
    requestLayout,
    scheduleLayout,
    clearPendingLayout,
    isScrollLaneBlocked,
    attachResizeObserver: (observeEl = opts.q200El) => layout?.attachResizeObserver(observeEl),
    zoomIn: () => stageZoom.zoomIn(),
    zoomOut: () => stageZoom.zoomOut(),
    zoomToPage: () => stageZoom.zoomToPage(),
    resetView,
    setZoom: (z, layoutOpts) => stageZoom.setZoom(z, layoutOpts),
    getZoom: () => stageZoom.getZoom(),
    getRotationDeg: () => stageRotate.getRotationDeg(),
    detach() {
      document.removeEventListener('pointerdown', onScrollLanePointerDown, true);
      document.removeEventListener('pointerup', onScrollLanePointerEnd, true);
      document.removeEventListener('pointercancel', onScrollLanePointerEnd, true);
      stagePan.detach?.();
      zoomKeys.detach();
      rotateKeys.detach();
    },
  };
}
