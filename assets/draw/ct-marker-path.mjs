/** v1 marker path helpers (`paint-fx.js` / `pointer.js`). */

const BRUSH_PRESSURE_WIDTH_SPAN = 0.75;
const TAPER_END_PX = 2;

/** @param {number | null | undefined} storedPct */
function brushTipTaperStoredToEndFactor(storedPct) {
  if (storedPct == null || storedPct <= 0) return 1;
  return Math.max(0, Math.min(1, (100 - storedPct) / 100));
}

/**
 * @param {number} i
 * @param {number} n
 * @param {boolean} symmetric
 * @param {number} tipTaperPct
 */
export function ribbonTaperEnvelopeUnit(i, n, symmetric, tipTaperPct) {
  if (n < 2) return 1;
  const u = i / (n - 1);
  if (symmetric) return Math.sin(Math.PI * u);
  const fEnd = brushTipTaperStoredToEndFactor(tipTaperPct);
  return 1 + u * (fEnd - 1);
}

/**
 * @param {number} lineWidth
 * @param {number | null | undefined} wf01
 */
export function brushStrokeWidthPxFromPressure01(lineWidth, wf01) {
  if (wf01 == null || !Number.isFinite(Number(wf01))) return lineWidth;
  const t = Math.max(0, Math.min(1, Number(wf01)));
  const minPx = lineWidth * (1 - BRUSH_PRESSURE_WIDTH_SPAN);
  const maxPx = lineWidth * (1 + BRUSH_PRESSURE_WIDTH_SPAN);
  return minPx + (maxPx - minPx) * t;
}

/**
 * @param {{ x: number, y: number, wf?: number }[]} path
 * @param {number} minPts
 */
export function resamplePathByDistance(path, minPts) {
  if (!path || path.length < 2 || path.length >= minPts) return path.map((p) => ({ ...p }));
  return resamplePathUniform(path, minPts);
}

/**
 * Resample to exactly `pointCount` points evenly spaced along arc length (upsample or downsample).
 * @param {{ x: number, y: number, wf?: number }[]} path
 * @param {number} pointCount
 */
export function resamplePathUniform(path, pointCount) {
  if (!path || path.length < 2) return path ? path.map((p) => ({ ...p })) : [];
  const count = Math.max(2, Math.min(10000, Math.floor(pointCount) || 2));
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  let total = 0;
  const cumul = [0];
  for (let i = 1; i < path.length; i++) {
    total += dist(path[i - 1], path[i]);
    cumul.push(total);
  }
  if (total <= 0) return path.map((p) => ({ ...p }));
  const out = [];
  for (let j = 0; j < count; j++) {
    const t = (j / (count - 1)) * total;
    let i = 0;
    while (i < cumul.length - 1 && cumul[i + 1] < t) i++;
    const i0 = Math.min(i, path.length - 2);
    const i1 = i0 + 1;
    const t0 = cumul[i0];
    const t1 = cumul[i1];
    const u = t1 > t0 ? (t - t0) / (t1 - t0) : 0;
    const p0 = path[i0];
    const p1 = path[i1];
    const pt = {
      x: p0.x + (p1.x - p0.x) * u,
      y: p0.y + (p1.y - p0.y) * u,
    };
    if (p0.wf != null || p1.wf != null) {
      const wa = p0.wf != null ? p0.wf : 1;
      const wb = p1.wf != null ? p1.wf : wa;
      pt.wf = wa + (wb - wa) * u;
    }
    out.push(pt);
  }
  return out;
}

/**
 * @param {{ x: number, y: number, wf?: number }[]} smoothedPts
 * @param {{ x: number, y: number, wf?: number }[]} originalPts
 */
export function assignWidthFactorsFromOriginal(smoothedPts, originalPts) {
  if (!smoothedPts?.length || !originalPts?.length) return;
  let hasAny = false;
  for (const op of originalPts) {
    if (op.wf != null) {
      hasAny = true;
      break;
    }
  }
  if (!hasAny) return;
  for (const sm of smoothedPts) {
    let bestWf = 1;
    let bestD = Infinity;
    for (const op of originalPts) {
      const d = Math.hypot(sm.x - op.x, sm.y - op.y);
      if (d < bestD) {
        bestD = d;
        bestWf = op.wf != null ? op.wf : 1;
      }
    }
    sm.wf = bestWf;
  }
}

/**
 * @param {{ x: number, y: number, wf?: number }[]} points
 * @param {number} maxSpanPx
 * @param {number} [maxPoints]
 */
export function densifyMarkerPoints(points, maxSpanPx, maxPoints = 10000) {
  if (!points || points.length < 2) return points?.map((p) => ({ ...p })) ?? [];
  const maxSpan = Math.max(0.5, Number(maxSpanPx) || 1);
  const limit = Math.max(200, maxPoints);
  const out = [{ ...points[0] }];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    const splits = Math.max(0, Math.ceil(dist / maxSpan) - 1);
    for (let s = 1; s <= splits; s++) {
      if (out.length >= limit - 1) break;
      const u = s / (splits + 1);
      const p = { x: a.x + dx * u, y: a.y + dy * u };
      if (a.wf != null || b.wf != null) {
        const wa = a.wf != null ? a.wf : 1;
        const wb = b.wf != null ? b.wf : wa;
        p.wf = wa + (wb - wa) * u;
      }
      out.push(p);
    }
    out.push({ ...b });
    if (out.length >= limit) break;
  }
  return out;
}

/**
 * @param {{ x: number, y: number, wf?: number }[]} pts
 * @param {number} lineWidth
 * @param {number} n
 * @param {boolean} ribbonSymmetric
 * @param {number} taper
 * @param {number} [minEndPx] min width when symmetric (default TAPER_END_PX; use ~0 for inky tips)
 */
export function ribbonWidthAt(pts, lineWidth, n, ribbonSymmetric, taper, minEndPx) {
  return (i) => {
    if (n < 2) return lineWidth;
    const p = pts[i];
    const wfP = p?.wf != null && Number.isFinite(Number(p.wf)) ? Number(p.wf) : null;
    const baseW = wfP != null ? brushStrokeWidthPxFromPressure01(lineWidth, wfP) : lineWidth;
    const env = ribbonTaperEnvelopeUnit(i, n, ribbonSymmetric, taper);
    if (ribbonSymmetric) {
      const floor = minEndPx != null ? minEndPx : TAPER_END_PX;
      return Math.max(floor, baseW * env);
    }
    return Math.max(0.25, baseW * env);
  };
}

export { TAPER_END_PX };
