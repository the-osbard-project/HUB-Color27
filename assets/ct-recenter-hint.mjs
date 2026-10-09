/** Studio — “Press 7 to re-center canvas.” when the page is off-center. */

import { getDrawCanvas } from './ct-canvas.mjs';

const HINT_MS = 5000;
const FADE_MS = 450;
const OFF_PX = 24;
const SETTLE_MS = 150;

export function initCtRecenterHint() {
  const hint = document.getElementById('ct-recenter-hint');
  const scrollEl = document.getElementById('dd-stage-scroll');
  if (!(hint instanceof HTMLElement) || !(scrollEl instanceof HTMLElement)) return;

  let showTimer = 0;
  let fadeTimer = 0;
  let visible = false;
  let wasOff = false;
  let armed = false;
  let settleTimer = 0;

  function pageEl() {
    return getDrawCanvas() ?? document.getElementById('ct-canvas-stack');
  }

  function canvasOffCenter() {
    const page = pageEl();
    if (!(page instanceof HTMLElement)) return false;
    const lane = scrollEl.getBoundingClientRect();
    const box = page.getBoundingClientRect();
    if (!lane.width || !lane.height || !box.width || !box.height) return false;
    const dx = box.left + box.width / 2 - (lane.left + lane.width / 2);
    const dy = box.top + box.height / 2 - (lane.top + lane.height / 2);
    return Math.hypot(dx, dy) > OFF_PX;
  }

  function hideNow() {
    window.clearTimeout(showTimer);
    window.clearTimeout(fadeTimer);
    hint.classList.remove('is-visible');
    hint.hidden = true;
    visible = false;
  }

  function fadeOut() {
    hint.classList.remove('is-visible');
    fadeTimer = window.setTimeout(() => {
      hint.hidden = true;
      visible = false;
    }, FADE_MS);
  }

  function showHint() {
    if (visible) return;
    window.clearTimeout(showTimer);
    window.clearTimeout(fadeTimer);
    hint.hidden = false;
    requestAnimationFrame(() => {
      hint.classList.add('is-visible');
    });
    visible = true;
    showTimer = window.setTimeout(fadeOut, HINT_MS);
  }

  function check(force = false) {
    const off = canvasOffCenter();
    if (!off) {
      if (visible) hideNow();
      wasOff = false;
      return;
    }
    if (!armed) return;
    if (force || !wasOff) showHint();
    wasOff = true;
  }

  function checkSoon(force = false) {
    window.clearTimeout(settleTimer);
    settleTimer = window.setTimeout(() => check(force), SETTLE_MS);
  }

  window.setTimeout(() => {
    armed = true;
    check(true);
  }, 800);

  scrollEl.addEventListener('scroll', () => checkSoon(false), { passive: true });
  window.addEventListener('oss-chrome-change', () => {
    window.setTimeout(() => check(true), 420);
  });
  window.addEventListener('ct-canvas-size-changed', () => checkSoon(true));
  window.addEventListener('resize', () => checkSoon(true));
}
