# Color Time! — print canvas & Builder handoff

**Status:** Jul 2026 — direction locked  
**Consumer:** **Storybook Builder (Br)** — imports images at **print resolution**. Br does **not** DPI-transform for POD.

---

## Chosen approach: Overclock print canvas (not export upscale)

| Mode | Canvas | Default |
|------|--------|---------|
| **Standard** | **840 × 840** | Yes — coloring, screen, kid devices |
| **Print (large)** | **2625 × 2625** (square) | Opt-in — **8.75″ @ 300 PPI** authoring canvas → Br |

**Square on purpose.** CT, Scriptr, and Builder all use the same **2625 × 2625** compose size when print mode is on. That matches **Lulu 8.75″ trim** @ 300 DPI. KDP’s official **bleed** page is asymmetric (8.625″ × 8.75″); OSS keeps authoring **square** and handles KDP at **export** in Builder (see below).

**UI:** **Overclock Tools** popup (`#ct-overclock-popup`) — **bottom row** below sliders + Grid/Snap/Wand/Select:

```text
┌─ Overclock Tools ─────────────────────── [×] ─┐
│  [smooth] [simplify] [mix]  │ Grid          │
│      sliders                │ Snap          │
│                             │ Wand          │
│                             │ Select        │
├─────────────────────────────────────────────┤
│  ☐ 300 PPI Print-ready files                │  ← full-width footer row
└─────────────────────────────────────────────┘
```

- Checkbox spans **full width** under the existing two-column body (`ct-overclock-panel`).
- **New project only** (no open `.oss`, or explicit New) — checkbox enabled.
- **Project open** — checkbox **disabled**, reflects `canvas.size` (840 off · 2625 on).
- Tooltip: *8.75″ @ 300 PPI square for Builder. Red edge guides = KDP margin. Set before you draw. Large memory.*

Markup sketch (inside `#ct-overclock-popup`, after `.ct-overclock-panel`):

```html
<label class="ct-overclock-kdp-row" id="ct-overclock-kdp-label">
  <input type="checkbox" id="ct-overclock-kdp" />
  <span>300 PPI Print-ready files</span>
</label>
```

When checked (prefer **before first mark** on a new project):

- Internal bitmap = **2625×2625**; **on-screen stage stays the same size** as 840 (CSS fit in existing q200 slot).
- Pointer mapping uses `CT_CANVAS_SIZE` (2625) — same pattern as today.
- **Save `.oss`** → `canvas.size: 2625`
- **Export / flatten PNG** → **2625 px** native — **no** separate “Export 300 DPI” step.
- Tool stroke widths scale with canvas size so **brush feel matches** 840 UI.

When unchecked: current behavior unchanged.

---

## KDP margin guides (print canvas only)

When **✅ 300 PPI print canvas** is on, the canvas stays **square** — do **not** switch to KDP’s asymmetric bleed page size in CT or Scriptr.

Instead, draw a **red margin strip** along **each edge** of the canvas as a non-printing overlay (not saved into layer pixels):

| Guide | Value @ 300 DPI | Role |
|-------|-----------------|------|
| Strip width | **0.0625″** per edge (**18.75 px** @ 300 DPI) | Visual “KDP border” band — outer margin indicator |
| Author canvas | **2625 × 2625** (8.75″ square) | Unchanged; guides sit on top |

**Units:** **0.0625 is inches** (1/16″), not CSS/screen px. At 300 DPI: `0.0625 × 300 = 18.75` canvas pixels per edge. Use inch constant in spec; convert to px from document DPI at render/export time.

```text
┌─ red 0.0625″ ───────────────── red 0.0625″ ─┐
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
│▓                                           ▓│
│▓         safe compose area (full art)      ▓│
│▓                                           ▓│
│▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓▓│
└─ red 0.0625″ ───────────────── red 0.0625″ ─┘
```

- **Toggle:** View → **KDP guides** (default **on** when print canvas is active); guides are UI-only.
- **Scriptr:** same overlay when Sr print canvas (2625²) is enabled — see [SCRIPTOR-SPEC-DISCOVERY.md](../../HUB-Scriptr26/docs/SCRIPTOR-SPEC-DISCOVERY.md).
- **Builder:** same overlay on the 2625² compose canvas; export behavior differs by POD target (below).

**Print math note:** KDP **trim** for an 8.5″ square book is **2550 × 2550** px @ 300 — a **0.125″** inset per side from the 8.75″ author canvas. The **0.0625″** red band marks the **outer half** of that symmetric margin (edge → midpoint of the 0.125″ bleed zone). Builder’s **KDP export** crops the full **0.0625″** band from each edge (see Br docs). For **8.5″ trim-only** PDFs, Br may also offer **0.125″ per-side crop** → **2550²** (future sub-option).

---

## Why not “Export 300 DPI” on 840 flatten?

Upscale of a 840 composite is **not** real 300 DPI — soft at print. Print sharpness requires either:

1. **Draw at 2625** (this approach), or  
2. **Re-render** strokes/shapes to an offscreen 2625 canvas on export (more code, 840 UI unchanged).

**Overclock 2625** is the simpler sharpness story for the Br pipeline.

---

## Same UI as 840

```text
840 mode:    backing 840    →  CSS fits q200 slot
2625 mode:   backing 2625   →  same q200 slot (scaled display)
             pointer: (client / rect) × 2625
             brush:   uiWidth × (2625 / 840)  in canvas pixels
```

Drydock hull (**1152×864**, 192|768|192) **unchanged** — only the canvas backing store grows.

---

## Rules & guardrails

| Rule | Why |
|------|-----|
| **Canvas size fixed per project** | Set **300 PPI Print-ready** in Overclock **before** New/first mark — **no toggle mid-project** |
| **Open as-is** | CT loads `.oss` at recorded `canvas.size` (**840** or **2625**) — **no convert**, upscale, or downscale on open |
| **Checkbox follows file** | Opening 2625 project → Overclock shows on; 840 → off. Changing checkbox does not alter an open file |
| **Memory** | 2625 ≈ **10×** pixels per layer vs 840 — opt-in only; label “large files” |
| **Trim** | 2625 = **8.75″ × 300** (Lulu / DOG author size); KDP crop happens in **Builder export** |
| **KDP guides** | Red **0.0625″** edge strips when print canvas on — overlay only, not in layer pixels |

**No mid-project conversion.** Wrong size? Start a new project (or re-export art from source at the correct resolution).

---

## Builder handoff

```text
CT Overclock ✅ 300 PPI  →  Save PNG / .oss @ full 2625²  →  Br @ 2625²  →  place layers, no DPI math
                                                                                ↓
                                                         Export: KDP (clip 0.0625″/edge) | Lulu (full 2625²)
CT standard 840       →  screen / coloring; not POD source (unless selection export added later)
```

Br expects **2625²** imports from print-mode CT. **CT does not clip** on save/export — full square art goes to Br; **POD target crop is Br’s job**. See [HUB-Builder26/docs/BR-UX-WALKTHROUGH.md](../../HUB-Builder26/docs/BR-UX-WALKTHROUGH.md).

### Export metadata (optional sidecar)

```json
{
  "canvasSize": 2625,
  "trimIn": 8.75,
  "hullDpi": 300,
  "printCanvas": true,
  "kdpGuides": true
}
```

---

## Implementation sketch

1. `CT_CANVAS_SIZE` dynamic: `840` | `2625` — set at **new project** from Overclock checkbox.
2. `resizeAllLayerCanvases(size)` only when **creating** a project at chosen size — not when opening (open as-is).
3. Overclock checkbox **only when starting fresh** — disabled or read-only when a project is open; mirrors `canvas.size` on open.
4. **Open as-is** — `loadCtProject()` uses `parsed.canvas.size`; no 840↔2625 conversion.
5. Scale brush/stroke widths: `× (CT_CANVAS_SIZE / 840)` while drawing.
6. `buildCtProjectDocument()` — persist `canvas.size`, `canvas.printCanvas`, `view.kdpGuides`.
7. Overclock UI — checkbox + tooltip; **read-only** when project open (reflects file).
8. **KDP guide overlay** — `drawKdpMarginGuides(ctx)` — four **#f00** strips; width = **`0.0625 * dpi / 1`** (18.75 @ 300); not composited into layers or CT PNG export (guides are compose-time only; Br re-shows on import).
9. QA: open 840/2625 `.oss` unchanged; PNG dimensions match `canvas.size` (full 2625², no crop).

---

## Sharpness

| Content @ 2625 mode | Print |
|---------------------|-------|
| Strokes, shapes, SVG | Sharp (native pixels) |
| Raster import | Sharp up to source resolution |
| Full-page art | Real 300 DPI for 8.75″ trim |

---

## Related

- [HUB-Builder26/docs/BR-UX-WALKTHROUGH.md](../../HUB-Builder26/docs/BR-UX-WALKTHROUGH.md)
- [HUB-Builder26/docs/MERGE-HANDOFF.md](../../HUB-Builder26/docs/MERGE-HANDOFF.md) — optional `.oss` merge @ 96 hull (legacy)

---

## Revision log

| Date | Notes |
|------|-------|
| 2026-08-02 | Standard canvas **840×840**; grid **20×20** (42 px); Overclock label **300 PPI Print-ready** |
| 2026-07-07 | **Open as-is** — no 768↔2625 convert; canvas size fixed per project |
| 2026-07-07 | Overclock checkbox **2625px KDP-ready**; default 768; same UI via CSS scale; no export-upscale path |
| 2026-07-07 | **Square 2625** author canvas; **0.0625″ red KDP margin guides** per edge; rename checkbox → **print canvas (8.75″)**; Br clips on KDP export |
