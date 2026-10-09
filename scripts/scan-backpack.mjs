#!/usr/bin/env node
/**
 * Scan assets/backpack/bundle-NN/ and write pages.json from image filenames.
 * Sort by leading digits; label at runtime = full basename without extension.
 *
 * Examples:
 *   1.svg              → label "1"
 *   1 - Forest.svg     → label "1 - Forest"
 *   2 - Dragon Cave.png → label "2 - Dragon Cave"
 *
 * Usage: node scripts/scan-backpack.mjs
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.join(__dirname, '..', 'assets', 'backpack');
const IMAGE_EXT = new Set(['.png', '.webp', '.jpg', '.jpeg', '.svg']);

/** @param {string} name */
function sortKey(name) {
  const m = /^(\d+)/.exec(name);
  return m ? Number(m[1]) : Number.MAX_SAFE_INTEGER;
}

if (!fs.existsSync(ROOT)) {
  console.error('Missing', ROOT);
  process.exit(1);
}

let bundleCount = 0;

for (const dir of fs.readdirSync(ROOT)) {
  if (!/^bundle-\d+$/i.test(dir)) continue;
  const full = path.join(ROOT, dir);
  if (!fs.statSync(full).isDirectory()) continue;

  const files = fs
    .readdirSync(full)
    .filter((f) => f !== 'pages.json' && IMAGE_EXT.has(path.extname(f).toLowerCase()))
    .filter((f) => /^\d+/.test(f))
    .sort((a, b) => sortKey(a) - sortKey(b) || a.localeCompare(b));

  const outPath = path.join(full, 'pages.json');
  if (!files.length) {
    if (fs.existsSync(outPath)) fs.unlinkSync(outPath);
    continue;
  }

  fs.writeFileSync(outPath, `${JSON.stringify(files, null, 2)}\n`, 'utf8');
  bundleCount += 1;
  console.log(`${dir}: ${files.length} page(s) → pages.json`);
}

console.log(bundleCount ? `Done — ${bundleCount} bundle(s).` : 'No bundle-NN folders with numbered images.');
