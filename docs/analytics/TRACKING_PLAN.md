# Public Marketing IA + Analytics V3 contract

Status: implemented locally, 2026-09-27. This is the canonical current event and marketing-journey contract. The visitor/session/event architecture, acquisition rules and reporting scopes remain as defined in `ANALYTICS_ARCHITECTURE.md`, `ATTRIBUTION_MODEL.md` and `REPORTING_SCOPE.md`.

## Routes and identity

The current public routes are `/`, `/karaoke`, `/dla-lokali`, `/kontakt`, `/linki`, `/prywatnosc`, `/cookies`. `/karaoke-trojmiasto` permanently redirects to `/karaoke` (308); it is not a canonical, sitemap, new page-event or internal-link path. Historical rows keep their old path as historical truth. `/r/[code]` and `/go/[slug]` remain owned redirect event paths. Future event and city pages are not yet routes.

`schema_version = 1` remains. There is no new identity model. With server-confirmed analytics consent, events use the existing 30-minute session and optional pseudonymous visitor. Without it, only eligible independent, identity-free events use `analytics_cookieless_events`. Cookieless events never acquire a visitor/session ID or join to a later consented visitor. A pending accept is not consent. Withdrawal immediately suppresses new consented events. New V3 events are **consented only**, including when identity-free tracking is otherwise available.

## Event taxonomy

| Event | Exact meaning and trigger | Mode | Outcome? |
| --- | --- | --- | --- |
| `tracking_entry` | Active owned `/r/[code]` resolves; records entry before redirect where possible. | Cookieless or consented | Acquisition signal, not conversion |
| `page_view` | Canonical public page entry. | Cookieless or consented | Activity |
| `outbound_click` | Active official `/go/[slug]` is chosen before redirect where possible. It does not prove destination arrival. | Cookieless or consented | Existing Key Event |
| `contact_view` | `/kontakt` page entry. | Cookieless or consented | Activity |
| `contact_click` | Configured contact email is activated. It does not prove an email was sent. | Cookieless or consented | Existing Key Event / contact intent |
| `hub_resumed` | Return after an armed `/go` departure, hidden transition and at least two seconds. | Consented | Lifecycle |
| `cta_click` | Click on an explicitly registered internal marketing link with matching source/destination. | Consented | Journey activity, not a Key Event |
| `section_view` | A registered evidence/explanation text block is at least 70% visible for 800 ms in a visible document. | Consented | Exposure, not proof of reading |

Only exact event names and bounded properties are accepted. Unknown event names, CTA IDs, section IDs, paths and extra properties are rejected. The server derives CTA location, source, destination, journey and audience from the registry; the client proposes only an ID. `cta_click` is never added to an existing `contact_click` email or `/go` outbound choice. Both existing events remain the more specific outcome record.

CTA IDs are stable `route_or_surface.location_action` keys in `src/lib/analytics/marketing-journey.ts`, independent of visible copy. Current registry: `home.hero_karaoke`, `home.hero_dates`, `home.participation_karaoke`, `home.case_venues`, `home.closing_dates`, `karaoke.hero_dates`, `karaoke.current_dates`, `karaoke.venue_bridge`, `venues.hero_contact`, `venues.closing_contact`, `contact.venues`, `contact.official_channels`, `links.contact`. Each definition includes `location`, `sourcePath`, `destinationPath`, `journey`, `audience`. Do not register generic nav/footer links without a specific business question.

The sparse section registry is `home.participation` (participation explanation), `home.case_study` (iGranie explanation), `venues.case_study` (venue realization explanation). These markers are on explanatory text, not on a whole tall section or its heading alone. Exposure fires once per page entry, only after the 70%/800 ms threshold. A temporary exit before 800 ms cancels the timer. A repeated observer callback or rerender does not fire again. CTA clicks within 1200 ms share one event per ID on that page entry; separate later choices remain countable. No observer network event is sent for every scroll position.

## Current measurable journeys

`analytics_marketing_journey_v3(journey, from_date, to_date_exclusive, scope)` provides fixed, ordered, **consented session** counts, a separate destination-route reach count (`routeViewSessions`) and proof-exposure counts. It accepts `participant` or `venue`, and `business` or `diagnostic`. It is service-role only. Steps are matched by `session_id`, increasing `session_sequence`, event name, exact path and CTA ID. The first step is the consented homepage CTA: on a first visit, the preceding homepage `page_view` may be cookieless, and it is never retrospectively stitched into this funnel. The query does not claim a unique person, venue lead, attendance, completed email or completed collaboration. It does not infer a step for someone who started on an intermediate page. Cookieless activity remains separately reportable as event counts.

- Participant: registered homepage karaoke CTA → `/karaoke` view → registered current-information CTA → `/linki` view. `home.participation` is separately counted as explanation exposure.
- Venue: registered homepage venue CTA → `/dla-lokali` view → registered contact CTA → `/kontakt` view → existing `contact_click`. `home.case_study` and `venues.case_study` are separately counted as realization exposure.

The existing consented contact and tracked-entry funnels, Key Events and admin reports retain their definitions. V3 adds query support without redesigning Admin. `business` includes production/external only; `diagnostic` includes preview, internal and test traffic. A local preview/test event must never inflate production KPIs.

## Acquisition and offline distribution

One valid owned tracking link outranks controlled UTM, then exact-domain-safe external referrer, then direct. `observed_context` records bounded request evidence; `attributed_context` records the model result. Session acquisition is the first eligible non-direct acquisition with direct fallback. A server-resolved owned link may replace weaker client-observed acquisition. Direct does not erase a meaningful session current touch. Visitor first acquisition is the literal effective acquisition at visitor creation and stays immutable, even if initially direct. Do not relabel event-level, non-exclusive touchpoints as exclusive acquisition.

QRs are generated SVGs that encode stable `/r/[code]` URLs. `asset` and `placement` remain reusable dimensions. `distribution_unit` optionally names a particular printed/distributed unit on the tracking link; creating a link exposes this existing field in Admin. A separate code per unit enables unit-level results. Cookieless entries retain the tracking-link ID, which resolves to the unit on the link; consented events also snapshot the unit label. Historical rows are never rewritten. A copied URL still retains the owned link taxonomy, but a `/r` hit alone does **not** prove a physical QR scan.

Recognized AI referrers are ChatGPT, Perplexity, Gemini, Copilot and Claude on their verified host domains. Lookalike domains remain generic referrals. Referrer absence cannot be inferred as AI traffic. This is host classification, not a claim about recommendation quality or search visibility.

## Privacy and exclusions

No generic click tracking, heatmap, cursor tracking, scroll spam, session replay, fingerprint, raw IP, exact device model or precise location is added. Client-supplied classification, consent, campaign, audience and destination authority are not trusted. Metadata is bounded and server-owned dimensions are selected from the registry. No GA4 or marketing sink is active. Tracking failure does not block `/r` or `/go` redirects. Privacy/retention release decisions remain in `PRIVACY_AND_CONSENT.md`.

The hub lifecycle state machine remains `idle → outbound_pending → hidden_after_outbound → resumed → idle`; an outbound click alone is never `hub_resumed`.
