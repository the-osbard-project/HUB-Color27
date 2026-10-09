/** Color Time! CT HUB — Privacy & Web Safety overlay (Lobby legal modules). */

import { buildHppLegalTwoColHtml } from './hpp-legal-content.mjs';
import {
  armCtDialogA11y,
  disarmCtDialogA11y,
  focusCtDialogPanel,
} from './ct-dialog-a11y.mjs';

/**
 * @param {{
 *   root?: HTMLElement | null,
 *   bodyEl?: HTMLElement | null,
 *   closeBtn?: HTMLElement | null,
 *   onClose?: () => void,
 * }} [els]
 */
export function attachCtHubLegal(els = {}) {
  const root = els.root ?? document.getElementById('ct-hub-legal');
  const bodyEl = els.bodyEl ?? document.getElementById('ct-hub-legal-body');
  const closeBtn = els.closeBtn ?? document.getElementById('ct-hub-legal-close');
  const panel = root?.querySelector('.ct-hub-legal__panel');
  const onCloseExtra = els.onClose ?? (() => {});

  let contentReady = false;
  let openFlag = false;

  function ensureContent() {
    if (!bodyEl || contentReady) return;
    bodyEl.innerHTML = buildHppLegalTwoColHtml();
    wireToc(bodyEl);
    contentReady = true;
  }

  /** @param {HTMLElement} container */
  function wireToc(container) {
    const docCol = container.querySelector('.hpp-legal-doc');
    if (!(docCol instanceof HTMLElement)) return;
    container.querySelectorAll('.hpp-legal-toc a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href');
        const id = href?.startsWith('#') ? href.slice(1) : '';
        if (!id) return;
        const section = container.querySelector(`#${CSS.escape(id)}`);
        if (!(section instanceof HTMLElement)) return;
        e.preventDefault();
        const docTop = docCol.getBoundingClientRect().top;
        const secTop = section.getBoundingClientRect().top;
        docCol.scrollTop += secTop - docTop - 8;
      });
    });
  }

  function close() {
    if (!root) return;
    openFlag = false;
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    document.querySelector('.dd-hub-panel__inner')?.classList.remove('dd-hub-panel__inner--overlay');
    disarmCtDialogA11y();
    onCloseExtra();
  }

  function open() {
    if (!root) return;
    ensureContent();
    openFlag = true;
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
    document.querySelector('.dd-hub-panel__inner')?.classList.add('dd-hub-panel__inner--overlay');
    if (panel instanceof HTMLElement) {
      armCtDialogA11y(panel, close);
      focusCtDialogPanel(panel);
    }
  }

  closeBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    close();
  });

  return {
    open,
    close,
    isOpen: () => openFlag,
  };
}
