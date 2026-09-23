# Team & Access model

Status: implementation contract, 2026-09-22. ADR: `adrs/ADR-001-DATABASE-MEMBERSHIP-AUTHORITY.md`.

## Source of truth

Steady-state admin access requires all three:

1. a verified Supabase Auth user;
2. an `admin_profiles` row for that Auth user;
3. membership `status = 'active'` with role `owner`, `admin`, or `viewer`.

`user_metadata` is never an authorization source. Every mutation re-reads membership server-side and the database RPC repeats the active-role check. Missing or inactive membership denies `/admin`, even for a valid Supabase session.

## Membership record

`admin_profiles` remains the existing membership table and is extended rather than renamed. It stores Auth `user_id`, normalized email snapshot for administration, role, explicit active/inactive status, inviter/creator when known, deactivation time, and timestamps. Existing rows are preserved and activated; emails are backfilled only from their referenced `auth.users` rows.

## Permissions

| Capability | owner | admin | viewer |
| --- | ---: | ---: | ---: |
| Read admin data/configuration | yes | yes | yes |
| Campaign/destination/tracking/referral operations | yes | yes | no |
| Analytics test/device controls | yes | yes | no |
| Invite viewer | yes | yes | no |
| Invite admin | yes | no | no |
| Change viewer/admin roles or active state | yes | no | no |
| Create/promote owner by ordinary role change | no | no | no |
| Transfer ownership | yes | no | no |

Admins may invite viewers only. Owner is never an invitation role. Ownership changes only through the atomic transfer operation.

## Owner invariant

After bootstrap, every transaction touching membership must leave at least one active owner. A deferred database constraint trigger checks the invariant and serializes owner-sensitive transactions with a transaction advisory lock. Normal role/deactivation RPCs reject owner targets. Ownership transfer locks the shared owner invariant, locks both member rows in stable ID order, promotes the active target and demotes the actor in one transaction, and writes one audit record containing both before/after states.

## Bootstrap and recovery

`BOOTSTRAP_OWNER_EMAIL` is optional and is not a permanent super-admin bypass. It can create the first owner only when:

- the requester is a verified, pre-existing Supabase Auth user;
- their normalized email exactly matches the variable;
- the database has no active owner;
- the server calls the dedicated bootstrap RPC, which repeats the zero-owner check and audits creation.

Once an active owner exists, the variable grants nothing. Recovery after bootstrap is an operational database/Auth procedure, not a hidden environment allowlist.

## Staff versus access

Admin membership means permission to use this application. It does not assert employment, staff membership, referral participation, or public identity. Referral participants are separate records.
