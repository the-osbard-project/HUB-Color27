/** Color Time! — page-color rainbow popup (desk thumb). */

function setPopupOpen(popup, btn, open) {
  if (!(popup instanceof HTMLElement)) return;
  popup.hidden = !open;
  if (btn instanceof HTMLButtonElement) {
    btn.setAttribute('aria-expanded', open ? 'true' : 'false');
  }
}

/**
 * @param {{
 *   btnId: string,
 *   popupId: string,
 *   sliderId: string,
 *   masterId?: string,
 * }} opts
 */
function wireOnePopup(opts) {
  const btn = document.getElementById(opts.btnId);
  const popup = document.getElementById(opts.popupId);
  const slider = document.getElementById(opts.sliderId);
  const master = document.getElementById(opts.masterId || 'ct-canvas-color');
  if (
    !(btn instanceof HTMLButtonElement) ||
    !(popup instanceof HTMLElement) ||
    !(slider instanceof HTMLInputElement) ||
    !(master instanceof HTMLInputElement)
  ) {
    return;
  }

  const isMaster = slider === master;
  if (!isMaster) slider.value = master.value;

  /** Ignore the pointerdown that opened the popup (same gesture). */
  let ignoreOutsideUntil = 0;

  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    e.preventDefault();
    const opening = popup.hidden;
    document.querySelectorAll('.ct-pg-color-popup').forEach((el) => {
      if (el instanceof HTMLElement && el !== popup) el.hidden = true;
    });
    document.querySelectorAll('[aria-controls^="ct-pg-color"]').forEach((el) => {
      if (el instanceof HTMLButtonElement && el !== btn) {
        el.setAttribute('aria-expanded', 'false');
      }
    });
    if (opening) ignoreOutsideUntil = performance.now() + 400;
    setPopupOpen(popup, btn, opening);
  });

  if (!isMaster) {
    slider.addEventListener('input', () => {
      if (master.value === slider.value) return;
      master.value = slider.value;
      master.dispatchEvent(new Event('input', { bubbles: true }));
    });
    master.addEventListener('input', () => {
      if (slider.value === master.value) return;
      slider.value = master.value;
    });
  }

  document.addEventListener('pointerdown', (e) => {
    if (popup.hidden) return;
    if (performance.now() < ignoreOutsideUntil) return;
    const t = e.target;
    if (!(t instanceof Node)) return;
    if (popup.contains(t) || btn.contains(t)) return;
    setPopupOpen(popup, btn, false);
  });

  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !popup.hidden) setPopupOpen(popup, btn, false);
  });
}

export function initCtPgColorPopups() {
  wireOnePopup({
    btnId: 'ct-layer-bg-rainbow',
    popupId: 'ct-pg-color-popup-desk',
    sliderId: 'ct-canvas-color',
  });
}
