# Metric definitions

Unless a report explicitly says otherwise, eligible rows are `environment='production' AND traffic_class='external'` within the Warsaw-time date range. A session is eligible when it has at least one eligible event in range.

| Metric | Exact formula |
| --- | --- |
| tracking entries | count of deduplicated `tracking_entry` events |
| sessions | count distinct eligible `session_id` |
| visitors | count distinct non-null consent-eligible `visitor_id`; pseudonymous browser contexts, not people |
| new visitors | visitors whose `first_seen_at` is inside the range |
| returning visitors | visitors with a session in range and `first_seen_at` before the range |
| returning visitor rate | returning visitors / visitors with non-null visitor ID; undefined when denominator is zero |
| outbound sessions | distinct eligible sessions with >=1 `outbound_click` |
| outbound session rate | outbound sessions / eligible sessions |
| total outbound clicks | count of deduplicated `outbound_click` events |
| clicks per outbound session | total outbound clicks / outbound sessions |
| multi-destination sessions | sessions with outbound clicks to >=2 distinct destination IDs/slugs |
| multi-destination session rate | multi-destination sessions / outbound sessions |
| return-to-hub sessions | outbound sessions that also have >=1 qualifying `hub_resumed` |
| return-to-hub rate | return-to-hub sessions / outbound sessions |
| contact-interest sessions | sessions with `contact_view` or `contact_click` |
| contact interest rate | contact-interest sessions / eligible sessions |
| contact click sessions | sessions that have both `contact_view` and `contact_click` |
| contact click rate | contact click sessions / sessions with `contact_view` |
| duplicate event ratio | duplicate ingest attempts / all ingest attempts |
| unknown source ratio | eligible sessions acquired from an unclassified referral host / eligible sessions |
| bot ratio | bot-classified sessions / all classified sessions |

Source, campaign, asset, placement, and tracking-link acquisition rankings read `analytics_sessions_v2.session_acquisition`. They are exclusive: one eligible session contributes exactly once per dimension. Stable IDs are grouping identity; acquisition event snapshots provide display labels, preventing label/slug splits while preserving history. Event attributed contexts are non-exclusive touchpoints/assists and are not acquisition. Destination ranking is explicitly labeled as deduplicated outbound-click count, a depth measure rather than a conversion rate. Tracking entries never imply poster impressions or exposure.

Every percentage numerator is a subset of its denominator. Missing or spoofed prerequisite events remain inspectable but cannot make return-to-hub or contact-click rates exceed 100%. A zero denominator returns `0` in the dashboard response and is described as undefined in analytical interpretation.
