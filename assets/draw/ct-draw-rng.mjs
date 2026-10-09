/** Color Time! — deterministic draw RNG (from Studio brush-fx/shared). */

/** @param {number} seed @param {number} x @param {number} [y] */
export function pseudo(seed, x, y = 0) {
  const v = Math.sin((seed + 1) * 12.9898 + (x + 1) * 78.233 + (y + 1) * 45.164) * 43758.5453;
  return v - Math.floor(v);
}
