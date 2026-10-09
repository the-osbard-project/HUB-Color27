/** Color Time! — browser tab stays "Color Time Machine!"; file name lives in the gutter. */

export const CT_DOC_TITLE_BASE = 'Color Time Machine!';

/** @param {string | null | undefined} [_fileName] */
export function syncCtDocumentTitle(_fileName) {
  document.title = CT_DOC_TITLE_BASE;
}

export function initCtPageTitle() {
  syncCtDocumentTitle(null);

  window.addEventListener('ct-open', () => {
    syncCtDocumentTitle(null);
  });

  window.addEventListener('ct-save', () => {
    syncCtDocumentTitle(null);
  });
}
