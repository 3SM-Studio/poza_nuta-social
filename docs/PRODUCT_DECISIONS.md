# Approved product decisions — discovery 1–82

## Public Marketing V2 — conversion friction continuation, 2026-09-26

The owner confirms hello@pozanuta.pl as the general public contact address for both venue enquiries and participant questions. Current event dates and places remain in official channels through /linki; /kontakt is not their canonical source. The implementation may give visitors a faster, lower-emphasis path to /linki while retaining one dominant participant CTA. Media, owned event pages and analytics/consent semantics remain outside this continuation.

## Public Marketing V2 — owner continuation after Slice 1, 2026-09-25

This later owner instruction supersedes the earlier factual holds on non-singer attendance, joining flow, B2B contact and the permission to name a venue case. It authorizes the experience-clarity and B2B-proof code slice while leaving media, event pages, pricing and Admin out of scope.

- Attendance without performing is valid: guests may listen and spend time with friends. Singing is encouraged, never required; the karaoke line remains contextual, not the final master slogan.
- No Poza Nutą booking is required before arrival. For a song, the guest arrives, scans the event QR, enters a six-digit session code, chooses/adds a song, joins the queue and performs when called. The karaoke platform is an independent service, not Poza Nutą proprietary technology.
- Poza Nutą owns and communicates authoritative public event information after arrangements with a venue are confirmed. Own event pages still require a separate data/update/cancellation lifecycle.
- The canonical public B2B address is hello@pozanuta.pl via the existing contact path. Per-venue arrangements may include coordination, hosting, song/queue operation, promotion, documentation and extra equipment; optional services are not guaranteed. Technical responsibilities are agreed with each venue.
- iGranie w Lochu is approved as a real case study, not an exclusive partner or brand home. In that cooperation the venue provides sound, microphones and projectors; Poza Nutą can bring additional equipment. Publish no private details, financials, unsupported outcomes, attendance figures or invented partner quote.

## Public Marketing V2 — owner decision, 2026-09-25

This unnumbered owner decision is the active product and creative direction for the future public marketing redesign. `PRODUCT.md` and `DESIGN.md` hold the concise durable rules; `docs/PUBLIC_MARKETING_V2.md` holds the canonical implementation brief. The historical numbered decisions remain below for traceability. This decision authorizes documentation and planning now, **not** UI implementation, new routes, dependencies or deployment.

- The homepage is **consumer-first**. Participants and future participants get the dominant hero action. Venue/organizer collaboration stays visible in navigation, has a meaningful homepage section, and is developed on `/dla-lokali`; it does not compete as an equal hero CTA.
- The long-term brand territory is shared participation in music without requiring vocal skill. Karaoke remains the current key format and SEO term. Do not claim nationwide operation before it exists. “Nie musisz umieć śpiewać. Musisz chcieć śpiewać.” is approved for karaoke, campaigns and selected storytelling/hero contexts; the permanent master-brand slogan remains undecided.
- The V2 visual direction is **documentary event experience + live-poster brand language**: authentic people, reactions, venues and event context together with the existing Poza Nutą logo, strong typography, pink accent and deliberate poster rhythm. Mate Academy informs marketing mechanics, not the visual identity.
- Authentic event photography and short video may appear on the homepage as evidence. The old homepage-photo and photo-background bans are superseded for V2. No stock or generated substitute karaoke imagery; hero video is permitted, never required. Use a strong real photograph when available video is weaker.
- A dedicated event documentation session must supply real horizontal/vertical compositions, venue/crowd context, performer, reactions, friends, host/participant interaction, negative space for copy, short loops and testimonial candidates. Publication requires source verification and rights/consent for every visual, statement, partner mark, number, case study and event. No fictional proof or visual placeholders.
- Communicating attendance without performing is conditional on confirmation of actual event rules. Final public copy must not assert it before that confirmation.
- Own `/wydarzenia` and `/wydarzenia/[slug]` are conceptually approved, but their implementation is gated on an authoritative event source, update owner, date, venue, status, change/cancellation workflow and archive semantics. Do not publish an empty directory or add automatic Stage integration.
- `https://pozanuta.pl` remains the future main brand/marketing origin. `socials.pozanuta.pl` remains a fast link-hub / QR / bio destination, not a second homepage. The hosting/deployment mapping and redirects still need separate execution decisions.
- Motion must serve a specific story while preserving native scroll, keyboard access, reduced motion and performance. Start video with optimized native files, poster, muted `playsInline` loops, static fallback, deferred offscreen loading and captions/transcripts for speech. No dependency is authorized now; consider Mux/`next-video` only when a real library justifies it.
- Preserve first-party attribution, QR/source tracking, consent semantics, `/go/[slug]`, `/r/[code]`, server-rendered SEO and accessibility. New routes require coordinated public-path, analytics and SEO contract changes.

**Supersession map:** 2026-09-19 decisions **1–2** (link-card main goal and equal homepage emphasis) yield to the consumer-first marketing homepage; **8** remains relevant to `/linki` but not the editorial homepage; **10–11** (homepage photography/background bans) no longer apply to V2; **17–18** (Instagram/TikTok CTA priority) continue to govern the link hub, not the homepage's primary conversion. Decision **3** remains open for the master slogan, while the karaoke line gains the limited approved role above. The 2026-09-24 statement that the role of `socials.pozanuta.pl` was undecided is superseded by its link-hub / QR / bio role. Existing no-Stage, privacy and analytics decisions remain in force.

## Owner direction — 2026-09-24 (supersedes the earlier release target)

- This codebase is planned to become the main Poza Nutą marketing site at `https://pozanuta.pl`. `socials.pozanuta.pl` is no longer the canonical target for the whole application; its eventual link-hub or redirect behavior was undecided at this date (**superseded 2026-09-25** by the link-hub / QR / bio role above).
- The root-domain marketing-site slice supersedes the earlier homepage-as-link-hub hierarchy: `/` introduces the brand, karaoke, and collaboration; `/linki` holds official destinations using the existing authoritative model. Earlier numbered hub-layout choices remain historical context for `/linki`, not homepage requirements.
- The EU Privacy & Cookie slice is now authorized separately from the root-domain marketing checkpoint. It disables pre-consent product analytics, adds versioned choice, a persistent settings control and `/cookies`. Legal identity, infrastructure facts, retention and final approval remain release gates.
- A separate accessibility slice targets WCAG 2.2 AA, axe automation, keyboard/focus/reflow/reduced-motion checks, and screen-reader smoke. The current recovery slice may fix the observed consent-banner overlap without claiming full compliance.
- Production hosting is not yet chosen. Do not migrate between Vercel and another host as part of the local recovery checkpoint.
- Sequence future work as canonical/root-domain migration, EU privacy and cookie compliance, accessibility, hosting/cost feasibility, then final Production Readiness.

Status: **approved by product owner on 2026-09-19**. These are binding unless explicitly changed later.

## Public product and brand (1–30)
1. Main goal: fast official-link/contact business card; analytics is invisible infrastructure. **Homepage goal superseded 2026-09-25**; the fast-card role remains with `/linki`.
2. Serve normal visitors and business/collaboration visitors; keep explanation short. **Homepage priority superseded 2026-09-25**: consumer-first with a distinct B2B path.
3. A slogan will exist, but its final wording is not yet decided.
4. Publicly it is simply Poza Nutą; do not call it “Poza Nutą Social”.
5. Public geographic label: Trójmiasto only.
6. Brand-owned experience rather than a generic Linktree look.
7. Mobile-first; desktop must still look deliberate.
8. Desktop remains focused/narrow rather than becoming a dashboard layout. **Refined 2026-09-24/25**: applies to `/linki`; the homepage has an editorial composition.
9. Logo should be visible but not dominate the viewport.
10. No photos on the homepage. **Superseded for Public Marketing V2 on 2026-09-25**; authentic event photography is allowed as evidence.
11. No photo background. **Superseded for Public Marketing V2 on 2026-09-25**; real event media may be composed in the homepage hero when justified.
12. Dark-first visual direction.
13. No light/dark toggle needed in MVP.
14. Pink is an accent, not the entire background.
15. Avoid decorative gradients.
16. Link actions use a consistent structure; one or two may receive emphasis.
17. Instagram is primary CTA. **Scoped to the official link hub 2026-09-25**, not the homepage hero.
18. TikTok is second CTA. **Scoped to the official link hub 2026-09-25**, not the homepage hero.
19. Facebook is lower priority unless data later proves otherwise.
20. YouTube is shown only while the channel is active/useful.
21. No Stage CTA now.
22. No “nearest karaoke” CTA now.
23. No automatic Stage event integration now.
24. Contact is required.
25. Use one `Kontakt / współpraca` entry point.
26. Email may be shown on the contact surface rather than the homepage.
27. WhatsApp/Telegram only if they are real business contact channels.
28. External destinations may open a new tab/app handoff where appropriate.
29. Every outbound destination goes through `/go/[slug]`.
30. Track logo clicks only if the logo is actually interactive.

## Analytics, privacy, and attribution (31–46)
31. No scroll tracking in MVP.
32. Time-on-page may be auxiliary, never a primary KPI.
33. Track interaction/click order within an anonymous session.
34. Do not build persistent cross-day identity in MVP.
35. Anonymous session TTL: approximately 30 minutes of inactivity.
36. QR attribution persists during the anonymous session.
37. Preserve both first-touch and current/last-touch attribution.
38. Report both first-touch and last-touch where useful.
39. Store source/referrer host; avoid full referrer URLs by default.
40. Never store raw IP addresses.
41. No device fingerprinting.
42. Prefer broad device/browser/OS categories instead of retaining a full UA profile.
43. Aggregate iPhone/iOS vs Android level information is acceptable.
44. Exact device model is not needed.
45. Country is optional; city is not required for MVP.
46. No precise geolocation.

## Campaign/QR model (47–59)
47. Important physical posters/placements may each get their own QR.
48. Do not uniquely number every flyer unless placement-level measurement is actually useful.
49. Attribution hierarchy: `campaign → asset → placement`.
50. Event may be campaign metadata/relation, but need not be encoded in the public URL.
51. Tracking URLs use random short codes, not readable marketing slugs.
52. Codes are 5–7 uppercase characters and exclude visually confusing characters such as O/0/I/1.
53. Codes may support expiration, but do not expire automatically by default.
54. A QR may be repointed only with preserved history/auditability.
55. Tracking links can be deactivated.
56. Deactivated/invalid links fall back to the main hub, not a 404.
57. Record the entry before redirecting where analytics is available.
58. Analytics failure must never block the visitor redirect.
59. `/go` must not be cached in a way that bypasses event tracking.

## Destinations and admin (60–75)
60. Admin can change an official destination URL without a deployment.
61. Official social destinations are database records.
62. Admin can reorder them; numeric sort order is sufficient for MVP.
63. Admin can activate/deactivate them.
64. Scheduled activation is outside MVP.
65. Do **not** turn the app into a generic arbitrary-CTA builder. Public actions are official Poza Nutą channels plus contact/collaboration.
66. Admin lives at `/admin`.
67. No separate admin subdomain now.
68. Authentication: magic link.
69. No passwords in MVP.
70. Google OAuth may be considered later but is unnecessary now.
71. Initial admins may have equivalent practical permissions.
72. Prepare role semantics `owner`, `admin`, `viewer` from the beginning.
73. Maintain an audit log.
74. Audit log records actor, time, change/action, old value, and new value.
75. Business records use archive/soft-delete instead of physical deletion.

## Dashboard (76–82)
76. Keep the dashboard high-signal, not overloaded.
77. Primary KPIs: visits, unique anonymous sessions, outbound clicks, outbound CTR, top source, top campaign, top destination.
78. `outbound CTR = outbound clicks / visits` and must be named clearly.
79. Include a time-series chart.
80. Default time range: 30 days.
81. Planned quick ranges: today, 7d, 30d, 90d, custom.
82. Compare with the previous equivalent period.

## Explicitly unresolved
- Final master-brand slogan and factual final copy; the karaoke/campaign line above is approved only for its specified contexts.
- Final exact business-contact copy and contact channel values.
- Event rules for people who do not perform, ownership and operating details of the future event source, evidence/publication rights, and production hosting/redirects.
- Decisions 83+ have not been numbered; the unnumbered 2026-09-25 owner decision above is approved product truth and must not be mistaken for an invented numbered series.

## Superseding analytics decision — 2026-09-20

The analytics architecture continuation explicitly superseded decision 34: a persistent pseudonymous browser identifier may exist across sessions **only after analytics consent**. The later 2026-09-24 EU privacy slice also requires consent for the short public analytics session and product event ingestion; before consent there is no product measurement. This is not person identity, fingerprinting, or permission to store raw IP, precise location, or exact device model. The rationale, limitations, withdrawal behavior, and unresolved legal/retention review are recorded in `docs/analytics/IDENTITY_MODEL.md`, `PRIVACY_AND_CONSENT.md`, and ADR-001.

It also refines decisions 49 and 78 without changing the public product: campaign attribution uses controlled `channel_group/source/medium/campaign/asset/placement`, QR is a transport medium rather than an automatic source, and the primary conversion percentage becomes outbound sessions divided by eligible sessions. Legacy click/page-view CTR remains a compatibility metric only and must not be labeled as the sole outbound rate.

## Analytics V2.1 correctness refinement — 2026-09-22

Acquisition rankings are exclusive session-level reports: one eligible session contributes to exactly one source, campaign, asset, placement, and tracking-link acquisition bucket. Event attributed context remains available for non-exclusive touchpoint/assist analysis and must not be labeled acquisition.

Session acquisition means the first eligible non-direct acquisition with direct fallback, not literal first observed touch. A later server-resolved owned tracking link may replace weaker client-observed UTM/referrer acquisition, but later client-observed touches cannot replace stronger owned acquisition. Visitor first acquisition remains the literal effective session acquisition observed when the consented visitor record is first created and is immutable, including when it is direct.

Rates whose denominators describe prerequisite sessions use numerator intersections: return-to-hub requires an outbound session, and contact click conversion requires a contact-view session. Significant admin business mutations and their audit rows are one database transaction.

## Admin Platform V2 implementation refinement — 2026-09-22

This refinement implements decisions 66–75 without declaring new numbered product decisions. Steady-state admin authorization is a verified Supabase Auth user plus a fresh active `admin_profiles` membership. `BOOTSTRAP_OWNER_EMAIL` may create only the first owner and grants no access after an active owner exists. Missing/inactive membership is denied, viewer is read-only, and ownership changes only through an audited atomic transfer that preserves at least one active owner.

Application invitations and Supabase Auth delivery are separate, repairable states. New Auth users receive the invite-token flow; existing confirmed users accept the pending application invitation through their own magic-link login. Roles are always read from locked application state, never query strings or user metadata.

Referral participants are a separate internal attribution dimension with optional account linkage. Their stable `/r/[code]` links reuse Analytics V2.1 canonical acquisition. Competitive referral metrics include production/external traffic only, count consented pseudonymous browsers rather than guaranteed people, and never derive acquisition credit from non-exclusive raw event touchpoints.

## Cookieless analytics foundation — 2026-09-24

The owner-authorized cookieless slice supersedes the earlier statement that no product event is stored before analytics consent. Without server-confirmed consent, public page views, contact views/clicks, tracking-link entries and outbound choices may be measured as independent, identity-free events. This mode creates no visitor, session or acquisition state and never joins earlier events to a later consented visitor. Server-confirmed consent enables the existing full visitor/session/acquisition model for new events. The current application owns the `poza_nuta` project key; Trójmiasto remains a service area, not a global event location.

## Public creative direction refinement — 2026-09-26

The owner-selected Public Marketing V2 direction is Culture Editorial across `/`, `/karaoke-trojmiasto`, `/dla-lokali`, `/kontakt`, and `/linki`. Public UI uses neutral black, Poza Nutą pink `#ff4fa3`, off-white and neutral grays; the previous wine/burgundy direction is superseded. The homepage is participant-first, combines strong typography with sourced event stills, and varies black, pink and light editorial chapters. This visual decision does not approve a final slogan, new event pages, invented social proof, or publication of recognizable people or venue material. The rights gate in `docs/PUBLIC_MARKETING_V2_MEDIA.md` remains active before public deployment.
