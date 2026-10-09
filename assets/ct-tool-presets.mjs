/**
 * Color Time! — Studio HUD defaults (from HUB-O-Studio26 draw-tool-presets.mjs).
 * CT starting point = Studio drawing tools as-is: width, pressure, stroke color.
 */

/** @typedef {{
 *   strokeWidth: number,
 *   pressure: number,
 *   strokeColor?: string,
 *   wellTexture?: string,
 *   markerInk?: string,
 *   markerTip?: string,
 *   brushFx?: string,
 *   amount?: number,
 *   smoothing?: number,
 *   simplify?: number,
 *   endcap?: string,
 * }} CtToolPreset */

/** @type {Record<string, CtToolPreset>} */
export const CT_TOOL_PRESETS = Object.freeze({
  pencil: {
    strokeWidth: 7,
    pressure: 3,
    strokeColor: '#EE204D',
    wellTexture: 'pencil',
  },
  pastel: {
    strokeWidth: 22,
    pressure: 0,
    strokeColor: '#F5C542',
    wellTexture: 'plain',
  },
  crayon: {
    strokeWidth: 16,
    pressure: 0,
    strokeColor: '#EE204D',
    wellTexture: 'crayon',
  },
  marker: {
    strokeWidth: 14,
    pressure: 75,
    strokeColor: '#1C99FF',
    markerInk: 'watery',
    markerTip: 'brush',
    wellTexture: 'watery',
  },
  star: {
    strokeWidth: 22,
    pressure: 75,
    strokeColor: '#6c4ac8',
    wellTexture: 'plain',
    brushFx: 'brushy',
  },
});

/** Studio `BRUSH_FX_HUD_PRESETS` — Color Star! per-mode HUD. */
export const CT_STAR_FX_PRESETS = Object.freeze({
  brushy: { strokeWidth: 22, pressure: 75, strokeColor: '#6c4ac8' },
  dotty: { strokeWidth: 75, pressure: 0, strokeColor: '#baa846', amount: 40 },
  starry: { strokeWidth: 30, pressure: 0, strokeColor: '#baa846' },
  watery: { strokeWidth: 40, pressure: 28, strokeColor: '#0087f9', amount: 100 },
  washy: { strokeWidth: 100, pressure: 28, strokeColor: '#1e88e5', amount: 100 },
  sunny: { strokeWidth: 100, pressure: 28, strokeColor: '#FFAB40', amount: 100 },
  foggy: { strokeWidth: 50, pressure: 0, strokeColor: '#baa846' },
  furry: { strokeWidth: 50, pressure: 0, strokeColor: '#C5703F' },
  glittery: { strokeWidth: 12, pressure: 3, smoothing: 7, strokeColor: '#7B2D8E', endcap: 'round', amount: 100 },
  inky: { strokeWidth: 3, pressure: 0, strokeColor: '#121212', endcap: 'round', smoothing: 0, simplify: 0 },
  glowy: { strokeWidth: 50, pressure: 0, strokeColor: '#FF3366', amount: 100 },
});

/** @param {string} fx */
export function getCtStarFxPreset(fx) {
  return CT_STAR_FX_PRESETS[fx] ?? CT_STAR_FX_PRESETS.brushy;
}

/** @param {string} toolKey */
export function getCtToolPreset(toolKey) {
  return CT_TOOL_PRESETS[toolKey] ?? null;
}

/** Studio resolveWellSurfaceTexture — for future well overlay port (well-surface.mjs). */
export function wellTextureForTool(toolKey, { brushFx } = {}) {
  if (toolKey === 'bucket') return 'bucket';
  const preset = getCtToolPreset(toolKey);
  if (toolKey === 'star' && brushFx) {
    const fx = String(brushFx).toLowerCase();
    if (fx === 'starry') return 'starry';
    if (fx === 'glittery') return 'glittery';
    if (fx === 'watery' || fx === 'washy') return 'watery';
    if (fx === 'glowy') return 'glowy';
    return fx;
  }
  return preset?.wellTexture ?? 'plain';
}
