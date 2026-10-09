/** Color Time! — q400 / clock paw. Glow (theme-huglo) uses contrast plate. */

/** Lobby Color Time! orb lockup — default paw. */
export const Q400_PAW_LOGO = 'assets/img-ct/logo-512-ct.png';

/** Glow / Contrast tray — outlined paw lockup. */
export const Q400_PAW_LOGO_CONTRAST = 'assets/img-ct/logo-512-ct-contrast.png';

export const Q400_PAW_CONTRAST_THEME = 'theme-huglo';

/**
 * @param {string} [themeClass]
 * @returns {string}
 */
export function hubLogoSrcForTheme(themeClass) {
  return q400PawLogoSrcForTheme(themeClass);
}

/**
 * @param {string} [themeClass]
 * @returns {string}
 */
export function q400PawLogoSrcForTheme(themeClass) {
  let active = themeClass;
  if (!active && document.body.classList.contains(Q400_PAW_CONTRAST_THEME)) {
    active = Q400_PAW_CONTRAST_THEME;
  }
  return active === Q400_PAW_CONTRAST_THEME ? Q400_PAW_LOGO_CONTRAST : Q400_PAW_LOGO;
}

/** Swap paw only for Glow; all other trays keep logo-512-ct.png. */
export function syncHubLogo(themeClass) {
  const next = q400PawLogoSrcForTheme(themeClass);
  for (const id of ['dd-paw-logo', 'ct-clock-paw-logo']) {
    const img = document.getElementById(id);
    if (!(img instanceof HTMLImageElement)) continue;
    if (img.getAttribute('src') !== next) img.src = next;
  }
}
