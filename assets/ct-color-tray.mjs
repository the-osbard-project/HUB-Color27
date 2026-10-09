/** Color Time! — active color from paint bar (Line / Fill) + q400 tray fallback */

import { getCtFillColor, getCtLineColor } from './ct-paint-bar.mjs';

const DEFAULT_COLOR = '#ef233c';

function wellHex(well) {
  if (!(well instanceof HTMLElement)) return '';
  return well.dataset.wellColor || well.style.backgroundColor || '';
}

function activeWellHex() {
  const well = document.querySelector('#ct-color-tray .dd-ct-well.is-active');
  const hex = wellHex(well);
  if (hex) return hex;
  const first = document.querySelector('#ct-color-tray .dd-ct-toe:nth-child(3) .dd-ct-well');
  return wellHex(first) || DEFAULT_COLOR;
}

/** Line / stroke color for draw tools and shape outlines. */
export function getActiveCtColor() {
  return getCtLineColor() || activeWellHex();
}

/** Fill color for shapes and bucket (may be null = transparent). */
export function getActiveCtFillColor() {
  return getCtFillColor();
}

/** Bucket uses Fill slot; falls back to Line when fill is unset. */
export function getBucketCtColor() {
  return getCtFillColor() || getActiveCtColor();
}

/** @returns {string[]} tray well colors for Color Star! palette spray */
export function getCtTrayPalette() {
  const wells = document.querySelectorAll('#ct-color-tray .dd-ct-well');
  const colors = [];
  wells.forEach((well) => {
    const hex = wellHex(well);
    if (hex) colors.push(hex);
  });
  return colors.length ? colors : [DEFAULT_COLOR];
}

/** Select first toe if none active (Pencil default = red). */
export function ensureDefaultCtColor() {
  const tray = document.getElementById('ct-color-tray');
  if (!tray) return;
  if (tray.querySelector('.dd-ct-well.is-active')) return;
  tray.querySelector('.dd-ct-toe:nth-child(3) .dd-ct-well')?.classList.add('is-active');
}

/** @param {(color: string) => void} fn */
export function onCtColorChange(fn) {
  window.addEventListener('ct-color-selected', (e) => {
    const hex = e.detail?.color;
    if (typeof hex === 'string' && hex) fn(hex);
  });
}
