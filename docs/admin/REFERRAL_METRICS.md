# Referral metrics

Status: implementation contract, 2026-09-22.

## Eligibility

All normal leaderboard metrics use the existing default business eligibility: an event in the requested Warsaw-time range with `environment='production'` and `traffic_class='external'`. Internal, test, bot, preview, staging, and development traffic is excluded. The SQL derives one eligible-session set and reuses it for all session metrics.

## Formulas

For participant `P`:

- **New anonymous visitors acquired** = distinct non-null consented `visitor_id` whose immutable `analytics_visitors.first_acquisition.referralParticipantId = P`, whose `first_seen_at` is in range, and whose qualifying acquisition session has eligible production/external evidence. These are pseudonymous browser contexts, not people.
- **Acquired sessions** = distinct eligible sessions whose canonical `session_acquisition.referralParticipantId = P`.
- **Outbound sessions** = acquired sessions for `P` containing at least one eligible `outbound_click` in range.
- **Outbound session rate** = outbound sessions / acquired sessions; return `0` when the denominator is zero and describe it analytically as undefined.

Secondary values may include total outbound clicks, multi-destination acquired sessions, and contact-interest acquired sessions. Raw tracking-entry count is never the ranking metric.

## Ordering

Rank by new anonymous visitors descending, then acquired sessions, then outbound sessions, then stable participant ID. This keeps volume and quality visible without a fabricated composite score. Ties may share data values while display position remains deterministic.

## Fixture contract

If Michał first-acquires consented visitor A, `analytics_visitors.first_acquisition.referralParticipantId` remains Michał. If a later session for visitor A is canonically acquired by Dima, that session credits Dima. Neither session credits more than one participant.

## Anti-gaming boundary

Idempotent event IDs, one row per session sequence, production/external eligibility, canonical acquisition, and session-level distinct counts reduce retries, reload inflation, internal/test traffic, known bots, and multi-touch double credit. They cannot prove a browser is one human, prevent multiple devices/incognito, or prove who forwarded a link. No fingerprint, raw IP, precise location, or invasive anti-fraud identity is added.
