/** Color27 — q100 Backpack UI (bundle scroll + toggle). */

import {
  getActiveBackpackBundle,
  getActiveBackpackPageIndex,
  getBackpackBundleIndex,
  getBackpackBundles,
  openBackpackPageAtIndex,
  setBackpackBundleIndex,
} from './ct-backpack.mjs';

/** Max thumbs per bundle in q100 well. */
export const MAX_COLORING_PACK_IMAGES = 4;

const packScroll = document.getElementById('ct-pack-scroll');
const packToggle = document.getElementById('ct-pack-toggle');
const packTitleName = document.getElementById('ct-pack-title-name');

function syncPackTitle(label) {
  if (packTitleName instanceof HTMLElement) {
    packTitleName.textContent = label || '';
  }
  const title = document.getElementById('ct-pack-title');
  if (title instanceof HTMLElement) {
    title.setAttribute('aria-label', label ? `Backpack: ${label}` : 'Backpack: empty');
  }
}

export function renderColoringPack() {
  if (!packScroll) return;
  const bundles = getBackpackBundles();
  const bundle = getActiveBackpackBundle();

  if (!bundle || !bundles.length) {
    packScroll.replaceChildren();
    packScroll.setAttribute('aria-label', 'Coloring pack — empty');
    syncPackTitle('');
    packToggle?.setAttribute('aria-label', 'Backpack — empty. Add clipart bundles later.');
    return;
  }

  const pages = bundle.pages.slice(0, MAX_COLORING_PACK_IMAGES);
  const activeIdx = getActiveBackpackPageIndex();

  packScroll.replaceChildren();
  packScroll.setAttribute('aria-label', `${bundle.label} coloring pages`);
  syncPackTitle(bundle.label);

  pages.forEach((page, i) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'dd-rail-slot ct-pack-item ct-rail-tile-xl';
    if (activeIdx === i) btn.classList.add('ct-pack-item--active');
    btn.setAttribute('aria-label', page.label);
    btn.dataset.pageIndex = String(i);
    if (page.cbn) btn.dataset.cbn = '1';

    const thumb = document.createElement('span');
    thumb.className = 'ct-pack-item__thumb';
    const img = document.createElement('img');
    img.src = page.thumb;
    img.alt = '';
    img.width = 84;
    img.height = 84;
    img.loading = 'lazy';
    img.addEventListener('error', () => {
      btn.remove();
    }, { once: true });
    thumb.appendChild(img);
    btn.appendChild(thumb);

    btn.addEventListener('click', () => {
      openBackpackPageAtIndex(i).then(() => renderColoringPack());
    });
    packScroll.appendChild(btn);
  });

  packScroll.scrollTop = 0;
  packScroll.scrollLeft = 0;
  packToggle?.setAttribute('aria-label', `Backpack bundle: ${bundle.label}. Tap to switch bundle.`);
}

export function initColoringPacks() {
  packToggle?.addEventListener('click', () => {
    const n = getBackpackBundles().length;
    if (n < 1) return;
    const next = (getBackpackBundleIndex() + 1) % n;
    setBackpackBundleIndex(next);
    renderColoringPack();
  });

  window.addEventListener('ct-backpack-page-opened', () => renderColoringPack());
  window.addEventListener('ct-backpack-page-cleared', () => renderColoringPack());
  window.addEventListener('ct-backpack-bundle-changed', () => renderColoringPack());

  renderColoringPack();
}
