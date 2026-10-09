/** Color Time! — q200 vertical sliders: range limits, arrow keys, value hints. */

/** @typedef {{ min: number, max: number, suffix: string, showHint: boolean, displayName?: string, unit?: 'px' | 'percent', shortcutHint?: string }} CtVSliderSpec */

/** @type {Record<string, CtVSliderSpec>} */
export const CT_VSLIDER_SPECS = Object.freeze({
  'Brush size': { min: 0, max: 100, suffix: '', showHint: true, displayName: 'Line', unit: 'px', shortcutHint: '↑↓' },
  Rounded: { min: 0, max: 50, suffix: '', showHint: true, displayName: 'Rounded', shortcutHint: '↑↓' },
  Pressure: { min: 0, max: 100, suffix: '', showHint: true, displayName: 'Pressure', unit: 'percent', shortcutHint: '↑↓' },
  'Opacity per stroke': { min: 0, max: 100, suffix: '', showHint: true, displayName: 'Opacity', unit: 'percent', shortcutHint: '↑↓' },
  Smoothing: { min: 0, max: 100, suffix: '', showHint: true, displayName: 'Smoothing', unit: 'percent', shortcutHint: '↑↓' },
  Simplify: { min: 0, max: 100, suffix: '', showHint: true, displayName: 'Simplify', unit: 'percent', shortcutHint: '↑↓' },
  'Blend/Splatter': { min: 0, max: 100, suffix: '', showHint: true, displayName: 'Blend/Splatter', unit: 'percent', shortcutHint: '↑↓' },
  Smudge: { min: 0, max: 100, suffix: '', showHint: true, displayName: 'Smudge', unit: 'percent', shortcutHint: '↑↓' },
});

const HINT_HIDE_MS = 900;
const GLOW_HOLD_MS = 380;

/** @type {Map<HTMLInputElement, ReturnType<typeof setTimeout>>} */
const hintTimers = new Map();

/** @type {Map<HTMLInputElement, ReturnType<typeof setTimeout>>} */
const glowTimers = new Map();

/** @param {string} label */
function specForLabel(label) {
  return CT_VSLIDER_SPECS[label] ?? { min: 0, max: 100, suffix: '', showHint: true };
}

/** @param {HTMLInputElement} input */
function labelForInput(input) {
  return input.getAttribute('aria-label') || '';
}

/** @param {HTMLInputElement} input @param {CtVSliderSpec} spec */
function clampInputValue(input, spec) {
  const v = Math.round(Number(input.value));
  const next = Number.isFinite(v)
    ? Math.max(spec.min, Math.min(spec.max, v))
    : spec.min;
  input.value = String(next);
  return next;
}

/** @param {HTMLInputElement} input @param {number} value @param {CtVSliderSpec} spec */
function formatHint(input, value, spec) {
  const label = labelForInput(input);
  const fullSpec = CT_VSLIDER_SPECS[label] ?? spec;
  const name = fullSpec.displayName || label;
  const keys = fullSpec.shortcutHint ? ` · ${fullSpec.shortcutHint}` : '';
  if (fullSpec.unit === 'px') return `${name} - ${value}px${keys}`;
  if (fullSpec.unit === 'percent') return `${name} - ${value}%${keys}`;
  return `${name} - ${value}${keys}`;
}

/** @param {HTMLInputElement} input @param {number} value @param {CtVSliderSpec} spec */
function positionHint(input, value, spec) {
  const rail = input.closest('.ct-vslider__rail');
  const hint = rail?.querySelector('.ct-vslider__hint');
  if (!(hint instanceof HTMLElement) || !(rail instanceof HTMLElement)) return;
  const span = Math.max(1, spec.max - spec.min);
  const pct = (value - spec.min) / span;
  hint.style.setProperty('--ct-vslider-hint-pct', `${pct * 100}%`);
  hint.textContent = formatHint(input, value, spec);
}

/** @param {HTMLInputElement} input @param {boolean} [visible] */
function setHintVisible(input, visible = true) {
  const hint = input.closest('.ct-vslider__rail')?.querySelector('.ct-vslider__hint');
  if (hint instanceof HTMLElement) {
    hint.classList.toggle('is-visible', visible);
  }
}

/** @param {HTMLInputElement} input */
function sliderRoot(input) {
  return input.closest('.ct-vslider');
}

/** @param {HTMLInputElement} input @param {boolean} on */
function setFaderGlow(input, on) {
  const root = sliderRoot(input);
  if (root instanceof HTMLElement) root.classList.toggle('ct-vslider--glow', on);
}

/** @param {HTMLInputElement} input */
function holdFaderGlow(input) {
  setFaderGlow(input, true);
  const prev = glowTimers.get(input);
  if (prev) clearTimeout(prev);
  glowTimers.set(
    input,
    setTimeout(() => {
      setFaderGlow(input, false);
      glowTimers.delete(input);
    }, GLOW_HOLD_MS),
  );
}

/** @param {HTMLInputElement} input */
function clearFaderGlowHold(input) {
  const prev = glowTimers.get(input);
  if (prev) clearTimeout(prev);
  glowTimers.delete(input);
}

/** @param {HTMLInputElement} input */
function scheduleHintHide(input) {
  const prev = hintTimers.get(input);
  if (prev) clearTimeout(prev);
  hintTimers.set(
    input,
    setTimeout(() => {
      setHintVisible(input, false);
      hintTimers.delete(input);
    }, HINT_HIDE_MS),
  );
}

/** @param {HTMLInputElement} input */
function refreshHint(input) {
  const spec = specForLabel(labelForInput(input));
  if (!spec.showHint || input.id === 'ct-canvas-color') return;
  const value = clampInputValue(input, spec);
  positionHint(input, value, spec);
  setHintVisible(input, true);
  scheduleHintHide(input);
}

/** @param {HTMLInputElement} input @param {CtVSliderSpec} spec @param {number} delta */
function nudgeInput(input, spec, delta) {
  const value = clampInputValue(input, spec);
  const next = Math.max(spec.min, Math.min(spec.max, value + delta));
  if (next === value) return;
  input.value = String(next);
  input.dispatchEvent(new Event('input', { bubbles: true }));
  refreshHint(input);
}

/** @param {HTMLInputElement} input @param {CtVSliderSpec} spec */
/** Show value bubble on hover and while adjusting the fader. */
function wireSlider(input, spec) {
  input.min = String(spec.min);
  input.max = String(spec.max);
  input.step = '1';
  clampInputValue(input, spec);

  const rail = input.closest('.ct-vslider__rail');
  if (rail instanceof HTMLElement && spec.showHint) {
    let hint = rail.querySelector('.ct-vslider__hint');
    if (!(hint instanceof HTMLElement)) {
      hint = document.createElement('span');
      hint.className = 'ct-vslider__hint';
      hint.setAttribute('aria-hidden', 'true');
      rail.insertBefore(hint, input);
    }
    positionHint(input, Number(input.value), spec);
  }

  let dragging = false;
  const root = sliderRoot(input);

  const showHint = () => {
    const prev = hintTimers.get(input);
    if (prev) clearTimeout(prev);
    hintTimers.delete(input);
    refreshHint(input);
  };

  root?.addEventListener('pointerenter', showHint);
  root?.addEventListener('pointerleave', () => {
    if (!dragging) scheduleHintHide(input);
  });

  input.addEventListener('pointerdown', () => {
    dragging = true;
    clearFaderGlowHold(input);
    setFaderGlow(input, true);
    showHint();
  });

  input.addEventListener('pointerup', () => {
    dragging = false;
    holdFaderGlow(input);
    showHint();
  });

  input.addEventListener('pointercancel', () => {
    dragging = false;
    holdFaderGlow(input);
    showHint();
  });

  input.addEventListener('change', () => {
    if (!dragging) showHint();
  });

  input.addEventListener('input', () => {
    if (dragging) {
      setFaderGlow(input, true);
      showHint();
    } else {
      holdFaderGlow(input);
      showHint();
    }
  });

  input.addEventListener('blur', () => {
    scheduleHintHide(input);
  });

  input.addEventListener('keydown', (e) => {
    const horizontal = input.closest('.ct-vslider--horizontal');
    if (horizontal) {
      if (e.key !== 'ArrowLeft' && e.key !== 'ArrowRight' && e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
      e.preventDefault();
      const delta = e.key === 'ArrowRight' || e.key === 'ArrowUp' ? 1 : -1;
      nudgeInput(input, spec, delta);
      holdFaderGlow(input);
      return;
    }
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    e.preventDefault();
    nudgeInput(input, spec, e.key === 'ArrowUp' ? 1 : -1);
    holdFaderGlow(input);
  });
}

/** @param {HTMLInputElement} input */
function wireFaderGlow(input) {
  let dragging = false;

  input.addEventListener('pointerdown', () => {
    dragging = true;
    clearFaderGlowHold(input);
    setFaderGlow(input, true);
  });

  input.addEventListener('pointerup', () => {
    dragging = false;
    holdFaderGlow(input);
  });

  input.addEventListener('pointercancel', () => {
    dragging = false;
    holdFaderGlow(input);
  });

  input.addEventListener('input', () => {
    if (dragging) setFaderGlow(input, true);
    else holdFaderGlow(input);
  });

  input.addEventListener('keydown', (e) => {
    if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return;
    holdFaderGlow(input);
  });
}

/**
 * @param {string} label
 * @param {number} value
 */
export function setCtVSliderByLabel(label, value) {
  const spec = specForLabel(label);
  const input = document.querySelector(`.ct-stage-gutter .ct-vslider__input[aria-label="${label}"], .ct-vslider__input[aria-label="${label}"]`);
  if (!(input instanceof HTMLInputElement)) return;
  const next = Math.max(spec.min, Math.min(spec.max, Math.round(Number(value))));
  if (input.value === String(next)) return;
  input.value = String(next);
  if (spec.showHint) positionHint(input, next, spec);
  input.dispatchEvent(new Event('input', { bubbles: true }));
}

/** @param {HTMLInputElement} num @param {HTMLInputElement} range */
function syncNumFromRange(num, range) {
  num.value = String(Math.round(Number(range.value)));
}

/** @param {HTMLInputElement} num @param {HTMLInputElement} range */
function applyNumToRange(num, range) {
  const min = Number(range.min) || 0;
  const max = Number(range.max) || 100;
  let v = Math.round(Number(num.value));
  if (!Number.isFinite(v)) v = min;
  v = Math.max(min, Math.min(max, v));
  num.value = String(v);
  if (String(v) === range.value) return;
  range.value = String(v);
  range.dispatchEvent(new Event('input', { bubbles: true }));
}

/** @param {HTMLInputElement} input */
function wireGutterNumBox(input) {
  const root = sliderRoot(input);
  const num = root?.querySelector('.ct-vslider__num');
  if (!(num instanceof HTMLInputElement)) return;

  num.min = input.min;
  num.max = input.max;
  num.step = input.step || '1';
  syncNumFromRange(num, input);

  input.addEventListener('input', () => syncNumFromRange(num, input));
  num.addEventListener('change', () => applyNumToRange(num, input));
  num.addEventListener('blur', () => applyNumToRange(num, input));
  num.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      applyNumToRange(num, input);
      num.blur();
    }
  });
}

/** @param {HTMLInputElement} input @param {CtVSliderSpec} spec */
function wireGutterNudge(input, spec) {
  const root = sliderRoot(input);
  if (!(root instanceof HTMLElement) || !root.classList.contains('ct-vslider--nudgeable')) return;
  root.querySelectorAll('.ct-vslider__nudge-btn').forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      const delta = Number(btn.getAttribute('data-ct-nudge')) || 0;
      if (!delta) return;
      nudgeInput(input, spec, delta);
      holdFaderGlow(input);
    });
  });
}

export function initCtVSliders() {
  document.querySelectorAll('.ct-vslider__input').forEach((el) => {
    if (!(el instanceof HTMLInputElement)) return;
    if (el.id === 'ct-phone-fader-sheet-input') {
      el.step = '1';
      return;
    }
    const label = labelForInput(el);
    if (el.id === 'ct-canvas-color') {
      el.step = '1';
      wireFaderGlow(el);
      wireGutterNumBox(el);
      return;
    }
    const spec = specForLabel(label);
    wireSlider(el, spec);
    wireGutterNumBox(el);
    wireGutterNudge(el, spec);
  });

  window.addEventListener('ct-overclock-hud-changed', () => {
    document.querySelectorAll('.ct-stage-gutter .ct-vslider__input').forEach((el) => {
      if (!(el instanceof HTMLInputElement)) return;
      const num = el.closest('.ct-vslider')?.querySelector('.ct-vslider__num');
      if (num instanceof HTMLInputElement) syncNumFromRange(num, el);
    });
  });
}
