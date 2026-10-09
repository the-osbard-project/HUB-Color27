/** Turn arrows — locked to the paper's top edge. Icons stay upright. */

import { getCtStageView } from './ct-stage-view.mjs';
import {
  ROTATE_HOLD_DELAY_MS,
  ROTATE_HOLD_SPEED_DEG_PER_SEC,
} from './viewport/stage-rotate.mjs';

const GAP_PX = 8;

export function initCtCanvasTurn() {
  const root = document.getElementById('ct-canvas-turn');
  const mat = root?.closest('.ct-stage-mat');
  const wrap = document.getElementById('ct-stage-canvas-wrap');
  const inner = document.getElementById('ct-stage-zoom-inner');
  const scroll = document.getElementById('dd-stage-scroll');
  if (!(root instanceof HTMLElement) || !(mat instanceof HTMLElement)) return;
  if (!(wrap instanceof HTMLElement) || !(inner instanceof HTMLElement)) return;
  if (!(scroll instanceof HTMLElement)) return;

  const leftBtn = root.querySelector('[data-ct-turn="left"]');
  const midBtn = root.querySelector('[data-ct-turn="center"]');
  const rightBtn = root.querySelector('[data-ct-turn="right"]');
  if (!(leftBtn instanceof HTMLElement) || !(midBtn instanceof HTMLElement) || !(rightBtn instanceof HTMLElement)) {
    return;
  }

  /** @type {number} */
  let followUntil = 0;
  /** @type {number} */
  let followRaf = 0;

  /** Layout px → on-screen px, including zoom and the desk fit scale. */
  function visualScale(el) {
    const layout = el.offsetWidth;
    if (!layout) return 1;
    const w = el.getBoundingClientRect().width;
    return w > 0 ? w / layout : 1;
  }

  function rotationMatrix(el) {
    const raw = getComputedStyle(el).transform;
    if (!raw || raw === 'none') return new DOMMatrix();
    return new DOMMatrix(raw);
  }

  function place() {
    const paperW = parseFloat(wrap.style.width);
    const paperH = parseFloat(wrap.style.height);
    if (!paperW || !paperH) return;
    const scale = visualScale(inner);
    const halfW = (paperW * scale) / 2;
    const halfH = (paperH * scale) / 2;
    const box = wrap.getBoundingClientRect();
    const cx = box.left + box.width / 2;
    const cy = box.top + box.height / 2;
    const m = rotationMatrix(wrap);
    const matBox = mat.getBoundingClientRect();
    const matScaleX = mat.offsetWidth ? matBox.width / mat.offsetWidth : 1;
    const matScaleY = mat.offsetHeight ? matBox.height / mat.offsetHeight : 1;
    const btn = leftBtn.getBoundingClientRect().width || leftBtn.offsetWidth * matScaleX || 16;
    const lift = btn / 2 + GAP_PX * matScaleX;
    const lane = scroll.getBoundingClientRect();

    /**
     * @param {HTMLElement} el
     * @param {number} x
     * @param {number} y
     */
    function pin(el, x, y) {
      const p = new DOMPoint(x, y).matrixTransform(m);
      const vx = Math.max(lane.left, Math.min(lane.right - btn, cx + p.x - btn / 2));
      const vy = Math.max(lane.top, Math.min(lane.bottom - btn, cy + p.y - btn / 2));
      el.style.left = `${(vx - matBox.left) / matScaleX}px`;
      el.style.top = `${(vy - matBox.top) / matScaleY}px`;
    }

    pin(leftBtn, -halfW, -halfH - lift);
    pin(midBtn, 0, -halfH - lift);
    pin(rightBtn, halfW, -halfH - lift);
  }

  function follow(ms) {
    followUntil = performance.now() + ms;
    if (followRaf) return;
    const loop = (now) => {
      place();
      if (now < followUntil) {
        followRaf = requestAnimationFrame(loop);
      } else {
        followRaf = 0;
      }
    };
    followRaf = requestAnimationFrame(loop);
  }

  /**
   * @param {HTMLElement} btn
   * @param {'left' | 'right'} dir
   */
  function bindSpin(btn, dir) {
    /** @type {ReturnType<typeof setTimeout> | null} */
    let delay = null;
    /** @type {number} */
    let raf = 0;
    let last = 0;
    let spinning = false;

    function stop(snap) {
      if (delay != null) clearTimeout(delay);
      delay = null;
      if (raf) cancelAnimationFrame(raf);
      raf = 0;
      const view = getCtStageView();
      if (snap && spinning && view) {
        view.stageRotate.setRotationDeg(view.stageRotate.getRotationDeg(), { animate: true, snap: true });
      }
      spinning = false;
      follow(240);
    }

    function tick(now) {
      const view = getCtStageView();
      if (!view) return;
      const dt = (now - last) / 1000;
      last = now;
      const sign = dir === 'left' ? -1 : 1;
      view.stageRotate.setRotationDeg(
        view.stageRotate.getRotationDeg() + sign * ROTATE_HOLD_SPEED_DEG_PER_SEC * dt,
      );
      place();
      raf = requestAnimationFrame(tick);
    }

    btn.addEventListener('pointerdown', (e) => {
      if (e.button !== 0) return;
      e.preventDefault();
      e.stopPropagation();
      const view = getCtStageView();
      if (!view) return;
      if (dir === 'left') view.stageRotate.rotateLeft();
      else view.stageRotate.rotateRight();
      follow(240);
      try {
        btn.setPointerCapture(e.pointerId);
      } catch {
        /* pointer already gone */
      }
      delay = setTimeout(() => {
        delay = null;
        spinning = true;
        last = performance.now();
        raf = requestAnimationFrame(tick);
      }, ROTATE_HOLD_DELAY_MS);
    });
    btn.addEventListener('pointerup', () => stop(true));
    btn.addEventListener('pointercancel', () => stop(true));
  }

  bindSpin(leftBtn, 'left');
  bindSpin(rightBtn, 'right');
  midBtn.addEventListener('pointerdown', (e) => {
    if (e.button !== 0) return;
    e.preventDefault();
    e.stopPropagation();
    getCtStageView()?.resetView();
    follow(420);
  });

  scroll.addEventListener('scroll', () => place(), { passive: true });
  window.addEventListener('resize', () => place());
  window.addEventListener('ct-stage-rotation-changed', () => follow(240));
  window.addEventListener('ct-canvas-size-changed', () => follow(240));
  if (typeof ResizeObserver !== 'undefined') {
    const ro = new ResizeObserver(() => place());
    ro.observe(wrap);
    ro.observe(scroll);
  }
  follow(400);
}
