# Data retention — deployed engine and operating procedure

The owner-approved periods, processing categories and release status are in the canonical [processing fact matrix](../privacy/PROCESSING_FACT_MATRIX.md). This file describes the technical mechanism. It does not change the policy or authorize a Production purge.

## Scope and authority

Migration `20260929161209_approved_retention_engine.sql` creates the private `retention` schema and one entrypoint, `retention.run(as_of, batch_size, dry_run)`. It is `SECURITY DEFINER`, owned by `postgres`, with an empty `search_path`; only `service_role` has `EXECUTE`. `anon` and ordinary `authenticated` users have neither schema usage nor function execution. The schema is not exposed through the Data API. Call it through a privileged SQL connection or, after separate approval, a database scheduler running the same function. The migration is deployed, but **destructive purge has not been authorized or executed and no Production scheduler exists**.

### Remote deployment verification — 2026-09-29

Owner-authorized deployment applied exactly this migration to Supabase project `vrusesdkxpednckqyuwn` (`poza-nuta-socials`, `eu-central-1`). Remote history now contains `20260929161209`; no other migration, seed, role update or Vault update was applied. Catalog inspection confirmed the private schema, both retention tables, four added columns, five indexes, four triggers, intended invitation FK change, and matching local/remote definitions of `retention.run` and `preserve_session_acquisition_v1`. The migration backfilled its new timestamp metadata for 19 visitor rows and 39 session rows (both session attribution columns); no existing attribution JSON was scrubbed. Remote privileges confirmed `postgres` ownership, `SECURITY DEFINER`, empty `search_path`, no schema usage or function execution for `anon`/`authenticated`, and usage plus execution for `service_role`.

Exactly one remote `retention.run(clock_timestamp(), 500, true)` completed successfully. All 16 eligibility categories returned zero and `legacyGateOpen` was false. Before/after counts matched: V2 events 100, V2 sessions 39, visitors 19, cookieless events 81, consent evidence 27, quality exceptions 0, quality daily 1, Admin audit/invitations/profiles 0, Auth users 0, and legacy events/sessions 0. `retention.purge_runs` remained empty: dry-run does not log a purge. All 27 consent-evidence rows retained their original 180-day `expires_at` relationship. The legacy milestone table remains empty, so its 90-day clock has not started. `pg_cron` is not installed; no scheduler or destructive run was created. Database logs showed successful migration statements; no migration, trigger, privilege or dry-run error was observed. Earlier SQL syntax/aggregate errors in the log came from read-only preflight queries before deployment.

The default is a dry run. Example for a **verified local** database:

```sql
select retention.run(clock_timestamp(), 500, true);
-- Review category counts, local tests and dependencies before an authorized run.
select retention.run(clock_timestamp(), 500, false);
```

Never pass a future `as_of` or batch size outside 1–1000. A transaction advisory lock prevents overlapping runs. Each destructive invocation logs only its time, cutoff, batch size and per-category counts in `retention.purge_runs`; the response contains no row values or personal identifiers. Repeated calls are safe. Continue until old-event and then newly-empty-session batches drain. Dry-run reports total currently eligible rows; actual results report only that invocation's bounded changes, so totals and one-run counts need not match when more than one batch exists.

## Dependency order and timestamps

| Relationship | Database behavior | Retention consequence |
| --- | --- | --- |
| `analytics_events_v2.session_id` → session | `RESTRICT` | Delete expired events first. Only sessions empty **at run start** are selected; newly empty sessions wait for the next run. |
| session/event `visitor_id` → visitor | `SET NULL` | A stale visitor may be removed without deleting independently retained sessions/events. Recent linked activity protects the visitor. |
| consent evidence `visitor_id` | No FK | Evidence survives visitor deletion until its own 24-month decision-group limit. |
| Admin profile → Auth user | `CASCADE` | Privileged Auth deletion removes the profile; the retention function never deletes Auth users. |
| invitation `auth_user_id` → Auth user | `SET NULL` | Invitation stays for its separate retention. |
| invitation `invited_by` | Historical UUID snapshot, deliberately no FK | An inviter's Auth user can be removed after revocation while the invitation remains. A later accepted profile nulls a missing inviter reference. Existing admin RPC ownership comparisons remain against the snapshot UUID. |
| Admin audit actor fields | No FK | Audit remains after Auth/profile deletion until 24 months. |
| legacy event → legacy session | No FK; semantic link by `visit_id` | Gate-controlled events are deleted first; only initially empty sessions are selected. |

Strict `< cutoff` is the uniform eligibility boundary: a row exactly at its cutoff survives until a later run. Timestamps are `timestamptz`; month intervals use Postgres calendar-month arithmetic. Session end is the existing `analytics_sessions_v2.expires_at` inactivity deadline, maintained as at least `last_seen_at + 30 minutes`. It is not a fabricated historical `ended_at`. A session also requires no dependent event at run start. Visitor last activity is its `last_seen_at`, with explicit guards for recent linked sessions, events and consent decisions.

`first_acquisition_at`, `session_acquisition_at` and `current_attribution_at` are separate from visitor/session identity. For historical rows they are conservatively derived from first-seen/start or last-seen as appropriate; new changes are stamped by triggers. Expired JSON attribution is set to `{}` in bounded batches without deleting an active visitor/session. The correctness-freeze first-acquisition trigger has a narrow privileged exception for overdue retention scrubbing; ordinary ingestion still preserves its first-touch behavior and cannot reintroduce a scrubbed first touch. Raw event snapshots and cookieless UTM leave with their source event at 12 months and 90 days respectively.

The existing `analytics_consent_evidence.expires_at` marker (defaulting to insertion time plus 180 days) is preserved. No application code reads it and it is not a deletion deadline. Evidence is eligible only when its own decision is older than 24 months **and** no decision for the same visitor falls inside the 24-month window. This retains grant and withdrawal proof together until 24 months after the latest decision.

`analytics_quality_daily` is purged by its daily metric date after 24 calendar months only while its schema is exactly the six aggregate columns and every `route` is the fixed `ingest` value. The engine raises `quality_daily_requires_review` before any mutation if that invariant drifts. Quality exceptions use their event timestamp and 30 days. Audit uses `created_at` and 24 months.

For invitations, `accepted_at` and `revoked_at` mark their respective transitions; `last_attempt_at` marks failed delivery. An explicit `expired_at` marks the transition from pending to expired. Historical expired rows use their existing `updated_at` as a conservative bound. An expired pending row is transitioned by the engine but is not immediately purged: its 90 days start at the actual transition. Failed rows without a reliable attempt timestamp are held for review, not guessed from creation time.

## Manual and external boundaries

The engine only reports inactive Admin profiles older than 30 days after `deactivated_at`; it does not delete profiles or `auth.users`. A privileged operator must confirm access revocation and the active-owner invariant, revoke sessions through the supported Auth Admin path, inspect pending invitations and other references, then delete the Auth user through the privileged Supabase Admin API. The profile cascades, invitation `auth_user_id` becomes null, inviter snapshots and audit persist under their own periods. Test the exact flow locally before any Production use; an Auth user must not be removed by direct Production SQL.

The legacy gate table starts **empty**. The old dashboard RPCs are dropped by migration `20260920120000_analytics_visitor_session_event_v1.sql`, and current `src`/`scripts` contain no runtime call to the old tables/RPCs. That local result is insufficient to close Production migration or rollback. An authorized operator must verify remote code, reporting, migration results and rollback closure, then insert a dated `migration_verified_at` record with all three gate flags and an evidence reference. Only after 90 days does the same engine process legacy rows. If any legacy row shows activity after the verified milestone, the engine fails closed for review. No milestone was inserted in this slice.

Zoho correspondence requires a reviewed mailbox process with approved exceptions. Resend's 30-day message/log statement and infrastructure logs are provider controlled; this function does not operate on them. Scheduling and any destructive execution require separate owner authorization, observed bounded execution and a privileged scheduler. Deployment plus a zero-change dry-run do not constitute recurring Production enforcement.
