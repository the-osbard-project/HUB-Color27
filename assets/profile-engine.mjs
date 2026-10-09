import {
  ALLOWED_TOKENS,
  DEFAULT_PROFILE_TOKEN,
  ORIENTATION_LOCK,
  PHONE_LANDSCAPE_TOKENS,
  PHONE_PORTRAIT_TOKENS,
  PHONE_STACK_ROWS,
  Q400_ICON_FRAC,
  PHONE_RAIL_ICON_FRAC,
  DESK_RAIL_W,
  STORAGE_PROFILE_KEY,
  hubLayoutForToken,
} from './dd-app-profile.mjs';

/** @typedef {{ id: string, ratio: number, orient: 'landscape' | 'portrait', label: string }} ViewportToken */

/** @type {readonly ViewportToken[]} */
export const VIEWPORT_TOKENS = [
  { id: '4:3', ratio: 4 / 3, orient: 'landscape', label: '4:3 · iPad landscape' },
  { id: '3:4', ratio: 3 / 4, orient: 'portrait', label: '3:4 · iPad portrait' },
  { id: '16:10', ratio: 16 / 10, orient: 'landscape', label: '16:10 · laptop' },
  { id: '10:16', ratio: 10 / 16, orient: 'portrait', label: '10:16 · tall tablet' },
  { id: '16:9', ratio: 16 / 9, orient: 'landscape', label: '16:9 · desktop' },
  { id: '9:16', ratio: 9 / 16, orient: 'portrait', label: '9:16 · phone class' },
  { id: '19.5:9', ratio: 19.5 / 9, orient: 'landscape', label: '19.5:9 · iPhone wide' },
  { id: '9:19.5', ratio: 9 / 19.5, orient: 'portrait', label: '9:19.5 · iPhone' },
  { id: '20:9', ratio: 20 / 9, orient: 'landscape', label: '20:9 · Android wide' },
  { id: '9:20', ratio: 9 / 20, orient: 'portrait', label: '9:20 · Android phone' },
];

const BASE_LANDSCAPE = { w: 1152, h: 864 }; /* 4:3 authored hull */

/** Authored hull — rails stay fixed; spare window width goes to the stage. */
export function layoutFromWidth(w, h) {
  const q400 = 96;
  const rowH = h - q400;
  const railW = DESK_RAIL_W;
  const stageW = w - railW * 2;
  const paw = 96;
  const wing = Math.round((w - paw) / 2);
  return { w, h, railW, stageW, rowH, q400, paw, wing };
}

/** @param {ViewportToken} token */
export function authoredLayoutForToken(token) {
  if (token.id === '4:3') {
    return layoutFromWidth(BASE_LANDSCAPE.w, BASE_LANDSCAPE.h);
  }
  if (token.id === '3:4') {
    return layoutFromWidth(BASE_LANDSCAPE.h, BASE_LANDSCAPE.w);
  }
  const portraitW = BASE_LANDSCAPE.h; /* 864 */
  const w = token.orient === 'landscape'
    ? Math.round(BASE_LANDSCAPE.h * token.ratio)
    : portraitW;
  const h = token.orient === 'landscape'
    ? BASE_LANDSCAPE.h
    : Math.round(w / token.ratio);
  return layoutFromWidth(w, h);
}

export function measureAspect() {
  return window.innerWidth / window.innerHeight;
}

/** Live browser viewport — visualViewport when available (mobile chrome). */
export function measureViewportSize() {
  const vv = window.visualViewport;
  return {
    w: Math.round(vv?.width ?? window.innerWidth),
    h: Math.round(vv?.height ?? window.innerHeight),
  };
}

/** Phone stack / wide-stack on a touch phone — hull fills the screen (no letterbox). */
export function shouldFillPhoneViewport() {
  return shouldAutoMatchViewport();
}

function isPhoneLayoutToken(tokenId) {
  return PHONE_PORTRAIT_TOKENS.includes(tokenId) || PHONE_LANDSCAPE_TOKENS.includes(tokenId);
}

/**
 * First-open auto aspect — phones + tablets. Desktop / laptop → default token.
 * Uses screen shape first (works when DDG / mobile browsers fake desktop pointer).
 *
 * When FORCE_DESKTOP_LAYOUT is true, every device gets the authored desk hull
 * (scaled into the window) — no phone-stack chrome.
 */
export const FORCE_DESKTOP_LAYOUT = true;

/** Phone or touch tablet. A computer window keeps the side rails and grows the stage. */
export function handheldDesk() {
  const { w: vw, h: vh } = measureViewportSize();
  const minSide = Math.min(vw, vh);
  const maxSide = Math.max(vw, vh);
  const coarseOnly = window.matchMedia('(pointer: coarse) and not (pointer: fine)').matches;
  const hoverNone = window.matchMedia('(hover: none)').matches;
  if (minSide <= 480 && maxSide / Math.max(minSide, 1) >= 1.65) return true;
  if (window.matchMedia('(max-device-width: 480px)').matches) return true;
  if (window.matchMedia('(max-width: 480px) and (orientation: portrait)').matches) return true;
  if (coarseOnly && maxSide <= 1600) return true;
  if (minSide <= 520 && window.matchMedia('(pointer: coarse)').matches && hoverNone) return true;
  if (
    minSide > 480
    && minSide <= 1180
    && maxSide <= 1366
    && (hoverNone || coarseOnly)
  ) return true;
  return false;
}

/** Fill a computer window. Chrome stays at the 16:9 scale; spare space goes to the stage. */
export function stretchDesk(box) {
  const base = authoredLayoutForToken(getTokenById(DEFAULT_PROFILE_TOKEN));
  const scale = Math.min(box.w / base.w, box.h / base.h);
  if (!Number.isFinite(scale) || scale <= 0) return base;
  return layoutFromWidth(Math.round(box.w / scale), Math.round(box.h / scale));
}

export function shouldAutoMatchViewport() {
  if (FORCE_DESKTOP_LAYOUT) return false;

  const { w: vw, h: vh } = measureViewportSize();
  const minSide = Math.min(vw, vh);
  const maxSide = Math.max(vw, vh);

  /* Phone-class panel — short side ~360–430 CSS px @ 1080p (incl. 2460×1080 @ ~3×). */
  if (minSide <= 480 && maxSide / minSide >= 1.65) {
    return true;
  }

  if (window.matchMedia('(max-device-width: 480px)').matches) {
    return true;
  }

  if (window.matchMedia('(max-width: 480px) and (orientation: portrait)').matches) {
    return true;
  }

  if (window.matchMedia('(pointer: coarse) and not (pointer: fine)').matches) {
    return true;
  }

  if (
    minSide <= 520
    && window.matchMedia('(pointer: coarse)').matches
    && window.matchMedia('(hover: none)').matches
  ) {
    return true;
  }

  /* Tablet-class (iPad etc.) — same portrait stack as phone. */
  if (
    minSide > 480
    && minSide <= 1180
    && maxSide <= 1366
    && (
      window.matchMedia('(hover: none)').matches
      || window.matchMedia('(pointer: coarse) and not (pointer: fine)').matches
    )
  ) {
    return true;
  }

  return false;
}

/**
 * Phone-class handheld only (not tablet / desktop) — for the desk-layout heads-up.
 * Independent of FORCE_DESKTOP_LAYOUT.
 */
export function isPhoneClassDevice() {
  const { w: vw, h: vh } = measureViewportSize();
  const minSide = Math.min(vw, vh);
  const maxSide = Math.max(vw, vh);

  if (minSide <= 480 && maxSide / minSide >= 1.65) return true;

  try {
    if (window.matchMedia('(max-device-width: 480px)').matches) return true;
    if (window.matchMedia('(max-width: 480px) and (orientation: portrait)').matches) return true;
    if (
      minSide <= 520
      && window.matchMedia('(pointer: coarse)').matches
      && window.matchMedia('(hover: none)').matches
    ) {
      return true;
    }
  } catch {
    /* private mode */
  }

  return false;
}

/** @deprecated alias */
export function isMobileDevice() {
  return shouldAutoMatchViewport();
}

/** Pass-through — 19.5:9 / 20:9 keep their own wide-stack layout on all devices. */
export function resolveTokenForDevice(tokenId) {
  return tokenId;
}

/** @param {number} aspect viewport w/h */
export function nearestToken(aspect, allowed = ALLOWED_TOKENS) {
  let best = null;
  let bestDiff = Infinity;
  for (const token of VIEWPORT_TOKENS) {
    if (!allowed.includes(token.id)) continue;
    const diff = Math.abs(Math.log(aspect / token.ratio));
    if (diff < bestDiff) {
      bestDiff = diff;
      best = token;
    }
  }
  return best ?? VIEWPORT_TOKENS[0];
}

/** Legacy Gear override — cleared on boot; no longer written. */
export function readProfileOverride() {
  return null;
}

export function clearProfileOverride() {
  try {
    localStorage.removeItem(STORAGE_PROFILE_KEY);
  } catch {
    /* ignore */
  }
}

/** @deprecated Overrides removed — clears any leftover key. */
export function writeProfileOverride(_tokenId) {
  clearProfileOverride();
}

/** @param {string} tokenId */
export function getTokenById(tokenId) {
  return VIEWPORT_TOKENS.find((t) => t.id === tokenId) ?? VIEWPORT_TOKENS[0];
}

/**
 * Aspect-nearest token. Handheld portrait → 3:4 stack pool.
 * Handheld landscape → landscape pool (desk rails + fill; no forced flip).
 */
export function resolveAspectToken() {
  const { w, h } = measureViewportSize();
  let aspect = w / h;
  const handheld = shouldAutoMatchViewport();

  if (handheld) {
    if (ORIENTATION_LOCK === 'portrait' && aspect > 1) aspect = 1 / aspect;
    if (ORIENTATION_LOCK === 'landscape' && aspect < 1) aspect = 1 / aspect;

    const portraitPool = ORIENTATION_LOCK === 'landscape'
      ? []
      : PHONE_PORTRAIT_TOKENS.filter((id) => ALLOWED_TOKENS.includes(id));
    const landscapePool = ORIENTATION_LOCK === 'portrait'
      ? []
      : PHONE_LANDSCAPE_TOKENS.filter((id) => ALLOWED_TOKENS.includes(id));
    if (aspect < 1 && portraitPool.length) {
      return getTokenById(nearestToken(aspect, portraitPool).id);
    }
    if (aspect >= 1 && landscapePool.length) {
      return getTokenById(nearestToken(aspect, landscapePool).id);
    }
  }

  return getTokenById(resolveTokenForDevice(nearestToken(aspect).id));
}

export function resolveActiveToken() {
  if (shouldAutoMatchViewport()) return resolveAspectToken();
  return getTokenById(DEFAULT_PROFILE_TOKEN);
}

const frame = document.getElementById('dd-frame');
const viewport = document.getElementById('viewport-container');
const tokenPill = document.getElementById('dd-token-pill');

let activeTokenId = '4:3';
let phoneFillViewportListener = null;
let phoneFillDebounceTimer = null;
/** @type {{ w: number, h: number } | null} */
let lastPhoneFillVp = null;

function bindPhoneFillViewportListener(active) {
  if (phoneFillViewportListener) {
    window.visualViewport?.removeEventListener('resize', phoneFillViewportListener);
    phoneFillViewportListener = null;
  }
  if (phoneFillDebounceTimer) {
    clearTimeout(phoneFillDebounceTimer);
    phoneFillDebounceTimer = null;
  }
  if (!active) {
    lastPhoneFillVp = null;
    return;
  }
  lastPhoneFillVp = measureViewportSize();
  /* Soft-debounce: rail scroll / URL bar chrome can fire visualViewport resize and
   * reflow the whole hull mid-gesture — ignore tiny height jitter. */
  phoneFillViewportListener = () => {
    if (phoneFillDebounceTimer) clearTimeout(phoneFillDebounceTimer);
    phoneFillDebounceTimer = setTimeout(() => {
      phoneFillDebounceTimer = null;
      const vp = measureViewportSize();
      const prev = lastPhoneFillVp;
      if (
        prev
        && Math.abs(vp.w - prev.w) < 2
        && Math.abs(vp.h - prev.h) < 64
      ) {
        return;
      }
      lastPhoneFillVp = vp;
      applyProfile(resolveActiveToken().id);
    }, 140);
  };
  window.visualViewport?.addEventListener('resize', phoneFillViewportListener);
}

export function getActiveTokenId() {
  return activeTokenId;
}

function applyLayoutVars(layout) {
  const el = document.body;
  el.style.setProperty('--dd-w', `${layout.w}px`);
  el.style.setProperty('--dd-h', `${layout.h}px`);
  el.style.setProperty('--dd-rail-w', `${layout.railW}px`);
  el.style.setProperty('--dd-stage-w', `${layout.stageW}px`);
  el.style.setProperty('--dd-row-h', `${layout.rowH}px`);
  el.style.setProperty('--dd-q400-h', `${layout.q400}px`);
  el.style.setProperty('--dd-paw', `${layout.paw}px`);
  el.style.setProperty('--dd-wing', `${layout.wing}px`);
}

function applyQ400Grammar(layout, phoneStack, phoneWideStack) {
  const el = document.body;
  const q400H = phoneStack ? Math.round(layout.h / 5) : layout.q400;
  const icon = Math.round(q400H * Q400_ICON_FRAC);

  el.style.setProperty('--dd-q400-h', `${q400H}px`);
  el.style.setProperty('--dd-q400-icon', `${icon}px`);

  if (phoneWideStack) {
    const canvasRowH = layout.w;
    const rowH = Math.round((layout.h - canvasRowH) / 5);
    const railIcon = Math.round(rowH * PHONE_RAIL_ICON_FRAC);
    const q400Icon = Math.round(rowH * Q400_ICON_FRAC);
    const pawSize = q400Icon;

    el.style.setProperty('--dd-phone-canvas-row-h', `${canvasRowH}px`);
    el.style.setProperty('--dd-phone-wide-row-h', `${rowH}px`);
    el.style.setProperty('--dd-phone-paw-row-h', `${rowH}px`);
    el.style.setProperty('--dd-q400-h', `${rowH}px`);
    el.style.setProperty('--dd-phone-row-icon', `${railIcon}px`);
    el.style.setProperty('--dd-q400-icon', `${q400Icon}px`);
    el.style.setProperty('--dd-paw', `${pawSize}px`);
    el.style.removeProperty('--dd-phone-rail-row-h');
    el.style.removeProperty('--dd-phone-row-h');
  } else if (phoneStack) {
    /* Square canvas row = hull width; leftover height → tool bands (no vertical stretch). */
    const canvasRowH = layout.w;
    const toolBandH = Math.max(0, layout.h - canvasRowH);
    const toolFracSum = PHONE_STACK_ROWS.rails + PHONE_STACK_ROWS.q400 + PHONE_STACK_ROWS.paw;
    const railRowH = Math.round(toolBandH * (PHONE_STACK_ROWS.rails / toolFracSum));
    const q400RowH = Math.round(toolBandH * (PHONE_STACK_ROWS.q400 / toolFracSum));
    const pawRowH = Math.max(0, toolBandH - railRowH - q400RowH);
    const railIcon = Math.round(railRowH * PHONE_RAIL_ICON_FRAC);
    const q400Icon = Math.round(q400RowH * Q400_ICON_FRAC);
    /* Match paw logo to q400 icon TT (row above). */
    const pawSize = q400Icon;

    el.style.setProperty('--dd-phone-canvas-row-h', `${canvasRowH}px`);
    el.style.setProperty('--dd-phone-rail-row-h', `${railRowH}px`);
    el.style.setProperty('--dd-q400-h', `${q400RowH}px`);
    el.style.setProperty('--dd-phone-paw-row-h', `${pawRowH}px`);
    el.style.setProperty('--dd-phone-row-icon', `${railIcon}px`);
    el.style.setProperty('--dd-q400-icon', `${q400Icon}px`);
    el.style.setProperty('--dd-paw', `${pawSize}px`);
    el.style.removeProperty('--dd-phone-wide-row-h');
  } else {
    el.style.removeProperty('--dd-phone-canvas-row-h');
    el.style.removeProperty('--dd-phone-rail-row-h');
    el.style.removeProperty('--dd-phone-paw-row-h');
    el.style.removeProperty('--dd-phone-wide-row-h');
    el.style.removeProperty('--dd-phone-row-h');
    el.style.removeProperty('--dd-phone-row-icon');
    el.style.setProperty('--dd-paw', `${layout.paw}px`);
  }
}

/** Visible letterbox frame — 100vh/dvh can lag innerHeight on fullscreen. */
function measureFitBox() {
  const fw = frame?.clientWidth ?? 0;
  const fh = frame?.clientHeight ?? 0;
  if (fw >= 32 && fh >= 32) return { w: fw, h: fh };
  return measureViewportSize();
}

function isBrowserFullscreen() {
  return !!(document.fullscreenElement || document.webkitFullscreenElement);
}

/** While fullscreen, pin the letterbox to the live viewport so 100vh lag cannot clip q400. */
function syncFullscreenBox() {
  if (!frame) return;
  if (isBrowserFullscreen()) {
    const vp = measureViewportSize();
    const w = `${vp.w}px`;
    const h = `${vp.h}px`;
    if (frame.style.width !== w) frame.style.width = w;
    if (frame.style.height !== h) frame.style.height = h;
    if (document.documentElement.style.height !== h) {
      document.documentElement.style.height = h;
    }
    if (document.body.style.height !== h) document.body.style.height = h;
  } else if (frame.style.width || frame.style.height) {
    frame.style.removeProperty('width');
    frame.style.removeProperty('height');
    document.documentElement.style.removeProperty('height');
    document.body.style.removeProperty('height');
  }
}

function fitFrame({ phoneFill = false } = {}) {
  if (!frame || !viewport) return;
  if (phoneFill) {
    frame.style.setProperty('--dd-scale', '1');
    document.body.style.setProperty('--dd-scale', '1');
    return;
  }
  const w = parseFloat(getComputedStyle(viewport).width) || 1152;
  const h = parseFloat(getComputedStyle(viewport).height) || 864;
  const box = measureFitBox();
  const scale = Math.min(box.w / w, box.h / h);
  frame.style.setProperty('--dd-scale', String(scale));
  document.body.style.setProperty('--dd-scale', String(scale));
}

/** @param {string} tokenId */
export function applyProfile(tokenId, { persistOverride = false } = {}) {
  syncFullscreenBox();
  const isPhone = shouldAutoMatchViewport();
  const vp = isPhone ? measureFitBox() : measureViewportSize();
  /* Stack only when the window is actually portrait — never flip landscape into 3:4. */
  const phonePortrait = isPhone && vp.h >= vp.w;
  const phoneLandscape = isPhone && vp.w > vp.h;

  let displayToken = getTokenById(tokenId);
  if (isPhone && !isPhoneLayoutToken(tokenId)) {
    displayToken = resolveAspectToken();
    tokenId = displayToken.id;
  }

  /* Landscape handheld → desk side-rails + fill (not under-canvas wide-stack). */
  const phoneWideStack = false;
  const layoutTokenId = resolveTokenForDevice(tokenId);
  const layoutToken = getTokenById(layoutTokenId);
  activeTokenId = displayToken.id;

  const phoneFill = isPhone;
  const usePhoneStack = phonePortrait;
  let layout = phoneFill
    ? layoutFromWidth(vp.w, vp.h)
    : authoredLayoutForToken(layoutToken);
  if (!phoneFill && !handheldDesk()) layout = stretchDesk(measureFitBox());

  applyLayoutVars(layout);
  applyQ400Grammar(layout, usePhoneStack, phoneWideStack);

  document.body.dataset.ddToken = displayToken.id;
  document.body.dataset.ddHubLayout = phoneLandscape
    ? 'fit-stage'
    : hubLayoutForToken(displayToken.id);
  document.body.classList.toggle('dd-layout--portrait', phonePortrait);
  document.body.classList.toggle('dd-layout--phone-fill', phoneFill);
  document.body.classList.toggle('dd-layout--phone-stack', usePhoneStack);
  document.documentElement.classList.toggle('dd-layout--phone-stack', usePhoneStack);
  document.documentElement.classList.toggle('dd-layout--phone-fill', phoneFill);
  viewport?.classList.toggle('dd-layout--phone-wide-stack', false);
  viewport?.classList.toggle('dd-layout--phone-stack', usePhoneStack);

  if (tokenPill) {
    tokenPill.textContent = `${displayToken.id} · ${layout.w}×${layout.h}`;
    tokenPill.title = phoneFill
      ? (phonePortrait
        ? `${displayToken.label} — portrait stack`
        : `${displayToken.label} — landscape desk rails`)
      : `${displayToken.label} — gray hull on RP letterbox`;
  }

  if (persistOverride) clearProfileOverride();

  if (phoneFill) lastPhoneFillVp = { w: vp.w, h: vp.h };
  fitFrame({ phoneFill });
  bindPhoneFillViewportListener(phoneFill);
  void tryLockScreenOrientation();
  window.dispatchEvent(new CustomEvent('dd-profile-changed', {
    detail: { tokenId: displayToken.id, layout },
  }));
}

async function tryLockScreenOrientation() {
  /* `both` = follow device; do not call screen.orientation.lock. */
  if (ORIENTATION_LOCK !== 'landscape' && ORIENTATION_LOCK !== 'portrait') return;
  if (!shouldAutoMatchViewport()) return;
  try {
    const orient = screen.orientation;
    if (orient && typeof orient.lock === 'function') {
      await orient.lock(ORIENTATION_LOCK);
    }
  } catch {
    /* Browsers often require fullscreen / installed PWA; manifest still hints. */
  }
}

let profileRaf = 0;

function onProfileViewportChange() {
  if (profileRaf) return;
  profileRaf = requestAnimationFrame(() => {
    profileRaf = 0;
    applyProfile(resolveActiveToken().id);
  });
}

/** @type {number[]} */
let geometrySettleTimers = [];

function scheduleGeometrySettle() {
  for (const t of geometrySettleTimers) clearTimeout(t);
  /* 100vh/dvh on Linux/Chrome can lag fullscreen by seconds; a key/reflow often unsticks it. */
  geometrySettleTimers = [0, 32, 80, 180, 360, 1000, 2000, 3500].map((ms) =>
    window.setTimeout(() => {
      if (frame) void frame.offsetHeight;
      applyProfile(resolveActiveToken().id);
    }, ms),
  );
}

export function initProfileEngine() {
  clearProfileOverride();
  applyProfile(resolveActiveToken().id);

  window.addEventListener('resize', onProfileViewportChange);
  window.addEventListener('orientationchange', onProfileViewportChange);
  document.addEventListener('fullscreenchange', scheduleGeometrySettle);
  document.addEventListener('webkitfullscreenchange', scheduleGeometrySettle);

  if (typeof ResizeObserver !== 'undefined' && frame) {
    const ro = new ResizeObserver(() => onProfileViewportChange());
    ro.observe(frame);
  }
}
