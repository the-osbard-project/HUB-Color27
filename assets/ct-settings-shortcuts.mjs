/** Color Time! — Settings keyboard shortcuts panel (source lock: docs/KEYS+TIPS.md). */

/** @typedef {{ keys: string, label: string }} ShortcutEntry */
/** @typedef {{ label: string, items: ShortcutEntry[] }} ShortcutSection */

/** @type {ShortcutSection[]} */
export const CT_SETTINGS_SHORTCUTS = [
  {
    label: 'Draw tools',
    items: [
      { keys: 'F', label: 'Bucket' },
      { keys: 'N', label: 'Pencil' },
      { keys: 'C', label: 'Crayon' },
      { keys: 'L', label: 'Pastel' },
      { keys: 'M', label: 'Marker' },
      { keys: 'E', label: 'Eraser' },
      { keys: 'B', label: 'Brushy (Color ★)' },
      { keys: 'P', label: 'Inky (Pen)' },
    ],
  },
  {
    label: 'Overclock',
    items: [
      { keys: 'V', label: 'Select' },
      { keys: 'W', label: 'Wand' },
      { keys: 'Ctrl+Shift+\'', label: 'Grid' },
      { keys: 'Ctrl+Shift+;', label: 'Snap' },
    ],
  },
  {
    label: 'Color',
    items: [
      { keys: '/', label: 'Line target' },
      { keys: "'", label: 'Fill target' },
      { keys: 'Shift+click', label: 'Well → Fill color' },
      { keys: '← →', label: 'Cycle wells' },
    ],
  },
  {
    label: 'Desk',
    items: [
      { keys: 'T', label: 'Contrast (theme)' },
      { keys: 'Space', label: 'Menu · Paw mix' },
      { keys: 'Esc', label: 'Close layer' },
      { keys: 'Del', label: 'Delete selection' },
      { keys: '↑ ↓', label: 'Nudge fader' },
    ],
  },
  {
    label: 'Chords',
    items: [
      { keys: 'Ctrl+Z', label: 'Undo' },
      { keys: 'Ctrl+Y', label: 'Redo' },
      { keys: 'Ctrl+S', label: 'Save' },
      { keys: 'Ctrl+N', label: 'New' },
      { keys: 'Ctrl+O', label: 'Open' },
      { keys: 'Ctrl+,', label: 'Info' },
      { keys: 'Ctrl+Shift+F', label: 'Fullscreen' },
    ],
  },
];

/** @param {string} keys */
function renderKeys(keys) {
  const frag = document.createDocumentFragment();
  keys.split(/\s+/).forEach((part, i) => {
    if (i > 0) {
      const sep = document.createElement('span');
      sep.className = 'dd-settings-shortcuts__sep';
      sep.textContent = '·';
      sep.setAttribute('aria-hidden', 'true');
      frag.append(sep);
    }
    const kbd = document.createElement('kbd');
    kbd.className = 'dd-settings-shortcuts__key';
    kbd.textContent = part;
    frag.append(kbd);
  });
  return frag;
}

export function initCtSettingsShortcuts() {
  const mount = document.getElementById('dd-settings-shortcuts');
  if (!(mount instanceof HTMLElement)) return;

  mount.replaceChildren();

  for (const section of CT_SETTINGS_SHORTCUTS) {
    const heading = document.createElement('p');
    heading.className = 'dd-settings-shortcuts__heading';
    heading.textContent = section.label;
    mount.append(heading);

    const grid = document.createElement('div');
    grid.className = 'dd-settings-shortcuts__grid';
    grid.setAttribute('role', 'list');
    grid.setAttribute('aria-label', `${section.label} shortcuts`);

    for (const item of section.items) {
      const row = document.createElement('div');
      row.className = 'dd-settings-shortcuts__item';
      row.setAttribute('role', 'listitem');

      const keyWrap = document.createElement('span');
      keyWrap.className = 'dd-settings-shortcuts__keys';
      keyWrap.append(renderKeys(item.keys));

      const label = document.createElement('span');
      label.className = 'dd-settings-shortcuts__label';
      label.textContent = item.label;

      row.append(keyWrap, label);
      grid.append(row);
    }

    mount.append(grid);
  }
}
