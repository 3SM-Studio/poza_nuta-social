# ADR-002: repairable Supabase invitations

Date: 2026-09-22. Status: accepted for Admin Platform V2.

## Decision

Persist and audit application invitation intent before calling Supabase Auth. Use `auth.admin.inviteUserByEmail` only on the trusted server for new emails and server-side invite-token verification for SSR. Treat Auth and application DB as two systems joined by explicit states, delivery status, normalized email, and idempotent reconciliation.

## Consequences

Failures are visible and retryable instead of pretending to roll back Auth. Existing confirmed users accept a pending application invitation after initiating their own normal magic-link login. No role comes from query strings or user metadata, and removing access does not delete the Auth user.
