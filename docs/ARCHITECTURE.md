# Architecture

## Boundary
This Poza Nutą application is independent and prepared for the future canonical origin `https://pozanuta.pl`. It owns its repository, deployment, Supabase project, authentication, database, analytics and public routes. It must not import Stage or another Poza Nutą application. Production domain and hosting changes are separate work.

## Public surfaces
- `/` — main Poza Nutą marketing introduction and routes for participants and venues.
- `/karaoke` — participant information and pointer to current official updates.
- `/dla-lokali` — collaboration information for venues and organizers.
- `/linki` — compact official destination hub using the same records as `/go/[slug]`.
- `/kontakt` — first-party business/collaboration contact surface.
- `/prywatnosc` — privacy information.
- `/cookies` — actual browser storage inventory and consent controls.
- `/r/[code]` — campaign/QR entry route, `noindex`, no-store.
- `/go/[slug]` — tracked outbound redirect, `noindex`, no-store.

## Direct / organic flow
1. Visitor opens `/`.
2. The server-rendered page is useful before client analytics runs.
3. Before server-confirmed analytics consent, eligible page, contact and redirect events may be recorded without visitor or session identity in `analytics_cookieless_events`. No pseudonymous visitor or analytics session cookie is created. Infrastructure request handling is separate.
4. Once versioned analytics consent is confirmed, the server establishes a signed 30-minute session and a pseudonymous browser visitor. `TrackPageView` then sends a `page_view` to `/api/track` for consented analytics.
5. External referrer/UTM is normalized. Same-site referrers are ignored as acquisition sources.
6. `/go/[slug]` may record an identity-free `outbound_click` best-effort before consent. With consent it records the click with the session's current attribution. Tracking failure does not block the redirect; database lookups and analytics writes have bounded best-effort deadlines so an outage cannot indefinitely hold navigation.

## QR / owned campaign flow
1. After root-domain migration, programmatic SVG contains a stable URL such as `https://pozanuta.pl/r/ABC123`.
2. `/r/[code]` resolves an active tracking link and may record an identity-free `tracking_entry` best-effort before consent. With consent it records the event using the full tracking context.
3. With consent, the anonymous session stores canonical acquisition (first eligible non-direct with direct fallback) and current/last-touch attribution server-side.
4. Visitor is redirected to a clean landing path, currently `/` or `/kontakt`. The current database contract does not allow `/linki` as a tracked QR landing path.
5. Later external UTM/referrer can update last-touch while canonical session acquisition remains unchanged after its first eligible non-direct value. A server-resolved owned link may replace weaker client-observed acquisition evidence.
6. Later consented `/go/[slug]` clicks inherit the latest session attribution.

There is no raw IP storage and no fingerprint identifier. The detailed v1 contract is in `docs/analytics/ANALYTICS_ARCHITECTURE.md`.

## Data model
- `campaigns` — logical campaign/event grouping.
- `tracking_links` — stable 5–7 character codes with campaign → asset → placement dimensions.
- `referral_participants` — independent soft-lifecycle referral dimension with optional Auth/admin linkage.
- `admin_invitations` — application invitation intent, lifecycle and delivery/reconciliation state; no token storage.
- `destinations` — official public Poza Nutą channels only.
- `analytics_visitors` — optional consent-gated pseudonymous browser context.
- `analytics_cookieless_events` — eligible identity-free events without visitor or session linkage.
- `analytics_sessions_v2` — short-lived session acquisition/current context, optionally linked to a visitor.
- `analytics_events_v2` — append-only, idempotent, ordered events with observed/attributed context and historical snapshots.
- `analytics_consent_evidence` — append-only minimal grant/withdrawal evidence, without IP or user-agent.
- `analytics_assets`, `analytics_placements` — reusable campaign taxonomy entities.
- Legacy `analytics_sessions` and `analytics_events` remain during the compatibility window.
- `admin_profiles` — active/inactive `owner/admin/viewer` membership and steady-state admin authority.
- `audit_log` — admin mutation history.

RLS is enabled. Browser roles intentionally receive no application-table policies, dashboard RPC execution, or audited-mutation RPC execution; business data is accessed by trusted server code using the server-only secret-key client (with a documented legacy service-role fallback). Admin identity requires verified Supabase Auth plus a fresh active database membership. `owner` and `admin` may perform their scoped operations, while `viewer` is read-only in the UI, Server Actions, and typed database mutation functions. `BOOTSTRAP_OWNER_EMAIL` is limited to the zero-owner bootstrap RPC and is not a permanent bypass. Owner-sensitive transactions serialize on a database advisory lock, retain at least one active owner, and transfer ownership atomically. Each significant business mutation and its audit row commit or roll back in one database transaction. Next.js `proxy.ts` refreshes/verifies Auth claims for admin/auth routes.

Supabase Auth Admin is server-only. Invitation intent is persisted before delivery; new-user Auth delivery, existing-user magic-link onboarding, failure recording, revocation and idempotent acceptance are explicit reconciliation steps across the non-transactional Auth/database boundary.

Referral links remain ordinary `tracking_links` served by `/r/[code]`. Stable participant ID enters canonical session and visitor-first acquisition; participant label is snapshotted on events so later rename/deactivation preserves historical interpretation. The leaderboard reads canonical session/visitor acquisition and filters to production/external evidence.

## Privacy boundary
The product question is answered at consented session/campaign level. A random browser-context visitor may link later consented sessions; it is not a person identifier. Without consent, limited identity-free events may be recorded, but no pseudonymous visitor or analytics session identity is created. Exact device model, precise location, raw IP and fingerprinting remain explicitly out of scope. Server-side retention periods and deletion require approval before production.
