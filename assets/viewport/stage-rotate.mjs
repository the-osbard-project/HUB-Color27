/** Canvas view rotate — ±45° hard stops (Ro' Tater). */

export const ROTATE_MIN_DEG = -45;
export const ROTATE_MAX_DEG = 45;
export const ROTATE_STEP_DEG = 5;
export const ROTATE_HOLD_DELAY_MS = 400;
export const ROTATE_HOLD_SPEED_DEG_PER_SEC = 48;
const ROTATE_ANIM_MS = 180;

/** @type {() => number} */
let rotationGetter = () => 0;

/** Used by screen→stage mapping without importing the stage view (avoids cycles). */
export function getStageRotationDeg() {
  return rotationGetter();
}

/** @param {() => number} fn */
export function setStageRotationGetter(fn) {
  rotationGetter = typeof fn === 'function' ? fn : () => 0;
}

/** @param {number} deg */
export function clampRotationDeg(deg) {
  const n = Number(deg);
  if (!Number.isFinite(n)) return 0;
  return Math.max(ROTATE_MIN_DEG, Math.min(ROTATE_MAX_DEG, n));
}

/** @param {number} deg */
export function snapRotationDeg(deg) {
  return clampRotationDeg(Math.round(deg / ROTATE_STEP_DEG) * ROTATE_STEP_DEG);
}

/**
 * @param {{
 *   targetEl: HTMLElement | null,
 *   onChange?: (deg: number) => void,
 * }} opts
 */
export function createStageRotate(opts) {
  const { targetEl, onChange } = opts;
  let rotationDeg = 0;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let animTimer = null;

  /**
   * @param {{ animate?: boolean, animateMs?: number }} [applyOpts]
   */
  function apply(applyOpts = {}) {
    if (!(targetEl instanceof HTMLElement)) return;
    const { animate = false, animateMs = ROTATE_ANIM_MS } = applyOpts;
    targetEl.style.transformOrigin = 'center center';
    if (animate) {
      targetEl.style.transition = `transform ${animateMs}ms ease-out`;
      if (animTimer != null) clearTimeout(animTimer);
      animTimer = setTimeout(() => {
        animTimer = null;
        targetEl.style.transition = '';
      }, animateMs + 24);
    } else {
      if (animTimer != null) clearTimeout(animTimer);
      animTimer = null;
      targetEl.style.transition = '';
    }
    targetEl.style.transform = rotationDeg === 0 ? '' : `rotate(${rotationDeg}deg)`;
  }

  /**
   * @param {number} deg
   * @param {{ animate?: boolean, animateMs?: number, snap?: boolean }} [setOpts]
   */
  function setRotationDeg(deg, setOpts = {}) {
    rotationDeg = setOpts.snap ? snapRotationDeg(deg) : clampRotationDeg(deg);
    apply(setOpts);
    onChange?.(rotationDeg);
  }

  function rotateLeft() {
    setRotationDeg(rotationDeg - ROTATE_STEP_DEG, { animate: true });
  }

  function rotateRight() {
    setRotationDeg(rotationDeg + ROTATE_STEP_DEG, { animate: true });
  }

  function reset(resetOpts = {}) {
    setRotationDeg(0, { animate: true, animateMs: resetOpts.animateMs ?? ROTATE_ANIM_MS });
  }

  setStageRotationGetter(() => rotationDeg);
  apply();

  return {
    getRotationDeg: () => rotationDeg,
    setRotationDeg,
    rotateLeft,
    rotateRight,
    reset,
    apply,
  };
}

/**
 * Keys 4 / 6 — tap steps 5°, hold spins smoothly to ±45°.
 * @param {ReturnType<typeof createStageRotate>} stageRotate
 * @param {{
 *   isBlocked?: (e: KeyboardEvent) => boolean,
 *   onChange?: () => void,
 * }} [opts]
 */
export function attachRotateKeys(stageRotate, opts = {}) {
  const isBlocked = opts.isBlocked ?? (() => false);
  const held = { left: false, right: false };
  /** @type {'left' | 'right' | null} */
  let holdDir = null;
  /** @type {ReturnType<typeof setTimeout> | null} */
  let holdDelayTimer = null;
  /** @type {number | null} */
  let holdAnimFrame = null;
  /** @type {number | null} */
  let holdLastTs = null;
  let wasSmoothing = false;

  function isLeft(e) {
    return e.code === 'Digit4' || e.code === 'Numpad4' || e.key === '4';
  }
  function isRight(e) {
    return e.code === 'Digit6' || e.code === 'Numpad6' || e.key === '6';
  }

  function stopSmoothSpin() {
    if (holdAnimFrame != null) {
      cancelAnimationFrame(holdAnimFrame);
      holdAnimFrame = null;
    }
    holdLastTs = null;
  }

  function clearHoldTimers() {
    holdDir = null;
    if (holdDelayTimer != null) {
      clearTimeout(holdDelayTimer);
      holdDelayTimer = null;
    }
    stopSmoothSpin();
  }

  /** @param {boolean} [snap] */
  function endHold(snap = false) {
    clearHoldTimers();
    if (snap && wasSmoothing) {
      stageRotate.setRotationDeg(stageRotate.getRotationDeg(), { animate: true, snap: true });
      opts.onChange?.();
    }
    wasSmoothing = false;
  }

  /** @returns {'left' | 'right' | null} */
  function activeDir() {
    if (held.left && !held.right) return 'left';
    if (held.right && !held.left) return 'right';
    return null;
  }

  /** @param {'left' | 'right'} dir */
  function stepOnce(dir) {
    if (dir === 'left') stageRotate.rotateLeft();
    else stageRotate.rotateRight();
    opts.onChange?.();
  }

  /** @param {'left' | 'right'} dir */
  function startSmoothHold(dir) {
    stopSmoothSpin();
    holdDir = dir;
    wasSmoothing = true;
    holdLastTs = performance.now();

    function tick(now) {
      if (holdDir !== dir || activeDir() !== dir) return;
      const last = holdLastTs ?? now;
      const dt = (now - last) / 1000;
      holdLastTs = now;
      const sign = dir === 'left' ? -1 : 1;
      stageRotate.setRotationDeg(
        stageRotate.getRotationDeg() + sign * ROTATE_HOLD_SPEED_DEG_PER_SEC * dt,
      );
      opts.onChange?.();
      holdAnimFrame = requestAnimationFrame(tick);
    }

    holdAnimFrame = requestAnimationFrame(tick);
  }

  function scheduleHold() {
    clearHoldTimers();
    const dir = activeDir();
    if (!dir) return;
    holdDir = dir;
    holdDelayTimer = setTimeout(() => {
      holdDelayTimer = null;
      if (activeDir() !== dir) return;
      startSmoothHold(dir);
    }, ROTATE_HOLD_DELAY_MS);
  }

  /** @param {KeyboardEvent} e */
  function onKeyDown(e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (isBlocked(e)) return;
    const left = isLeft(e);
    const right = isRight(e);
    if (!left && !right) return;

    if (e.repeat) {
      e.preventDefault();
      return;
    }

    e.preventDefault();
    if (left) {
      if (!held.left) stepOnce('left');
      held.left = true;
    } else {
      if (!held.right) stepOnce('right');
      held.right = true;
    }
    scheduleHold();
  }

  /** @param {KeyboardEvent} e */
  function onKeyUp(e) {
    const left = isLeft(e);
    const right = isRight(e);
    if (left) held.left = false;
    if (right) held.right = false;
    if (!left && !right) return;

    const dir = activeDir();
    if (dir) {
      endHold(false);
      scheduleHold();
      return;
    }
    endHold(true);
  }

  function onWindowBlur() {
    held.left = false;
    held.right = false;
    endHold(true);
  }

  window.addEventListener('keydown', onKeyDown);
  window.addEventListener('keyup', onKeyUp);
  window.addEventListener('blur', onWindowBlur);

  return {
    detach() {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', onWindowBlur);
      endHold(false);
    },
  };
}
