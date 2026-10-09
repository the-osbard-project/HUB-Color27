# OSS Drydock — vocabulary & templates

**Lost?** Open **`START-HERE.md`** in this folder first.

**Status:** Locked (Steve, 2026)  
**MSOT:** This file. Agents and docs cite here so naming does not drift.  
**Repo:** `C:\HUB-Drydock26` *(RESET from `HUB-O-Drydock26`)*

---

## Public voice (what to say out loud)

| Say | Means |
|-----|--------|
| **OSS** | Osbard Storybook Studio — the house |
| **Osbard** | Brand · site · marquee |
| **Studio** | Usually the **whole OSS house** — default shorthand |
| **the Studio app** | Specifically the **coloring app** (disambiguate when context matters) |

Do **not** lead with Shepyard / Drydock / Lock / Bay / Berth in user-facing copy. Those are internal build vocabulary.

---

## Internal vocabulary (locked)

| Term | Meaning |
|------|---------|
| **Shepyard** | Internal only — OSS **development team / environment**. Not a public synonym for OSS. *(Also: Shipyard · Boatyard · Shepyard — Shepard pun.)* |
| **Drydock** | The **template** for Osbard apps — shared shell (see **Drydock ships** below). Repo home: `C:\HUB-Drydock26`. |
| **In drydock** | Where an app lives **while being built or refit** — new build, repair, or next version. |
| **Lock** | App's **development location on `C:`** — local build on the dev machine. Journey: **Lock → Bay**. |
| **Bay** | App has a **Lobby Hub card** — *in the Bay*. Implies at least **beta or staging** in the real workflow. **Today:** Lobby/LAB cards are **aspirational** (inspiration + motivation), not literal staging yet. |
| **Berth** | **LIVE** — published production URL. Opposed to Lock. Use to identify *which host*: `sfx` · `tune` · `studio.osbard.com` · … |

---

## Drydock ships (one hull)

**One shell** — not ten repos. Forks add skin + domain logic only.

| Piece | Role |
|-------|------|
| **q100 · q200 · q300 · q400** | Rails — **192 · 768 · 192** @ 1152×4:3 (q100/q200/q300) · icons/slots only, no section titles on the hull |
| **q200** | Center stage — backdrop + scroll/canvas mount |
| **paw** | Bottom-center — opens **Hub** |
| **Hub** | Same header · body decks · footer grammar; logo + catalog differ per app |
| **Contrast · Globe · Gear** | Hub footer utilities (universal) |
| **10 viewport tokens** | See below — 4:3/3:4 authored base · scale/letterbox |
| **`locales/` + flags** | On-board i18n — many flags → few locale files · no Google Translate |
| **Boo! · Peeka! · Tater!** | Stage chrome (collapse · glass · orientation stick) |
| **`theme-drydock`** | Base tokens; forks override accent only |
| **Locked viewport** | Body fixed; scroll inside rails/Hub only |
| **PWA baseline** | manifest · icons · `theme-color` · safe areas |

**Not Drydock (fork):** tool lanes · color wells · clock · popups · sliders · gang — e.g. **CT-Lab** proves fork UI.

---

## Ten viewport tokens (locked)

**4:3 / 3:4 = authored base.** Pick nearest token → uniform scale + letterbox. **Never** non-uniform stretch.

| # | Landscape | Portrait | Typical gear |
|---|-----------|----------|--------------|
| 1 | **4:3** | **3:4** | iPad · teaching tablets |
| 2 | **16:10** | **10:16** | MacBook · Android tabs |
| 3 | **16:9** | **9:16** | Desktop · Chromebook · legacy phone |
| 4 | **19.5:9** | **9:19.5** | iPhone bulk |
| 5 | **20:9** | **9:20** | Android phone bulk |

= **10 tokens** (five ratio families × two orientations).

**Profile engine:** measure viewport → nearest token → app **allowlist** + **orientation lock** → optional **Settings override** (`localStorage`).

**Mobile layouts:** tokens **9:19.5** and **9:20** also switch rail layout (Boo! stack q100→200→300) — not a separate `DD-mobile` repo.

### Per-app defaults (dev order)

| App | Profiles | Orient lock |
|-----|----------|-------------|
| **Lobby** (0) | all 10 | both |
| **Cast** (1) | all 10 | both |
| **Reader** (2) | all 10 | portrait |
| **Studio** (3) | hold | — |
| **Color Time!** | all 10 | both |
| **Chronicles** | all 10 | portrait |

**Build order:** Drydock → Lobby + CT! + Chronicles → Cast + Reader.

---

## Globe · locales (locked intent)

- **No Google Translate** in OSS apps (Reader ebook text is separate — lives in `.oss`).
- **Few locale files:** `en` · `es` · `fr` · `de` · `pt` (v1) — later `zh` · `ja` · `ko` · `id` · `fa` · `ar`.
- **Many flags → one locale** — MX + ES + AR → `es`; no fr-CA vs fr-FR nuance in v1.
- **UI:** icons first on rails; strings in popups/settings/legal only.
- **Globe** sits center of **Contrast · Globe · Gear** — Creed in product form.

---

## What we do **not** do

- **No user-facing “Drydock” Hub card** — too much explaining; wrong mental model for visitors.
- **Do not say wing or bay for local build** — say **Lock**.
- **Bay** = Lobby card only — **not** a slot inside Drydock.

---

## Lifecycle

```
In drydock (build / refit)
        │
        ▼
      Lock          Bay              Berth
   C: dev tree    Lobby card       live URL
```

| Stage | Question it answers |
|-------|---------------------|
| **Lock** | Where am I coding it? |
| **Bay** | Does it have a Lobby card yet? |
| **Berth** | What's the live URL? |

---

## RESET naming (ports)

| Old | New |
|-----|-----|
| `HUB-O-Drydock26` | **`HUB-Drydock26`** |
| `HUB-O-Lobby` | **`HUB-Lobby26`** *(planned)* |
| `HUB-O-Studio26` | TBD |

Port docs + assets into `HUB-*26` folders; delete `HUB-O-*` when fork is verified.

---

## Rail prefix convention (dev mental map)

| Pattern | Meaning |
|---------|---------|
| `{app}-100` | Stage left / navigate |
| `{app}-200` | Center stage / canvas |
| `{app}-300` | Stage right / browse · export |
| `{app}-400` | Footer — tools · **paw** |

**Examples:** `ct-400` · `rd-200` · `c-300`. Inside a fork repo, `q400` is fine when context is obvious.

---

## One-liner (outsiders)

> **OSS apps show up as cards in the Lobby. We build them in Drydock on Lock, then berth them when they're live.**

---

## Cross-references

| Doc | Path |
|-----|------|
| Shell v0 contract | `docs/TEMPLATE.md` |
| Hub product plan | `C:\HUB-O-Studio26\docs\OSS-HUB.md` |
| CT-Lab fork reference | `C:\HUB-CT26` |
| Chronicles rail map | `C:\HUB-O-Studio26\docs\CHRONICLES.md` |

---

*When in doubt, grep this file before inventing a new metaphor.*
