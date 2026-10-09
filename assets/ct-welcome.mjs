/** Color Time! — long startup lockup intro with a Mashy-timed theater burst. */

import {
  CT_HUB_MACHINE_WORD,
  CT_HUB_TAGLINE_WORDS,
  CT_TAGLINE_BPM,
} from './ct-hub-tagline.mjs';
import { getCtHourPalette, getCtTrayByHour } from './ct-clock-trays.mjs';
import { renderCtClockFace } from './ct-popup-clock-shared.mjs';
import { playOpeningCelebration } from './ct-theater.mjs';
import { maybeShowPhoneDeskNotice } from './ct-phone-desk-notice.mjs';

const WELCOME_SESSION_KEY = 'ct-welcome-shown-v6';
const START_DELAY_MS = 420;
const BEAT_MS = Math.round(60000 / CT_TAGLINE_BPM);
const SETTLE_MS = Math.round(BEAT_MS / 2);
const CHAOS_MS = 2000;
const CHAOS_TICK_MS = 90;
const FADE_OUT_MS = 920;
const MASHY_INDEX = CT_HUB_TAGLINE_WORDS.indexOf('Mashy');
const SMASHY_INDEX = CT_HUB_TAGLINE_WORDS.indexOf('Smashy');

function reducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

function randomTrayColor() {
  const tray = getCtTrayByHour(1 + Math.floor(Math.random() * 12));
  const colors = tray?.colors?.length ? tray.colors : ['#f5c842'];
  return colors[Math.floor(Math.random() * colors.length)] || '#f5c842';
}

/** One well per hour — first color from that hour’s tray. */
function welcomeClockMirror() {
  return Array.from({ length: 12 }, (_, i) => {
    const palette = getCtHourPalette(i + 1);
    return palette[0] || '#888888';
  });
}

function buildWelcome() {
  const root = document.createElement('div');
  root.className = 'ct-welcome';
  root.hidden = true;
  root.setAttribute('aria-live', 'polite');
  root.innerHTML = `
    <div class="ct-welcome__card">
      <div class="ct-welcome__clock" aria-hidden="true">
        <div class="ct-welcome__hours" role="presentation"></div>
        <span class="ct-welcome__clock-paw">
          <img class="ct-welcome__clock-paw-img" src="assets/img-ct/logo-512-ct.png" width="32" height="32" alt="" decoding="async">
        </span>
      </div>
      <p class="ct-welcome__title-row">
        <span class="ct-welcome__name ct-font-color-time">Color Time</span>
        <span class="ct-welcome__machine" hidden aria-hidden="true"></span>
      </p>
      <div class="ct-welcome__tagline"></div>
    </div>
  `;
  return root;
}

export function initCtWelcome() {
  if (sessionStorage.getItem(WELCOME_SESSION_KEY) === '1') {
    void maybeShowPhoneDeskNotice();
    return;
  }

  const root = buildWelcome();
  const name = root.querySelector('.ct-welcome__name');
  const machine = root.querySelector('.ct-welcome__machine');
  const tagline = root.querySelector('.ct-welcome__tagline');
  const hours = root.querySelector('.ct-welcome__hours');
  const clock = root.querySelector('.ct-welcome__clock');
  if (
    !(name instanceof HTMLElement)
    || !(machine instanceof HTMLElement)
    || !(tagline instanceof HTMLElement)
    || !(hours instanceof HTMLElement)
    || !(clock instanceof HTMLElement)
  ) return;
  renderCtClockFace(hours, {
    mirror: welcomeClockMirror(),
    activeHour: null,
    mixRunning: false,
    hourTitle: (h) => `Hour ${h}`,
  });
  clock.inert = true;
  /* Full viewport — stage mat / #q200 overflow:hidden clips an absolute overlay. */
  document.body.appendChild(root);
  root.style.setProperty('--ct-tagline-beat-ms', `${BEAT_MS}ms`);
  root.style.setProperty('--ct-tagline-settle-ms', `${SETTLE_MS}ms`);

  const run = () => {
    sessionStorage.setItem(WELCOME_SESSION_KEY, '1');
    root.removeAttribute('hidden');
    root.hidden = false;
    root.classList.add('ct-welcome--visible');
    requestAnimationFrame(() => root.classList.add('ct-welcome--visible'));

    if (reducedMotion()) {
      tagline.textContent = CT_HUB_TAGLINE_WORDS.join(' ');
      machine.textContent = CT_HUB_MACHINE_WORD;
      machine.hidden = false;
      machine.setAttribute('aria-hidden', 'false');
      window.setTimeout(() => {
        root.hidden = true;
        root.remove();
        void maybeShowPhoneDeskNotice();
      }, 1800);
      return;
    }

    let wordIndex = 0;
    let celebration = null;

    const fadeIntro = () => {
      celebration?.fadeOut();
      root.classList.remove('ct-welcome--visible');
      root.classList.add('ct-welcome--out');
      window.setTimeout(() => {
        root.remove();
        void maybeShowPhoneDeskNotice();
      }, FADE_OUT_MS);
    };

    const beginFinale = () => {
      name.classList.add('ct-welcome__name--chaos');
      machine.classList.add('ct-welcome__machine--chaos');

      const flashColor = () => {
        name.style.color = randomTrayColor();
        machine.style.color = randomTrayColor();
      };
      flashColor();
      const colorTimer = window.setInterval(flashColor, CHAOS_TICK_MS);

      window.setTimeout(() => {
        window.clearInterval(colorTimer);
        name.classList.remove('ct-welcome__name--chaos');
        machine.classList.remove('ct-welcome__machine--chaos');
        name.style.removeProperty('color');
        machine.style.removeProperty('color');
        name.classList.add('ct-welcome__name--settle');
        machine.classList.add('ct-welcome__machine--settle');
        window.setTimeout(fadeIntro, SETTLE_MS);
      }, CHAOS_MS);
    };

    const revealMachine = () => {
      machine.textContent = CT_HUB_MACHINE_WORD;
      machine.hidden = false;
      machine.setAttribute('aria-hidden', 'false');
      requestAnimationFrame(() => machine.classList.add('ct-welcome__machine--pop'));
      window.setTimeout(beginFinale, BEAT_MS);
    };

    const addWord = () => {
      if (wordIndex >= CT_HUB_TAGLINE_WORDS.length) {
        revealMachine();
        return;
      }

      if (wordIndex > 0) tagline.appendChild(document.createTextNode(' '));
      const word = document.createElement('span');
      word.className = 'ct-welcome__word';
      word.textContent = CT_HUB_TAGLINE_WORDS[wordIndex];
      tagline.appendChild(word);
      requestAnimationFrame(() => word.classList.add('ct-welcome__word--pop'));

      if (wordIndex === MASHY_INDEX) {
        celebration = playOpeningCelebration();
      }
      if (wordIndex === SMASHY_INDEX) {
        celebration?.addFallBurst?.();
      }

      wordIndex += 1;
      window.setTimeout(addWord, BEAT_MS);
    };

    addWord();
  };

  const schedule = () => window.setTimeout(run, START_DELAY_MS);
  if (document.readyState === 'complete') schedule();
  else window.addEventListener('load', schedule, { once: true });
}
