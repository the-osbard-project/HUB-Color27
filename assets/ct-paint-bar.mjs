/**
 * Color Time! — Line / Swap / Fill + 12-well tray (CT HUB paint bar only).
 * q400 footer keeps the 12-well tray alone; clock sync updates both trays.
 */

/** @typedef {'line' | 'fill'} CtPaintTarget */

const TRANSPARENT_CLASS = 'dd-ct-outline-fill-swatch--transparent';

/** @type {CtPaintTarget} */
let activePaintTarget = 'line';

/** @type {string | null} */
let lineColor = '#ef233c';

/** @type {string | null} */
let fillColor = null;

/** @param {string | null | undefined} hex */
function normalizeHex(hex) {
  const h = String(hex || '').trim();
  const m = /^#?([0-9a-f]{6})$/i.exec(h);
  return m ? `#${m[1].toLowerCase()}` : null;
}

/** @param {HTMLElement} swatch @param {string | null} hex */
function paintSwatch(swatch, hex) {
  if (!(swatch instanceof HTMLElement)) return;
  if (!hex) {
    swatch.classList.add(TRANSPARENT_CLASS);
    swatch.style.backgroundColor = '';
    return;
  }
  swatch.classList.remove(TRANSPARENT_CLASS);
  swatch.style.backgroundColor = hex;
}

/** Sync swap round: outer ring = Line, inner core = Fill (Studio q400 grammar). */
function syncSwapSwatch() {
  document.querySelectorAll('.dd-ct-paint-bar--hub .dd-ct-stroke-fill-swap-swatch').forEach((outer) => {
    if (!(outer instanceof HTMLElement)) return;
    paintSwatch(outer, lineColor);
  });
  document.querySelectorAll('.dd-ct-paint-bar--hub .dd-ct-stroke-fill-swap-core').forEach((core) => {
    if (!(core instanceof HTMLElement)) return;
    const transparent = !fillColor;
    core.classList.toggle('dd-ct-stroke-fill-swap-core--transparent', transparent);
    if (!transparent) {
      core.style.backgroundColor = fillColor;
    } else {
      core.style.backgroundColor = '';
    }
  });
}

function syncTargetButtons() {
  document.querySelectorAll('.dd-ct-paint-bar--hub [data-ct-paint-target]').forEach((btn) => {
    if (!(btn instanceof HTMLButtonElement)) return;
    const target = btn.dataset.ctPaintTarget;
    const on = target === activePaintTarget;
    btn.classList.toggle('is-active', on);
    btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  });
}

export function syncCtPaintBarSwatches() {
  document.querySelectorAll('.dd-ct-paint-bar--hub .dd-ct-line-swatch').forEach((el) => {
    paintSwatch(el, lineColor);
  });
  document.querySelectorAll('.dd-ct-paint-bar--hub .dd-ct-fill-swatch').forEach((el) => {
    paintSwatch(el, fillColor);
  });
  syncSwapSwatch();
  syncTargetButtons();
}

/** @returns {CtPaintTarget} */
export function getActivePaintTarget() {
  return activePaintTarget;
}

export function getCtLineColor() {
  return lineColor;
}

export function getCtFillColor() {
  return fillColor;
}

/** @param {string | null | undefined} hex */
export function setCtLineColor(hex) {
  if (hex == null || String(hex).trim() === '' || String(hex).toLowerCase() === 'transparent') {
    lineColor = null;
  } else {
    const next = normalizeHex(hex);
    if (!next) return;
    lineColor = next;
  }
  syncCtPaintBarSwatches();
}

/** @param {string | null | undefined} hex */
export function setCtFillColor(hex) {
  fillColor = normalizeHex(hex);
  syncCtPaintBarSwatches();
}

/** @param {CtPaintTarget} target */
export function setActivePaintTarget(target) {
  if (target !== 'line' && target !== 'fill') return;
  activePaintTarget = target;
  syncCtPaintBarSwatches();
}

export function swapCtLineFillColors() {
  const prevLine = lineColor;
  lineColor = fillColor || lineColor;
  fillColor = prevLine;
  syncCtPaintBarSwatches();
}

/** @param {number} index 0-based well index — activate on every tray. */
export function activateCtTrayWellIndex(index) {
  document.querySelectorAll('.dd-ct-color-tray').forEach((tray) => {
    const toes = tray.querySelectorAll('.dd-ct-toe');
    const toe = toes[index];
    const well = toe?.querySelector('.dd-ct-well');
    if (!(well instanceof HTMLElement)) return;
    tray.querySelectorAll('.dd-ct-well.is-active').forEach((w) => w.classList.remove('is-active'));
    well.classList.add('is-active');
    tray.querySelectorAll('.dd-ct-toe').forEach((t) => {
      if (!(t instanceof HTMLButtonElement)) return;
      const w = t.querySelector('.dd-ct-well');
      t.setAttribute('aria-pressed', w?.classList.contains('is-active') ? 'true' : 'false');
    });
  });
}

/** Keep hub + q400 tray wells aligned (colors + active). */
export function syncCtColorTrayMirrors() {
  const primary = document.getElementById('ct-color-tray');
  const mirrors = document.querySelectorAll('#ct-hub-color-tray');
  if (!(primary instanceof HTMLElement)) return;

  const toes = primary.querySelectorAll('.dd-ct-toe');
  mirrors.forEach((mirror) => {
    if (!(mirror instanceof HTMLElement)) return;
    const mirrorToes = mirror.querySelectorAll('.dd-ct-toe');
    toes.forEach((toe, i) => {
      const srcWell = toe.querySelector('.dd-ct-well');
      const dstWell = mirrorToes[i]?.querySelector('.dd-ct-well');
      if (!(srcWell instanceof HTMLElement) || !(dstWell instanceof HTMLElement)) return;
      dstWell.style.background = srcWell.style.background;
      dstWell.style.backgroundColor = srcWell.style.backgroundColor;
      dstWell.dataset.wellColor = srcWell.dataset.wellColor || '';
      dstWell.classList.toggle('is-active', srcWell.classList.contains('is-active'));
      dstWell.classList.toggle('dd-ct-well--light-edge', srcWell.classList.contains('dd-ct-well--light-edge'));
      dstWell.classList.toggle('dd-ct-well--ct-flash', srcWell.classList.contains('dd-ct-well--ct-flash'));
      const mirrorToe = mirrorToes[i];
      if (mirrorToe instanceof HTMLButtonElement) {
        mirrorToe.setAttribute('aria-pressed', srcWell.classList.contains('is-active') ? 'true' : 'false');
        const label = primary.querySelectorAll('.dd-ct-toe')[i]?.getAttribute('aria-label');
        if (label) mirrorToe.setAttribute('aria-label', label);
      }
      const flash = srcWell.style.getPropertyValue('--ct-well-flash');
      if (flash) dstWell.style.setProperty('--ct-well-flash', flash);
      else dstWell.style.removeProperty('--ct-well-flash');
    });
    mirror.classList.toggle('ct-color-tray--mixing', primary.classList.contains('ct-color-tray--mixing'));
  });
}

function wireTrayClicks() {
  document.querySelectorAll('.dd-ct-color-tray').forEach((tray) => {
    tray.addEventListener('click', (e) => {
      const toe = e.target.closest?.('.dd-ct-toe');
      if (!toe || !(tray instanceof HTMLElement)) return;
      const index = [...tray.querySelectorAll('.dd-ct-toe')].indexOf(toe);
      if (index < 0) return;
      activateCtTrayWellIndex(index);
      const well = toe.querySelector('.dd-ct-well');
      const hex =
        well instanceof HTMLElement
          ? well.dataset.wellColor || well.style.backgroundColor
          : '';
      const normalized = normalizeHex(hex) || hex;
      if (!normalized) return;
      // Shift+click always assigns Fill (does not switch Line/Fill target).
      const assignFill = e.shiftKey || activePaintTarget === 'fill';
      if (assignFill) {
        setCtFillColor(normalized);
        window.dispatchEvent(
          new CustomEvent('ct-fill-selected', { detail: { color: normalized, target: 'fill' } }),
        );
      } else {
        setCtLineColor(normalized);
        window.dispatchEvent(
          new CustomEvent('ct-color-selected', { detail: { color: normalized, target: activePaintTarget } }),
        );
      }
      syncCtColorTrayMirrors();
    });
  });
}

function wirePaintBars() {
  document.querySelectorAll('.dd-ct-paint-bar--hub [data-ct-paint-target]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const target = btn instanceof HTMLElement ? btn.dataset.ctPaintTarget : null;
      if (target === 'line' || target === 'fill') setActivePaintTarget(target);
    });
    btn.addEventListener('dblclick', (e) => {
      e.preventDefault();
      const target = btn instanceof HTMLElement ? btn.dataset.ctPaintTarget : null;
      if (target === 'line') {
        setCtLineColor(null);
        window.dispatchEvent(
          new CustomEvent('ct-color-selected', { detail: { color: null, target: 'line' } }),
        );
      } else if (target === 'fill') {
        setCtFillColor(null);
      }
    });
  });

  document.querySelectorAll('.dd-ct-paint-bar--hub [data-ct-stroke-fill-swap]').forEach((btn) => {
    btn.addEventListener('click', () => {
      swapCtLineFillColors();
      window.dispatchEvent(new CustomEvent('ct-line-fill-swapped'));
    });
  });
}

function wellHexFromElement(well) {
  if (!(well instanceof HTMLElement)) return null;
  const raw = well.dataset.wellColor || well.style.backgroundColor;
  return normalizeHex(raw) || raw || null;
}

function applyActiveWellToPaintTarget() {
  const active = document.querySelector('#ct-color-tray .dd-ct-well.is-active');
  const normalized = wellHexFromElement(active);
  if (!normalized) return;
  if (activePaintTarget === 'fill') {
    setCtFillColor(normalized);
    window.dispatchEvent(
      new CustomEvent('ct-fill-selected', { detail: { color: normalized, target: 'fill' } }),
    );
  } else {
    setCtLineColor(normalized);
    window.dispatchEvent(
      new CustomEvent('ct-color-selected', { detail: { color: normalized, target: activePaintTarget } }),
    );
  }
}

/** @param {number} delta -1 or 1 */
export function cycleCtTrayWell(delta) {
  const tray = document.getElementById('ct-color-tray');
  const toes = tray?.querySelectorAll('.dd-ct-toe');
  if (!toes?.length) return;
  let idx = [...toes].findIndex((toe) => toe.querySelector('.dd-ct-well.is-active'));
  if (idx < 0) idx = 0;
  idx = (idx + delta + toes.length) % toes.length;
  activateCtTrayWellIndex(idx);
  applyActiveWellToPaintTarget();
  syncCtColorTrayMirrors();
}

export function initCtPaintBar() {
  wirePaintBars();
  wireTrayClicks();
  syncCtPaintBarSwatches();

  window.addEventListener('ct-color-tray-mounted', () => {
    syncCtColorTrayMirrors();
    const active = document.querySelector('#ct-color-tray .dd-ct-well.is-active');
    const hex =
      active instanceof HTMLElement
        ? active.dataset.wellColor || active.style.backgroundColor
        : lineColor;
    const normalized = normalizeHex(hex);
    if (normalized) setCtLineColor(normalized);
  });

  window.addEventListener('ct-color-tray-palette-applied', () => syncCtColorTrayMirrors());

  window.addEventListener('dd-hub-opened', () => {
    syncCtColorTrayMirrors();
    syncCtPaintBarSwatches();
  });
}
