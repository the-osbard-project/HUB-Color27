/** Procedural theater SFX — ported from Studio packages/ui/sfx/theater-sfx.mjs */

/** @type {AudioContext | null} */
let ctx = null;

function getAudioContext() {
  if (typeof window === 'undefined') return null;
  const Ctor = window.AudioContext || window.webkitAudioContext;
  if (!Ctor) return null;
  if (!ctx) ctx = new Ctor();
  return ctx;
}

export function unlockTheaterAudio() {
  const ac = getAudioContext();
  if (!ac) return;
  if (ac.state === 'suspended') void ac.resume();
}

function sfxAllowed() {
  if (typeof window === 'undefined') return false;
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
  return true;
}

/**
 * @param {AudioContext} ac
 * @param {number} when
 * @param {{ gain?: number, freq?: number, dur?: number, type?: BiquadFilterType }} [opts]
 */
function burstNoise(ac, when, opts = {}) {
  const dur = opts.dur ?? 0.035 + Math.random() * 0.025;
  const gain = opts.gain ?? 0.07;
  const bufferSize = Math.max(1, Math.ceil(ac.sampleRate * dur));
  const buffer = ac.createBuffer(1, bufferSize, ac.sampleRate);
  const data = buffer.getChannelData(0);
  for (let i = 0; i < bufferSize; i++) {
    const t = i / bufferSize;
    data[i] = (Math.random() * 2 - 1) * (1 - t) ** 1.6;
  }
  const src = ac.createBufferSource();
  src.buffer = buffer;
  const filter = ac.createBiquadFilter();
  filter.type = opts.type ?? 'bandpass';
  filter.frequency.value = opts.freq ?? 900 + Math.random() * 1400;
  filter.Q.value = 0.7 + Math.random() * 0.5;
  const g = ac.createGain();
  g.gain.setValueAtTime(gain, when);
  g.gain.exponentialRampToValueAtTime(0.0001, when + dur);
  src.connect(filter);
  filter.connect(g);
  g.connect(ac.destination);
  src.start(when);
  src.stop(when + dur + 0.02);
}

const OPENING_SMATTER_MUL = 1.3;

export function playPopcornSmatter(opts = {}) {
  if (!sfxAllowed()) return;
  unlockTheaterAudio();
  const ac = getAudioContext();
  if (!ac) return;
  const now = ac.currentTime;
  const mul = opts.intensityMul ?? 1;
  const count = Math.round((5 + Math.floor(Math.random() * 4)) * mul);
  for (let i = 0; i < count; i++) {
    burstNoise(ac, now + Math.random() * 0.7, {
      gain: 0.045 + Math.random() * 0.035,
      freq: 1100 + Math.random() * 1800,
    });
  }
}

export function playApplauseSmatter(opts = {}) {
  if (!sfxAllowed()) return;
  unlockTheaterAudio();
  const ac = getAudioContext();
  if (!ac) return;
  const now = ac.currentTime;
  const mul = opts.intensityMul ?? 1;
  const count = Math.round((4 + Math.floor(Math.random() * 3)) * mul);
  for (let i = 0; i < count; i++) {
    burstNoise(ac, now + 0.05 + Math.random() * 0.55, {
      gain: 0.03 + Math.random() * 0.025,
      freq: 350 + Math.random() * 450,
      dur: 0.05 + Math.random() * 0.04,
      type: 'lowpass',
    });
  }
}

export function playOpeningSmatter() {
  playPopcornSmatter({ intensityMul: OPENING_SMATTER_MUL });
  playApplauseSmatter({ intensityMul: OPENING_SMATTER_MUL });
}

const INTERACTIVE_APPLAUSE_MS = 3000;

/**
 * @param {{ durationMs?: number, initialEnergy?: number, intensityMul?: number }} [opts]
 * @returns {{ feedMovement: (pixels: number) => void, end: () => void }}
 */
export function beginInteractiveApplause(opts = {}) {
  const noop = { feedMovement: () => {}, end: () => {} };
  if (!sfxAllowed()) return noop;

  unlockTheaterAudio();
  const smatterMul = opts.intensityMul ?? OPENING_SMATTER_MUL;
  playPopcornSmatter({ intensityMul: smatterMul });
  playApplauseSmatter({ intensityMul: smatterMul });

  const ac = getAudioContext();
  if (!ac) return noop;

  const durationMs = opts.durationMs ?? INTERACTIVE_APPLAUSE_MS;
  let energy = opts.initialEnergy ?? 0.22;
  let alive = true;
  let lastSpawn = 0;

  function spawnClap(intensity) {
    if (!alive) return;
    const amp = 0.45 + intensity * 1.35;
    burstNoise(ac, ac.currentTime, {
      gain: (0.022 + Math.random() * 0.02) * amp,
      freq: 280 + Math.random() * 520,
      dur: 0.05 + Math.random() * 0.045,
      type: 'lowpass',
    });
    if (intensity > 0.55 && Math.random() < intensity * 0.85) {
      burstNoise(ac, ac.currentTime + 0.025 + Math.random() * 0.05, {
        gain: (0.018 + Math.random() * 0.016) * amp,
        freq: 300 + Math.random() * 400,
        dur: 0.045 + Math.random() * 0.04,
        type: 'lowpass',
      });
    }
  }

  const tickId = setInterval(() => {
    if (!alive) return;
    energy = Math.max(0.18, energy * 0.988);
    const now = performance.now();
    const interval = 240 - energy * 155;
    if (now - lastSpawn >= interval) {
      spawnClap(energy);
      lastSpawn = now;
    }
  }, 36);

  const endTimer = setTimeout(end, durationMs);

  function end() {
    if (!alive) return;
    alive = false;
    clearInterval(tickId);
    clearTimeout(endTimer);
  }

  function feedMovement(pixels) {
    if (!alive || pixels < 1) return;
    energy = Math.min(1, energy + pixels * 0.0035);
    if (pixels > 18) spawnClap(Math.min(1, energy + 0.15));
  }

  return { feedMovement, end };
}

/**
 * @param {'standard' | 'saveAs'} [level]
 */
export function playSaveApplause(level = 'standard') {
  if (!sfxAllowed()) return;
  unlockTheaterAudio();
  const ac = getAudioContext();
  if (!ac) return;
  const now = ac.currentTime;
  const tiers = {
    standard: { count: 9, span: 0.95, gain: 1 },
    saveAs: { count: 22, span: 2.35, gain: 1.12 },
  };
  const tier = tiers[level] ?? tiers.standard;
  for (let i = 0; i < tier.count; i++) {
    const t = now + (i / tier.count) * tier.span + Math.random() * 0.09;
    burstNoise(ac, t, {
      gain: (0.028 + Math.random() * 0.022) * tier.gain,
      freq: 280 + Math.random() * 520,
      dur: 0.055 + Math.random() * 0.05,
      type: 'lowpass',
    });
    if (level !== 'standard' && i % 3 === 0 && Math.random() < 0.7) {
      burstNoise(ac, t + 0.04 + Math.random() * 0.06, {
        gain: (0.02 + Math.random() * 0.018) * tier.gain,
        freq: 320 + Math.random() * 380,
        dur: 0.05 + Math.random() * 0.04,
        type: 'lowpass',
      });
    }
  }
}
