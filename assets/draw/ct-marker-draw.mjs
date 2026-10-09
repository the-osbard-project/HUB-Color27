import {
  allocateCommitMs,
  lerpRgb,
  parseHexColor,
  query,
  rgbToHex,
  stampPolylineDiscs,
  WET_WINDOW_SEC_DEFAULT,
  pigmentMixLerpStrength,
} from './ct-marker-wet.mjs';
import {
  assignWidthFactorsFromOriginal,
  brushStrokeWidthPxFromPressure01,
  densifyMarkerPoints,
  resamplePathByDistance,
  ribbonWidthAt,
} from './ct-marker-path.mjs';

/**
 * @typedef {{
 *   layerIndex: number,
 *   logicalW: number,
 *   logicalH: number,
 *   commitMs: number,
 *   wetWindowSec?: number,
 *   stamp?: boolean,
 * }} MarkerWetOpts
 */

const CHISEL_FILL_ALPHA_BOOST = 2.35;
const INK_TARGET_MAX = 0.88;

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} pts
 * @param {number} n
 * @param {(i: number) => number} getW
 * @param {number} outerScale
 * @param {number} i0
 * @param {number} i1
 * @param {string} fill
 */
function ribbonFillSegment(ctx, pts, n, getW, outerScale, i0, i1, fill) {
  const count = i1 - i0;
  if (count < 2) return;
  const tangentDir = (i) => {
    let dx;
    let dy;
    if (i === 0) {
      dx = pts[1].x - pts[0].x;
      dy = pts[1].y - pts[0].y;
    } else if (i === n - 1) {
      dx = pts[n - 1].x - pts[n - 2].x;
      dy = pts[n - 1].y - pts[n - 2].y;
    } else {
      dx = (pts[i + 1].x - pts[i - 1].x) * 0.5;
      dy = (pts[i + 1].y - pts[i - 1].y) * 0.5;
    }
    return Math.atan2(dy, dx);
  };
  const normalAt = (i) => {
    const t = tangentDir(i);
    return { x: Math.sin(t), y: -Math.cos(t) };
  };
  const left = [];
  const right = [];
  for (let i = i0; i < i1; i++) {
    const nv = normalAt(i);
    const half = (getW(i) * outerScale * 0.5) || 0.25;
    left.push({ x: pts[i].x + nv.x * half, y: pts[i].y + nv.y * half });
    right.push({ x: pts[i].x - nv.x * half, y: pts[i].y - nv.y * half });
  }
  ctx.fillStyle = fill;
  ctx.beginPath();
  ctx.moveTo(left[0].x, left[0].y);
  for (let j = 1; j < left.length; j++) ctx.lineTo(left[j].x, left[j].y);
  for (let j = right.length - 1; j >= 0; j--) ctx.lineTo(right[j].x, right[j].y);
  ctx.closePath();
  ctx.fill();
}

/**
 * v1 `drawMarkerSegmentStacking` (`paint-fx.js`).
 * @param {CanvasRenderingContext2D} ctx
 * @param {{
 *   points: { x: number, y: number, wf?: number }[],
 *   color: string,
 *   width: number,
 *   endcap?: 'round'|'flat'|'taper',
 *   taper?: number,
 *   palette?: string[] | null,
 *   markerWetOpts?: MarkerWetOpts | null,
 *   amountMul?: number,
 *   pigmentMix?: number,
 *   smudge?: number,
 * }} stroke
 */
export function drawMarkerStroke(ctx, stroke) {
  const rawPts = stroke.points;
  if (!rawPts || rawPts.length < 2) return;

  const lineWidth = stroke.width ?? 12;
  const color = stroke.color;
  const markerChisel = stroke.endcap === 'flat';
  const palette = stroke.palette?.length > 1 ? stroke.palette : null;
  const amtMul = stroke.amountMul ?? 1;
  const mw = stroke.markerWetOpts ?? null;
  const blendAmt = Number.isFinite(Number(stroke.pigmentMix))
    ? Math.max(0, Math.min(100, Number(stroke.pigmentMix)))
    : 50;
  const smudgeAmt = Number.isFinite(Number(stroke.smudge))
    ? Math.max(0, Math.min(100, Number(stroke.smudge)))
    : 100;
  const smudgeT = smudgeAmt / 100;
  const pigmentLerp = pigmentMixLerpStrength(blendAmt);
  const isLivePreview = mw?.stamp === false;
  /* commitMs = Date.now()*1000 + seq (µs-scale); window must match — sec * 1e6 */
  const winMs = Math.max(1, (mw?.wetWindowSec ?? WET_WINDOW_SEC_DEFAULT)) * 1000 * 1000;
  const queryMs =
    mw?.commitMs != null && !isLivePreview ? mw.commitMs : mw?.commitMs ?? Date.now();
  const taper = Math.max(0, Math.min(100, stroke.taper ?? 0));
  const ribbonSymmetric = stroke.endcap === 'taper';

  let pts = rawPts.map((p) => ({ ...p }));
  if (isLivePreview) {
    const previewPtsTarget = Math.max(100, Math.min(220, Math.round(40 + lineWidth * 4.5)));
    pts = resamplePathByDistance(pts, previewPtsTarget);
    assignWidthFactorsFromOriginal(pts, rawPts);
  }
  const n = pts.length;

  function markerColorAt(i) {
    if (!palette) return color;
    const t = n > 1 ? i / (n - 1) : 0;
    const idx = Math.min(palette.length - 1, Math.floor(t * palette.length));
    return palette[idx] || color;
  }

  let sumWf = 0;
  for (let mi = 0; mi < n; mi++) {
    const wf0 = pts[mi].wf != null && Number.isFinite(Number(pts[mi].wf)) ? Number(pts[mi].wf) : 1;
    sumWf += wf0;
  }
  const avgWf = n ? sumWf / n : 1;
  const opScale = 0.38 + 0.62 * avgWf;
  const feather = 1 + (1 - avgWf) * 0.28;
  const nibRad = Math.PI / 4;
  const chiselMinFrac = 0.12;

  const markerTangentDir = (i) => {
    let dx;
    let dy;
    if (i === 0) {
      dx = pts[1].x - pts[0].x;
      dy = pts[1].y - pts[0].y;
    } else if (i === n - 1) {
      dx = pts[n - 1].x - pts[n - 2].x;
      dy = pts[n - 1].y - pts[n - 2].y;
    } else {
      dx = (pts[i + 1].x - pts[i - 1].x) * 0.5;
      dy = (pts[i + 1].y - pts[i - 1].y) * 0.5;
    }
    return Math.atan2(dy, dx);
  };

  const markerChiselWidthAt = (i) => {
    const dir = markerTangentDir(i);
    const delta = dir - nibRad;
    const wf = chiselMinFrac + (1 - chiselMinFrac) * Math.abs(Math.sin(delta));
    const wfP = pts[i].wf != null && Number.isFinite(Number(pts[i].wf)) ? Number(pts[i].wf) : null;
    return brushStrokeWidthPxFromPressure01(lineWidth * wf, wfP);
  };

  const ribbonW = ribbonWidthAt(pts, lineWidth, n, ribbonSymmetric, taper);
  const getW = markerChisel ? markerChiselWidthAt : ribbonW;

  /* Tight stack: soft rim, not a pale halo. Same 3 passes for live + commit.
     Smudge 0 stamps more opaque; 100 keeps the watery alphas. */
  const wateryAlphas = [
    Math.min(0.38, 0.26 * opScale * INK_TARGET_MAX) * amtMul,
    Math.min(0.46, 0.34 * opScale * INK_TARGET_MAX) * amtMul,
    Math.min(0.52, 0.4 * opScale * INK_TARGET_MAX) * amtMul,
  ];
  const stampAlphas = [
    Math.min(1, 0.78 * opScale * INK_TARGET_MAX) * amtMul,
    Math.min(1, 0.88 * opScale * INK_TARGET_MAX) * amtMul,
    Math.min(1, 0.96 * opScale * INK_TARGET_MAX) * amtMul,
  ];
  const mixAlpha = (watery, stamp) => watery + (stamp - watery) * (1 - smudgeT);
  const wateryScale = [1.06, 1.03, 1];
  const stampScale = [1.02, 1.01, 1];
  const passes = [
    {
      outerScale: (stampScale[0] + (wateryScale[0] - stampScale[0]) * smudgeT) * feather,
      alpha: mixAlpha(wateryAlphas[0], stampAlphas[0]),
    },
    {
      outerScale: (stampScale[1] + (wateryScale[1] - stampScale[1]) * smudgeT) * feather,
      alpha: mixAlpha(wateryAlphas[1], stampAlphas[1]),
    },
    {
      outerScale: (stampScale[2] + (wateryScale[2] - stampScale[2]) * smudgeT) * feather,
      alpha: mixAlpha(wateryAlphas[2], stampAlphas[2]),
    },
  ];

  function markerStyleForPx(cx, cy, baseAlpha, strokeHex) {
    let fillHex = strokeHex;
    let ga = baseAlpha;
    const wantHue = blendAmt > 0;
    const wantPickup = wantHue || smudgeAmt > 0;
    if (
      !wantPickup ||
      !mw ||
      mw.layerIndex == null ||
      !mw.logicalW ||
      !mw.logicalH ||
      mw.commitMs == null
    ) {
      return { fill: fillHex, alpha: ga };
    }
    const srcRgb = parseHexColor(strokeHex);
    if (!srcRgb) return { fill: fillHex, alpha: ga };
    const q = query(mw.layerIndex, mw.logicalW, mw.logicalH, cx, cy, queryMs, winMs);
    if (q.kind === 'wet' && q.rgb) {
      const dist = Math.abs(q.rgb.r - srcRgb.r) + Math.abs(q.rgb.g - srcRgb.g) + Math.abs(q.rgb.b - srcRgb.b);
      if (dist < 56) return { fill: strokeHex, alpha: baseAlpha };
      if (wantHue) {
        const mx = lerpRgb(q.rgb, srcRgb, pigmentLerp.wet);
        fillHex = rgbToHex(mx.r, mx.g, mx.b);
      }
      if (smudgeAmt > 0) {
        ga = Math.min(0.96, baseAlpha * (1 + 0.14 * smudgeT));
      }
    } else if (q.kind === 'dry' && q.rgb) {
      const distDry =
        Math.abs(q.rgb.r - srcRgb.r) + Math.abs(q.rgb.g - srcRgb.g) + Math.abs(q.rgb.b - srcRgb.b);
      if (distDry < 56) return { fill: strokeHex, alpha: baseAlpha };
      if (wantHue) {
        const mx = lerpRgb(q.rgb, srcRgb, pigmentLerp.dry);
        fillHex = rgbToHex(mx.r, mx.g, mx.b);
      }
      if (smudgeAmt > 0) {
        ga = Math.min(0.94, baseAlpha * (1 + 0.06 * smudgeT));
      }
    }
    return { fill: fillHex, alpha: ga };
  }

  function markerStyleForSegment(i0, i1, baseAlpha, strokeHex) {
    const mx = (pts[i0].x + pts[i1].x) * 0.5;
    const my = (pts[i0].y + pts[i1].y) * 0.5;
    return markerStyleForPx(mx, my, baseAlpha, strokeHex);
  }

  ctx.save();
  ctx.globalCompositeOperation = 'source-over';

  for (const p of passes) {
    if (markerChisel) {
      const fillAlpha = Math.min(0.96, p.alpha * CHISEL_FILL_ALPHA_BOOST);
      for (let i = 1; i < n; i++) {
        const st = markerStyleForSegment(i - 1, i, fillAlpha, markerColorAt(i));
        ctx.globalAlpha = st.alpha;
        ribbonFillSegment(ctx, pts, n, getW, p.outerScale, i - 1, i + 1, st.fill);
      }
    } else {
      ctx.lineJoin = 'round';
      ctx.lineCap = 'round';
      for (let i = 1; i < n; i++) {
        const st = markerStyleForSegment(i - 1, i, p.alpha, markerColorAt(i));
        ctx.strokeStyle = st.fill;
        ctx.globalAlpha = st.alpha;
        const wPrev = getW(i - 1) * p.outerScale;
        const wCur = getW(i) * p.outerScale;
        ctx.lineWidth = Math.max(0.65, (wPrev + wCur) * 0.5);
        ctx.beginPath();
        ctx.moveTo(pts[i - 1].x, pts[i - 1].y);
        ctx.lineTo(pts[i].x, pts[i].y);
        ctx.stroke();
      }
    }
  }

  ctx.globalAlpha = 1;
  ctx.restore();

  if (
    mw &&
    mw.stamp !== false &&
    mw.commitMs != null &&
    mw.layerIndex != null &&
    mw.logicalW &&
    mw.logicalH
  ) {
    const stampHalf = Math.max(lineWidth * 0.58 * feather, 4 * 1.25);
    if (palette) {
      for (let si = 1; si < n; si++) {
        stampPolylineDiscs(
          mw.layerIndex,
          mw.logicalW,
          mw.logicalH,
          [pts[si - 1], pts[si]],
          stampHalf,
          mw.commitMs,
          markerColorAt(si),
        );
      }
    } else {
      stampPolylineDiscs(mw.layerIndex, mw.logicalW, mw.logicalH, pts, stampHalf, mw.commitMs, color);
    }
  }
}

/** @param {{ x: number, y: number, wf?: number }[]} points @param {number} lineWidth */
export function prepareMarkerCommitPoints(points, lineWidth) {
  const maxSpan = Math.max(0.75, Math.min(4, lineWidth * 0.35));
  return densifyMarkerPoints(points, maxSpan, 10000);
}

export { allocateCommitMs };
