import {
  HUB_SOCIAL_CHANNELS,
  hubSocialIconIsLocal,
  hubSocialIconUrl,
} from './hub-social-links.mjs';

/** Mount Chronicles / Facebook / Instagram / Substack in `#dd-hub-social`. */
export function mountHubFooterSocial(rootId = 'dd-hub-social') {
  const root = document.getElementById(rootId);
  if (!(root instanceof HTMLElement)) return;

  root.replaceChildren();
  for (const channel of HUB_SOCIAL_CHANNELS) {
    const link = document.createElement('a');
    link.className = 'dd-hub-foot__social-link';
    link.href = channel.href;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.title = channel.label;
    link.setAttribute('aria-label', channel.label);

    const img = document.createElement('img');
    img.className = 'dd-hub-foot__social-icon';
    if (hubSocialIconIsLocal(channel.socialIcon)) {
      img.classList.add('dd-hub-foot__social-icon--local');
    }
    img.alt = '';
    img.decoding = 'async';
    img.draggable = false;
    img.src = hubSocialIconUrl(channel.socialIcon);

    link.appendChild(img);
    root.appendChild(link);
  }
}
