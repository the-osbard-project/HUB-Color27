/**
 * Screen → stage bitmap mapping, including view rotation un-map.
 */

/**
 * @param {HTMLCanvasElement | null | undefined} canvas
 */
export function getCanvasPaintRect(canvas) {
  if (!canvas?.getBoundingClientRect) return null;
  const rect = canvas.getBoundingClientRect();
  if (!rect || rect.width <= 0 || rect.height <= 0) return null;
  const bw = canvas.width;
  const bh = canvas.height;
  if (!(bw > 0) || !(bh > 0)) {
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  }
  const bitmapAspect = bw / bh;
  const rectAspect = rect.width / rect.height;
  if (Math.abs(bitmapAspect - rectAspect) < 0.0005) {
    return { left: rect.left, top: rect.top, width: rect.width, height: rect.height };
  }
  if (rectAspect > bitmapAspect) {
    const h = rect.height;
    const w = h * bitmapAspect;
    return { left: rect.left + (rect.width - w) * 0.5, top: rect.top, width: w, height: h };
  }
  const w2 = rect.width;
  const h2 = w2 / bitmapAspect;
  return { left: rect.left, top: rect.top + (rect.height - h2) * 0.5, width: w2, height: h2 };
}

/**
 * @param {HTMLCanvasElement} canvas
 * @param {{ left: number, top: number, width: number, height: number }} rect
 * @param {number} clientX
 * @param {number} clientY
 * @param {number} [rotationDeg]
 */
export function clientToStagePixels(canvas, rect, clientX, clientY, rotationDeg = 0) {
  const cx = rect.left + rect.width / 2;
  const cy = rect.top + rect.height / 2;
  const rad = (-rotationDeg * Math.PI) / 180;
  const dx = clientX - cx;
  const dy = clientY - cy;
  const rx = dx * Math.cos(rad) - dy * Math.sin(rad);
  const ry = dx * Math.sin(rad) + dy * Math.cos(rad);
  const localX = rx + rect.width / 2;
  const localY = ry + rect.height / 2;
  return {
    x: (localX * canvas.width) / rect.width,
    y: (localY * canvas.height) / rect.height,
  };
}
