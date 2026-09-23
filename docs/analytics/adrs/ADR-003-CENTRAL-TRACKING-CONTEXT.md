# ADR-003: central TrackingContext

Date: 2026-09-20. Status: accepted.

## Decision

All first- and third-party analytics adapters consume one server-derived context for environment, traffic class, consent, identity, observed acquisition, and attributed acquisition. Browser input cannot assert trusted classification.

## Rationale and consequences

This prevents Postgres, GA4, and future pixels from disagreeing about consent or internal/test/bot exclusion. New sinks must integrate through this contract and its tests.
