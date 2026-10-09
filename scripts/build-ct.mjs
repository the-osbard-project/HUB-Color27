/**
 * Color Time production assets:
 * - Concat critical + deferred CSS (keeps url() paths under assets/styles/)
 * - Bundle assets/dd.mjs → assets/dd.bundle.js
 */
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createRequire } from 'node:module';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, '..');
const styles = join(root, 'assets', 'styles');

const CRITICAL = [
  'theme-royal-purple.css',
  'theme-huglo.css',
  'theme-bones.css',
  'ct-brand.css',
  'ct-a11y.css',
  'ct-fonts.css',
  'dd-layout.css',
  'dd-tokens.css',
  'dd-phone-stack.css',
  'dd-phone-wide-stack.css',
  'ct-canvas.css',
  'ct-rails.css',
  'ct-q400.css',
  'ct-well-textures.css',
  'ct-tool-cursor.css',
  'ct-sliders.css',
  'ct-paint-bar.css',
  'ct-welcome.css',
  'ct-theater.css', /* opening popcorn must load with intro (not deferred) */
  'ct27-desk.css',
];

const DEFERRED = [
  'dd-hub.css',
  'dd-dialog.css',
  'dd-globe-translator.css',
  'ct-settings.css',
  'ct-hub-legal.css',
  'ct-hub-info.css',
  'ct-q300-shapes.css',
  'ct-overclock.css',
  'ct-save-as.css',
  'ct-tool-popups.css',
  'ct-phone-hub.css',
  'ct-hub-head.css',
  'ct-hub-clock.css',
  'ct-a11y-contrast.css',
];

function concatCss(names, outName) {
  const parts = names.map((name) => {
    const path = join(styles, name);
    const body = readFileSync(path, 'utf8').trim();
    return `/* === ${name} === */\n${body}\n`;
  });
  const out = join(styles, outName);
  writeFileSync(out, parts.join('\n'), 'utf8');
  console.log(`wrote ${outName} (${parts.length} files, ${Buffer.byteLength(parts.join('\n'))} bytes)`);
}

concatCss(CRITICAL, 'ct-critical.css');
concatCss(DEFERRED, 'ct-deferred.css');

const require = createRequire(import.meta.url);
let esbuild;
try {
  esbuild = require('esbuild');
} catch {
  console.error('esbuild not found — run: npm install --save-dev esbuild');
  process.exit(1);
}

const outfile = join(root, 'assets', 'dd.bundle.js');
mkdirSync(dirname(outfile), { recursive: true });
await esbuild.build({
  entryPoints: [join(root, 'assets', 'dd.mjs')],
  bundle: true,
  format: 'esm',
  platform: 'browser',
  target: 'es2019',
  minify: true,
  outfile,
  logLevel: 'info',
});
console.log(`wrote assets/dd.bundle.js`);
