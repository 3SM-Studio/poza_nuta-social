# ADR-001: consent-gated pseudonymous visitor identity

Date: 2026-09-20. Status: accepted for implementation; production retention/legal wording pending review.

Superseded for pre-consent behavior by the 2026-09-24 EU privacy slice and later cookieless foundation: the short analytics session and visitor identity require consent, while limited identity-free event ingestion may occur before it. See `../PRIVACY_AND_CONSENT.md`. The consent-gated visitor identity decision still applies after grant.

## Decision

Keep the 30-minute session for all eligible first-party journeys. Add an optional long-lived random visitor only after analytics consent. Never backfill visitors from legacy sessions.

## Rationale and consequences

This enables returning-browser analysis without fingerprinting. The earlier session-only measurement without analytics consent was superseded by the EU privacy slice noted above. It does not identify people, and deletion/incognito/multi-device/shared-browser limitations are explicit. Withdrawal expires the token and stops future linkage.
