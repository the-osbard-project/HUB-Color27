/**

 * Color Time! — Popcorn & Candy applause (Studio theater beat).

 * Opening smatter on startup · curtain call after Save.

 */



import {

  buildAudiencePopcornLayer,

  buildConfettiRainLayer,

  mountCelebrationLayer,

  mountSaveSpotlightOverlay,

  mountWelcomeCelebration,

  PC_CONFETTI_GLYPHS,

  PC_CONFETTI_HUES,

  PC_GLYPH_BY_MOTION,

} from './ct-theater-celebration.mjs';

import {

  beginInteractiveApplause,

  playSaveApplause,

  unlockTheaterAudio,

} from './ct-theater-sfx.mjs';



const OPENING_APPLAUSE_MS = 3000;

const SAVE_APPLAUSE_MS = 4800;



function reducedMotion() {

  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;

}



/** @type {ReturnType<typeof beginInteractiveApplause> | null} */

let interactiveBeat = null;

/** @type {((e: PointerEvent) => void) | null} */

let interactiveMoveListener = null;

/** @type {ReturnType<typeof setTimeout> | null} */

let interactiveBeatTimer = null;



function clearInteractiveBeat() {

  if (interactiveMoveListener) {

    document.removeEventListener('pointermove', interactiveMoveListener);

    interactiveMoveListener = null;

  }

  if (interactiveBeatTimer) {

    clearTimeout(interactiveBeatTimer);

    interactiveBeatTimer = null;

  }

  interactiveBeat?.end();

  interactiveBeat = null;

}



/**

 * @param {{ durationMs?: number, initialEnergy?: number }} [beatOpts]

 */

function startInteractiveApplause(beatOpts = {}) {

  clearInteractiveBeat();

  interactiveBeat = beginInteractiveApplause(beatOpts);

  let moveX = null;

  let moveY = null;

  interactiveMoveListener = (e) => {

    if (moveX != null) {

      const dist = Math.hypot(e.clientX - moveX, e.clientY - moveY);

      if (dist > 1.5) interactiveBeat?.feedMovement(dist);

    }

    moveX = e.clientX;

    moveY = e.clientY;

  };

  document.addEventListener('pointermove', interactiveMoveListener, { passive: true });

  const ms = beatOpts.durationMs ?? OPENING_APPLAUSE_MS;

  interactiveBeatTimer = setTimeout(clearInteractiveBeat, ms);

}



/**
 * @param {{ level?: 'opening' | 'save' | 'quick' }} [opts]
 * @returns {number} longest particle layer duration (ms)
 */
function spawnPopcornCandyFx({ level = 'opening' } = {}) {
  if (reducedMotion()) return 0;

  const isSave = level === 'save';
  const isQuick = level === 'quick';

  const popcorn = buildAudiencePopcornLayer({
    countMul: isSave ? 1.45 : isQuick ? 1.05 : 1.3,
    delaySpread: isSave ? 1.65 : isQuick ? 0.95 : 1.1,
    className: isSave
      ? 'ct-theater-popcorn ct-theater-popcorn--save'
      : 'ct-theater-popcorn ct-theater-popcorn--opening',
    glyphByMotion: PC_GLYPH_BY_MOTION,
  });
  mountCelebrationLayer(popcorn.layer, popcorn.maxEndMs);

  let maxEndMs = popcorn.maxEndMs;

  if (isSave) {
    const confetti = buildConfettiRainLayer({
      count: 38 + Math.floor(Math.random() * 22),
      delaySpread: 2.1,
      durationSpread: 1.55,
      className: 'ct-theater-confetti ct-theater-confetti--save',
      glyphs: PC_CONFETTI_GLYPHS,
      hues: PC_CONFETTI_HUES,
      rectRatio: 0.48,
    });
    mountCelebrationLayer(confetti.layer, confetti.maxEndMs);
    maxEndMs = Math.max(maxEndMs, confetti.maxEndMs);

    const stageMount = document.getElementById('dd-stage-scroll');
    mountSaveSpotlightOverlay(stageMount, maxEndMs);
  }

  return maxEndMs;
}



/**
 * Welcome beat — sustained popcorn, candy, and applause controlled by the
 * startup title sequence.
 */
export function playOpeningCelebration() {

  if (reducedMotion()) return { fadeOut() {}, remove() {}, addFallBurst() {} };

  const celebration = mountWelcomeCelebration();

  startInteractiveApplause({ durationMs: 5200 });

  return celebration;
}



/**
 * Curtain call — after Save completes.
 * @param {{ level?: 'quick' | 'full' }} [opts]
 */
export function playSaveCelebration(opts = {}) {
  if (reducedMotion()) return;

  unlockTheaterAudio();

  const full = opts.level !== 'quick';
  playSaveApplause(full ? 'saveAs' : 'standard');
  spawnPopcornCandyFx({ level: full ? 'save' : 'quick' });
  startInteractiveApplause({
    durationMs: full ? SAVE_APPLAUSE_MS : OPENING_APPLAUSE_MS,
    initialEnergy: full ? 0.38 : 0.28,
  });
}



export function initCtTheater() {

  if (reducedMotion()) return;



  for (const type of ['pointerdown', 'keydown', 'touchstart']) {

    document.addEventListener(type, () => unlockTheaterAudio(), {

      capture: true,

      passive: true,

    });

  }



  window.addEventListener('ct-save', (e) => {
    const celebration = /** @type {CustomEvent<{ celebration?: 'quick' | 'full' }>} */ (e).detail?.celebration;
    const level = celebration === 'quick' ? 'quick' : 'full';
    requestAnimationFrame(() => playSaveCelebration({ level }));
  });
}


