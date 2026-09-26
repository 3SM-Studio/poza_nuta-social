# Poza Nutą — design system

This document describes the public marketing site prepared for `pozanuta.pl` and its compact `/linki` hub. `docs/PUBLIC_MARKETING_V2.md` is the canonical V2 implementation brief; the Admin theme below is unchanged.

## Overview
The selected public direction is **Culture Editorial**: a music-culture publication rhythm built from the real Poza Nutą logo, strong typography, genuine event evidence, black and white fields, and structural pink. The homepage is consumer-first; the venue path is visible but subordinate to the participant invitation. `/linki` remains a compact official-channels hub. Mate Academy informs marketing mechanics, not visual identity. The selected direction supersedes the earlier live-poster exploration without changing the product contract.

Impeccable is mandatory for all UI work. shadcn/ui is the sole UI component system. The current shadcn base is `base-nova` using Base UI. Do not introduce a competing component library.

## Colors

These colors apply to the public marketing routes; Admin has the separate scoped theme below.

- Public UI palette: neutral black `#080808`, off-white `#f7f7f7`, Poza Nutą pink `#ff4fa3`, and neutral grays. White editorial fields may interrupt the black ground.
- Pink is structural: a full visual chapter, typographic emphasis, and primary action color. It is not a burgundy, wine, plum, or purple-red palette.
- Use semantic shadcn tokens (`background`, `foreground`, `card`, `border`, `muted`, `accent`, etc.), not scattered hex values in components.
- Do not use decorative gradients or neon glow soup.
- Destructive/success/status colors are functional only and must not compete with the branded accent.

## Admin visual foundation

- The Admin routes use the scoped Nova / Neutral / Rose theme in `src/app/globals.css`; public routes retain the brand theme above. The `admin-theme` route marker scopes both page content and portaled shadcn overlays. Dark is the current default; the same semantic tokens define the light variant.
- The Admin light and dark token values in that stylesheet are canonical, including charts, sidebar colors, and `0.625rem` radius. Use semantic tokens instead of local colors.
- On dark surfaces, use the brighter `sidebar-primary` token for small rose text and focus outlines; use `primary` for filled actions. This preserves contrast without changing the canonical palette.
- shadcn/ui (`base-nova` + Base UI) remains the sole component foundation. Admin typography is Geist; icons are Lucide. Use restrained borders and shadows, compact dashboard hierarchy, and the supplied Nova / Neutral / Rose reference as visual direction, not as product content.

## Typography

These font choices apply to the public marketing routes; Admin uses Geist as specified above.

- Display: Bebas Neue for the Poza Nutą wordmark-style headline treatment where appropriate.
- Interface/body: Space Grotesk.
- Do not replace the typography with generic Inter/system-font styling unless the brand system is intentionally changed.
- Maintain a clear hierarchy. Compact uppercase metadata and captions have a 12px minimum; body copy and actions remain comfortably readable.
- Treat text as a visual element when it improves the story, while keeping practical information and calls to action easy to scan.

## Layout
- Mobile-first.
- The homepage moves through distinct compositions: typographic brand opening with an early real-event still, pink low-pressure invitation, compressed participation steps, a light archival field note, a quieter venue bridge, and a full-width closing statement. Avoid repeating label → giant heading → paragraph → link as the default section recipe.
- The same editorial system adapts to mobile through deliberate re-composition, not a simple stacked desktop grid. Information pages and `/linki` remain narrower and readable.
- Touch targets must remain at least comfortably tappable (roughly 44px+).
- Use spacing rhythm from the shadcn/Tailwind token system.
- Authentic event photography is evidence with visible event context and captions, not decoration. Video remains optional; the selected homepage favors distinct still moments and avoids repeating its hero frame lower on the page. Never use stock or generated substitute karaoke photographs.
- Art-direct horizontal and vertical compositions separately. Capture venue/crowd context, a performer mid-shot, audience reactions, friends, host and host/participant interaction, with natural atmosphere and negative space where copy needs it. Do not assume one crop works on desktop and mobile.
- Homepage sections progress from brand/experience to real evidence, practical participation, a current-information path, venue collaboration, objections and a clear close. Each section must add a distinct marketing job; do not pad the page to imitate a benchmark.
- Public pages share a responsive branded header and full footer. The supplied canonical SVG is the logo asset; its geometry is preserved verbatim and rendered in the shell through a color mask.
- Admin navigation uses the shadcn Sidebar system: persistent/icon-collapsible on desktop and its off-canvas sheet on mobile. Only implemented destinations appear.

## Media

- Every published image or video, testimonial, venue/partner logo, number and case study needs a verified source plus the relevant publication rights or consent. The current real-media rights gate in `docs/PUBLIC_MARKETING_V2_MEDIA.md` is unresolved and blocks public deployment. Missing proof is never filled with a placeholder.
- Begin with optimized native video, a poster and static fallback. Muted `playsInline` loops may support the story; defer offscreen video, provide captions/transcripts for speech and a static reduced-motion alternative.
- Consider Mux or `next-video` only when a real video library requires additional infrastructure.

## Elevation & Depth
- Prefer hierarchy through spacing, borders, typography, and surface contrast.
- Shadows are minimal and functional.
- Avoid glassmorphism, floating-card stacks, nested card-on-card compositions, and decorative dark glows.

## Shapes
- Moderately rounded corners, consistent with the chosen shadcn preset.
- Avoid excessive pill-shaped containers.
- Social actions should feel like intentional rows/actions, not a wall of unrelated cards.

## Components
- `components.json` is authoritative for shadcn configuration.
- Use shadcn components/primitives for interactive controls.
- Current base is Base UI; raw form controls outside the shadcn UI layer are forbidden by CI.
- Components may be customized for Poza Nutą, but remain inside the shadcn-owned source layer.
- On `/linki`, Instagram is the primary social CTA; TikTok is second. Facebook is visually quieter. YouTube appears only when active.
- `Kontakt / współpraca` is a purposeful first-party route, not an arbitrary generic CTA system.
- Every loading, empty, error, disabled, keyboard-focus, mobile, and desktop state must be designed.
- Admin tables and dialogs must remain usable at 360px, long emails/names must wrap safely, destructive membership actions require confirmation, and collapsed navigation retains accessible names/tooltips.
- Every analytics visualization uses the project shadcn Chart layer from `@/components/ui/chart` (`ChartContainer`, tooltip/legend primitives as appropriate) with Recharts only as its plotting engine. Charts use design tokens, responsive containers, the accessibility layer where supported, and a text/table/KPI alternative. Do not create a parallel chart system.

## Motion
- Microinteractions clarify hover, press, focus and state. Selected storytelling sequences may guide attention when they have an explicit narrative purpose.
- Preserve native scrolling, keyboard access, content visibility, performance and `prefers-reduced-motion`. Avoid bouncing, floating and attention-seeking choreography.
- `motion` or `gsap`/ScrollTrigger require a concrete interaction or storyboard; `lenis` requires demonstrated improvement. Rive/WebGL/Three.js require a specific creative concept. No motion dependency is authorized by this direction document alone.

## Accessibility
- Semantic HTML first.
- Visible keyboard focus.
- Sufficient contrast.
- Meaningful labels for social/contact actions.
- Do not use color as the only carrier of state.

## Do's and Don'ts
### Do
- make the homepage feel like the main Poza Nutą brand surface and `/linki` like its small companion;
- optimize for a person scanning a QR on a phone;
- make business contact obvious without crowding the page;
- preserve fast server-first rendering;
- use Impeccable audit/critique/harden/polish before release.

### Don't
- use stock, generated substitute karaoke imagery, invented proof or media as decoration;
- invent a final slogan before the team chooses one;
- call the public product “Poza Nutą Social”;
- make Gdynia the primary geographic label; use Trójmiasto;
- add Stage/nearest-event CTA or publish own event routes before their authoritative source and lifecycle are ready;
- add arbitrary promotional CTAs just because the schema can support them;
- add a second UI library;
- create purple/blue gradients, glass cards, nested cards, excessive badges, generic SaaS marketing aesthetics, black-luxury sameness or neon-heavy cyberpunk.
