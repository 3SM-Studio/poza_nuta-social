# Consented session segments foundation

`src/lib/analytics/segment-contract.ts` owns the typed system definitions and closed stable keys. A segment is a deterministic predicate over **eligible consented sessions**, never an arbitrary request filter. The population unit is `session_id`, not a visitor or person. The server chooses the definition; Admin can only choose one of the four keys. Labels can change without changing identity. There is no custom segment CRUD, expression language, audience export, persisted membership, or new public collection.

## Base and window

The base is distinct consented `session_id` values with at least one accepted `analytics_events_v2` row in the selected Warsaw event window and Reporting Scope. Accepted here means `analytics_consent = true`, `schema_version = 1`, and a stored primary event. Quality exceptions, legacy schema 0 and cookieless rows are excluded. Business is production/external; Diagnostic includes all accepted traffic. The row predicate `analytics_reporting_eligible_v1` runs before session grouping. Start midnight is inclusive and next-day midnight exclusive, using `Europe/Warsaw`; no event outside the selected window is searched for membership. A session that started earlier may enter the base only through an eligible event inside this window.

All segment counts use the same base. One session counts once per segment even if its event repeats. Segments overlap, so sums may exceed the base and shares may exceed 100% in total. `share of base = segment sessions / base sessions`; the share is unavailable when base is zero. Cookieless has no session ID; two cookieless events are never correlated or made into a pseudo-session. `visitor_id` never joins sessions. No new/returning classification is inferred.

| Key | Membership in qualifying events | Product question |
| --- | --- | --- |
| `key_events` | At least one canonical `contact_click` or `outbound_click` | Which sessions contained a meaningful action? |
| `contact_click` | At least one `contact_click` | Which sessions attempted email contact? |
| `outbound_click` | At least one `outbound_click` | Which sessions chose an official destination? |
| `tracking_entry` | At least one `tracking_entry` | Which sessions used an owned `/r` entry? |

Event names follow `outcome-contract.ts` and the current `analytics_key_events_v1` SQL contract. `tracking_entry` is evidence of an active owned link, not proof of QR scanning. The attributed outcome candidate is omitted: `analytics_deterministic_attribution_v1` computes event-level basis using outcome snapshots, and this foundation has no reusable event-level credit primitive. Repeating or simplifying that credit logic inside Segments would cause drift. Existing Attribution semantics remain unchanged.

## Read model and access

`analytics_consented_segments_v1` performs one bounded PostgreSQL read: filtered events → per-session facts → four fixed predicates → counts and one selected snapshot. The snapshot reports session count, share in UI, page-view events, contact and outbound Key Event event counts, tracking-entry events, and sessions with a Key Event. Event occurrences and sessions are labeled separately. The RPC returns only aggregate JSON, no session or visitor IDs. It is `SECURITY INVOKER`, owned by `postgres`, and executable only by `service_role`. Existing source RLS and table grants remain. `/admin/segments` requires fresh active Admin membership; `viewer` can read and cannot edit definitions. No schema table, index or membership storage was added.

## Local plan evidence

`scripts/segments-explain.sql` inserts 1,000 synthetic sessions and 4,000 events inside one transaction, analyzes the source and runs `EXPLAIN (ANALYZE, BUFFERS)` for the base, all preset counts, selected snapshot and Key Event predicate for Business 7 and 30 days. It ends in `ROLLBACK`; the benchmark session IDs were absent afterwards. The script explains equivalent constituent queries, not the opaque PL/pgSQL wrapper overhead. In the 7-day range (1,041 eligible event rows), all four plans used the existing `analytics_events_v2_quality_range_idx` through a bitmap heap scan. Execution times were 0.573, 0.722, 0.659 and 0.701 ms. In the 30-day range (3,601 eligible rows), the planner used a sequential scan of this small local table; times were 1.564, 2.318, 2.014 and 1.981 ms. Shared hits were 92 for 7 days and 90 for 30 days at the source scan. Aggregates used memory (77 kB in the 7-day plan); the base sort used quicksort (49/97 kB). No temp spill was observed. These local timings do not predict production latency. No index was added.
