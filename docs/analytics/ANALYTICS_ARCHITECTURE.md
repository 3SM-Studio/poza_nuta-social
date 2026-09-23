# Analytics architecture

Status: implementation contract, 2026-09-20.

## Purpose and boundary

Postgres is the primary source of truth. The model is `anonymous_visitor -> analytics_session -> analytics_event`. It measures pseudonymous browser contexts, not people. The public experience stays server-first and usable when analytics is unavailable.

The system never stores raw IP addresses, fingerprints, precise location, exact device model, or a service-role credential in the browser. Analytics failure is observable but never intentionally blocks `/r` or `/go` navigation.

## Request flow

1. `proxy.ts` establishes a signed, 30-minute session token before a public page renders. It records only bounded acquisition fields and classification needed by the first server event. This removes the hydration race for an immediate outbound click.
2. Server routes construct one `TrackingContext`; clients submit event facts, not trust decisions.
3. `analytics_ingest_event_v1` validates identifiers and enums, deduplicates the event ID, creates/updates the consent-eligible visitor and session, allocates `session_sequence`, snapshots dimensions, and inserts the event in one transaction.
4. `/r/[code]` emits `tracking_entry` best-effort and redirects to an allowlisted landing path.
5. `/go/[slug]` resolves an active database destination, emits `outbound_click` best-effort, and redirects only to a validated official domain.
6. Dashboard queries default to `environment = 'production' AND traffic_class = 'external'`.

## Core records

- `analytics_visitors`: optional long-lived pseudonymous identity, created only with analytics consent. First acquisition is the effective session acquisition at visitor creation and remains immutable, including when direct.
- `analytics_sessions_v2`: 30-minute inactivity session; may be visitor-less. Session acquisition is the first eligible non-direct acquisition with direct fallback. A server-resolved owned tracking link outranks weaker client-observed acquisition. Current/last touch may continue to advance independently.
- `analytics_events_v2`: append-only facts with observed and attributed context, immutable dimension snapshots, consent/classification, schema version, and sequence.
- `analytics_assets`, `analytics_placements`: reusable entities; tracking links can combine the same asset with several placements and vice versa.
- `analytics_quality_daily`: operational counters separate from business KPIs.

## TrackingContext

Every sink receives the same server-derived contract:

```ts
type TrackingContext = {
  environment: "production" | "staging" | "preview" | "development"
  trafficClass: "external" | "internal" | "test" | "bot"
  consent: { analytics: boolean; marketing: boolean }
  identity: { visitorId: string | null; sessionId: string }
  observed: AcquisitionContext
  attributed: {
    visitorFirst: AcquisitionContext | null
    session: AcquisitionContext
    current: AcquisitionContext
  }
}
```

Precedence for `trafficClass` is `test -> internal -> bot -> external`. Test mode is explicit and integrity-protected. Authenticated admin roles and a signed device-exclusion token are internal. Bot matching is conservative; unknown automation remains external unless a platform or rule identifies it.

## Reliability model

- Event UUID is the idempotency key. A unique constraint makes retries return the existing sequence without duplicating metrics.
- Session rows are locked during ingest; sequence allocation is monotonic inside a session, not a claim about attention order across tabs.
- Redirect writes have a bounded deadline, log an application-side failure when the ingest returns an error, and continue navigation. Durable route-failure counters during a database outage are not implemented in this phase.
- Database state is authoritative after initialization. Environment destinations may seed an empty database, but runtime database failure never resurrects an inactive destination.
- Historical meaning comes from event snapshots; joins supply current admin metadata only as a secondary view.

## Trust boundaries

- Server-trusted fields are signed session/visitor/consent/exclusion/test context, environment and traffic classification, resolved `/r` tracking-link identity/taxonomy, resolved `/go` destination, route path, sanitization, and sink eligibility.
- Client-observed/untrusted fields are the proposed event ID/name, page UTM/referrer facts, lifecycle facts, consent choice before server signing, and allowlisted event properties. They remain bounded facts, not authorization or classification claims.
- A server-resolved owned tracking link can replace weaker client-observed acquisition. Client-observed values cannot replace an existing owned session acquisition. They may still become acquisition when no stronger evidence exists, which is an unavoidable public-telemetry abuse limitation.
- The database RPC revalidates enums, sizes, relationships, sequence, and deduplication.

## Reporting boundary

Acquisition rankings read one canonical session acquisition and are mutually exclusive by source/campaign/asset/placement/tracking link. Event attributed context remains append-only for non-exclusive touchpoint, assist, and journey analysis. Destination ranking is click depth rather than acquisition.

Significant admin mutations use narrow `SECURITY INVOKER` RPCs. Each function rechecks the actor's current `owner`/`admin` profile, locks the target when applicable, verifies that a target row exists, performs the business change, inserts one audit row, and commits or rolls back as one transaction. Browser roles have no execute grant.

## Known limitations

Cookies identify a browser context, not a person. Multiple devices, cleared cookies, incognito, shared browsers, and in-app browsers split or merge identity. Bot detection and lifecycle resume detection are conservative rather than perfect. Old events cannot be assigned a truthful historical visitor.

## Privileged-account review

Authentication requires a verified Supabase Auth user plus a fresh active database membership and server-enforced owner/admin/viewer role; viewers cannot mutate. Login responses do not enumerate membership or pending-invitation state. `BOOTSTRAP_OWNER_EMAIL` can create only the first owner and is not a steady-state bypass. Local Auth disables open public signup and applies email throttling, but production still requires identified SMTP, reviewed Supabase Auth rate limits, scanner-safe magic-link/invite delivery education, and a decision on MFA for owner/admin accounts. Email security scanners can consume or pre-open links; this must be tested with the selected production provider. Magic link alone is not treated as a complete privileged-account risk program.
