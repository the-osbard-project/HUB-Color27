/** Color Time! — browser tab title sync (Osbard's Color Time! - Untitled / file name). */

export const CT_DOC_TITLE_BASE = "Osbard's Color Time!";

/** @param {string | null | undefined} [fileName] */
export function syncCtDocumentTitle(fileName) {
  const label = fileName?.trim() || 'Untitled';
  document.title = `${CT_DOC_TITLE_BASE} - ${label}`;
}

export function initCtPageTitle() {
  syncCtDocumentTitle(null);

  window.addEventListener('ct-open', (e) => {
    syncCtDocumentTitle(e.detail?.fileName ?? null);
  });

  window.addEventListener('ct-save', (e) => {
    syncCtDocumentTitle(e.detail?.fileName ?? null);
  });
}
