# Color Time! — KEYS + TIPS

**Purpose:** Source lock for **keyboard shortcuts** and **hover hints** (slider labels, control `title`s, HUB gestures).

**Related:** [`SETTINGS-INFO.md`](SETTINGS-INFO.md) (Tool Guide glossary) · [`BUILD.md`](BUILD.md) · Studio import: `HUB-O-Studio26/docs/legacy/V2-SHORTCUTS-NOTES.md` · `packages/ui/studio-shortcuts.mjs`

**Legend:** **Wired** = works in CT26 today · **Studio** = OSS desk chart · **Planned** = not wired yet

---

## Keyboard shortcuts — wired in CT26

| Action | Shortcut | Notes |
|--------|----------|--------|
| Undo (Smudgies!) | **Ctrl+Z** / **⌘+Z** | OSBARD!! desk · 30-step cap |
| Redo (Sharkies!) | **Ctrl+Y** / **⌘+Y** · **Ctrl+Shift+Z** / **⌘+Shift+Z** | |
| Quick save | **Ctrl+S** / **⌘+S** | When a file name is set; otherwise **Save As** |
| Open Color Time HUB | **Space** | Also runs random tray mix (Pawlettizer) |
| Random tray mix (HUB open) | **Space** | Pawlettizer — blocked while mix animation runs |
| Close popup / HUB / Globe | **Escape** | Tool popups · Gear settings · CT HUB |
| Delete floating selection | **Delete** · **Backspace** | **Select** on · something selected |
| Copy floating selection | **Ctrl+C** / **⌘+C** | Select mode · something selected (or Overclock **Copy**) |
| Paste floating selection | **Ctrl+V** / **⌘+V** | Pastes with a nudge; turns Select on (or Overclock **Paste**) |
| Nudge floating selection | **←↑↓→** | **10** px · **Shift** 100 · **Ctrl** 50 · **Alt** 1 · **Ctrl+Shift** 25 |
| Flatten Layer / Canvas | Overclock buttons | Bake objects → pixels (active layer / all layers) |
| Select (Overclock) | **V** | Arrange mode — bounding boxes; no drawing |
| Nudge slider | **↑** · **↓** | While focus is on a gutter or Overclock fader |
| Fullscreen toggle | **Ctrl+Shift+F** / **⌘+Shift+F** | Browser Full Screen API · Krita-aligned |
| Magic Wand | **W** | Toggle Overclock wand |
| Snap | **Ctrl+Shift+;** / **⌘+Shift+;** | Toggle snap to edge / grid / center · Krita snap-to-grid chord |
| Grid | **Ctrl+Shift+'** / **⌘+Shift+'** | Toggle 20×20 canvas grid (42 px cells) |
| New | **Ctrl+N** / **⌘+N** | Clear drawing · line art · layers |
| Open | **Ctrl+O** / **⌘+O** | Project or image picker |
| Settings (Gear) | **Ctrl+,** / **⌘+,** | Opens HUB if needed · toggles Info panel |
| CT HUB footer | Privacy | Privacy & Web Safety overlay · PDF + osbard.com link |
| Bucket | **F** | Krita Fill key |
| Pencil | **N** | |
| Crayon | **C** | |
| Pastel | **L** | |
| Marker | **M** | |
| Eraser | **E** | |
| Brushy (Color ★) | **B** | Star tool + Brushy FX |
| Inky / Pen (Color ★) | **P** | Star tool + Inky FX |
| Line color target | **/** | Then **←** · **→** cycle wells |
| Fill color target | **'** | Then **←** · **→** cycle wells |
| Well → Fill color | **Shift+click** well | Assigns Fill without switching Line/Fill target |
| Contrast (theme cycle) | **T** | Same as HUB Contrast button |

**In-app list:** Gear → **Settings** → keyboard shortcuts grid (source: `assets/ct-settings-shortcuts.mjs`).

**Not wired yet:** OSBARD!! (undo all) · **O** popup · Peeka / Boo · viewport rotate/zoom keys.

---

## Studio OSS shortcut chart (import)

Imported from Studio `V2-SHORTCUTS-NOTES.md` + `studio-shortcuts.mjs`. CT ships a **patron subset** — letter keys are documented here for parity; wire in a later pass.

### UI / viewport

| Key | OSS action | CT26 |
|-----|------------|------|
| **3** | — | — (hull override removed) |
| **4** | Rotate view left (~10°) | Studio (hull override removed) |
| **5** | Recenter / reset view | Studio |
| **6** | Rotate view right (~10°) | Studio |
| **9** | — | — (hull override removed) |
| **+ / −** | Zoom in / out | Studio |
| **7** | Zoom 100% + center | Studio |
| **A** | Peeka — glass ↔ Standard desk | Studio |
| **Shift+A** | Boo — hide / show q100 · q300 | Studio |
| **Ctrl+O** / **⌘+O** | Open project / image | **Wired** |
| **Ctrl+N** / **⌘+N** | New document | **Wired** |
| **Ctrl+Shift+F** | Browser fullscreen | **Wired** (was **F**) |
| **Q** | q-hide / q-show rails? | Studio · TBD |

### Drawing tools (q400 letters)

| Key | OSS action | CT26 |
|-----|------------|------|
| **B** | Brush / Color ★ (Star FX in Studio) | **Wired** (Brushy) |
| **U** | Bucket | **F** in CT (Bucket · Krita Fill) |
| **C** | Crayon | **Wired** |
| **M** | Marker | **Wired** |
| **L** | Pastel | **Wired** |
| **N** | Pen | **Wired** (Pencil) |
| **I** | Pencil | **N** in CT (Pencil) |
| **E** | Eraser | **Wired** |
| **O** | OSBARD!! popup | Planned |
| **P** | Pen (CT Inky) | **Wired** (Inky) |
| **F** | Paint bucket | **Wired** (Bucket · was **G**) |
| **G** | — | freed (was Bucket) |
| **T** | Theme / Contrast | **Wired** |

### Select / Overclock

| Key | OSS action | CT26 |
|-----|------------|------|
| **V** | Select mode | **Wired** |
| **W** | Magic Wand | **Wired** |
| **Ctrl+Shift+;** | Snap on/off | **Wired** (was Shift+5) |
| **Ctrl+Shift+'** | Grid on/off | **Wired** (was Shift+3) |
| **←↑↓→** | Nudge selection | **Wired** — 10 / Shift 100 / Ctrl 50 / Alt 1 / Ctrl+Shift 25 |
| **Ctrl+C** / **⌘+C** | Copy selection | **Wired** |
| **Ctrl+V** / **⌘+V** | Paste selection | **Wired** — nudged each paste |
| **Ctrl+Shift** + corner drag | Scale about center (equal sides) | **Wired** — Inkscape-style |
| **Esc** | Cancel edit · clear selection | **Wired** (close layers / HUB / popups) |
| **Ctrl+click** | Multi-select toggle | Planned (Select box uses Shift/Ctrl today) |

---

## Hover hints — gutter & Star FX faders

Shown on **hover** and while **dragging** (and briefly after **↑/↓** nudge). Defined in `assets/ct-vsliders.mjs` (`CT_VSLIDER_SPECS`).

| Control | Hint format | Location |
|---------|-------------|----------|
| Smoothing | `Smoothing - {n}% · ↑↓` | Left gutter |
| Simplify | `Simplify - {n}% · ↑↓` | Left gutter |
| Blend/Splatter | `Blend/Splatter - {n}% · ↑↓` | Left gutter · Marker/Brushy hue mix + Star FX splat |
| Smudge | `Smudge - {n}% · ↑↓` | Left gutter · Marker/Brushy smear |
| Opacity | `Opacity - {n}% · ↑↓` | Right gutter |
| Rounded | `Rounded - {n} · ↑↓` | Right gutter · squares only · **0–50** |
| Pressure | `Pressure - {n}% · ↑↓` | Right gutter |
| Line (brush size) | `Line - {n}px · ↑↓` | Right gutter |
| Page color (Rainbow) | Rainbow icon on page-color thumb · phone paw icon | Opens vertical (desk) / horizontal (phone) slider popup |

Phone/tablet: gutters hidden; same values via **icon + number** around the paw (page color opens rainbow popup).

Faders also **glow** (Huglo LED) while hovered or dragged.

---

## Hover hints — controls (`title` / `aria-label`)

| Surface | Control | Hint |
|---------|---------|------|
| q100 | Save | Save As — **Ctrl+S** |
| q100 | New / Open | New — **Ctrl+N** · Open — **Ctrl+O** |
| q400 | Draw tools | Eraser **E** · Bucket **F** · Pencil **N** · Crayon **C** · Pastel **L** · Marker **M** · Star **B** / **P** |
| q300 | Overclock Tools | Overclock Tools (panel) |
| q300 · Layers | Backdrop | Canvas background — tap to edit rainbow slider |
| q300 · Layers | Backdrop eraser | Return canvas color slider to top |
| q300 · Set | Line | Line — drag to draw. Hold **Shift** for angle snap. |
| q300 · Set | Curve | Curve — drag for line, then drag again to bend. |
| Overclock | Grid | 20×20 canvas grid — **Ctrl+Shift+'** |
| Overclock | Snap | Snap to canvas edge, grid, and center — **Ctrl+Shift+;** |
| Overclock | Wand | Delete connected pixels on the **active** paint layer (tolerance 32) — **W**. Turns Select off. |
| Overclock | Select | Arrange mode — bounding boxes on active-layer objects; no drawing — **V**. Starts **off** each session. Turns Wand off. |
| Overclock | Flat Layer / Flat Canvas | Bake floating objects → pixels (active layer / all layers). |
| Overclock | Copy / Paste | Copy or paste floating selection — **Ctrl+C** / **Ctrl+V**. |
| q200 gutters | Smooth / Simplify / Blend/Splatter / Smudge · Opacity / Rounded / Pressure / Line | `{name} - {n} · ↑↓` |
| CT HUB | Clock paw | Tap PJ's paw to mix up trays — **Space** |
| CT HUB | Paw (q400) | Open Hub — **Space** |
| CT HUB | Line / Fill | Line color — **/** · Fill color — **'** |
| CT HUB | Wells | Color wells — **← →** · **Shift+click** → Fill |
| CT HUB | Contrast · Globe · Info | Contrast — **T** · Languages · Info — **Ctrl+,** |
| OSBARD popup | Smudgies / Sharkies | **Ctrl+Z** / **Ctrl+Y** |

---

## CT HUB gestures & tips

| Action | Input | Status |
|--------|-------|--------|
| Open HUB + random mix | **Space** or bottom **paw** | **Wired** |
| Random mix (HUB already open) | **Space** or clock **paw** | **Wired** |
| Load clock tray on q400 | **Tap** hour 1–12 | **Wired** |
| Tool + tray on hold | Hold hour ~½ s | Studio / CT popup · **Planned** in CT HUB |
| Replay tagline | Tap **Color Time!** title | **Wired** |
| Leave for Lobby | Paw logo or **You are here! 🍿** | Confirm dialog → osbard.com |

**Pawlettizer** = random clock tray mix (Studio tip name; same behavior as **Space** when the HUB is open).

---

## Viewport (auto)

| Device | Layout | Notes |
|--------|--------|-------|
| Monitor / laptop | **4:3** authored hull | Letterboxed to fit the window |
| Phone / tablet **portrait** | **3:4 stack** · full-screen | Square canvas + rails / q400 / paw under |
| Phone / tablet **landscape** | Desk side-rails · full-screen | Follows device orientation (no forced stack) |

---

*Update this doc when shortcuts or hint strings change. Hover tips applied in `assets/ct-shortcut-hints.mjs` + `assets/ct-vsliders.mjs`.*
