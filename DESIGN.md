# Poza Nutą — UI foundation and incumbent visual reference

This file is the canonical implementation and design-system foundation for public UI and Admin UI. `PRODUCT.md` owns product truth; `docs/PRODUCT_DECISIONS.md` records approved visual decisions; `docs/PUBLIC_MARKETING_V2.md` owns current route and content requirements. The existing Digital Music Editorial rules below describe the **incumbent visual reference** that is implemented today. They are not approval of a future replacement visual world. A future direction requires its own approved exploration and comps; `.impeccable/design.json` remains deferred. The current debt and migration order are recorded in [`docs/ui/FOUNDATION_MIGRATION.md`](docs/ui/FOUNDATION_MIGRATION.md).

## Durable foundation contract

### Public frontend — Tailwind-first

Use Tailwind utilities colocated with the component for layout, spacing, typography, responsive behavior, standard token colors, borders, states and ordinary interaction styling. Do not create new route-level CSS or semantic styling classes such as `.ed-new-section`, `.ed-new-card` or `.ed-new-hero-grid` merely to express those rules. Custom CSS is an exception with a documented technical reason, such as complex keyframes, View Transition pseudo-elements, mask/clip choreography or browser-specific behavior. Existing `.ed-*` CSS is a legacy migration source and stays in place until route-by-route, same-pixels migration. The absence of a migration here does not endorse new rules in that style.

### Colors — OKLCH-first and token-first

**OKLCH is the canonical design color representation.** Define literal design colors at the token boundary, then use semantic or brand tokens through Tailwind utilities or shadcn variables in components: canonical OKLCH value → semantic/brand token → Tailwind utility/shadcn variable → component. Do not introduce incidental HEX, RGB or HSL literals in design code. A format that requires HEX, such as manifest metadata, theme-color output, generated images or an external API, may use a compatibility representation derived from the canonical token; it is not a second design authority. Existing HEX and other literals remain migration inventory, not permission to add more. Preserve current rendered colors until the dedicated token migration verifies the same pixels.

### Admin — shadcn-first

Use an appropriate installed shadcn component first. When suitable primitives exist, compose them. Build business-specific components from shadcn primitives and Tailwind. Create a primitive from scratch only when the lack of a reasonable equivalent is documented. This repository uses `base-nova`, Base UI, `cn`, Lucide and `src/components/ui`; keep server-verified Admin authorization intact. shadcn provides interaction semantics, not a mandate for cards, nested rounded containers or a generic dashboard layout. Design business composition and information hierarchy deliberately. The current Admin component inventory and the future `AdminDateRangePicker` reuse map are in the migration document.

### Motion — authored and sparse

Motion must support rhythm, continuity, feedback or product/brand character. Use at most one prominent signature motion moment on a future surface when justified, plus a few secondary interaction or transition moments. Avoid generic fade-up-on-scroll everywhere, scroll hijacking and animation dependencies without a need. Treat `prefers-reduced-motion` as an equal variant; content and actions remain available without animation. This is a future design constraint, not an instruction to animate the incumbent UI in this slice.

### Accessibility and product truth

Preserve keyboard and focus behavior, semantic content, readable contrast, zoom and responsive access, and the factual product, consent and Admin authorization contracts. A future visual world may replace the incumbent composition only after approved direction and comp-first validation. Do not generate a design sidecar from the incumbent appearance.

## Incumbent visual reference — Digital Music Editorial

The sections below document the implemented public appearance and its current approval history. They guide maintenance of existing pixels but are not replacement-world authority. This foundation slice changes no rendered UI.

## Overview

**Digital Music Editorial** treats Poza Nutą as a living local music culture, documented through real evenings. The design pairs an editorial reading rhythm with the immediacy of a venue poster: factual metadata, large serif statements, clear sans-serif actions, asymmetry, and a small number of unmistakable pink chapters. A visitor should see a human event, understand that singing is optional, and find a truthful next step without decoding the composition.

The system is intentionally different from the earlier dark-first poster site. Light space carries much of the reading; black marks experience and closing moments; pink anchors identity and the most consequential transitions. The real logo remains the only logo. No final master-brand slogan is implied by a page heading.

## Colors

- Brand anchors: near-black `#101010`, Poza Nutą pink `#ff4fa3`, white, and neutral paper `#f7f6f3`.
- Canonical brand OKLCH values (`--brand-ink`, `--brand-paper`, `--brand-pink`, `--brand-white`) and public semantic OKLCH values live in `src/app/globals.css`. `.editorial-site` in `src/app/(public)/editorial.css` maps them to incumbent `--ed-*` aliases and scoped shadcn variables. The aliases preserve existing public CSS while routes await Tailwind migration; they are not a second palette. `--ed-pink-ink` is the darker text treatment on pale surfaces; bright brand pink is reserved for large display accents or filled surfaces with dark text.
- Black, paper and pink each have a narrative job. Do not alternate backgrounds mechanically or add gradients, burgundy/plum, neon glows or decorative shadows.
- Preserve semantic shadcn tokens for controls and the separate Admin theme. Public route tokens do not redefine Admin.

## Typography

- **Instrument Serif** is the public display voice. Its normal and italic forms make a difference between factual information and an invitation; emphasis must be selective, not applied to every line.
- **DM Sans** carries body copy, actions, navigation and metadata. Set body text for reading, actions for scanning, and small uppercase metadata at **12px minimum** with intentional tracking.
- Display scale follows the composition and available space. A page should have a clear dominant thought, then a different visual register for proof, process and utility. Avoid a repeating giant-heading / paragraph / button recipe.
- Preserve Polish characters, accessible line lengths, natural wrapping and visible focus. Typography is not a substitute for meaningful copy.

## Layout

- Use editorial asymmetry and measured negative space. Align text and media to a shared underlying grid, then break it only for a purposeful moment such as the homepage title crossing the photo field.
- Metadata behaves like a publication index: it identifies place, date, role or source. It never invents quantification or implies a real-time event status.
- The homepage moves from a recognizable local invitation and real-event frame into the choice to listen or sing, a setlist-like participation sequence, one factual iGranie archive artifact, and a truthful official-channel close.
- The setlist is a brand-specific way to explain the on-site flow. It must remain a readable ordered list: come, scan, enter code, choose a song, join the queue, sing. It is for guests who opt to perform; attendance itself requires none of it.
- The iGranie treatment joins date, place, photograph and confirmed responsibility facts as one archival object. It does not infer turnout, results, endorsement or exclusivity.
- Secondary pages have distinct jobs: `/karaoke` explains participation and current-information access; `/dla-lokali` explains per-venue collaboration and the documented realization; `/kontakt` makes `hello@pozanuta.pl` immediately usable; `/linki` is a short, ordered official-channel hub.

## Media

- Use only actual Poza Nutą event media with a traceable event, date, place and rights status. Never use stock or generated substitute karaoke imagery. Current assets remain **local preview material**; publication rights and participant/venue consent are unresolved under `docs/PUBLIC_MARKETING_V2_MEDIA.md`, blocking deployment.
- Crop separately for desktop and mobile while keeping people and event context legible. A caption identifies a documented frame. Pair related images as a sequence of different human moments; do not repeat the hero frame merely to fill a later section.
- Offscreen `next/image` media is lazy-loaded; the first meaningful image may have priority. Add video only when real footage and rights support a stronger story, with poster, static fallback, captions/transcript where needed, and reduced-motion handling.

## Components

- Header: real SVG mark, compact place/format context, four direct public routes on desktop, a labeled shadcn Sheet menu on mobile. The menu preserves keyboard access, Escape and focus return.
- One participant action dominates the homepage opening. A secondary official-channel action answers date/place intent accurately. Venue contact is visible but has its own route; it does not compete as a second hero conversion.
- Actions use plain destination-specific wording. `/go/[slug]` remains the route for official outbound choices, and tracked contact links retain the existing analytics behavior. Design does not create a generic CTA builder.
- Footer is a closing brand statement followed by useful navigation and privacy controls, not an unrelated link dump. The real logo, local geography, official channels and legal/consent controls remain visible.

## Responsive, motion and accessibility

- Compose mobile separately: direct logo/menu, readable display scale, text and action before the documentary image, then full-width chapters with comfortable side margins. `/linki` stays deliberately narrow and fast for QR/bio arrivals.
- Keep touch targets approximately 44px or larger, no horizontal overflow from 320px upward, and readable layouts at browser zoom. Avoid tiny metadata or placing a consent overlay over the only primary action.
- Current screens rely on static composition and informative hover/focus transitions. Future motion follows the authored, sparse and reduced-motion-safe contract above; do not treat the current static treatment as a permanent constraint.
- Semantic headings, one `h1`, meaningful alt/captions, explicit link purpose, visible focus, keyboard navigation and sufficient text contrast are required. Consent choices remain understandable in a fresh first-visit viewport.

## Implementation boundary

- shadcn/ui `base-nova` + Base UI + `cn` is the only component system. Do not bypass `src/components/ui` with raw interactive form controls in application screens or add a competing UI library. Apply the Tailwind-first and token-first foundation above to new work.
- The Admin uses its separate Nova / Neutral / Rose theme, Geist typography, shadcn Sidebar and Chart layer. This public art direction does not change Admin layout or analytics semantics.
- Keep server-rendered content, route SEO/structured-data truth, consent and attribution behavior, and the existing `/r` and `/go` contracts.
- Impeccable critique and technical audit are required before release work; `npm run verify` on Node 24 is the repository gate. Publication additionally requires resolving the media-rights blocker and separate legal/deployment approvals.

## Elevation & Depth

Use surface contrast, typography, borders and spatial pacing for hierarchy. Shadows are functional and rare. Do not use glass panels or layered card stacks as a substitute for composition.

## Shapes

The editorial system favors clean rectangular edges and documentary frames. Controls keep their shadcn interaction semantics. Shape changes should identify a real function or brand moment rather than add decoration.

## Do's and Don'ts

### Do

Make the visitor's first action evident, preserve legible human subjects and factual captions, design every chapter for mobile, and keep public and Admin tokens isolated.

### Don't

Use SaaS marketing templates; generic split heroes; repeated identical section grids; anonymous card walls; black-luxury sameness; nightclub/cyberpunk clichés; large type without information hierarchy; decorative icons; fake testimonials or numbers; UI pretending to be the independent karaoke platform; invented event pages or a permanent slogan; approximated logo geometry.
