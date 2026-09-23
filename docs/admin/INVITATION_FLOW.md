# Invitation flow

Status: implementation contract, 2026-09-22. ADR: `adrs/ADR-002-REPAIRABLE-SUPABASE-INVITATIONS.md`.

## Current Supabase behavior used

As verified against current Supabase documentation on 2026-09-22:

- `auth.admin.inviteUserByEmail` is a trusted-server action using the server secret key;
- a new email creates an unconfirmed Auth user and sends the Invite User template;
- an already-confirmed Auth user returns an error instead of receiving another invite;
- `redirectTo` must be allowlisted or Supabase silently uses Site URL;
- invite expiry follows Email OTP Expiration (one hour by default);
- SSR acceptance uses a custom Invite User template carrying `TokenHash` and `type=invite`, then server-side `verifyOtp`.

Production SMTP and hosted template configuration are external release requirements. Local development uses Mailpit and a repository template; UI must not claim production delivery.

## State model

Application invitation state is explicit: `pending`, `accepted`, `revoked`, `expired`, or `failed`. Delivery state is separate: `not_attempted`, `sent`, `existing_user`, or `failed`. The record stores normalized email, requested non-owner role, optional Auth user ID, inviter, expiry, attempt count/timestamps, bounded failure code, and lifecycle timestamps. No invitation token or secret is stored.

## Creation and delivery

1. An authorized action calls an audited database RPC to create one pending invitation. Owners may request viewer/admin; admins may request viewer only. Active members and duplicate pending emails are rejected/idempotently returned.
2. After the database commit, trusted server code checks Auth. It calls `inviteUserByEmail` for a new or still-unconfirmed Auth user; an already-confirmed account follows the existing-user path.
3. Success records `delivery_status=sent` while state stays `pending`.
4. An existing confirmed Auth account keeps the invitation pending with `delivery_status=existing_user`. That person initiates their own normal magic-link login, preserving PKCE in their browser.
5. Other Auth/email failures mark the invitation `failed` with a bounded non-secret code and audit record. Retry uses the same invitation ID, not a second application invitation. Each started delivery writes a begin audit and increments `attempt_count`; failures and successes write their own outcome audit. Pending retries within two minutes of the last start are treated as duplicate submissions and do not send or increment again. A failed delivery is immediately retryable. Revoked, accepted, and lifecycle-expired records cannot be retried.

The application invitation lifecycle defaults to seven days (`expires_at`). The email/Auth invite link follows the separately configured Supabase Email OTP Expiration (one hour in committed local config). The Team page labels only the **application** deadline as “Zaproszenie aktywne do”; it never promises the email link remains usable for seven days. An authorized person can resend the link on the same pending invitation after the duplicate-submission cooldown. Production Auth TTL, SMTP, and redirect allowlist must be checked on the dedicated hosted project before launch.

If an owner changes the role of an existing pending invitation, that privilege change and a dedicated `admin.invitation.role_change` audit row commit atomically, with old/new role and invitation identity. A no-op same-role request creates no change audit.

Auth and application Postgres are not represented as one transaction. A new Auth user can exist after a later application write fails; the pending/failed record plus email reconciliation is the repair mechanism.

## Acceptance and reconciliation

- New user: the invite email reaches `/auth/confirm` with `token_hash` and `type=invite`; the server verifies the OTP, obtains the verified user, then accepts the matching pending invitation by normalized authenticated email.
- Existing user: they request a normal magic link from `/admin/login`; the login form accepts active-member, pending-invite, or eligible bootstrap email. After callback, the server reconciles the pending invitation.
- Acceptance reads the current invitation role at acceptance time, so a pending role change is honored. Query-string/user metadata roles are ignored.
- Acceptance locks the invitation, rejects revoked/expired/failed state, activates or creates membership, marks accepted, and writes audit in one database transaction.
- If Auth succeeds but DB acceptance fails, the authenticated user still lacks membership. A later `/admin` request retries reconciliation by verified email before denying access.
- Duplicate acceptance is safe: an already-active matching member reaches `/admin`; no second membership or success audit is created.

## Revocation and expiry

Revocation changes only application invitation/access state; it does not delete Auth users. Acceptance requires an unexpired pending invitation. A later invitation preparation marks expired pending records as expired before creating a replacement. Revoked/expired links may authenticate an Auth user but cannot create membership.

## Failure matrix

| Case | Result |
| --- | --- |
| New email | pending DB row → Auth invite → sent |
| Confirmed Auth user | pending + existing_user; self-initiated magic link |
| Duplicate pending | same pending record; duplicate delivery start within two minutes is a no-op |
| Active member | reject |
| Auth failure | failed + audited; explicit retry |
| DB failure after Auth | Auth user remains; later email reconciliation repairs |
| Role changed pending | atomic role-change audit; acceptance uses latest stored role |
| Revoked before click | authentication may succeed; membership denied |
| Expired/invalid token | no membership; actionable error |
| Duplicate click | idempotent active-member result |
