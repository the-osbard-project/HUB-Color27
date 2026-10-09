/** v1 `paint-fx.js` — closed ribbon fill with round semicircle end caps. */

function wrapPi(a) {
  while (a > Math.PI) a -= 2 * Math.PI;
  while (a < -Math.PI) a += 2 * Math.PI;
  return a;
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} cx
 * @param {number} cy
 * @param {{ x: number, y: number }} edgeA
 * @param {{ x: number, y: number }} edgeB
 * @param {{ x: number, y: number }} bulgeUnit
 * @param {string} fillColor
 */
function ribbonFillSemicircleSector(ctx, cx, cy, edgeA, edgeB, bulgeUnit, fillColor) {
  ctx.fillStyle = fillColor;
  const r = Math.hypot(edgeA.x - cx, edgeA.y - cy);
  if (!(r > 1e-6)) return;
  const bl = Math.hypot(bulgeUnit.x, bulgeUnit.y) || 1;
  const bx = bulgeUnit.x / bl;
  const by = bulgeUnit.y / bl;
  const aA = Math.atan2(edgeA.y - cy, edgeA.x - cx);
  let d = wrapPi(Math.atan2(edgeB.y - cy, edgeB.x - cx) - aA);
  if (Math.abs(Math.abs(d) - Math.PI) > 0.12) {
    if (d > 0) d -= 2 * Math.PI;
    else d += 2 * Math.PI;
  }
  const mid = wrapPi(aA + d * 0.5);
  if (Math.cos(mid) * bx + Math.sin(mid) * by < 0) d = -d;
  const nSeg = Math.max(16, Math.min(48, Math.round(r * 0.9)));
  ctx.beginPath();
  ctx.moveTo(cx, cy);
  ctx.lineTo(edgeA.x, edgeA.y);
  for (let i = 1; i <= nSeg; i++) {
    const t = i / nSeg;
    const ang = aA + t * d;
    ctx.lineTo(cx + Math.cos(ang) * r, cy + Math.sin(ang) * r);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ x: number, y: number }[]} pts
 * @param {{ x: number, y: number }[]} left
 * @param {{ x: number, y: number }[]} right
 * @param {number} n
 * @param {boolean} roundCaps
 * @param {string} fillColor
 */
export function ribbonFillClosedPath(ctx, pts, left, right, n, roundCaps, fillColor) {
  if (!left.length || n < 2) return;
  ctx.fillStyle = fillColor;
  if (roundCaps) {
    const t0x = pts[1].x - pts[0].x;
    const t0y = pts[1].y - pts[0].y;
    const l0 = Math.hypot(t0x, t0y) || 1;
    const t0 = { x: t0x / l0, y: t0y / l0 };
    const tex = pts[n - 1].x - pts[n - 2].x;
    const tey = pts[n - 1].y - pts[n - 2].y;
    const le = Math.hypot(tex, tey) || 1;
    const te = { x: tex / le, y: tey / le };
    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i].x, left[i].y);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();
    ctx.fill();
    ribbonFillSemicircleSector(ctx, pts[0].x, pts[0].y, left[0], right[0], { x: -t0.x, y: -t0.y }, fillColor);
    ribbonFillSemicircleSector(ctx, pts[n - 1].x, pts[n - 1].y, right[n - 1], left[n - 1], te, fillColor);
  } else {
    ctx.beginPath();
    ctx.moveTo(left[0].x, left[0].y);
    for (let i = 1; i < n; i++) ctx.lineTo(left[i].x, left[i].y);
    for (let i = n - 1; i >= 0; i--) ctx.lineTo(right[i].x, right[i].y);
    ctx.closePath();
    ctx.fill();
  }
}

/**
 * @param {{ x: number, y: number, wf?: number }[]} pts
 * @param {number} n
 * @param {(i: number) => number} getW
 * @param {number} outerScale
 */
export function buildRibbonEdges(pts, n, getW, outerScale) {
  const norm = (dx, dy) => {
    const len = Math.hypot(dx, dy) || 1;
    return { x: dx / len, y: dy / len };
  };
  const perp = (i) => {
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
    const t = norm(dx, dy);
    return { x: t.y, y: -t.x };
  };
  const left = [];
  const right = [];
  for (let i = 0; i < n; i++) {
    const nv = perp(i);
    const half = Math.max(0.125, getW(i) * outerScale * 0.5);
    left.push({ x: pts[i].x + nv.x * half, y: pts[i].y + nv.y * half });
    right.push({ x: pts[i].x - nv.x * half, y: pts[i].y - nv.y * half });
  }
  return { left, right };
}
