# ADR-005: external analytics remain secondary

Date: 2026-09-20. Status: accepted.

## Decision

Postgres remains authoritative. GA4 is an optional secondary sink gated by production/external/analytics-consent context. Search Console is the production SEO source. Marketing pixels, GTM, BigQuery, Plausible, PostHog, and Snowplow infrastructure are not activated.

## Rationale and consequences

The product keeps first-party definitions and historical control while allowing Google-ecosystem comparison later. Vendor payloads exclude internal IDs and high-cardinality labels. Every activation requires separate CSP, privacy, configuration, and browser verification.
