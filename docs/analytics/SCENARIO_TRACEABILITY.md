# Critical analytics scenario traceability

Status: Analytics V2.1 release contract, 2026-09-22.

This is the auditable mapping for the high-value subset of `SCENARIO_MATRIX.md`. A scenario can share a mechanism test; the mapping names the concrete assertion or runnable gate rather than manufacturing one duplicate test per matrix row.

| Scenario ID | Automated test or gate | Concrete assertion / test name |
| ---: | --- | --- |
| 1 | `supabase/tests/analytics_attribution_test.sql`; `tests/e2e/admin-local.spec.ts` | `poster is immutable session acquisition`; `local owner can authenticate and complete the campaign-to-QR flow` |
| 13 | `tests/e2e/admin-local.spec.ts` | `local analytics preserves immediate acquisition and consent-gated returning visitor identity` |
| 14 | `tests/e2e/public.spec.ts`; `supabase/tests/analytics_attribution_test.sql` | `hub resume requires an armed outbound and a meaningful hidden interval`; ordered poster return journey |
| 16 | `tests/e2e/admin-local.spec.ts` | `local contact journey emits one view and one click with preserved attribution` |
| 22 | `supabase/tests/analytics_attribution_test.sql` | `poster remains visitor first acquisition`; later direct session remains direct |
| 23 | `tests/e2e/admin-local.spec.ts`; `supabase/tests/analytics_attribution_test.sql` | fresh session reuses consented visitor; later session acquisition is independent |
| 31 | `tests/e2e/public.spec.ts`; `supabase/tests/analytics_attribution_test.sql` | `consent choice is explicit and does not create a visitor when denied`; only consented visitors linked |
| 33 | `tests/e2e/public.spec.ts` | `consent lifecycle grants, reuses, withdraws, separates marketing, and rejects tampering` |
| 38 | `tests/e2e/admin-local.spec.ts` | signed test-mode page view is stored with `traffic_class=test` |
| 50 | `docs/RELEASE_CHECKLIST.md` | isolated local database-offline `/r` and `/go` fail-open timing gate |
| 52 | `supabase/tests/analytics_v1_test.sql`; `scripts/analytics-concurrency.mjs` | duplicate event is acknowledged idempotently; `same-id` concurrency case |
| 55 | `tests/e2e/admin-local.spec.ts` | `local disabled database destination is not resurrected from environment fallback` |
| 57 | `tests/e2e/admin-local.spec.ts` | archived campaign tracking route falls back to `/` |
| 65 | `supabase/tests/analytics_history_test.sql` | campaign snapshot survives rename/archive/repoint |
| 66 | `supabase/tests/analytics_history_test.sql` | asset snapshot survives rename |
| 67 | `supabase/tests/analytics_history_test.sql` | placement snapshot survives rename |
| 68 | `supabase/tests/analytics_history_test.sql` | tracking-link snapshot survives repoint |
| 69 | `supabase/tests/analytics_history_test.sql` | destination snapshot survives label and URL edit |
| 70 | `supabase/tests/analytics_correctness_freeze_test.sql` | mutually exclusive source buckets; canonical campaign/asset/placement/link acquisition |
| 71 | `supabase/tests/analytics_correctness_freeze_test.sql` | later ChatGPT touch is excluded from acquisition ranking while its event attribution remains |
| 72 | `supabase/tests/admin_atomic_mutations_test.sql` | forced audit failure rolls back business mutation; failed mutation adds no fake audit |
| 73 | `supabase/tests/admin_atomic_mutations_test.sql`; `tests/e2e/admin-local.spec.ts` | viewer denied by database boundary; stale owner-rendered form is rejected server-side |
| 74 | `supabase/tests/analytics_correctness_freeze_test.sql` | resume-only and click-only spoof fixtures cannot escape their denominator sets |

`npm run test:scenario-matrix` verifies that every ID above exists in the matrix, is mapped exactly once, and references repository files that exist.
