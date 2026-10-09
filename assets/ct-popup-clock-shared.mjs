/**
 * Color Time! clock face — ported from Studio CT popup.
 * Grid, interior toes, paw spin, random-mix timing + flash.
 */

import { playCtAlarmBlip } from './ct-alarm-audio.mjs';

export const CT_CLOCK_SLOT_COUNT = 12;

export const CT_RANDOM_MIX_MS = 3000;
export const CT_RANDOM_MIX_MS_REDUCED = 1200;
export const CT_RANDOM_FLASH_MS = 334;
/** After main mix — gameshow buzzer stragglers (subset flashes, decaying). */
export const CT_RANDOM_STRAGGLER_COUNT = 6;
export const CT_RANDOM_STRAGGLER_DELAYS_MS = Object.freeze([75, 95, 115, 145, 185, 240]);

export const CT_HOUR_GRID_SLOTS = Object.freeze([
  { hour: 12, col: 3, row: 1 },
  { hour: 11, col: 2, row: 1 },
  { hour: 1, col: 4, row: 1 },
  { hour: 10, col: 1, row: 2 },
  { hour: 2, col: 5, row: 2 },
  { hour: 9, col: 1, row: 3 },
  { hour: 3, col: 5, row: 3 },
  { hour: 8, col: 1, row: 4 },
  { hour: 4, col: 5, row: 4 },
  { hour: 7, col: 2, row: 5 },
  { hour: 6, col: 3, row: 5 },
  { hour: 5, col: 4, row: 5 },
]);

/** @type {Readonly<Record<number, { col: number, row: number }>>} */
const CT_HOUR_GRID_BY_HOUR = Object.freeze(
  Object.fromEntries(CT_HOUR_GRID_SLOTS.map((slot) => [slot.hour, slot])),
);

export const CT_INTERIOR_TOE_SLOTS = Object.freeze([
  { id: 0, col: 2, row: 2 },
  { id: 1, col: 3, row: 2 },
  { id: 2, col: 4, row: 2 },
  { id: 3, col: 2, row: 3 },
  { id: 4, col: 4, row: 3 },
  { id: 5, col: 2, row: 4 },
  { id: 6, col: 3, row: 4 },
  { id: 7, col: 4, row: 4 },
]);

export const CT_INTERIOR_TOE_COUNT = CT_INTERIOR_TOE_SLOTS.length;

/** @param {string} hex */
export function ctContrastInk(hex) {
  const h = String(hex || '').trim();
  const m = /^#?([0-9a-f]{6})$/i.exec(h.replace('#', '#'));
  const raw = m ? m[1] : '888888';
  const r = parseInt(raw.slice(0, 2), 16);
  const g = parseInt(raw.slice(2, 4), 16);
  const b = parseInt(raw.slice(4, 6), 16);
  const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return lum > 0.62 ? '#1a1028' : '#f5f5f5';
}

/**
 * @param {HTMLElement} hoursEl
 * @param {{
 *   mirror: readonly string[],
 *   activeHour?: number | null,
 *   mixRunning?: boolean,
 *   hourTitle?: (hour: number) => string,
 * }} opts
 */
export function renderCtClockFace(hoursEl, opts) {
  const mirror = opts.mirror || [];
  const mixRunning = !!opts.mixRunning;
  const activeHour = opts.activeHour ?? null;
  const hourTitle = opts.hourTitle || ((h) => `Hour ${h}`);

  const hourHtml = Array.from({ length: CT_CLOCK_SLOT_COUNT }, (_, i) => {
    const hour = i + 1;
    const hex = mirror[i] || '#888888';
    const tip = `${hourTitle(hour)} · ${hex}`;
    const isActive = activeHour === hour;
    const ink = ctContrastInk(hex);
    const flashing = mixRunning ? ' ct-hour-btn--flash' : '';
    const mirrored = mixRunning ? '' : ' ct-hour-btn--mirrored';
    const grid = CT_HOUR_GRID_BY_HOUR[hour];
    const gridStyle = grid ? `grid-column:${grid.col};grid-row:${grid.row};` : '';
    return (
      `<button type="button" class="ct-hour-btn${mirrored}${flashing}${isActive ? ' ct-hour-btn--active' : ''}" ` +
      `data-hour="${hour}" aria-pressed="${isActive ? 'true' : 'false'}" ` +
      `style="--ct-hour-fill:${hex};--ct-hour-flash:${hex};color:${ink};${gridStyle}" ` +
      `title="${tip.replace(/"/g, '&quot;')}">${hour}</button>`
    );
  }).join('');

  const toeHtml = CT_INTERIOR_TOE_SLOTS.map((slot) => {
    const hidden = mixRunning ? '' : ' ct-interior-toe--hidden';
    const flash = mixRunning ? ' ct-interior-toe--flash' : '';
    return (
      `<span class="ct-interior-toe${hidden}${flash}" data-interior-toe="${slot.id}" ` +
      `style="grid-column:${slot.col};grid-row:${slot.row}" aria-hidden="true"></span>`
    );
  }).join('');

  hoursEl.innerHTML = hourHtml + toeHtml;
}

/**
 * @param {HTMLElement} hoursEl
 * @param {readonly string[]} hourPalette length 12
 * @param {readonly string[]} interiorPalette length 12
 */
export function applyCtClockFlash(hoursEl, hourPalette, interiorPalette) {
  hoursEl.querySelectorAll('.ct-hour-btn').forEach((btn, i) => {
    if (!(btn instanceof HTMLElement)) return;
    const hex = hourPalette[i] || '#888888';
    btn.classList.add('ct-hour-btn--flash');
    btn.style.setProperty('--ct-hour-flash', hex);
    btn.style.color = ctContrastInk(hex);
  });
  hoursEl.querySelectorAll('.ct-interior-toe').forEach((toe, i) => {
    if (!(toe instanceof HTMLElement)) return;
    const hex = interiorPalette[i] || '#888888';
    toe.classList.remove('ct-interior-toe--hidden');
    toe.classList.add('ct-interior-toe--flash');
    toe.style.setProperty('--ct-interior-flash', hex);
  });
}

/**
 * @param {number} total
 * @param {number} count
 * @returns {number[]}
 */
function pickRandomIndices(total, count) {
  const indices = Array.from({ length: total }, (_, i) => i);
  for (let i = indices.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [indices[i], indices[j]] = [indices[j], indices[i]];
  }
  return indices.slice(0, Math.min(count, total));
}

/**
 * Buzzer stragglers — flash a shrinking random subset (not the whole face).
 * @param {HTMLElement} hoursEl
 * @param {readonly string[]} hourPalette
 * @param {readonly string[]} interiorPalette
 * @param {{ hourSlots?: number, toeSlots?: number }} [slotOpts]
 */
export function applyCtClockStragglerFlash(hoursEl, hourPalette, interiorPalette, slotOpts = {}) {
  const hourSlots = slotOpts.hourSlots ?? 2 + Math.floor(Math.random() * 4);
  const toeSlots = slotOpts.toeSlots ?? 1 + Math.floor(Math.random() * 2);
  const hourPick = new Set(pickRandomIndices(CT_CLOCK_SLOT_COUNT, hourSlots));
  const toePick = new Set(pickRandomIndices(CT_INTERIOR_TOE_COUNT, toeSlots));

  hoursEl.querySelectorAll('.ct-hour-btn').forEach((btn, i) => {
    if (!(btn instanceof HTMLElement)) return;
    btn.classList.remove('ct-hour-btn--straggler');
    if (hourPick.has(i)) {
      const hex = hourPalette[i] || '#888888';
      btn.classList.add('ct-hour-btn--flash', 'ct-hour-btn--straggler');
      btn.style.setProperty('--ct-hour-flash', hex);
      btn.style.color = ctContrastInk(hex);
      return;
    }
    btn.classList.remove('ct-hour-btn--flash');
  });

  hoursEl.querySelectorAll('.ct-interior-toe').forEach((toe, i) => {
    if (!(toe instanceof HTMLElement)) return;
    toe.classList.remove('ct-interior-toe--straggler');
    if (toePick.has(i)) {
      const hex = interiorPalette[i] || '#888888';
      toe.classList.remove('ct-interior-toe--hidden');
      toe.classList.add('ct-interior-toe--flash', 'ct-interior-toe--straggler');
      toe.style.setProperty('--ct-interior-flash', hex);
      return;
    }
    toe.classList.remove('ct-interior-toe--flash');
    toe.classList.add('ct-interior-toe--hidden');
  });
}

/**
 * @param {HTMLElement | null} pawBtn
 * @param {boolean} on
 */
export function setCtPawMixing(pawBtn, on) {
  const img = pawBtn?.querySelector('.ct-clock-paw__img');
  if (!(img instanceof HTMLElement)) return;
  if (on) {
    img.classList.add('ct-clock-paw__img--mixing');
    updateCtPawSpinDirection(img, 1);
  } else {
    img.classList.remove('ct-clock-paw__img--mixing', 'ct-paw-spin-cw', 'ct-paw-spin-ccw');
  }
}

/**
 * @param {HTMLElement} img
 * @param {1 | -1} dir
 */
export function updateCtPawSpinDirection(img, dir) {
  img.classList.toggle('ct-paw-spin-cw', dir === 1);
  img.classList.toggle('ct-paw-spin-ccw', dir === -1);
}

/**
 * @param {HTMLElement | null} pawBtn
 * @param {(flip: () => void) => void} onFlip register flip callback
 * @returns {() => void} stop
 */
export function startCtPawSpinFlip(pawBtn, onFlip) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return () => {};
  }
  const img = pawBtn?.querySelector('.ct-clock-paw__img');
  if (!(img instanceof HTMLElement)) return () => {};

  let dir = Math.random() < 0.5 ? -1 : 1;
  updateCtPawSpinDirection(img, dir);

  const flip = () => {
    dir = dir === 1 ? -1 : 1;
    if (Math.random() < 0.35) dir = Math.random() < 0.5 ? -1 : 1;
    updateCtPawSpinDirection(img, dir);
  };

  onFlip(flip);

  const tick = () => {
    flip();
    const next = 280 + Math.floor(Math.random() * 520);
    timer = window.setTimeout(tick, next);
  };
  let timer = window.setTimeout(tick, 400 + Math.floor(Math.random() * 400));

  return () => window.clearTimeout(timer);
}

/**
 * @param {{
 *   hoursEl: HTMLElement,
 *   pawBtn: HTMLButtonElement | null,
 *   randomHourPalette: () => string[],
 *   randomInteriorPalette: () => string[],
 *   onComplete: (wells: string[]) => void,
 *   buildFinalWells: () => string[],
 *   onFlash?: (hourPalette: string[], interiorPalette: string[]) => void,
 *   onMixEnd?: () => void,
 *   mixMs?: number,
 *   flashMs?: number,
 *   alarmOnFlash?: boolean,
 * }} opts
 */
export function runCtRandomMix(opts) {
  const reducedMotion =
    typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const mixMs = opts.mixMs ?? (reducedMotion ? CT_RANDOM_MIX_MS_REDUCED : CT_RANDOM_MIX_MS);
  const flashMs = opts.flashMs ?? CT_RANDOM_FLASH_MS;
  const alarmOnFlash = opts.alarmOnFlash !== false && !reducedMotion;

  let flashTimer = null;
  let stopTimer = null;
  /** @type {number | null} */
  let stragglerTimer = null;
  let pawSpinStop = () => {};
  let running = true;

  const finish = () => {
    running = false;
    if (flashTimer != null) window.clearInterval(flashTimer);
    if (stopTimer != null) window.clearTimeout(stopTimer);
    if (stragglerTimer != null) window.clearTimeout(stragglerTimer);
    opts.hoursEl.classList.remove('ct-popup__hours--mixing', 'ct-popup__hours--stragglers');
    if (opts.pawBtn) opts.pawBtn.disabled = false;
    if (!reducedMotion) setCtPawMixing(opts.pawBtn, false);
    pawSpinStop();
    if (alarmOnFlash) playCtAlarmBlip();
    opts.onMixEnd?.();
    opts.onComplete(opts.buildFinalWells());
  };

  const startStragglers = () => {
    if (flashTimer != null) window.clearInterval(flashTimer);
    flashTimer = null;
    opts.hoursEl.classList.remove('ct-popup__hours--mixing');
    opts.hoursEl.classList.add('ct-popup__hours--stragglers');
    if (opts.pawBtn) opts.pawBtn.disabled = false;
    if (!reducedMotion) setCtPawMixing(opts.pawBtn, false);
    pawSpinStop();
    if (alarmOnFlash) playCtAlarmBlip();

    if (reducedMotion) {
      finish();
      return;
    }

    let step = 0;

    const tick = () => {
      if (step >= CT_RANDOM_STRAGGLER_COUNT) {
        finish();
        return;
      }

      const hourPal = opts.randomHourPalette();
      const interiorPal = opts.randomInteriorPalette();
      const left = CT_RANDOM_STRAGGLER_COUNT - step;
      applyCtClockStragglerFlash(opts.hoursEl, hourPal, interiorPal, {
        hourSlots: Math.max(2, Math.ceil(left * 1.35) + Math.floor(Math.random() * 2)),
        toeSlots: Math.max(1, Math.ceil(left * 0.55) + (Math.random() < 0.4 ? 1 : 0)),
      });
      opts.onFlash?.(hourPal, interiorPal);
      if (alarmOnFlash && step < 2 && Math.random() < 0.3) playCtAlarmBlip();

      const delay = CT_RANDOM_STRAGGLER_DELAYS_MS[step] ?? 200;
      step += 1;
      stragglerTimer = window.setTimeout(tick, delay);
    };

    tick();
  };

  opts.hoursEl.classList.add('ct-popup__hours--mixing');
  if (opts.pawBtn) opts.pawBtn.disabled = true;
  if (!reducedMotion) {
    setCtPawMixing(opts.pawBtn, true);
    pawSpinStop = startCtPawSpinFlip(opts.pawBtn, () => {});
  }

  if (alarmOnFlash) playCtAlarmBlip();

  const flash = () => {
    const hourPal = opts.randomHourPalette();
    const interiorPal = opts.randomInteriorPalette();
    applyCtClockFlash(opts.hoursEl, hourPal, interiorPal);
    opts.onFlash?.(hourPal, interiorPal);
    if (alarmOnFlash && Math.random() < 0.45) playCtAlarmBlip();
  };

  if (reducedMotion) {
    flash();
  } else {
    flash();
    flashTimer = window.setInterval(flash, flashMs);
  }

  stopTimer = window.setTimeout(startStragglers, mixMs);

  return {
    isRunning: () => running,
    stop() {
      if (!running) return;
      finish();
    },
  };
}
