/** Color Time! — phone/tablet paw-row number faders + shared full-width slider sheet. */

/** @param {string} label */
function rangeByLabel(label) {
  if (label === 'Canvas color') {
    const canvas = document.getElementById('ct-canvas-color');
    return canvas instanceof HTMLInputElement ? canvas : null;
  }
  const input = document.querySelector(`.ct-stage-gutter .ct-vslider__input[aria-label="${label}"]`);
  return input instanceof HTMLInputElement ? input : null;
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

function wirePhoneNumberFaders() {
  document.querySelectorAll('.ct-phone-fader__num').forEach((el) => {
    if (!(el instanceof HTMLInputElement)) return;
    const label = el.getAttribute('data-ct-fader') || '';
    const range = rangeByLabel(label);
    if (!range) return;

    syncNumFromRange(el, range);

    range.addEventListener('input', () => syncNumFromRange(el, range));

    el.addEventListener('change', () => applyNumToRange(el, range));
    el.addEventListener('blur', () => applyNumToRange(el, range));
    el.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        applyNumToRange(el, range);
        el.blur();
      }
    });
  });

  window.addEventListener('ct-overclock-hud-changed', () => {
    document.querySelectorAll('.ct-phone-fader__num').forEach((el) => {
      if (!(el instanceof HTMLInputElement)) return;
      const range = rangeByLabel(el.getAttribute('data-ct-fader') || '');
      if (range) syncNumFromRange(el, range);
    });
  });
}

/** Shared sheet state */
/** @type {string | null} */
let activeSheetLabel = null;
/** @type {HTMLInputElement | null} */
let boundMaster = null;
/** @type {(() => void) | null} */
let unbindMaster = null;
let ignoreOutsideUntil = 0;

function sheetEls() {
  const sheet = document.getElementById('ct-phone-fader-sheet');
  const rail = document.getElementById('ct-phone-fader-sheet-rail');
  const input = document.getElementById('ct-phone-fader-sheet-input');
  return {
    sheet: sheet instanceof HTMLElement ? sheet : null,
    rail: rail instanceof HTMLElement ? rail : null,
    input: input instanceof HTMLInputElement ? input : null,
  };
}

function clearIconExpanded() {
  document.querySelectorAll('.ct-phone-fader__icon-btn[aria-expanded="true"]').forEach((btn) => {
    btn.setAttribute('aria-expanded', 'false');
  });
}

function unbindSheetFromMaster() {
  if (unbindMaster) {
    unbindMaster();
    unbindMaster = null;
  }
  boundMaster = null;
}

/**
 * @param {HTMLInputElement} sheetInput
 * @param {HTMLInputElement} master
 */
function bindSheetToMaster(sheetInput, master) {
  unbindSheetFromMaster();
  boundMaster = master;
  sheetInput.min = master.min;
  sheetInput.max = master.max;
  sheetInput.step = master.step || '1';
  sheetInput.value = master.value;
  sheetInput.setAttribute('aria-label', master.getAttribute('aria-label') || 'Slider value');

  const onSheet = () => {
    if (master.value === sheetInput.value) return;
    master.value = sheetInput.value;
    master.dispatchEvent(new Event('input', { bubbles: true }));
  };
  const onMaster = () => {
    if (sheetInput.value === master.value) return;
    sheetInput.value = master.value;
  };
  sheetInput.addEventListener('input', onSheet);
  master.addEventListener('input', onMaster);
  unbindMaster = () => {
    sheetInput.removeEventListener('input', onSheet);
    master.removeEventListener('input', onMaster);
  };
}

/** @param {boolean} open @param {string | null} [label] @param {HTMLElement | null} [btn] */
function setSheetOpen(open, label = null, btn = null) {
  const { sheet, rail, input } = sheetEls();
  if (!sheet || !rail || !input) return;

  if (!open) {
    sheet.hidden = true;
    activeSheetLabel = null;
    unbindSheetFromMaster();
    clearIconExpanded();
    rail.classList.remove('ct-vslider__rail--rainbow');
    return;
  }

  const master = rangeByLabel(label || '');
  if (!master) return;

  clearIconExpanded();
  bindSheetToMaster(input, master);
  rail.classList.toggle('ct-vslider__rail--rainbow', label === 'Canvas color');
  sheet.hidden = false;
  activeSheetLabel = label;
  if (btn instanceof HTMLElement) btn.setAttribute('aria-expanded', 'true');
  ignoreOutsideUntil = performance.now() + 400;
}

function wirePhoneFaderSheet() {
  const { sheet, input } = sheetEls();
  if (!sheet || !input) return;

  document.querySelectorAll('.ct-phone-fader__icon-btn[data-ct-fader-sheet]').forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      const label = btn.getAttribute('data-ct-fader-sheet') || '';
      if (!label) return;
      const opening = activeSheetLabel !== label || sheet.hidden;
      if (opening) setSheetOpen(true, label, btn);
      else setSheetOpen(false);
    });
  });

  document.addEventListener('pointerdown', (e) => {
    if (sheet.hidden) return;
    if (performance.now() < ignoreOutsideUntil) return;
    const t = e.target;
    if (!(t instanceof Node)) return;
    if (sheet.contains(t)) return;
    if (t instanceof Element && t.closest('.ct-phone-fader__icon-btn[data-ct-fader-sheet]')) return;
    setSheetOpen(false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !sheet.hidden) setSheetOpen(false);
  });
}

export function initCtPhoneFaders() {
  wirePhoneNumberFaders();
  wirePhoneFaderSheet();
}
