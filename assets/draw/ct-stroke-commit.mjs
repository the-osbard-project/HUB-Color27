/** Min path length before a paint stroke is committed (avoids tap-dots). */
export const MIN_STROKE_PATH_LEN = 12;

/**
 * @param {{ x: number, y: number }[]} points
 */
export function strokePathLength(points) {
  if (!points || points.length < 2) return 0;
  let len = 0;
  for (let i = 1; i < points.length; i++) {
    len += Math.hypot(points[i].x - points[i - 1].x, points[i].y - points[i - 1].y);
  }
  return len;
}

/**
 * @param {{ x: number, y: number }[]} points
 * @param {number} [minLen]
 */
export function isSubstantialStroke(points, minLen = MIN_STROKE_PATH_LEN) {
  return strokePathLength(points) >= minLen;
}
