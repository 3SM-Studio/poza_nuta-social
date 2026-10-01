# OKLCH token migration — visual evidence

Baseline source: `main` at `2826d53cbfc48006b805bcb5de545b2240dc6edc`, Node 24.19.0, Next.js 16.3.8, Playwright Chromium. The local, ignored capture manifests and PNGs are under `.impeccable/local-baseline/token-migration/`. They are evidence for this source change, not Production approval.

The same full-page screenshot procedure covered `/`, `/karaoke`, `/dla-lokali`, `/kontakt`, `/linki` at 390, 768, 1024, 1440 and 1920 px by 900 px, device scale 1, Polish locale, light color scheme and reduced motion. All 25 responses were HTTP 200. Before/after screenshot geometry matched in every case. Raw hashes differ: 447,204 of 105,649,234 pixels (0.4233%) changed by at most 7 channel levels. A controlled render of the migrated pages with only the former sRGB color literals restored through root variable overrides reproduced **all 25 original PNGs byte for byte**. This isolates the differences to browser rasterization of the new color representation; layout, content and assets were not changed.

Canvas readback of 25 canonical brand, public and root token colors matched the former 8-bit sRGB channels exactly. The 8-bit-alpha caption scrim read back as `(16, 16, 16, 232)` and the existing contact `color-mix(in srgb, ...)` as `(198, 64, 128, 255)`. The Admin login screen returned HTTP 200; its dark screenshot and a light variant with the `dark` class removed each matched their old-root-color control PNG byte for byte. The Admin light/dark and chart token declarations were untouched. This Admin check covers the accessible login composition; the protected dashboard was not opened without authentication.

Local rerun material: `.impeccable/local-baseline/token-capture.cjs.txt`, `check-computed.cjs.txt`, `all-pixel-diffs.cjs.txt`, `all-color-control.cjs.txt`, and `admin-check.cjs.txt`. Copy a script to a temporary `.cjs` name in that ignored directory before running with Node, then remove or rename it before `npm run verify:source` so ESLint does not include it. The checked compatibility mapping and guard tests live in tracked source.

**VISUAL DESIGN CHANGED: NO**
