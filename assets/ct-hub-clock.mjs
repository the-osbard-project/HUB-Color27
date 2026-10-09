/**
 * Color Time Machine! — clock in CT HUB body (Studio popup placeholder).
 * Trays change via HUB only; no “Tools change color trays” checkbox.
 */

import {
  CT_CLOCK_SLOT_COUNT,
  CT_INTERIOR_TOE_COUNT,
  renderCtClockFace,
  runCtRandomMix,
} from './ct-popup-clock-shared.mjs';
import { getCtHourTitle, getCtHourPalette, getCtTrayByHour } from './ct-clock-trays.mjs';
import { applyPaletteToCtTrays } from './ct-color-trays.mjs';
import { syncCtColorTrayMirrors, setCtLineColor, setCtFillColor, getActivePaintTarget } from './ct-paint-bar.mjs';

const CT_HUB_PAW_HINT_KEY = 'ct-hub-tap-paw-hint-seen';

function readHubPawHintSeen() {
  try {
    return localStorage.getItem(CT_HUB_PAW_HINT_KEY) === '1';
  } catch {
    return false;
  }
}

function writeHubPawHintSeen() {
  try {
    localStorage.setItem(CT_HUB_PAW_HINT_KEY, '1');
  } catch {
    /* private mode */
  }
}

/** @param {boolean} hubOpen */
function syncHubPawFirstHint(hubOpen) {
  const firstHint = document.getElementById('ct-clock-paw-hint');
  const ongoingHint = document.getElementById('ct-hub-paw-hint');
  const seen = readHubPawHintSeen();

  if (!(firstHint instanceof HTMLElement) || !(ongoingHint instanceof HTMLElement)) return;

  if (!hubOpen) {
    firstHint.hidden = true;
    firstHint.classList.remove('is-pulsing');
    ongoingHint.hidden = true;
    return;
  }

  if (seen) {
    firstHint.hidden = true;
    firstHint.classList.remove('is-pulsing');
    ongoingHint.hidden = false;
    return;
  }

  firstHint.hidden = false;
  firstHint.classList.add('is-pulsing');
  ongoingHint.hidden = true;
}

function dismissHubPawFirstHint() {
  if (readHubPawHintSeen()) return;
  writeHubPawHintSeen();
  syncHubPawFirstHint(true);
}

/** @type {(() => void) | null} */
let hubRandomMix = null;
/** @type {(() => boolean) | null} */
let hubMixRunning = null;

export function runCtHubRandomMix() {
  hubRandomMix?.();
}

export function isCtHubMixRunning() {
  return hubMixRunning?.() ?? false;
}

/** @param {string | null | undefined} hex */
function normalizeHex(hex) {
  const h = String(hex || '').trim();
  const m = /^#?([0-9a-f]{6})$/i.exec(h);
  return m ? `#${m[1].toLowerCase()}` : null;
}

/** @returns {string[]} */
function readMirrorFromTray() {
  const tray = document.getElementById('ct-color-tray');
  if (!tray) return getCtHourPalette(2);
  const hex = [];
  tray.querySelectorAll('.dd-ct-well').forEach((well) => {
    if (!(well instanceof HTMLElement)) return;
    const inline = well.style.background || well.style.backgroundColor;
    const fromInline = inline.match(/#[0-9a-f]{6}/i)?.[0];
    if (fromInline) {
      hex.push(normalizeHex(fromInline) || fromInline);
      return;
    }
    const computed = getComputedStyle(well).backgroundColor;
    const rgbMatch = computed.match(/^rgb\((\d+),\s*(\d+),\s*(\d+)\)$/);
    if (rgbMatch) {
      const [, r, g, b] = rgbMatch;
      hex.push(
        `#${[r, g, b].map((n) => Number(n).toString(16).padStart(2, '0')).join('')}`,
      );
      return;
    }
    hex.push('#888888');
  });
  while (hex.length < CT_CLOCK_SLOT_COUNT) hex.push('#888888');
  return hex.slice(0, CT_CLOCK_SLOT_COUNT);
}

/**
 * @param {readonly string[]} palette
 * @param {boolean} [keepFlash]
 */
function applyPaletteToTray(palette, keepFlash = false) {
  applyPaletteToCtTrays(palette, keepFlash);
  const active = document.querySelector('#ct-color-tray .dd-ct-well.is-active');
  const hex =
    active instanceof HTMLElement
      ? active.dataset.wellColor || active.style.backgroundColor
      : palette[0];
  if (hex) {
    const normalized = normalizeHex(hex) || hex;
    if (getActivePaintTarget() === 'fill') {
      setCtFillColor(normalized);
    } else {
      setCtLineColor(normalized);
      window.dispatchEvent(
        new CustomEvent('ct-color-selected', { detail: { color: normalized, target: 'line' } }),
      );
    }
  }
  syncCtColorTrayMirrors();
}

/** @param {HTMLElement | null} trayEl @param {readonly string[]} palette */
function applyTrayFlash(trayEl, palette) {
  document.querySelectorAll('.dd-ct-color-tray').forEach((tray) => {
    if (!(tray instanceof HTMLElement)) return;
    tray.classList.add('ct-color-tray--mixing');
    tray.querySelectorAll('.dd-ct-well').forEach((well, i) => {
      if (!(well instanceof HTMLElement)) return;
      const hex = palette[i] || '#888888';
      well.classList.add('dd-ct-well--ct-flash');
      well.style.setProperty('--ct-well-flash', hex);
    });
  });
}

/** @param {HTMLElement | null} trayEl */
function clearTrayFlash(trayEl) {
  document.querySelectorAll('.dd-ct-color-tray').forEach((tray) => {
    if (!(tray instanceof HTMLElement)) return;
    tray.classList.remove('ct-color-tray--mixing');
    tray.querySelectorAll('.dd-ct-well--ct-flash').forEach((well) => {
      if (!(well instanceof HTMLElement)) return;
      well.classList.remove('dd-ct-well--ct-flash');
      well.style.removeProperty('--ct-well-flash');
    });
  });
  syncCtColorTrayMirrors();
}

export function initCtHubClock() {
  const hoursEl = document.getElementById('ct-hub-hours');
  const pawBtn = document.getElementById('ct-hub-tray-push');
  const trayNameEl = document.getElementById('ct-hub-tray-name');
  const trayEl = document.getElementById('ct-color-tray');
  if (!(hoursEl instanceof HTMLElement)) return;

  /** @type {string[]} */
  let clockMirrorColors = readMirrorFromTray();
  /** @type {number | null} */
  let activeHour = null;
  let mixRunning = false;
  /** @type {{ stop: () => void } | null} */
  let mixController = null;

  /** @param {number} hour */
  function trayHoverTitle(hour) {
    return getCtHourTitle(hour);
  }

  function syncTrayNameLabel() {
    if (!(trayNameEl instanceof HTMLElement)) return;
    if (mixRunning || activeHour == null) {
      trayNameEl.textContent = '';
      trayNameEl.hidden = true;
      return;
    }
    const name = getCtTrayByHour(activeHour)?.label ?? '';
    trayNameEl.textContent = name;
    trayNameEl.hidden = !name;
  }

  function renderHours() {
    const mirror = clockMirrorColors.length ? clockMirrorColors : readMirrorFromTray();
    renderCtClockFace(hoursEl, {
      mirror,
      activeHour,
      mixRunning,
      hourTitle: trayHoverTitle,
    });
    syncTrayNameLabel();
  }

  hoursEl.addEventListener('click', (e) => {
    if (mixRunning) return;
    const btn = e.target instanceof Element ? e.target.closest('.ct-hour-btn') : null;
    if (!(btn instanceof HTMLElement) || !hoursEl.contains(btn)) return;
    const hour = Number(btn.dataset.hour);
    if (!Number.isFinite(hour) || hour < 1 || hour > 12) return;

    activeHour = hour;
    const palette = getCtHourPalette(hour);
    applyPaletteToTray(palette);
    clockMirrorColors = palette.slice();
    renderHours();
  });

  /** @returns {string} */
  function randomFlashColor() {
    const hour = 1 + Math.floor(Math.random() * 12);
    const tray = getCtTrayByHour(hour);
    const colors = tray?.colors?.length ? tray.colors : ['#888888'];
    const idx = Math.floor(Math.random() * colors.length);
    return normalizeHex(colors[idx]) || colors[idx] || '#888888';
  }

  /** @returns {string[]} */
  function randomFlashPalette() {
    return Array.from({ length: CT_CLOCK_SLOT_COUNT }, () => randomFlashColor());
  }

  /** @returns {string[]} */
  function randomInteriorFlashPalette() {
    return Array.from({ length: CT_INTERIOR_TOE_COUNT }, () => randomFlashColor());
  }

  /** @returns {string[]} */
  function buildRandomMixWells() {
    const wells = [];
    for (let i = 0; i < CT_CLOCK_SLOT_COUNT; i++) {
      const hour = 1 + Math.floor(Math.random() * 12);
      const tray = getCtTrayByHour(hour);
      const colors = tray?.colors?.length ? tray.colors : ['#888888'];
      const idx = Math.floor(Math.random() * colors.length);
      wells.push(normalizeHex(colors[idx]) || colors[idx] || '#888888');
    }
    return wells;
  }

  function runRandomMix() {
    if (mixRunning) return;
    dismissHubPawFirstHint();
    mixRunning = true;
    renderHours();

    mixController = runCtRandomMix({
      hoursEl,
      pawBtn: pawBtn instanceof HTMLButtonElement ? pawBtn : null,
      randomHourPalette: randomFlashPalette,
      randomInteriorPalette: randomInteriorFlashPalette,
      buildFinalWells: buildRandomMixWells,
      alarmOnFlash: false,
      onFlash: (hourPal) => applyTrayFlash(trayEl, hourPal),
      onMixEnd: () => clearTrayFlash(trayEl),
      onComplete: (pal) => {
        mixController = null;
        mixRunning = false;
        applyPaletteToTray(pal);
        activeHour = null;
        clockMirrorColors = pal.slice();
        renderHours();
      },
    });
  }

  pawBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    runRandomMix();
  });

  clockMirrorColors = readMirrorFromTray();
  renderHours();

  window.addEventListener('dd-hub-opened', () => syncHubPawFirstHint(true));
  window.addEventListener('dd-close-hub', () => syncHubPawFirstHint(false));
  syncHubPawFirstHint(false);

  hubRandomMix = runRandomMix;
  hubMixRunning = () => mixRunning;
}
