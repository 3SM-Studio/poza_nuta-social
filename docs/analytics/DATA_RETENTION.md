# Data retention

Status: proposed technical defaults; final periods require product/privacy/legal approval before production automation is enabled.

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
