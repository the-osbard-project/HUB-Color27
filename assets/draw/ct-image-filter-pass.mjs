import { drawBrushStrokeBaseOnCtx, strokePointsBbox } from './ct-stroke-base.mjs';

function hash01(x, y, seed) {
  const v = Math.sin((x + 1) * 12.9898 + (y + 1) * 78.233 + seed * 0.017) * 43758.5453;
  return v - Math.floor(v);
}

/**
 * @param {Uint8ClampedArray} src
 * @param {number} w
 * @param {number} h
 * @param {number} x
 * @param {number} y
 */
function sampleBilinearRGBA(src, w, h, x, y) {
  const cx = Math.max(0, Math.min(w - 1.001, x));
  const cy = Math.max(0, Math.min(h - 1.001, y));
  const x0 = Math.floor(cx);
  const y0 = Math.floor(cy);
  const fx = cx - x0;
  const fy = cy - y0;
  const i00 = (y0 * w + x0) * 4;
  const i10 = (y0 * w + x0 + 1) * 4;
  const i01 = ((y0 + 1) * w + x0) * 4;
  const i11 = ((y0 + 1) * w + x0 + 1) * 4;
  const lerp = (a, b, t) => a + (b - a) * t;
  const out = [0, 0, 0, 0];
  for (let c = 0; c < 4; c++) {
    out[c] = lerp(
      lerp(src[i00 + c], src[i10 + c], fx),
      lerp(src[i01 + c], src[i11 + c], fx),
      fy,
    );
  }
  return out;
}

/**
 * v1 `object-filters.js` `applyRoughenImageData` (Furry brush FX).
 * @param {ImageData} img
 * @param {number} intensity 0–100
 * @param {number} seed
 */
export function applyRoughenImageData(img, intensity, seed) {
  const d = img.data;
  const w = img.width;
  const h = img.height;
  const t = intensity / 100;
  if (t <= 0) return;
  const src = new Uint8ClampedArray(d);
  const amp = 0.35 + t * 3.2;
  const out = new Uint8ClampedArray(d.length);
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const ox = (hash01(x, y, seed) - 0.5) * 2 * amp;
      const oy = (hash01(x + 3.1, y + 5.7, seed) - 0.5) * 2 * amp;
      const p = sampleBilinearRGBA(src, w, h, x + ox, y + oy);
      out[i] = Math.round(p[0]);
      out[i + 1] = Math.round(p[1]);
      out[i + 2] = Math.round(p[2]);
      out[i + 3] = Math.round(p[3]);
    }
  }
  d.set(out);
}

/** v1 `object-filters.js` `applyGrainImageData` */
export function applyGrainImageData(img, intensity, seed) {
  const d = img.data;
  const w = img.width;
  const h = img.height;
  const t = intensity / 100;
  if (t <= 0) return;
  const amt = t * 42;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] === 0) continue;
      const n = (hash01(x, y, seed) - 0.5) * amt;
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    }
  }
}

/** v1 `object-filters.js` `applyGlitterGelImageData` */
export function applyGlitterGelImageData(img, intensity, seed) {
  applyGrainImageData(img, Math.max(1, intensity * 0.22), seed);
  const d = img.data;
  const w = img.width;
  const h = img.height;
  const t = intensity / 100;
  if (t <= 0) return;
  const sparkleProb = 0.058 * t;
  const shimmerProb = 0.038 * t;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = d[i + 3];
      if (a === 0) continue;
      const h01 = hash01(x, y, seed + 8.3);
      if (h01 < sparkleProb) {
        d[i] = 255;
        d[i + 1] = 255;
        d[i + 2] = 255;
        d[i + 3] = Math.min(255, Math.max(a, Math.round(a + 85 * t)));
      } else if (h01 < sparkleProb + shimmerProb) {
        d[i] = Math.min(255, Math.round(d[i] + 38 * t));
        d[i + 1] = Math.min(255, Math.round(d[i + 1] + 38 * t));
        d[i + 2] = Math.min(255, Math.round(d[i + 2] + 46 * t));
      }
    }
  }
}

const FUZZY_INTENSITY = 48;

/**
 * Rasterize stroke, roughen edges (v1 Furry).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} points
 * @param {string} color
 * @param {number} width
 * @param {number} opacity
 */
export function drawRoughenStrokePass(ctx, points, color, width, opacity, endcap = 'round') {
  if (points.length < 2) return;
  const pad = Math.max(10, width * 1.75);
  const bb = strokePointsBbox(points, pad);
  if (!isFinite(bb.x0) || bb.w < 2 || bb.h < 2 || bb.w > 4096 || bb.h > 4096) {
    ctx.save();
    ctx.globalAlpha = opacity;
    drawBrushStrokeBaseOnCtx(ctx, points, width, color, endcap);
    ctx.restore();
    return;
  }
  const c = document.createElement('canvas');
  c.width = bb.w;
  c.height = bb.h;
  const tc = c.getContext('2d');
  if (!tc) return;
  tc.globalAlpha = 1;
  tc.translate(-bb.x0, -bb.y0);
  drawBrushStrokeBaseOnCtx(tc, points, width, color, endcap);
  let img;
  try {
    img = tc.getImageData(0, 0, bb.w, bb.h);
  } catch {
    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.drawImage(c, bb.x0, bb.y0);
    ctx.restore();
    return;
  }
  const alphaMask = new Uint8Array(bb.w * bb.h);
  const src = new Uint8ClampedArray(img.data);
  for (let p = 0; p < alphaMask.length; p++) alphaMask[p] = src[p * 4 + 3];
  const seed = hash01(points[0].x, points[0].y, 1) * 999.13;
  applyRoughenImageData(img, FUZZY_INTENSITY, seed + 2.71);
  const d = img.data;
  for (let p = 0; p < alphaMask.length; p++) {
    const i = p * 4;
    const origA = alphaMask[p];
    if (origA < 8) {
      d[i] = 0;
      d[i + 1] = 0;
      d[i + 2] = 0;
      d[i + 3] = 0;
      continue;
    }
    const or = src[i];
    const og = src[i + 1];
    const ob = src[i + 2];
    const origLum = or + og + ob;
    const newLum = d[i] + d[i + 1] + d[i + 2];
    if (newLum < origLum * 0.9 || newLum < 20) {
      d[i] = or;
      d[i + 1] = og;
      d[i + 2] = ob;
    }
    d[i + 3] = Math.min(255, Math.max(d[i + 3], origA));
  }
  tc.putImageData(img, 0, 0);
  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.drawImage(c, bb.x0, bb.y0);
  ctx.restore();
}
