# Data quality and operations

Analytics health is separate from website health. Redirect success can coexist with lost analytics.

## Implemented now

- `analytics_quality_daily` increments `stored_event` and `duplicate_event` inside the ingest transaction.
- The ingest API rejects invalid event IDs, names, paths, oversized bodies, and unapproved properties; server logs record ingest errors without request bodies or token values.
- `/r` and `/go` use bounded best-effort writes and safe redirects. Missing/inactive/invalid records are observable in application logs and browser/route tests, but are not yet durable per-route counters.
- The dashboard exposes production traffic-class breakdown; source rows permit manual calculation of unknown-referral share.
- Database constraints and tests detect duplicate IDs, invalid sequence values, relationship errors, and inactive/archived link behavior.

## Future production monitoring (not implemented alerts)

- ingest attempts, stored events, duplicates, validation failures, and timeouts;
- `/r` active, missing, inactive, archived-campaign, and write-failure counts;
- `/go` active, missing, inactive, invalid-domain, and write-failure counts;
- zero-event anomaly while public traffic is otherwise healthy;
- daily/hourly event-volume deviation from a rolling baseline;
- unknown-source ratio;
- bot/internal/test share;
- duplicate-event ratio;
- sequence gaps and rejected forged tokens.

The following are specified queries/counters for the production-observability phase, not current alerting claims: durable validation/time-out counts, `/r` and `/go` result counters, zero-event anomaly, hourly volume deviation, unknown-source ratio, bot/internal/test share, inactive-link traffic, sequence-gap scans, and rejected-token totals.

Operational counters must not contain raw IPs, full user agents, full referrer URLs, secret/token values, or arbitrary request bodies.

## Initial alert concepts

No automated alert exists in this phase. Thresholds are environment-specific and must be calibrated in observe-only mode before activation. Suggested starting investigations: write failures >1%, duplicate ratio >5%, unknown-source ratio changes by >20 percentage points, zero production/external events for a normally active 24-hour window, or `/go` resolution failure above baseline.

## Abuse

The public endpoint validates size and taxonomy in both application and RPC layers. Do not add process-memory rate limiting to serverless code. Prepare Vercel Firewall rules in log mode and publish enforcement only with explicit authorization. Spam remains `external` unless confidently classified; dashboards expose the breakdown.

Public telemetry is not proof against spoofing. `/api/track` accepts bounded client-observed UTM/referrer/lifecycle facts, but it cannot assert environment, traffic class, signed identity, owned tracking-link identity, destination resolution, or sink eligibility. Owned `/r` evidence outranks client-observed acquisition, and exclusive acquisition rankings read the canonical session record rather than arbitrary event rows.

Production observe-first firewall plan (not published in this repository):

| Surface | Initial log-mode signal | Metrics to review before enforcement |
| --- | --- | --- |
| `POST /api/track` | investigate clients above 120 requests/minute | accepted/invalid/413 ratio, duplicate ratio, timeout/write-failure ratio, false positives from shared networks |
| `POST /api/consent` | investigate clients above 30 requests/minute | choice-change frequency, 4xx ratio, browser retry behavior |
| `/admin/login` and Auth initiation | investigate clients above 10 attempts/15 minutes | successful/failed initiation, Supabase Auth throttles, scanner/pre-fetch behavior |
| `/r/*` and `/go/*` | observe bursts above 300 requests/minute; do not block navigation by default | missing/inactive ratios, write-failure ratio, verified campaign spikes, bot/share-preview traffic |

Thresholds are starting investigation points, not production claims. Use platform-derived rate-limit signals without persisting raw IP in application analytics. Calibrate on the identified Vercel project, then authorize enforcement separately.

## Quality-counter hot row

Every stored or duplicate ingest currently increments one daily `(metric_date, environment, metric_name, route)` row. This is acceptable at the expected launch scale and keeps the ingest transaction short, but it can become a write-contention hot row at high sustained volume. It is an accepted scaling limitation, not a current correctness blocker. Review row-lock time and ingest latency before considering sharded counters, batching, or a queue; no streaming redesign belongs in Analytics V2.1.

## Runbook

1. Verify public navigation independently from analytics.
2. Check quality counters by environment and route.
3. Compare Postgres events, application logs, and optional GA4 totals without expecting equality.
4. Confirm consent/classification changes before calling volume loss a defect.
5. Never replay unknown events without stable event IDs and validated context.
