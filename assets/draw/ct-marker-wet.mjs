/**
 * v1 `marker-wet.js` — per-layer wet ink grid for marker bleed/stacking.
 */

const CELL_LOGICAL = 4;
const WET_WINDOW_SEC_DEFAULT = 30;

/** @type {Map<number, { cols: number, rows: number, times: Float64Array, r: Uint8Array, g: Uint8Array, b: Uint8Array }>} */
const buffers = new Map();

let lastCommitMs = 0;
let commitSeq = 0;

function clamp(v, lo, hi) {
  return Math.max(lo, Math.min(hi, v));
}

/**
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number } | null}
 */
export function parseHexColor(hex) {
  if (!hex || typeof hex !== 'string') return null;
  const h = hex.replace(/^#/, '');
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  if (h.length !== 6) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/** @param {{ r: number, g: number, b: number }} a @param {{ r: number, g: number, b: number }} b @param {number} t */
export function lerpRgb(a, b, t) {
  return {
    r: Math.round(a.r + (b.r - a.r) * t),
    g: Math.round(a.g + (b.g - a.g) * t),
    b: Math.round(a.b + (b.b - a.b) * t),
  };
}

/** Blend/Splatter 0–100 → wet/dry pigment lerp (50 ≈ legacy 0.42 / 0.28). 0 skips hue mix in the stroke. */
export function pigmentMixLerpStrength(mix0to100) {
  const t = Math.max(0, Math.min(100, Number(mix0to100))) / 100;
  return {
    wet: 0.05 + t * 0.7,
    dry: 0.02 + t * 0.48,
  };
}

/** @param {{ r: number, g: number, b: number }} u @param {{ r: number, g: number, b: number }} v */
export function multiplyRgbFloor(u, v) {
  return {
    r: Math.floor((u.r * v.r) / 255),
    g: Math.floor((u.g * v.g) / 255),
    b: Math.floor((u.b * v.b) / 255),
  };
}

export function rgbToHex(r, g, b) {
  const h = (n) => clamp(Math.round(n), 0, 255).toString(16).padStart(2, '0');
  return `#${h(r)}${h(g)}${h(b)}`;
}

function getBuf(layerIdx, logicalW, logicalH) {
  const cols = Math.max(1, Math.ceil(logicalW / CELL_LOGICAL));
  const rows = Math.max(1, Math.ceil(logicalH / CELL_LOGICAL));
  const n = cols * rows;
  let b = buffers.get(layerIdx);
  if (!b || b.cols !== cols || b.rows !== rows) {
    b = {
      cols,
      rows,
      times: new Float64Array(n),
      r: new Uint8Array(n),
      g: new Uint8Array(n),
      b: new Uint8Array(n),
    };
    buffers.set(layerIdx, b);
  }
  return b;
}

export function allocateCommitMs() {
  commitSeq += 1;
  return Date.now() * 1000 + commitSeq;
}

export function beginLayerReplay(layerIdx, logicalW, logicalH) {
  const b = getBuf(layerIdx, logicalW, logicalH);
  b.times.fill(0);
  b.r.fill(0);
  b.g.fill(0);
  b.b.fill(0);
}

/**
 * @param {number} layerIdx
 * @param {number} logicalW
 * @param {number} logicalH
 * @param {number} lx
 * @param {number} ly
 * @param {number} nowMs
 * @param {number} winMs
 * @returns {{ kind: 'fresh'|'wet'|'dry', rgb?: { r: number, g: number, b: number } }}
 */
export function query(layerIdx, logicalW, logicalH, lx, ly, commitMs, windowMs) {
  const b = getBuf(layerIdx, logicalW, logicalH);
  const ix = clamp(Math.floor(lx / CELL_LOGICAL), 0, b.cols - 1);
  const iy = clamp(Math.floor(ly / CELL_LOGICAL), 0, b.rows - 1);
  const idx = iy * b.cols + ix;
  const t = b.times[idx];
  if (!t || t <= 0) return { kind: 'fresh' };
  if (!(commitMs > t)) return { kind: 'fresh' };
  const age = commitMs - t;
  const rgb = { r: b.r[idx], g: b.g[idx], b: b.b[idx] };
  if (age < windowMs) return { kind: 'wet', rgb };
  return { kind: 'dry', rgb };
}

function stampCell(b, ix, iy, tMs, pr, pg, pb) {
  if (ix < 0 || iy < 0 || ix >= b.cols || iy >= b.rows) return;
  const idx = iy * b.cols + ix;
  b.times[idx] = tMs;
  b.r[idx] = pr;
  b.g[idx] = pg;
  b.b[idx] = pb;
}

/**
 * @param {number} layerIdx
 * @param {number} logicalW
 * @param {number} logicalH
 * @param {{ x: number, y: number }[]} points
 * @param {number} halfWidthPx
 * @param {number} tMs
 * @param {string} colorHex
 */
export function stampPolylineDiscs(layerIdx, logicalW, logicalH, points, halfWidthPx, tMs, colorHex) {
  const rgb = parseHexColor(colorHex);
  if (!rgb || !points?.length) return;
  const b = getBuf(layerIdx, logicalW, logicalH);
  const half = Math.max(halfWidthPx, CELL_LOGICAL * 0.75);
  const cellR = Math.min(64, Math.ceil(half / CELL_LOGICAL) + 1);

  function stampAt(px, py) {
    const cx = Math.floor(px / CELL_LOGICAL);
    const cy = Math.floor(py / CELL_LOGICAL);
    for (let dy = -cellR; dy <= cellR; dy++) {
      for (let dx = -cellR; dx <= cellR; dx++) {
        const ix = cx + dx;
        const iy = cy + dy;
        if (ix < 0 || iy < 0 || ix >= b.cols || iy >= b.rows) continue;
        const gx = (ix + 0.5) * CELL_LOGICAL;
        const gy = (iy + 0.5) * CELL_LOGICAL;
        if (Math.hypot(gx - px, gy - py) <= half) {
          stampCell(b, ix, iy, tMs, rgb.r, rgb.g, rgb.b);
        }
      }
    }
  }

  if (points.length === 1) {
    stampAt(points[0].x, points[0].y);
    return;
  }
  const step = Math.max(1.5, CELL_LOGICAL * 0.45);
  for (let pi = 1; pi < points.length; pi++) {
    const x0 = points[pi - 1].x;
    const y0 = points[pi - 1].y;
    const x1 = points[pi].x;
    const y1 = points[pi].y;
    const len = Math.hypot(x1 - x0, y1 - y0) || 1;
    const nSteps = Math.max(1, Math.ceil(len / step));
    for (let si = 0; si <= nSteps; si++) {
      const u = si / nSteps;
      stampAt(x0 + (x1 - x0) * u, y0 + (y1 - y0) * u);
    }
  }
}

export { CELL_LOGICAL, WET_WINDOW_SEC_DEFAULT };
