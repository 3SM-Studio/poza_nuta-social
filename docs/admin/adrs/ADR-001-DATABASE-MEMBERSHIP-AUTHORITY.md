# ADR-001: database membership is admin authority

Date: 2026-09-22. Status: accepted for Admin Platform V2.

## Decision

Authorize admin access from a verified Supabase Auth user plus a fresh active `admin_profiles` membership and database role. Retire `ADMIN_EMAILS` from normal operation. Keep only an optional first-owner `BOOTSTRAP_OWNER_EMAIL` that stops granting access after an active owner exists.

## Consequences

Role changes and deactivation take effect on the next server check and stale forms fail at the RPC boundary. Valid Auth users without membership remain outside `/admin`. Existing membership rows are extended and preserved rather than copied into a parallel system.
