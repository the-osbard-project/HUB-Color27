/**
 * @typedef {{ x: number, y: number }} Point
 */

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {Point[]} points
 */
export function tracePath(ctx, points) {
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
}

/**
 * Quadratic midpoint smoothing — fewer visible joints than polyline stroke.
 * @param {CanvasRenderingContext2D} ctx
 * @param {Point[]} points
 */
export function tracePathSmooth(ctx, points) {
  if (!points?.length) return;
  ctx.beginPath();
  if (points.length === 1) {
    ctx.moveTo(points[0].x, points[0].y);
    return;
  }
  ctx.moveTo(points[0].x, points[0].y);
  if (points.length === 2) {
    ctx.lineTo(points[1].x, points[1].y);
    return;
  }
  for (let i = 1; i < points.length - 1; i++) {
    const mx = (points[i].x + points[i + 1].x) * 0.5;
    const my = (points[i].y + points[i + 1].y) * 0.5;
    ctx.quadraticCurveTo(points[i].x, points[i].y, mx, my);
  }
  const n = points.length - 1;
  ctx.quadraticCurveTo(points[n - 1].x, points[n - 1].y, points[n].x, points[n].y);
}

/**
 * @param {Point[]} points
 * @param {number} spacing
 */
export function* sampleAlong(points, spacing) {
  let carry = 0;
  yield points[0];
  for (let i = 1; i < points.length; i++) {
    const a = points[i - 1];
    const b = points[i];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) continue;
    let t = (spacing - carry) / dist;
    while (t <= 1) {
      yield { x: a.x + dx * t, y: a.y + dy * t };
      t += spacing / dist;
    }
    carry = (carry + dist) % spacing;
  }
}

/**
 * @param {number} span
 */
export function rand(span) {
  return (Math.random() - 0.5) * span * 2;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} size
 */
export function drawCross(ctx, x, y, size) {
  ctx.beginPath();
  ctx.moveTo(x - size, y);
  ctx.lineTo(x + size, y);
  ctx.moveTo(x, y - size);
  ctx.lineTo(x, y + size);
  ctx.stroke();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} size
 */
export function drawStar(ctx, x, y, size) {
  drawCross(ctx, x, y, size);
  ctx.beginPath();
  ctx.moveTo(x - size * 0.7, y - size * 0.7);
  ctx.lineTo(x + size * 0.7, y + size * 0.7);
  ctx.moveTo(x + size * 0.7, y - size * 0.7);
  ctx.lineTo(x - size * 0.7, y + size * 0.7);
  ctx.stroke();
}

/**
 * Irregular paint splat polygon around a center.
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} radius
 * @param {number} seed
 */
export function fillAmoebaSplat(ctx, x, y, radius, seed = 0) {
  const verts = 7 + (Math.abs(seed) % 5);
  ctx.beginPath();
  for (let i = 0; i < verts; i++) {
    const t = (i / verts) * Math.PI * 2;
    const wobble = 0.62 + pseudo(seed, i) * 0.68;
    const r = radius * wobble;
    const px = x + Math.cos(t) * r;
    const py = y + Math.sin(t) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

function pseudo(seed, i) {
  const v = Math.sin((seed + 1) * 12.9898 + (i + 1) * 78.233) * 43758.5453;
  return v - Math.floor(v);
}

/** v1 `lxSeed` — deterministic 0..1 from index + position. */
export function lxSeed(i, x, y) {
  const v = Math.sin((i + 1) * 12.9898 + (x + 1) * 78.233 + (y + 1) * 45.164) * 43758.5453;
  return v - Math.floor(v);
}

/** Stable replay seed from stroke id (avoids FX shifting on unrelated redraws). */
export function hashStringSeed(str) {
  let h = 2166136261;
  const s = String(str || 'oss-stroke');
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0 || 1;
}

/** @param {number} span @param {number} seed */
export function randSeeded(span, seed) {
  return (lxSeed(seed, 0, 0) - 0.5) * span * 2;
}

export { pseudo };
