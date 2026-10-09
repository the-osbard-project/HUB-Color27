/** Color Time! — backpack bundles catalog (`assets/backpack/`). */



import { clearStrokesForLayer } from './ct-draw.mjs';

import { clearCtLineArt, loadCtLineArtToLayer } from './ct-line-art.mjs';

import { CT_CANVAS_SIZE } from './ct-canvas.mjs';

import {
  CT_BACKPACK_LAYER_INDEX,
  getActiveLayerIndex,
  setActiveLayerIndex,
} from './ct-layers.mjs';



/** @typedef {{ id: string, label: string, thumb: string, src: string, cbn?: boolean, trayId?: string }} BackpackPage */

/** @typedef {{ id: string, label: string, pages: BackpackPage[], cbn?: boolean }} BackpackBundle */



/** @type {BackpackBundle[]} */

let bundles = [];



/** @type {{ bundleId: string, pageId: string } | null} */

let activePage = null;



let bundleIndex = 0;

/** @type {number | null} */

let activePageIndex = null;



/** @returns {readonly BackpackBundle[]} */

export function getBackpackBundles() {

  return bundles;

}



/** @returns {BackpackBundle | null} */

export function getActiveBackpackBundle() {

  return bundles[bundleIndex] ?? null;

}



export function getBackpackBundleIndex() {

  return bundleIndex;

}



/** @returns {{ bundleId: string, pageId: string } | null} */

export function getActiveBackpackPage() {

  return activePage ? { ...activePage } : null;

}



/** @param {string} bundleId @param {string} pageId */

function findPage(bundleId, pageId) {

  const bundle = bundles.find((b) => b.id === bundleId);

  return bundle?.pages.find((p) => p.id === pageId) ?? null;

}



async function pageAssetExists(src) {
  try {
    const res = await fetch(src, { method: 'HEAD', cache: 'no-cache' });
    if (res.ok) return true;
    if (res.status === 404 || res.status === 410) return false;
    const get = await fetch(src, { method: 'GET', cache: 'no-cache' });
    return get.ok;
  } catch {
    return false;
  }
}

/** @param {BackpackPage[]} pages */
async function filterExistingPages(pages) {
  const kept = [];
  for (const page of pages) {
    if (await pageAssetExists(page.src)) {
      kept.push(page);
    } else {
      console.warn('[CT backpack] skipping missing page asset:', page.id, page.src);
    }
  }
  return kept;
}

const BACKPACK_ROOT = 'assets/backpack/';
const IMAGE_EXTENSIONS = ['png', 'webp', 'jpg', 'jpeg', 'svg'];
const MAX_CONVENTION_BUNDLES = 99;
const MAX_IMAGES_PER_BUNDLE = 24;

/** @param {string} stem path without extension */
async function resolveFirstExisting(stem) {
  for (const ext of IMAGE_EXTENSIONS) {
    const src = `${stem}.${ext}`;
    if (await pageAssetExists(src)) return src;
  }
  return null;
}

/** @param {string} bundleId */
function defaultBundleLabel(bundleId) {
  const m = /^bundle-(\d+)$/i.exec(bundleId);
  if (m) return `Bundle ${Number(m[1])}`;
  return bundleId.replace(/-/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

/**
 * @param {string} bundleId
 * @returns {Promise<{ files: string[], meta: Record<string, { cbn?: boolean, trayId?: string }>, bundleCbn?: boolean, label?: string } | null>}
 */
async function loadBundlePagesList(bundleId) {
  try {
    const res = await fetch(`${BACKPACK_ROOT}${bundleId}/pages.json`, { cache: 'no-cache' });
    if (!res.ok) return null;
    const doc = await res.json();
    const names = Array.isArray(doc) ? doc : doc?.pages;
    if (!Array.isArray(names) || !names.length) return null;
    /** @type {Record<string, { cbn?: boolean, trayId?: string }>} */
    const meta = {};
    /** @type {string[]} */
    const files = [];
    for (const entry of names) {
      if (typeof entry === 'string' && entry.trim()) {
        files.push(entry.trim());
        continue;
      }
      if (entry && typeof entry === 'object' && typeof entry.file === 'string') {
        const file = entry.file.trim();
        if (!file) continue;
        files.push(file);
        meta[file] = {
          cbn: !!entry.cbn,
          trayId: typeof entry.trayId === 'string' ? entry.trayId : undefined,
        };
      }
    }
    if (!files.length) return null;
    const label =
      doc && !Array.isArray(doc) && typeof doc.label === 'string' && doc.label.trim()
        ? doc.label.trim()
        : undefined;
    return {
      files,
      meta,
      bundleCbn: !!(doc && !Array.isArray(doc) && doc.cbn),
      label,
    };
  } catch {
    return null;
  }
}

/** Leading digits set sort order; full basename (no extension) is the page label. */
function parseConventionPageFile(name) {
  const trimmed = String(name || '').trim();
  const base = trimmed.replace(/\.[^.]+$/i, '');
  const m = /^(\d+)/.exec(base);
  if (!m) return null;
  const order = Number(m[1]);
  if (!Number.isFinite(order) || order < 1) return null;
  return { order, fileName: trimmed, label: base || `Page ${order}` };
}

/**
 * @param {string} bundleId
 * @param {string[]} listed file names inside the bundle folder
 * @param {Record<string, { cbn?: boolean, trayId?: string }>} [meta]
 * @param {boolean} [bundleCbn]
 */
async function pagesFromListedFiles(bundleId, listed, meta = {}, bundleCbn = false) {
  /** @type {{ order: number, fileName: string, label: string }[]} */
  const parsed = listed
    .map(parseConventionPageFile)
    .filter((item) => item != null)
    .sort((a, b) => a.order - b.order);

  /** @type {BackpackPage[]} */
  const pages = [];
  for (const item of parsed) {
    const src = `${BACKPACK_ROOT}${bundleId}/${item.fileName}`;
    if (!(await pageAssetExists(src))) {
      console.warn('[CT backpack] pages.json entry missing on disk:', bundleId, item.fileName);
      continue;
    }
    const pageMeta = meta[item.fileName] || {};
    pages.push({
      id: String(item.order),
      label: item.label,
      thumb: src,
      src,
      cbn: !!(pageMeta.cbn || bundleCbn),
      trayId: pageMeta.trayId,
    });
  }
  return pages;
}

/**
 * Scan `assets/backpack/bundle-NN/` for `1.{png,webp,…}`, `2.…`, …
 * Optional `pages.json` lists files like `1 - Forest Friends.webp` (sorted by leading number).
 * Page objects may set `{ "file": "1.png", "cbn": true, "trayId": "cbn:house" }`.
 * @param {string} bundleId folder name (bundle-01, bundle-02, …)
 */
async function discoverConventionBundle(bundleId) {
  const listed = await loadBundlePagesList(bundleId);
  if (listed?.files?.length) {
    const pages = await pagesFromListedFiles(
      bundleId,
      listed.files,
      listed.meta,
      listed.bundleCbn,
    );
    if (pages.length) {
      return {
        id: bundleId,
        label: listed.label || defaultBundleLabel(bundleId),
        pages,
        cbn: !!listed.bundleCbn,
      };
    }
  }

  /** @type {BackpackPage[]} */
  const pages = [];
  for (let i = 1; i <= MAX_IMAGES_PER_BUNDLE; i += 1) {
    const pageId = String(i);
    const stem = `${BACKPACK_ROOT}${bundleId}/${pageId}`;
    const src = await resolveFirstExisting(stem);
    if (!src) break;
    pages.push({
      id: pageId,
      label: `Page ${i}`,
      thumb: src,
      src,
    });
  }
  if (!pages.length) return null;
  return { id: bundleId, label: defaultBundleLabel(bundleId), pages };
}

/** @returns {Promise<number>} */
async function readConventionBundleLimit() {
  try {
    const res = await fetch(`${BACKPACK_ROOT}bundles.json`, { cache: 'no-cache' });
    if (!res.ok) return MAX_CONVENTION_BUNDLES;
    const doc = await res.json();
    const n = Number(doc?.conventionBundles);
    if (Number.isFinite(n) && n > 0) return Math.min(n, MAX_CONVENTION_BUNDLES);
  } catch {
    /* offline */
  }
  return MAX_CONVENTION_BUNDLES;
}

/** True when bundle-NN has pages.json or a page-1 image (stops scan without extension spam). */
async function bundleSlotExists(bundleId) {
  try {
    const pages = await fetch(`${BACKPACK_ROOT}${bundleId}/pages.json`, { method: 'HEAD', cache: 'no-cache' });
    if (pages.ok) return true;
    const png = await fetch(`${BACKPACK_ROOT}${bundleId}/1.png`, { method: 'HEAD', cache: 'no-cache' });
    if (png.ok) return true;
    if ((pages.status === 404 || pages.status === 410) && (png.status === 404 || png.status === 410)) {
      return false;
    }
  } catch {
    /* offline */
  }
  return !!(await resolveFirstExisting(`${BACKPACK_ROOT}${bundleId}/1`));
}

/** Auto-detect bundle-01 … bundle-NN folders (stops at first empty slot). */
async function discoverConventionBundles() {
  /** @type {BackpackBundle[]} */
  const out = [];
  const limit = await readConventionBundleLimit();
  for (let n = 1; n <= limit; n += 1) {
    const id = `bundle-${String(n).padStart(2, '0')}`;
    if (!(await bundleSlotExists(id))) break;
    const bundle = await discoverConventionBundle(id);
    if (!bundle) break;
    out.push(bundle);
  }
  return out;
}

/** @returns {Promise<BackpackBundle[]>} */
async function loadManifestBundles() {
  try {
    const res = await fetch(`${BACKPACK_ROOT}bundles.json`, { cache: 'no-cache' });
    if (!res.ok) return [];
    const doc = await res.json();
    if (!Array.isArray(doc?.bundles)) return [];
    return (
      await Promise.all(
        doc.bundles.map(async (bundle) => ({
          ...bundle,
          pages: await filterExistingPages(Array.isArray(bundle.pages) ? bundle.pages : []),
        })),
      )
    ).filter((bundle) => bundle.pages.length > 0);
  } catch {
    return [];
  }
}

async function loadManifest() {
  const discovered = await discoverConventionBundles();
  const discoveredIds = new Set(discovered.map((b) => b.id));
  const manifest = await loadManifestBundles();
  const legacy = manifest.filter((b) => !discoveredIds.has(b.id) && !/^bundle-\d+$/i.test(b.id));
  bundles = [...discovered, ...legacy];
}



/**

 * @param {number} index

 */

export function setBackpackBundleIndex(index) {

  bundleIndex = ((index % bundles.length) + bundles.length) % bundles.length;

  activePageIndex = null;

  activePage = null;

  window.dispatchEvent(new CustomEvent('ct-backpack-bundle-changed', { detail: { index: bundleIndex } }));

}



/**
 * Backpack always targets the active layer. Existing strokes / shapes / floats stay
 * on top of the new raster (no conflict prompt — Undo to reverse).
 * @returns {{ layerIndex: number, preserveArt: boolean }}
 */
function resolveBackpackImageLayer() {
  return { layerIndex: getActiveLayerIndex(), preserveArt: true };
}



export async function openBackpackPage(bundleId, pageId, { clearDrawing = true, skipConflict = false, layerIndex } = {}) {

  const page = findPage(bundleId, pageId);

  if (!page) return false;



  const bundleIdx = bundles.findIndex((b) => b.id === bundleId);

  if (bundleIdx >= 0) bundleIndex = bundleIdx;



  let targetLayer = typeof layerIndex === 'number' ? layerIndex : getActiveLayerIndex();
  let preserveArt = false;

  if (!skipConflict && typeof layerIndex !== 'number') {
    const resolved = resolveBackpackImageLayer();
    targetLayer = resolved.layerIndex;
    preserveArt = resolved.preserveArt;
  }

  if (clearDrawing && !preserveArt) {
    clearStrokesForLayer(targetLayer);
  }

  try {

    await loadCtLineArtToLayer(targetLayer, page.src, CT_CANVAS_SIZE, {
      preserveShapes: preserveArt,
      preserveStrokes: preserveArt,
      /* Centered uniform fit — black line art on transparent, no stretch. */
      fit: 'contain',
    });
    setActiveLayerIndex(targetLayer);

  } catch (err) {

    console.warn('[CT backpack]', err);

    return false;

  }



  activePage = { bundleId, pageId };

  const bundle = bundles[bundleIndex];

  activePageIndex = bundle?.pages.findIndex((p) => p.id === pageId) ?? null;



  window.dispatchEvent(

    new CustomEvent('ct-backpack-page-opened', {

      detail: { bundleId, pageId, page, clearDrawing, layerIndex: targetLayer },

    }),

  );

  return true;

}



/** Set active page metadata without loading art (project restore). */
export function setBackpackPageRef(bundleId, pageId) {
  const page = findPage(bundleId, pageId);
  if (!page) {
    clearBackpackPage();
    return;
  }
  const bundleIdx = bundles.findIndex((b) => b.id === bundleId);
  if (bundleIdx >= 0) bundleIndex = bundleIdx;
  activePage = { bundleId, pageId };
  const bundle = bundles[bundleIndex];
  activePageIndex = bundle?.pages.findIndex((p) => p.id === pageId) ?? null;
  window.dispatchEvent(new CustomEvent('ct-backpack-page-opened', {
    detail: { bundleId, pageId, page, clearDrawing: false, layerIndex: CT_BACKPACK_LAYER_INDEX, restored: true },
  }));
}


/** Drop active backpack page selection without clearing layer pixels. */
export function dismissBackpackPageSelection() {
  activePage = null;
  activePageIndex = null;
}

/** Blank canvas — clears backpack image from Layer 1. */
export function clearBackpackPage() {

  dismissBackpackPageSelection();

  clearCtLineArt();

  window.dispatchEvent(new CustomEvent('ct-backpack-page-cleared'));

}



/**

 * @param {{ bundleId?: string, pageId?: string } | null | undefined} ref

 */

export async function restoreBackpackPage(ref) {

  if (!ref?.bundleId || !ref?.pageId) {

    clearBackpackPage();

    return;

  }

  await openBackpackPage(ref.bundleId, ref.pageId, { clearDrawing: false, skipConflict: true });

}



/** @param {number} pageIndex */

export async function openBackpackPageAtIndex(pageIndex) {

  const bundle = getActiveBackpackBundle();

  const page = bundle?.pages[pageIndex];

  if (!bundle || !page) return false;

  return openBackpackPage(bundle.id, page.id);

}



export function getActiveBackpackPageIndex() {

  return activePageIndex;

}



export async function initCtBackpack() {

  await loadManifest();

  if (!bundles.length) return;

  setBackpackBundleIndex(0);

  clearBackpackPage();

}


