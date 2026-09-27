# Public Marketing V2 — canonical implementation brief

Status: **Digital Music Editorial is the current public art direction (2026-09-27); real-media publication rights remain unresolved and block deployment**. The earlier Culture Editorial and live-poster layouts are superseded as visual instructions. This brief translates the owner decisions in `docs/PRODUCT_DECISIONS.md` into route and content requirements. `PRODUCT.md` and `DESIGN.md` remain authoritative for durable product and current visual rules. The asset inventory and rights gate live in `docs/PUBLIC_MARKETING_V2_MEDIA.md`; the production and permissions brief lives in `docs/PUBLIC_MARKETING_V2_CONTENT_PRODUCTION.md`. Admin Platform is out of scope.

## Product thesis and audience

Poza Nutą invites people to participate in music together without requiring vocal skill. Karaoke is today's key format and a necessary Trójmiasto SEO term, not the full limit of the future brand. Do not imply events elsewhere in Poland before they exist. The approved line “Nie musisz umieć śpiewać. Musisz chcieć śpiewać.” can lead karaoke/campaign moments; it is not the permanent master-brand slogan.

The homepage is **consumer-first**: help a guest understand the experience, believe it is real, find current information and decide to attend. Venue/organizer collaboration is visible in navigation, receives a meaningful homepage section, and has its own evidence and contact path on `/dla-lokali`. Do not place two equally dominant consumer/B2B actions in the hero. The owner has confirmed that guests may attend without singing; explain this without pressuring them to perform.

## Creative and content contract

**Digital Music Editorial with documentary event evidence.** Use the supplied real logo, Instrument Serif display, DM Sans body/navigation, neutral black `#101010`, paper `#f7f6f3`, white and Poza Nutą pink `#ff4fa3`. The public site uses factual publication-like metadata, asymmetrical reading grids, a setlist participation sequence and an archival iGranie artifact. Photography documents people and place rather than decorating a generic split layout. The full current visual system is in `DESIGN.md`; earlier Bebas Neue/Space Grotesk, dark-first and fixed Culture Editorial composition instructions are obsolete. Mate Academy informs marketing mechanics only. Keep `/linki` compact for QR/bio use and `socials.pozanuta.pl` in that role; the root domain carries the full brand story.

Homepage photography and short video are approved for V2. Hero video is optional, and a strong real still outranks weak footage. No stock or generated substitute karaoke photography. Do not publish invented testimonials, numbers, venue names/logos, events, case studies or mock media. Each proof item requires a source, factual check and publication rights/consent. An absent proof section stays absent until material exists.

The current local build uses genuine event stills as preview evidence. Their publication rights and participant/venue consent must be cleared before deployment. For future media production, commission a documentation session covering wide venue/crowd context, performer, audience reactions, friends, host/participant interaction, horizontal and vertical compositions, and short loops. Record event, date, place, subject consent, usage scope and owner for each selected asset. Collect testimonial candidates only for later verification and permission; none are implied by this build.

## Information and conversion architecture

- `/`: experience and evidence first, one dominant participant action, clear secondary navigation toward B2B.
- `/karaoke-trojmiasto`: practical participation, including optional singing and the QR → six-digit session code → song → queue flow, plus the authoritative path to current dates until owned event pages exist. CTA language must accurately describe its destination; never present the independent karaoke platform as brand-owned technology.
- `/dla-lokali`: per-venue scope and responsibilities, a factual iGranie w Lochu realization without invented outcomes or testimonial, risk-reducing answers and first-party contact.
- `/kontakt`: one usable first-party route with the owner-approved hello@pozanuta.pl address for venue enquiries and general participant questions. Date/place questions point to current official channels through `/linki`.
- `/linki`: ordered official social channels and contact, optimized for a phone after bio/QR entry; never a generic CTA builder or second homepage.
- `/wydarzenia` and `/wydarzenia/[slug]`: conceptually approved **future** surfaces, not part of the initial implementation. Gate: authoritative maintained event source, named update owner, date, place, status, cancellation/change workflow and archive semantics. No empty directory or automatic Stage dependency.
- `/prywatnosc` and `/cookies`: preserve existing consent and disclosure access.

Consumer journey: discover → understand the real experience → trust → see an authoritative date/current channel → attend. B2B journey: discover → understand the offer → see verified evidence → understand process/risk → contact. Future audiences outside Trójmiasto can follow content; they must not be promised a local event.

## Homepage story architecture

1. **Opening:** identify Poza Nutą, Trójmiasto and karaoke, make the participant information path immediately clear, and identify the real event frame.
2. **Permission to belong:** show that a person can listen and socialize without taking the microphone; use distinct documented moments to show both choices.
3. **Setlist:** explain the opt-in on-site flow in a memorable but unambiguous ordered sequence.
4. **Archive:** present iGranie w Lochu as one factual, dated realization with a distinct image and confirmed division of responsibilities; lead serious venue enquiries to `/dla-lokali`.
5. **Current information:** close with the official-channel path for dates and places until first-party event pages have an authoritative lifecycle.

Each chapter has a different marketing job. Omit unsourced voices, unverified metrics or event claims. Repeat an action only when the preceding content has added a reason to take it.

## Interaction and media system

- Level 1: short, accessible UI state transitions; existing CSS/shadcn first, `motion` only for a concrete need.
- Level 2: a few authored storytelling sequences if their storyboard improves comprehension; evaluate `gsap`/ScrollTrigger later.
- Level 3: native scrolling by default. Consider `lenis` only after it demonstrably improves the experience without harming focus, anchors, keyboard use or reduced motion.
- Level 4: Rive/WebGL/Three.js only for a separately approved concept with a specific communication job.

Start video with optimized native files, poster, muted `playsInline` loops, static fallback, lazy loading beyond the hero, captions/transcript for speech and a reduced-motion still. Protect mobile bandwidth and first-content visibility. Consider `next-video` or Mux only when actual volume and delivery needs justify them. **No dependencies are approved by this brief.**

## Preservation and quality gate

Maintain server-rendered content, route-specific metadata/canonical/OG, truthful structured data, sitemap/robots, the Trójmiasto service-area facts, first-party consent, source/QR attribution, `/r/[code]`, `/go/[slug]`, best-effort redirects and the official destination model. New routes must extend public-path, analytics and SEO contracts together. No raw IP, fingerprint, exact device model or precise location. Preserve existing accessibility behavior and target WCAG 2.2 AA verification; do not claim compliance from automated checks alone.

The result is premium when a guest understands the offer and next action in the first viewport; every claim has its proof; images have deliberate mobile/desktop compositions; typography and section pacing feel recognizably Poza Nutą; B2B has its own credible path; keyboard, reduced-motion and no-video states remain complete; and text/CTA load usefully before heavy media on a slow phone. Judge those observable outcomes, not a subjective visual score or the number of effects.

## Coherent implementation slices

1. **Public foundation, experience clarity and factual B2B proof — implemented.** Existing route, SEO, privacy, analytics and content contracts were established before the current art direction.
2. **De-anchored public art direction — implemented locally.** Three independent full-page concepts were rendered. Digital Music Editorial was selected and applied to `/`, `/karaoke-trojmiasto`, `/dla-lokali`, `/kontakt` and `/linki`, with a new shell, type system, responsive composition, setlist and archive artifact. The media used here remains local preview material.
3. **Media publication gate — unresolved.** Clear rights/consent for people, venue and selected assets. Do not deploy the media-led pages before this is documented in `docs/PUBLIC_MARKETING_V2_MEDIA.md`.
4. **Additional verified content, conditional.** Add future images, video, testimonials, numbers or event updates only with confirmed source and permission. Keep reduced-motion and static fallbacks.
5. **Owned events, conditional.** Only after the event-source gate, implement list/detail, lifecycle states, metadata/structured data and public-path/analytics contract changes. Until then, retain the official-channel path.
6. **Selective motion and release QA.** Add motion only for a documented comprehension job. Run Impeccable critique/audit, responsive and consent/browser checks, and `npm run verify` on Node 24 before release work. The media gate remains separate from code verification.

## Confirm before final copy or gated slices

- Any event-specific variations to the owner-confirmed attendance and song flow.
- Source, editor, update frequency and cancellation/archive ownership for future first-party event pages.
- Per-venue service scope and technical responsibilities; venue/participant permission to quote and show people or places. iGranie w Lochu is approved as a factual named realization only within the owner-confirmed boundaries.
- Final master-brand slogan; `socials.pozanuta.pl` deployment/redirect mapping and production/legal facts remain separate decisions.
