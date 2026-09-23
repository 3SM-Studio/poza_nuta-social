# ADR-001: consent-gated pseudonymous visitor identity

Date: 2026-09-20. Status: accepted for implementation; production retention/legal wording pending review.

## Decision

Keep the 30-minute session for all eligible first-party journeys. Add an optional long-lived random visitor only after analytics consent. Never backfill visitors from legacy sessions.

## Rationale and consequences

This enables returning-browser analysis without fingerprinting and preserves useful session-only measurement when analytics consent is absent. It supersedes product decision 34 and the matching AGENTS/architecture wording only to the extent described here. It does not identify people, and deletion/incognito/multi-device/shared-browser limitations are explicit. Withdrawal expires the token and stops future linkage.
