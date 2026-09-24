# Privacy and consent implementation

Status: local technical checkpoint. Controller identity, contact, recipients, transfers and server-side retention periods require confirmed publication values and privacy/legal review before production. The production environment guard rejects missing values. No production schema or data was changed in this slice.

## Public behavior

- Before a version 2 affirmative choice, no public analytics session, acquisition or visitor cookie is issued, no first-party analytics event is stored, and no hub lifecycle state is written to `sessionStorage`. `/go/[slug]` and `/r/[code]` still redirect.
- `pn_consent` is a signed, HttpOnly, SameSite=Lax preference cookie with a 180-day browser lifetime. It is the only product cookie created by a denial. Older consent versions are invalid and trigger a new choice.
- Consent to first-party analytics permits `pn_session` (30 minutes), `pn_acquisition` (30 minutes when eligible), and `pn_visitor` (180 days). No external GA4 or marketing sink is active.
- Denial or withdrawal expires all three analytics cookies. Future analytics calls return no event. An old anonymous browser identifier is not reused after withdrawal and a later new grant.
- Admin authentication and UI-preference cookies remain necessary for panel users and are separate from public analytics.

## Evidence

An affirmative grant is accepted only after an append-only record is inserted into `analytics_consent_evidence`: random record ID, visitor ID, affirmative choice, consent version and timestamp. Withdrawal attempts a corresponding record but must revoke browser consent even if evidence storage is temporarily unavailable. No IP, user-agent or referrer is stored in evidence. Denials do not create a visitor identifier or evidence row. The table has a 180-day expiry marker, but **no automatic purge job is installed yet**; production retention must be approved and enforced before release. A current signed cookie alone cannot prove historical consent after cookie deletion, so server evidence is necessary.

## Data minimization and limitations

Analytic events after consent still use broad device/browser/OS families, controlled attribution fields and the existing analytics V2.1 model. Infrastructure may independently log requests; its providers and retention require deployment-specific disclosure. Previously collected analytics data is not automatically erased by withdrawal; subject requests and data lifecycle need an approved process. The technical implementation is not a legal sign-off.
