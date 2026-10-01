# UI foundation migration inventory

Snapshot of the implementation at `f9a046e` (2026-10-01), before the foundation documentation slice. `DESIGN.md` owns the durable foundation contract. This file records debt and migration order; it does not authorize visual changes. Recheck counts and usages against Git before each migration.

## Color migration status

The OKLCH token migration supersedes the **color source inventory below** as an implementation snapshot. `src/app/globals.css` now owns the canonical sRGB-derived brand values: ink `oklch(0.1730423076 0 0)`, paper `oklch(0.9730770612 0.0041189793 91.44622148)`, pink `oklch(0.6950236516 0.2229224359 355.31085912)`, and white `oklch(1 0 0)`. Public semantic and default/root tokens are separate declarations there; `.editorial-site` and its mobile Sheet map to them through `--ed-*` aliases. `@theme inline` remains the Tailwind/shadcn access layer. Admin light/dark and chart OKLCH values remain unchanged.

Route CSS design HEX values and fallback colors, including the 8-bit-alpha hero scrim, have moved to tokens or a derived `color-mix()`. The prose highlight is a token. `src/lib/color-compat.ts` contains the format-required sRGB output encodings for metadata, OG image and QR; `scripts/color-guard.mjs` checks them against canonical OKLCH. The standalone icon embeds only checked output colors. Recharts selector HEX values match generated stroke attributes, and the real logo SVG is a supplied artwork asset. Existing `color-mix()` effects retain their interpolation spaces. The remaining named `black` utilities in installed shadcn primitives belong to the later Admin normalization slice.

The next public CSS migration is `/kontakt` and `/linki`; their route layout and CSS classes have not been normalized in the color slice.
The [visual evidence](../evidence/oklch-token-migration-2026-10-01.md) records computed sRGB and 25-route baseline checks.

## Public styling inventory

`src/app/layout.tsx` loads `globals.css`, which imports `typeset.css`. `src/app/(public)/layout.tsx` loads `editorial.css` for every public route. Route pages then load the additional CSS below; a file shared by two routes is loaded by both pages. The four public-specific stylesheets contain **1,963 lines and 167 distinct `.ed-*` selectors** (distinct names across files, including shared names). There are no keyframes, masks, clip paths or View Transition rules in these four files today.

| CSS file | Lines | Distinct `.ed-*` names in file | `@media` blocks | Scope and dominant rule families |
| --- | ---: | ---: | ---: | --- |
| `src/app/globals.css` | 220 | 0 | 1 | App-wide Tailwind import, shadcn theme bridge, public root and Admin light/dark tokens, global focus and reduced-motion fallback. |
| `src/app/typeset.css` | 490 | 0 | 3 | Shared prose styling, typographic flow, tables, print and forced-colors behavior. Imported globally, not a route stylesheet. |
| `src/app/(public)/editorial.css` | 701 | 53 | 5 | All public routes: tokens, shell, header, menu, actions, social links, footer, privacy/consent treatments; 4 width breakpoints and reduced motion. |
| `src/app/(public)/home-editorial.css` | 181 | 50 | 4 | `/`: hero, editorial chapters, setlist and archive; width breakpoints at 1100, 900/701, 700 and 370 px. |
| `src/app/(public)/karaoke-venues.css` | 748 | 55 | 4 | `/karaoke` and `/dla-lokali`: their separate hero, steps, venue evidence and action layouts; 1050, 760 and 380 px plus reduced motion. |
| `src/app/(public)/contact-links.css` | 333 | 21 | 2 | `/kontakt` and `/linki`: contact block, routing and official channel hub; 700 and 370 px. |

The `.ed-*` family is an incumbent naming system, not the default architecture for future work. Representative TSX use is in `src/components/public-header.tsx`, `public-footer.tsx` and the five page files under `src/app/(public)/`. `editorial.css` also scopes some existing shadcn control colors with `--background`, `--foreground`, `--border`, `--ring` and related variables.

| Existing rule family | Classification | Migration reading |
| --- | --- | --- |
| Grid/flex, widths, positioning, alignment, overflow, image fit and ordinary responsive breakpoints in all four public CSS files | **TAILWIND MIGRATABLE** | Move to colocated utilities while preserving each route's current computed layout and breakpoints, including arbitrary values only where needed for identical geometry. |
| Padding, margin, gap, section rhythm, type size/weight/leading/tracking, text alignment, borders, ordinary colors and hover/focus states | **TAILWIND MIGRATABLE** | Use utilities and semantic tokens; preserve visible focus and contrast. Current `.ed-action`, `.ed-text-link`, `.ed-shell`, `.ed-meta` and route hero/section classes are migration sources, not new abstraction templates. |
| Public `--ed-*` theme definitions and shadcn theme bridge in `editorial.css`; Admin theme and `@theme inline` in `globals.css` | **CUSTOM CSS JUSTIFIED** | Token declarations and theme scoping are shared CSS boundaries. Values and aliases need consolidation in the color migration, not mechanical inlining. |
| `typeset.css` semantic prose descendants, print and `forced-colors`; global selection/focus and reduced-motion fallback | **CUSTOM CSS JUSTIFIED** | Shared document semantics and browser media behavior benefit from a scoped stylesheet. Audit whether any ordinary one-off declaration can later become a utility. |
| Current `color-mix()` for a derived pink (`contact-links.css`) and `color-mix()` in prose/focus styling | **CUSTOM CSS JUSTIFIED** | Derived or browser-specific color behavior may stay at a token/effect boundary; avoid making each mix a component literal. |
| `writing-mode: vertical-rl` plus rotate for the homepage section index | **TAILWIND MIGRATABLE** | Utilities can express this existing treatment; preserve it only while preserving the incumbent pixels. |
| Keyframes, View Transition pseudo-elements, masks/clips and advanced choreography | **CUSTOM CSS JUSTIFIED** only if introduced for a demonstrated need | No such current public rule needs preservation. `overflow-x: clip` is ordinary overflow, not mask choreography. |

The current media blocks are responsive layout and accessibility behavior, not evidence that CSS is inherently required. There are 15 `@media` blocks in the four public stylesheets and 4 in shared CSS. Shared CSS currently has no `.ed-*` selectors. The counted rule families include layout, typography, spacing, ordinary states and custom properties; count totals are intentionally not used as automatic quality gates because shorthands and multi-declaration lines make text counts misleading.

## Color source inventory

Source scan covers application CSS, TS/TSX, Tailwind theme bridge, chart configuration, public and Admin token scopes. Current design literals are HEX and OKLCH. No RGB/RGBA or HSL/HSLA literal function is present in the scanned application source; `color-mix(in srgb, ...)` and `color-mix(in oklab, ...)` specify interpolation spaces, not RGB/HSL source literals. `transparent` and `currentColor` are contextual values. Tailwind `black` in shadcn overlays and the destructive button is a named color literal.

| Source | Current representation | Classification and next treatment |
| --- | --- | --- |
| `editorial.css` `.editorial-site` `--ed-ink`, `--ed-paper`, `--ed-pink`, `--ed-pink-ink`, `--ed-white`, `--ed-muted`, `--ed-line` | HEX: `#101010`, `#f7f6f3`, `#ff4fa3`, `#a50e5a`, `#ffffff`, `#575654`, `#c9c8c5` | **BRAND TOKEN** for ink/paper/pink/white; **SEMANTIC UI TOKEN** for muted/line/pink-ink. Canonicalize values in OKLCH, keep their public scope and rendered colors. |
| `editorial.css` public shadcn aliases (`--background`, `--foreground`, `--primary`, `--ring`, etc.) | References to `--ed-*`, plus HEX for `--secondary`, inverse foreground/border and repeated footer values | **SEMANTIC UI TOKEN** for aliases; direct HEX occurrences are **LEGACY LITERAL** to map to semantic tokens without changing pixels. |
| `globals.css` `:root` public/default semantic variables | HEX, including `#080808`, `#f7f7f7`, `#ff4fa3`, `#ff6b6b` | **SEMANTIC UI TOKEN** values with a current legacy HEX representation; pink is the brand mapping. Keep this scope distinct from `.editorial-site`. |
| `globals.css` `:root:has(.admin-theme)` and `.dark` | OKLCH semantic light/dark tokens, including sidebar and `--chart-1`…`--chart-5` | **ADMIN SEMANTIC TOKEN** and **CHART TOKEN**. Existing OKLCH is a start, not proof that all public/brand mappings are unified. |
| `globals.css` `@theme inline` | `--color-*` aliases to CSS variables | Tailwind/theme bridge; **SEMANTIC UI TOKEN** access layer, not another literal palette. |
| `src/components/admin/analytics-chart.tsx`, `src/components/ui/chart.tsx` | `var(--chart-2/3)` and `var(--color-*)`; `#ccc`/`#fff` inside Recharts selectors | **CHART TOKEN** use; selector HEX values are **COMPATIBILITY REPRESENTATION** for Recharts' generated defaults, not chart design choices. |
| `home-editorial.css`, `karaoke-venues.css`, `contact-links.css` | Repeated `#fff`, `#101010e8`, gray borders/captions, `#b9236d`, fallback `--ed-page-*` HEX and derived `color-mix()` | **LEGACY LITERAL** or legacy token fallback. Reconcile against brand/semantic tokens and alpha semantics in the token migration. The mix is a derived effect, not an independent palette. |
| `typeset.css` highlight `oklch(0.86 0.17 95)` | Inline OKLCH | **LEGACY LITERAL** despite canonical syntax: component/prose code should still consume a token. Other `color-mix()` rules use contextual colors. |
| `src/app/(public)/layout.tsx`, `src/app/layout.tsx`, `src/app/manifest.ts` | HEX `themeColor`, `background_color`, `theme_color` | **COMPATIBILITY REPRESENTATION** required by metadata/manifest output. Tie to canonical tokens when token migration provides a safe build-time representation. |
| `src/app/opengraph-image.tsx` | Repeated inline HEX brand/paper/ink | **LEGACY LITERAL** in generated artwork; the image API may require a compatible output format, but current repeated design values should derive from tokens. |
| `src/app/(admin)/admin/links/[id]/qr/route.ts` | HEX dark/light passed to QR SVG generator | **COMPATIBILITY REPRESENTATION** for the QR API; preserve scan contrast and derive from canonical intent later. |
| `src/components/ui/alert-dialog.tsx`, `dialog.tsx`, `sheet.tsx`, `button.tsx` | `bg-black/10`, `text-black` | **LEGACY LITERAL** named colors in installed primitives; assess token mapping when normalizing shadcn without changing overlay or destructive contrast. |

The token migration must verify computed sRGB/pixel output at the same display states. Converting `#ff4fa3` to approximate OKLCH by eye is not acceptable. Preserve any format-mandated HEX as derived compatibility data, with one canonical design value.

## Admin shadcn inventory

`components.json` selects `base-nova`, Tailwind variables and Lucide. Installed `src/components/ui/` primitives are Alert, AlertDialog, Badge, Button, Card, Chart, Dialog, Empty, Field, Input, Label, NativeSelect, Select, Separator, Sheet, Sidebar, Skeleton, Table and Tooltip. Classification below concerns repeated application patterns, not whether every installed primitive should appear on every screen. Missing means required by a planned composition or present need; absence of an unused control is not a defect by itself.

| Pattern | Class | Evidence and future handling |
| --- | --- | --- |
| Text/date inputs and simple select controls | **KEEP** | `AdminInputField`, `AdminNativeSelectField`, `Input`, `NativeSelect`, `Field`; campaign, destination, tracking link, team and referral forms. Native select remains suitable for short fixed choices. |
| Textareas | **MISSING** | No shared Textarea primitive or current textarea field was found. Install when a real multiline Admin task requires it; do not invent a use now. |
| Search/combobox | **MISSING** | No Admin combobox/search control is currently implemented. If a large searchable choice is needed, add the appropriate shadcn composition instead of extending a simple native select. |
| Checkbox/switch | **MISSING** | No Admin checkbox/switch control is currently implemented; status changes use explicit Buttons, forms and confirmations. Add a suitable primitive only for an actual binary preference or selection use. |
| Dialogs and confirmations | **KEEP** | `Dialog` and `AlertDialog` in `team-controls.tsx` and `referral-controls.tsx` already provide interaction semantics. |
| Popover/calendar for date ranges | **MISSING** | Neither primitive is installed. Future range selection needs shadcn Popover + Calendar `mode="range"`, Button and Field, with a shared `AdminDateRangePicker` business composition. |
| Dropdown menus | **MISSING** | No dropdown-menu primitive or repeated custom replacement found. Install only when a real action group warrants a menu. |
| Tooltips | **KEEP** | `TooltipProvider` in Admin layout and SidebarMenuButton tooltip use. |
| Data tables and mobile adaptation | **COMPOSE** | `Table` is used across reports and lists; `AdminResponsiveTable` adds deliberate mobile layout. Keep the shadcn table base and review individual instances for consistent mobile semantics. |
| Pagination | **COMPOSE** | `/admin/acquisition` uses previous/next links with `buttonVariants` and an `offset` query. A shared pagination business composition can use existing Button/Link semantics; install shadcn Pagination if richer page navigation becomes necessary. Preserve query behavior. |
| Cards and stat blocks | **COMPOSE** | `StatCard` is built from Card; many report sections use Card. Keep meaningful groupings, but avoid nested or automatic cards when information hierarchy is clearer without them. |
| Empty states | **REPLACE** | `AdminEmpty` composes shadcn Empty correctly, but several list/report routes still use one-off muted paragraphs for empty data (for example destinations and dashboard tables). Normalize where an actionable empty state is needed. |
| Errors/notices | **COMPOSE** | `AdminNotice` composes shadcn Alert with tone and live-region semantics; `ReadUnavailable` uses it. Reuse the business component for read errors rather than bespoke message boxes. |
| Skeleton/loading | **REPLACE** | `Skeleton` is installed and used in team/referral loading; `src/app/(admin)/admin/paths/loading.tsx` and `funnels/loading.tsx` still include raw `animate-pulse` blocks. Normalize only when those screens are migrated. |
| Navigation/sidebar | **KEEP** | `AdminSidebar`, `SidebarProvider`, `SidebarInset`, `SidebarTrigger`, Sheet behavior and tooltips are shadcn based. Preserve permission-aware navigation. |
| Forms/field validation | **COMPOSE** | `AdminFormField` already composes Field, FieldLabel, FieldDescription, FieldError. Report filters still repeat Label + Input and vary invalid descriptions. Consolidate the repeated business pattern while preserving server validation and `aria-invalid`/`aria-describedby`. |
| Realtime charts, QR links and analytics-specific report views | **CUSTOM JUSTIFIED** | `AnalyticsChart` uses shadcn Chart around Recharts; realtime/report metrics, QR actions and specialized inspector content carry product-specific meaning. Keep those business views custom while using existing primitives for controls. |

### Date-range reuse map

One future `AdminDateRangePicker` should replace the repeated `from` + `to` **UI** in these nine custom report routes: `/admin` (`page.tsx`), `/admin/acquisition`, `/admin/acquisition/[id]` (both use `src/components/admin/acquisition-range.tsx`), `/admin/data-quality`, `/admin/funnels`, `/admin/key-events`, `/admin/segments`, `/admin/paths` and `/admin/attribution`. The route files for the other paths currently render two `Input type="date"` controls directly. The campaign form's `startsOn` + `endsOn` is a business validity interval, not a report filter; assess the same component separately because optional endpoints and validation may differ.

Conceptual composition: Button + Popover + Calendar `mode="range"` + Field/form integration + Lucide where useful. Keep the existing `range=custom`, `from` and `to` query/API contract, inclusive `to` display, Europe/Warsaw day boundaries, maximum range validation, invalid-input feedback and report scope parameters. Do not implement the picker in this slice.

## Migration order and acceptance

1. **A — COLORS / TOKENS:** consolidate canonical OKLCH values, semantic scopes and compatibility output; verify same computed colors and screenshots.
2. **B — PUBLIC CSS → TAILWIND:** migrate `/kontakt`, `/linki`, `/karaoke`, `/dla-lokali`, then `/`. Move ordinary `.ed-*` rules into colocated utilities; retain only documented CSS exceptions. Verify route behavior and responsive geometry at each step.
3. **C — ADMIN SHADCN NORMALIZATION:** add needed primitives and compose report filters/date range, then normalize empty/loading/form patterns without altering query/API or permissions.
4. **D — FRONTEND CONTRACT GUARDS:** add small mechanical guards only after the migrated patterns are stable. Do not attempt a regex design judge.
5. **E — REPLACEMENT VISUAL DIRECTION:** explore and approve a new visual world with comps. Digital Music Editorial is incumbent evidence, not the destination authority; do not generate `.impeccable/design.json` from it.
6. **F — HOMEPAGE NORTH STAR:** build the approved new homepage after direction and content evidence exist.

Every migration has the acceptance rule: **same pixels, same behavior, better architecture**. This inventory slice performs none of A–F.
