/**
 * OSS universal Hub footer — outbound social channels (Lobby MSOT).
 * @see HUB-Lobby26/packages/ui/hpp-social-links.mjs
 *
 * `label` = hovertip + aria (simple). Keep array order (do not alpha-sort).
 */

export const HUB_SOCIAL_ICON_CDN = 'https://cdn.simpleicons.org';
export const HUB_SOCIAL_ICON_COLOR = 'f5f5f5';

/** Local OSS icons — 32px box / 26px glyph (not Simple Icons CDN). */
export const HUB_SOCIAL_LOCAL_ICONS = Object.freeze({
  chronicles: 'assets/img/scoopy.svg',
  facebook: 'assets/img/facebook.svg',
  instagram: 'assets/img/instagram.svg',
  substack: 'assets/img/substack.svg',
});

/** @param {string} slug Simple Icons slug or local key */
export function hubSocialIconUrl(slug, color = HUB_SOCIAL_ICON_COLOR) {
  const local = HUB_SOCIAL_LOCAL_ICONS[slug];
  if (local) return local;
  return `${HUB_SOCIAL_ICON_CDN}/${slug}/${color}`;
}

/** @param {string} slug */
export function hubSocialIconIsLocal(slug) {
  return Boolean(HUB_SOCIAL_LOCAL_ICONS[slug]);
}

/** @type {readonly { id: string, label: string, href: string, socialIcon: string }[]} */
export const HUB_SOCIAL_CHANNELS = Object.freeze([
  {
    id: 'social-chronicles',
    label: 'Scoopy',
    href: 'https://scoopy.osbard.com/',
    socialIcon: 'chronicles',
  },
  {
    id: 'social-facebook',
    label: 'Facebook',
    href: 'https://www.facebook.com/OsbardStudio/',
    socialIcon: 'facebook',
  },
  {
    id: 'social-instagram',
    label: 'Instagram',
    href: 'https://www.instagram.com/osbardstudio/',
    socialIcon: 'instagram',
  },
  {
    id: 'social-substack',
    label: 'Substack',
    href: 'https://osbard.substack.com',
    socialIcon: 'substack',
  },
]);
