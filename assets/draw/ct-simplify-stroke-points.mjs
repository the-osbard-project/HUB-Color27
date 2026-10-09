/**
 * Ramer–Douglas–Peucker stroke simplification (Studio simplify-stroke-points.mjs).
 */

/**
 * @param {{ x: number, y: number, t?: number, wf?: number }} p
 */
function clonePointForSimplify(p) {
  const o = { x: p.x, y: p.y };
  if (typeof p.t === 'number' && Number.isFinite(p.t)) o.t = p.t;
  if (p.wf != null && Number.isFinite(Number(p.wf))) o.wf = p.wf;
  return o;
}

function perpendicularDistancePointToSegment(px, py, ax, ay, bx, by) {
  const dx = bx - ax;
  const dy = by - ay;
  const lenSq = dx * dx + dy * dy;
  if (lenSq < 1e-18) return Math.hypot(px - ax, py - ay);
  const t = Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / lenSq));
  const nx = ax + t * dx;
  const ny = ay + t * dy;
  return Math.hypot(px - nx, py - ny);
}

function pointDist(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/**
 * Index at which `targetLen` px of arc length is reached from start or end.
 * @param {{ x: number, y: number }[]} points
 * @param {'start'|'end'} from
 * @param {number} targetLen
 */
function arcIndexAfterLength(points, from, targetLen) {
  const n = points.length;
  if (n < 2 || targetLen <= 0) return from === 'start' ? 0 : n - 1;
  let acc = 0;
  if (from === 'start') {
    for (let i = 1; i < n; i += 1) {
      acc += pointDist(points[i - 1], points[i]);
      if (acc >= targetLen) return i;
    }
    return n - 1;
  }
  for (let i = n - 2; i >= 0; i -= 1) {
    acc += pointDist(points[i], points[i + 1]);
    if (acc >= targetLen) return i;
  }
  return 0;
}

/**
 * @param {{ x: number, y: number, t?: number, wf?: number }[]} head
 * @param {{ x: number, y: number, t?: number, wf?: number }[]} mid
 * @param {{ x: number, y: number, t?: number, wf?: number }[]} tail
 */
function mergeSimplifiedPaths(head, mid, tail) {
  const out = head.map((p) => clonePointForSimplify(p));
  for (let i = 1; i < mid.length; i += 1) {
    const p = mid[i];
    const prev = out[out.length - 1];
    if (!prev || prev.x !== p.x || prev.y !== p.y) out.push(clonePointForSimplify(p));
  }
  for (let i = 1; i < tail.length; i += 1) {
    const p = tail[i];
    const prev = out[out.length - 1];
    if (!prev || prev.x !== p.x || prev.y !== p.y) out.push(clonePointForSimplify(p));
  }
  return out.length >= 2 ? out : mid.map((p) => clonePointForSimplify(p));
}

/**
 * Ramer–Douglas–Peucker polyline simplification. Keeps original vertices; preserves .t / .wf when present.
 * @param {{ x: number, y: number, t?: number, wf?: number }[]} points
 * @param {number} epsilon Distance threshold in logical canvas px.
 * @param {number} [endpointPreservePx] Arc length at start/end left unsimplified (curved caps).
 */
export function simplifyStrokePoints(points, epsilon, endpointPreservePx = 0) {
  if (!points?.length) return [];
  if (points.length < 2) return [clonePointForSimplify(points[0])];
  const eps = Math.max(0, Number(epsilon) || 0);
  if (eps <= 0) {
    return points.map((p) => clonePointForSimplify(p));
  }
  const preserve = Math.max(0, Number(endpointPreservePx) || 0);
  if (preserve > 0 && points.length >= 4) {
    const headEnd = arcIndexAfterLength(points, 'start', preserve);
    const tailStart = arcIndexAfterLength(points, 'end', preserve);
    if (headEnd < tailStart) {
      const head = points.slice(0, headEnd + 1);
      const middle = points.slice(headEnd, tailStart + 1);
      const tail = points.slice(tailStart);
      const midSimplified = simplifyStrokePoints(middle, eps, 0);
      return mergeSimplifiedPaths(head, midSimplified, tail);
    }
  }
  const n = points.length;
  if (n === 2) {
    return [clonePointForSimplify(points[0]), clonePointForSimplify(points[1])];
  }
  const keep = new Array(n).fill(false);
  keep[0] = true;
  keep[n - 1] = true;
  const stack = [[0, n - 1]];
  while (stack.length > 0) {
    const [i, j] = stack.pop();
    const ax = points[i].x;
    const ay = points[i].y;
    const bx = points[j].x;
    const by = points[j].y;
    let maxD = -1;
    let maxIdx = i;
    for (let k = i + 1; k < j; k++) {
      const d = perpendicularDistancePointToSegment(points[k].x, points[k].y, ax, ay, bx, by);
      if (d > maxD) {
        maxD = d;
        maxIdx = k;
      }
    }
    if (maxD > eps) {
      keep[maxIdx] = true;
      stack.push([maxIdx, j], [i, maxIdx]);
    }
  }
  const out = [];
  for (let m = 0; m < n; m++) {
    if (keep[m]) out.push(clonePointForSimplify(points[m]));
  }
  if (out.length < 2) {
    return [clonePointForSimplify(points[0]), clonePointForSimplify(points[n - 1])];
  }
  return out;
}

/** Arc length at stroke ends kept out of RDP so simplify does not flatten curved caps. */
export function simplifyEndpointPreservePx(lineWidth) {
  const w = Math.max(1, Number(lineWidth) || 1);
  return Math.max(22, w * 6);
}

/** Distance within which start/end are treated as a closing loop. */
export function nearClosedLoopThreshold(lineWidth) {
  const w = Math.max(1, Number(lineWidth) || 1);
  return Math.max(10, w * 2.5);
}

/**
 * @param {{ x: number, y: number }[]} points
 * @param {number} lineWidth
 */
export function isNearClosedLoop(points, lineWidth) {
  if (!points || points.length < 4) return false;
  return pointDist(points[0], points[points.length - 1]) <= nearClosedLoopThreshold(lineWidth);
}

/**
 * Remove stacked points where the stroke crosses back over the start (loop close).
 * @param {{ x: number, y: number, t?: number, wf?: number }[]} points
 * @param {number} lineWidth
 */
export function trimLoopClosingCluster(points, lineWidth) {
  if (!points?.length) return [];
  if (!isNearClosedLoop(points, lineWidth)) {
    return points.map((p) => clonePointForSimplify(p));
  }
  const first = points[0];
  const thresh = nearClosedLoopThreshold(lineWidth);
  let end = points.length - 1;
  while (end > 2 && pointDist(points[end], first) <= thresh) {
    end -= 1;
  }
  return points.slice(0, end + 1).map((p) => clonePointForSimplify(p));
}

/** Studio `brushSimplifySliderToEpsilon` — 0–100 → 0–22 logical px. */
export function simplifySliderToEpsilon(slider) {
  const s = Math.max(0, Math.min(100, Number(slider) || 0));
  return (s / 100) * 22;
}
