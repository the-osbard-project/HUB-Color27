/** Color Time! — phone heads-up after welcome: desk layout is intentional. */

import { alertDdDialog } from './dd-dialog.mjs';
import { isPhoneClassDevice } from './profile-engine.mjs';

const NOTICE_SESSION_KEY = 'ct-phone-desk-notice-v1';

/**
 * Fullscreen notice for phone-class devices only (not tablets).
 * Call once welcome has finished (or was skipped this session).
 */
export async function maybeShowPhoneDeskNotice() {
  if (!isPhoneClassDevice()) return;
  try {
    if (sessionStorage.getItem(NOTICE_SESSION_KEY) === '1') return;
    sessionStorage.setItem(NOTICE_SESSION_KEY, '1');
  } catch {
    /* private mode — still show once this load */
  }

  await alertDdDialog({
    title: 'Color Time!',
    detail:
      'Color Time! is a web-based app, however, it is best viewed on tablets and computers.',
    okLabel: 'OK',
    overlayClass: 'ct-phone-desk-notice',
  });
}
