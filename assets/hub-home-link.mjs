import { confirmDdDialog } from './dd-dialog.mjs';
import {
  HUB_HOME_URL,
  hubHomeNeedsConfirm,
  HUB_HOME_LEAVE_DIALOG,
} from './dd-app-profile.mjs';

/** @returns {Promise<void>} */
export async function confirmAndGoHubHome() {
  if (!hubHomeNeedsConfirm()) {
    window.location.assign(HUB_HOME_URL);
    return;
  }
  const ok = await confirmDdDialog(HUB_HOME_LEAVE_DIALOG);
  if (ok) window.location.assign(HUB_HOME_URL);
}

/**
 * @param {Event} e
 * @param {HTMLAnchorElement | HTMLButtonElement} el
 */
function shouldInterceptNavigation(e, el) {
  if (e.defaultPrevented) return false;
  if (el instanceof HTMLAnchorElement) {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return false;
  }
  return hubHomeNeedsConfirm();
}

/**
 * @param {HTMLElement | null} el
 */
function bindHubHomeTrigger(el) {
  if (!(el instanceof HTMLAnchorElement || el instanceof HTMLButtonElement)) return;

  el.addEventListener('click', async (e) => {
    if (!shouldInterceptNavigation(e, el)) return;
    e.preventDefault();
    e.stopPropagation();
    await confirmAndGoHubHome();
  });
}

/**
 * App HUB — top-left Osbard mark → Lobby (confirm first when dirty).
 * Forks override confirm copy + dirty check in dd-app-profile.mjs.
 */
export function initHubHomeLink() {
  bindHubHomeTrigger(document.getElementById('dd-hub-home'));
}
