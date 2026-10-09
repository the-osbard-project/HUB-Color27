/** Color Time! — Rainbow FX (Star popup + stroke cycling). */

let rainbowFx = false;

export function isCtRainbowFx() {
  return rainbowFx;
}

/** @param {boolean} on */
export function setCtRainbowFx(on) {
  rainbowFx = !!on;
  window.dispatchEvent(new CustomEvent('ct-rainbow-fx', { detail: { on: rainbowFx } }));
}

export function toggleCtRainbowFx() {
  setCtRainbowFx(!rainbowFx);
  return rainbowFx;
}

/**
 * Tray palette for rainbow stroke cycling — null unless Rainbow FX is on.
 * @returns {string[] | null}
 */
export function getCtRainbowPalette() {
  if (!rainbowFx) return null;
  const wells = document.querySelectorAll('#ct-color-tray .dd-ct-well');
  /** @type {string[]} */
  const colors = [];
  wells.forEach((well) => {
    if (!(well instanceof HTMLElement)) return;
    const hex = well.dataset.wellColor || well.style.backgroundColor;
    if (hex) colors.push(hex);
  });
  return colors.length > 1 ? colors : null;
}
