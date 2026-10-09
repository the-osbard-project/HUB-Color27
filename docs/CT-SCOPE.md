# Color Time! — rail scope (CT26)

**Lock / SOT:** `C:\HUB-ColorTime26`. CT never touches Drydock (`C:\HUB-Drydock26`) — no sync, no copy, no agent cross-repo work. DD is for other apps only.

**Stack motto:** **The artist creates; the editors cut.** — CT is the artist; Builder Bindery is the editor.

**Build list:** [`BUILD.md`](BUILD.md)

---

## q100 — Start rail

| Control | Source | Notes |
|---------|--------|--------|
| **New** | Same / Studio | |
| **Open** | Same / Studio | |
| **Save As** (floppy) | **New** | **Always opens popup** — never silent save on icon tap |
| **Pack toggle** | **New** | Backpack · pack scroll |

### Save As UX (locked)

- **Floppy icon** → **Save As popup every time** (name + format) — never silent save on icon tap.
- **Ctrl+S** → **quick save** when a file name is already set; no popup.
- Popup footer hint: *Ctrl+S = quick save* (when applicable).
- First save with no name: Ctrl+S opens Save As.

**Web (localhost / osbard.com):** Save As uses the browser **save picker** when available (Chrome/Edge) — **Ctrl+S then overwrites** that file. Without the picker, download goes to **Downloads** and may suffix `(1)`, `(2)`…

---

## Canvas model (locked)

### Undo (OSBARD!!)

- **Undo history capped at 30** actions (Smudgies / Sharkies / OSBARD!! desk).

### Strokes & placed objects

- **Always objects:** pencil, crayon, pastel, marker, star, and Set shapes land as **floating objects** on the active layer (no auto-bake). Color Time **forces Select off on every app start**.
- **Select off (default):** draw freely — objects stay editable but **no bounding boxes**. Drawing tools work as usual.
- **Select on (Overclock / V):** arrange only — show bounding boxes for objects on the **active layer**; **no drawing**. Move · resize · rotate · Delete · Copy/Paste. Turning Select off does **not** bake.
- **Flatten Layer / Flatten Canvas** (Overclock): the only intentional bake of floating objects → pixels on the live canvas.
- **PNG export** composites a flat *copy* for download; it does **not** flatten the working document.
- Select and Wand are mutually exclusive (UI + **V**/**W**). Turning Wand on turns Select off (objects stay floating).
- Eraser and bucket still paint/erase baked pixels on the layer (object-aware erase/fill deferred). Full copy → [`SETTINGS-INFO.md`](SETTINGS-INFO.md#overclock-tools).

---

## q200 — Stage

### Stage vocabulary (locked)

| Term | Means |
|------|--------|
| **Stage** / **mat** | Same thing — the q200 center region (`.ct-stage-mat`): gutters + canvas column |
| **Gutters** | Left/right of the canvas, out to q100 / q300 (`.ct-stage-gutter` · vertical sliders) |
| **Canvas** | The **drawing surface** — `#ct-draw-canvas` bitmap (default **840×840**; optional **2625×2625** / 300 PPI print; not the mat, not the gutters) |

| Piece | Source |
|-------|--------|
| Vertical sliders (pressure, canvas color, size, opacity) | **New** (CT gutters) |
| Square canvas **840×840** default (2625 / 300 PPI optional) | **New** |

**Pressure** → q200 left slider · **Smoothing** → Overclock (later).

---

## q300 — Arrt rail

| Piece | Source |
|-------|--------|
| Set · Cast · Props popups | **New** (CT-only, no Studio copy) |
| 3 movable layers + backdrop | **New** |

---

## q400 — Tools

| Piece | Source |
|-------|--------|
| OSBARD!! · Eraser · Bucket · Pencil · Crayon · Pastel · Marker · Star | **Same / copy Studio** (`packages/draw` + HUD presets) |
| Color wells | **Same / copy Studio** — **one tray per tool** (swaps on q400 select) |
| HUB (paw) | Hull + **CT clock body** (catalog / Overclock / Settings later) |

### Studio-as-is starting point (locked)

When CT ships a draw tool, **starting behavior = Studio today**:

- **Engine** — copy from `HUB-O-Studio26/packages/draw` (no simplified substitutes).
- **Defaults** — `draw-tool-presets.mjs` values: stroke width, pressure, default stroke color, marker ink/tip.
- **Gutters** — q200 sliders store **literal Studio HUD units** (width in px, pressure 0–100); switching tools applies that tool’s preset via `ct-tool-hud.mjs`.
- **CT-only wiring** — stage coords, gutter sliders, `.OSS` save/load, CT HUB — not a redesign of stroke math.
- **Color trays** — travel with the selected tool (Studio `color-tray.mjs` / `palette-recipes` → `ct-color-trays.mjs`). Bucket · Eraser · OSBARD!! **inherit** the live tray.

Tool import: preserve per-tool **pressure/smoothing** defaults; wire pressure from q200; smoothing from Overclock when shipped.

**Well texture overlays** (Pencil horizontal lines, Crayon waxy grain, Watery blobby pools, Starry sparks, …) — Studio `well-surface.mjs` + `q400-tray-ui.mjs`. CT sets `data-ct-well-texture` on tool switch; **raster overlay port** 🔜 (after per-tool trays or with tray split).

**Active tool:** q400 toolbar glow (`dd-q400-tool--active` · `getActiveCtToolKey()` in `ct-tool-select.mjs`).

### Canvas tool cursors

When a q400 draw tool is **active**, the pointer over **#dd-stage-scroll** uses a matching SVG cursor (`assets/img-ct/cursors/`). Enabled only for **`(hover: hover) and (pointer: fine)`** — touch / coarse pointers keep the default. Same CSS works on web, PWA, and packaged builds wherever the browser honors `cursor: url()`.

---

## Deferred

Full HUB contents · Overclock UI · rich Settings.

### Placed imports per layer (later — hand off to Br)

**Not built yet.** Today: **Open** loads one image **full-bleed** on the backpack layer; **draw** on L1–L3; **Save As** → flat PNG or `.oss` with layer stack.

**Later (CT scope):** import **one image per layer** and **hold** it in `.oss` — coloring and strokes on top. CT is **not Photoshop** — non-destructive toward source art; no edit-then-regret paste-up. Multi-slot arrange, crop, flatten, and bind live in **Builder Bindery** (cool-off desk with fresh eyes).

```text
CT  →  hold art per layer · export cuts / layered .oss  (keep originals whole)
Br  →  edit · arrange · flatten · bind · ship PDF       (cool-off / assembly)
```

See `HUB-Builder26/docs/BINDERY-FRAMING.md` § Shared lane with Color Time!.
