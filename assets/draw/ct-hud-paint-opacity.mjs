/**
 * PCT Line/Fill opacity (0–1) multiplied with tool base opacity at paint + commit.
 * @param {{ opacity?: number, getStrokeOpacity?: () => number }} opts
 * @param {number} [toolDefault=1]
 */
export function hudStrokeOpacity(opts, toolDefault = 1) {
  const base = Number.isFinite(opts.opacity) ? opts.opacity : toolDefault;
  const user = opts.getStrokeOpacity?.();
  const mul = Number.isFinite(user) ? Math.max(0, Math.min(1, user)) : 1;
  return Math.max(0, Math.min(1, base * mul));
}

/**
 * @param {{ getFillOpacity?: () => number }} opts
 */
export function hudFillOpacity(opts) {
  const user = opts.getFillOpacity?.();
  return Number.isFinite(user) ? Math.max(0, Math.min(1, user)) : 1;
}
