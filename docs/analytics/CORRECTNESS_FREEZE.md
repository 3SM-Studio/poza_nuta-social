# Analytics V2.1 correctness freeze

Status: implementation contract, 2026-09-22.

This narrow slice preserves Analytics V2 and corrects the post-PASS semantic gaps. The controlled pre-fix fixtures are represented by `analytics_correctness_freeze_test.sql` and `admin_atomic_mutations_test.sql`.

## Independent findings

| Finding | Result | Evidence and resolution |
| --- | --- | --- |
| A — non-exclusive acquisition rankings | CONFIRMED | One fixture session appeared under both poster and ChatGPT, and one campaign ID split into label/slug buckets. Dashboard acquisition rankings now read one canonical `analytics_sessions_v2.session_acquisition` per eligible session and group stable IDs. Event attribution remains available for non-exclusive touchpoints. |
| B — non-atomic admin mutation/audit | CONFIRMED | A committed campaign survived a forced separate audit failure, and `UPDATE 0` could still be followed by a success audit. Narrow typed `SECURITY INVOKER` RPCs now recheck the current editor role and transact business change plus one audit row. |
| C — ambiguous session first acquisition | CONFIRMED | Direct followed by ChatGPT changed session acquisition to ChatGPT. The contract is now named first eligible non-direct acquisition with direct fallback. Owned server-resolved tracking links outrank weaker client-observed acquisition. Visitor first observed acquisition stays immutable and may remain direct. |
| D — rates above 100% | CONFIRMED | Resume-only and click-only sessions produced 200% fixtures. Numerators now intersect outbound/contact-view denominator sets. |
| E — unsafe `.env.example` defaults | CONFIRMED | Production canonical/contact/social values could become runtime content. The example now uses localhost and blank optional values. |
| F — legacy server key | CONFIRMED | Server initialization required `SUPABASE_SERVICE_ROLE_KEY`. `SUPABASE_SECRET_KEY` is preferred; the legacy variable is a server-only compatibility fallback. |

## Reporting contracts

- Acquisition: exclusive; one eligible session, one bucket per source/campaign/asset/placement/tracking-link dimension.
- Touchpoint/assist: non-exclusive; event attributed contexts may record several touches for one session.
- Destination ranking: outbound click depth, not acquisition.
- Future referral ranking: must reuse exclusive session acquisition so one session cannot credit several owners.

## Low-severity review

| Item | Classification | Decision |
| --- | --- | --- |
| official destination plain HTTP | FIXED | Application and database now require HTTPS for official destinations; existing HTTP rows are upgraded during migration. |
| limited Google TLD classifier | ACCEPTED LIMITATION | Exact/subdomain-safe `.com` and `.pl` classification stays conservative. Other Google hosts remain visible as unknown referral rather than risking lookalike misclassification. |
| Android tablet classification | FIXED | Android user agents without `Mobile` are classified as tablet; Android `Mobile` remains mobile. |
| placement slug uniqueness scope | ACCEPTED LIMITATION | Placements are intentionally reusable global taxonomy entities; campaign-specific meaning belongs to the tracking-link relationship and snapshot. |
| weak `distribution_unit` integration | FUTURE | The field remains available but is not promoted into UI/rankings until a concrete distribution-unit reporting contract exists. |
| explicit admin `noindex` | FIXED | Authenticated admin layout and login metadata explicitly set `noindex,nofollow`; robots remains defense in depth. |

## Operational limits

The daily quality counter can become a write-contention hot row at higher sustained volume. It is accepted at the expected launch scale and must be observed before any queue/sharding redesign. Production firewall/rate limits remain a separately authorized deployment step; `DATA_QUALITY.md` records observe-first thresholds.
