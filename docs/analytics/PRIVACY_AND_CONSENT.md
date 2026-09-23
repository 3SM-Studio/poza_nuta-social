# Privacy and consent

This is a technical policy, not a legal conclusion. Final wording, legal basis, controller details, retention, processors, and withdrawal/deletion handling require human privacy/legal review before production.

## Consent categories

- Necessary: site delivery, security, redirect integrity, and a short-lived signed session needed to keep one journey coherent. Always on.
- Analytics: permits a long-lived pseudonymous visitor token, returning-browser analysis, GA4 eligibility, and first-party visitor linkage.
- Marketing: permits future advertising-pixel/server-event eligibility. No marketing sink is active.

Analytics and marketing default to denied until an explicit saved choice. Marketing never implies analytics; each flag is evaluated independently by the central context.

## Without analytics consent

- No `pn_visitor` token and no cross-session linkage.
- First-party Postgres may store minimized session/event facts with the 30-minute necessary session ID, broad device categories, consent state, and coarse attribution.
- No GA4 event is sent.
- No marketing event is sent.
- No raw IP, fingerprint, precise location, exact device model, or full referrer URL is stored.

This cookieless/session-only first-party measurement still requires final legal review; if review rejects it, the sink can be disabled centrally without changing route behavior.

## With analytics consent

- A random signed `pn_visitor` is created or reused.
- Sessions may link to that visitor and returning-browser metrics become available.
- Eligible production/external events may be mirrored to GA4 with low-cardinality, non-internal properties.

## With marketing consent

Future Meta, TikTok, or Google Ads adapters may run only for production external traffic. They remain disabled until a concrete campaign, reviewed event mapping, CSP change, vendor configuration, and explicit authorization exist.

## Withdrawal

Withdrawal immediately expires the visitor token, stops future visitor linkage, and disables GA4/marketing eligibility. It does not fabricate deletion of already aggregated or lawfully retained records. A reviewed erasure/anonymization workflow is a production prerequisite if required.

## Consent storage

The consent token is server-issued, versioned, SameSite=Lax, Secure on HTTPS, and integrity-protected. UI copy must describe actual behavior and may not claim anonymity in an absolute sense.
