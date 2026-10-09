let dialogSerial = 0;

/**
 * @param {{
 *   title: string,
 *   detail?: string,
 *   hint?: string,
 *   okLabel?: string,
 *   cancelLabel?: string | false,
 *   focusCancel?: boolean,
 *   overlayClass?: string,
 * }} opts
 * @returns {Promise<boolean>}
 */
function mountDdDialog(opts) {
  return new Promise((resolve) => {
    const titleId = `dd-dialog-title-${++dialogSerial}`;
    const overlay = document.createElement('div');
    overlay.className = opts.overlayClass
      ? `dd-dialog ${opts.overlayClass}`
      : 'dd-dialog';
    overlay.setAttribute('role', 'dialog');
    overlay.setAttribute('aria-modal', 'true');
    overlay.setAttribute('aria-labelledby', titleId);

    const panel = document.createElement('div');
    panel.className = 'dd-dialog__panel';

    const titleEl = document.createElement('p');
    titleEl.id = titleId;
    titleEl.className = 'dd-dialog__title';
    titleEl.textContent = opts.title;

    const parts = [titleEl];

    if (opts.detail) {
      const detail = document.createElement('p');
      detail.className = 'dd-dialog__detail';
      detail.textContent = opts.detail;
      parts.push(detail);
    }

    if (opts.hint) {
      const hint = document.createElement('p');
      hint.className = 'dd-dialog__hint';
      hint.textContent = opts.hint;
      parts.push(hint);
    }

    const actions = document.createElement('div');
    actions.className = 'dd-dialog__actions';
    const showCancel = opts.cancelLabel !== false;

    function close(result) {
      overlay.remove();
      document.removeEventListener('keydown', onKeyDown);
      resolve(result);
    }

    function onKeyDown(e) {
      if (e.key === 'Escape') {
        e.preventDefault();
        close(false);
      }
    }

    const okBtn = document.createElement('button');
    okBtn.type = 'button';
    okBtn.className = 'dd-dialog__btn dd-dialog__btn--primary';
    okBtn.textContent = opts.okLabel ?? 'OK';
    okBtn.addEventListener('click', () => close(true));
    actions.appendChild(okBtn);

    /** @type {HTMLButtonElement | null} */
    let cancelBtn = null;
    if (showCancel) {
      cancelBtn = document.createElement('button');
      cancelBtn.type = 'button';
      cancelBtn.className = 'dd-dialog__btn dd-dialog__btn--ghost';
      cancelBtn.textContent = opts.cancelLabel || 'Cancel';
      cancelBtn.addEventListener('click', () => close(false));
      actions.appendChild(cancelBtn);
    }

    parts.push(actions);
    panel.append(...parts);
    overlay.appendChild(panel);
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) close(false);
    });
    document.addEventListener('keydown', onKeyDown);
    document.body.appendChild(overlay);
    const preferCancel = showCancel && opts.focusCancel !== false;
    (preferCancel && cancelBtn ? cancelBtn : okBtn).focus();
  });
}

/**
 * Centered confirm — Drydock shell chrome; forks reuse for Hub leave prompts.
 * @param {{
 *   title: string,
 *   detail?: string,
 *   hint?: string,
 *   okLabel?: string,
 *   cancelLabel?: string,
 *   focusCancel?: boolean,
 *   overlayClass?: string,
 * }} opts
 * @returns {Promise<boolean>}
 */
export function confirmDdDialog(opts) {
  return mountDdDialog(opts);
}

/**
 * OK-only notice (same shell chrome as confirm).
 * @param {{
 *   title: string,
 *   detail?: string,
 *   hint?: string,
 *   okLabel?: string,
 *   overlayClass?: string,
 * }} opts
 * @returns {Promise<void>}
 */
export function alertDdDialog(opts) {
  return mountDdDialog({ ...opts, cancelLabel: false, focusCancel: false }).then(() => undefined);
}
