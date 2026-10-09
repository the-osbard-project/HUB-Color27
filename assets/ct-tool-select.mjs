/**
 * Color Time! — q400 active tool selection (toolbar glow + canvas cursor hook).
 * Custom cursors apply on desktop fine pointer only (see ct-tool-cursor.css).
 */

import { applyCtToolPreset, captureCtToolSpecs } from './ct-tool-hud.mjs';
import { isCtOverclockWandActive, setCtOverclockWandActive } from './ct-overclock-wand.mjs';

/** @type {readonly string[]} */
export const CT_DRAW_TOOL_IDS = Object.freeze([
  'ct-btn-osbard',
  'ct-btn-eraser',
  'ct-btn-bucket',
  'ct-btn-pencil',
  'ct-btn-crayon',
  'ct-btn-pastel',
  'ct-btn-marker',
  'ct-btn-star',
]);

const DEFAULT_TOOL_ID = 'ct-btn-pencil';

/** @param {string} btnId */
function toolKeyFromBtnId(btnId) {
  return btnId.replace(/^ct-btn-/, '');
}

/** @returns {string} */
export function getActiveCtToolKey() {
  const active = document.querySelector('.dd-q400-tool--active');
  if (active instanceof HTMLElement && active.id) {
    return toolKeyFromBtnId(active.id);
  }
  return toolKeyFromBtnId(DEFAULT_TOOL_ID);
}

/** @param {string} btnId */
function syncToolAriaPressed(activeBtnId) {
  CT_DRAW_TOOL_IDS.forEach((id) => {
    const btn = document.getElementById(id);
    if (btn instanceof HTMLButtonElement) {
      btn.setAttribute('aria-pressed', id === activeBtnId ? 'true' : 'false');
    }
  });
}

/** @param {string} btnId */
function setActiveTool(btnId) {
  const nextKey = toolKeyFromBtnId(btnId);
  const prevKey = getActiveCtToolKey();
  if (prevKey && prevKey !== nextKey) {
    captureCtToolSpecs(prevKey);
  }

  document.querySelectorAll('.dd-q400-tool--active').forEach((el) => {
    el.classList.remove('dd-q400-tool--active');
  });
  document.getElementById(btnId)?.classList.add('dd-q400-tool--active');

  const canvas = document.getElementById('dd-stage-scroll');
  if (canvas instanceof HTMLElement) {
    canvas.dataset.ctTool = nextKey;
  }

  syncToolAriaPressed(btnId);
  applyCtToolPreset(nextKey);
}

/** @param {string} toolKey e.g. pencil, bucket, star */
export function selectCtDrawTool(toolKey) {
  const id = `ct-btn-${toolKey}`;
  if (!CT_DRAW_TOOL_IDS.includes(id)) return false;
  if (isCtOverclockWandActive()) setCtOverclockWandActive(false);
  setActiveTool(id);
  return true;
}

export function initCtToolSelect() {
  const canvas = document.getElementById('dd-stage-scroll');
  if (!(canvas instanceof HTMLElement)) return;

  CT_DRAW_TOOL_IDS.forEach((id) => {
    const btn = document.getElementById(id);
    if (!(btn instanceof HTMLButtonElement)) return;
    btn.addEventListener('click', () => {
      setActiveTool(id);
    });
  });

  setActiveTool(DEFAULT_TOOL_ID);
}

