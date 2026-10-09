import { snapRotationDeg } from '../viewport/stage-rotate.mjs';

const DRAG_MOVE_PX = 10;

/**
 * Ro' Tater dial — drag to spin view (±45°); icon tracks rotation.
 * @param {{
 *   btn: HTMLElement,
 *   getRotationDeg: () => number,
 *   setRotationDeg: (deg: number, opts?: { animate?: boolean, snap?: boolean }) => void,
 *   onChange?: () => void,
 * }} opts
 */
export function attachRotaterDial(opts) {
  const { btn } = opts;
  const dialIcon =
    /** @type {HTMLElement | null} */ (btn.querySelector('.ct-stage-dial__icon')) ||
    /** @type {HTMLElement | null} */ (btn.querySelector('i'));

  let dragging = false;
  let dragStartAngle = 0;
  let dragStartRot = 0;
  let downX = 0;
  let downY = 0;
  let didDrag = false;

  function syncDial() {
    if (!dialIcon) return;
    dialIcon.style.transform = `rotate(${opts.getRotationDeg()}deg)`;
  }

  /** @param {PointerEvent} e */
  function pointerAngleDeg(e) {
    const r = btn.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    return (Math.atan2(e.clientY - cy, e.clientX - cx) * 180) / Math.PI;
  }

  /** @param {PointerEvent} e */
  function onPointerDown(e) {
    if (e.button !== 0) return;
    dragging = true;
    didDrag = false;
    downX = e.clientX;
    downY = e.clientY;
    btn.classList.add('is-dragging');
    dragStartAngle = pointerAngleDeg(e);
    dragStartRot = opts.getRotationDeg();
    e.preventDefault();
    e.stopPropagation();
    try {
      btn.setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  /** @param {PointerEvent} e */
  function onPointerMove(e) {
    if (!dragging) return;
    const dx = e.clientX - downX;
    const dy = e.clientY - downY;
    if (dx * dx + dy * dy >= DRAG_MOVE_PX * DRAG_MOVE_PX) didDrag = true;
    const delta = pointerAngleDeg(e) - dragStartAngle;
    if (Math.abs(delta) >= 0.75) didDrag = true;
    opts.setRotationDeg(dragStartRot + delta);
    syncDial();
    opts.onChange?.();
  }

  /** @param {PointerEvent} e */
  function finishDrag(e) {
    if (!dragging) return;
    dragging = false;
    btn.classList.remove('is-dragging');
    if (didDrag) {
      opts.setRotationDeg(snapRotationDeg(opts.getRotationDeg()), { animate: true, snap: true });
      syncDial();
      opts.onChange?.();
    }
    try {
      btn.releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  }

  btn.addEventListener('pointerdown', onPointerDown);
  btn.addEventListener('pointermove', onPointerMove);
  btn.addEventListener('pointerup', finishDrag);
  btn.addEventListener('pointercancel', finishDrag);
  syncDial();

  return {
    syncDial,
    detach() {
      btn.removeEventListener('pointerdown', onPointerDown);
      btn.removeEventListener('pointermove', onPointerMove);
      btn.removeEventListener('pointerup', finishDrag);
      btn.removeEventListener('pointercancel', finishDrag);
    },
  };
}
