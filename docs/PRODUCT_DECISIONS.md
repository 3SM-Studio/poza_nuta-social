# Approved product decisions — discovery 1–82

Status: **approved by product owner on 2026-09-19**. These are binding unless explicitly changed later.

## Public product and brand (1–30)
1. Main goal: fast official-link/contact business card; analytics is invisible infrastructure.
2. Serve normal visitors and business/collaboration visitors; keep explanation short.
3. A slogan will exist, but its final wording is not yet decided.
4. Publicly it is simply Poza Nutą; do not call it “Poza Nutą Social”.
5. Public geographic label: Trójmiasto only.
6. Brand-owned experience rather than a generic Linktree look.
7. Mobile-first; desktop must still look deliberate.
8. Desktop remains focused/narrow rather than becoming a dashboard layout.
9. Logo should be visible but not dominate the viewport.
10. No photos on the homepage.
11. No photo background.
12. Dark-first visual direction.
13. No light/dark toggle needed in MVP.
14. Pink is an accent, not the entire background.
15. Avoid decorative gradients.
16. Link actions use a consistent structure; one or two may receive emphasis.
17. Instagram is primary CTA.
18. TikTok is second CTA.
19. Facebook is lower priority unless data later proves otherwise.
20. YouTube is shown only while the channel is active/useful.
21. No Stage CTA now.
22. No “nearest karaoke” CTA now.
23. No automatic Stage event integration now.
24. Contact is required.
25. Use one `Kontakt / współpraca` entry point.
26. Email may be shown on the contact surface rather than the homepage.
27. WhatsApp/Telegram only if they are real business contact channels.
28. External destinations may open a new tab/app handoff where appropriate.
29. Every outbound destination goes through `/go/[slug]`.
30. Track logo clicks only if the logo is actually interactive.

## Analytics, privacy, and attribution (31–46)
31. No scroll tracking in MVP.
32. Time-on-page may be auxiliary, never a primary KPI.
33. Track interaction/click order within an anonymous session.
34. Do not build persistent cross-day identity in MVP.
35. Anonymous session TTL: approximately 30 minutes of inactivity.
36. QR attribution persists during the anonymous session.
37. Preserve both first-touch and current/last-touch attribution.
38. Report both first-touch and last-touch where useful.
39. Store source/referrer host; avoid full referrer URLs by default.
40. Never store raw IP addresses.
41. No device fingerprinting.
42. Prefer broad device/browser/OS categories instead of retaining a full UA profile.
43. Aggregate iPhone/iOS vs Android level information is acceptable.
44. Exact device model is not needed.
45. Country is optional; city is not required for MVP.
46. No precise geolocation.

## Campaign/QR model (47–59)
47. Important physical posters/placements may each get their own QR.
48. Do not uniquely number every flyer unless placement-level measurement is actually useful.
49. Attribution hierarchy: `campaign → asset → placement`.
50. Event may be campaign metadata/relation, but need not be encoded in the public URL.
51. Tracking URLs use random short codes, not readable marketing slugs.
52. Codes are 5–7 uppercase characters and exclude visually confusing characters such as O/0/I/1.
53. Codes may support expiration, but do not expire automatically by default.
54. A QR may be repointed only with preserved history/auditability.
55. Tracking links can be deactivated.
56. Deactivated/invalid links fall back to the main hub, not a 404.
57. Record the entry before redirecting where analytics is available.
58. Analytics failure must never block the visitor redirect.
59. `/go` must not be cached in a way that bypasses event tracking.

## Destinations and admin (60–75)
60. Admin can change an official destination URL without a deployment.
61. Official social destinations are database records.
62. Admin can reorder them; numeric sort order is sufficient for MVP.
63. Admin can activate/deactivate them.
64. Scheduled activation is outside MVP.
65. Do **not** turn the app into a generic arbitrary-CTA builder. Public actions are official Poza Nutą channels plus contact/collaboration.
66. Admin lives at `/admin`.
67. No separate admin subdomain now.
68. Authentication: magic link.
69. No passwords in MVP.
70. Google OAuth may be considered later but is unnecessary now.
71. Initial admins may have equivalent practical permissions.
72. Prepare role semantics `owner`, `admin`, `viewer` from the beginning.
73. Maintain an audit log.
74. Audit log records actor, time, change/action, old value, and new value.
75. Business records use archive/soft-delete instead of physical deletion.

## Dashboard (76–82)
76. Keep the dashboard high-signal, not overloaded.
77. Primary KPIs: visits, unique anonymous sessions, outbound clicks, outbound CTR, top source, top campaign, top destination.
78. `outbound CTR = outbound clicks / visits` and must be named clearly.
79. Include a time-series chart.
80. Default time range: 30 days.
81. Planned quick ranges: today, 7d, 30d, 90d, custom.
82. Compare with the previous equivalent period.

## Explicitly unresolved
- Final public slogan/copy.
- Final exact business-contact copy and contact channel values.
- Decisions 83+ have not been approved yet and must not be silently treated as product truth.

## Superseding analytics decision — 2026-09-20

The analytics architecture continuation explicitly supersedes decision 34 only: a persistent pseudonymous browser identifier may exist across sessions **only after analytics consent**. Without that consent, analytics remains session-scoped. This is not person identity, fingerprinting, or permission to store raw IP, precise location, or exact device model. The rationale, limitations, withdrawal behavior, and unresolved legal/retention review are recorded in `docs/analytics/IDENTITY_MODEL.md`, `PRIVACY_AND_CONSENT.md`, and ADR-001.

It also refines decisions 49 and 78 without changing the public product: campaign attribution uses controlled `channel_group/source/medium/campaign/asset/placement`, QR is a transport medium rather than an automatic source, and the primary conversion percentage becomes outbound sessions divided by eligible sessions. Legacy click/page-view CTR remains a compatibility metric only and must not be labeled as the sole outbound rate.

## Analytics V2.1 correctness refinement — 2026-09-22

Acquisition rankings are exclusive session-level reports: one eligible session contributes to exactly one source, campaign, asset, placement, and tracking-link acquisition bucket. Event attributed context remains available for non-exclusive touchpoint/assist analysis and must not be labeled acquisition.

Session acquisition means the first eligible non-direct acquisition with direct fallback, not literal first observed touch. A later server-resolved owned tracking link may replace weaker client-observed UTM/referrer acquisition, but later client-observed touches cannot replace stronger owned acquisition. Visitor first acquisition remains the literal effective session acquisition observed when the consented visitor record is first created and is immutable, including when it is direct.

Rates whose denominators describe prerequisite sessions use numerator intersections: return-to-hub requires an outbound session, and contact click conversion requires a contact-view session. Significant admin business mutations and their audit rows are one database transaction.

## Admin Platform V2 implementation refinement — 2026-09-22

This refinement implements decisions 66–75 without declaring new numbered product decisions. Steady-state admin authorization is a verified Supabase Auth user plus a fresh active `admin_profiles` membership. `BOOTSTRAP_OWNER_EMAIL` may create only the first owner and grants no access after an active owner exists. Missing/inactive membership is denied, viewer is read-only, and ownership changes only through an audited atomic transfer that preserves at least one active owner.

Application invitations and Supabase Auth delivery are separate, repairable states. New Auth users receive the invite-token flow; existing confirmed users accept the pending application invitation through their own magic-link login. Roles are always read from locked application state, never query strings or user metadata.

Referral participants are a separate internal attribution dimension with optional account linkage. Their stable `/r/[code]` links reuse Analytics V2.1 canonical acquisition. Competitive referral metrics include production/external traffic only, count consented pseudonymous browsers rather than guaranteed people, and never derive acquisition credit from non-exclusive raw event touchpoints.
