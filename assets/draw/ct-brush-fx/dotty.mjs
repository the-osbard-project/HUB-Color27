import { isTransparentColor } from '../ct-color-utils.mjs';
import { lxSeed } from './shared.mjs';

const DOTTI_PRESSURE_WIDTH_BOOST = 0.25;

/**
 * @param {number} lineWidth
 * @param {number|null|undefined} wf01
 */
function dottieStrokeWidthPxFromPressure01(lineWidth, wf01) {
  if (wf01 == null || !Number.isFinite(Number(wf01))) return lineWidth;
  const t = Math.max(0, Math.min(1, Number(wf01)));
  return lineWidth * (1 + DOTTI_PRESSURE_WIDTH_BOOST * t);
}

/**
 * @param {string} hex
 */
function parseHexRgb(hex) {
  let s = String(hex || '').replace('#', '').toLowerCase();
  if (s.length === 3) s = s[0] + s[0] + s[1] + s[1] + s[2] + s[2];
  if (s.length !== 6) return null;
  return {
    r: parseInt(s.slice(0, 2), 16),
    g: parseInt(s.slice(2, 4), 16),
    b: parseInt(s.slice(4, 6), 16),
  };
}

/**
 * @param {string} hex
 * @param {number} mul
 */
function dottyShadeHex(hex, mul) {
  const rgb = parseHexRgb(hex);
  if (!rgb) return hex;
  const clamp = (n) => Math.max(0, Math.min(255, Math.round(n)));
  return `#${[clamp(rgb.r * mul), clamp(rgb.g * mul), clamp(rgb.b * mul)]
    .map((c) => c.toString(16).padStart(2, '0'))
    .join('')}`;
}

/**
 * v1 `fillAmoebaSplat` — rounded quad silhouette with per-corner arc radii.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {number} radius
 * @param {number} seed
 * @param {string} fillStyle
 * @param {number} alpha
 */
function fillAmoebaSplat(ctx, cx, cy, radius, seed, fillStyle, alpha) {
  const halfW = Math.max(0.35, radius * (0.85 + lxSeed(seed + 7, cy, cx) * 0.35));
  const halfH = Math.max(0.28, radius * (0.75 + lxSeed(seed + 9, cx, cy) * 0.35));
  const theta = lxSeed(seed + 11, cx, cy) * Math.PI * 2;
  const skew = halfW * (0.2 + lxSeed(seed + 21, cx, cy) * 0.35);
  const cosT = Math.cos(theta);
  const sinT = Math.sin(theta);
  const cornersLocal = [
    { lx: -halfW + skew, ly: -halfH },
    { lx: halfW + skew, ly: -halfH },
    { lx: halfW - skew, ly: halfH },
    { lx: -halfW - skew, ly: halfH },
  ];
  const wc = cornersLocal.map((c) => ({
    x: cx + c.lx * cosT - c.ly * sinT,
    y: cy + c.lx * sinT + c.ly * cosT,
  }));
  const minHalf = Math.min(halfW, halfH);
  const radii = [0, 1, 2, 3].map(
    (c) => minHalf * (0.55 + lxSeed(seed + 31 + c, cx, cy) * 0.55),
  );
  ctx.save();
  if (fillStyle != null) ctx.fillStyle = fillStyle;
  if (alpha != null) ctx.globalAlpha = alpha;
  ctx.beginPath();
  ctx.moveTo((wc[3].x + wc[0].x) * 0.5, (wc[3].y + wc[0].y) * 0.5);
  for (let c = 0; c < 4; c++) {
    const nc = (c + 1) % 4;
    const mx = (wc[c].x + wc[nc].x) * 0.5;
    const my = (wc[c].y + wc[nc].y) * 0.5;
    ctx.arcTo(wc[c].x, wc[c].y, mx, my, radii[c]);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

/**
 * Dotty high-Amount blob stamp (wax-stamp splat).
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {number} splatT 0–1 (Amount / 100)
 * @param {string|null} fillHex
 * @param {string|null} strokeHex
 */
function drawDottyBlobStamp(ctx, x, y, r, splatT, fillHex, strokeHex) {
  const seed = Math.floor(x * 17.31 + y * 23.77);
  const bodyR = r * (1 + splatT * 0.62);
  const ink = fillHex || strokeHex || '#5836b5';
  const shadow = dottyShadeHex(ink, 0.52);
  const highlight = dottyShadeHex(ink, 1.28);
  const smush = splatT * splatT;
  ctx.save();
  ctx.globalCompositeOperation = 'source-over';
  fillAmoebaSplat(ctx, x + r * 0.14 * smush, y + r * 0.18 * smush, bodyR * 1.05, seed + 3, shadow, 0.22 + smush * 0.28);
  fillAmoebaSplat(ctx, x, y, bodyR, seed, ink, 0.88 + smush * 0.1);
  if (smush > 0.12) {
    fillAmoebaSplat(ctx, x - r * 0.22 * smush, y - r * 0.26 * smush, bodyR * 0.42, seed + 17, highlight, 0.2 + smush * 0.35);
  }
  if (smush > 0.35) {
    const nSat = 2 + Math.floor(lxSeed(seed + 41, x, y) * 3);
    for (let s = 0; s < nSat; s++) {
      const ang = lxSeed(seed + 50 + s, y, x) * Math.PI * 2;
      const dist = bodyR * (0.75 + lxSeed(seed + 60 + s, x, y) * 0.55);
      fillAmoebaSplat(
        ctx,
        x + Math.cos(ang) * dist,
        y + Math.sin(ang) * dist,
        r * (0.14 + lxSeed(seed + 70 + s, y, x) * 0.22),
        seed + 80 + s,
        ink,
        0.35 + smush * 0.4,
      );
    }
  }
  ctx.beginPath();
  ctx.arc(x, y, Math.max(0.35, r * (1 - splatT * 0.12)), 0, Math.PI * 2);
  ctx.fillStyle = ink;
  ctx.fill();
  if (strokeHex && fillHex && strokeHex !== fillHex) {
    ctx.strokeStyle = strokeHex;
    ctx.lineWidth = Math.max(0.5, r * 0.1);
    ctx.stroke();
  }
  ctx.restore();
}

/**
 * Dotty brush FX — ported from v1 `paint-fx.js` `drawDottieStroke`.
 * Amount 0 = round dots (diameter from stroke width); Amount 100 = wax-stamp blob splats.
 * Dot spacing is speed-based along the path, not controlled by Amount.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number, t?: number, wf?: number }[]} points
 * @param {string} strokeColor
 * @param {string|null|undefined} fillColor
 * @param {number} lineWidth
 * @param {number} amount 0–100 → splatT
 */
export function drawDotty(ctx, points, strokeColor, fillColor, lineWidth, amount) {
  if (!points?.length || !(lineWidth > 0)) return;
  const stroke = !isTransparentColor(strokeColor) ? strokeColor : null;
  const fill = !isTransparentColor(fillColor) ? fillColor : stroke;
  if (!fill && !stroke) return;
  const splatT = Math.max(0, Math.min(1, Number(amount) / 100));

  function placeDot(x, y, wf) {
    const d = dottieStrokeWidthPxFromPressure01(lineWidth, wf);
    const r = Math.max(0.5, d * 0.5);
    if (splatT < 0.004) {
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fillStyle = fill || stroke;
      ctx.fill();
      if (stroke && fill && stroke !== fill) {
        ctx.strokeStyle = stroke;
        ctx.lineWidth = Math.max(0.5, d * 0.08);
        ctx.stroke();
      }
    } else {
      drawDottyBlobStamp(ctx, x, y, r, splatT, fill, stroke);
    }
  }

  if (points.length === 1) {
    placeDot(points[0].x, points[0].y, points[0].wf);
    return;
  }

  let totalLen = 0;
  for (let ti = 1; ti < points.length; ti++) {
    totalLen += Math.hypot(points[ti].x - points[ti - 1].x, points[ti].y - points[ti - 1].y);
  }
  if (totalLen < lineWidth * 0.12) {
    placeDot(points[0].x, points[0].y, points[0].wf);
    return;
  }

  placeDot(points[0].x, points[0].y, points[0].wf);
  let distSinceLastDot = 0;

  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const segLen = Math.hypot(dx, dy);
    if (segLen < 1e-6) continue;

    const wfA = a.wf != null && Number.isFinite(Number(a.wf)) ? Number(a.wf) : null;
    const wfB = b.wf != null && Number.isFinite(Number(b.wf)) ? Number(b.wf) : null;

    let dt = 16;
    if (
      typeof a.t === 'number' &&
      typeof b.t === 'number' &&
      Number.isFinite(a.t) &&
      Number.isFinite(b.t) &&
      b.t > a.t
    ) {
      dt = b.t - a.t;
    }
    const speed = segLen / Math.max(1, dt);
    const speedRef = Math.max(0.05, lineWidth * 0.015);
    const speedFactor = Math.min(5, Math.max(1, speed / speedRef));

    let segPos = 0;
    while (segPos < segLen) {
      const uMid = (segPos + Math.min(segLen, segPos + 1)) / segLen;
      const wfMid =
        wfA != null && wfB != null
          ? wfA + (wfB - wfA) * uMid
          : wfB != null
            ? wfB
            : wfA;
      const dMid = dottieStrokeWidthPxFromPressure01(lineWidth, wfMid);
      const spacing = dMid * 0.75 * speedFactor;
      const need = spacing - distSinceLastDot;
      if (segLen - segPos < need) {
        distSinceLastDot += segLen - segPos;
        break;
      }
      segPos += need;
      distSinceLastDot = 0;
      const u = segPos / segLen;
      const x = a.x + dx * u;
      const y = a.y + dy * u;
      const wf = wfA != null && wfB != null ? wfA + (wfB - wfA) * u : wfMid;
      placeDot(x, y, wf);
    }
  }
}
