/** Color Time! — Catmull-Rom stroke smoothing (Studio stroke-smooth.mjs port). */

/**
 * @param {{ x: number, y: number, t?: number }[]} points
 * @param {number} [smoothAmount] 0–100
 * @param {number} [lineWidthOpt]
 */
export function smoothStrokePoints(points, smoothAmount = 92, lineWidthOpt) {
  if (!points || points.length < 2) {
    return points ? points.map((p) => ({ x: p.x, y: p.y })) : [];
  }
  let amount = Math.max(0, Math.min(100, smoothAmount || 0));
  amount = Math.max(20, amount);

  let src = points.map((p) => ({ x: p.x, y: p.y, t: p.t || 0 }));
  const SMOOTH_MAX_INPUT = 8000;
  if (src.length > SMOOTH_MAX_INPUT) {
    const step = src.length / SMOOTH_MAX_INPUT;
    const sub = [];
    for (let i = 0; i < SMOOTH_MAX_INPUT; i += 1) {
      sub.push(src[Math.min(Math.floor(i * step), src.length - 1)]);
    }
    if (sub[sub.length - 1] !== src[src.length - 1]) sub.push(src[src.length - 1]);
    src = sub;
  }

  const minSpacing = 0.5;
  const maxSpacing = 12;
  const desiredSpacing = maxSpacing - (amount / 100) * (maxSpacing - minSpacing);
  const alpha = 0.5;
  const outPts = [];
  const lerp = (a, b, u) => a + (b - a) * u;
  const dist = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
  const tj = (ti, p, q) => ti + dist(p, q) ** alpha;

  /** Extrapolated Catmull controls so start/end segments keep incoming curvature. */
  function catmullControls(i) {
    const n = src.length;
    const P1 = src[i];
    const P2 = src[i + 1];
    let P0;
    let P3;
    if (i === 0) {
      P0 = { x: 2 * P1.x - P2.x, y: 2 * P1.y - P2.y };
    } else {
      P0 = src[i - 1];
    }
    if (i >= n - 2) {
      P3 = { x: 2 * P2.x - P1.x, y: 2 * P2.y - P1.y };
    } else {
      P3 = src[i + 2];
    }
    return { P0, P1, P2, P3 };
  }

  for (let i = 0; i < src.length - 1; i += 1) {
    const p1 = src[i];
    const p2 = src[i + 1];
    const dt = Math.max(1, (p2.t || 0) - (p1.t || 0));
    const segDist = dist(p1, p2);
    const speed = segDist / dt;
    const speedNorm = Math.min(8, speed) / 8;
    const actualSpacing = lerp(desiredSpacing, minSpacing, speedNorm);
    let samples = Math.max(1, Math.min(96, Math.ceil(segDist / Math.max(0.3, actualSpacing))));
    if (typeof lineWidthOpt === 'number' && lineWidthOpt > 0 && lineWidthOpt <= 24) {
      const minForThin = Math.ceil(segDist / Math.max(1.1, lineWidthOpt * 0.9));
      samples = Math.min(96, Math.max(samples, minForThin));
    }

    const { P0, P1, P2, P3 } = catmullControls(i);
    let t0 = 0;
    let t1 = tj(t0, P0, P1);
    let t2 = tj(t1, P1, P2);
    let t3 = tj(t2, P2, P3);
    if (outPts.length > 25000) break;
    const degenerate = t1 === t0 || t2 === t1 || t3 === t2;
    for (let s = 0; s < samples; s += 1) {
      const u = s / samples;
      if (degenerate) {
        outPts.push({ x: lerp(P1.x, P2.x, u), y: lerp(P1.y, P2.y, u) });
        continue;
      }
      const t = lerp(t1, t2, u);
      const A1 = {
        x: ((t1 - t) / (t1 - t0)) * P0.x + ((t - t0) / (t1 - t0)) * P1.x,
        y: ((t1 - t) / (t1 - t0)) * P0.y + ((t - t0) / (t1 - t0)) * P1.y,
      };
      const A2 = {
        x: ((t2 - t) / (t2 - t1)) * P1.x + ((t - t1) / (t2 - t1)) * P2.x,
        y: ((t2 - t) / (t2 - t1)) * P1.y + ((t - t1) / (t2 - t1)) * P2.y,
      };
      const A3 = {
        x: ((t3 - t) / (t3 - t2)) * P2.x + ((t - t2) / (t3 - t2)) * P3.x,
        y: ((t3 - t) / (t3 - t2)) * P2.y + ((t - t2) / (t3 - t2)) * P3.y,
      };
      const B1 = {
        x: ((t2 - t) / (t2 - t0)) * A1.x + ((t - t0) / (t2 - t0)) * A2.x,
        y: ((t2 - t) / (t2 - t0)) * A1.y + ((t - t0) / (t2 - t0)) * A2.y,
      };
      const B2 = {
        x: ((t3 - t) / (t3 - t1)) * A2.x + ((t - t1) / (t3 - t1)) * A3.x,
        y: ((t3 - t) / (t3 - t1)) * A2.y + ((t - t1) / (t3 - t1)) * A3.y,
      };
      outPts.push({
        x: ((t2 - t) / (t2 - t1)) * B1.x + ((t - t1) / (t2 - t1)) * B2.x,
        y: ((t2 - t) / (t2 - t1)) * B1.y + ((t - t1) / (t2 - t1)) * B2.y,
      });
    }
  }
  const last = src[src.length - 1];
  outPts.push({ x: last.x, y: last.y });
  return outPts;
}
