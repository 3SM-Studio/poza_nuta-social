# Acquisition Campaign Graph foundation

## Existing model

`campaigns.id` is campaign identity; `name` and `slug` are current display metadata. `analytics_assets.id` is asset identity. An asset's `campaign_id` is nullable (`ON DELETE SET NULL`), while its `(campaign_id, slug)` is unique. `analytics_placements.id` is placement identity. Placements have no campaign FK and can be reused. `tracking_links.id` is link identity; the public `code` routes `/r/[code]`. Its campaign, asset and placement FKs are all nullable (`ON DELETE SET NULL`). Many links can use one placement or asset; one asset can appear at many placements through links. Legacy `tracking_links.asset` and `.placement` text remain present but are not stable identity. `distribution_unit` is optional link metadata. There is no separate QR table: SVG is generated from the stable `/r` URL. A link's `landing_path` is its internal redirect target (`/` or `/kontakt`); it is not a `destinations` FK. `destinations.id` is the official `/go/[slug]` target and may be shared across campaigns. A tracking link has no direct destination FK.

Campaigns can be `draft`, `active` or `archived`; assets and placements have `active` plus optional active windows; links have `active` plus optional active windows. The read model does not filter archived or inactive entities out of historical results. Current entity labels and status are shown as current metadata, not reconstructed history. FK deletion can null event relationships; a UUID in event context with a missing current entity renders as unavailable without a payload-derived label.

## Association semantics

The two accepted primary tables are `analytics_cookieless_events` and `analytics_events_v2`. Quality exceptions (`rejected`, `duplicate`, `filtered`) never contribute to counts. Business/Diagnostic eligibility uses `analytics_reporting_eligible_v1` on event rows before aggregation. Business means `production` + `external`; Diagnostic includes all accepted rows. Cookieless is filtered by the server-owned `poza_nuta` project key. The consented table belongs solely to this application and predates `project_key`.

An event falls in exactly one campaign association category:

- **Direct observed context:** cookieless campaign ID stored on that event, or consented campaign ID stored in `observed_context` / resolved from the event's directly used `tracking_link_id`. This is observed evidence, not a conversion or attribution model.
- **Persisted consented context:** no direct campaign ID, but a canonical campaign ID in that event's existing `attributed_context` (current/last eligible touch from the consented session model). This may apply to downstream `/go`, contact or page events. It is not a new direct tracking entry.
- **No campaign context:** neither of the above. A UTM string or referrer alone never maps to a campaign row. This may be valid direct traffic, not a quality defect.

Cookieless events have no persistent visitor/session acquisition identity. The dashboard never joins cookieless events to each other by time, referrer, order, UA or IP. `/go` cookieless events carry destination ID but ordinarily no campaign ID and therefore remain unattributed. A destination's total activity is never assigned to a campaign merely because that campaign used the same destination.

For event and graph drilldown, association IDs are stable UUIDs. The report does not group by names, slugs, legacy free-text asset/placement fields, UTM text or `dimension_snapshots`. Existing snapshots remain untouched and no third event store is created.

## Metrics and boundaries

All values count **accepted events**, not people, sessions, inferred scans or conversions. `trackingEntries` counts `tracking_entry`; `outboundClicks` counts `outbound_click`; `contactClicks` counts `contact_click`; `contactViews` counts `contact_view`. The accepted-event population also includes consented `hub_resumed`, which contributes to event and context totals but not these named KPIs. Overview counts for the named event types include unassigned rows; per-campaign counts require the campaign ID on the event read model. `directEvents`, `persistedEvents` and `noCampaignEvents` partition the selected accepted-event population. A copied `/r` URL is a tracking entry but does not prove a QR scan. The source of each KPI and association is also declared in `src/lib/analytics/acquisition-contract.ts`.

The default range is 30 days. 7/30/90/custom reuse `resolveDashboardRange`. SQL boundaries are `[from date 00:00 Europe/Warsaw, day after to date 00:00 Europe/Warsaw)` on `occurred_at`; campaign creation date does not affect the range. The SQL RPC rejects spans over 366 days. Overview returns at most 50 campaign rows per page and a total count; detail is one campaign and one bounded date range. One RPC supplies each view; the browser never receives raw event rows or N+1 queries.

The dashboard lives at `/admin/acquisition`, with detail at `/admin/acquisition/[id]`. Admin layout requires active database membership, including read-only viewer access. Both views contain only read actions; management links go to the existing campaign/link CRUD. RPC execution is restricted to `service_role`, and the Next.js server owns the project key and scope selection. No new public tracking or cookies were added. `/prywatnosc` and `/cookies` remain unchanged because public data collection did not expand.

## Local verification evidence

The local Supabase target was `127.0.0.1:54322`, container `supabase_db_pozanuta-social`. The migration applies from an empty local reset. Inspection of `pg_class` and `pg_proc` confirmed RLS enabled on cookieless storage, `security invoker` ingest/read functions, and no cookieless table `SELECT` for `anon` or `authenticated`. The prior migration did not grant `service_role` the needed cookieless table `SELECT`/`INSERT`; this migration grants only those two permissions to that server role. The new pgTAP tests assert the grants, RLS and invocation mode.

On the small local data set after E2E, `EXPLAIN (ANALYZE, BUFFERS)` for a September 2026 Warsaw range showed sequential scans of 42 cookieless rows (1 shared buffer, 0.08–0.13 ms) and 37 consented rows (9 shared buffers, 0.13 ms). The read RPCs took about 6.0 ms for overview and 6.2 ms for detail, including PL/pgSQL overhead. PostgreSQL preferred these scans at this size; no index was added without evidence of a larger-data bottleneck. These timings do not establish performance at production volume.
