/** Color Time! — control hover tips with keyboard shortcuts (source lock: docs/KEYS+TIPS.md). */

/** @param {string} label @param {string} [keys] */
export function ctControlHint(label, keys) {
  return keys ? `${label} — ${keys}` : label;
}

/** @param {HTMLElement} el @param {string} label @param {string} [keys] @param {{ aria?: boolean }} [opts] */
function applyControlHint(el, label, keys, opts = { aria: true }) {
  const hint = ctControlHint(label, keys);
  el.title = hint;
  if (opts.aria) el.setAttribute('aria-label', hint);
}

/** @param {string} id @param {string} label @param {string} [keys] */
function hintById(id, label, keys) {
  const el = document.getElementById(id);
  if (el instanceof HTMLElement) applyControlHint(el, label, keys);
}

/** @param {string} selector @param {string} label @param {string} [keys] */
function hintBySelector(selector, label, keys) {
  const el = document.querySelector(selector);
  if (el instanceof HTMLElement) applyControlHint(el, label, keys);
}

export function initCtShortcutHints() {
  hintById('ct-btn-new', 'New', 'Ctrl+N');
  hintById('ct-btn-open', 'Open', 'Ctrl+O');
  hintById('ct-btn-save', 'Save As', 'Ctrl+S');

  hintById('ct-btn-overclock', 'Overclock Tools');

  hintById('ct-overclock-grid', '20×20 canvas grid', "Ctrl+Shift+'");
  hintById('ct-overclock-snap', 'Snap to canvas edge, grid, and center', 'Ctrl+Shift+;');
  hintById('ct-overclock-wand', 'Delete connected pixels (tolerance 32)', 'W');
  hintById('ct-overclock-select-box', 'Floating select — move, resize, rotate', 'V');

  hintById('ct-btn-eraser', 'Eraser', 'E');
  hintById('ct-btn-bucket', 'Bucket', 'F');
  hintById('ct-btn-pencil', 'Pencil', 'N');
  hintById('ct-btn-crayon', 'Crayon', 'C');
  hintById('ct-btn-pastel', 'Pastel', 'L');
  hintById('ct-btn-marker', 'Marker', 'M');
  hintById('ct-btn-star', 'Color Star!', 'B / P');

  hintById('dd-paw', 'Open menu', 'Space');

  hintById('ct-hub-tray-push', "Tap PJ's paw to mix up trays", 'Space');
  hintBySelector('[data-ct-paint-target="line"]', 'Line color', '/');
  hintBySelector('[data-ct-paint-target="fill"]', 'Fill color', "'");

  hintById('dd-hub-contrast', 'Contrast', 'T');
  hintById('dd-hub-info', 'Info', 'Ctrl+,');
  hintById('dd-hub-privacy', 'Privacy & Web Safety');

  document.querySelectorAll('.dd-ct-color-tray').forEach((tray) => {
    if (tray instanceof HTMLElement) {
      tray.title = ctControlHint('Color wells', '← → · Shift+click → Fill');
    }
  });

  document.querySelectorAll('#ct-star-popup [data-brush-fx]').forEach((btn) => {
    if (!(btn instanceof HTMLElement)) return;
    const fx = btn.dataset.brushFx;
    const label = btn.querySelector('span')?.textContent?.trim() || fx || 'Star FX';
    const keys = fx === 'brushy' ? 'B' : fx === 'inky' ? 'P' : undefined;
    applyControlHint(btn, label, keys, { aria: false });
  });

  document.querySelectorAll('#ct-osbard-popup [data-osbard-action]').forEach((btn) => {
    if (!(btn instanceof HTMLElement)) return;
    const action = btn.dataset.osbardAction;
    const label = btn.querySelector('span')?.textContent?.trim() || action || 'OSBARD';
    const keys = action === 'smudgies' ? 'Ctrl+Z' : action === 'sharkies' ? 'Ctrl+Y' : undefined;
    applyControlHint(btn, label, keys, { aria: false });
  });

  document.querySelectorAll('.ct-stage-gutter .ct-vslider__icon[title], .ct-star-mix .ct-vslider__icon[title]').forEach((icon) => {
    if (!(icon instanceof HTMLElement)) return;
    const base = icon.getAttribute('title') || '';
    if (!base) return;
    const keys = icon.closest('.ct-vslider--horizontal') ? '←→' : '↑↓';
    icon.title = ctControlHint(base, keys);
  });

  document.querySelectorAll('.ct-stage-gutter .ct-vslider__icon:not([title])').forEach((icon) => {
    if (!(icon instanceof HTMLElement)) return;
    const rail = icon.closest('.ct-vslider')?.querySelector('.ct-vslider__input');
    const label = rail instanceof HTMLInputElement ? rail.getAttribute('aria-label') : null;
    if (label) icon.title = ctControlHint(label, '↑↓');
  });
}
