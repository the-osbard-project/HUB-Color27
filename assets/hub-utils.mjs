import { mountHubFooterSocial } from './hub-footer-social.mjs';
import { attachGlobeTranslator } from './globe-translator.mjs';
import { initCtSettingsGlossary } from './ct-settings-glossary.mjs';
import { initCtSettingsShortcuts } from './ct-settings-shortcuts.mjs';
import { initCtShortcutHints } from './ct-shortcut-hints.mjs';
import { attachCtHubLegal } from './ct-hub-legal.mjs';
import { attachCtHubInfo } from './ct-hub-info.mjs';
import { syncHubLogo } from './hub-logo.mjs';
import {
  armCtDialogA11y,
  disarmCtDialogA11y,
  focusCtDialogPanel,
} from './ct-dialog-a11y.mjs';
import {
  HUB_THEME_CLASSES,
  HUB_THEME_DEFAULT,
  HUB_THEME_LABELS,
  HUB_THEME_META_COLORS,
  HUB_THEME_STORAGE_KEY,
  HUB_CONTRAST_STORAGE_KEY,
} from './dd-app-profile.mjs';

const contrastBtn = document.getElementById('dd-hub-contrast');
const globeBtn = document.getElementById('dd-hub-globe');
const infoBtn = document.getElementById('dd-hub-info');
const privacyBtn = document.getElementById('dd-hub-privacy');
const copyrightEl = document.getElementById('dd-hub-copyright');
const hubPanelInner = document.querySelector('.dd-hub-panel__inner');
const toast = document.getElementById('dd-toast');

let toastTimer = 0;
/** @type {ReturnType<typeof attachGlobeTranslator> | null} */
let globeApi = null;
/** @type {ReturnType<typeof attachCtHubLegal> | null} */
let legalApi = null;
/** @type {ReturnType<typeof attachCtHubInfo> | null} */
let infoApi = null;

function hubCopyrightLine(year = new Date().getFullYear()) {
  return `© ${year} Osbard`;
}

function showToast(msg) {
  if (!toast) return;
  toast.textContent = msg;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 2200);
}

function readStoredThemeClass() {
  try {
    const saved = localStorage.getItem(HUB_THEME_STORAGE_KEY);
    if (saved && HUB_THEME_CLASSES.includes(saved)) return saved;
    if (saved === 'theme-graphite' || saved === 'theme-reader-glow') return 'theme-huglo';
    if (localStorage.getItem(HUB_CONTRAST_STORAGE_KEY) === '1') return 'theme-huglo';
  } catch {
    /* private mode */
  }
  return HUB_THEME_DEFAULT;
}

function writeStoredThemeClass(className) {
  try {
    localStorage.setItem(HUB_THEME_STORAGE_KEY, className);
    localStorage.removeItem(HUB_CONTRAST_STORAGE_KEY);
  } catch {
    /* private mode */
  }
}

function syncThemeMeta(className) {
  const color = HUB_THEME_META_COLORS[className];
  if (!color) return;
  let meta = document.querySelector('meta[name="theme-color"]');
  if (!meta) {
    meta = document.createElement('meta');
    meta.setAttribute('name', 'theme-color');
    document.head.appendChild(meta);
  }
  meta.setAttribute('content', color);
}

/** @param {string} className */
function applyThemeClass(className) {
  const next = HUB_THEME_CLASSES.includes(className) ? className : HUB_THEME_DEFAULT;
  document.body.classList.remove(
    ...HUB_THEME_CLASSES,
    'theme-osbard-purple',
    'theme-osbard-studio',
    'theme-slate',
    'theme-marmalade',
    'theme-graphite',
    'theme-reader-glow',
    'theme-chronicles',
    'theme-studio-red',
    'theme-color-time',
    'theme-marker-blue',
  );
  document.body.classList.add(next);
  contrastBtn?.setAttribute('aria-pressed', next !== HUB_THEME_DEFAULT ? 'true' : 'false');
  syncThemeMeta(next);
  syncHubLogo(next);
}

function cycleTheme() {
  const current = readStoredThemeClass();
  const idx = HUB_THEME_CLASSES.indexOf(current);
  const next = HUB_THEME_CLASSES[(idx + 1) % HUB_THEME_CLASSES.length];
  applyThemeClass(next);
  writeStoredThemeClass(next);
  showToast(HUB_THEME_LABELS[next] ?? next);
}

function rearmHubDialogIfOpen() {
  const hubShell = document.getElementById('oss-hpp');
  const hubPanel = document.querySelector('.dd-hub-panel');
  if (hubShell?.classList.contains('is-open') && hubPanel instanceof HTMLElement) {
    armCtDialogA11y(hubPanel, () => {
      window.dispatchEvent(new Event('dd-close-hub'));
    });
  }
}

export function closeLegalIfOpen() {
  legalApi?.close();
}

export function closeInfoIfOpen() {
  infoApi?.close();
}

function openInfo() {
  closeGlobeIfOpen();
  closeLegalIfOpen();
  infoApi?.open();
}

function closeInfo() {
  infoApi?.close();
}

function toggleInfo() {
  if (infoApi?.isOpen()) closeInfo();
  else openInfo();
}

function openLegal() {
  closeGlobeIfOpen();
  closeInfoIfOpen();
  legalApi?.open();
}

export function isGlobeTranslatorOpen() {
  const overlay = document.getElementById('oss-globe-translator-overlay');
  return overlay instanceof HTMLElement && overlay.getAttribute('data-open') === 'true';
}

export function closeGlobeIfOpen() {
  globeApi?.close?.();
}

export function cycleHubTheme() {
  cycleTheme();
}

export function toggleHubInfo() {
  toggleInfo();
}

export function initHubUtils() {
  if (copyrightEl) copyrightEl.textContent = hubCopyrightLine();
  mountHubFooterSocial();

  legalApi = attachCtHubLegal();
  infoApi = attachCtHubInfo();

  const theme = readStoredThemeClass();
  applyThemeClass(theme);
  writeStoredThemeClass(theme);

  contrastBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    cycleTheme();
  });

  globeApi = attachGlobeTranslator({
    anchorIds: ['dd-hub-globe'],
    flagAssetPath: './assets/flags/',
  });

  infoBtn?.addEventListener('click', (e) => {
    e.stopPropagation();
    toggleInfo();
  });

  privacyBtn?.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    openLegal();
  });

  initCtSettingsGlossary();
  initCtSettingsShortcuts();
  initCtShortcutHints();
}

export function closeSettingsIfOpen() {
  closeInfoIfOpen();
  closeLegalIfOpen();
}
