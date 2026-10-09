/** Color Time! fork — app profile hooks. */

/** CT brand accent — Crayon Creators well 4 · Lobby card · q400 paw (logo-512-ct.png). */
export const CT_BRAND_GREEN = '#58b42d';

/** Marker tool / crayon well 9 — Marker Blue Contrast tray. */
export const CT_BRAND_BLUE = '#0087f9';

export const DD_APP_ID = 'color-time';

/** Shell version — Gear settings + fork docs. */
export const DD_VERSION = 'CT26';

/** CT-LAB rail width @ 1152 hull (144px) — frees stage gutters for 2×2 sliders. Drydock MSOT uses 192. */
/** Desk rails hug icon tiles — spare window width goes to the stage (MOAS stretch). */
export const DESK_RAIL_W = 112;

/** Legacy fraction — phone fill still uses this when layoutFromWidth scales with viewport. */
export const RAIL_W_FRAC = 144 / 1152;

/**
 * Hub Contrast — house · Glow · Bones only.
 * Persists in `oss-hub-theme`.
 * @type {readonly string[]}
 */
export const HUB_THEME_CLASSES = [
  'theme-royal-purple', // Blue Marker (house)
  'theme-huglo', // Glow
  'theme-bones', // Bones
];

/** First paint + fallback when no stored tray — Color Time blue. */
export const HUB_THEME_DEFAULT = 'theme-royal-purple';

/** Chronicles dispatch anchor — Slate tray source color. */
export const SLATE_BRAND = '#3b495a';

/** @type {Record<string, string>} */
export const HUB_THEME_LABELS = {
  'theme-royal-purple': 'Blue Marker',
  'theme-huglo': 'Glow',
  'theme-bones': 'Bones',
};

/** PWA theme-color per tray */
export const HUB_THEME_META_COLORS = {
  'theme-royal-purple': '#0c2d7a',
  'theme-huglo': '#000000',
  'theme-bones': '#1c1917',
};

/** Active tray — follows user across OSS apps (`oss-hub-theme`). */
export const HUB_THEME_STORAGE_KEY = 'oss-hub-theme';

/**
 * Each app opens on `HUB_THEME_DEFAULT`. Hub Contrast cycles every tray in
 * `HUB_THEME_CLASSES`; the user's choice persists across OSS apps.
 */

/** Legacy boolean Contrast flag — migrated to Glow (`theme-huglo`) on read. */
export const HUB_CONTRAST_STORAGE_KEY = 'oss-hub-contrast';

/** @type {readonly string[]} */
export const ALLOWED_TOKENS = [
  '4:3', '3:4',
  '16:10', '10:16',
  '16:9', '9:16',
  '19.5:9', '9:19.5',
  '20:9', '9:20',
];

/** @type {'both' | 'landscape' | 'portrait'}
 * `both` = no forced flip — portrait stack only when the window is actually portrait.
 */
export const ORIENTATION_LOCK = 'both';

/** Portrait phone/tablet stack tokens — auto-detect pool (portrait only). */
export const PHONE_PORTRAIT_TOKENS = ['3:4', '9:16', '10:16', '9:19.5', '9:20'];

/** Wide phone landscape tokens — optional; landscape uses desk rails + fill by default. */
export const PHONE_LANDSCAPE_TOKENS = ['19.5:9', '20:9', '16:9', '4:3'];

/** Portrait phone/tablet — square canvas row + 3 tool bands (15 / 15 / 10). Includes 3:4 iPad. */
export const MOBILE_STACK_TOKENS = new Set(PHONE_PORTRAIT_TOKENS);

/** Phone stack tool-row fractions (of space below square canvas row). */
export const PHONE_STACK_ROWS = {
  rails: 0.15,
  q400: 0.15,
  paw: 0.10,
};

/** q400 / phone-stack row icons — fill row height × this fraction. */
export const Q400_ICON_FRAC = 0.78;

/** Phone stack row 2 — cap icon TT by hull width (horizontal strip). */
export const PHONE_RAIL_ICON_FRAC = 0.78;

/** Wide phone landscape — 6-row stack (square canvas + 5 equal bands). */
export const PHONE_WIDE_STACK_TOKENS = new Set(['19.5:9', '20:9']);

/** Authored hull for wide stack — portrait pair (w×w square canvas + band below). */
/** @type {Record<string, string>} */
export const PHONE_WIDE_STACK_LAYOUT = {
  '19.5:9': '9:19.5',
  '20:9': '9:20',
};

/** Phone + tablet portrait stack — Hub fills the hull (covers paw; X closes). */
export const HUB_FULL_VIEWPORT_TOKENS = new Set(['3:4', '9:16', '10:16', '9:19.5', '9:20']);

/** Wide phone stack — Hub fills the hull (covers paw; X closes). */
export const HUB_PHONE_WIDE_STACK_TOKENS = new Set(['19.5:9', '20:9']);

/** Legacy — unused while 3:4 forces phone stack (kept empty for forks). */
export const HUB_HULL_WIDTH_TOKENS = new Set([]);

/** @param {string} tokenId */
export function hubLayoutForToken(tokenId) {
  if (HUB_PHONE_WIDE_STACK_TOKENS.has(tokenId)) return 'phone-wide-stack';
  if (HUB_FULL_VIEWPORT_TOKENS.has(tokenId)) return 'full-viewport';
  if (HUB_HULL_WIDTH_TOKENS.has(tokenId)) return 'hull-width';
  return 'fit-stage';
}

export const STORAGE_PROFILE_KEY = 'dd-profile-override';

/** First open on desktop (no saved viewport) — authored 16:9 hull; stretch fills the window. */
export const DEFAULT_PROFILE_TOKEN = '16:9';

/** Hub header logo → Lobby (osbard.com). */
export const HUB_HOME_URL = 'https://osbard.com/';
export const HUB_LOBBY_LOGO_SRC = 'assets/img-ct/lobby-logo.webp';

/** Return true when logo click should confirm before leaving. Forks wire dirty state / app rules. */
export function hubHomeNeedsConfirm() {
  return true;
}

/** Leave prompt copy — override per app in forked dd-app-profile.mjs. */
export const HUB_HOME_LEAVE_DIALOG = {
  title: 'Go to osbard.com?',
  detail: 'You are leaving Color Time! and opening the Lobby.',
  hint: 'Save your work first if you have anything to keep.',
  okLabel: 'Go to osbard.com',
  cancelLabel: 'Stay here',
  focusCancel: true,
};
