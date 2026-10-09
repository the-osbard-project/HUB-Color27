/** Color Time! CT HUB — Info overlay (shortcuts · hull · tool guide). */

import {
  armCtDialogA11y,
  disarmCtDialogA11y,
  focusCtDialogPanel,
} from './ct-dialog-a11y.mjs';

/**
 * @param {{
 *   root?: HTMLElement | null,
 *   closeBtn?: HTMLElement | null,
 *   onClose?: () => void,
 * }} [els]
 */
export function attachCtHubInfo(els = {}) {
  const root = els.root ?? document.getElementById('ct-hub-info');
  const bodyEl = document.getElementById('ct-hub-info-body');
  const closeBtn = els.closeBtn ?? document.getElementById('ct-hub-info-close');
  const panel = root?.querySelector('.ct-hub-info__panel');
  const onCloseExtra = els.onClose ?? (() => {});

  let openFlag = false;

  function wireToc() {
    if (!bodyEl) return;
    const docCol = bodyEl.querySelector('.ct-hub-info-doc');
    if (!(docCol instanceof HTMLElement)) return;
    bodyEl.querySelectorAll('.ct-hub-info-toc a[href^="#"]').forEach((a) => {
      a.addEventListener('click', (e) => {
        const href = a.getAttribute('href');
        const id = href?.startsWith('#') ? href.slice(1) : '';
        if (!id) return;
        const section = bodyEl.querySelector(`#${CSS.escape(id)}`);
        if (!(section instanceof HTMLElement)) return;
        e.preventDefault();
        const docTop = docCol.getBoundingClientRect().top;
        const secTop = section.getBoundingClientRect().top;
        docCol.scrollTop += secTop - docTop - 8;
      });
    });
  }

  wireToc();

  function close() {
    if (!root) return;
    openFlag = false;
    root.hidden = true;
    root.setAttribute('aria-hidden', 'true');
    document.querySelector('.dd-hub-panel__inner')?.classList.remove('dd-hub-panel__inner--overlay');
    document.getElementById('dd-hub-info')?.setAttribute('aria-pressed', 'false');
    disarmCtDialogA11y();
    onCloseExtra();
  }

  function open() {
    if (!root) return;
    openFlag = true;
    root.hidden = false;
    root.setAttribute('aria-hidden', 'false');
    document.querySelector('.dd-hub-panel__inner')?.classList.add('dd-hub-panel__inner--overlay');
    document.getElementById('dd-hub-info')?.setAttribute('aria-pressed', 'true');
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
