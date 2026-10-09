/** v1 `pointer.js` — map/smooth/densify per-point pressure width along stroke path. */

/**
 * @param {{ wf?: number }[]} points
 */
export function hasPerPointWidthFactors(points) {
  if (!points?.length) return false;
  return points.some((p) => p?.wf != null && Number.isFinite(Number(p.wf)));
}

/**
 * @param {{ x: number, y: number, wf?: number }[]} sourcePts
 * @param {{ x: number, y: number, wf?: number }[]} targetPts
 */
export function mapPressureWidthFactorsByPathProgress(sourcePts, targetPts) {
  if (!sourcePts || !targetPts || sourcePts.length < 2 || targetPts.length < 2) return;
  if (!hasPerPointWidthFactors(sourcePts)) return;

  function buildCum(path) {
    const cum = [0];
    let total = 0;
    for (let i = 1; i < path.length; i++) {
      total += Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y);
      cum.push(total);
    }
    return { cum, total };
  }

  function wfAtDistance(path, cum, d) {
    if (d <= 0) {
      return path[0].wf != null && Number.isFinite(Number(path[0].wf)) ? Number(path[0].wf) : 1;
    }
    const lastIdx = path.length - 1;
    if (d >= cum[lastIdx]) {
      return path[lastIdx].wf != null && Number.isFinite(Number(path[lastIdx].wf))
        ? Number(path[lastIdx].wf)
        : 1;
    }
    let i = 0;
    while (i < lastIdx && cum[i + 1] < d) i++;
    const d0 = cum[i];
    const d1 = cum[i + 1];
    const u = d1 > d0 ? (d - d0) / (d1 - d0) : 0;
    const w0 = path[i].wf != null && Number.isFinite(Number(path[i].wf)) ? Number(path[i].wf) : 1;
    const w1 =
      path[i + 1].wf != null && Number.isFinite(Number(path[i + 1].wf)) ? Number(path[i + 1].wf) : w0;
    return w0 + (w1 - w0) * u;
  }

  const src = buildCum(sourcePts);
  const dst = buildCum(targetPts);
  if (!(src.total > 1e-6) || !(dst.total > 1e-6)) return;

  for (let t = 0; t < targetPts.length; t++) {
    const progress = dst.cum[t] / dst.total;
    targetPts[t].wf = wfAtDistance(sourcePts, src.cum, progress * src.total);
  }
}

/**
 * @param {{ wf?: number }[]} points
 */
export function smoothMappedWidthFactors(points) {
  if (!points || points.length < 3 || !hasPerPointWidthFactors(points)) return;
  const n = points.length;
  const tmp = new Array(n);
  for (let pass = 0; pass < 2; pass++) {
    for (let i = 0; i < n; i++) {
      const w = points[i].wf != null && Number.isFinite(Number(points[i].wf)) ? Number(points[i].wf) : 1;
      if (i === 0 || i === n - 1) {
        tmp[i] = w;
        continue;
      }
      const wp =
        points[i - 1].wf != null && Number.isFinite(Number(points[i - 1].wf)) ? Number(points[i - 1].wf) : w;
      const wn =
        points[i + 1].wf != null && Number.isFinite(Number(points[i + 1].wf)) ? Number(points[i + 1].wf) : w;
      tmp[i] = (wp + 2 * w + wn) / 4;
    }
    for (let j = 0; j < n; j++) {
      points[j].wf = Math.max(0.01, Math.min(1, tmp[j]));
    }
  }
}

/**
 * Smooth width continuity + smooth triangular tips at stroke ends (v1 `applyPressureFinishProfile`).
 * @param {{ x: number, y: number, wf?: number }[]} points
 * @param {number} pressureSetting HUD pressure 0–100
 */
export function applyPressureFinishProfile(points, pressureSetting) {
  if (!points || points.length < 3 || !hasPerPointWidthFactors(points)) return;
  const pr = Math.max(0, Math.min(100, Number(pressureSetting) || 0));
  if (pr <= 0) return;

  const strength = pr / 100;
  const n = points.length;
  const tmp = new Array(n);

  for (let i = 0; i < n; i++) {
    const w = points[i].wf != null && Number.isFinite(Number(points[i].wf)) ? Number(points[i].wf) : 1;
    if (i === 0 || i === n - 1) {
      tmp[i] = w;
    } else {
      const wp =
        points[i - 1].wf != null && Number.isFinite(Number(points[i - 1].wf)) ? Number(points[i - 1].wf) : w;
      const wn =
        points[i + 1].wf != null && Number.isFinite(Number(points[i + 1].wf)) ? Number(points[i + 1].wf) : w;
      tmp[i] = (wp + 4 * w + wn) / 6;
    }
  }
  for (let i = 0; i < n; i++) {
    points[i].wf = Math.max(0.01, Math.min(1, tmp[i]));
  }

  const maxStep = 0.10 - 0.04 * strength;
  for (let i = 1; i < n; i++) {
    let prev = points[i - 1].wf != null ? Number(points[i - 1].wf) : 1;
    let cur = points[i].wf != null ? Number(points[i].wf) : 1;
    if (cur > prev + maxStep) cur = prev + maxStep;
    else if (cur < prev - maxStep) cur = prev - maxStep;
    points[i].wf = Math.max(0.01, Math.min(1, cur));
  }
  for (let i = n - 2; i >= 0; i--) {
    const next = points[i + 1].wf != null ? Number(points[i + 1].wf) : 1;
    let cur2 = points[i].wf != null ? Number(points[i].wf) : 1;
    if (cur2 > next + maxStep) cur2 = next + maxStep;
    else if (cur2 < next - maxStep) cur2 = next - maxStep;
    points[i].wf = Math.max(0.01, Math.min(1, cur2));
  }

  const tipArt = Math.max(0, Math.min(1, (pr - 4) / 96));
  if (tipArt <= 0.001) return;

  function avgWf(from, to) {
    let sum = 0;
    let cnt = 0;
    for (let k = from; k <= to && k < n; k++) {
      const wv = points[k].wf != null ? Number(points[k].wf) : null;
      if (wv != null && Number.isFinite(wv)) {
        sum += Math.max(0, Math.min(1, wv));
        cnt++;
      }
    }
    return cnt ? sum / cnt : null;
  }

  const tipSpan = Math.max(2, Math.floor((n - 1) * 0.1));
  const headProbe = Math.min(tipSpan, n - 1);
  const tailProbeFrom = Math.max(0, n - 1 - tipSpan);
  const headAvg = avgWf(0, headProbe);
  const tailAvg = avgWf(tailProbeFrom, n - 1);
  const plantedStart = headAvg != null && headAvg >= 0.62;
  const firmEnd = tailAvg != null && tailAvg >= 0.62;

  const startCap = Math.max(0.03, 1 - 0.8 * strength * tipArt);
  const endCap = Math.max(0.03, 1 - 0.88 * strength * tipArt);
  const headAnchor =
    points[Math.min(tipSpan, n - 1)].wf != null ? Number(points[Math.min(tipSpan, n - 1)].wf) : 1;
  const tailStartIdx = Math.max(0, n - 1 - tipSpan);
  const tailAnchor = points[tailStartIdx].wf != null ? Number(points[tailStartIdx].wf) : 1;

  if (!plantedStart) {
    const startTip = Math.min(points[0].wf != null ? Number(points[0].wf) : 1, startCap);
    for (let i = 0; i <= tipSpan && i < n; i++) {
      const th = i / Math.max(1, tipSpan);
      const sh = th * th * (3 - 2 * th);
      points[i].wf = Math.max(0.01, Math.min(1, startTip + (headAnchor - startTip) * sh * tipArt));
    }
  }

  if (!firmEnd) {
    const endTip = Math.min(points[n - 1].wf != null ? Number(points[n - 1].wf) : 1, endCap);
    for (let i = tailStartIdx; i < n; i++) {
      const tt = (i - tailStartIdx) / Math.max(1, n - 1 - tailStartIdx);
      const st = tt * tt * (3 - 2 * tt);
      points[i].wf = Math.max(0.01, Math.min(1, tailAnchor + (endTip - tailAnchor) * st * tipArt));
    }
  }
}

/**
 * @param {{ wf?: number }} p
 */
function readWf(p) {
  const w = p?.wf;
  return w != null && Number.isFinite(Number(w)) ? Number(w) : null;
}

/**
 * Drop Huion lift-off ghost samples and replace with a short smooth pen-up tip.
 * @param {{ x: number, y: number, wf?: number }[]} points
 * @param {number} [minPoints=2]
 */
export function cleanPenUpWormTail(points, minPoints = 2) {
  if (!points?.length || points.length <= minPoints || !hasPerPointWidthFactors(points)) {
    return points?.map((p) => ({ ...p })) ?? [];
  }

  const pts = points.map((p) => ({ ...p }));
  const bodyEnd = Math.max(1, Math.floor(pts.length * 0.85));
  const bodyWfs = [];
  for (let i = 0; i < bodyEnd; i++) {
    const w = readWf(pts[i]);
    if (w != null) bodyWfs.push(w);
  }
  if (!bodyWfs.length) return pts;

  bodyWfs.sort((a, b) => a - b);
  const refWf = bodyWfs[Math.min(bodyWfs.length - 1, Math.floor(bodyWfs.length * 0.7))];
  const tailFloor = Math.max(0.22, refWf * 0.38);

  while (pts.length > minPoints) {
    const last = pts.length - 1;
    const w = readWf(pts[last]);
    const prev = pts[last - 1];
    const segLen = Math.hypot(pts[last].x - prev.x, pts[last].y - prev.y);
    const prevW = readWf(prev) ?? refWf;
    const ghost =
      (w != null && w < tailFloor && w < prevW * 0.55) ||
      (w != null && w < tailFloor * 0.9 && segLen < 1.4);
    if (!ghost) break;
    pts.pop();
  }

  if (pts.length < minPoints) return points.map((p) => ({ ...p }));

  const m = pts.length;
  const anchorIdx = Math.max(0, m - 4);
  const anchorWf = readWf(pts[anchorIdx]) ?? refWf;
  const endWf = Math.max(0.08, Math.min(anchorWf * 0.2, tailFloor * 0.45));
  for (let i = anchorIdx + 1; i < m; i++) {
    const t = (i - anchorIdx) / Math.max(1, m - 1 - anchorIdx);
    const ease = t * t * (3 - 2 * t);
    pts[i].wf = Math.max(0.05, Math.min(1, anchorWf + (endWf - anchorWf) * ease));
  }

  return pts;
}
