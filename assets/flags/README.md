# Flags — Globe Translator assets

These SVG flags (112 in active use) power the Globe Translator overlay's
language switcher. Each flag is a round/square vector so the CSS can
clip it to a circle via `border-radius: 50%` + `object-fit: cover`.

## Sources

Most flags come from [lipis/flag-icons](https://github.com/lipis/flag-icons)
(`1x1` circular variants), MIT-licensed:

- **Filename convention:** ISO 3166-1 alpha-2, lowercase (`us.svg`, `gb.svg`, …)
- **Subdivisions:** ISO 3166-2 hyphenated, lowercase (`gb-wls.svg`,
  `gb-sct.svg`, `es-pv.svg` for the Basque Country, `es-ga.svg` for Galicia)
- **Fetch URL pattern:** `https://cdn.jsdelivr.net/gh/lipis/flag-icons@main/flags/1x1/{code}.svg`
- **License:** MIT (see `LICENSE` in this folder)

Three flags are NOT in lipis/flag-icons and are sourced from
[Wikimedia Commons](https://commons.wikimedia.org/) under public-domain
or CC licenses (all compatible with re-hosting):

| File | Flag | Source |
| --- | --- | --- |
| `hawaii.svg` | State of Hawaiʻi | [Commons: Flag_of_Hawaii.svg](https://commons.wikimedia.org/wiki/File:Flag_of_Hawaii.svg) (PD) |
| `maori.svg`  | Tino Rangatiratanga (Māori) | [Commons: Tino_Rangatiratanga_Maori_sovereignty_movement_flag.svg](https://commons.wikimedia.org/wiki/File:Tino_Rangatiratanga_Maori_sovereignty_movement_flag.svg) |
| `ie-ga.svg`  | Green Harp Flag of Ireland | [Commons: Green_harp_flag_of_Ireland.svg](https://commons.wikimedia.org/wiki/File:Green_harp_flag_of_Ireland.svg) (PD) |

The Green Harp flag is used for the **Gaeilge** (Irish-language) entry so
it's visually distinct from the tricolour used for the English (Ireland)
entry — same nation, different linguistic identity.

## Adding a new flag

1. Drop `{code}.svg` into this folder (see filename convention above).
2. Register the entry in `js/globe-translator.js` → `FLAGS_ORDERED`.
3. Pick the tier that matches the language/regional family — the array
   order drives the spiral layout, with tier 1 closest to the paw.
