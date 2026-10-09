import { initProfileEngine } from './profile-engine.mjs';
import { initHubUtils, closeSettingsIfOpen, isGlobeTranslatorOpen, closeGlobeIfOpen, closeLegalIfOpen, toggleHubInfo } from './hub-utils.mjs';
import { initHubHomeLink } from './hub-home-link.mjs';
import { initCtQ400, closeToolPopup } from './ct-q400.mjs';
import { initCtOsbard } from './ct-osbard.mjs';
import { initCtHistoryListeners, clearCtHistory } from './ct-history.mjs';
import { initCtToolSelect } from './ct-tool-select.mjs';
import { initCtCanvas } from './ct-canvas.mjs';
import { initCtStageView, getCtStageView } from './ct-stage-view.mjs';
import { initCtStageDials } from './ct-stage-dials.mjs';
import { attachStageChrome, toggleCtStageFocus, syncCtRailsToggleUi } from './ct-stage-chrome.mjs';
import { initCtRecenterHint } from './ct-recenter-hint.mjs';
import { initCanvasColor } from './ct-canvas-color.mjs';
import { initCtLayerOpacity } from './ct-layer-opacity.mjs';
import { initCtPaintBar } from './ct-paint-bar.mjs';
import { initCtVSliders } from './ct-vsliders.mjs';
import { initCtPhoneFaders } from './ct-phone-faders.mjs';
import { initCtDraw, bindActiveLayerIndex } from './ct-draw.mjs';
import { getActiveLayerIndex } from './ct-layers.mjs';
import { initCtStageObjects } from './ct-stage-objects.mjs';
import { initCtOverclock } from './ct-overclock.mjs';
import { initCtQ300 } from './ct-q300.mjs';
import { initCtPageTitle } from './ct-page-title.mjs';
import { initCtProject } from './ct-project.mjs';
import { initCtQ100Popups } from './ct-q100-popups.mjs';
import { initCtTheater } from './ct-theater.mjs';
import { initColoringPacks } from './ct-coloring-packs.mjs';
import { initCtBackpack } from './ct-backpack.mjs';
import { initCtCbn } from './ct-cbn.mjs';
import { initCtHubClock, runCtHubRandomMix, isCtHubMixRunning } from './ct-hub-clock.mjs';
import { initCtHubTagline } from './ct-hub-tagline.mjs';
import { initCtWelcome } from './ct-welcome.mjs';
import { initCtShortcuts, toggleCtFullscreen, syncCtFullscreenBtn } from './ct-shortcuts.mjs';
import {
  armCtDialogA11y,
  disarmCtDialogA11y,
  focusCtDialogPanel,
  initCtHiddenPanels,
  isCtDialogA11yActive,
  restoreCtDialogFocus,
  syncCtPanelTabbing,
} from './ct-dialog-a11y.mjs';

/** q400 wings — Drydock scroll grammar; left hugs paw on side-rail tokens. */
function alignQ400WingsToPaw() {
  const viewport = document.getElementById('viewport-container');
  if (viewport?.classList.contains('dd-layout--phone-wide-stack')) {
    const q100 = document.getElementById('q100');
    const q300 = document.getElementById('q300');
    const leftWing = document.querySelector('.dd-layout--phone-wide-stack .dd-q400-wing--left');
    const rightWing = document.querySelector('.dd-layout--phone-wide-stack .dd-q400-wing--right');
    const pawWrap = document.querySelector('.dd-layout--phone-wide-stack .dd-paw-wrap');
    if (q100) q100.scrollLeft = 0;
    if (q300) q300.scrollLeft = 0;
    if (leftWing) leftWing.scrollLeft = 0;
    if (rightWing) rightWing.scrollLeft = 0;
    if (pawWrap) pawWrap.scrollLeft = 0;
    return;
  }
  if (viewport?.classList.contains('dd-layout--phone-stack')) {
    const rails = document.querySelector('.dd-stack-row--rails');
    const q400Inner = document.querySelector('.dd-layout--phone-stack .dd-q400-inner');
    const pawWrap = document.querySelector('.dd-layout--phone-stack .dd-paw-wrap');
    if (rails) rails.scrollLeft = 0;
    if (q400Inner) q400Inner.scrollLeft = 0;
    if (pawWrap) pawWrap.scrollLeft = 0;
    return;
  }

  const left = document.querySelector('.dd-q400-wing--left');
  const right = document.querySelector('.dd-q400-wing--right');
  if (left) left.scrollLeft = left.scrollWidth - left.clientWidth;
  if (right) right.scrollLeft = 0;
}

function scheduleAlignQ400WingsToPaw() {
  requestAnimationFrame(() => {
    requestAnimationFrame(alignQ400WingsToPaw);
  });
}

window.addEventListener('dd-profile-changed', scheduleAlignQ400WingsToPaw);

window.addEventListener('dd-close-hub', () => closeHub());

const hubShell = document.getElementById('oss-hpp');
const hubPanel = document.querySelector('.dd-hub-panel');
const hubBackdrop = document.querySelector('.dd-hub-backdrop');
const pawBtn = document.getElementById('dd-paw');
const hubClose = document.getElementById('dd-hub-close');
const hubPanelInner = document.querySelector('.dd-hub-panel__inner');

function closeHub() {
  if (!hubShell || !pawBtn) return;
  const wasOpen = hubShell.classList.contains('is-open');
  disarmCtDialogA11y();
  closeSettingsIfOpen();
  hubShell.classList.remove('is-open');
  pawBtn.classList.remove('dd-paw-btn--open');
  pawBtn.setAttribute('aria-expanded', 'false');
  syncCtPanelTabbing(hubShell, false);
  window.setTimeout(() => {
    if (!hubShell.classList.contains('is-open')) hubShell.hidden = true;
  }, 220);
  if (wasOpen) restoreCtDialogFocus(pawBtn);
}

function openHub() {
  if (!hubShell || !pawBtn) return;
  closeToolPopup();
  hubShell.hidden = false;
  syncCtPanelTabbing(hubShell, true);
  requestAnimationFrame(() => {
    hubShell.classList.add('is-open');
    pawBtn.classList.add('dd-paw-btn--open');
    pawBtn.setAttribute('aria-expanded', 'true');
    if (hubPanel instanceof HTMLElement) {
      armCtDialogA11y(hubPanel, closeHub);
      focusCtDialogPanel(hubPanel);
    }
    window.dispatchEvent(new Event('dd-hub-opened'));
  });
}

function toggleHub() {
  if (hubShell?.classList.contains('is-open')) closeHub();
  else openHub();
}

pawBtn?.addEventListener('click', (e) => {
  e.stopPropagation();
  toggleHub();
});

hubClose?.addEventListener('click', (e) => {
  e.stopPropagation();
  closeHub();
});

hubBackdrop?.addEventListener('click', closeHub);
hubPanel?.addEventListener('click', (e) => e.stopPropagation());

function isHubOverlayOpen() {
  const info = document.getElementById('ct-hub-info');
  const legal = document.getElementById('ct-hub-legal');
  return (info && !info.hidden) || (legal && !legal.hidden);
}

document.addEventListener('click', (e) => {
  const infoBtn = document.getElementById('dd-hub-info');
  const osbardPopup = document.getElementById('ct-osbard-popup');
  const starPopup = document.getElementById('ct-star-popup');
  const setPopup = document.getElementById('ct-set-popup');
  const castPopup = document.getElementById('ct-cast-popup');
  const propsPopup = document.getElementById('ct-props-popup');
  const inToolPopup = (osbardPopup && !osbardPopup.hidden && osbardPopup.contains(e.target))
    || (starPopup && !starPopup.hidden && starPopup.contains(e.target))
    || (setPopup && !setPopup.hidden && setPopup.contains(e.target))
    || (castPopup && !castPopup.hidden && castPopup.contains(e.target))
    || (propsPopup && !propsPopup.hidden && propsPopup.contains(e.target));
  const onToolTrigger = e.target.closest?.('#ct-btn-osbard, #ct-btn-star, #ct-btn-set');
  if (!inToolPopup && !onToolTrigger) closeToolPopup();

  if (isHubOverlayOpen() && hubPanelInner && !hubPanelInner.contains(e.target) && e.target !== infoBtn) {
    closeSettingsIfOpen();
  }
  if (isGlobeTranslatorOpen()) return;
  if (
    hubShell?.classList.contains('is-open')
    && !hubPanel?.contains(e.target)
    && !pawBtn?.contains(e.target)
    && !isHubOverlayOpen()
    && e.target !== infoBtn
    && !document.getElementById('dd-hub-globe')?.contains(e.target)
  ) {
    closeHub();
  }
});

/** @param {KeyboardEvent} e */
function shouldBlockHubShortcuts(e) {
  const t = e.target;
  if (t instanceof HTMLElement) {
    if (t.isContentEditable) return true;
    const tag = t.tagName;
    if (tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT') return true;
  }
  if (isGlobeTranslatorOpen()) return true;
  if (isHubOverlayOpen()) return true;
  const osbardPopup = document.getElementById('ct-osbard-popup');
  const starPopup = document.getElementById('ct-star-popup');
  if (osbardPopup && !osbardPopup.hidden) return true;
  if (starPopup && !starPopup.hidden) return true;
  const saveAs = document.getElementById('ct-save-as-popup');
  if (saveAs && !saveAs.hidden) return true;
  return false;
}

function isHubOpen() {
  return !!hubShell?.classList.contains('is-open');
}

window.addEventListener('ct-shortcut-settings', () => {
  if (!isHubOpen()) openHub();
  toggleHubInfo();
});

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') {
    if (isCtDialogA11yActive()) return;
    if (isGlobeTranslatorOpen()) {
      closeGlobeIfOpen();
      return;
    }
    closeLegalIfOpen();
    closeToolPopup();
    closeSettingsIfOpen();
    if (isHubOpen()) closeHub();
    return;
  }

  if (e.key !== ' ' && e.code !== 'Space') return;
  if (shouldBlockHubShortcuts(e)) return;
  if (isCtHubMixRunning()) return;

  if (isHubOpen()) {
    e.preventDefault();
    runCtHubRandomMix();
    return;
  }

  e.preventDefault();
  openHub();
  runCtHubRandomMix();
});

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  });
}

initProfileEngine();
initCtShortcuts();
initHubUtils();
initHubHomeLink();
initCtQ400();
initCtCanvas();
initCtStageView();
initCtStageDials();
attachStageChrome({
  onLayoutSync: () => {
    getCtStageView()?.scheduleLayout({ force: true });
  },
});
initCtRecenterHint();
initCtPaintBar();
initCtToolSelect();
initCanvasColor();
initCtVSliders();
initCtLayerOpacity();
initCtDraw();
initCtStageObjects();
initCtOverclock();
initCtPhoneFaders();
initCtHistoryListeners();
document.getElementById('ct-btn-peeka')?.addEventListener('click', () => {
  toggleCtStageFocus();
  syncCtRailsToggleUi();
});
document.getElementById('ct-btn-fullscreen')?.addEventListener('click', () => {
  void toggleCtFullscreen().then(() => syncCtFullscreenBtn());
});
syncCtFullscreenBtn();
initCtOsbard();
initCtQ300();
bindActiveLayerIndex(getActiveLayerIndex);
initCtProject();
initCtQ100Popups();
initCtPageTitle();
initCtTheater();
initCtWelcome();
initCtCbn();
initCtBackpack().then(() => initColoringPacks()).catch(() => initColoringPacks());
initCtHubClock();
initCtHubTagline();
initCtHiddenPanels();
