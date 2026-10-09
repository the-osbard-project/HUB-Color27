/**
 * Color27 — default draw tray is Crayon (pre-MediO red) with pink + gray.
 * House/MediO stays on the clock + CBN only.
 */

import { applyWellSurface } from './ct-well-surface.mjs';
import { activateCtTrayWellIndex, syncCtColorTrayMirrors } from './ct-paint-bar.mjs';

/** q400 + CT HUB — both stay in sync when clock or tool changes tray. */
export const CT_COLOR_TRAY_ROOT_IDS = Object.freeze(['ct-color-tray', 'ct-hub-color-tray']);

/** @typedef {{ color: string, light?: boolean, label?: string }} CtTrayWell */

/** @typedef {{ id: string, strokeColor: string, wells: CtTrayWell[] }} CtColorTray */

/** House brand ten — clock + CBN numbers 1–10 (MediO stays here). */
export const HOUSE_TRAY_WELLS = Object.freeze([
  { color: '#B8292B', label: 'MediO' },
  { color: '#E8891F', label: 'Pixer', light: true },
  { color: '#BA9B22', label: 'Scoopy', light: true },
  { color: '#006631', label: 'Arrt!!' },
  { color: '#9D431B', label: 'Mashy' },
  { color: '#2664DA', label: 'Color' },
  { color: '#5D3790', label: 'StudiO' },
  { color: '#882C68', label: 'Scrippy' },
  { color: '#F5F2EB', label: 'Siar', light: true },
  { color: '#1C1917', label: 'Osbard' },
]);

/**
 * Default 12 — classic Crayon spectrum, pink kept, slate → gray.
 * Red is pre-MediO crayon red (#EE204D), not MediO (#B8292B).
 */
const CRAYON_WELLS = Object.freeze([
  { color: '#EE204D', label: 'Red' },
  { color: '#FF7538', label: 'Orange' },
  { color: '#F5C542', label: 'Yellow', light: true },
  { color: '#58b42d', label: 'Green' },
  { color: '#1C99FF', label: 'Sky Blue' },
  { color: '#0D4A85', label: 'Navy' },
  { color: '#6c4ac8', label: 'Purple' },
  { color: '#FF6AD5', label: 'Pink' },
  { color: '#7a3044', label: 'Maroon' },
  { color: '#9E9E9E', label: 'Gray' },
  { color: '#4E342E', label: 'Brown' },
  { color: '#000000', label: 'Black' },
]);

/** CBN house ten — red first by paw; numbers 1–10 follow this order. */
const CBN_HOUSE_WELLS = Object.freeze([
  { color: '#B8292B', label: 'MediO' },
  { color: '#E8891F', label: 'Pixer', light: true },
  { color: '#BA9B22', label: 'Scoopy', light: true },
  { color: '#006631', label: 'Arrt!!' },
  { color: '#2664DA', label: 'Color' },
  { color: '#5D3790', label: 'StudiO' },
  { color: '#882C68', label: 'Scrippy' },
  { color: '#9D431B', label: 'Mashy' },
  { color: '#F5F2EB', label: 'Siar', light: true },
  { color: '#1C1917', label: 'Osbard' },
]);

/** @type {CtColorTray} */
const PENCIL_TRAY = {
  id: 'pencil:default',
  strokeColor: '#EE204D',
  wells: CRAYON_WELLS,
};

/** @type {CtColorTray} */
const CRAYON_TRAY = {
  id: 'crayon:default',
  strokeColor: '#EE204D',
  wells: CRAYON_WELLS,
};

/** @type {CtColorTray} */
const PASTEL_TRAY = {
  id: 'pastel:chalky',
  strokeColor: '#EE204D',
  wells: CRAYON_WELLS,
};

/** @type {CtColorTray} */
const CBN_HOUSE_TRAY = {
  id: 'cbn:house',
  strokeColor: '#B8292B',
  wells: CBN_HOUSE_WELLS.map((w) => ({ ...w })),
};

/** @type {CtColorTray} */
const MARKER_TRAY = {
  id: 'marker:watercolor',
  strokeColor: '#0087f9',
  wells: [
    { color: '#E53935', label: 'Poppy Red' },
    { color: '#FF9220', label: 'Marigold' },
    { color: '#FFC107', label: 'Golden Sun', light: true },
    { color: '#66BB3A', label: 'Spring Green' },
    { color: '#2E7D4F', label: 'Pine Green' },
    { color: '#26C6DA', label: 'Pool Cyan' },
    { color: '#0087f9', label: 'Skyline Blue' },
    { color: '#5E35B1', label: 'Vivid Violet' },
    { color: '#D81B9A', label: 'Raspberry' },
    { color: '#FFA8D2', label: 'Blossom Pink', light: true },
    { color: '#4E342E', label: 'Cocoa Brown' },
    { color: '#141414', label: 'Ink Black' },
  ],
};

/** @type {CtColorTray} */
const STARRY_TRAY = {
  id: 'brush:starry',
  strokeColor: '#baa846',
  wells: [
    { color: '#baa846', label: 'Star Gold' },
    { color: '#c9862d', label: 'Amber Spark' },
    { color: '#e8a030', label: 'Honey Glow' },
    { color: '#d4af37', label: 'Old Gold' },
    { color: '#cf6f3e', label: 'Copper Spark' },
    { color: '#c94b4b', label: 'Ruby Star' },
    { color: '#b84d8c', label: 'Rose Quartz' },
    { color: '#7b5ea7', label: 'Twilight Violet' },
    { color: '#4a7cb8', label: 'Evening Blue' },
    { color: '#3d9a6e', label: 'Jade Spark' },
    { color: '#8b6914', label: 'Bronze Dust' },
    { color: '#9a7b4f', label: 'Antique Gold' },
  ],
};

/** @type {CtColorTray} */
const BRUSHY_TRAY = {
  id: 'brush:brushy',
  strokeColor: '#baa846',
  wells: [
    { color: '#baa846', label: 'Gold Star' },
    { color: '#A8ADB5', label: 'Silver Star' },
    { color: '#ef233c', label: 'Red Star' },
    { color: '#ff8c00', label: 'Orange Star' },
    { color: '#ffe94a', label: 'Yellow Star', light: true },
    { color: '#CCFF00', label: 'Lime Star', light: true },
    { color: '#38b000', label: 'Green Star' },
    { color: '#00c2a8', label: 'Teal Star' },
    { color: '#00E5FF', label: 'Sky Star' },
    { color: '#006BE6', label: 'Blue Star' },
    { color: '#5836b5', label: 'Purple Star' },
    { color: '#E040FB', label: 'Magenta Star' },
  ],
};

/** @type {CtColorTray} */
const WATERY_TRAY = {
  id: 'brush:watery',
  strokeColor: '#0087f9',
  wells: [
    { color: '#b3e5fc', label: 'Mist Blue', light: true },
    { color: '#4fc3f7', label: 'Sky Wash' },
    { color: '#26C6DA', label: 'Pool Cyan' },
    { color: '#29b6f6', label: 'Daylight Blue' },
    { color: '#039be5', label: 'Ocean Blue' },
    { color: '#1e88e5', label: 'Harbor Blue' },
    { color: '#0087f9', label: 'Skyline Blue' },
    { color: '#5E35B1', label: 'Vivid Violet' },
    { color: '#7e57c2', label: 'Lilac Wash' },
    { color: '#ab47bc', label: 'Orchid Wash' },
    { color: '#5c6bc0', label: 'Twilight Indigo' },
    { color: '#00897b', label: 'Teal Wash' },
  ],
};

/** @type {CtColorTray} */
const SUNNY_TRAY = {
  id: 'brush:sunny',
  strokeColor: '#FFAB40',
  wells: [
    { color: '#FFF9C4', label: 'Buttercream', light: true },
    { color: '#FFEE58', label: 'Lemon Zest', light: true },
    { color: '#FFE94A', label: 'Golden Sun', light: true },
    { color: '#FFC107', label: 'Marigold' },
    { color: '#FFAB40', label: 'Amber Glow' },
    { color: '#FF9220', label: 'Tangerine' },
    { color: '#FF7043', label: 'Coral Flame' },
    { color: '#FF5722', label: 'Sunset Red' },
    { color: '#E53935', label: 'Poppy Red' },
    { color: '#D32F2F', label: 'Cherry Heat' },
    { color: '#AB47BC', label: 'Orchid Dusk' },
    { color: '#7B1FA2', label: 'Twilight Violet' },
  ],
};

/** @type {CtColorTray} */
const GLITTERY_TRAY = {
  id: 'brush:glittery',
  strokeColor: '#7B2D8E',
  wells: [
    { color: '#E31937', label: 'Blaze Red' },
    { color: '#D4008F', label: 'Magenta Fuse' },
    { color: '#FF85C8', label: 'Bubblegum Pink' },
    { color: '#FF7A00', label: 'Tangerine Pop' },
    { color: '#FFEE00', label: 'Lemon Zest', light: true },
    { color: '#9AE942', label: 'Apple Slice', light: true },
    { color: '#2DB84A', label: 'Forest Flash' },
    { color: '#00D4FF', label: 'Sky Splash' },
    { color: '#0066FF', label: 'Royal Wave' },
    { color: '#7B2D8E', label: 'Grape Glow' },
    { color: '#222222', label: 'Midnight Spark' },
    { color: '#C9CCD6', label: 'Starlight Silver', light: true },
  ],
};

/** @type {CtColorTray} */
const GLOWY_TRAY = {
  id: 'brush:glowy',
  strokeColor: '#FF3366',
  wells: [
    { color: '#FF3366', label: 'Cherry' },
    { color: '#FF7918', label: 'Fluorescent Orange' },
    { color: '#FFB000', label: 'Marigold', light: true },
    { color: '#FFFF00', label: 'Fluorescent Yellow', light: true },
    { color: '#D4FF00', label: 'Lime Green', light: true },
    { color: '#00D040', label: 'Green' },
    { color: '#00D4C0', label: 'Turquoise' },
    { color: '#4DC4FF', label: 'Light Blue' },
    { color: '#0088FF', label: 'Sapphire' },
    { color: '#7A55E0', label: 'Iris' },
    { color: '#C400FF', label: 'Purple' },
    { color: '#FF50C8', label: 'Fluorescent Pink' },
  ],
};

/** @type {CtColorTray} */
const INKY_TRAY = {
  id: 'brush:inky',
  strokeColor: '#121212',
  wells: [
    { color: '#121212', label: 'Inkwell Black' },
    { color: '#FFF3E0', label: 'Warm Cream', light: true },
    { color: '#AD1457', label: 'Deep Magenta' },
    { color: '#D32F2F', label: 'Classic Red' },
    { color: '#FF7043', label: 'Coral' },
    { color: '#EF6C00', label: 'Sunset Orange' },
    { color: '#F9A825', label: 'Marigold Yellow', light: true },
    { color: '#2E7D32', label: 'Leaf Green' },
    { color: '#00897B', label: 'Teal' },
    { color: '#1565C0', label: 'Royal Blue' },
    { color: '#7B1FA2', label: 'Grape Violet' },
    { color: '#4E342E', label: 'Chocolate Brown' },
  ],
};

/** @type {CtColorTray} */
const FURRY_TRAY = {
  id: 'brush:furry',
  strokeColor: '#C5703F',
  wells: [
    { color: '#ECCAB2', label: 'Pale Peach', light: true },
    { color: '#0087f9', label: "AJ's Collar" },
    { color: '#C9B9A6', label: 'Warm Beige' },
    { color: '#BE7A72', label: 'Rose Tan' },
    { color: '#C5703F', label: 'Copper' },
    { color: '#95502C', label: 'Sienna' },
    { color: '#B36854', label: 'Terracotta' },
    { color: '#86674A', label: 'Olive Brown' },
    { color: '#744C2D', label: 'Coffee' },
    { color: '#6E3722', label: 'Deep Brown' },
    { color: '#523F52', label: 'Plum Shadow' },
    { color: '#332833', label: 'Near Black' },
  ],
};

/** @type {Record<string, CtColorTray>} */
const CT_COLOR_TRAYS = Object.freeze({
  'pencil:default': PENCIL_TRAY,
  'crayon:default': CRAYON_TRAY,
  'pastel:chalky': PASTEL_TRAY,
  'marker:watercolor': MARKER_TRAY,
  'cbn:house': CBN_HOUSE_TRAY,
  'brush:brushy': BRUSHY_TRAY,
  'brush:dotty': BRUSHY_TRAY,
  'brush:starry': STARRY_TRAY,
  'brush:watery': WATERY_TRAY,
  'brush:washy': WATERY_TRAY,
  'brush:sunny': SUNNY_TRAY,
  'brush:glittery': GLITTERY_TRAY,
  'brush:glowy': GLOWY_TRAY,
  'brush:inky': INKY_TRAY,
  'brush:furry': FURRY_TRAY,
});

/** Bucket + Eraser keep whatever tray is showing (Studio inheritsColorTray). */
export function inheritsColorTray(toolKey) {
  return toolKey === 'bucket' || toolKey === 'eraser' || toolKey === 'osbard';
}

/**
 * All desk draw tools share the Crayon + pink + gray tray.
 * Bucket / Eraser keep the live tray. CBN pages mount `cbn:house` via ct-cbn.mjs.
 * Clock hour trays stay available via mountCtColorTray (not tool switches).
 * @param {string} toolKey
 * @param {{ brushFx?: string }} [_variant]
 */
export function colorTrayIdForTool(toolKey, _variant = {}) {
  if (inheritsColorTray(toolKey)) return null;
  return 'crayon:default';
}

/** @param {string} trayId */
export function getCtColorTray(trayId) {
  return CT_COLOR_TRAYS[trayId] ?? null;
}

/** @param {number} index */
function activateWellByIndex(index) {
  activateCtTrayWellIndex(index);
  syncCtColorTrayMirrors();
}

/**
 * @param {HTMLElement} tray
 * @param {CtColorTray} entry
 * @param {{ numbered?: boolean }} [opts]
 */
function mountWellsIntoTray(tray, entry, opts = {}) {
  const numbered = !!opts.numbered;
  tray.replaceChildren();
  tray.classList.toggle('dd-ct-color-tray--cbn', numbered);
  entry.wells.forEach((well, index) => {
    const n = index + 1;
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dd-ct-toe';
    btn.setAttribute(
      'aria-label',
      numbered ? `${n}. ${well.label || 'Color'}` : (well.label || `Color ${n}`),
    );
    btn.setAttribute('aria-pressed', 'false');
    const span = document.createElement('span');
    span.className = well.light ? 'dd-ct-well dd-ct-well--light-edge' : 'dd-ct-well';
    span.setAttribute('aria-hidden', 'true');
    span.dataset.wellColor = well.color;
    span.style.backgroundColor = well.color;
    span.style.setProperty('--ct-well-glow', well.color);
    if (numbered) {
      const num = document.createElement('span');
      num.className = 'dd-ct-well__num';
      num.textContent = String(n);
      span.appendChild(num);
    }
    btn.appendChild(span);
    tray.appendChild(btn);
  });
}

/**
 * @param {readonly string[]} palette
 * @param {boolean} [keepFlash]
 */
export function applyPaletteToCtTrays(palette, keepFlash = false) {
  CT_COLOR_TRAY_ROOT_IDS.forEach((id) => {
    const tray = document.getElementById(id);
    if (!(tray instanceof HTMLElement)) return;
    tray.querySelectorAll('.dd-ct-well').forEach((well, i) => {
      if (!(well instanceof HTMLElement)) return;
      const hex = palette[i] || '#888888';
      if (!keepFlash) {
        well.classList.remove('dd-ct-well--ct-flash');
        well.style.removeProperty('--ct-well-flash');
      }
      well.style.background = hex;
      well.dataset.wellColor = hex;
    });
  });
  window.dispatchEvent(new CustomEvent('ct-color-tray-palette-applied', { detail: { palette } }));
  syncCtColorTrayMirrors();
}

/**
 * Apply Studio well-surface textures to mounted tray wells.
 * @param {string} [texture]
 */
export function applyCtTrayWellTextures(texture) {
  CT_COLOR_TRAY_ROOT_IDS.forEach((id) => {
    const tray = document.getElementById(id);
    if (!(tray instanceof HTMLElement)) return;
    const tex = id === 'ct-hub-color-tray' ? 'plain' : texture || tray.dataset.ctWellTexture || 'plain';
    tray.querySelectorAll('.dd-ct-toe').forEach((toe, index) => {
      const well = toe.querySelector('.dd-ct-well');
      if (!(well instanceof HTMLElement)) return;
      const hex = well.dataset.wellColor || '#888888';
      applyWellSurface(well, hex, index, tex);
      well.classList.toggle(
        'dd-ct-well--textured',
        tex !== 'plain' && !!tex && well.style.backgroundImage !== '',
      );
    });
  });
  syncCtColorTrayMirrors();
}

/**
 * Mount tray wells into #ct-color-tray (+ HUB mirror).
 * @param {string} trayId
 * @param {{ numbered?: boolean }} [opts]
 */
export function mountCtColorTray(trayId, opts = {}) {
  const entry = getCtColorTray(trayId);
  if (!entry) return;

  const numbered = opts.numbered ?? trayId.startsWith('cbn:');
  let mounted = false;
  CT_COLOR_TRAY_ROOT_IDS.forEach((id) => {
    const tray = document.getElementById(id);
    if (!(tray instanceof HTMLElement)) return;
    tray.dataset.ctTrayId = trayId;
    mountWellsIntoTray(tray, entry, { numbered });
    mounted = true;
  });
  if (!mounted) return;

  const strokeIdx = entry.wells.findIndex(
    (w) => w.color.toLowerCase() === entry.strokeColor.toLowerCase(),
  );
  if (strokeIdx >= 0) activateWellByIndex(strokeIdx);
  else activateWellByIndex(0);

  const primary = document.getElementById('ct-color-tray');
  if (primary instanceof HTMLElement) {
    applyCtTrayWellTextures(primary.dataset.ctWellTexture || 'plain');
  }

  window.dispatchEvent(new CustomEvent('ct-color-tray-mounted', { detail: { trayId, entry } }));
}

/**
 * @param {string} toolKey
 * @param {{ brushFx?: string }} [variant]
 */
export function mountCtColorTrayForTool(toolKey, variant = {}) {
  const primary = document.getElementById('ct-color-tray');
  const liveId = primary instanceof HTMLElement ? primary.dataset.ctTrayId : '';
  /* CBN page owns the tray until the page is cleared. */
  if (liveId && liveId.startsWith('cbn:')) return liveId;
  const trayId = colorTrayIdForTool(toolKey, variant);
  if (!trayId) return null;
  mountCtColorTray(trayId);
  return trayId;
}
