# ADR-004: atomic idempotent Postgres ingest

Date: 2026-09-20. Status: accepted.

## Decision

Replace application-side read/upsert/insert with one SECURITY INVOKER Postgres RPC transaction. The RPC validates, deduplicates by event UUID, locks/creates identity rows, allocates session sequence, snapshots context, and inserts the event.

## Rationale and consequences

Session attribution can no longer update without its corresponding event, concurrent events cannot allocate the same sequence, and retries do not double-count. The service role retains only the grants required to call/read approved objects; browser roles get none.
