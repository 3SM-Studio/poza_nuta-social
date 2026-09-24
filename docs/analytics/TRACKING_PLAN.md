# Tracking plan

Schema version: `1`. Only names in this document may be emitted.

| Event | Exact trigger | Required properties | Optional properties | Analytics consent | Deduplication and attribution |
| --- | --- | --- | --- | --- | --- |
| `tracking_entry` | active `/r/[code]` resolved | tracking link ID/code snapshot, landing path | campaign/asset/placement snapshots | valid analytics consent required | route event UUID; owned observed context becomes session acquisition/current touch |
| `page_view` | public page becomes visible after navigation | path | title, navigation type | valid analytics consent required | client event UUID; direct follow-up inherits session attribution |
| `outbound_click` | active `/go/[slug]` is requested | destination ID/slug/label/domain snapshots | outbound ordinal | valid analytics consent required | route event UUID; inherits session attribution |
| `contact_view` | `/kontakt` becomes visible once per document navigation | path=`/kontakt` | navigation type | valid analytics consent required | stable event UUID for that mount; inherits session attribution |
| `contact_click` | configured contact action is activated | contact type (`email`) | channel label | valid analytics consent required | click UUID; means intent only, never message sent |
| `hub_resumed` | hub was visible, an outbound was initiated, document became hidden, then becomes visible/pageshow after >=2 seconds | prior destination slug, resume signal | elapsed bucket, BFCache flag | valid analytics consent required | one per outbound state; inherits session attribution |

Event attributed context is the non-exclusive touchpoint/journey record. Acquisition reports do not aggregate these rows; they read the exclusive canonical session acquisition.

## Common fields

Every event stores: `event_id`, `event_name`, `occurred_at`, `session_id`, optional `visitor_id`, `session_sequence`, `schema_version`, `environment`, `traffic_class`, analytics/marketing consent booleans, observed context, attributed context, broad device/browser/OS categories, path, and sanitized metadata.

## Classification behavior

- External production events enter default KPIs.
- Internal, test, and bot events remain inspectable and are excluded by default.
- Development/preview/staging remain inspectable and are excluded from production KPIs.
- GA4 is eligible only for production + external + analytics consent.
- Marketing sinks are eligible only for production + external + marketing consent and are not active now.

## Lifecycle state machine

`idle -> outbound_pending -> hidden_after_outbound -> resumed -> idle`.

An outbound click alone never emits `hub_resumed`. The client arms state immediately before navigation, persists only destination/time/hidden state in `sessionStorage`, requires a hidden transition, and emits once on `visibilitychange` or `pageshow`. Reload without an armed outbound, ordinary tab switching, and repeated visibility events do not count. Mobile app handoff and BFCache can suppress or delay signals; the metric is conservative.
