# Local test database isolation: Admin owner

## Root-cause evidence (before the fix)

On `michal-szwindowski/analytics-debugview-event-inspector` at
`39be0392e285c4b3f0e33ebec38c7512b137fdbb`, the worktree was clean.
The local Supabase CLI reported `linked_project: null`, API and database on
`127.0.0.1`, and the reset was run with `--local`.

The product contract in `PRODUCT.md` and `docs/PRODUCT_DECISIONS.md` requires
**at least one** active owner. The deferred `admin_profiles_active_owner_guard`
enforces existence, not uniqueness. `admin_bootstrap_owner_v1` admits only the
first owner; `admin_transfer_ownership_v1` atomically promotes a target and
demotes the actor. `supabase/seed.sql` does not create an owner.

`scripts/run-local-e2e.mjs` owns a reusable local Auth user and active owner
profile, `admin@pozanuta.test`. It creates them before Playwright and leaves
them for later E2E runs. `tests/e2e/debug-view-local.spec.ts` cleans up its
analytics rows, not this runner-owned account. On a fresh local reset,
`supabase test db --local` passed all 277 tests. Running the DebugView E2E
passed and left exactly one active owner. Without resetting, the full pgTAP
then failed exactly six tests (65–69, 71) in `admin_platform_v2_test.sql`.

That pgTAP file inserts its own owner inside `BEGIN ... ROLLBACK` and assumes
it is the only owner in the whole database. Its global count sees two. Its
direct demotion, deactivation and removal of the fixture owner cannot trigger
the last-owner guard while the E2E owner exists. The failed `throws_ok` calls
leave the fixture actor demoted in the test transaction, so subsequent RPCs
raise `admin_role_required` instead of their expected errors. The six failures
are a test-fixture isolation problem, not evidence of a runtime or schema bug.

## Isolation decision

The Admin pgTAP test normalizes other active owners to `admin` **inside its
existing rollback-only transaction**, after inserting its own fixture owner.
The test then exercises the real last-owner guard against its owned fixture.
Rollback restores every pre-existing profile. This lets the suite test a
valid local database after E2E, while preserving the production invariant and
the reusable runner-owned owner. No migration or production code is needed.

## Verification after the fix

All database commands targeted the local stack explicitly. The full pgTAP
suite contains 12 files and 277 assertions.

1. Fresh `supabase db reset --local` -> full pgTAP: pass.
2. DebugView E2E (one desktop Chromium test) -> full pgTAP without reset: pass.
3. DebugView E2E again -> full pgTAP without reset: pass.
4. Admin/Auth E2E (ten desktop Chromium tests, including ownership transfer)
   -> full pgTAP without reset: pass.
5. Admin/Auth E2E again -> full pgTAP without reset: pass.
6. Data Quality E2E (one desktop Chromium test) -> full pgTAP without reset:
   pass.
7. `npm run verify` passed, including guards, Impeccable detector, lint,
   typecheck, 152 Vitest tests, five Node tests and the production Next.js
   build. `git diff --check` passed.

After these runs, the runner-owned `admin@pozanuta.test` was still the sole
active owner. The pgTAP transaction did not persist its fixture changes.
