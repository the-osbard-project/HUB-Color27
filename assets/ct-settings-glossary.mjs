/** Color Time! — Settings glossary (source lock: docs/SETTINGS-INFO.md · docs/KEYS+TIPS.md). */

import { HUB_THEME_CLASSES, HUB_THEME_LABELS } from './dd-app-profile.mjs';

/** @typedef {{ type: 'section', label: string, intro?: string } | { type: 'term', term: string, def: string }} GlossaryEntry */

function contrastGlossaryDef() {
  const names = HUB_THEME_CLASSES.map((id) => HUB_THEME_LABELS[id] ?? id);
  return `Cycle the hull theme tray (${names.join(' · ')}).`;
}

/** @type {GlossaryEntry[]} */
export const CT_SETTINGS_GLOSSARY = [
  { type: 'term', term: 'File', def: 'File icon — New (clear art), Open (.OSS / image), Reset (faders back to defaults; does not wipe the page).' },
  { type: 'term', term: 'Canvas Settings', def: 'Resize icon — Square 800×800 (default), Wide 800×600, Tall 600×800. No custom size or 300 PPI.' },
  { type: 'term', term: 'Save', def: 'Floppy icon opens Save As every time; Ctrl+S quick-saves when a file name is already set. PNG keeps transparency (desk color is preview-only).' },
  { type: 'term', term: 'Backpack', def: 'Coloring pack pages — scroll thumbs in q100; opens into the active layer under any existing art (Undo to reverse); pack toggle switches bundles.' },
  { type: 'section', label: 'Sliders' },
  { type: 'term', term: 'Blend/Splatter', def: 'Left gutter — two jobs, one fader. Marker and Brushy: mix hues where wet ink meets (yellow + blue → green). Dotty, Sunny, Washy, Watery, and Glittery: how much splat. 0 = stamp / no splat. Furry, Starry, Inky, Glowy, Pencil, Crayon, Pastel, Eraser, and Bucket ignore it.' },
  { type: 'term', term: 'Smudge', def: 'Left gutter — Marker and Brushy smear (0 = stamp, keep edges; 100 = watery smear). Does not change hue by itself; pair with Blend/Splatter for green. Other tools ignore it.' },
  { type: 'term', term: 'Opacity', def: 'Right gutter slider — fades the active layer (1–5) or the canvas backdrop when that thumb is selected. Saved with the project.' },
  { type: 'term', term: 'Rounded', def: 'Right gutter slider — square corner roundness (0–50; 50 = full quarter-circle). Squares only.' },
  { type: 'term', term: 'Pressure', def: 'Right gutter slider — stroke pressure (0–100). Marker defaults to 75.' },
  { type: 'term', term: 'Line', def: 'Right gutter slider — brush size for the active draw tool.' },
  { type: 'term', term: 'Rainbow', def: 'Page-color rainbow — icon on the backdrop thumb (desk) or paw row (phone); opens a slider (white → rainbow → black). On phone, shares the full-width horizontal sheet with the other paw-row faders.' },
  { type: 'section', label: 'Arrt' },
  { type: 'term', term: 'Set', def: 'Shape tools — circle, square, triangle, polygon, line, and curve.' },
  { type: 'term', term: 'Cast', def: 'Stage characters (work in progress).' },
  { type: 'term', term: 'Props', def: 'Stage props (work in progress).' },
  {
    type: 'term',
    term: 'Overclock Tools',
    def: 'Pro toolbox — Flatten Layer · Flatten Canvas · Copy · Paste · Grid · Snap · Wand · Select.',
  },
  { type: 'term', term: 'Layers 1–5', def: 'Five drawable layers; tap a tile to select; drag to reorder; Opacity fades the active layer; eraser on a tile clears that layer.' },
  { type: 'term', term: 'Backdrop', def: 'Canvas background thumb — tap for opacity; rainbow icon opens page color; eraser returns color to white.' },
  { type: 'section', label: 'Tools & colors' },
  { type: 'term', term: 'Smudgies!', def: 'Undo one step (Ctrl+Z). History capped at 30 actions.' },
  { type: 'term', term: 'Sharkies!', def: 'Redo one step (Ctrl+Y).' },
  { type: 'term', term: 'OSBARD!!', def: 'Undo all the way back — forgiveness desk reset (asks first).' },
  { type: 'term', term: 'Eraser', def: 'Erase on the active layer.' },
  { type: 'term', term: 'Bucket', def: 'Flood fill with the active color.' },
  { type: 'term', term: 'Pencil', def: 'Waxy graphite stroke.' },
  { type: 'term', term: 'Crayon', def: 'Soft wax stroke.' },
  { type: 'term', term: 'Pastel', def: 'Chalky stroke.' },
  { type: 'term', term: 'Marker', def: 'Watery ink stroke. Blend/Splatter mixes hues; Smudge smears. Both at 0 stamps without green.' },
  { type: 'term', term: 'Star FX', def: 'Color Star! brush — long-press or popup to pick an FX mode.' },
  { type: 'term', term: 'Brushy', def: 'Star FX — paint-brush scatter. Uses Blend/Splatter and Smudge like Marker.' },
  { type: 'term', term: 'Dotty', def: 'Star FX — dotted spray.' },
  { type: 'term', term: 'Furry', def: 'Star FX — fuzzy strokes.' },
  { type: 'term', term: 'Glittery', def: 'Star FX — sparkle glitter.' },
  { type: 'term', term: 'Inky', def: 'Star FX — inky pen line.' },
  { type: 'term', term: 'Glowy', def: 'Star FX — highlighter glow.' },
  { type: 'term', term: 'Sunny', def: 'Star FX — sunny burst.' },
  { type: 'term', term: 'Starry', def: 'Star FX — star sparks.' },
  { type: 'term', term: 'Watery', def: 'Star FX — watery wash.' },
  { type: 'section', label: '"Color Time!" menu' },
  { type: 'term', term: 'Clock hours', def: 'Twelve color wells arranged around the clock face.' },
  { type: 'term', term: 'Clock paw', def: 'Tap PJ\'s paw to random-mix the clock tray colors.' },
  { type: 'term', term: 'Line · Swap · Fill', def: 'Menu paint bar — pick line color, swap line and fill, pick fill for shapes.' },
  { type: 'term', term: 'Contrast', def: contrastGlossaryDef() },
  { type: 'term', term: 'Globe', def: 'Language / translator overlay.' },
  { type: 'term', term: 'Info', def: 'Keyboard shortcuts and Tool Guide (Info icon · Ctrl+,).' },
  { type: 'term', term: '12 Color Wells', def: 'Toe trays on q400 and in the menu — Crayon spectrum (pink + gray) for every draw tool. Clock and CBN can mount other trays.' },
];

export function initCtSettingsGlossary() {
  const mount = document.getElementById('dd-settings-glossary');
  if (!(mount instanceof HTMLElement)) return;

  mount.replaceChildren();

  for (const entry of CT_SETTINGS_GLOSSARY) {
    if (entry.type === 'section') {
      const row = document.createElement('tr');
      row.className = 'dd-settings-glossary__section-row';
      const cell = document.createElement('th');
      cell.colSpan = 2;
      cell.scope = 'colgroup';
      cell.className = 'dd-settings-glossary__section';
      cell.textContent = entry.label;
      if (entry.intro) {
        const intro = document.createElement('p');
        intro.className = 'dd-settings-glossary__intro';
        intro.textContent = entry.intro;
        cell.append(intro);
      }
      row.append(cell);
      mount.append(row);
      continue;
    }

    const row = document.createElement('tr');
    const term = document.createElement('th');
    term.scope = 'row';
    term.className = 'dd-settings-glossary__term';
    term.textContent = entry.term;
    const def = document.createElement('td');
    def.className = 'dd-settings-glossary__def';
    def.textContent = entry.def;
    row.append(term, def);
    mount.append(row);
  }
}
