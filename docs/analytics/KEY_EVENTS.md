# Key Events / Outcome semantics

The server-owned contract is `src/lib/analytics/outcome-contract.ts`. Stable event names, rather than UI labels, identify stored events. The accepted primary population consists of `analytics_cookieless_events` and `analytics_events_v2` with `analytics_consent = true` and `schema_version = 1`. `analytics_quality_exceptions` (`rejected`, `duplicate`, `filtered`) and legacy `schema_version = 0` rows do not contribute. Duplicate ingestion does not add a second primary row.

| Canonical event | Where it is emitted | Meaning | Modes | Semantic class | Key Event |
| --- | --- | --- | --- | --- | --- |
| `page_view` | Public page entry from `AnalyticsLifecycle` | Observed page opening | both | activity | no |
| `tracking_entry` | Active `/r/[code]` before redirect | Owned-link entry; acquisition evidence, not proof of QR scan | both | acquisition | no |
| `outbound_click` | Active `/go/[slug]` before redirect | Choice of official destination, not proof of arrival | both | outcome | yes |
| `contact_view` | `/kontakt` page entry | Contact page seen, without contact action | both | activity | no |
| `contact_click` | Email link click on `/kontakt` | Explicit attempt to open email contact, not proof a message was sent | both | outcome | yes |
| `hub_resumed` | `pageshow` / `visibilitychange` after a recorded outbound choice | Lifecycle return signal | consented only | lifecycle | no |

The client SDK permits `page_view`, `contact_view`, `contact_click`, and `hub_resumed`; redirect routes emit `tracking_entry` and `outbound_click` server-side. `/api/track` filters `hub_resumed` in cookieless mode. The modes choose one ingestion path per event, so their accepted event counts can be added. They do not create two copies of a primary event. The server may reject or fail to store an attempted event; the report counts stored accepted rows only.

Cookieless rows contain event ID, name, time, environment, traffic class, path and limited observed referrer/UTM or direct link/destination IDs. They have no visitor or session ID, and no persisted acquisition context. Consented rows have a session ID, optional pseudonymous visitor ID, observed and attributed context, snapshots, broad device categories and event metadata. An event name has the same user-action meaning in either supported mode, while its available context and identity differ.

`analytics_key_events_v1` returns the two fixed outcomes in one bounded read. For each name, **acceptedEvents** counts accepted occurrences in the selected event window and Reporting Scope, **cookielessEvents** and **consentedEvents** partition that number, and **consentedSessionsWithEvent** counts distinct consented `session_id` values with at least one such event. An event count is not a people count. A session can contribute more than one event. Cookieless has no session or unique-user metric. These metrics have no denominator and are not conversion rates.

The date window uses the existing admin range resolver: today, 7, 30 (default), 90 or valid custom dates, at most 366 calendar days. Boundaries are midnight `Europe/Warsaw` inclusive at `fromDate` and exclusive at `toDateExclusive`; the latter is the day after the displayed end date. Business uses `analytics_reporting_eligible_v1`: `production` and `external` only. Diagnostic includes all accepted rows. Scope applies to each primary row before grouping.

An outcome may have no campaign context. `eligibleAsAttributionOutcome` declares a possible future target, without campaign credit, matching or an attribution model. The existing Campaign Graph measures observed/direct/persisted campaign context separately. Existing funnel step conversion percentages retain their explicit session denominators; this report does not rename or reuse them. Legacy `legacy_interaction` is retained in storage but is not a canonical current event or an outcome. Quality telemetry's `outcome` field means ingest disposition, not business outcome.

The admin route is `/admin/key-events`. It requires fresh active admin membership, allows read-only viewers, and calls the service-role RPC only on the server. The RPC uses `SECURITY INVOKER`, a closed scope/date/project-key parameter set and static SQL. No new table, cookie, public event, public data field, anon/authenticated grant or campaign attribution is introduced.

## Local verification snapshot

The fresh local reset applied the migration. Focused pgTAP covers mode totals, repeated events versus distinct sessions, Business/Diagnostic, Warsaw start/end boundaries, no campaign context, missing data and permissions. The full suite passed after browser E2E without another reset (18 files, 481 assertions), preserving one active test owner. A local `EXPLAIN (ANALYZE, BUFFERS)` of the aggregation for Business 7 and 30 days used the existing cookieless and consented quality range indexes, with a `GroupAggregate` over the union and `count(distinct session_id)`; both plans touched eight shared buffers and returned no rows for those dates. The empty local data means their 0.247/0.170 ms execution times are **not** production forecasts. No new index was added. Local security and performance advisors reported no error-level findings.
