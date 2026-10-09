/** Color Time! — project path state + Save As / quick save (CT-native `.oss` v2).
 * Quick save overwrites when a File System Access handle exists (Chrome/Edge).
 * Fallback download always creates a new copy in Downloads.
 */

import { buildCtProjectBlob, exportStagePngBlob, parseCtProjectDocument } from './ct-export.mjs';
import { canvasColorAt, getCanvasColorSliderValue, setBackdropOpacity, setCanvasColorSlider } from './ct-canvas-color.mjs';
import { clearCtDrawing, setCtStrokes } from './ct-draw.mjs';
import { clearCtHistory } from './ct-history.mjs';
import { restoreBackpackPage, clearBackpackPage, setBackpackPageRef, dismissBackpackPageSelection } from './ct-backpack.mjs';
import {
  restoreLayerStack,
  clearAllLayers,
  clearLayer,
  setActiveLayerIndex,
  getActiveLayerIndex,
  layerHasContent,
  confirmLayerLineArtConflict,
  resolveRasterImportFit,
  computeRasterImportRect,
} from './ct-layers.mjs';
import {
  clearFloatingState,
  restoreFloatingStack,
  placeFloatingImage,
  clearFloatingOnLayer,
  hasFloatingOnLayer,
} from './ct-stage-objects.mjs';
import { syncOpacitySliderToTarget } from './ct-layer-opacity.mjs';
import { applyCtCanvasSize, CT_CANVAS_SIZE, CT_CANVAS_SIZE_PRINT, CT_CANVAS_SIZE_STANDARD } from './ct-canvas.mjs';
import { isCtPrintCanvasPref, setCtPrintCanvasLocked, setCtSelectBoundingBoxEnabled } from './ct-overclock.mjs';
import { syncCtDocumentTitle } from './ct-page-title.mjs';

const OSS_OPEN_ACCEPT = {
  'application/json': ['.oss'],
  'application/octet-stream': ['.oss'],
};

const OPEN_IMAGE_ACCEPT = {
  'image/png': ['.png'],
  'image/jpeg': ['.jpg', '.jpeg'],
  'image/webp': ['.webp'],
  'image/svg+xml': ['.svg'],
};

const OSS_PICKER_TYPES = [{
  description: 'Color Time project',
  accept: OSS_OPEN_ACCEPT,
}];

/** Native Open dialog — default shows projects + all image types; specific filters in dropdown. */
const OPEN_ALL_ACCEPT = { ...OSS_OPEN_ACCEPT, ...OPEN_IMAGE_ACCEPT };

const OPEN_FILE_TYPES = [
  {
    description: 'Projects & images',
    accept: OPEN_ALL_ACCEPT,
  },
  {
    description: 'Color Time project (.oss)',
    accept: OSS_OPEN_ACCEPT,
  },
  {
    description: 'PNG image',
    accept: { 'image/png': ['.png'] },
  },
  {
    description: 'JPEG image',
    accept: { 'image/jpeg': ['.jpg', '.jpeg'] },
  },
  {
    description: 'WebP image',
    accept: { 'image/webp': ['.webp'] },
  },
  {
    description: 'SVG image',
    accept: { 'image/svg+xml': ['.svg'] },
  },
];

const PNG_PICKER_TYPES = [{
  description: 'PNG image',
  accept: { 'image/png': ['.png'] },
}];

/** @type {{ fileName: string | null, dirty: boolean, saveHandle: FileSystemFileHandle | null, saveKind: 'oss' | null }} */
const state = {
  fileName: null,
  dirty: false,
  saveHandle: null,
  saveKind: null,
};

/** @type {string | null} blob URL from Open → image (revoke on next open). */
let openImageObjectUrl = null;

function revokeOpenImageObjectUrl() {
  if (!openImageObjectUrl) return;
  URL.revokeObjectURL(openImageObjectUrl);
  openImageObjectUrl = null;
}

/** @returns {string | null} */
export function getProjectFileName() {
  return state.fileName;
}

export function isProjectDirty() {
  return state.dirty;
}

function markDirty() {
  state.dirty = true;
}

function markClean() {
  state.dirty = false;
}

function canSavePickFiles() {
  return typeof window.showSaveFilePicker === 'function';
}

function canOpenPickFiles() {
  return typeof window.showOpenFilePicker === 'function';
}

/** @param {string} name @param {string} ext e.g. `.oss` */
function ensureExt(name, ext) {
  const safe = name.trim() || 'Untitled';
  const lower = safe.toLowerCase();
  return lower.endsWith(ext) ? safe : `${safe}${ext}`;
}

function saveAsNameInput() {
  const input = document.getElementById('ct-save-as-name');
  return input instanceof HTMLInputElement ? input : null;
}

function closeSaveAsPopup() {
  const popup = document.getElementById('ct-save-as-popup');
  if (popup instanceof HTMLElement) popup.hidden = true;
  disarmCtDialogA11y();
  restoreCtDialogFocus(document.getElementById('ct-btn-save'));
}

/** @param {{ celebration?: 'quick' | 'full', ext: string }} opts */
function finishSave(opts) {
  closeSaveAsPopup();
  markClean();
  const name = state.fileName ?? 'Untitled';
  showToast(`Saved ${name}${opts.ext}`);
  window.dispatchEvent(new CustomEvent('ct-save', {
    detail: {
      fileName: state.fileName,
      kind: opts.ext,
      celebration: opts.celebration ?? 'full',
    },
  }));
}

/** @param {FileSystemFileHandle} handle @param {Blob} blob */
async function writeBlobToHandle(handle, blob) {
  const writable = await handle.createWritable();
  await writable.write(blob);
  await writable.close();
}

/** @param {Blob} blob @param {string} fileName */
function downloadBlob(blob, fileName) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(url);
}

/** @param {Blob} blob @param {string} fileName @param {object[]} pickerTypes @param {'oss' | null} kind @param {'quick' | 'full'} [celebration] */
async function saveBlobAs(blob, fileName, pickerTypes, kind, celebration = 'full') {
  if (canSavePickFiles()) {
    try {
      const handle = await window.showSaveFilePicker({
        suggestedName: fileName,
        types: pickerTypes,
      });
      await writeBlobToHandle(handle, blob);
      state.saveHandle = kind === 'oss' ? handle : null;
      state.saveKind = kind;
      state.fileName = fileName.replace(/\.(oss|png)$/i, '');
      finishSave({ ext: kind === 'oss' ? '.oss' : '.png', celebration });
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
  }

  downloadBlob(blob, fileName);
  state.fileName = fileName.replace(/\.(oss|png)$/i, '');
  state.saveHandle = null;
  state.saveKind = null;
  finishSave({ ext: kind === 'oss' ? '.oss' : '.png', celebration });
}

/** @param {string} baseName */
async function saveProjectOss(baseName, fromQuickSave = false) {
  const ossName = ensureExt(baseName, '.oss');
  const celebration = fromQuickSave ? 'quick' : 'full';
  await saveBlobAs(buildCtProjectBlob(baseName), ossName, OSS_PICKER_TYPES, 'oss', celebration);
  if (fromQuickSave && !state.saveHandle) {
    window.setTimeout(() => {
      showToast('Saved a copy to Downloads — Save As in Chrome/Edge enables overwrite');
    }, 3400);
  }
}

/** @param {string} baseName */
async function saveProjectPng(baseName) {
  const blob = await exportStagePngBlob();
  if (!blob) {
    showToast('Could not export PNG');
    return;
  }
  await saveBlobAs(blob, ensureExt(baseName, '.png'), PNG_PICKER_TYPES, null);
}

function openSaveAsPopup() {
  const popup = document.getElementById('ct-save-as-popup');
  const input = saveAsNameInput();
  if (!(popup instanceof HTMLElement) || !input) return;
  input.value = state.fileName ?? 'Untitled';
  popup.hidden = false;
  armCtDialogA11y(popup, closeSaveAsPopup);
  input.focus();
  input.select();
}

export async function quickSaveProject() {
  if (state.saveHandle && state.saveKind === 'oss') {
    try {
      await writeBlobToHandle(state.saveHandle, buildCtProjectBlob(state.fileName ?? 'Untitled'));
      finishSave({ celebration: 'quick', ext: '.oss' });
      return true;
    } catch {
      showToast('Could not write to file — try Save As again');
      state.saveHandle = null;
      state.saveKind = null;
      return false;
    }
  }

  if (state.fileName) {
    await saveProjectOss(state.fileName, true);
    return true;
  }

  openSaveAsPopup();
  return false;
}

function showToast(message) {
  const el = document.getElementById('dd-toast');
  if (!(el instanceof HTMLElement)) return;
  el.textContent = message;
  el.hidden = false;
  window.setTimeout(() => {
    el.hidden = true;
  }, 3200);
}

/** @param {object} doc @param {string} [fileLabel] @param {FileSystemFileHandle | null} [handle] */
export async function loadCtProject(doc, fileLabel, handle = null) {
  const parsed = parseCtProjectDocument(doc);
  if (!parsed) {
    throw new Error('Not a Color Time! .oss file');
  }

  applyCtCanvasSize(parsed.canvas?.size ?? (isCtPrintCanvasPref() ? CT_CANVAS_SIZE_PRINT : CT_CANVAS_SIZE_STANDARD));
  setCtPrintCanvasLocked(true);

  revokeOpenImageObjectUrl();
  clearCtHistory();
  clearFloatingState();
  clearAllLayers();

  if (parsed.canvas?.colorValue != null) {
    setCanvasColorSlider(parsed.canvas.colorValue);
  }
  if (parsed.canvas?.backdropOpacity != null) {
    setBackdropOpacity(Number(parsed.canvas.backdropOpacity), { skipEvent: true });
  } else {
    setBackdropOpacity(1, { skipEvent: true });
  }
  const bg =
    parsed.canvas?.backdrop
    ?? parsed.canvas?.background
    ?? canvasColorAt(getCanvasColorSliderValue());

  if (parsed.layers) {
    await restoreLayerStack(parsed.layers, { skipHistory: true });
    if (parsed.page?.bundleId && parsed.page?.pageId) {
      setBackpackPageRef(parsed.page.bundleId, parsed.page.pageId);
    } else {
      clearBackpackPage();
    }
  } else {
    await restoreBackpackPage(parsed.page ?? null);
  }

  setCtStrokes(parsed.strokes, { background: bg });

  if (parsed.floating) {
    restoreFloatingStack(parsed.floating);
  }

  syncOpacitySliderToTarget();

  const title = typeof parsed.title === 'string' && parsed.title.trim() ? parsed.title.trim() : null;
  if (fileLabel) {
    state.fileName = fileLabel.replace(/\.oss$/i, '');
  } else if (title) {
    state.fileName = title;
  }
  state.saveHandle = handle;
  state.saveKind = handle ? 'oss' : null;
  markClean();
  clearCtHistory();
  syncCtDocumentTitle(state.fileName);
  window.dispatchEvent(new CustomEvent('ct-open', { detail: { fileName: state.fileName } }));
}

const OPEN_IMAGE_EXT_RE = /\.(png|jpe?g|webp|svg)$/i;

/** @param {File} file */
function openKindForFile(file) {
  const name = file.name.toLowerCase();
  if (name.endsWith('.oss')) return 'oss';
  if (OPEN_IMAGE_EXT_RE.test(name)) return 'image';
  if (typeof file.type === 'string' && file.type) {
    if (file.type === 'application/json' || file.type === 'application/octet-stream') return 'oss';
    if (file.type.startsWith('image/')) return 'image';
  }
  return 'unknown';
}

/** @param {File} file */
async function sniffOpenKind(file) {
  const hinted = openKindForFile(file);
  if (hinted !== 'unknown') return hinted;

  const head = new Uint8Array(await file.slice(0, 16).arrayBuffer());
  if (head[0] === 0x89 && head[1] === 0x50 && head[2] === 0x4e && head[3] === 0x47) return 'image';
  if (head[0] === 0xff && head[1] === 0xd8 && head[2] === 0xff) return 'image';
  if (
    head.length >= 12
    && head[0] === 0x52 && head[1] === 0x49 && head[2] === 0x46 && head[3] === 0x46
    && head[8] === 0x57 && head[9] === 0x45 && head[10] === 0x42 && head[11] === 0x50
  ) return 'image';

  try {
    const text = await file.slice(0, 512).text();
    const trimmed = text.trimStart();
    if (/^<\?xml[\s>]/i.test(trimmed) || /^<svg[\s>/]/i.test(trimmed)) return 'image';
    if (trimmed.startsWith('{') || trimmed.startsWith('[')) return 'oss';
  } catch {
    /* binary */
  }
  return 'unknown';
}

/**
 * Place Open → image on the active paint layer (L1–L3). Conflict UX matches backpack.
 * @returns {Promise<number | null>} 0-based layer index, or null if cancelled / no room
 */
async function resolveOpenImageLayer() {
  const target = getActiveLayerIndex();
  const occupied = (i) => layerHasContent(i) || hasFloatingOnLayer(i);
  if (!occupied(target)) return target;

  const choice = await confirmLayerLineArtConflict(target + 1, 'below');
  if (choice === 'cancel') return null;

  if (choice === 'replace') {
    clearFloatingOnLayer(target);
    clearLayer(target, { skipHistory: true });
    return target;
  }

  for (let i = target + 1; i < 3; i++) {
    if (!occupied(i)) return i;
  }
  for (let i = target - 1; i >= 0; i--) {
    if (!occupied(i)) return i;
  }
  window.dispatchEvent(new CustomEvent('ct-backpack-layer-full'));
  return null;
}

/** @param {HTMLImageElement} img @returns {string} */
function imageElementToDataUrl(img) {
  const c = document.createElement('canvas');
  // Cap encode size so huge photos don't freeze/OOM Color Time.
  const maxEdge = 4096;
  const nw = Math.max(1, img.naturalWidth);
  const nh = Math.max(1, img.naturalHeight);
  const scale = Math.min(1, maxEdge / Math.max(nw, nh));
  c.width = Math.max(1, Math.round(nw * scale));
  c.height = Math.max(1, Math.round(nh * scale));
  const ctx = c.getContext('2d');
  if (!ctx) return '';
  ctx.drawImage(img, 0, 0, c.width, c.height);
  return c.toDataURL('image/png');
}

/** @param {string} src @returns {Promise<HTMLImageElement>} */
function loadHtmlImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error('Could not load image'));
    img.src = src;
  });
}

/** @param {File} file @param {FileSystemFileHandle | null} [handle] */
async function openImageFile(file, handle = null) {
  revokeOpenImageObjectUrl();
  const url = URL.createObjectURL(file);
  openImageObjectUrl = url;

  const target = await resolveOpenImageLayer();
  if (target == null) {
    revokeOpenImageObjectUrl();
    return;
  }

  dismissBackpackPageSelection();

  let img;
  try {
    img = await loadHtmlImage(url);
  } catch {
    revokeOpenImageObjectUrl();
    showToast('Could not open that image');
    return;
  }

  const mode = await resolveRasterImportFit(img, CT_CANVAS_SIZE, 'ask');
  if (!mode) {
    revokeOpenImageObjectUrl();
    return;
  }

  const rect = computeRasterImportRect(img, CT_CANVAS_SIZE, mode);
  const dataUrl = imageElementToDataUrl(img);
  revokeOpenImageObjectUrl();
  if (!dataUrl) {
    showToast('Could not open that image');
    return;
  }

  setActiveLayerIndex(target);
  // Select must be on so the image stays floating and can be moved (incl. past page edges).
  setCtSelectBoundingBoxEnabled(true);
  placeFloatingImage({
    src: dataUrl,
    left: rect.left,
    top: rect.top,
    w: rect.w,
    h: rect.h,
  }, target);

  setCtPrintCanvasLocked(true);

  state.fileName = file.name.replace(OPEN_IMAGE_EXT_RE, '') || 'Untitled';
  state.saveHandle = null;
  state.saveKind = null;
  markDirty();
  window.dispatchEvent(new CustomEvent('ct-open', {
    detail: { fileName: state.fileName, kind: 'image', layerIndex: target },
  }));
  showToast(`Opened ${file.name} on Layer ${target + 1} — Select: drag · corners resize · knob rotate`);
}

/** @param {File} file @param {FileSystemFileHandle | null} [handle] */
async function readOpenFile(file, handle = null) {
  const kind = await sniffOpenKind(file);
  if (kind === 'image') {
    await openImageFile(file, handle);
    return;
  }
  if (kind === 'oss') {
    await readProjectFile(file, handle);
    return;
  }
  throw new Error('Open a Color Time .oss project or PNG/JPEG/WebP/SVG image');
}

/** @param {File} file @param {FileSystemFileHandle | null} [handle] */
async function readProjectFile(file, handle = null) {
  let doc;
  try {
    doc = JSON.parse(await file.text());
  } catch {
    throw new Error('That file is not valid JSON');
  }
  await loadCtProject(doc, file.name, handle);
  showToast(`Opened ${file.name}`);
}

async function openProjectPicker() {
  if (canOpenPickFiles()) {
    try {
      const [handle] = await window.showOpenFilePicker({
        types: OPEN_FILE_TYPES,
        multiple: false,
      });
      try {
        await readOpenFile(await handle.getFile(), handle);
      } catch (err) {
        showToast(openErrorMessage(err));
      }
      return;
    } catch (err) {
      if (err?.name === 'AbortError') return;
    }
  }

  const input = document.getElementById('ct-open-file');
  if (!(input instanceof HTMLInputElement)) return;
  input.value = '';
  input.click();
}

/** @param {unknown} err */
function openErrorMessage(err) {
  if (err instanceof Error && err.message) return err.message;
  return 'Could not open that file';
}

export function startNewCtProject() {
  applyCtCanvasSize(isCtPrintCanvasPref() ? CT_CANVAS_SIZE_PRINT : CT_CANVAS_SIZE_STANDARD);
  setCtPrintCanvasLocked(true);

  revokeOpenImageObjectUrl();
  clearCtHistory();
  clearFloatingState();
  clearCtDrawing();
  clearAllLayers();
  clearBackpackPage();
  state.fileName = null;
  state.saveHandle = null;
  state.saveKind = null;
  markDirty();
  syncCtDocumentTitle(null);
}

export function openCtProjectPicker() {
  return openProjectPicker();
}

export function initCtProject() {
  const popup = document.getElementById('ct-save-as-popup');
  const form = document.getElementById('ct-save-as-form');
  const cancelBtn = document.getElementById('ct-save-as-cancel');
  const ossBtn = document.getElementById('ct-save-as-oss');
  const pngBtn = document.getElementById('ct-save-as-png');
  const saveBtn = document.getElementById('ct-btn-save');
  const openBtn = document.getElementById('ct-btn-open');
  const newBtn = document.getElementById('ct-btn-new');
  const openFile = document.getElementById('ct-open-file');

  openBtn?.addEventListener('click', () => {
    openProjectPicker();
  });

  openFile?.addEventListener('change', async () => {
    const file = openFile.files?.[0];
    if (!file) return;
    try {
      await readOpenFile(file);
    } catch (err) {
      showToast(openErrorMessage(err));
    } finally {
      openFile.value = '';
    }
  });

  saveBtn?.addEventListener('click', () => openSaveAsPopup());

  form?.addEventListener('submit', (e) => {
    e.preventDefault();
    const input = saveAsNameInput();
    if (!input) return;
    saveProjectOss(input.value);
  });

  ossBtn?.addEventListener('click', () => {
    const input = saveAsNameInput();
    if (!input?.value.trim()) {
      input?.focus();
      return;
    }
    saveProjectOss(input.value);
  });

  pngBtn?.addEventListener('click', () => {
    const input = saveAsNameInput();
    if (!input?.value.trim()) {
      input?.focus();
      return;
    }
    saveProjectPng(input.value);
  });

  cancelBtn?.addEventListener('click', () => closeSaveAsPopup());

  popup?.addEventListener('click', (e) => {
    if (e.target === popup) closeSaveAsPopup();
  });

  newBtn?.addEventListener('click', () => {
    startNewCtProject();
  });

  window.addEventListener('ct-stroke-commit', () => markDirty());
  window.addEventListener('ct-shape-commit', () => markDirty());
  window.addEventListener('ct-floating-placed', () => markDirty());
  window.addEventListener('ct-floating-baked', () => markDirty());
  window.addEventListener('ct-wand-cleared', () => markDirty());
  window.addEventListener('ct-layer-order-changed', () => markDirty());
  window.addEventListener('ct-layer-cleared', () => markDirty());
  window.addEventListener('ct-history-undo', () => markDirty());
  window.addEventListener('ct-history-redo', () => markDirty());
  window.addEventListener('ct-history-undo-all', () => markDirty());

  window.addEventListener('ct-backpack-page-opened', (e) => {
    if (e.detail?.clearDrawing) markDirty();
  });

  document.addEventListener('keydown', (e) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
      const t = e.target;
      if (t instanceof HTMLElement && (t.tagName === 'INPUT' || t.tagName === 'TEXTAREA')) return;
      e.preventDefault();
      quickSaveProject();
    }
  });
}
