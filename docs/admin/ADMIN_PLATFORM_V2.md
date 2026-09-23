# Admin Platform V2

Status: implementation contract, 2026-09-22.

## Scope

Admin Platform V2 replaces the improvised admin shell with the installed shadcn Sidebar architecture, moves steady-state access from `ADMIN_EMAILS` to active database membership, adds audited Team & Access management and repairable Supabase invitations, and adds referral participants and an exclusive-acquisition leaderboard without changing the public hub or Analytics V2.1 semantics.

## Protected foundation

`docs/analytics/CORRECTNESS_FREEZE.md`, `ATTRIBUTION_MODEL.md`, and `METRICS_DEFINITIONS.md` remain authoritative. Referral reporting reuses canonical `analytics_sessions_v2.session_acquisition`; event attribution remains non-exclusive journey evidence. Existing audited business-mutation RPCs remain atomic and must recheck current active membership.

## Implementation order

1. Extend `admin_profiles`; add invitations and owner invariants.
2. Replace normal `ADMIN_EMAILS` checks with verified Auth user + active membership.
3. Add repairable invitation creation, delivery recording, acceptance, revocation, and ownership transfer.
4. Add Team & Access UI.
5. Replace the custom admin `<aside>` with shadcn Sidebar.
6. Add separate referral participants, tracking-link linkage, snapshots, metrics, and UI.
7. Run database, concurrency, browser, security, and Impeccable gates.

## Non-goals

No production deployment, public accounts, consumer profiles, affiliate payments, CRM, public leaderboard, social login, production SMTP activation, DNS changes, analytics redesign, fingerprinting, or raw-IP identity.

## Completion rule

The slice is ready only when owner safety, fresh server/database authorization, invitation-role integrity, audited mutations, exclusive referral acquisition, production/external leaderboard eligibility, shadcn Sidebar behavior, and canonical verification all pass.
