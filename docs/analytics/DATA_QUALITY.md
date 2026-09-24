# Analytics Data Quality foundation

The Admin page at `/admin/data-quality` measures the application analytics ingest pipeline. It uses the existing Admin membership check (owner, admin and read-only viewer). The service role performs the database read; public roles have no direct access to the quality table or report RPC.

## Sources and definitions

- **Persisted cookieless**: rows in `analytics_cookieless_events` with the server-owned project key and `occurred_at` inside the selected Warsaw-local date range.
- **Persisted consented**: rows in `analytics_events_v2` with `analytics_consent = true` and `occurred_at` in the same range. This legacy single-project table has no `project_key` column.
- **Persisted total**: sum of those two counts. Neither duplicate retries nor exception rows increase it.
- **Rejected, duplicate, filtered**: counts of successfully stored rows in `analytics_quality_exceptions` by `outcome`, the same project key and range.
- **Rejection reasons**: grouping of stored rejected exception rows by closed reason code.
- **Contract drift**: rows in primary tables with an unknown event name, invalid canonical path or (for cookieless) a project key different from the server-owned key. Database constraints prevent most new drift, but this check can surface legacy or manually changed data.
- **Event breakdown**: persisted primary rows grouped by canonical event name; these are event counts, not sessions or visitors.

Ranges are inclusive of the selected first day and exclusive of the day after the selected last day in `Europe/Warsaw`. All environments and traffic classes are included, including test and bot classified rows.

## Exception contract

Surfaces: `api_track`, `tracking_redirect`, `outbound_redirect`.

Outcomes and reasons:

| Outcome | Reasons | Meaning |
| --- | --- | --- |
| `rejected` | `invalid_json`, `payload_too_large`, `forbidden_field`, `invalid_event`, `invalid_payload`, `invalid_event_id`, `invalid_path` | `/api/track` rejected a request before primary storage. |
| `duplicate` | `idempotent_retry` | Primary RPC identified an existing `event_id`; no second event row was written. |
| `filtered` | `unsupported_mode` | `hub_resumed` is intentionally skipped in cookieless mode. |

The current bot heuristic classifies primary events as `bot`; it does not filter them, so there is no `filtered_bot` reason. Primary RPC failures use structured server logging with surface and fixed reason, because an unavailable analytics database cannot reliably record its own outage. No offline queue is introduced.

The exception table has only project key, timestamp, surface, optional server-determined mode, optional validated canonical event name/path, outcome and reason. It has no `details` JSON, request body, arbitrary client properties, visitor/session identity, event ID, email, phone, referrer, User-Agent or IP. The project key comes from `ANALYTICS_PROJECT_KEY`, never from a public request. Primary event tables remain the only accepted-event source of truth; the older `analytics_quality_daily` operational counter is not used to compute this report.

The older daily counter still increments when available. Its two writes inside the consented ingest RPC are now isolated with a database exception boundary, so counter failure does not roll back a primary event or hide an idempotent retry.

## Blind spots and retention

Exception writes are best effort. A failed write does not block the primary event, redirect or public UI. Consequently, zero exceptions means only that none were *recorded here*. A complete database outage, failed exception write, request lost before reaching the app and deadlines are not fully measurable by this database-local report. Duplicate counts are lower bounds if exception writes fail. The report does not infer a database outage count from silence.

The existing consented `page_view` boundary normalizes an unknown submitted page path to `/`. The original value is deliberately not retained, so this report cannot count those normalized attempts as path drift. Cookieless page paths and contact event/path mismatches are rejected with `invalid_path`.

No new user behavior or personal fields are collected, so the public privacy/cookie data scope is unchanged. A retention period for `analytics_quality_exceptions` has not been approved. `DATA_RETENTION.md` contains proposed technical defaults, not an adopted legal policy. Retention approval and an eventual purge process remain explicit follow-ups; this slice adds neither automated purge nor production writes.

## Earlier operations plan: future monitoring (not implemented alerts)

The list below predates this foundation. Validation failures and observed duplicates now have the limited, DB-local counts defined above; timeouts and full outages remain outside that guarantee.

- ingest attempts, stored events, duplicates, validation failures, and timeouts;
- `/r` active, missing, inactive, archived-campaign, and write-failure counts;
- `/go` active, missing, inactive, invalid-domain, and write-failure counts;
- zero-event anomaly while public traffic is otherwise healthy;
- daily/hourly event-volume deviation from a rolling baseline;
- unknown-source ratio;
- bot/internal/test share;
- duplicate-event ratio;
- sequence gaps and rejected forged tokens.

The following remain production-observability proposals, not current alerting claims: durable timeout counts, `/r` and `/go` resolution counters, zero-event anomaly, hourly volume deviation, unknown-source ratio, bot/internal/test share, inactive-link traffic, sequence-gap scans, and rejected-token totals.

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
