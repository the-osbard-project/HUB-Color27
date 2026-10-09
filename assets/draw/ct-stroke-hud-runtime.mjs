import { densifyMarkerPoints, resamplePathUniform } from './ct-marker-path.mjs';
import {
  applyPressureFinishProfile,
  mapPressureWidthFactorsByPathProgress,
  smoothMappedWidthFactors,
} from './ct-stroke-pressure-path.mjs';
import { getStrokePressureFactor } from './ct-stroke-pressure.mjs';
import { smoothStrokePoints } from './ct-stroke-smooth.mjs';
import {
  simplifySliderToEpsilon,
  simplifyStrokePoints,
  simplifyEndpointPreservePx,
  isNearClosedLoop,
  trimLoopClosingCluster,
} from './ct-simplify-stroke-points.mjs';

/** Simplify is opt-in (Studio). Default draw = smooth capture + Catmull / tracePathSmooth. */
export const CT_DEFAULT_SIMPLIFY = 0;

/** Catmull smooth for waxy line tools (pencil, crayon, pastel) — baked 60%. */
export const CT_BUILTIN_SMOOTHING = 60;
const PUBLISH_SMOOTH_AMOUNT = CT_BUILTIN_SMOOTHING;

/**
 * @param {{ x: number, y: number, t?: number, wf?: number }[]} rawPoints
 * @param {number} lineWidth
 */
function cullStrokePoints(rawPoints, lineWidth) {
  if (!rawPoints?.length) return [];
  const w = Math.max(1, Number(lineWidth) || 1);
  let src = rawPoints.map((p) => ({ x: p.x, y: p.y, t: p.t || 0, wf: p.wf }));
  const cullDist = Math.max(0.45, w * 0.08);
  if (src.length >= 2) {
    const culled = [src[0]];
    for (let i = 1; i < src.length; i += 1) {
      const prev = culled[culled.length - 1];
      if (Math.hypot(src[i].x - prev.x, src[i].y - prev.y) >= cullDist) {
        culled.push(src[i]);
      }
    }
    const last = src[src.length - 1];
    if (culled[culled.length - 1] !== last) culled.push(last);
    src = culled;
  }
  return src;
}

/**
 * Optional RDP — only when simplify > 0.
 * @param {{ x: number, y: number, t?: number, wf?: number }[]} points
 * @param {number} simplifyAmt 0–100
 * @param {number} lineWidth
 */
function applyOptionalSimplify(points, simplifyAmt, lineWidth) {
  if (simplifyAmt <= 0 || points.length < 3) return points;
  const w = Math.max(1, lineWidth);
  const spacing = Math.max(2.5, w * 0.45);
  let totalLen = 0;
  for (let i = 1; i < points.length; i++) {
    totalLen += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  if (totalLen <= 0) return points;
  const target = Math.min(800, Math.max(2, Math.ceil(totalLen / spacing) + 1));
  let out = resamplePathUniform(points, target);
  const nearClosed = isNearClosedLoop(out, w);
  if (nearClosed) out = trimLoopClosingCluster(out, w);
  out = simplifyStrokePoints(
    out,
    simplifySliderToEpsilon(simplifyAmt),
    simplifyEndpointPreservePx(w),
  );
  if (nearClosed && out.length >= 3) {
    const first = out[0];
    const last = out[out.length - 1];
    if (Math.hypot(last.x - first.x, last.y - first.y) > 0.35) {
      const mid = { x: (last.x + first.x) * 0.5, y: (last.y + first.y) * 0.5, t: last.t || 0 };
      const join = smoothStrokePoints([last, mid, first], PUBLISH_SMOOTH_AMOUNT, w);
      for (let i = 1; i < join.length; i += 1) {
        const p = join[i];
        const prev = out[out.length - 1];
        if (!prev || Math.hypot(p.x - prev.x, p.y - prev.y) > 0.2) out.push(p);
      }
    }
  }
  return out;
}

/**
 * Waxy publish tools — cull → optional Simplify → Catmull smooth (always).
 * @param {{ x: number, y: number, t?: number, wf?: number }[]} rawPoints
 * @param {number} lineWidth
 * @param {{ simplify?: number, livePreview?: boolean }} [opts]
 */
export function preparePublishStrokePoints(rawPoints, lineWidth, opts = {}) {
  if (!rawPoints?.length) return [];
  const w = Math.max(1, Number(lineWidth) || 1);
  const simplify = Number.isFinite(Number(opts.simplify)) ? Number(opts.simplify) : CT_DEFAULT_SIMPLIFY;
  let src = cullStrokePoints(rawPoints, w);
  if (src.length < 2) {
    return src.length ? [{ x: src[0].x, y: src[0].y }] : [];
  }

  let nearClosed = isNearClosedLoop(src, w);
  if (nearClosed) src = trimLoopClosingCluster(src, w);

  const simplifyAmt = Math.max(0, Math.min(100, simplify));
  let out = applyOptionalSimplify(src, simplifyAmt, w);

  if (out.length >= 3) {
    out = smoothStrokePoints(out, PUBLISH_SMOOTH_AMOUNT, w);
  }

  if (nearClosed && simplifyAmt <= 0 && out.length >= 3) {
    const first = out[0];
    const last = out[out.length - 1];
    if (Math.hypot(last.x - first.x, last.y - first.y) > 0.35) {
      out.push({ x: first.x, y: first.y, t: last.t || 0, wf: last.wf });
    }
  }

  return out.length >= 2 ? out : src;
}

/**
 * Studio Inky — cull → tracePathSmooth at draw. Simplify only when explicitly > 0.
 * @param {{ x: number, y: number, t?: number, wf?: number }[]} rawPoints
 * @param {number} _smoothing
 * @param {number} lineWidth
 * @param {number} [simplify]
 */
export function prepareInkyStrokePoints(rawPoints, _smoothing, lineWidth, simplify = CT_DEFAULT_SIMPLIFY) {
  if (!rawPoints?.length) return [];
  const w = Math.max(1, Number(lineWidth) || 1);
  let src = cullStrokePoints(rawPoints, w);
  if (src.length < 2) return src;

  let nearClosed = isNearClosedLoop(src, w);
  if (nearClosed) src = trimLoopClosingCluster(src, w);

  const simplifyAmt = Math.max(0, Math.min(100, Number(simplify) || 0));
  if (simplifyAmt > 0) {
    src = applyOptionalSimplify(src, simplifyAmt, w);
  }

  if (nearClosed && src.length >= 3) {
    const first = src[0];
    const last = src[src.length - 1];
    if (Math.hypot(last.x - first.x, last.y - first.y) > 0.35) {
      src.push({ x: first.x, y: first.y, t: last.t || 0, wf: last.wf });
    }
  }

  return src;
}

/**
 * v1 canvas-stage-hud → draw pipeline: smoothing, pressure width factors, endcap taper hint.
 * @param {{ x: number, y: number, t?: number, wf?: number }[]} rawPoints
 * @param {number} smoothing 0–100
 * @param {number} lineWidth
 * @param {number} [pressureSetting] HUD pressure 0–100
 * @param {number} [simplify] 0–100 RDP (default 0 — publish tools pass CT_DEFAULT_SIMPLIFY on commit render)
 */
export function prepareHudStrokePoints(
  rawPoints,
  smoothing,
  lineWidth,
  pressureSetting = 0,
  simplify = 0,
) {
  if (!rawPoints?.length) return [];
  const amount = Math.max(0, Math.min(100, Number(smoothing) || 0));
  let pts =
    amount <= 0
      ? rawPoints.map((p) => ({ x: p.x, y: p.y, t: p.t, wf: p.wf }))
      : smoothStrokePoints(rawPoints, amount, lineWidth);

  if (rawPoints.some((p) => p.wf != null)) {
    if (amount > 0) {
      mapPressureWidthFactorsByPathProgress(rawPoints, pts);
    }
    smoothMappedWidthFactors(pts);
  }

  applyPressureFinishProfile(pts, pressureSetting);

  const pr = Math.max(0, Math.min(100, Number(pressureSetting) || 0));
  if (pr > 0) {
    const maxSpan = Math.max(0.75, Math.min(4, lineWidth > 0 ? lineWidth * 0.35 : 2));
    pts = densifyMarkerPoints(pts, maxSpan);
  }

  const simplifyAmt = Math.max(0, Math.min(100, Number(simplify) || 0));
  if (simplifyAmt > 0 && pts.length >= 3) {
    pts = simplifyStrokePoints(pts, simplifySliderToEpsilon(simplifyAmt));
  }

  return pts;
}

/**
 * @param {number} pressureSetting
 * @param {'round'|'flat'|'taper'} endcap
 * @param {PointerEvent} e
 */
export function hudPressureFromEvent(pressureSetting, endcap, e, mainEvent) {
  return getStrokePressureFactor(pressureSetting, endcap, e, mainEvent);
}

/**
 * @param {'round'|'flat'|'taper'} endcap
 * @param {number} pressureSetting
 */
export function hudTaperAmount(endcap, pressureSetting) {
  if (endcap !== 'taper') return 0;
  const pr = Math.max(0, Math.min(100, Number(pressureSetting) || 0));
  return pr > 0 ? pr : 100;
}

/**
 * @param {'round'|'flat'|'taper'} endcap
 */
export function canvasLineCapFromEndcap(endcap) {
  return endcap === 'flat' ? 'butt' : 'round';
}

/**
 * @param {PointerEvent} e
 * @param {(x: number, y: number) => { x: number, y: number }} stagePoint
 * @param {number} pressureSetting
 * @param {'round'|'flat'|'taper'} endcap
 * @param {(e: PointerEvent) => number | undefined} [getPressureFactor]
 */
export function hudPointFromEvent(e, stagePoint, pressureSetting, endcap, getPressureFactor, mainEvent) {
  const pt = stagePoint(e.clientX, e.clientY);
  pt.t = typeof e.timeStamp === 'number' ? e.timeStamp : Date.now();
  const wf =
    getPressureFactor?.(e, mainEvent) ??
    hudPressureFromEvent(pressureSetting, endcap, e, mainEvent);
  if (wf != null) pt.wf = wf;
  return pt;
}

/**
 * Dense samples on fast strokes (v1 `pointer.js` `appendStrokePointsFromPointerEvent`).
 * @param {PointerEvent} e
 * @returns {{ x: number, y: number, t?: number, wf?: number }[]}
 */
export function hudPointsFromPointerMove(e, stagePoint, pressureSetting, endcap, getPressureFactor) {
  /** @type {PointerEvent[]} */
  let events = [e];
  if (typeof e.getCoalescedEvents === 'function') {
    const coalesced = e.getCoalescedEvents();
    if (coalesced?.length) events = coalesced;
  }
  const out = [];
  for (const ce of events) {
    const pt = hudPointFromEvent(
      ce,
      stagePoint,
      pressureSetting,
      endcap,
      getPressureFactor,
      e,
    );
    const prev = out[out.length - 1];
    if (prev && prev.x === pt.x && prev.y === pt.y) continue;
    out.push(pt);
  }
  return out;
}
