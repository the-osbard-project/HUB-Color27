/**
 * @param {string|null|undefined} color
 */
export function isTransparentColor(color) {
  if (color == null || color === '') return true;
  const s = String(color).trim().toLowerCase();
  if (s === 'transparent' || s === 'none') return true;
  const m = s.match(/^rgba?\(\s*[\d.]+\s*,\s*[\d.]+\s*,\s*[\d.]+\s*(?:,\s*([\d.]+)\s*)?\)$/);
  if (m && Number(m[1]) === 0) return true;
  return false;
}
