/**
 * Watery — first pass toward Global Art / Shepard-style watercolor on smooth paper.
 * Blobby + runny. Dark line art (crayon, Inky, marker) acts as a wax resist;
 * the wash only creeps ~10% of Line width over that wall. Wet-on-wet uses
 * Marker’s ink grid: 50% of amoebas mix a new pigment, 25% stay 75% stroke,
 * 25% stay 75% the wet color.
 */

import { fillAmoebaSplat, lxSeed, sampleAlong } from './shared.mjs';
import {
  lerpRgb,
  multiplyRgbFloor,
  parseHexColor,
  query,
  rgbToHex,
  stampPolylineDiscs,
  WET_WINDOW_SEC_DEFAULT,
} from '../ct-marker-wet.mjs';

/** Bleed past a resist wall, as a fraction of Line width. */
export const WATERY_RESIST_BLEED = 0.1;

/** Luma below this + enough alpha = crayon/ink wall (not a colorful wash). */
const WALL_LUMA = 90;
const WALL_ALPHA = 110;

/** @param {readonly string[] | null | undefined} palette @param {{ r: number, g: number, b: number }} fallback @param {number} t */
function rgbAlongPalette(palette, fallback, t) {
  if (!palette || palette.length < 2) return fallback;
  const idx = Math.min(palette.length - 1, Math.floor(Math.max(0, Math.min(1, t)) * palette.length));
  const parsed = parseHexColor(palette[idx]) || parseRgb(palette[idx]);
  return parsed || fallback;
}

/** @type {((octx: CanvasRenderingContext2D, destCanvas: HTMLCanvasElement) => void) | null} */
let extraBarrierDrawer = null;

/** Other layers' ink (line art on Layer 1, wash on Layer 2). */
export function setWateryBarrierDrawer(fn) {
  extraBarrierDrawer = typeof fn === 'function' ? fn : null;
}

/** @type {HTMLCanvasElement | null} */
let washCanvas = null;
/** @type {HTMLCanvasElement | null} */
let barrierCanvas = null;
/** @type {HTMLCanvasElement | null} */
let maskCanvas = null;

/** @type {{ sig: string, mask: ImageData | null }} */
let resistCache = { sig: '', mask: null };

/**
 * @param {string} hex
 * @returns {{ r: number, g: number, b: number }}
 */
function parseRgb(hex) {
  const h = String(hex || '').replace('#', '');
  if (h.length !== 6) return { r: 0, g: 135, b: 249 };
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * @param {number} r
 * @param {number} g
 * @param {number} b
 * @param {number} a
 */
function rgba(r, g, b, a) {
  return `rgba(${r},${g},${b},${Math.max(0, Math.min(1, a))})`;
}

/**
 * @param {number} w
 * @param {number} h
 * @param {HTMLCanvasElement | null} prev
 */
function sizeCanvas(w, h, prev) {
  if (prev && prev.width === w && prev.height === h) return prev;
  const c = prev || document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

/**
 * @param {Uint8ClampedArray} data
 * @param {number} o
 */
function isWallAt(data, o) {
  const a = data[o + 3];
  if (a < WALL_ALPHA) return false;
  const luma = 0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2];
  return luma < WALL_LUMA;
}

/**
 * @param {Uint8Array} mask
 * @param {number} w
 * @param {number} h
 * @param {number} radius
 */
function dilateMask(mask, w, h, radius) {
  const r = Math.max(0, Math.round(radius));
  if (r < 1) return mask;
  const out = new Uint8Array(mask.length);
  const r2 = r * r;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      if (!mask[y * w + x]) continue;
      const x0 = Math.max(0, x - r);
      const x1 = Math.min(w - 1, x + r);
      const y0 = Math.max(0, y - r);
      const y1 = Math.min(h - 1, y + r);
      for (let yy = y0; yy <= y1; yy++) {
        const dy = yy - y;
        for (let xx = x0; xx <= x1; xx++) {
          const dx = xx - x;
          if (dx * dx + dy * dy <= r2) out[yy * w + xx] = 1;
        }
      }
    }
  }
  return out;
}

/**
 * Flood through non-wall pixels from (sx, sy).
 * @param {Uint8ClampedArray} data
 * @param {number} w
 * @param {number} h
 * @param {number} sx
 * @param {number} sy
 */
function floodInterior(data, w, h, sx, sy) {
  const start = Math.max(0, Math.min(w - 1, sx | 0)) + Math.max(0, Math.min(h - 1, sy | 0)) * w;
  if (isWallAt(data, start * 4)) {
    const r = 6;
    findPaper: for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        const x = (sx | 0) + dx;
        const y = (sy | 0) + dy;
        if (x < 0 || y < 0 || x >= w || y >= h) continue;
        if (!isWallAt(data, (y * w + x) * 4)) {
          sx = x;
          sy = y;
          break findPaper;
        }
      }
    }
  }
  if (isWallAt(data, (Math.max(0, Math.min(h - 1, sy | 0)) * w + Math.max(0, Math.min(w - 1, sx | 0))) * 4)) {
    return null;
  }

  const visited = new Uint8Array(w * h);
  const stack = [sx | 0, sy | 0];
  let count = 0;
  while (stack.length) {
    const y = stack.pop();
    let x = stack.pop();
    if (y < 0 || y >= h || x < 0 || x >= w) continue;
    const i0 = y * w + x;
    if (visited[i0] || isWallAt(data, i0 * 4)) continue;
    let xLeft = x;
    while (xLeft >= 0 && !visited[y * w + xLeft] && !isWallAt(data, (y * w + xLeft) * 4)) xLeft -= 1;
    xLeft += 1;
    let xRight = x;
    while (xRight < w && !visited[y * w + xRight] && !isWallAt(data, (y * w + xRight) * 4)) xRight += 1;
    let spanUp = false;
    let spanDown = false;
    for (let px = xLeft; px < xRight; px++) {
      const i = y * w + px;
      visited[i] = 1;
      count += 1;
      if (y > 0) {
        const up = i - w;
        const open = !visited[up] && !isWallAt(data, up * 4);
        if (open) {
          if (!spanUp) {
            stack.push(px, y - 1);
            spanUp = true;
          }
        } else spanUp = false;
      }
      if (y < h - 1) {
        const dn = i + w;
        const open = !visited[dn] && !isWallAt(data, dn * 4);
        if (open) {
          if (!spanDown) {
            stack.push(px, y + 1);
            spanDown = true;
          }
        } else spanDown = false;
      }
    }
  }
  if (count < 24 || count > w * h * OPEN_PAGE_FRAC) return null;
  return visited;
}

/**
 * @param {CanvasRenderingContext2D} destCtx
 * @param {number} sx
 * @param {number} sy
 * @param {number} bleedPx
 */
function resistMask(destCtx, sx, sy, bleedPx) {
  const w = destCtx.canvas.width;
  const h = destCtx.canvas.height;
  const dest = destCtx.canvas;
  let checksum = 0;
  try {
    const probe = destCtx.getImageData(Math.max(0, (sx | 0) - 1), Math.max(0, (sy | 0) - 1), 3, 3).data;
    for (let i = 0; i < probe.length; i += 4) checksum = (checksum * 33 + probe[i + 3]) | 0;
  } catch {
    checksum = 0;
  }
  const sig = `${w}x${h}@${sx | 0},${sy | 0}:${bleedPx | 0}:${checksum}`;
  if (resistCache.sig === sig) return resistCache.mask;

  barrierCanvas = sizeCanvas(w, h, barrierCanvas);
  const bctx = barrierCanvas.getContext('2d', { willReadFrequently: true });
  if (!bctx) {
    resistCache = { sig, mask: null };
    return null;
  }
  bctx.setTransform(1, 0, 0, 1, 0, 0);
  bctx.clearRect(0, 0, w, h);
  extraBarrierDrawer?.(bctx, dest);
  bctx.drawImage(dest, 0, 0);

  let interior = null;
  try {
    const sample = bctx.getImageData(0, 0, w, h);
    interior = floodInterior(sample.data, w, h, sx, sy);
  } catch {
    interior = null;
  }
  if (!interior) {
    resistCache = { sig, mask: null };
    return null;
  }
  const grown = dilateMask(interior, w, h, bleedPx);
  maskCanvas = sizeCanvas(w, h, maskCanvas);
  const mctx = maskCanvas.getContext('2d');
  if (!mctx) {
    resistCache = { sig, mask: null };
    return null;
  }
  const img = mctx.createImageData(w, h);
  const d = img.data;
  for (let i = 0; i < grown.length; i++) {
    if (!grown[i]) continue;
    const o = i * 4;
    d[o] = 255;
    d[o + 1] = 255;
    d[o + 2] = 255;
    d[o + 3] = 255;
  }
  mctx.putImageData(img, 0, 0);
  resistCache = { sig, mask: img };
  return img;
}

/**
 * Marker-style wet pickup, then 50 / 25 / 25 among stacked amoebas:
 * half become a new mixed pigment; a quarter stay 75% stroke; a quarter stay 75% wet.
 * @param {{ r: number, g: number, b: number }} src
 * @param {{ r: number, g: number, b: number } | null} wet
 * @param {number} mixT 0–1 Blend/Splatter
 * @param {boolean} dry
 * @param {number} seed
 */
function waterySplatRgb(src, wet, mixT, dry, seed) {
  if (!wet || mixT <= 0) return src;
  const dist = Math.abs(wet.r - src.r) + Math.abs(wet.g - src.g) + Math.abs(wet.b - src.b);
  if (dist < 56) return src;
  const roll = lxSeed(seed + 11, src.r, wet.b);
  let mixed;
  if (roll < 0.5) mixed = multiplyRgbFloor(src, wet);
  else if (roll < 0.75) mixed = lerpRgb(wet, src, 0.75);
  else mixed = lerpRgb(wet, src, 0.25);
  const t = dry ? mixT * 0.62 : mixT;
  return lerpRgb(src, mixed, t);
}

/**
 * @param {object | null | undefined} mw
 * @param {number} x
 * @param {number} y
 */
function queryWetAt(mw, x, y) {
  if (!mw || mw.layerIndex == null || !mw.logicalW || !mw.logicalH || mw.commitMs == null) {
    return { kind: 'fresh' };
  }
  const winMs = Math.max(1, (mw.wetWindowSec ?? WET_WINDOW_SEC_DEFAULT)) * 1000 * 1000;
  const queryMs = mw.commitMs ?? Date.now();
  return query(mw.layerIndex, mw.logicalW, mw.logicalH, x, y, queryMs, winMs);
}

/**
 * Previous paint already on dest (live float or overlay replay). The wet grid
 * can miss after pen-up; dest pixels still have the red the live stroke sat on.
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} pts
 * @param {number} pad
 * @returns {{ x0: number, y0: number, w: number, h: number, data: ImageData } | null}
 */
function readDestRegion(ctx, pts, pad) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const p of pts) {
    minX = Math.min(minX, p.x);
    minY = Math.min(minY, p.y);
    maxX = Math.max(maxX, p.x);
    maxY = Math.max(maxY, p.y);
  }
  if (!Number.isFinite(minX)) return null;
  const x0 = Math.max(0, Math.floor(minX - pad));
  const y0 = Math.max(0, Math.floor(minY - pad));
  const x1 = Math.min(ctx.canvas.width, Math.ceil(maxX + pad));
  const y1 = Math.min(ctx.canvas.height, Math.ceil(maxY + pad));
  const w = x1 - x0;
  const h = y1 - y0;
  if (w < 1 || h < 1) return null;
  try {
    return { x0, y0, w, h, data: ctx.getImageData(x0, y0, w, h) };
  } catch {
    return null;
  }
}

/**
 * @param {{ x0: number, y0: number, w: number, h: number, data: ImageData } | null} region
 * @param {number} x
 * @param {number} y
 */
function destRgbAt(region, x, y) {
  if (!region) return null;
  const ix = (x | 0) - region.x0;
  const iy = (y | 0) - region.y0;
  const d = region.data.data;
  let r = 0;
  let g = 0;
  let b = 0;
  let n = 0;
  for (let dy = -1; dy <= 1; dy += 1) {
    for (let dx = -1; dx <= 1; dx += 1) {
      const px = ix + dx;
      const py = iy + dy;
      if (px < 0 || py < 0 || px >= region.w || py >= region.h) continue;
      const o = (py * region.w + px) * 4;
      if (d[o + 3] < 18) continue;
      r += d[o];
      g += d[o + 1];
      b += d[o + 2];
      n += 1;
    }
  }
  if (!n) return null;
  return { r: Math.round(r / n), g: Math.round(g / n), b: Math.round(b / n) };
}

/** Layer-tile thumbs are tiny canvases; stamping them pollutes the wet grid. */
function canStampWet(mw, ctx) {
  return !!(
    mw &&
    mw.stamp !== false &&
    mw.commitMs != null &&
    mw.layerIndex != null &&
    mw.logicalW &&
    mw.logicalH &&
    ctx?.canvas &&
    ctx.canvas.width === mw.logicalW &&
    ctx.canvas.height === mw.logicalH
  );
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} points
 * @param {string} color
 * @param {number} width
 * @param {number} opacity
 * @param {number} amount 0–100
 * @param {{ pigmentMix?: number, markerWetOpts?: object | null, palette?: readonly string[] | null }} [extras]
 */
export function drawWatery(ctx, points, color, width, opacity, amount, extras = {}) {
  if (!points?.length) return;
  const pts = points.length < 2 ? [points[0], points[0]] : points;
  const src = parseHexColor(color) || parseRgb(color);
  const mixT = Math.max(0, Math.min(100, Number(extras.pigmentMix ?? amount) || 0)) / 100;
  const amt = Math.max(0, Math.min(100, Number(amount) || 0)) / 100;
  const op = Number.isFinite(opacity) ? Math.max(0.15, Math.min(1, opacity)) : 0.85;
  const w = Math.max(8, Number(width) || 24);
  const splat = 0.35 + amt * 1.15;
  const radius = w * (0.42 + amt * 0.55);
  const spacing = Math.max(4, radius * (0.38 - amt * 0.12));
  const bleedPx = Math.max(1, Math.round(w * WATERY_RESIST_BLEED));
  const mw = extras.markerWetOpts ?? null;

  const cw = ctx.canvas.width;
  const ch = ctx.canvas.height;
  washCanvas = sizeCanvas(cw, ch, washCanvas);
  const wctx = washCanvas.getContext('2d');
  if (!wctx) return;
  wctx.setTransform(1, 0, 0, 1, 0, 0);
  wctx.clearRect(0, 0, cw, ch);
  wctx.globalCompositeOperation = 'source-over';

  const destWet = mixT > 0 ? readDestRegion(ctx, pts, radius * 2.4) : null;
  const stampOk = canStampWet(mw, ctx);

  let i = 0;
  const stamps = [...sampleAlong(pts, spacing)];
  const stampN = Math.max(1, stamps.length - 1);
  for (const p of stamps) {
    const seed = (i * 17 + (p.x | 0) * 3 + (p.y | 0)) | 0;
    const here = rgbAlongPalette(extras.palette, src, i / stampN);
    const wob = lxSeed(seed, p.x, p.y);
    const run = (0.08 + amt * 0.22) * radius;
    const cx = p.x + (lxSeed(seed + 3, p.y, p.x) - 0.5) * radius * 0.35;
    const cy = p.y + run + (wob - 0.35) * radius * 0.2;
    const rad = radius * (0.72 + wob * splat);
    const q = queryWetAt(mw, cx, cy);
    const wet = q.rgb ?? destRgbAt(destWet, cx, cy) ?? destRgbAt(destWet, p.x, p.y);
    const rgb = waterySplatRgb(here, wet, mixT, q.kind === 'dry', seed);
    wctx.globalAlpha = op * (0.16 + amt * 0.14);
    wctx.fillStyle = rgba(rgb.r, rgb.g, rgb.b, 1);
    fillAmoebaSplat(wctx, cx, cy, rad, seed);
    wctx.globalAlpha = op * (0.1 + amt * 0.08);
    wctx.fillStyle = rgba(Math.max(0, rgb.r - 18), Math.max(0, rgb.g - 12), Math.min(255, rgb.b + 8), 1);
    fillAmoebaSplat(wctx, cx + rad * 0.08, cy + rad * 0.12, rad * 0.62, seed + 9);
    if (stampOk) {
      stampPolylineDiscs(
        mw.layerIndex,
        mw.logicalW,
        mw.logicalH,
        [{ x: cx, y: cy }],
        Math.max(rad * 0.7, 4),
        mw.commitMs,
        rgbToHex(rgb.r, rgb.g, rgb.b),
      );
    }
    i += 1;
  }

  /* Coffee-ring: darker puddle edge, no extra fill. */
  i = 0;
  const rings = [...sampleAlong(pts, spacing * 1.6)];
  const ringN = Math.max(1, rings.length - 1);
  wctx.globalCompositeOperation = 'source-over';
  wctx.fillStyle = 'rgba(0,0,0,0)';
  for (const p of rings) {
    const seed = (i * 19 + (p.x | 0)) | 0;
    const edge = rgbAlongPalette(extras.palette, src, i / ringN);
    const rad = radius * (0.55 + lxSeed(seed, p.x, p.y) * 0.35);
    wctx.globalAlpha = op * 0.22;
    wctx.strokeStyle = rgba(Math.max(0, edge.r - 40), Math.max(0, edge.g - 28), Math.max(0, edge.b - 10), 1);
    wctx.lineWidth = Math.max(1.2, w * 0.06);
    fillAmoebaSplat(wctx, p.x, p.y + radius * 0.1, rad * 1.05, seed);
    wctx.globalAlpha = op * 0.18;
    wctx.stroke();
    i += 1;
  }
  wctx.globalAlpha = 1;

  const mask = resistMask(ctx, pts[0].x, pts[0].y, bleedPx);
  if (mask && maskCanvas) {
    wctx.save();
    wctx.globalCompositeOperation = 'destination-in';
    wctx.filter = `blur(${Math.min(2.5, bleedPx * 0.35)}px)`;
    wctx.drawImage(maskCanvas, 0, 0);
    wctx.filter = 'none';
    wctx.restore();
  }

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.filter = `blur(${Math.max(0.6, w * 0.025)}px)`;
  ctx.drawImage(washCanvas, 0, 0);
  ctx.filter = 'none';
  ctx.restore();
}
