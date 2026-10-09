/** Color Time! — flood fill (scanline; avoids per-pixel object alloc). */

/**
 * @param {string} color #rrggbb or rgb(r,g,b)
 */
function parseFillRgb(color) {
  const s = String(color).trim();
  if (s.startsWith('#')) {
    const h = s.replace('#', '');
    const full = h.length === 3 ? h.split('').map((c) => c + c).join('') : h;
    const n = parseInt(full, 16);
    return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
  }
  const m = s.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)/i);
  if (m) {
    return {
      r: Math.round(Number(m[1])),
      g: Math.round(Number(m[2])),
      b: Math.round(Number(m[3])),
    };
  }
  return { r: 0, g: 0, b: 0 };
}

/**
 * @param {Uint8ClampedArray} data
 * @param {number} o
 * @param {number} tr
 * @param {number} tg
 * @param {number} tb
 * @param {number} ta
 * @param {number} tol
 */
function pixelMatches(data, o, tr, tg, tb, ta, tol) {
  let r = data[o];
  let g = data[o + 1];
  let b = data[o + 2];
  let a = data[o + 3];
  if (a <= 1) {
    r = 0;
    g = 0;
    b = 0;
    a = 0;
  }
  return (
    Math.abs(r - tr) <= tol
    && Math.abs(g - tg) <= tol
    && Math.abs(b - tb) <= tol
    && Math.abs(a - ta) <= tol
  );
}

/**
 * Scanline flood: match on `sampleData`, paint into `writeData` (may be same buffer).
 * @param {Uint8ClampedArray} sampleData
 * @param {Uint8ClampedArray} writeData
 * @param {number} w
 * @param {number} h
 * @param {number} xi
 * @param {number} yi
 * @param {number} fr
 * @param {number} fg
 * @param {number} fb
 * @param {number} fa
 * @param {number} tol
 * @returns {boolean}
 */
function scanlineFlood(sampleData, writeData, w, h, xi, yi, fr, fg, fb, fa, tol) {
  const start = (yi * w + xi) * 4;
  let tr = sampleData[start];
  let tg = sampleData[start + 1];
  let tb = sampleData[start + 2];
  let ta = sampleData[start + 3];
  if (ta <= 1) {
    tr = 0;
    tg = 0;
    tb = 0;
    ta = 0;
  }
  if (ta === 255 && tr === fr && tg === fg && tb === fb && fa === 255) return false;

  const visited = new Uint8Array(w * h);
  /** @type {number[]} */
  const stack = [xi, yi];
  let changed = false;

  while (stack.length) {
    const y = stack.pop();
    let x = stack.pop();
    if (y < 0 || y >= h) continue;
    if (visited[y * w + x]) continue;

    let xLeft = x;
    while (
      xLeft >= 0
      && !visited[y * w + xLeft]
      && pixelMatches(sampleData, (y * w + xLeft) * 4, tr, tg, tb, ta, tol)
    ) {
      xLeft -= 1;
    }
    xLeft += 1;

    let xRight = x;
    while (
      xRight < w
      && !visited[y * w + xRight]
      && pixelMatches(sampleData, (y * w + xRight) * 4, tr, tg, tb, ta, tol)
    ) {
      xRight += 1;
    }

    let spanAbove = false;
    let spanBelow = false;
    for (let px = xLeft; px < xRight; px += 1) {
      const i = y * w + px;
      visited[i] = 1;
      const o = i * 4;
      writeData[o] = fr;
      writeData[o + 1] = fg;
      writeData[o + 2] = fb;
      writeData[o + 3] = fa;
      changed = true;

      if (y > 0) {
        const above = i - w;
        const match =
          !visited[above]
          && pixelMatches(sampleData, above * 4, tr, tg, tb, ta, tol);
        if (match) {
          if (!spanAbove) {
            stack.push(px, y - 1);
            spanAbove = true;
          }
        } else {
          spanAbove = false;
        }
      }

      if (y < h - 1) {
        const below = i + w;
        const match =
          !visited[below]
          && pixelMatches(sampleData, below * 4, tr, tg, tb, ta, tol);
        if (match) {
          if (!spanBelow) {
            stack.push(px, y + 1);
            spanBelow = true;
          }
        } else {
          spanBelow = false;
        }
      }
    }
  }

  return changed;
}

/**
 * Scanline clear: matching sample pixels → transparent on each write surface.
 * @param {Uint8ClampedArray} sampleData
 * @param {{ data: Uint8ClampedArray }[]} surfaces
 * @param {number} w
 * @param {number} h
 * @param {number} xi
 * @param {number} yi
 * @param {number} tol
 * @returns {boolean}
 */
function scanlineClear(sampleData, surfaces, w, h, xi, yi, tol) {
  const start = (yi * w + xi) * 4;
  let tr = sampleData[start];
  let tg = sampleData[start + 1];
  let tb = sampleData[start + 2];
  let ta = sampleData[start + 3];
  if (ta <= 1) {
    tr = 0;
    tg = 0;
    tb = 0;
    ta = 0;
  }
  if (ta === 0) return false;

  const visited = new Uint8Array(w * h);
  /** @type {number[]} */
  const stack = [xi, yi];
  let changed = false;

  while (stack.length) {
    const y = stack.pop();
    let x = stack.pop();
    if (y < 0 || y >= h) continue;
    if (visited[y * w + x]) continue;

    let xLeft = x;
    while (
      xLeft >= 0
      && !visited[y * w + xLeft]
      && pixelMatches(sampleData, (y * w + xLeft) * 4, tr, tg, tb, ta, tol)
    ) {
      xLeft -= 1;
    }
    xLeft += 1;

    let xRight = x;
    while (
      xRight < w
      && !visited[y * w + xRight]
      && pixelMatches(sampleData, (y * w + xRight) * 4, tr, tg, tb, ta, tol)
    ) {
      xRight += 1;
    }

    let spanAbove = false;
    let spanBelow = false;
    for (let px = xLeft; px < xRight; px += 1) {
      const i = y * w + px;
      visited[i] = 1;
      const o = i * 4;
      for (const surface of surfaces) {
        if (surface.data[o + 3] !== 0) changed = true;
        surface.data[o + 3] = 0;
      }

      if (y > 0) {
        const above = i - w;
        const match =
          !visited[above]
          && pixelMatches(sampleData, above * 4, tr, tg, tb, ta, tol);
        if (match) {
          if (!spanAbove) {
            stack.push(px, y - 1);
            spanAbove = true;
          }
        } else {
          spanAbove = false;
        }
      }

      if (y < h - 1) {
        const below = i + w;
        const match =
          !visited[below]
          && pixelMatches(sampleData, below * 4, tr, tg, tb, ta, tol);
        if (match) {
          if (!spanBelow) {
            stack.push(px, y + 1);
            spanBelow = true;
          }
        } else {
          spanBelow = false;
        }
      }
    }
  }

  return changed;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {string} fillColor
 * @param {number} [tolerance]
 * @param {number} [opacity] 0–1
 */
export function floodFillAt(ctx, x, y, fillColor, tolerance = 12, opacity = 1) {
  const canvas = ctx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  if (xi < 0 || yi < 0 || xi >= w || yi >= h) return false;

  const img = ctx.getImageData(0, 0, w, h);
  const rgb = parseFillRgb(fillColor);
  const fa = Math.round(Math.max(0, Math.min(1, opacity)) * 255);
  const changed = scanlineFlood(
    img.data,
    img.data,
    w,
    h,
    xi,
    yi,
    rgb.r,
    rgb.g,
    rgb.b,
    fa,
    tolerance,
  );
  if (changed) ctx.putImageData(img, 0, 0);
  return changed;
}

/**
 * Flood fill using sample pixels from one canvas, writing to another.
 * @param {CanvasRenderingContext2D} sampleCtx
 * @param {CanvasRenderingContext2D} writeCtx
 */
export function floodFillAtComposite(sampleCtx, writeCtx, x, y, fillColor, tolerance = 12, opacity = 1) {
  const w = writeCtx.canvas.width;
  const h = writeCtx.canvas.height;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  if (xi < 0 || yi < 0 || xi >= w || yi >= h) return false;

  const sample = sampleCtx.getImageData(0, 0, w, h);
  const out = writeCtx.getImageData(0, 0, w, h);
  const rgb = parseFillRgb(fillColor);
  const fa = Math.round(Math.max(0, Math.min(1, opacity)) * 255);
  const changed = scanlineFlood(
    sample.data,
    out.data,
    w,
    h,
    xi,
    yi,
    rgb.r,
    rgb.g,
    rgb.b,
    fa,
    tolerance,
  );
  if (changed) writeCtx.putImageData(out, 0, 0);
  return changed;
}

/**
 * Contiguous clear: matching pixels become transparent (magic wand).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} [tolerance255] 0–255 per channel
 * @returns {boolean}
 */
export function floodClearAt(ctx, x, y, tolerance255 = 0) {
  const canvas = ctx.canvas;
  const w = canvas.width;
  const h = canvas.height;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  if (xi < 0 || yi < 0 || xi >= w || yi >= h) return false;

  const tol = Math.max(0, Math.min(255, Math.floor(tolerance255)));
  const img = ctx.getImageData(0, 0, w, h);
  const changed = scanlineClear(img.data, [{ data: img.data }], w, h, xi, yi, tol);
  if (changed) ctx.putImageData(img, 0, 0);
  return changed;
}

/**
 * Contiguous clear from a composite sample — clears matching pixels on one or more surfaces.
 * @param {CanvasRenderingContext2D} sampleCtx raster + strokes (what the artist sees)
 * @param {CanvasRenderingContext2D[]} writeCtxs layer raster and/or stroke contexts
 * @param {number} x
 * @param {number} y
 * @param {number} [tolerance255] 0–255 per channel
 * @returns {boolean}
 */
export function floodClearAtCompositeSample(sampleCtx, writeCtxs, x, y, tolerance255 = 0) {
  const writers = writeCtxs.filter(Boolean);
  if (!writers.length) return false;

  const w = sampleCtx.canvas.width;
  const h = sampleCtx.canvas.height;
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  if (xi < 0 || yi < 0 || xi >= w || yi >= h) return false;

  const tol = Math.max(0, Math.min(255, Math.floor(tolerance255)));
  const sample = sampleCtx.getImageData(0, 0, w, h);
  const surfaces = writers.map((ctx) => {
    const img = ctx.getImageData(0, 0, w, h);
    return { ctx, img, data: img.data };
  });

  const changed = scanlineClear(sample.data, surfaces, w, h, xi, yi, tol);
  if (!changed) return false;
  for (const surface of surfaces) {
    surface.ctx.putImageData(surface.img, 0, 0);
  }
  return true;
}

/** @param {number} tolerance100 UI 0–100 → 0–255 channel tolerance */
export function wandToleranceTo255(tolerance100) {
  return Math.round(Math.max(0, Math.min(100, tolerance100)) * (255 / 100));
}

/** @param {{ x: number, y: number, color: string, tolerance?: number, opacity?: number }} stroke */
export function renderBucketFill(ctx, stroke) {
  floodFillAt(
    ctx,
    stroke.x,
    stroke.y,
    stroke.color,
    stroke.tolerance ?? 12,
    stroke.opacity ?? 1,
  );
}

/**
 * Visit contiguous sample pixels matching the seed (no write).
 * @param {Uint8ClampedArray} sampleData
 * @param {number} w
 * @param {number} h
 * @param {number} xi
 * @param {number} yi
 * @param {number} tol
 * @param {(x: number, y: number, offset: number) => void | false} visit return false to abort
 * @param {{ maxRadius?: number }} [opts] clamp expansion to a disk around the seed
 * @returns {{ count: number, aborted: boolean }}
 */
export function floodVisitRegion(sampleData, w, h, xi, yi, tol, visit, opts = {}) {
  if (xi < 0 || yi < 0 || xi >= w || yi >= h) return { count: 0, aborted: false };
  const maxR = opts.maxRadius != null ? opts.maxRadius : 0;
  const maxR2 = maxR > 0 ? maxR * maxR : 0;
  const inRadius = (x, y) => {
    if (!maxR2) return true;
    const dx = x - xi;
    const dy = y - yi;
    return dx * dx + dy * dy <= maxR2;
  };
  const start = (yi * w + xi) * 4;
  let tr = sampleData[start];
  let tg = sampleData[start + 1];
  let tb = sampleData[start + 2];
  let ta = sampleData[start + 3];
  if (ta <= 1) {
    tr = 0;
    tg = 0;
    tb = 0;
    ta = 0;
  }

  const visited = new Uint8Array(w * h);
  /** @type {number[]} */
  const stack = [xi, yi];
  let count = 0;
  let aborted = false;

  while (stack.length) {
    const y = stack.pop();
    let x = stack.pop();
    if (y < 0 || y >= h) continue;
    if (visited[y * w + x]) continue;
    if (!inRadius(x, y)) continue;

    let xLeft = x;
    while (
      xLeft >= 0
      && !visited[y * w + xLeft]
      && inRadius(xLeft, y)
      && pixelMatches(sampleData, (y * w + xLeft) * 4, tr, tg, tb, ta, tol)
    ) {
      xLeft -= 1;
    }
    xLeft += 1;

    let xRight = x;
    while (
      xRight < w
      && !visited[y * w + xRight]
      && inRadius(xRight, y)
      && pixelMatches(sampleData, (y * w + xRight) * 4, tr, tg, tb, ta, tol)
    ) {
      xRight += 1;
    }

    let spanAbove = false;
    let spanBelow = false;
    for (let px = xLeft; px < xRight; px += 1) {
      const i = y * w + px;
      visited[i] = 1;
      count += 1;
      if (visit(px, y, i * 4) === false) {
        aborted = true;
        return { count, aborted };
      }

      if (y > 0) {
        const above = i - w;
        const match =
          !visited[above]
          && inRadius(px, y - 1)
          && pixelMatches(sampleData, above * 4, tr, tg, tb, ta, tol);
        if (match) {
          if (!spanAbove) {
            stack.push(px, y - 1);
            spanAbove = true;
          }
        } else {
          spanAbove = false;
        }
      }

      if (y < h - 1) {
        const below = i + w;
        const match =
          !visited[below]
          && inRadius(px, y + 1)
          && pixelMatches(sampleData, below * 4, tr, tg, tb, ta, tol);
        if (match) {
          if (!spanBelow) {
            stack.push(px, y + 1);
            spanBelow = true;
          }
        } else {
          spanBelow = false;
        }
      }
    }
  }

  return { count, aborted };
}
