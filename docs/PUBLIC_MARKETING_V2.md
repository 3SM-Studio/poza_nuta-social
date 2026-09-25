# Public Marketing V2 — canonical implementation brief

Status: **product and creative direction approved 2026-09-25; public foundation implemented in 6bedd501; participant clarity and factual B2B proof are the current continuation; media production pending**. This brief translates the owner decision in `docs/PRODUCT_DECISIONS.md` into implementation order. `PRODUCT.md` and `DESIGN.md` remain authoritative for durable product and visual rules. The practical event shoot, factual gate, permissions manifest and next-slice handoff live in `docs/PUBLIC_MARKETING_V2_CONTENT_PRODUCTION.md`. Admin Platform is out of scope.

## Product thesis and audience

Poza Nutą invites people to participate in music together without requiring vocal skill. Karaoke is today's key format and a necessary Trójmiasto SEO term, not the full limit of the future brand. Do not imply events elsewhere in Poland before they exist. The approved line “Nie musisz umieć śpiewać. Musisz chcieć śpiewać.” can lead karaoke/campaign moments; it is not the permanent master-brand slogan.

The homepage is **consumer-first**: help a guest understand the experience, believe it is real, find current information and decide to attend. Venue/organizer collaboration is visible in navigation, receives a meaningful homepage section, and has its own evidence and contact path on `/dla-lokali`. Do not place two equally dominant consumer/B2B actions in the hero. The owner has confirmed that guests may attend without singing; explain this without pressuring them to perform.

## Creative and content contract

**Documentary event experience + live-poster brand language.** Use the supplied logo, Bebas Neue/Space Grotesk foundation and pink accent with strong type, deliberate poster rhythm and bold compositions. Pair them with genuine event people, reactions, host, place and process. Media proves what a visitor would experience; it is not decorative. Avoid a Mate Academy look, SaaS/shadcn marketing template, generic black-luxury site, cyberpunk or neon overload. Keep `/linki` compact for QR/bio use and keep `socials.pozanuta.pl` in that role; the root domain carries the full brand story.

Homepage photography and short video are approved for V2. Hero video is optional, and a strong real still outranks weak footage. No stock or generated substitute karaoke photography. Do not publish invented testimonials, numbers, venue names/logos, events, case studies or mock media. Each proof item requires a source, factual check and publication rights/consent. An absent proof section stays absent until material exists.

Commission one dedicated event documentation session before media-led homepage work. Required shot list: wide venue/crowd context; performer mid-shot; audience reactions; friends interacting; host and host/participant interaction; genuine atmosphere and identifiable venue context. Capture horizontal desktop and vertical mobile compositions, including negative space for type, plus short event loops. Collect participant and venue testimonial candidates, then verify wording and permissions before publication. Record event, date, place, subject consent, usage scope and owner for every selected asset. Plan distinct posters/crops for the mobile and desktop first viewport.

## Information and conversion architecture

- `/`: experience and evidence first, one dominant participant action, clear secondary navigation toward B2B.
- `/karaoke-trojmiasto`: practical participation, including optional singing and the QR → six-digit session code → song → queue flow, plus the authoritative path to current dates until owned event pages exist. CTA language must accurately describe its destination; never present the independent karaoke platform as brand-owned technology.
- `/dla-lokali`: per-venue scope and responsibilities, a factual iGranie w Lochu realization without invented outcomes or testimonial, risk-reducing answers and first-party contact.
- `/kontakt`: one usable first-party collaboration route with the owner-approved hello@pozanuta.pl address.
- `/linki`: ordered official social channels and contact, optimized for a phone after bio/QR entry; never a generic CTA builder or second homepage.
- `/wydarzenia` and `/wydarzenia/[slug]`: conceptually approved **future** surfaces, not part of the initial implementation. Gate: authoritative maintained event source, named update owner, date, place, status, cancellation/change workflow and archive semantics. No empty directory or automatic Stage dependency.
- `/prywatnosc` and `/cookies`: preserve existing consent and disclosure access.

Consumer journey: discover → understand the real experience → trust → see an authoritative date/current channel → attend. B2B journey: discover → understand the offer → see verified evidence → understand process/risk → contact. Future audiences outside Trójmiasto can follow content; they must not be promised a local event.

## Homepage story architecture

1. **Hero:** name Poza Nutą, current format and Trójmiasto; express the emotional invitation and one accurate participant action. Use authentic hero media only when ready. The karaoke line is optional in this context, not compulsory brand copy.
2. **Immediate evidence:** one real event moment with source context; establish that the experience exists before expanding the promise.
3. **What participation feels like:** people, interaction and simple practical explanation. Attending without singing is valid; explain the song/queue flow only for guests who choose to perform.
4. **Current opportunity:** a verified upcoming event only after the event-source gate; until then, point directly to the official channel that publishes dates.
5. **Human story and process:** one or two real voices/moments that answer hesitation, not a generic testimonial carousel.
6. **Venue path:** concise business offer, proof and link to `/dla-lokali` without changing the homepage's consumer priority.
7. **Practical objections and close:** answer observed questions, repeat the same truthful consumer action, retain a discreet B2B route.

This is a narrative order, not an obligation to render seven sections. Omit any section whose content cannot perform its stated job. Repeated CTAs should reappear after new information, not merely after a fixed scroll distance.

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

1. **Public foundation and path accuracy — implemented in 6bedd501, independent of photo readiness.** The public type/spacing/layout and responsive page shell use the approved live-poster grammar; consumer-first navigation and CTA wording promise the destinations they reach; the B2B route and `/linki` remain. This slice prepares the structure for real media without presenting a substitute final design.
2. **Experience clarity and factual B2B proof — current continuation, independent of media.** Explain optional singing, no Poza Nutą booking, the on-site song flow and official information path. Develop `/dla-lokali` with the owner-confirmed iGranie realization, per-venue scope and a working contact path; strengthen the homepage bridge. Do not fill absent media or testimonial slots.
3. **Documentary content and media production.** Shoot, select, clear rights, caption and optimize real assets. Check event-specific variations and publication permissions. This is a content gate, not a dependency-install slice.
4. **Media-led consumer and venue storytelling, conditional.** Add approved event moments and verified voices to the existing narrative. Keep appropriate stills and reduced-motion behavior. Omit any proof that lacks source or permission.
5. **Owned events, conditional.** Only after the event-source gate, implement list/detail, lifecycle states, metadata/structured data and public-path/analytics contract changes. Until then, retain the official-channel path.
6. **Selective motion and finish QA.** Add only sequences justified by the story; test mobile network, accessibility, SEO, consent, attribution and QR/outbound redirects. Run Impeccable detector + audit/critique/harden/polish and `npm run verify` on Node 24 before release merge.

## Confirm before final copy or gated slices

- Any event-specific variations to the owner-confirmed attendance and song flow.
- Source, editor, update frequency and cancellation/archive ownership for future first-party event pages.
- Per-venue service scope and technical responsibilities; venue/participant permission to quote and show people or places. iGranie w Lochu is approved as a factual named realization only within the owner-confirmed boundaries.
- Final master-brand slogan; `socials.pozanuta.pl` deployment/redirect mapping and production/legal facts remain separate decisions.
