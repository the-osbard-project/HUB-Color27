/**
 * Popcorn & candy particle layers — ported from Studio HUB theater-celebration.
 */

const MOTION_POOL = ['toss', 'toss', 'toss', 'fall', 'fall', 'spill', 'spill'];

/** Popcorn, candy, chocolate, applause. */
export const PC_GLYPH_BY_MOTION = {
  toss: ['🍿', '🍿', '🍬', '🍫', '⭐', '👏'],
  fall: ['🍿', '🍬', '🍫', '👏', '🍿', '⭐'],
  spill: ['🍿', '🍬', '🍫', '⭐', '👏'],
};

export const PC_CONFETTI_GLYPHS = ['⭐', '🎉', '🍬', '🍫', '👏', '🍿'];
export const PC_CONFETTI_HUES = [42, 280, 330, 195, 120, 15, 260, 28, 25, 32];

/**
 * @param {{ countMul?: number, delaySpread?: number, className?: string, glyphByMotion?: typeof PC_GLYPH_BY_MOTION, motionPool?: string[] }} [opts]
 * @returns {{ layer: HTMLDivElement, maxEndMs: number }}
 */
export function buildAudiencePopcornLayer(opts = {}) {
  const countMul = opts.countMul ?? 1;
  const delaySpread = opts.delaySpread ?? 1.1;
  const glyphByMotion = opts.glyphByMotion ?? PC_GLYPH_BY_MOTION;
  const motionPool = opts.motionPool?.length ? opts.motionPool : MOTION_POOL;
  const layer = document.createElement('div');
  layer.className = opts.className ?? 'ct-theater-popcorn';
  layer.setAttribute('aria-hidden', 'true');

  const count = Math.round((14 + Math.floor(Math.random() * 8)) * countMul);
  let maxEndMs = 0;

  for (let i = 0; i < count; i++) {
    const motion = motionPool[Math.floor(Math.random() * motionPool.length)];
    const glyphs = glyphByMotion[motion];
    const piece = document.createElement('span');
    piece.className = `ct-theater-popcorn__piece ct-theater-popcorn__piece--${motion}`;
    piece.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
    const delay = Math.random() * delaySpread;
    const dur =
      motion === 'toss'
        ? 1.5 + Math.random() * 1.1
        : motion === 'fall'
          ? 1.2 + Math.random() * 1
          : 0.95 + Math.random() * 0.75;
    const drift = -48 + Math.random() * 96;
    const driftMid = drift * (0.35 + Math.random() * 0.45);
    piece.style.setProperty('--ct-pop-left', `${6 + Math.random() * 88}%`);
    piece.style.setProperty('--ct-pop-delay', `${delay}s`);
    piece.style.setProperty('--ct-pop-dur', `${dur}s`);
    piece.style.setProperty('--ct-pop-drift', `${drift}px`);
    piece.style.setProperty('--ct-pop-drift-mid', `${driftMid}px`);
    piece.style.setProperty('--ct-pop-rot-mid', `${40 + Math.random() * 140}deg`);
    piece.style.setProperty('--ct-pop-rot-end', `${160 + Math.random() * 200}deg`);
    if (motion === 'toss') {
      piece.style.setProperty('--ct-pop-origin', `${5 + Math.random() * 9}%`);
      piece.style.setProperty('--ct-pop-rise', `${18 + Math.random() * 38}vh`);
      piece.style.setProperty('--ct-pop-drop', `${8 + Math.random() * 18}vh`);
    } else if (motion === 'spill') {
      piece.style.setProperty('--ct-pop-origin', `${4 + Math.random() * 11}%`);
      piece.style.setProperty('--ct-pop-rise', `${6 + Math.random() * 16}vh`);
      piece.style.setProperty('--ct-pop-drop', `${4 + Math.random() * 12}vh`);
    } else {
      piece.style.setProperty('--ct-pop-top', `${-12 + Math.random() * 28}%`);
    }
    maxEndMs = Math.max(maxEndMs, (delay + dur) * 1000);
    layer.appendChild(piece);
  }

  return { layer, maxEndMs };
}

/**
 * @param {{ count?: number, delaySpread?: number, durationSpread?: number, className?: string, glyphs?: string[], hues?: number[], rectRatio?: number }} [opts]
 * @returns {{ layer: HTMLDivElement, maxEndMs: number }}
 */
export function buildConfettiRainLayer(opts = {}) {
  const count = opts.count ?? 32 + Math.floor(Math.random() * 24);
  const delaySpread = opts.delaySpread ?? 1.8;
  const durationSpread = opts.durationSpread ?? 1.4;
  const glyphs = opts.glyphs ?? PC_CONFETTI_GLYPHS;
  const hues = opts.hues ?? PC_CONFETTI_HUES;
  const rectRatio = opts.rectRatio ?? 0.38;
  const layer = document.createElement('div');
  layer.className = opts.className ?? 'ct-theater-confetti';
  layer.setAttribute('aria-hidden', 'true');

  let maxEndMs = 0;

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('span');
    const useRect = Math.random() < rectRatio;
    if (useRect) {
      piece.className = 'ct-theater-confetti__piece ct-theater-confetti__piece--rect';
      piece.style.setProperty(
        '--ct-conf-hue',
        `${hues[Math.floor(Math.random() * hues.length)]}`,
      );
    } else {
      piece.className = 'ct-theater-confetti__piece ct-theater-confetti__piece--spark';
      piece.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
    }
    const delay = Math.random() * delaySpread;
    const dur = 1.4 + Math.random() * durationSpread;
    const drift = -60 + Math.random() * 120;
    piece.style.setProperty('--ct-conf-left', `${2 + Math.random() * 96}%`);
    piece.style.setProperty('--ct-conf-top', `${-14 + Math.random() * 22}%`);
    piece.style.setProperty('--ct-conf-delay', `${delay}s`);
    piece.style.setProperty('--ct-conf-dur', `${dur}s`);
    piece.style.setProperty('--ct-conf-drift', `${drift}px`);
    piece.style.setProperty('--ct-conf-spin', `${180 + Math.random() * 540}deg`);
    maxEndMs = Math.max(maxEndMs, (delay + dur) * 1000);
    layer.appendChild(piece);
  }

  return { layer, maxEndMs };
}

/**
 * @param {HTMLElement} layer
 * @param {number} maxEndMs
 */
export function mountCelebrationLayer(layer, maxEndMs) {
  document.body.appendChild(layer);
  window.setTimeout(() => layer.remove(), maxEndMs + 450);
}

/** Fall-heavy pool for the Smashy beat — mostly raining P&C. */
const SMASHY_FALL_POOL = ['fall', 'fall', 'fall', 'fall', 'fall', 'spill', 'toss'];

/**
 * Sustained startup burst. Two overlapping waves keep popcorn and candy moving
 * from “Mashy” until the Color Time Machine! finale begins.
 * @returns {{ fadeOut: () => void, remove: () => void, addFallBurst: () => void }}
 */
export function mountWelcomeCelebration() {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    return { fadeOut() {}, remove() {}, addFallBurst() {} };
  }

  const root = document.createElement('div');
  root.className = 'ct-welcome-celebration';
  root.setAttribute('aria-hidden', 'true');
  document.body.appendChild(root);

  /** @param {{ countMul?: number, delaySpread?: number, motionPool?: string[] }} [waveOpts] */
  const appendWave = (waveOpts = {}) => {
    if (!root.isConnected) return;
    const popcorn = buildAudiencePopcornLayer({
      countMul: waveOpts.countMul ?? 1.35,
      delaySpread: waveOpts.delaySpread ?? 1.25,
      className: 'ct-theater-popcorn ct-theater-popcorn--opening',
      glyphByMotion: PC_GLYPH_BY_MOTION,
      motionPool: waveOpts.motionPool,
    });
    root.appendChild(popcorn.layer);
  };

  appendWave();
  const secondWaveTimer = window.setTimeout(() => appendWave(), 1150);
  let removeTimer = null;
  let fading = false;

  const remove = () => {
    window.clearTimeout(secondWaveTimer);
    if (removeTimer != null) window.clearTimeout(removeTimer);
    root.remove();
  };

  const fadeOut = () => {
    fading = true;
    window.clearTimeout(secondWaveTimer);
    root.classList.add('ct-welcome-celebration--out');
    removeTimer = window.setTimeout(remove, 1800);
  };

  /** Extra falling P&C when “Smashy” lands on screen. */
  const addFallBurst = () => {
    if (fading || !root.isConnected) return;
    appendWave({
      countMul: 1.7,
      delaySpread: 0.95,
      motionPool: SMASHY_FALL_POOL,
    });
    appendWave({
      countMul: 1.25,
      delaySpread: 1.15,
      motionPool: SMASHY_FALL_POOL,
    });
  };

  return { fadeOut, remove, addFallBurst };
}

const SPOTLIGHT_LAYER_TAIL_MS = 450;
const SPOTLIGHT_FADE_MS = 900;

/**
 * Save curtain call — warm spotlight wash over the stage canvas stack.
 * @param {HTMLElement | null | undefined} stageMount `#dd-stage-scroll`
 * @param {number} celebrationMaxEndMs longest particle layer maxEndMs
 */
export function mountSaveSpotlightOverlay(stageMount, celebrationMaxEndMs) {
  if (!stageMount) return;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

  const overlay = document.createElement('div');
  overlay.className = 'ct-stage-spotlight-overlay';
  overlay.setAttribute('aria-hidden', 'true');
  stageMount.appendChild(overlay);

  requestAnimationFrame(() => {
    overlay.classList.add('ct-stage-spotlight-overlay--on');
  });

  const totalMs = Math.max(0, celebrationMaxEndMs) + SPOTLIGHT_LAYER_TAIL_MS;
  const fadeStart = Math.max(0, totalMs - SPOTLIGHT_FADE_MS);

  window.setTimeout(() => overlay.classList.add('ct-stage-spotlight-overlay--off'), fadeStart);
  window.setTimeout(() => overlay.remove(), totalMs);
}
