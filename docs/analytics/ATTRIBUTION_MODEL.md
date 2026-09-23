# Attribution model

## Dimensions

Each context uses controlled `channel_group`, `source`, `medium`, optional campaign, asset, placement, distribution unit, content, tracking-link ID, and referrer host.

Examples:

| Channel group | Source | Medium | Meaning |
| --- | --- | --- | --- |
| offline | poster | qr | poster transported by QR |
| offline | flyer | qr | flyer transported by QR |
| offline | table_stand | qr | table stand transported by QR |
| ai_referral | chatgpt | referral | referral from ChatGPT |
| organic_search | google | organic | Google search referral |
| organic_social | instagram | social | Instagram referral |
| direct | direct | none | no trustworthy acquisition signal |

QR is a transport medium, never automatically a source. A copied `/r` URL retains the tracking-link taxonomy but does not prove a physical scan.

## Observed versus attributed

Observed context is the sanitized evidence on this request: tracking code, UTM fields, external referrer host, path. Attributed context is the model output. Both are snapshotted on the event; neither is overloaded into one `source` column.

## Precedence

For a new non-direct touch:

1. valid active owned tracking link;
2. valid controlled UTM tuple;
3. exact-domain/subdomain-safe external referrer classification;
4. unknown external host as `referral / <host> / referral`;
5. direct.

Same-site referrers are internal navigation and do not overwrite acquisition. Empty/direct requests inherit the session current touch for event attribution but are still stored as observed direct.

## Attribution levels

- Visitor first acquisition: the effective session acquisition observed when the consented visitor record is first created; literal and immutable, so it may remain direct even if that session later gains non-direct acquisition.
- Session acquisition: first eligible non-direct acquisition with direct fallback. A direct fallback may be replaced once by the first non-direct touch. A server-resolved owned tracking link may replace weaker client-observed UTM/referrer acquisition; once owned acquisition exists it is immutable.
- Current/last touch: most recent eligible non-direct touch in the session.
- Event observed context: request evidence.
- Event attributed context: session current touch after applying the event.

## Reporting scopes

- Acquisition reporting is exclusive and reads the canonical session acquisition. One eligible session contributes to one bucket per dimension. Canonical IDs group campaign, asset, placement, and tracking-link identity; the latest applicable acquisition snapshot supplies the display label without rewriting event history.
- Touchpoint/assist reporting is non-exclusive and reads event attributed context. One session may have several touches. These metrics must be labeled touchpoint/assist and are not valid for acquisition or competitive referral leaderboards.

Future referral acquisition must preserve the same invariant: one acquired session cannot credit several referral owners merely because the session contains several attributed events. This document does not introduce referral schema or UI.

## Safe classification

Known hosts match `host === domain || host.endsWith("." + domain)`. Lookalikes such as `instagram.com.evil.example` do not match. Unknown external hosts remain their normalized host with channel `referral`; they are not guessed.

## Historical integrity

Events store label and taxonomy snapshots for campaign, asset, placement, tracking link, and destination at event time. Admin edits may change future snapshots but never rewrite prior facts. IDs support lineage; snapshots support historically stable reports.
