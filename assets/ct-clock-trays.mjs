/** Color Time! — twelve hour trays (Studio CT clock contract). */

/** @typedef {{ hour: number, label: string, trayId: string, colors: readonly string[] }} CtClockTray */

export const CT_CLOCK_TRAYS = Object.freeze([
  {
    hour: 1,
    label: 'Pencil',
    trayId: 'pencil:graphite',
    colors: Object.freeze([
      '#ef233c', '#F9A825', '#1976D2', '#7B1FA2', '#c8c6c2', '#6e6c69',
      '#45423f', '#2c2926', '#4a4540', '#3a3530', '#252220', '#ece8e2',
    ]),
  },
  {
    hour: 2,
    label: 'Crayon',
    trayId: 'crayon:default',
    colors: Object.freeze([
      '#EE204D', '#FF7538', '#F5C542', '#58b42d', '#1C99FF', '#0D4A85',
      '#6c4ac8', '#FF6AD5', '#7a3044', '#9E9E9E', '#4E342E', '#000000',
    ]),
  },
  {
    hour: 3,
    label: 'Pastel',
    trayId: 'pastel:chalky',
    colors: Object.freeze([
      '#F0F0F0', '#FFD600', '#FF9800', '#E53935', '#FF4081', '#7E57C2',
      '#42A5F5', '#4DB6AC', '#7CB342', '#8D6E63', '#9E9E9E', '#212121',
    ]),
  },
  {
    hour: 4,
    label: 'Marker',
    trayId: 'marker:watercolor',
    colors: Object.freeze([
      '#E53935', '#FF9220', '#FFC107', '#66BB3A', '#2E7D4F', '#26C6DA',
      '#0087f9', '#5E35B1', '#D81B9A', '#FFA8D2', '#4E342E', '#141414',
    ]),
  },
  {
    hour: 5,
    label: 'Brushy',
    trayId: 'brush:brushy',
    colors: Object.freeze([
      '#baa846', '#A8ADB5', '#ef233c', '#ff8c00', '#ffe94a', '#CCFF00',
      '#38b000', '#00c2a8', '#00E5FF', '#006BE6', '#5836b5', '#E040FB',
    ]),
  },
  {
    hour: 6,
    label: 'Furry',
    trayId: 'brush:furry',
    colors: Object.freeze([
      '#ECCAB2', '#0087f9', '#C9B9A6', '#BE7A72', '#C5703F', '#95502C',
      '#B36854', '#86674A', '#744C2D', '#6E3722', '#523F52', '#332833',
    ]),
  },
  {
    hour: 7,
    label: 'Glittery',
    trayId: 'brush:glittery',
    colors: Object.freeze([
      '#E31937', '#D4008F', '#FF85C8', '#FF7A00', '#FFEE00', '#9AE942',
      '#2DB84A', '#00D4FF', '#0066FF', '#7B2D8E', '#222222', '#C9CCD6',
    ]),
  },
  {
    hour: 8,
    label: 'Inky',
    trayId: 'brush:inky',
    colors: Object.freeze([
      '#121212', '#FFF3E0', '#AD1457', '#D32F2F', '#FF7043', '#EF6C00',
      '#F9A825', '#2E7D32', '#00897B', '#1565C0', '#7B1FA2', '#4E342E',
    ]),
  },
  {
    hour: 9,
    label: 'Glowy',
    trayId: 'brush:glowy',
    colors: Object.freeze([
      '#FF3366', '#FF7918', '#FFB000', '#FFFF00', '#D4FF00', '#00D040',
      '#00D4C0', '#4DC4FF', '#0088FF', '#7A55E0', '#C400FF', '#FF50C8',
    ]),
  },
  {
    hour: 10,
    label: 'Sunny',
    trayId: 'brush:sunny',
    colors: Object.freeze([
      '#FFF9C4', '#FFEE58', '#FFE94A', '#FFC107', '#FFAB40', '#FF9220',
      '#FF7043', '#FF5722', '#E53935', '#D32F2F', '#AB47BC', '#7B1FA2',
    ]),
  },
  {
    hour: 11,
    label: 'Starry',
    trayId: 'brush:starry',
    colors: Object.freeze([
      '#baa846', '#c9862d', '#e8a030', '#d4af37', '#cf6f3e', '#c94b4b',
      '#b84d8c', '#7b5ea7', '#4a7cb8', '#3d9a6e', '#8b6914', '#9a7b4f',
    ]),
  },
  {
    hour: 12,
    label: 'Watery',
    trayId: 'brush:watery',
    colors: Object.freeze([
      '#b3e5fc', '#4fc3f7', '#26C6DA', '#29b6f6', '#039be5', '#1e88e5',
      '#0087f9', '#5E35B1', '#7e57c2', '#ab47bc', '#5c6bc0', '#00897b',
    ]),
  },
]);

/** @param {number} hour 1–12 @returns {string} */
export function getCtHourTitle(hour) {
  const h = Math.round(Number(hour));
  const entry = CT_CLOCK_TRAYS[h - 1];
  if (!entry) return `Tray ${hour}`;
  return `${h} — ${entry.label}`;
}

/** @param {number} hour 1–12 @returns {string[]} */
export function getCtHourPalette(hour) {
  const entry = getCtTrayByHour(hour);
  return entry?.colors?.length ? [...entry.colors] : [];
}

/** @param {number} hour 1–12 @returns {CtClockTray | null} */
export function getCtTrayByHour(hour) {
  const h = Math.round(Number(hour));
  if (!Number.isFinite(h) || h < 1 || h > 12) return null;
  return CT_CLOCK_TRAYS[h - 1] ?? null;
}

/** @param {string | null | undefined} trayId @returns {number | null} hour 1–12 */
export function getCtHourForTrayId(trayId) {
  const id = String(trayId || '').trim();
  if (!id) return null;
  const idx = CT_CLOCK_TRAYS.findIndex((entry) => entry.trayId === id);
  if (idx >= 0) return idx + 1;
  if (id.startsWith('pencil:')) return 1;
  if (id.startsWith('crayon:')) return 2;
  if (id.startsWith('pastel:')) return 3;
  if (id.startsWith('marker:')) return 4;
  if (id === 'brush:brushy' || id === 'brush:dotty') return 5;
  if (id === 'brush:furry' || id === 'brush:fuzzy') return 6;
  if (id === 'brush:glittery' || id === 'pen:glittery') return 7;
  if (id === 'brush:inky' || id === 'pen:calligraphy') return 8;
  if (id === 'brush:glowy' || id === 'pen:glowy') return 9;
  if (id === 'brush:sunny') return 10;
  if (id === 'brush:starry') return 11;
  if (id === 'brush:watery' || id === 'brush:washy') return 12;
  return null;
}
