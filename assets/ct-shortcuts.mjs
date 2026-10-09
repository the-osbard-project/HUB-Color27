/** Color Time! — keyboard shortcuts (letter keys · chords · fullscreen). */

import { cycleHubTheme, isGlobeTranslatorOpen } from './hub-utils.mjs';
import { isCtDialogA11yActive } from './ct-dialog-a11y.mjs';
import {
  isCtOverclockGridEnabled,
  isCtOverclockSnapEnabled,
  isCtSelectBoundingBoxEnabled,
  setCtOverclockGridEnabled,
  setCtOverclockSnapEnabled,
  setCtSelectBoundingBoxEnabled,
} from './ct-overclock.mjs';
import { isCtOverclockWandActive, setCtOverclockWandActive } from './ct-overclock-wand.mjs';
import { openCtProjectPicker, startNewCtProject } from './ct-project.mjs';
import { selectCtDrawTool } from './ct-tool-select.mjs';
import { selectCtStarBrushFx } from './ct-q400.mjs';
import { cycleCtTrayWell, setActivePaintTarget } from './ct-paint-bar.mjs';
import { hasFloatingSelection, copySelectedFloating, pasteFloatingClipboard, hasFloatingClipboard } from './ct-stage-objects.mjs';

/** @param {KeyboardEvent} e */
function isTypingTarget(e) {
  const t = e.target;
  if (!(t instanceof HTMLElement)) return false;
  if (t.isContentEditable) return true;
  const tag = t.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT';
}

/** @param {KeyboardEvent} e */
function isSliderFocused(e) {
  const t = e.target;
  return t instanceof HTMLInputElement && t.type === 'range' && t.classList.contains('ct-vslider__input');
}

/** @param {KeyboardEvent} e */
export function shouldBlockCtLetterShortcuts(e) {
  if (isTypingTarget(e)) return true;
  if (isGlobeTranslatorOpen()) return true;
  if (isCtDialogA11yActive()) return true;
  const info = document.getElementById('ct-hub-info');
  const legal = document.getElementById('ct-hub-legal');
  if ((info && !info.hidden) || (legal && !legal.hidden)) return true;
  const saveAs = document.getElementById('ct-save-as-popup');
  if (saveAs && !saveAs.hidden) return true;
  return false;
}

/** @param {KeyboardEvent} e */
function shouldBlockCtChords(e) {
  if (isTypingTarget(e)) return true;
  return false;
}

/** @type {Record<string, string>} */
const DRAW_TOOL_KEYS = {
  KeyF: 'bucket',
  KeyN: 'pencil',
  KeyC: 'crayon',
  KeyL: 'pastel',
  KeyM: 'marker',
  KeyE: 'eraser',
};

/** @type {Record<string, string>} */
const STAR_FX_KEYS = {
  KeyB: 'brushy',
  KeyP: 'inky',
};

function isBrowserFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

export function isCtBrowserFullscreen() {
  return isBrowserFullscreen();
}

export function syncCtFullscreenBtn() {
  const btn = document.getElementById('ct-btn-fullscreen');
  if (!(btn instanceof HTMLElement)) return;
  const on = isBrowserFullscreen();
  btn.setAttribute('aria-pressed', on ? 'true' : 'false');
  btn.classList.toggle('dd-q400-tool--active', on);
  btn.title = on ? 'Exit fullscreen (Ctrl+Shift+F)' : 'Fullscreen (Ctrl+Shift+F)';
  btn.setAttribute('aria-label', btn.title);
  const icon = btn.querySelector('i');
  if (icon instanceof HTMLElement) {
    icon.classList.toggle('ph-corners-out', !on);
    icon.classList.toggle('ph-corners-in', on);
  }
}

/** Toggle browser Full Screen API (Krita Ctrl+Shift+F). */
export async function toggleCtFullscreen() {
  try {
    const root = document.documentElement;
    if (!isBrowserFullscreen()) {
      const req = root.requestFullscreen || root.webkitRequestFullscreen;
      if (req) await req.call(root);
    } else {
      const exit = document.exitFullscreen || document.webkitExitFullscreen;
      if (exit) await exit.call(document);
    }
  } catch {
    /* Full Screen not available in this context */
  }
  syncCtFullscreenBtn();
}

function toggleCtSelectMode() {
  const next = !isCtSelectBoundingBoxEnabled();
  setCtSelectBoundingBoxEnabled(next);
  if (next && isCtOverclockWandActive()) setCtOverclockWandActive(false);
}

function toggleCtWandMode() {
  const next = !isCtOverclockWandActive();
  setCtOverclockWandActive(next);
  if (next && isCtSelectBoundingBoxEnabled()) setCtSelectBoundingBoxEnabled(false);
}

function selectDrawToolByKey(code) {
  const toolKey = DRAW_TOOL_KEYS[code];
  if (toolKey) {
    selectCtDrawTool(toolKey);
    return true;
  }
  const fx = STAR_FX_KEYS[code];
  if (fx) {
    selectCtDrawTool('star');
    selectCtStarBrushFx(fx);
    return true;
  }
  return false;
}

export function initCtShortcuts() {
  document.addEventListener('fullscreenchange', syncCtFullscreenBtn);
  document.addEventListener('webkitfullscreenchange', syncCtFullscreenBtn);
  syncCtFullscreenBtn();
  document.addEventListener('keydown', (e) => {
    if (e.repeat) return;

    if (e.ctrlKey || e.metaKey) {
      if (e.altKey || shouldBlockCtChords(e)) return;
      const key = e.key.toLowerCase();

      /* Krita-aligned: Ctrl+Shift+F fullscreen · Ctrl+Shift+; snap · Ctrl+Shift+' grid */
      if (e.shiftKey && (e.code === 'KeyF' || key === 'f')) {
        e.preventDefault();
        void toggleCtFullscreen();
        return;
      }
      if (e.shiftKey && (e.code === 'Semicolon' || key === ';' || key === ':')) {
        e.preventDefault();
        setCtOverclockSnapEnabled(!isCtOverclockSnapEnabled());
        return;
      }
      if (e.shiftKey && (e.code === 'Quote' || key === "'" || key === '"')) {
        e.preventDefault();
        setCtOverclockGridEnabled(!isCtOverclockGridEnabled());
        return;
      }

      if (key === 'c') {
        if (!hasFloatingSelection()) return;
        if (copySelectedFloating()) e.preventDefault();
        return;
      }
      if (key === 'v') {
        if (!hasFloatingClipboard()) return;
        if (pasteFloatingClipboard()) e.preventDefault();
        return;
      }
      if (key === 'n') {
        e.preventDefault();
        startNewCtProject();
        return;
      }
      if (key === 'o') {
        e.preventDefault();
        void openCtProjectPicker();
        return;
      }
      if (key === ',') {
        e.preventDefault();
        window.dispatchEvent(new Event('ct-shortcut-settings'));
      }
      return;
    }

    if (e.altKey) return;

    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      if (hasFloatingSelection()) return;
      if (shouldBlockCtLetterShortcuts(e) || isSliderFocused(e)) return;
      e.preventDefault();
      cycleCtTrayWell(e.key === 'ArrowRight' ? 1 : -1);
      return;
    }

    if (shouldBlockCtLetterShortcuts(e)) return;

    if (selectDrawToolByKey(e.code)) {
      e.preventDefault();
      return;
    }

    if (e.code === 'KeyT') {
      e.preventDefault();
      cycleHubTheme();
      return;
    }

    if (e.code === 'KeyV') {
      e.preventDefault();
      toggleCtSelectMode();
      return;
    }

    if (e.code === 'KeyW') {
      e.preventDefault();
      toggleCtWandMode();
      return;
    }

    if (e.key === '/' || e.code === 'Slash') {
      e.preventDefault();
      setActivePaintTarget('line');
      return;
    }

    if (e.key === "'" || e.code === 'Quote') {
      e.preventDefault();
      setActivePaintTarget('fill');
      return;
    }
  });
}
