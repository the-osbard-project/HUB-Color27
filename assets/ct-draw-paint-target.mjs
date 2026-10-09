/** Pointer overlay + per-layer stroke canvas paint target. */

/**
 * @param {HTMLCanvasElement} eventCanvas
 * @param {{ getPaintContext?: () => CanvasRenderingContext2D | null }} opts
 * @returns {{ eventCanvas: HTMLCanvasElement, paintCtx: () => CanvasRenderingContext2D | null } | null}
 */
export function bindCtPaintTarget(eventCanvas, opts) {
  const fallback = eventCanvas.getContext('2d');
  if (!fallback) return null;
  function paintCtx() {
    return opts.getPaintContext?.() ?? fallback;
  }
  return { eventCanvas, paintCtx };
}
