# Deterministic Attribution for Key Events

This foundation reads accepted outcome events. It does not create a marketing attribution model or write credit rows. The implementation contract is `src/lib/analytics/attribution-contract.ts`; the read model is `analytics_deterministic_attribution_v1` in the corresponding migration.

## Existing acquisition semantics

`observed_context` is the request's own sanitized acquisition evidence. For a consented event, the ingest function updates the session's `current_attribution` with the event's eligible non-direct candidate, retains the previous non-direct value for a direct request, and writes the resulting value into that event's `attributed_context`. This is a stored **event snapshot** of the session's current non-direct touch, not a pointer or a new historical lookup. The separate `session_acquisition` tracks the canonical first eligible non-direct touch with direct fallback and owned-link precedence. `analytics_visitors.first_acquisition` exists but does not supply outcome credit in this read model. The signed session/acquisition cookies have a 30-minute inactivity lifetime; no new lookback is introduced here.

`analytics_cookieless_events` has no session or visitor identity and no persisted acquisition context. Its accepted outcome may carry referrer/UTM evidence from that same request or stable IDs on that same row. In the current public runtime, `contact_click` and `outbound_click` do not pass a `trackingLink` to cookieless ingest; their campaign/asset/placement/link IDs are therefore normally absent. The schema permits such same-event IDs, and the read model handles them if present without linking to an earlier event.

## Outcome and credit contract

Only accepted `contact_click` and `outbound_click` are eligible Key Events. Both modes contribute one count per accepted event. Consented rows require `analytics_consent = true` and `schema_version = 1`; quality exceptions, duplicate attempts and filtered/rejected attempts are not primary events. `tracking_entry`, `page_view`, `contact_view` and `hub_resumed` are not eligible outcomes.

For each eligible outcome, exactly one basis applies:

| Basis | Evidence on the outcome |
| --- | --- |
| `direct_observed` | The outcome's own non-direct observed source or stable acquisition ID; cookieless also accepts its own sanitized UTM source or external referrer host. |
| `persisted_consented` | No direct context, but the consented outcome already contains a non-direct source or stable acquisition ID in its stored `attributed_context` snapshot. |
| `unattributed` | Neither condition is met. This is a valid result, not a Data Quality error. |

Direct context wins when direct and persisted contexts differ; no fields from the losing context are merged. A source-only or link-only credit is partial and does not count as campaign-attributed. Campaign, asset, placement and link breakdowns use only their own stable IDs stored in the selected outcome context. A destination, campaign text, current tracking-link relation or current asset relation never supplies a missing historical campaign ID. Current names/status are display metadata only; missing metadata does not remove the ID's credit.

The accepted Key Event **event** is the unit of credit. Repeated events in a consented session count separately; the optional `consentedSessionsWithAttributedOutcome` deduplicates only consented session IDs. No cookieless session or person metric is inferred. `contact_click` and `outbound_click` remain separate outcome types with no weights or monetary value.

`coverage = attributed / total eligible Key Event events`, or `null` when total is zero. `attributed = direct_observed + persisted_consented`; `total = attributed + unattributed`. Coverage is not a conversion rate. The report separates mode, outcome type and basis, ranks campaign IDs by outcome events, and shows independent asset/placement/link ID breakdowns. The top 100 campaign entities and top 100 graph combinations are returned; summary counts cover the whole bounded window.

## Scope, date and access

The selected Warsaw date interval filters the **outcome's** `occurred_at` from start midnight inclusive to next-day midnight exclusive. Earlier acquisition evidence is usable only when already stored in that outcome's consented context snapshot. `analytics_reporting_eligible_v1` filters each outcome before credit aggregation: Business is `production + external`; Diagnostic includes all accepted rows. Consented events have no `project_key` column; the application owns the single `poza_nuta` project key and the RPC rejects other keys.

`/admin/attribution` is read-only behind fresh active admin membership, including `viewer`. The browser receives aggregate rows only. The PostgreSQL functions are `SECURITY INVOKER`, owned by `postgres`, callable by `service_role` only; the two source tables keep RLS, with no new `anon` or `authenticated` privileges. The migration adds two functions and no event, cookie, index, snapshot or credit table. Public data collection, `/prywatnosc` and `/cookies` are unchanged.
