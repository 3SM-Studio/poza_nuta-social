# ADR-003: referral participants are separate from access membership

Date: 2026-09-22. Status: accepted for Admin Platform V2.

## Decision

Create a soft-lifecycle `referral_participants` dimension with an optional Auth/admin link. Link referral tracking links to that dimension while retaining the existing `/r/[code]` redirect and canonical Analytics V2.1 acquisition model.

## Consequences

People can participate in distribution without admin access, and access changes do not rewrite attribution. Stable participant IDs plus immutable event label snapshots preserve history across rename, deactivation, and unlinking.
