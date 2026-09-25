# Poza Nutą — design system

This document describes the public marketing site prepared for `pozanuta.pl` and its compact `/linki` hub.

## Overview
The homepage is a typographic marketing introduction to Poza Nutą, with clear routes for participants and venues. `/linki` is a compact official-channels hub, not a generic Linktree clone. Both surfaces should feel direct, nightlife-adjacent, and recognizably Poza Nutą while remaining highly legible for business visitors.

Impeccable is mandatory for all UI work. shadcn/ui is the sole UI component system. The current shadcn base is `base-nova` using Base UI. Do not introduce a competing component library.

## Colors

These colors apply to the public marketing routes; Admin has the separate scoped theme below.

- Dark neutral background is the default surface.
- Foreground is high-contrast off-white.
- Pink is the single branded accent.
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
- Maintain a clear hierarchy; avoid excessive all-caps outside labels/eyebrows.

## Layout
- Mobile-first.
- The homepage uses a wider editorial composition on large screens; information pages and `/linki` remain narrow and readable.
- Touch targets must remain at least comfortably tappable (roughly 44px+).
- Use spacing rhythm from the shadcn/Tailwind token system.
- Homepage contains no photography.
- Homepage sections introduce the offer and point to the existing karaoke, venue, contact, and links pages rather than repeating their full content.
- Public pages share a responsive branded header and full footer. The supplied canonical SVG is the logo asset; its geometry is preserved verbatim and rendered in the shell through a color mask.
- Admin navigation uses the shadcn Sidebar system: persistent/icon-collapsible on desktop and its off-canvas sheet on mobile. Only implemented destinations appear.

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
- Subtle only: short hover/press/focus transitions.
- No bouncing, floating, springy decoration, or attention-seeking entrance choreography.
- Respect `prefers-reduced-motion`.

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
- add photos to the public homepage;
- invent a final slogan before the team chooses one;
- call the public product “Poza Nutą Social”;
- make Gdynia the primary geographic label; use Trójmiasto;
- add Stage/event CTA in the current scope;
- add arbitrary promotional CTAs just because the schema can support them;
- add a second UI library;
- create purple/blue gradients, glass cards, nested cards, excessive badges, or generic AI-dashboard aesthetics.
