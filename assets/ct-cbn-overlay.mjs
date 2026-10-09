/**
 * Color27 — CBN number overlay.
 * Numbers sit above paint (pointer-events: none). Tools paint through.
 * When a region has color, its number hides. Undo can bring it back.
 */

import { CT_CANVAS_W, CT_CANVAS_H, getCtCanvasMount } from './ct-canvas.mjs';
import {
  computeRasterImportRect,
  getActiveLayerIndex,
  getLayerCanvas,
  getLayerStrokeCanvas,
} from './ct-layers.mjs';
import { floodVisitRegion } from './draw/ct-flood.mjs';

/** Tight match so AA fringes don't join every white cell to the page. */
const CBN_FLOOD_TOL = 6;
/** Keep floods inside one panel — this balloon art opens to page white. */
const CBN_FLOOD_RADIUS = 56;

/** @typedef {{ n: number, x: number, y: number, cx?: number, cy?: number, hidden?: boolean }} CbnMarker */

/** @type {HTMLCanvasElement | null} */
let overlayCanvas = null;
/** @type {HTMLCanvasElement | null} */
let barrierCanvas = null;
/** @type {CbnMarker[]} */
let markers = [];
/** @type {string | null} */
let activeSrc = null;
/** @type {number} */
let layerIndex = 0;

function ensureOverlay() {
  const mount = getCtCanvasMount();
  if (!(mount instanceof HTMLElement)) return null;
  if (overlayCanvas?.isConnected) return overlayCanvas;
  const canvas = document.createElement('canvas');
  canvas.id = 'ct-cbn-overlay';
  canvas.className = 'ct-cbn-overlay';
  canvas.setAttribute('aria-hidden', 'true');
  canvas.width = CT_CANVAS_W;
  canvas.height = CT_CANVAS_H;
  mount.appendChild(canvas);
  overlayCanvas = canvas;
  return canvas;
}

function resizeOverlay() {
  const canvas = ensureOverlay();
  if (!canvas) return;
  if (canvas.width !== CT_CANVAS_W || canvas.height !== CT_CANVAS_H) {
    canvas.width = CT_CANVAS_W;
    canvas.height = CT_CANVAS_H;
  }
}

/**
 * Chromatic user fill — ignores paper white and gray/black line-art AA.
 * @param {Uint8ClampedArray} paintData
 * @param {number} o
 */
function pixelLooksPainted(paintData, o) {
  const a = paintData[o + 3];
  if (a < 24) return false;
  const r = paintData[o];
  const g = paintData[o + 1];
  const b = paintData[o + 2];
  if (r > 242 && g > 242 && b > 242) return false;
  const chroma = Math.max(r, g, b) - Math.min(r, g, b);
  return chroma >= 28;
}

/**
 * Map source-viewBox seed → canvas px after contain placement.
 * @param {number} sx
 * @param {number} sy
 * @param {{ w: number, h: number }} viewBox
 * @param {{ left: number, top: number, w: number, h: number }} rect
 */
function mapSeed(sx, sy, viewBox, rect) {
  return {
    x: rect.left + (sx / viewBox.w) * rect.w,
    y: rect.top + (sy / viewBox.h) * rect.h,
  };
}

/** Prefer a light paper pixel so we flood the cell, not the black outline. */
function nudgeToPaper(sampleData, w, h, sx, sy) {
  const xi = Math.round(sx);
  const yi = Math.round(sy);
  const tryAt = (x, y) => {
    if (x < 0 || y < 0 || x >= w || y >= h) return null;
    const o = (y * w + x) * 4;
    const a = sampleData[o + 3];
    const r = sampleData[o];
    const g = sampleData[o + 1];
    const b = sampleData[o + 2];
    if (a > 200 && r > 220 && g > 220 && b > 220) return { x, y };
    if (a <= 1) return { x, y };
    return null;
  };
  const hit = tryAt(xi, yi);
  if (hit) return hit;
  for (let r = 1; r <= 14; r += 1) {
    for (let dy = -r; dy <= r; dy += 1) {
      for (let dx = -r; dx <= r; dx += 1) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const found = tryAt(xi + dx, yi + dy);
        if (found) return found;
      }
    }
  }
  return { x: xi, y: yi };
}

/**
 * Snap seed to flood-region centroid so the digit sits in the middle of the cell.
 * @param {Uint8ClampedArray} sampleData
 * @param {number} w
 * @param {number} h
 * @param {number} sx
 * @param {number} sy
 */
function snapToCentroid(sampleData, w, h, sx, sy) {
  const paper = nudgeToPaper(sampleData, w, h, sx, sy);
  const ox = paper.x;
  const oy = paper.y;
  let sumX = 0;
  let sumY = 0;
  let n = 0;
  floodVisitRegion(
    sampleData,
    w,
    h,
    ox,
    oy,
    CBN_FLOOD_TOL,
    (x, y) => {
      sumX += x;
      sumY += y;
      n += 1;
    },
    { maxRadius: CBN_FLOOD_RADIUS },
  );
  if (n < 8) return { x: ox, y: oy, count: n };
  return { x: sumX / n, y: sumY / n, count: n };
}

/**
 * True if the fillable region around (sx,sy) already has paint (not line art).
 * Floods on pristine line-art barriers so strokes/fills don't split the cell.
 * @param {number} sx
 * @param {number} sy
 */
/** Scratch for compositing raster + strokes when testing “has paint”. */
let paintProbeCanvas = /** @type {HTMLCanvasElement | null} */ (null);

function regionHasPaint(sx, sy) {
  if (!barrierCanvas) return false;
  const barrierCtx = barrierCanvas.getContext('2d', { willReadFrequently: true });
  const paint = getLayerCanvas(layerIndex);
  if (!barrierCtx || !paint) return false;
  const w = barrierCanvas.width;
  const h = barrierCanvas.height;
  if (!paintProbeCanvas || paintProbeCanvas.width !== w || paintProbeCanvas.height !== h) {
    paintProbeCanvas = document.createElement('canvas');
    paintProbeCanvas.width = w;
    paintProbeCanvas.height = h;
  }
  const probeCtx = paintProbeCanvas.getContext('2d', { willReadFrequently: true });
  if (!probeCtx) return false;
  probeCtx.setTransform(1, 0, 0, 1, 0, 0);
  probeCtx.clearRect(0, 0, w, h);
  probeCtx.drawImage(paint, 0, 0);
  const strokes = getLayerStrokeCanvas(layerIndex);
  if (strokes) probeCtx.drawImage(strokes, 0, 0);

  const sampleData = barrierCtx.getImageData(0, 0, w, h).data;
  const paintData = probeCtx.getImageData(0, 0, w, h).data;
  const paper = nudgeToPaper(sampleData, w, h, sx, sy);
  let painted = false;
  floodVisitRegion(
    sampleData,
    w,
    h,
    paper.x,
    paper.y,
    CBN_FLOOD_TOL,
    (_x, _y, o) => {
      if (pixelLooksPainted(paintData, o)) {
        painted = true;
        return false;
      }
    },
    { maxRadius: CBN_FLOOD_RADIUS },
  );
  return painted;
}

function drawMarkers() {
  const canvas = ensureOverlay();
  if (!canvas) return;
  resizeOverlay();
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  if (!markers.length) return;

  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  for (const m of markers) {
    if (m.hidden) continue;
    const x = m.cx ?? m.x;
    const y = m.cy ?? m.y;
    const label = String(m.n);
    /* Scale type to canvas; Fredoka-ish stack via CSS font if loaded */
    const size = Math.max(14, Math.round(Math.min(CT_CANVAS_W, CT_CANVAS_H) * 0.045));
    ctx.font = `700 ${size}px Fredoka, "Arial Black", sans-serif`;
    ctx.lineWidth = Math.max(2, size * 0.12);
    ctx.strokeStyle = 'rgba(255,255,255,0.92)';
    ctx.fillStyle = '#1a1a1a';
    ctx.strokeText(label, x, y);
    ctx.fillText(label, x, y);
  }
}

export function refreshCtCbnOverlay() {
  if (!markers.length) {
    clearCtCbnOverlay();
    return;
  }
  for (const m of markers) {
    const x = m.cx ?? m.x;
    const y = m.cy ?? m.y;
    m.hidden = regionHasPaint(x, y);
  }
  drawMarkers();
}

export function clearCtCbnOverlay() {
  markers = [];
  activeSrc = null;
  barrierCanvas = null;
  if (overlayCanvas) {
    const ctx = overlayCanvas.getContext('2d');
    ctx?.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height);
    overlayCanvas.hidden = true;
  }
}

/**
 * @param {string} pageSrc backpack image URL
 * @param {{ layerIndex?: number }} [opts]
 */
export async function loadCtCbnOverlayForPage(pageSrc, opts = {}) {
  clearCtCbnOverlay();
  if (!pageSrc) return false;

  const cbnUrl = pageSrc.replace(/\.[^.]+$/i, '.cbn.json');
  let doc;
  try {
    const res = await fetch(cbnUrl, { cache: 'no-cache' });
    if (!res.ok) return false;
    doc = await res.json();
  } catch {
    return false;
  }

  const list = Array.isArray(doc?.markers) ? doc.markers : [];
  if (!list.length) return false;

  const vb = doc.viewBox && typeof doc.viewBox === 'object'
    ? {
      w: Number(doc.viewBox.w) || 512,
      h: Number(doc.viewBox.h) || 512,
    }
    : { w: 512, h: 512 };

  layerIndex = typeof opts.layerIndex === 'number' ? opts.layerIndex : getActiveLayerIndex();
  activeSrc = pageSrc;

  const rect = computeRasterImportRect(
    { naturalWidth: vb.w, naturalHeight: vb.h },
    { w: CT_CANVAS_W, h: CT_CANVAS_H },
    'contain',
  );

  /* Pristine line art for flood barriers (not live paint). */
  barrierCanvas = document.createElement('canvas');
  barrierCanvas.width = CT_CANVAS_W;
  barrierCanvas.height = CT_CANVAS_H;
  const bctx = barrierCanvas.getContext('2d', { willReadFrequently: true });
  if (!bctx) return false;
  await new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      bctx.setTransform(1, 0, 0, 1, 0, 0);
      bctx.clearRect(0, 0, CT_CANVAS_W, CT_CANVAS_H);
      bctx.fillStyle = '#ffffff';
      bctx.fillRect(0, 0, CT_CANVAS_W, CT_CANVAS_H);
      bctx.drawImage(img, rect.left, rect.top, rect.w, rect.h);
      resolve(undefined);
    };
    img.onerror = () => reject(new Error('CBN barrier image failed'));
    img.src = pageSrc;
  }).catch(() => null);
  if (!barrierCanvas) return false;

  const sampleData = bctx.getImageData(0, 0, barrierCanvas.width, barrierCanvas.height).data;

  /** @type {CbnMarker[]} */
  const next = [];
  for (const raw of list) {
    const n = Number(raw?.n);
    if (!Number.isFinite(n)) continue;
    const seed = mapSeed(Number(raw.x), Number(raw.y), vb, rect);
    let cx = seed.x;
    let cy = seed.y;
    const snapped = snapToCentroid(sampleData, barrierCanvas.width, barrierCanvas.height, seed.x, seed.y);
    if (snapped.count >= 8) {
      cx = snapped.x;
      cy = snapped.y;
    }
    next.push({
      n,
      x: seed.x,
      y: seed.y,
      cx,
      cy,
      hidden: false,
    });
  }

  markers = next;
  const canvas = ensureOverlay();
  if (canvas) canvas.hidden = false;
  refreshCtCbnOverlay();
  if (typeof window !== 'undefined') {
    window.__ctCbnDebug = {
      count: markers.length,
      markers: markers.map((m) => ({
        n: m.n,
        cx: Math.round(m.cx ?? m.x),
        cy: Math.round(m.cy ?? m.y),
        hidden: !!m.hidden,
      })),
    };
  }
  return markers.length > 0;
}

export function initCtCbnOverlay() {
  ensureOverlay();
  window.addEventListener('ct-stroke-commit', () => {
    if (markers.length) refreshCtCbnOverlay();
  });
  window.addEventListener('ct-history-undo', () => {
    if (markers.length) refreshCtCbnOverlay();
  });
  window.addEventListener('ct-history-redo', () => {
    if (markers.length) refreshCtCbnOverlay();
  });
  window.addEventListener('ct-backpack-page-cleared', () => {
    clearCtCbnOverlay();
  });
}
