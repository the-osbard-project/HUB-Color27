/**
 * Color Time Machine! — header tagline (line 2 cumulative · Machine! inline on title row).
 */

import { getCtTrayByHour } from './ct-clock-trays.mjs';

/** Tagline row — excludes Machine! */
export const CT_HUB_TAGLINE_WORDS = Object.freeze([
  'Magic',
  'Mixer',
  'Pixer',
  'Mashy',
  'Smashy',
]);

export const CT_HUB_MACHINE_WORD = 'Machine!';

/** Quarter-note tempo — one word per beat, two eighth-note syllable accents (1 & 2 & …). */
export const CT_TAGLINE_BPM = 70;
const BEAT_MS = Math.round(60000 / CT_TAGLINE_BPM);
const STACK_STEP_MS = BEAT_MS;
const CHAOS_MS = 2000;
const CHAOS_TICK_MS = 90;
const SETTLE_MS = Math.round(BEAT_MS / 2);

/** Phone HUB — static header, title on two rows, no tagline animation. */
function isPhoneHubLayout() {
  const mode = document.body.dataset.ddHubLayout;
  return mode === 'full-viewport' || mode === 'phone-wide-stack';
}

/** @param {HTMLElement | null} lockupEl */
function applyTaglineBeat(lockupEl) {
  const root = lockupEl instanceof HTMLElement ? lockupEl : document.documentElement;
  root.style.setProperty('--ct-tagline-beat-ms', `${BEAT_MS}ms`);
  root.style.setProperty('--ct-tagline-settle-ms', `${SETTLE_MS}ms`);
}

/** @returns {string} */
function fullTaglinePhrase() {
  return CT_HUB_TAGLINE_WORDS.join(' ');
}

/** @returns {string} */
function randomTrayColor() {
  const hour = 1 + Math.floor(Math.random() * 12);
  const tray = getCtTrayByHour(hour);
  const colors = tray?.colors?.length ? tray.colors : ['#f5c842'];
  return colors[Math.floor(Math.random() * colors.length)] || '#f5c842';
}

/** @param {HTMLElement | null} el */
function clearTitleFinaleClasses(el) {
  if (!(el instanceof HTMLElement)) return;
  el.classList.remove(
    'dd-hub-head__ct-title--chaos',
    'dd-hub-head__ct-title--settle',
    'dd-hub-head__ct-machine--chaos',
    'dd-hub-head__ct-machine--settle',
  );
  el.style.removeProperty('color');
}

/** @param {HTMLElement | null} machineEl */
function resetMachineWord(machineEl) {
  if (!(machineEl instanceof HTMLElement)) return;
  machineEl.textContent = '';
  machineEl.hidden = true;
  machineEl.setAttribute('aria-hidden', 'true');
  machineEl.classList.remove('dd-hub-head__ct-machine--pop', 'dd-hub-head__ct-machine--landed');
  clearTitleFinaleClasses(machineEl);
}

/**
 * @param {HTMLElement} machineEl
 */
function revealMachineWord(machineEl) {
  machineEl.textContent = CT_HUB_MACHINE_WORD;
  machineEl.hidden = false;
  machineEl.setAttribute('aria-hidden', 'false');
  machineEl.classList.remove('dd-hub-head__ct-machine--pop', 'dd-hub-head__ct-machine--landed');
  clearTitleFinaleClasses(machineEl);
  void machineEl.offsetWidth;
  machineEl.classList.add('dd-hub-head__ct-machine--pop');
  machineEl.classList.add('dd-hub-head__ct-machine--landed');
}

/**
 * @param {HTMLElement | null} morphEl
 * @param {HTMLElement | null} machineEl
 * @param {HTMLElement | null} titleEl
 * @param {HTMLElement | null} lockupEl
 */
function showStaticLanded(morphEl, machineEl, titleEl, lockupEl) {
  applyTaglineBeat(lockupEl);
  applyTaglineMode(lockupEl);
  if (titleEl instanceof HTMLElement) clearTitleFinaleClasses(titleEl);
  if (morphEl instanceof HTMLElement) {
    morphEl.classList.add('dd-hub-head__ct-tagline--stack');
    morphEl.classList.remove('dd-hub-head__ct-morph--inline', 'dd-hub-head__ct-morph--flash');
    morphEl.textContent = fullTaglinePhrase();
    morphEl.classList.add('dd-hub-head__ct-morph--landed');
  }
  if (machineEl instanceof HTMLElement) {
    machineEl.textContent = CT_HUB_MACHINE_WORD;
    machineEl.hidden = false;
    machineEl.setAttribute('aria-hidden', 'false');
    machineEl.classList.remove('dd-hub-head__ct-machine--pop');
    machineEl.classList.add('dd-hub-head__ct-machine--landed');
    clearTitleFinaleClasses(machineEl);
  }
}

/** @param {HTMLElement | null} lockupEl */
function applyTaglineMode(lockupEl) {
  lockupEl?.classList.add('dd-hub-head__ct-lockup--stack');
  lockupEl?.classList.remove('dd-hub-head__ct-lockup--inline');
}

/**
 * After Machine! 2-beat pop: random colors 2s, then long half-beat grow to normal.
 * @param {HTMLElement | null} titleEl
 * @param {HTMLElement | null} machineEl
 * @returns {(() => void) | undefined}
 */
function runTitleChaosFinale(titleEl, machineEl) {
  if (!(titleEl instanceof HTMLElement) && !(machineEl instanceof HTMLElement)) return;

  /** @type {number | null} */
  let interval = null;
  /** @type {number | null} */
  let chaosEndTimer = null;
  /** @type {number | null} */
  let settleEndTimer = null;

  const tickColors = () => {
    if (titleEl instanceof HTMLElement) titleEl.style.color = randomTrayColor();
    if (machineEl instanceof HTMLElement) machineEl.style.color = randomTrayColor();
  };

  titleEl?.classList.add('dd-hub-head__ct-title--chaos');
  machineEl?.classList.add('dd-hub-head__ct-machine--chaos');
  tickColors();
  interval = window.setInterval(tickColors, CHAOS_TICK_MS);

  chaosEndTimer = window.setTimeout(() => {
    if (interval != null) window.clearInterval(interval);
    interval = null;

    titleEl?.classList.remove('dd-hub-head__ct-title--chaos');
    machineEl?.classList.remove('dd-hub-head__ct-machine--chaos');

    titleEl?.classList.remove('dd-hub-head__ct-title--settle');
    machineEl?.classList.remove('dd-hub-head__ct-machine--settle');
    if (titleEl instanceof HTMLElement) void titleEl.offsetWidth;
    if (machineEl instanceof HTMLElement) void machineEl.offsetWidth;

    titleEl?.classList.add('dd-hub-head__ct-title--settle');
    machineEl?.classList.add('dd-hub-head__ct-machine--settle');

    settleEndTimer = window.setTimeout(() => {
      clearTitleFinaleClasses(titleEl);
      clearTitleFinaleClasses(machineEl);
    }, SETTLE_MS);
  }, CHAOS_MS);

  return () => {
    if (interval != null) window.clearInterval(interval);
    if (chaosEndTimer != null) window.clearTimeout(chaosEndTimer);
    if (settleEndTimer != null) window.clearTimeout(settleEndTimer);
    clearTitleFinaleClasses(titleEl);
    clearTitleFinaleClasses(machineEl);
  };
}

/**
 * @param {HTMLElement} morphEl
 * @param {HTMLElement | null} machineEl
 * @param {HTMLElement | null} titleEl
 * @param {HTMLElement | null} lockupEl
 * @returns {(() => void) | undefined}
 */
function runStackedIntro(morphEl, machineEl, titleEl, lockupEl) {
  applyTaglineBeat(lockupEl);
  morphEl.classList.add('dd-hub-head__ct-tagline--stack');
  morphEl.classList.remove('dd-hub-head__ct-morph--inline');
  morphEl.textContent = '';
  morphEl.classList.remove('dd-hub-head__ct-morph--flash', 'dd-hub-head__ct-morph--landed');
  resetMachineWord(machineEl);
  if (titleEl instanceof HTMLElement) clearTitleFinaleClasses(titleEl);

  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    showStaticLanded(morphEl, machineEl, titleEl, lockupEl);
    return;
  }

  let i = 0;
  /** @type {number | null} */
  let timer = null;
  /** @type {(() => void) | null} */
  let stopFinale = null;

  const beginFinale = () => {
    timer = window.setTimeout(() => {
      stopFinale = runTitleChaosFinale(titleEl, machineEl) ?? null;
    }, BEAT_MS);
  };

  const finishWithMachine = () => {
    if (machineEl instanceof HTMLElement) revealMachineWord(machineEl);
    morphEl.classList.add('dd-hub-head__ct-morph--landed');
    beginFinale();
  };

  const addWord = () => {
    if (i >= CT_HUB_TAGLINE_WORDS.length) {
      finishWithMachine();
      return;
    }

    if (i > 0) morphEl.appendChild(document.createTextNode(' '));

    const word = document.createElement('span');
    word.className = 'dd-hub-head__ct-word';
    word.textContent = CT_HUB_TAGLINE_WORDS[i];
    morphEl.appendChild(word);

    requestAnimationFrame(() => {
      word.classList.add('dd-hub-head__ct-word--pop');
    });

    if (i >= CT_HUB_TAGLINE_WORDS.length - 1) {
      timer = window.setTimeout(finishWithMachine, STACK_STEP_MS);
      return;
    }

    i += 1;
    timer = window.setTimeout(addWord, STACK_STEP_MS);
  };

  addWord();

  return () => {
    if (timer != null) window.clearTimeout(timer);
    stopFinale?.();
  };
}

/**
 * @param {HTMLElement} morphEl
 * @param {HTMLElement | null} lockupEl
 * @param {HTMLElement | null} machineEl
 * @param {HTMLElement | null} titleEl
 * @returns {(() => void) | undefined}
 */
function runTaglineIntro(morphEl, lockupEl, machineEl, titleEl) {
  morphEl.classList.remove('dd-hub-head__ct-morph--landed');
  applyTaglineMode(lockupEl);
  return runStackedIntro(morphEl, machineEl, titleEl, lockupEl);
}

export function initCtHubTagline() {
  const morphEl = document.getElementById('ct-hub-tagline-morph');
  const lockupEl = document.getElementById('ct-hub-tagline-lockup');
  const titleEl = document.getElementById('ct-hub-title-replay');
  const machineEl = document.getElementById('ct-hub-machine-word');
  if (!(morphEl instanceof HTMLElement)) return;

  applyTaglineBeat(lockupEl instanceof HTMLElement ? lockupEl : null);

  /** Full intro (incl. chaos finale) once per page load unless replay clicked. */
  let introPlayedThisLoad = false;

  /** @type {(() => void) | null} */
  let stopIntro = null;

  /**
   * @param {boolean} [forceReplay]
   */
  const start = (forceReplay = false) => {
    stopIntro?.();
    stopIntro = null;

    const lockup = lockupEl instanceof HTMLElement ? lockupEl : null;
    const machine = machineEl instanceof HTMLElement ? machineEl : null;
    const title = titleEl instanceof HTMLElement ? titleEl : null;

    if (isPhoneHubLayout()) {
      showStaticLanded(morphEl, machine, title, lockup);
      introPlayedThisLoad = true;
      return;
    }

    if (!forceReplay && introPlayedThisLoad) {
      showStaticLanded(morphEl, machine, title, lockup);
      return;
    }

    introPlayedThisLoad = true;
    stopIntro =
      runTaglineIntro(morphEl, lockup, machine, title) ?? null;
  };

  window.addEventListener('dd-hub-opened', () => start(false));

  window.addEventListener('dd-profile-changed', () => {
    applyTaglineBeat(lockupEl instanceof HTMLElement ? lockupEl : null);
    if (introPlayedThisLoad) {
      showStaticLanded(
        morphEl,
        machineEl instanceof HTMLElement ? machineEl : null,
        titleEl instanceof HTMLElement ? titleEl : null,
        lockupEl instanceof HTMLElement ? lockupEl : null,
      );
    }
  });

  if (titleEl instanceof HTMLElement) {
    titleEl.addEventListener('click', (e) => {
      e.preventDefault();
      start(true);
    });
    titleEl.addEventListener('keydown', (e) => {
      if (e.key !== 'Enter' && e.key !== ' ') return;
      e.preventDefault();
      start(true);
    });
  }
}
