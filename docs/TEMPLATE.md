# Drydock shell — v0 template contract

**Status:** Locked intent (Steve, 2026)  
**Repo:** `C:\HUB-Drydock26`  
**Vocabulary:** `docs/DRYDOCK.md`

---

## One hull · ten viewport tokens

**One shell** — ten profile tokens (see `DRYDOCK.md`). **4:3 / 3:4** = authored base; other tokens scale/letterbox.

| Base | Portrait | Landscape | Priority |
|------|----------|-----------|----------|
| iPad-class | **3:4** | **4:3** | **Author here first** |
| Laptop | 10:16 | **16:10** | Wide desk |
| Desktop/school | 9:16 | **16:9** | Chromebook gap |
| iPhone | 9:19.5 | 19.5:9 | Phone |
| Android | 9:20 | 20:9 | Phone |

Same DOM (q-rails · q200 · canvas · paw Hub · Boo! · Peeka! · Tater!). Token switch sets layout grid, Hub aspect, Boo! default, rail visibility.

**Rail split (4:3 landscape base — locked):** **q100 · 192px** — **q200 · 768px** — **q300 · 192px** @ **1152×864**. q400 **96px**; paw locked center-bottom.

---

## Mental model (Steve — locked)

**Stack (bottom → top):**

1. **Rails + hull** — q100 · q300 · q400 · `theme-drydock`
2. **q200 = the stage** — fills *all* viewport space the rails don’t use
3. **Stage backdrop** — `drydock-stage-01` (stage dressing; fork may swap)
4. **Canvas on stage** — art (Studio) · blurbs (Chronicles) · **Clock** (CT!)
5. **Paw Hub** — overlay on **everything** (top z-index; paw opens it)

**Boo!** — rails hidden; user sees **all q200** (full stage). Hub still opens on paw tap.

**Hub voice:** concessionaire in the aisles — thumbs, trays, decks — not the show on the ice.

**Color Time! fork (locked shape):**

- **CT! = all stage** — q200 / **Clock**. Rails **gone** via Boo! (not empty slots).
- **Paw** → Hub slide-up (thumbs, trays).
- Drydock **must** ship **Boo!** so CT! can exist.

**CT-Lab** (`C:\HUB-CT26`) is the fork feel reference — tools, wells, clock, popups are **not** hull code.

---

## Bare minimum shell (all forks)

### Stage chrome — Tater! · Peeka! · Boo!

Port from Studio26 (`stage-chrome.mjs` + collapse CSS).

| Control | Job |
|---------|-----|
| **Boo!** | Rails **gone** — q200 = full stage. CT! **is** Boo! mode. |
| **Peeka!** | Glass ↔ Standard when rails visible |
| **Tater!** | Spin show · stick portrait/landscape |

**Phone default:** Boo! **on** at narrow widths (CT! may always start Boo!).

### Bare minimum modules

| Layer | v0 includes | v0 excludes |
|-------|-------------|-------------|
| **DOM** | `#viewport-container` · `#q100` `#q200` `#q300` `#q400` · `#oss-hpp` | Skills, builders, fork tool lanes |
| **q200** | stage region · backdrop · `.dd-stage-scroll` mount | Drawing engine |
| **Theme** | `theme-drydock.css` | App skins (fork) |
| **Layout** | `dd-layout.css` — rails · **Boo** · **10 tokens** | Full `oss-shell.css` desk |
| **Chrome JS** | `stage-chrome.mjs` — Peeka + Boo (+ persist) | PCT · CT popup |
| **Hub** | paw opens overlay · Deck row · **Contrast · Globe · Gear** | Lobby Apps catalog |
| **i18n** | `locales/` + Globe picker | Google Translate |
| **Profile** | detect · allowlist · Settings override | — |

### Per-fork hull use

| Fork | Rails (DT) | Mobile default | q200 content | Hub |
|------|------------|----------------|--------------|-----|
| **Lobby26** | cards/nav | Boo optional | marquee / welcome | Apps deck |
| **Color Time!** | **none (Boo!)** | always Boo! | **Clock** | thumbs · trays |
| **Chronicles** | browse cols | Boo! | blurbs | posts · PIT |
| **Reader** | library | Boo! | pages | bookshelf |
| **Studio** | full desk | Boo optional | canvas | projects |

---

## What v0 is

Minimal **Lock** runnable shell — browser-open, unmistakably **Drydock** (not Studio purple, not Lobby).

| In v0 | Out of v0 |
|-------|-----------|
| Empty **icon** q100 · q300 · q400 + **paw** | Titles · fork tools · wells |
| **q200** + `drydock-stage-01` | Purple `#stage-backdrop` |
| **Minimal Hub** — WIP logo · Deck × 5 · **Contrast · Globe · Gear** | Full Lobby catalog |
| **`theme-drydock`** | App theater skins |
| **10 tokens** + Settings picker | Play Store / OSS MO |

**Rails:** icons/slots only — **no** “Start”, “Arrt!!”, etc. on the hull. **Popups** (fork) may keep labels.

---

## q200 stage view (locked)

**Drydock v0:**

- **No `#stage-backdrop`** — hull uses `--drydock-hull`, not royal purple
- **`#q200` is the stage view** — center column only
- **Backdrop** — `assets/img-ct/drydock-stage-01.png` (1920×1080)
- `background-size: cover` · `background-position: center`

```html
<main id="q200" class="oss-stage dd-stage">
  <div class="dd-stage-bg" aria-hidden="true"></div>
  <div class="dd-stage-scroll" id="dd-stage-scroll">
    <!-- fork mounts canvas · articles · clock here -->
  </div>
</main>
```

---

## `theme-drydock` tokens

MSOT: `assets/styles/theme-drydock.css`

| Token | Role | Starting hex |
|-------|------|--------------|
| `--drydock-hull` | q100/q300/q400 chrome, Hub panel | `#2a2f38` |
| `--drydock-primer` | Accent rims, card borders | `#c45c26` |
| `--drydock-weld` | Paw hover, focus | `#5eb8b0` |
| `--drydock-rail-edge` | Rail dividers | `#3d4450` |
| `--drydock-stage-bg` | q200 fallback | `#1a1d24` |
| `--drydock-stage-image` | q200 backdrop | `url('../img-ct/drydock-stage-01.png')` |

Forks add `theme-{app}` — never ship raw drydock colors to Berth unchanged.

---

## Hub footer (minimal)

| Utility | Role |
|---------|------|
| **Contrast** | Theme / readability |
| **Globe** | Flag picker → locale file |
| **Gear** | Settings (profile override · app prefs) |

Globe **center** — Creed: *all are welcome · all are included · so all aboard!*

---

## Responsive · 3:4 / 4:3-first

| Layer | Rule |
|-------|------|
| **Stage (q200)** | Fills viewport (Boo!) |
| **Show** | Authored **3:4 or 4:3** — never stretch hero to fake phone aspect |
| **Extra phone space** | Letterbox / pillarbox — more stage visible; not a bug |
| **Hub** | 3:4 / 4:3 panel — padded on iPad · floating readable rect on phone |
| **10 tokens** | Tall-phone tokens rearrange rails (stack); same hull |

**One line:** *Design the show for iPad ratios; let the stage fill the phone; never crop the clock.*

---

## Fork plan

```
HUB-Drydock26  (hull)
       │
       ├── HUB-Lobby26
       ├── HUB-CT26 / Color Time!
       ├── Chronicles26
       ├── Cast26
       └── Reader26 / Player
```

Each fork replaces `theme-drydock`, fills rails, wires Hub catalog — **does not re-invent paw/Hub/utilities**.

---

## Build order

1. **Scaffold** — `index.html` · `dd.mjs` · `theme-drydock.css` · `dd-layout.css`
2. **Rails** — empty icon slots + paw on q400
3. **q200** — `drydock-stage-01` locked in q200 only
4. **Hub** — Deck × 5 + Contrast · Globe · Gear
5. **Profile engine** — 10 tokens + Settings override
6. **Globe** — `locales/` slice (en · es · fr · de · pt)
7. **Smoke** — paw · Hub · resize · no hull gap
8. **Fork** Lobby26 + CT! + Chronicles (parallel)

---

## Assets

| File | Purpose |
|------|---------|
| `assets/img-ct/drydock-stage-01.png` | q200 backdrop |
| `assets/img-ct/paw-blank.svg` | q400 + Hub *(add when ported)* |
| `assets/img-ct/card-holder-blank-288-384.webp` | Hub Deck placeholders *(add when ported)* |

---

*When v0 matches this doc, tag `drydock-v0` and fork Lobby26 + CT! + Chronicles.*
