/** Color Time! — Studio glitter gel raster for q400 Star icon (image-filter-pass MSOT). */

const GLITTER_INTENSITY = Math.round(76 * 1.1);

function hash01(x, y, seed) {
  const v = Math.sin((x + 1) * 12.9898 + (y + 1) * 78.233 + seed * 0.017) * 43758.5453;
  return v - Math.floor(v);
}

function applyGrainImageData(img, intensity, seed) {
  const d = img.data;
  const w = img.width;
  const h = img.height;
  const t = intensity / 100;
  if (t <= 0) return;
  const amt = t * 42;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      if (d[i + 3] === 0) continue;
      const n = (hash01(x, y, seed) - 0.5) * amt;
      d[i] = Math.max(0, Math.min(255, d[i] + n));
      d[i + 1] = Math.max(0, Math.min(255, d[i + 1] + n));
      d[i + 2] = Math.max(0, Math.min(255, d[i + 2] + n));
    }
  }
}

/** Studio `applyGlitterGelImageData` */
function applyGlitterGelImageData(img, intensity, seed) {
  applyGrainImageData(img, Math.max(1, intensity * 0.22), seed);
  const d = img.data;
  const w = img.width;
  const h = img.height;
  const t = intensity / 100;
  if (t <= 0) return;
  const sparkleProb = 0.058 * t;
  const shimmerProb = 0.038 * t;
  for (let y = 0; y < h; y++) {
    for (let x = 0; x < w; x++) {
      const i = (y * w + x) * 4;
      const a = d[i + 3];
      if (a === 0) continue;
      const h01 = hash01(x, y, seed + 8.3);
      if (h01 < sparkleProb) {
        d[i] = 255;
        d[i + 1] = 255;
        d[i + 2] = 255;
        d[i + 3] = Math.min(255, Math.max(a, Math.round(a + 85 * t)));
      } else if (h01 < sparkleProb + shimmerProb) {
        d[i] = Math.min(255, Math.round(d[i] + 38 * t));
        d[i + 1] = Math.min(255, Math.round(d[i + 1] + 38 * t));
        d[i + 2] = Math.min(255, Math.round(d[i + 2] + 46 * t));
      }
    }
  }
}

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
 * @param {string} hex
 * @param {number} [size=128]
 * @param {number} [seed=7]
 */
export function glitterIconDataUrl(hex, size = 128, seed = 7) {
  const rgb = parseHex(hex);
  if (!rgb) return '';

  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d');
  if (!ctx) return '';

  ctx.fillStyle = `rgb(${rgb.r},${rgb.g},${rgb.b})`;
  ctx.fillRect(0, 0, size, size);

  let img;
  try {
    img = ctx.getImageData(0, 0, size, size);
  } catch {
    return c.toDataURL('image/png');
  }

  applyGlitterGelImageData(img, GLITTER_INTENSITY, seed);
  ctx.putImageData(img, 0, 0);
  return c.toDataURL('image/png');
}

/** Apply Studio glitter gel to q400 Color Star icon. */
export function initGlitterStarIcon() {
  const icon = document.querySelector('#ct-btn-star i.ph-star');
  if (!(icon instanceof HTMLElement)) return;

  const styles = getComputedStyle(document.body);
  const gold = styles.getPropertyValue('--ct-icon-star').trim() || '#cab33f';
  const url = glitterIconDataUrl(gold);
  if (!url) return;

  document.body.style.setProperty('--ct-star-glitter-url', `url("${url}")`);
  icon.classList.add('ct-q400-icon--glittery');
}
