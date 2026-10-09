import { applyGlitterGelImageData } from './draw/ct-image-filter-pass.mjs';

/** v1 stroke uses 76 — tray reads ~10% sparklier for at-a-glance gel ink. */
export const GLITTER_WELL_INTENSITY = Math.round(76 * 1.1);

/** @typedef {'plain'|'glittery'|'crayon'|'pencil'|'brushy'|'dotty'|'foggy'|'furry'|'oily'|'shadowy'|'soapy'|'sparkly'|'splattery'|'starry'|'sunny'|'washy'|'inky'|'watery'|'glowy'|'bucket'} WellSurfaceTexture */

/** @type {Map<string, string>} */
const dataUrlCache = new Map();

const WELL_W = 56;
const WELL_H = 80;

/**
 * @param {string} hex
 */
function parseHex(hex) {
  const h = String(hex || '').replace(/^#/, '');
  if (h.length === 3) {
    return {
      r: parseInt(h[0] + h[0], 16),
      g: parseInt(h[1] + h[1], 16),
      b: parseInt(h[2] + h[2], 16),
    };
  }
  if (h.length !== 6) return null;
  return {
    r: parseInt(h.slice(0, 2), 16),
    g: parseInt(h.slice(2, 4), 16),
    b: parseInt(h.slice(4, 6), 16),
  };
}

/**
 * @param {number} seed
 */
function makeRng(seed) {
  let s = (seed * 1103515245 + 12345) >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {{ r: number, g: number, b: number }} rgb
 */
function fillWellOval(ctx, rgb) {
  ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  ctx.beginPath();
  ctx.ellipse(WELL_W / 2, WELL_H / 2, WELL_W / 2 - 3, WELL_H / 2 - 3, 0, 0, Math.PI * 2);
  ctx.fill();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} seed
 * @param {(x: number, y: number, r: number) => void} draw
 */
function scatterInOval(ctx, seed, draw) {
  const rng = makeRng(seed);
  const cx = WELL_W / 2;
  const cy = WELL_H / 2;
  const rx = WELL_W / 2 - 5;
  const ry = WELL_H / 2 - 5;
  for (let i = 0; i < 24; i++) {
    const t = rng() * Math.PI * 2;
    const u = Math.sqrt(rng());
    const x = cx + Math.cos(t) * rx * u * 0.92;
    const y = cy + Math.sin(t) * ry * u * 0.92;
    draw(x, y, 0.6 + rng() * 2.8, rng());
  }
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} r
 * @param {number} seed
 */
function drawBlobSplat(ctx, x, y, r, seed) {
  const rng = makeRng(seed + x * 13 + y * 7);
  const n = 5 + Math.floor(rng() * 4);
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const ang = (i / n) * Math.PI * 2 + rng() * 0.5;
    const rad = r * (0.55 + rng() * 0.65);
    const px = x + Math.cos(ang) * rad;
    const py = y + Math.sin(ang) * rad;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
  ctx.fill();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} y
 * @param {number} size
 */
function drawStarSpark(ctx, x, y, size) {
  ctx.beginPath();
  for (let i = 0; i < 4; i++) {
    const a = (i / 4) * Math.PI;
    ctx.moveTo(x, y);
    ctx.lineTo(x + Math.cos(a) * size, y + Math.sin(a) * size);
  }
  ctx.stroke();
}

/**
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x
 * @param {number} topY
 * @param {number} bottomY
 * @param {number} halfW
 * @param {{ r: number, g: number, b: number }} rgb
 * @param {number} alpha
 */
function drawWellDrip(ctx, x, topY, bottomY, halfW, rgb, alpha) {
  const mid = topY + (bottomY - topY) * 0.42;
  ctx.globalAlpha = alpha;
  ctx.fillStyle = `rgb(${Math.max(0, rgb.r - 18)},${Math.max(0, rgb.g - 18)},${Math.max(0, rgb.b - 18)})`;
  ctx.beginPath();
  ctx.moveTo(x, topY);
  ctx.bezierCurveTo(x - halfW, mid, x - halfW * 0.55, bottomY - 1.5, x, bottomY);
  ctx.bezierCurveTo(x + halfW * 0.55, bottomY - 1.5, x + halfW, mid, x, topY);
  ctx.closePath();
  ctx.fill();
  ctx.globalAlpha = 1;
}

/**
 * @param {string} texture
 * @param {string} hex
 * @param {number} wellIndex
 * @param {{ r: number, g: number, b: number }} rgb
 * @param {CanvasRenderingContext2D} ctx
 */
function paintWellTexture(texture, hex, wellIndex, rgb, ctx) {
  const seed = wellIndex * 17.31 + rgb.r * 0.17 + rgb.g * 0.09;

  if (texture === 'glittery') {
    let img;
    try {
      img = ctx.getImageData(0, 0, WELL_W, WELL_H);
    } catch {
      return;
    }
    applyGlitterGelImageData(img, GLITTER_WELL_INTENSITY, seed);
    ctx.putImageData(img, 0, 0);
    return;
  }

  if (texture === 'crayon') {
    ctx.globalAlpha = 0.26;
    ctx.fillStyle = '#ffffff';
    scatterInOval(ctx, seed, (x, y, r) => {
      ctx.beginPath();
      ctx.ellipse(x, y, r * 1.4, r * 0.55, seed * 0.01, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 0.16;
    ctx.fillStyle = '#000000';
    scatterInOval(ctx, seed + 3, (x, y, r) => {
      ctx.fillRect(x - r, y - r * 0.35, r * 2, r * 0.7);
    });
    ctx.globalAlpha = 1;
    return;
  }

  if (texture === 'dotty') {
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    scatterInOval(ctx, seed, (x, y, r) => {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1, r * 0.85), 0, Math.PI * 2);
      ctx.fill();
    });
    return;
  }

  if (texture === 'soapy') {
    ctx.strokeStyle = 'rgba(255,255,255,0.65)';
    ctx.lineWidth = 0.8;
    scatterInOval(ctx, seed, (x, y, r) => {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.5, r * 1.6), 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = 'rgba(255,255,255,0.35)';
      ctx.beginPath();
      ctx.arc(x - r * 0.35, y - r * 0.35, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
    });
    return;
  }

  if (texture === 'splattery') {
    ctx.fillStyle = 'rgba(255,255,255,0.42)';
    scatterInOval(ctx, seed, (x, y, r, rng) => {
      if (rng > 0.45) drawBlobSplat(ctx, x, y, r * 1.5, seed + x);
      else {
        ctx.beginPath();
        ctx.arc(x, y, Math.max(0.8, r), 0, Math.PI * 2);
        ctx.fill();
      }
    });
    return;
  }

  if (texture === 'sparkly' || texture === 'starry') {
    ctx.strokeStyle = 'rgba(255,255,255,0.85)';
    ctx.lineWidth = 0.7;
    scatterInOval(ctx, seed, (x, y, r) => {
      drawStarSpark(ctx, x, y, Math.max(1.2, r * 1.1));
      if (texture === 'starry' && r > 1.4) {
        ctx.fillStyle = 'rgba(255,255,255,0.75)';
        ctx.beginPath();
        ctx.arc(x, y, 0.6, 0, Math.PI * 2);
        ctx.fill();
      }
    });
    return;
  }

  if (texture === 'foggy' || texture === 'furry') {
    const g = ctx.createRadialGradient(WELL_W / 2, WELL_H / 2, 4, WELL_W / 2, WELL_H / 2, WELL_W / 2);
    g.addColorStop(0, 'rgba(255,255,255,0.38)');
    g.addColorStop(0.55, 'rgba(255,255,255,0.08)');
    g.addColorStop(1, texture === 'foggy' ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.12)');
    ctx.fillStyle = g;
    ctx.fill();
    return;
  }

  if (texture === 'oily') {
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.beginPath();
    ctx.ellipse(WELL_W * 0.38, WELL_H * 0.32, WELL_W * 0.22, WELL_H * 0.08, -0.4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.2;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(WELL_W * 0.62, WELL_H * 0.58, WELL_W * 0.14, WELL_H * 0.05, 0.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }

  if (texture === 'shadowy') {
    const g = ctx.createRadialGradient(WELL_W / 2, WELL_H / 2, 6, WELL_W / 2, WELL_H / 2, WELL_W / 2);
    g.addColorStop(0, 'rgba(0,0,0,0)');
    g.addColorStop(0.72, 'rgba(0,0,0,0)');
    g.addColorStop(1, 'rgba(0,0,0,0.35)');
    ctx.fillStyle = g;
    ctx.fill();
    return;
  }

  if (texture === 'sunny') {
    ctx.fillStyle = 'rgba(255,255,200,0.45)';
    scatterInOval(ctx, seed, (x, y, r) => {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(1.2, r * 1.3), 0, Math.PI * 2);
      ctx.fill();
    });
    return;
  }

  if (texture === 'washy' || texture === 'watery') {
    ctx.globalAlpha = 0.28;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(WELL_W / 2, WELL_H * 0.62, WELL_W * 0.34, WELL_H * 0.18, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.18;
    ctx.beginPath();
    ctx.ellipse(WELL_W * 0.35, WELL_H * 0.38, WELL_W * 0.2, WELL_H * 0.12, -0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }

  if (texture === 'brushy') {
    const cx = WELL_W / 2;
    const cy = WELL_H / 2;
    const r = Math.min(WELL_W, WELL_H) * 0.28;
    ctx.globalAlpha = 0.16;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.15;
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.92, cy + r * 0.12);
    ctx.bezierCurveTo(cx - r * 0.15, cy - r * 0.88, cx + r * 0.15, cy + r * 0.88, cx + r * 0.92, cy - r * 0.12);
    ctx.stroke();
    ctx.globalAlpha = 0.09;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.85;
    ctx.beginPath();
    ctx.arc(cx - r * 0.2, cy, r * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.beginPath();
    ctx.arc(cx + r * 0.2, cy, r * 0.34, 0, Math.PI * 2);
    ctx.stroke();
    ctx.globalAlpha = 1;
    return;
  }

  if (texture === 'pencil') {
    ctx.globalAlpha = 0.22;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1.25;
    ctx.lineCap = 'round';
    for (let i = 0; i < 5; i++) {
      const y = WELL_H * (0.22 + i * 0.14);
      ctx.beginPath();
      ctx.moveTo(WELL_W * 0.18, y);
      ctx.quadraticCurveTo(WELL_W * 0.5, y + (i % 2 ? 2 : -2), WELL_W * 0.82, y);
      ctx.stroke();
    }
    ctx.globalAlpha = 0.1;
    ctx.strokeStyle = '#000000';
    ctx.lineWidth = 0.65;
    for (let i = 0; i < 4; i++) {
      const y = WELL_H * (0.28 + i * 0.14);
      ctx.beginPath();
      ctx.moveTo(WELL_W * 0.22, y + 0.5);
      ctx.lineTo(WELL_W * 0.78, y + 0.5);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return;
  }

  if (texture === 'inky') {
    ctx.globalAlpha = 0.32;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.beginPath();
    ctx.ellipse(WELL_W / 2, WELL_H * 0.58, WELL_W * 0.3, WELL_H * 0.11, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 0.18;
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 0.65;
    ctx.lineCap = 'round';
    for (let i = 0; i < 3; i++) {
      const y = WELL_H * (0.34 + i * 0.11);
      ctx.beginPath();
      ctx.moveTo(WELL_W * 0.24, y);
      ctx.lineTo(WELL_W * 0.76, y + (i - 1) * 0.6);
      ctx.stroke();
    }
    ctx.globalAlpha = 1;
    return;
  }

  if (texture === 'glowy') {
    const g = ctx.createRadialGradient(WELL_W / 2, WELL_H / 2, 2, WELL_W / 2, WELL_H / 2, WELL_W * 0.44);
    g.addColorStop(0, 'rgba(255,255,255,0.62)');
    g.addColorStop(0.42, 'rgba(255,255,255,0.2)');
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.38)';
    scatterInOval(ctx, seed + 5, (x, y, r) => {
      ctx.beginPath();
      ctx.arc(x, y, Math.max(0.7, r * 0.55), 0, Math.PI * 2);
      ctx.fill();
    });
    return;
  }

  if (texture === 'bucket') {
    const cx = WELL_W / 2;
    const cy = WELL_H / 2 + WELL_H * 0.04;
    const rings = [
      { rx: WELL_W * 0.36, ry: WELL_H * 0.26 },
      { rx: WELL_W * 0.28, ry: WELL_H * 0.2 },
      { rx: WELL_W * 0.2, ry: WELL_H * 0.14 },
    ];

    ctx.lineCap = 'round';
    for (let i = 0; i < rings.length; i += 1) {
      const { rx, ry } = rings[i];
      ctx.strokeStyle = 'rgba(255,255,255,0.5)';
      ctx.lineWidth = 0.85;
      ctx.beginPath();
      ctx.ellipse(cx, cy, rx, ry, 0, 0, Math.PI * 2);
      ctx.stroke();
      ctx.strokeStyle = 'rgba(0,0,0,0.2)';
      ctx.lineWidth = 0.45;
      ctx.beginPath();
      ctx.ellipse(cx, cy + 0.6, rx * 0.96, ry * 0.94, 0, 0, Math.PI * 2);
      ctx.stroke();
    }

    const rng = makeRng(seed + 11);
    const dripCount = 2 + Math.floor(rng() * 2);
    for (let d = 0; d < dripCount; d += 1) {
      const x = cx + (d - (dripCount - 1) / 2) * (WELL_W * 0.14) + (rng() - 0.5) * 4;
      const top = WELL_H * (0.1 + rng() * 0.06);
      const ringIdx = Math.floor(rng() * rings.length);
      const ring = rings[ringIdx];
      const bottom = cy + ring.ry * (0.55 + rng() * 0.35);
      drawWellDrip(ctx, x, top, bottom, 2.2 + rng() * 1.8, rgb, 0.72 + rng() * 0.18);
    }

    ctx.globalAlpha = 0.42;
    ctx.fillStyle = `rgb(${Math.min(255, rgb.r + 28)},${Math.min(255, rgb.g + 28)},${Math.min(255, rgb.b + 28)})`;
    ctx.beginPath();
    ctx.ellipse(cx, cy + rings[0].ry * 0.35, WELL_W * 0.11, WELL_H * 0.045, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1;
    return;
  }
}

/**
 * Raster well surface for tray ovals (same hues as OSS Brand — texture only).
 * @param {string} texture
 * @param {string} hex
 * @param {number} [wellIndex=0]
 */
export function wellSurfaceDataUrl(texture, hex, wellIndex = 0) {
  if (!texture || texture === 'plain') return '';

  const color = String(hex || '#888888').trim();
  const cacheKey = `${texture}|${color.toLowerCase()}|${wellIndex}`;
  const cached = dataUrlCache.get(cacheKey);
  if (cached) return cached;

  const rgb = parseHex(color);
  if (!rgb) return '';

  const c = document.createElement('canvas');
  c.width = WELL_W;
  c.height = WELL_H;
  const ctx = c.getContext('2d');
  if (!ctx) return '';

  fillWellOval(ctx, rgb);
  paintWellTexture(texture, color, wellIndex, rgb, ctx);

  const url = c.toDataURL('image/png');
  dataUrlCache.set(cacheKey, url);
  return url;
}

/** @deprecated use wellSurfaceDataUrl('glittery', hex, seed) */
export function glitterWellDataUrl(hex, seed = 0) {
  return wellSurfaceDataUrl('glittery', hex, seed);
}

/** @deprecated CT uses wellTextureForTool in ct-tool-presets.mjs */
export function resolveWellSurfaceTexture() {
  return 'plain';
}

/**
 * CSS class suffix for tray chrome (e.g. color-wells--glittery).
 * @param {WellSurfaceTexture | 'plain'} texture
 */
export function wellSurfaceTrayClass(texture) {
  if (!texture || texture === 'plain') return '';
  if (texture === 'glittery') return 'glittery';
  if (texture === 'crayon') return 'crayon';
  if (texture === 'pencil') return 'pencil';
  if (texture === 'bucket') return 'bucket';
  return `brush-${texture}`;
}

/**
 * @param {HTMLElement} wellEl
 * @param {string} hex
 * @param {number} wellIndex
 * @param {WellSurfaceTexture | 'plain'} texture
 */
export function applyWellSurface(wellEl, hex, wellIndex, texture = 'plain') {
  const surface = texture && texture !== 'plain' ? texture : 'plain';
  wellEl.classList.remove('color-well--glittery', 'color-well--textured', 'dd-ct-well--textured');
  for (const cls of [...wellEl.classList]) {
    if (cls.startsWith('color-well--surface-')) wellEl.classList.remove(cls);
  }

  if (surface === 'plain') {
    wellEl.style.backgroundImage = '';
    wellEl.style.backgroundSize = '';
    wellEl.style.backgroundPosition = '';
    wellEl.style.backgroundRepeat = '';
    wellEl.style.backgroundColor = hex;
    return;
  }

  const url = wellSurfaceDataUrl(surface, hex, wellIndex);
  if (!url) {
    wellEl.style.backgroundImage = '';
    wellEl.style.backgroundSize = '';
    wellEl.style.backgroundPosition = '';
    wellEl.style.backgroundRepeat = '';
    wellEl.style.backgroundColor = hex;
    return;
  }

  wellEl.style.backgroundColor = hex;
  wellEl.style.backgroundImage = `url("${url}")`;
  wellEl.style.backgroundSize = 'cover';
  wellEl.style.backgroundPosition = 'center';
  wellEl.style.backgroundRepeat = 'no-repeat';
  wellEl.classList.add('color-well--textured', 'dd-ct-well--textured');
  if (surface === 'glittery') wellEl.classList.add('color-well--glittery');
  wellEl.classList.add(`color-well--surface-${surface}`);
}
