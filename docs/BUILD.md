# Color Time! — build list (CT26)

**SOT:** `C:\HUB-ColorTime26` · **Scope detail:** [`CT-SCOPE.md`](CT-SCOPE.md) · **Lost?** [`START-HERE.md`](START-HERE.md) · **Keys & tips:** [`KEYS+TIPS.md`](KEYS+TIPS.md)

**Viewport lock:** computer / laptop / tablet → **landscape** · phone → **portrait**.

**Status key:** ✅ done · 🟡 shell / partial · ⬜ not started · 🔜 deferred

---

## Suggested build order

| # | Phase | Why this order |
|---|--------|----------------|
| 1 | **q200 draw surface** | Everything draws here |
| 2 | **q400 draw engine** | Tools need a canvas |
| 3 | **q100 files + packs** | Save/load projects + coloring pages |
| 4 | **q300 layers** | Compositing on top of canvas |
| 5 | **CT HUB depth** | Catalog · Overclock · Settings |
| 6 | **Polish & ship** | Cursors · theater hooks · packaged builds |

---

## 0 — Foundation

| Item | Status |
|------|--------|
| q100 · q200 · q300 · q400 · paw · HUB DOM | ✅ |
| 10 viewport tokens + profile engine | ✅ |
| Viewport lock (landscape desk/tablet · portrait phone) | ✅ |
| Phone stack + phone-wide layouts | ✅ |
| 6 OSS theme trays + Contrast persist | ✅ |
| Globe · settings shell · dialogs · service worker | ✅ |

---

## 1 — CT HUB

| Item | Status |
|------|--------|
| Paw + HUB overlay chrome | ✅ |
| **CT clock** body + trays | ✅ |
| Clock random mix + straggler “buzzer” finish | ✅ |
| Tagline animation (70 BPM · finale) | ✅ |
| Spacebar — hub open/closed random mix | ✅ |
| Full deck catalog | 🔜 |
| Overclock — Flatten · Copy/Paste · Grid · Snap · Wand · Select | ✅ popup + wiring |
| Settings glossary ([`SETTINGS-INFO.md`](SETTINGS-INFO.md)) | ✅ |

---

## 2 — q200 Stage

| Item | Status |
|------|--------|
| Gutter sliders UI (pressure · canvas color · size · opacity) | ✅ |
| Canvas color → draw surface background | ✅ |
| 840×840 canvas layout + bitmap (`#ct-draw-canvas`) | ✅ |
| Wire pressure · size · opacity → draw engine | ✅ literal Studio HUD units |
| Per-tool HUD presets on tool switch | ✅ `ct-tool-presets.mjs` |
| Smoothing | 🔜 Overclock |

---

## 3 — q400 Tools

| Item | Status |
|------|--------|
| Tool icons (OSBARD!! · Eraser · Bucket · Pencil · Crayon · Pastel · Marker · Star) | ✅ |
| OSBARD!! + Star popups (shell) | ✅ |
| 12-toe color tray | ✅ per-tool trays swap on select (`ct-color-trays.mjs`) |
| Active tool glow + `getActiveCtToolKey()` | ✅ |
| **Pencil draw** (Studio waxy graphite) | ✅ |
| **Eraser** | ✅ |
| **Bucket** | ✅ |
| **Crayon · Pastel · Marker · Star** | ✅ Marker: Studio watery + Blend/Splatter + Smudge · Star: all 9 Color Star! modes (Studio brush-fx) |
| Canvas tool cursors (desktop fine pointer) | 🟡 wired · debug later |

---

## 4 — q100 Start

| Item | Status |
|------|--------|
| New · Open · Save As buttons (shell) | ✅ |
| Pack scroll + backpack toggle | ✅ |
| Demo pack thumbs (SVG line art) | ✅ `assets/backpack/` · bundle toggle cycles 3 demos |
| **Save As popup** + `.OSS` download v0 | 🟡 Downloads folder (web) |
| **Ctrl+S quick save** (when name set) | 🟡 same — re-download to Downloads |
| Project path / dirty state | 🟡 |
| New / Open file I/O | 🟡 Open `.OSS` · New clears draw + line art |
| Real coloring bundle images | ✅ demo SVG + bundle-001/002/003 PNG |

Save As contract → [`CT-SCOPE.md`](CT-SCOPE.md#save-as-ux-locked)

---

## 5 — q300 Arrt

| Item | Status |
|------|--------|
| Set · Cast · Props buttons (shell) | ✅ |
| 3 layer tiles + backdrop thumb | ✅ |
| **Set / Cast / Props popups** (CT-only) | ⬜ |
| Movable layers + compositing | ⬜ |
| Backdrop ↔ canvas color sync | 🟡 thumb only |

---

## 6 — Polish & ship

| Item | Status |
|------|--------|
| Theater — popcorn/confetti (open · save applause) | 🟡 module exists · wire on save |
| Tool cursors — fix desktop application | 🟡 |
| **Well texture overlays** (Pencil lines, Crayon waxy, Watery blobs, …) | ⬜ port `well-surface.mjs` · `data-ct-well-texture` wired |
| PWA / Play Store / DT download packaging | ⬜ |

---

## Port map (where code comes from)

| CT piece | Source |
|----------|--------|
| Draw tools + brush engine | **Studio** (`HUB-O-Studio26/packages/draw`) — **as-is**; CT wires HUD + stage only |
| Tool HUD defaults | **Studio** `draw-tool-presets.mjs` → `ct-tool-presets.mjs` |
| Well texture overlays | **Studio** `well-surface.mjs` — 🔜 (hook: `data-ct-well-texture`) |
| Set · Cast · Props · layers | **New** — CT-only |
| Save As UX | **New** — locked in CT-SCOPE |
| HUB catalog / Overclock | **New** — deferred |
| Feel reference | **CT-Lab** (`HUB-CT26`) — not the code lock |

---

## Design notes (remember — not build order)

Locked in [`CT-SCOPE.md`](CT-SCOPE.md#canvas-model-locked): **undo cap 30** ✅ · strokes/shapes are always **objects**; **Select** = arrange-only bounding boxes (no drawing); **Flatten Layer/Canvas** bake to pixels; PNG export does not flatten the live doc. User-facing copy → [`SETTINGS-INFO.md`](SETTINGS-INFO.md).

---

## Next up (follows build order above)

**Now in phases 3 → 4** (files + bundles done; layers next):

1. **q300** — Set / Cast / Props popups + layers
2. **Color Star!** — Amount slider + remaining HUB-only modes (foggy, soapy, …) when needed
3. **Backpack** — wire PNG bundles (`bundle-001`…) + ship art
4. **CT HUB depth** · **Polish** — per phases 5–6

---

*Update this file when a phase ships or scope changes.*
