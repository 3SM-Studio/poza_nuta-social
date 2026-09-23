# External analytics strategy

## Intended stack

Yes: first-party Postgres analytics as source of truth; GA4 as secondary comparison/Google-ecosystem measurement; Google Search Console for search queries, impressions, clicks, indexing, and position.

Not now: Plausible, PostHog, Snowplow infrastructure, BigQuery, GTM, active Meta Pixel/CAPI, active TikTok Pixel/Events API, or Google Ads tags. Snowplow-style separation of identity, contexts, and immutable events is only architectural inspiration.

## Shared eligibility

Every adapter accepts the central `TrackingContext`; it may not reclassify consent, environment, internal/test/bot traffic, or identity independently.

- GA4: `production && external && analyticsConsent`.
- Future marketing adapters: `production && external && marketingConsent`.
- Development, preview, staging, internal, test, and bot are ineligible for normal external sinks.

## GA4 boundary

GA4 is disabled unless a measurement ID is configured and analytics consent exists. Send only stable event names and low-cardinality public properties such as destination category and channel group. Do not send visitor/session UUIDs, tracking-link UUIDs/codes, admin email, contact email, arbitrary UTM text, full referrer URLs, or high-cardinality asset/placement labels. Postgres definitions remain authoritative when totals differ.

Adding GA4 requires a CSP review limited to exact Google origins, consent-mode behavior review, browser tests, and privacy-notice updates. Never broaden CSP to `*` or add unsafe scripts to fix integration.

## Search Console

Recommended for production once the canonical domain is resolved and verified. It measures search discovery, not in-site journeys, attribution, or conversions.

## Future advertising adapters

Adapters must be isolated modules with explicit event allowlists, payload tests, consent revocation behavior, vendor deduplication IDs, and server/client division documented. Activation requires a real advertising use case and separate authorization.
