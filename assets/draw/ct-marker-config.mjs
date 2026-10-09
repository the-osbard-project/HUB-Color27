/** v1 marker tip → stroke geometry (HUD presets still set width / pressure / smoothing). */

/** @typedef {'brush'|'fine'|'chisel'|'round'} MarkerTipId */
/** @typedef {'watery'|'acry'|'alcy'} MarkerInkId */

/**
 * Chisel = flat ribbon; other tips follow HUD endcap (round or taper).
 * @param {MarkerTipId | string} tip
 * @param {'round'|'flat'|'taper'} hudEndcap
 */
export function resolveMarkerEndcap(tip, hudEndcap) {
  if (tip === 'chisel') return 'flat';
  return hudEndcap === 'flat' || hudEndcap === 'taper' ? hudEndcap : 'round';
}

/**
 * Blendy (`watery`) uses the wet stack; acrylic paints opaque with no wet merge.
 * @param {MarkerInkId | string} ink
 */
export function markerInkUsesWetStack(ink) {
  return ink !== 'acry';
}
