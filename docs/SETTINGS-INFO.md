# Color Time! — Settings info (CT26)

**Purpose:** Source lock for the **Info** panel — keyboard shortcuts plus the Tool Guide glossary.

**Related:** [`CT-SCOPE.md`](CT-SCOPE.md) · [`BUILD.md`](BUILD.md) · in-app data: `assets/ct-settings-glossary.mjs`

---

## Keyboard shortcuts & hover hints

See **[`KEYS+TIPS.md`](KEYS+TIPS.md)** — wired CT26 keys, Studio OSS import chart, slider hover hints, and control tooltips.

---

## Info panel

1. **Keyboard shortcuts** — desk / tool letter keys  
2. **Tool Guide** — two-column glossary (term · brief definition)  

Viewport layout is automatic: phone/tablet **portrait** uses the 3:4 stack; **landscape** uses desk side-rails and follows the device orientation (no manual hull override).

---

## Glossary of terms

### About Color Time!

Coloring and drawing on the Drydock hull — 840×840 desk canvas by default (2625² / 300 PPI print opt-in), five layers, twelve-toe color trays, and the paw menu.

#### Column 1 — q100 · gutters

| Term | Definition |
|------|------------|
| **New** | Start fresh — clears the drawing and line art. |
| **Open** | Load a saved `.OSS` project file. |
| **Save** | Floppy icon opens Save As every time; Ctrl+S quick-saves when a file name is already set. **PNG** = flat art with transparency (desk rainbow is preview-only). **OSS** keeps layers + backdrop. |
| **Backpack** | Coloring pack pages — scroll thumbs in q100; opens into the active layer; pack toggle switches bundles. |

#### Sliders

| Term | Definition |
|------|------------|
| **Blend/Splatter** | Left gutter — Marker/Brushy hue mix, and splat amount for Dotty, Sunny, Washy, Watery, and Glittery. |
| **Smudge** | Left gutter — Marker/Brushy smear (0 = stamp, 100 = watery). Does not change hue by itself. |
| **Opacity** | Right gutter slider — fades the active layer (1–5) or the canvas backdrop when that thumb is selected. |
| **Rounded** | Right gutter slider — square corner roundness (**0–50**; **50** = full quarter-circle). Squares only. |
| **Pressure** | Right gutter slider — stroke pressure (0–100). Marker defaults to 75. |
| **Line** | Right gutter slider — brush size for the active draw tool. |
| **Rainbow** | Page-color rainbow — icon on the backdrop thumb (desk) or paw row (phone); opens a slider (white → rainbow → black). On phone, shares the full-width horizontal sheet with the other paw-row faders. |

#### Column 2 — q300

| Term | Definition |
|------|------------|
| **Set** | Shape tools — circle, square, triangle, polygon, line, and curve. |
| **Cast** | Stage characters (work in progress). |
| **Props** | Stage props (work in progress). |
| **Overclock Tools** | Pro toolbox — Flatten Layer · Flatten Canvas · Copy · Paste · Grid · Snap · Wand · Select · **300 PPI Print-ready** (bottom row; new project only). |
| **Layers 1–5** | Five drawable layers; tap a tile to select; drag to reorder; eraser on a tile clears that layer. |
| **Backdrop** | Canvas background thumb — tap for opacity; rainbow icon opens page-color slider; eraser returns color to white. |

#### Tools & colors

| Term | Definition |
|------|------------|
| **Smudgies!** | Undo one step (Ctrl+Z). History capped at 30 actions. |
| **Sharkies!** | Redo one step (Ctrl+Y). |
| **OSBARD!!** | Undo all the way back — forgiveness desk reset. Confirms first. |
| **Eraser** | Erase on the active layer. |
| **Bucket** | Flood fill with the active color. |
| **Pencil** | Waxy graphite stroke. |
| **Crayon** | Soft wax stroke. |
| **Pastel** | Chalky stroke. |
| **Marker** | Watery ink stroke. Blend/Splatter mixes hues; Smudge smears. Both at 0 stamps without green. |
| **Star FX** | Color Star! brush — long-press or popup to pick an FX mode. |
| **Brushy** | Star FX — paint-brush scatter. Uses Blend/Splatter and Smudge like Marker. |
| **Dotty** | Star FX — dotted spray. |
| **Furry** | Star FX — fuzzy strokes. |
| **Glittery** | Star FX — sparkle glitter. |
| **Inky** | Star FX — inky pen line. |
| **Glowy** | Star FX — highlighter glow. |
| **Sunny** | Star FX — sunny burst. |
| **Starry** | Star FX — star sparks. |
| **Watery** | Star FX — watery wash. |

#### "Color Time!" HUB

| Term | Definition |
|------|------------|
| **Clock hours** | Twelve color wells arranged around the HUB clock face. |
| **Clock paw** | Tap PJ's paw to random-mix the clock tray colors. |
| **Line · Swap · Fill** | HUB paint bar — pick line color, swap line and fill, pick fill for shapes. |
| **Contrast** | Cycle the hull theme tray (Color Time! · Scrippy · Chronicles · Builder · Reader · Glow). |
| **Globe** | Language / translator overlay. |
| **Info** | Keyboard shortcuts and Tool Guide (Info icon). |
| **12 Color Wells** | Toe trays on q400 and in the HUB — twelve colors per active tool; tray swaps when you change tools. |

---

*Update `ct-settings-glossary.mjs` and this doc together when terms change.*
