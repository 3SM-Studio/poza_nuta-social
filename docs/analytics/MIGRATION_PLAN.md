# Migration plan

## Principle

Preserve current data and run a compatibility window. Never fabricate historical visitor continuity.

## Order

1. Add normalized assets/placements and v2 visitor/session/event tables beside current tables.
2. Add atomic `analytics_ingest_event_v1`, dashboard v2 RPC, indexes, RLS, and narrow grants.
3. Backfill one v2 session per legacy `visit_id`; leave `visitor_id` null.
4. Backfill legacy events with deterministic UUID mapping where possible, preserve original timestamps, map `entry -> tracking_entry`, copy broad device fields, and mark `schema_version=0`, `migration_source='analytics_events'`.
5. Snapshot the labels/taxonomy known at migration time. Record `historical_precision='legacy_limited'` because original observed/attributed separation and true asset versions cannot be reconstructed.
6. Switch writers to the atomic RPC and readers to dashboard v2; remove execute access to the legacy page-view-denominator dashboard RPC.
7. Validate counts, distinct sessions, event timestamps, and per-type reconciliation. Keep legacy tables read-only during the compatibility window.
8. After an approved observation period, archive legacy readers. Destructive removal is a separate migration and is not part of this phase.

## Mapping caveats

Legacy `pn_visit` identifies only a short session and must not become a visitor. Legacy `source='qr'` cannot always reveal poster versus flyer; use available tracking-link metadata, otherwise mark `unknown_offline` rather than inventing precision. Legacy events lack trustworthy consent, environment, traffic class, ordering, and observed/attributed split; migration marks these explicitly.

## Validation

- Legacy event count equals backfilled rows plus documented rejects.
- Each legacy `visit_id` maps to exactly one legacy v2 session.
- No historical v2 row has a fabricated visitor ID.
- `tracking_entry` count reconciles with legacy `entry`.
- Event timestamps and referenced destination/tracking-link IDs remain traceable.
- New writes are idempotent and do not dual-count dashboard totals.

## Rollback

Application rollback may point emergency writers/readers at the preserved legacy tables while v2 objects remain additive, but the obsolete legacy dashboard RPC is deliberately removed because its page-view denominator is no longer an approved business metric. Do not drop v2 data during rollback. A failed backfill is truncated only in an isolated local/staging database or by an explicitly reviewed production repair migration.
