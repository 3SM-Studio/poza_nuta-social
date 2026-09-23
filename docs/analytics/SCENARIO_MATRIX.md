# Analytics scenario matrix

Release-critical contract. Abbreviations: `V` consented visitor, `S` session, `obs` observed, `attr` attributed, `P/E` production/external. Default event expectations include deduplication, schema v1, and snapshot fields. `N` = narrow unit test, `I` = database integration, `B` = browser, `F` = failure/security.

Coverage status at 2026-09-22: all 74 scenarios have an expected contract. The `Coverage` column names the required verification layer, not an assertion that every row has a dedicated test. `SCENARIO_TRACEABILITY.md` maps the release-critical subset to concrete assertions and gates. Shared-path unit/database/browser tests cover the implemented taxonomy, lifecycle, identity, classification, idempotency, safe-failure, snapshot, exclusive-acquisition, audited-mutation, and denominator mechanisms; the release report must list any row that remains a documented/manual limitation. Human/device equivalence scenarios 27–30 and vendor/platform behaviors are limitations or release checks, not claims that automation can prove real-person identity.

| # | Scenario/input | Identity/session | Acquisition and expected events | Class/consent/dashboard | Coverage |
| ---: | --- | --- | --- | --- | --- |
| 1 | poster `/r` | optional V, new/reused S | obs+attr offline/poster/qr; `tracking_entry`,`page_view` | P/E; visitor only if consent; entry/session | N,I,B |
| 2 | flyer `/r` | same | offline/flyer/qr | same | N,I |
| 3 | table stand `/r` | same | offline/table_stand/qr | same | N,I |
| 4 | copied tracking URL | same | link taxonomy retained; do not claim scan | same | N,I |
| 5 | direct | S | direct/none; `page_view` | P/E; session | N,B |
| 6 | ChatGPT referrer | S | ai_referral/chatgpt/referral | P/E | N,B |
| 7 | Google referrer | S | organic_search/google/organic | P/E | N |
| 8 | Instagram referrer | S | organic_social/instagram/social | P/E | N |
| 9 | Facebook referrer | S | organic_social/facebook/social | P/E | N |
| 10 | TikTok referrer | S | organic_social/tiktok/social | P/E | N |
| 11 | valid UTM | S | sanitized controlled tuple wins referrer | P/E | N,B |
| 12 | unknown referrer | S | referral/normalized-host/referral | P/E; unknown ratio | N |
| 13 | immediate outbound | same early S | page and `/go` share acquisition; `outbound_click` | outbound session | I,B |
| 14 | Instagram→return→TikTok | same S | outbound, hidden, `hub_resumed`, second outbound | multi-destination+return | N,B |
| 15 | multiple outbound no hide | same S | multiple outbound; no resume | multi-destination only | N,B |
| 16 | contact page/action | same S | `page_view`,`contact_view`,`contact_click` | contact interest, not lead | B |
| 17 | reload | same S | new page view, no new acquisition | page views only | N,B |
| 18 | back/forward | same S | page view by navigation; resume only if armed+hidden | conservative | B |
| 19 | BFCache return | same S | one `hub_resumed` if state armed | return | B |
| 20 | background/resume only | same S | no resume without outbound state | none | N,B |
| 21 | multiple tabs | same S | monotonic DB sequence, no attention-order claim | normal | I |
| 22 | return 10 min | V/S reused | acquisition unchanged | one session | N,I |
| 23 | return 45 min | V, new S | new session acquisition | returning V | N,I |
| 24 | next day | V, new S | new session | returning V | I |
| 25 | next month in TTL | V, new S | new session | returning V | I |
| 26 | cookie deletion | new/no V, new S | fresh identity | not returning | N |
| 27 | incognito | separate V/S | fresh identity | separate context | documented |
| 28 | second device | separate V/S | fresh identity | separate context | documented |
| 29 | shared browser | shared V possible | normal sessions | limitation | documented |
| 30 | in-app browser | separate context likely | normal | limitation | documented |
| 31 | analytics denied | no V, S only | first-party minimized events | no return metric/GA4 | N,I,B |
| 32 | analytics granted | V linked | normal | visitor metrics/GA4 eligible | N,I,B |
| 33 | consent withdrawn | token expired, S unlinked | future events no V | sinks disabled | N,B |
| 34 | marketing denied | normal first-party | normal | no marketing sink | N |
| 35 | marketing granted | normal | normal | eligible boundary; sink inactive | N |
| 36 | owner/admin/viewer | signed S | events class internal | excluded default | I,B |
| 37 | excluded team device | signed exclusion | class internal | excluded default | N,I |
| 38 | analytics test mode | signed test token | class test | inspectable, excluded | N,I,B |
| 39 | Playwright | test marker/config | class test | excluded | B |
| 40 | localhost | S | environment development | excluded production | N,B |
| 41 | preview | S | environment preview | excluded production | N |
| 42 | staging | S | environment staging | excluded production | N |
| 43 | Googlebot | S/no V | class bot | excluded default | N,I |
| 44 | Bingbot | same | bot | excluded | N |
| 45 | AI crawler | same | bot | excluded | N |
| 46 | social/Slack/Telegram preview | same | bot | excluded | N |
| 47 | malicious known bot | same | bot | excluded | N |
| 48 | unknown automation | normal S | external unless evidence | visible in quality | documented |
| 49 | slow Supabase | S cookie intact | redirect deadline wins | failure counter | F |
| 50 | unavailable Supabase | S cookie intact | redirect succeeds, event may be lost | failure observable | F,B |
| 51 | event timeout | same | no partial DB transaction | no partial metric | I,F |
| 52 | duplicate request | same | one event, same sequence returned | duplicate ratio | I |
| 53 | reordered events | same | transaction sequence is ingest order | documented | I |
| 54 | missing destination | same | safe redirect `/`, no outbound | failure count | F |
| 55 | inactive destination | same | no env resurrection | failure count | F |
| 56 | missing/inactive link | same | safe `/`, no tracking entry | failure count | F |
| 57 | archived campaign link | same | policy reject or archived snapshot, never active claim | excluded/flagged | I |
| 58 | forged/oversized UTM | same | sanitize/reject; no PII blob | normal/quality | N,F |
| 59 | forged visitor/session cookie | fresh S | signature rejected | external, quality | N,F |
| 60 | forged internal marker | external | signature rejected | stays external | N,F |
| 61 | malicious destination URL | same | rejected, safe `/` | no click | N,F |
| 62 | malicious landing path | same | only `/` or `/kontakt` | no entry redirect abuse | N,F |
| 63 | referrer lookalike | S | unknown referral, not known source | unknown ratio | N |
| 64 | spam | S | bounded validated events | inspectable/abuse controls | F |
| 65 | campaign rename/archive | same | old event snapshot unchanged | stable report | I |
| 66 | asset rename | same | old snapshot unchanged | stable report | I |
| 67 | placement change | same | old snapshot unchanged | stable report | I |
| 68 | link repoint | same | old relationship snapshot unchanged | stable report | I |
| 69 | destination label/URL edit | same | old snapshot unchanged | stable report | I |
| 70 | acquisition ranking with later touch | same S | one canonical session acquisition; later attributed event retained | one source/campaign/asset/placement/link bucket | I |
| 71 | touchpoint/assist reporting | same S | later attributed context remains on event | explicitly non-exclusive, never acquisition | I |
| 72 | audited mutation failure | admin actor | business mutation and audit are one transaction | forced audit failure rolls back business row | I,F |
| 73 | stale viewer mutation | authenticated viewer | no business row and no success audit | denied at server and database boundaries | I,B,F |
| 74 | adversarial rate telemetry | resume/click without prerequisite | facts remain inspectable | numerator intersects its eligible denominator; rate <=100% | I,F |

Automated coverage is considered complete only when each row marked N/I/B/F has a matching test name or an explicit release-check exception in the release report. Rows marked documented are limitations that cannot be truthfully automated into person identity claims.
