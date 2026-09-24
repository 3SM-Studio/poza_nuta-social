# Data retention

Status: proposed technical defaults; final periods require product/privacy/legal approval before production automation is enabled.

The EU privacy slice disables new event ingestion without analytics consent. It adds `analytics_consent_evidence` with an `expires_at` marker at 180 days; deletion is **not automatic**. A production purge process and confirmed periods remain release prerequisites. The client-side `pn_consent` preference lasts 180 days; consented analytics cookies last 30 minutes (`pn_session`, `pn_acquisition`) or 180 days (`pn_visitor`). These cookie lifetimes do not delete server data.

| Category | Proposed default | End-of-life action |
| --- | --- | --- |
| visitor identity | 180 days since last consented activity | unlink/anonymize visitor ID from retained events, then delete visitor row |
| sessions | 13 months | delete or roll into non-identifying aggregates |
| raw events | 13 months | delete after aggregate validation |
| daily aggregates/quality counters | 25 months | delete on rolling basis |
| audit log | 25 months minimum proposal | reviewed archival/deletion only; never normal app mutation |
| signed exclusion preference | 1 year, refreshable | expire client token |
| consent record/token | 180 days or until withdrawal/version change | expire and request a new choice when required |

Retention jobs must be idempotent, logged, tested on a copy, and introduced only after the final periods are approved. Deleting raw data must not break immutable audit obligations. No category defaults to forever.
