/** Color27 — q100 File popup + Canvas Settings (Square / Wide / Tall). */

import {
  attachCtArrtTogglePopup,
  closeCtArrtPopups,
} from './ct-q300-arrt-popup.mjs';
import {
  applyCtCanvasPreset,
  CT_CANVAS_PRESETS,
  getCtCanvasPreset,
} from './ct-canvas.mjs';
import {
  openCtProjectPicker,
  startNewCtProject,
} from './ct-project.mjs';
import { resetCtAppSettings } from './ct-tool-hud.mjs';

function syncPresetButtons(panel) {
  const current = getCtCanvasPreset();
  panel.querySelectorAll('[data-canvas-preset]').forEach((btn) => {
    if (!(btn instanceof HTMLElement)) return;
    btn.classList.toggle('is-active', btn.getAttribute('data-canvas-preset') === current);
  });
}

export function initCtQ100Popups() {
  const fileTrigger = document.getElementById('ct-btn-file');
  const filePanel = document.getElementById('ct-file-popup');

  attachCtArrtTogglePopup({
    panel: filePanel,
    trigger: fileTrigger,
    side: 'right',
    fixed: true,
  });

  document.getElementById('ct-file-new')?.addEventListener('click', () => {
    startNewCtProject();
    closeCtArrtPopups();
  });
  document.getElementById('ct-file-open')?.addEventListener('click', () => {
    closeCtArrtPopups();
    void openCtProjectPicker();
  });
  document.getElementById('ct-file-reset')?.addEventListener('click', () => {
    resetCtAppSettings();
    closeCtArrtPopups();
  });

  const resizeTrigger = document.getElementById('ct-btn-resize');
  const resizePanel = document.getElementById('ct-canvas-popup');

  attachCtArrtTogglePopup({
    panel: resizePanel,
    trigger: resizeTrigger,
    side: 'right',
    fixed: true,
    onOpen: () => {
      if (resizePanel instanceof HTMLElement) syncPresetButtons(resizePanel);
    },
  });

  resizePanel?.querySelectorAll('[data-canvas-preset]').forEach((btn) => {
    btn.addEventListener('click', () => {
      const token = btn.getAttribute('data-canvas-preset');
      if (!token || !CT_CANVAS_PRESETS.includes(/** @type {'square'|'wide'|'tall'} */ (token))) return;
      applyCtCanvasPreset(token);
      if (resizePanel instanceof HTMLElement) syncPresetButtons(resizePanel);
      closeCtArrtPopups();
    });
  });

  window.addEventListener('ct-canvas-size-changed', () => {
    if (!(resizePanel instanceof HTMLElement) || resizePanel.hidden) return;
    syncPresetButtons(resizePanel);
  });
}
