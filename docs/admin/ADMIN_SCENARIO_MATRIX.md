# Admin Platform V2 scenario matrix

Status: release-critical contract, 2026-09-22. `N` unit, `I` database integration, `C` concurrency, `B` browser, `F` failure/security, `M` documented/manual.

| ID | Scenario | Expected contract | Coverage |
| --- | --- | --- | --- |
| S1 | Desktop expanded/collapsed | persistent shadcn Sidebar, icon tooltip, active route | B |
| S2 | Mobile 360/390 open/close | shadcn off-canvas, reachable content, no overflow | B |
| S3 | Keyboard/deep link/200% zoom | focus visible, trigger/menu usable, correct active route | B |
| M1 | Active owner/admin/viewer | all read; owner/admin operational writes; viewer denied | I,B,F |
| M2 | Inactive member | valid Auth session, `/admin` denied, RPC denied | I,B,F |
| M3 | Authenticated non-member | `/admin` denied; no DB access | I,B,F |
| M4 | Stale role form | current DB role recheck rejects write | I,B,F |
| M5 | Admin self-elevation/owner invite | rejected at action and RPC | I,F |
| I1 | New email invite | pending → sent → verified → accepted membership | I,B |
| I2 | Existing confirmed Auth user | pending existing_user → self magic link → accepted | I,B |
| I3 | Duplicate pending | one pending record, no duplicate privilege | I,C |
| I4 | Revoked/expired/unknown invitation/duplicate acceptance | no unintended membership; duplicate safe | I,B,F |
| I5 | Auth failure | failed state/audit; retryable | N,I,F |
| I6 | DB failure after Auth | no access until reconciliation; retry repairs | N,F |
| I7 | Pending role changed | acceptance uses stored current role | I |
| O1 | Last owner demote/deactivate/delete | deferred invariant rejects transaction | I,C,F |
| O2 | Ownership transfer | target owner + former owner admin + one audit atomically | I,C |
| O3 | Competing owner/role operations | at least one active owner after commits | C |
| R1 | Create/rename/deactivate participant | audited soft lifecycle; old snapshots unchanged | I,B |
| R2 | Optional account link/unlink | authorization unaffected; history unchanged | I |
| R3 | Create/copy referral link | opaque `/r` code, fixed referral taxonomy | I,B |
| R4 | First visitor then later different participant | immutable visitor-first A; later session B | I,B |
| R5 | Competing links same session | frozen owned-link precedence; one participant | I,C |
| R6 | Later session different participant | independent canonical session acquisition | I |
| R7 | Retry/reload | one event ID and one acquired session | I,C |
| R8 | Internal/test/bot/non-production | excluded from leaderboard | I,B,F |
| R9 | Touchpoint versus acquisition | later event touch visible but not leaderboard credit | I |
| R10 | Historical rename/link changes | stable ID and event label snapshot preserved | I |
| SEC1 | Secret exposure / role tampering / IDOR | secret server-only; target IDs and roles revalidated | N,I,F |
| SEC2 | RLS/grants | browser roles no table/RPC access; secret role least privilege | I,F |

Critical rows must be mapped to named tests before PASS. Invalid or expired Auth token handling is guarded by Supabase Auth and the application callback but has no isolated browser fixture here. Production SMTP, hosted template configuration, production redirect allowlists, and remote project identity remain external release checks rather than simulated PASS claims.

## Concrete traceability

| ID | Test file / gate | Exact test or assertion marker |
| --- | --- | --- |
| S1 | `tests/e2e/admin-local.spec.ts` | `admin sidebar collapses, persists, identifies active routes, and behaves as a mobile sheet` |
| S2 | `tests/e2e/admin-local.spec.ts` | `admin-mobile-sheet.png` |
| S3 | `tests/e2e/admin-local.spec.ts` | `zoom-200-equivalent` |
| M1 | `tests/e2e/admin-local.spec.ts` | `database membership authorizes viewer and admin while rejecting inactive, non-member, and stale roles` |
| M2 | `supabase/tests/admin_platform_v2_test.sql` | `inactive member cannot create invitations` |
| M3 | `supabase/tests/admin_platform_v2_test.sql` | `nonmember cannot create invitations` |
| M4 | `tests/e2e/admin-local.spec.ts` | `database membership authorizes viewer and admin while rejecting inactive, non-member, and stale roles` |
| M5 | `supabase/tests/admin_platform_v2_test.sql` | `admin cannot invite another admin` |
| I1 | `tests/e2e/admin-local.spec.ts` | `Team and Access reconciles existing and new Auth users, role changes, deactivation, and revoke-before-accept` |
| I2 | `tests/e2e/admin-local.spec.ts` | `Team and Access reconciles existing and new Auth users, role changes, deactivation, and revoke-before-accept` |
| I3 | `scripts/admin-platform-concurrency.mjs` | `duplicate-invitation` |
| I4 | `supabase/tests/admin_platform_v2_test.sql` | `expired invitation cannot create membership` |
| I5 | `src/lib/admin-invitation-workflow.test.ts` | `records an explicit failed delivery when Auth fails` |
| I6 | `src/lib/admin-invitation-workflow.test.ts` | `surfaces reconciliation when Auth succeeds but DB recording fails` |
| I7 | `supabase/tests/admin_platform_v2_test.sql` | `acceptance uses the current stored invitation role` |
| O1 | `supabase/tests/admin_platform_v2_test.sql` | `database guard rejects direct last-owner demotion` |
| O2 | `tests/e2e/admin-local.spec.ts` | `ownership transfer is atomic in the UI and the new owner can transfer it back` |
| O3 | `scripts/admin-platform-concurrency.mjs` | `last-owner-demotion-versus-transfer` |
| R1 | `supabase/tests/referral_v2_test.sql` | `participant can be renamed and deactivated` |
| R2 | `supabase/tests/referral_v2_test.sql` | `referral association does not change admin membership` |
| R3 | `tests/e2e/admin-local.spec.ts` | `referral attribution keeps browser-first Michał, session-two Dima, and ignores later-session Victor` |
| R4 | `supabase/tests/referral_v2_test.sql` | `visitor first acquisition remains immutable across later sessions` |
| R5 | `scripts/admin-platform-concurrency.mjs` | `simultaneous-referral-entry` |
| R6 | `supabase/tests/referral_v2_test.sql` | `a later new session may be acquired by a different participant` |
| R7 | `scripts/admin-platform-concurrency.mjs` | `established-referral-versus-later-touches` |
| R8 | `supabase/tests/referral_v2_test.sql` | `leaderboard excludes internal, bot, test and preview sessions while retaining anonymous acquisition` |
| R9 | `supabase/tests/referral_v2_test.sql` | `later referral touch does not rewrite the established session participant` |
| R10 | `supabase/tests/referral_v2_test.sql` | `historical leaderboard label comes from the acquisition snapshot after rename` |
| SEC1 | `supabase/tests/admin_platform_v2_test.sql` | `admin cannot invite another admin` |
| SEC2 | `supabase/tests/admin_platform_v2_test.sql` | `authenticated users cannot invoke invitation mutations directly` |
