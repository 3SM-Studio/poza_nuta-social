<!-- impeccable:product-schema 1 -->
# Poza Nutą — product truth

## Product
This repository is an independent Poza Nutą application. It is not a Stage module, not a shared dashboard module, and does not share database, authentication, deployment, or runtime dependencies with any other Poza Nutą product.

## Root-domain direction — owner decisions, 2026-09-24 and 2026-09-25
This codebase is the Poza Nutą marketing site prepared for the future canonical origin `https://pozanuta.pl`. The homepage is the consumer-first brand experience; `/linki` is the compact official-links hub. `socials.pozanuta.pl` remains a fast link-hub / QR / bio destination, not a second marketing homepage. The local EU privacy slice gates public analytics on versioned consent and adds `/cookies`; controller, deployment and retention facts still require confirmation before production. Domain deployment, hosting, legal sign-off and WCAG 2.2 AA remain separate work.

## Overview
The public surface is the main marketing site for Poza Nutą. It serves two audiences with different paths:

1. people looking for Poza Nutą karaoke, musical events, and current information;
2. venues and organizers interested in collaboration and direct contact.

The homepage primarily serves participants and future participants. Venue and organizer collaboration remains visible in navigation and a substantial homepage section, then continues on `/dla-lokali`. `/linki` keeps official channels fast to reach, especially from bio links and QR codes. Attribution and analytics run invisibly underneath both.

## Primary outcome
A visitor should understand what Poza Nutą does in Trójmiasto and find a clear path to karaoke information, collaboration, contact, or official channels.

## Product boundaries
- Public name: **Poza Nutą**. Never expose “Poza Nutą Social” as the product name to visitors.
- Geographic wording: **Trójmiasto**. Do not make Gdynia the primary public location label.
- `/linki` is not a generic Linktree clone or generic link-builder SaaS.
- No Stage CTA in the current scope.
- No “nearest karaoke” or automatic Stage event integration in the current implementation. Own `/wydarzenia` and `/wydarzenia/[slug]` routes are approved conceptually but gated on an authoritative event source, update owner, date/place/status, change/cancellation workflow, and archive semantics.
- Do not invent arbitrary CTA types. `/linki` is for official Poza Nutą channels plus contact/collaboration.
- Final master-brand slogan is intentionally **TBD**. “Nie musisz umieć śpiewać. Musisz chcieć śpiewać.” is approved for karaoke, campaign creative and selected hero/storytelling contexts, not as a permanent master-brand slogan.
- The long-term brand territory is shared participation in music without requiring vocal skill. Karaoke remains the current key format and an important local SEO term. Do not claim nationwide reach before it exists.
- A guest may attend, listen and spend time with friends without singing. Singing is encouraged, not required. No Poza Nutą booking flow is required before arrival. A guest who wants to perform scans the event QR, enters the six-digit session code, chooses/adds a song, joins the queue and performs when called. The karaoke platform is an independent product/service; do not market it as Poza Nutą technology.
- Poza Nutą owns and communicates authoritative event information after the venue arrangement is confirmed. Current dates and venues are announced through official channels; first-party event pages remain gated on a maintained lifecycle.
- Public B2B contact direction is hello@pozanuta.pl through the existing /kontakt route. The exact venue offer and technical responsibilities are agreed for each cooperation; optional services are not universal promises.
- iGranie w Lochu may be named as a real Poza Nutą realization, never as an exclusive partner, permanent home or definition of the brand. The owner confirmed venue-provided sound, microphones and projectors in that cooperation, with additional Poza Nutą equipment as needed. No results, counts or testimonial are implied.
- Every testimonial, venue/partner name or logo, number, case study, event and photo/video requires a real source and publication rights or consent. Never fabricate proof.

## Public information hierarchy
1. `/`: consumer-first Poza Nutą brand experience and factual introduction to karaoke and musical events in Trójmiasto, with a distinct venue path.
2. `/karaoke-trojmiasto`: information for participants and where to find current dates and places.
3. `/dla-lokali`: collaboration information for venues and organizers.
4. `/kontakt`: one first-party contact route.
5. `/linki`: compact official destinations from the existing destination model, with Instagram first and TikTok second when active.
6. `/prywatnosc`: privacy information and consent controls, with deployment-specific facts guarded before publication.
7. `/cookies`: canonical browser storage inventory and consent controls.

Future `/wydarzenia` and `/wydarzenia/[slug]` remain gated and must not be published as an empty directory. The current public route/analytics/SEO contracts must be extended together when these routes become real.

## Visual constraints
- Mobile-first, with an editorial desktop homepage and a deliberately narrow `/linki` layout.
- Dark-first.
- Pink is the main accent, not a full-page background.
- No theme toggle in MVP.
- Public Marketing V2 may use authentic event photography and short event video on the homepage as evidence of the experience. No stock or generated substitute karaoke imagery. Hero video is optional; prefer a strong real photograph to weak video.
- No decorative gradients.
- One or two actions may receive stronger emphasis, but `/linki` must remain structurally consistent.
- The canonical V2 direction combines documentary event experience with live-poster brand language. Preserve the supplied logo, expressive Poza Nutą typography and pink accent; avoid SaaS-template, generic black-luxury, cyberpunk and neon-heavy treatments.

## Tracking truth
The analytics system is first-party and privacy-first:
- before server-confirmed consent, limited cookieless events are stored without visitor/session/acquisition identity or cross-visit correlation;
- after server-confirmed consent, the existing visitor/session/acquisition model applies only to new events;
- every outbound public destination uses `/go/[slug]`;
- important offline placements can use individual `/r/[code]` links;
- hierarchy is `campaign → asset → placement`;
- codes are short random uppercase identifiers, 5–7 characters, excluding visually confusing characters;
- anonymous session TTL is approximately 30 minutes of inactivity;
- a random pseudonymous browser visitor may link later sessions only after analytics consent; it is never described as a person;
- preserve canonical session acquisition (first eligible non-direct with direct fallback and owned-link precedence) plus current/last-touch attribution;
- use controlled `channel_group/source/medium/campaign/asset/placement`; QR is a transport medium, not automatically a source;
- do not store raw IP addresses;
- do not fingerprint users;
- store only broad device/browser/OS categories when useful, not exact device models or full persistent UA profiles;
- tracking failure must never prevent a redirect;
- deactivated/unknown QR links fall back to the main hub rather than a dead end.

## Admin truth
- Admin lives at `/admin`.
- Authentication: Supabase magic link plus a fresh active database membership; no passwords in MVP.
- `admin_profiles` is the steady-state access authority. Missing or inactive membership is denied; no implicit viewer fallback exists.
- Roles are `owner`, `admin`, and read-only `viewer`. Ownership changes only through the atomic transfer flow, and the database must retain at least one active owner.
- `BOOTSTRAP_OWNER_EMAIL` is optional first-owner bootstrap only and grants nothing after an active owner exists.
- Team invitations have explicit application and delivery states; only the trusted server may call Supabase Auth Admin.
- Referral participants are independent from admin membership and reuse stable `/r/[code]` links plus canonical session acquisition.
- Important admin changes must be auditable: actor, time, action, old value, new value.
- Business records use archive/soft-delete semantics rather than destructive deletion.
- Dashboard stays high-signal: sessions, consented pseudonymous visitors, tracking entries, outbound sessions/rate, engagement depth, contact interest, top source/campaign/destination, traffic classes and time series.
- Default analytics range is 30 days; ranges are today/7/30/90/custom with previous-period comparison.

## Source of truth
This file contains durable product truth. `DESIGN.md` contains visual-system truth. `docs/PRODUCT_DECISIONS.md` preserves the decision history and supersession record. `docs/PUBLIC_MARKETING_V2.md` is the canonical implementation brief. Agents must not silently rewrite these decisions.
