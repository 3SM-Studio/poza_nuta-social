# Release checklist — social.pozanuta.pl

Do not label the application production-verified until the applicable checks below pass.

## Connected toolchain
- [x] Use Node 24 LTS (`node -v`).
- [x] `npm ci` succeeds from the sole deterministic `package-lock.json`.
- [x] CI uses `npm ci`.
- [x] `npm run guard` passes.
- [x] `npm run lint` passes.
- [x] `npm run typecheck` passes.
- [x] `npm test` passes.
- [x] `npm run secret:scan` passes through the guard.
- [x] `npm audit --audit-level=moderate` reports zero vulnerabilities.
- [x] `npm run test:db` passes all 216 assertions after an explicit `supabase db reset --local` replays all eight migrations and the seed. The six earlier owner failures were caused by accumulated local E2E fixtures.
- [x] `npm run test:admin:concurrency` passes seven duplicate-invite, revoke/accept, competing-transfer, last-owner and referral-acquisition races from clean local state; audits are checked against committed transfers.
- [x] `npm run test:analytics:concurrency` passes seven real parallel-ingest cases.
- [x] `npm run test:scenario-matrix` validates all 74 Analytics contracts, 30 Admin contracts with exact test/assertion markers, and five documented Analytics limitations.
- [x] `npm run build` passes.
- [x] All 10 local authenticated Admin browser cases pass in desktop Chromium, including same-ID invitation retry/resend and failure recovery. All 44 public Chromium/WebKit cases pass, including two-way consent, signed-state readback, and bounded `/api/track` requests.
- [x] `npx shadcn@latest info` confirms `base-nova` / Base UI / `cn`.
- [x] CI YAML parses locally; its database job uses explicit local reset/lint/advisor flags, resolves all package scripts, and orders migration replay, pgTAP, concurrency, scenario checks and a second local reset before Admin browser tests. The verify job also runs `npm audit --audit-level=moderate`. Hosted execution must be checked on this slice's PR.

## Impeccable
- [ ] `npm run impeccable:install` completed in project scope.
- [ ] Codex `/hooks` project hook approved.
- [x] `npm run impeccable:detect` passes.
- [x] Rendered public `/`, `/kontakt`, privacy, 404 and login audit + critique + harden + polish completed.
- [x] Rendered authenticated admin audit + critique + harden + polish completed.
- [x] Mobile 360×800 / 390×844 and desktop 1440×900 checked after those passes.

## Dedicated Supabase project
- [ ] This app has its own Supabase project, not a shared Poza Nutą/Stage project.
- [ ] Apply `001_initial.sql`.
- [ ] Apply `002_sessions_audit_dashboard.sql`.
- [ ] Apply `003_dashboard_ranges.sql`.
- [ ] Apply `20260919171044_harden_attribution_and_permissions.sql`.
- [ ] Apply `20260920120000_analytics_visitor_session_event_v1.sql`.
- [ ] Apply `20260922092419_analytics_v2_1_correctness_freeze.sql`.
- [ ] Apply `20260922102559_admin_platform_v2.sql`.
- [ ] Apply `20260923080812_post_admin_v2_audit_hardening.sql` (or use the controlled CLI workflow for all pending migrations).
- [ ] Apply seed data intentionally (not blindly in production if real data exists).
- [ ] Confirm RLS is enabled and no unintended public policies exist.
- [ ] Set modern publishable key and server-only secret key; retain the service-role variable only as a temporary legacy fallback where required.
- [ ] Set a unique 32+ character server-only `ANALYTICS_SIGNING_SECRET`.
- [ ] Configure `BOOTSTRAP_OWNER_EMAIL` only for the first owner, then verify it grants nothing after an active owner exists.
- [ ] Configure the hosted new-user invite template to reach `/auth/confirm` with `token_hash` and `type=invite`.
- [ ] Confirm Auth redirect URLs for local/preview/production.
- [ ] Verify magic link -> callback -> `/admin` -> session refresh.

## Isolated local Supabase verification
- [x] PostgreSQL 17 applies all eight migrations and seed from empty state.
- [x] An isolated legacy fixture backfills without inventing a visitor: session/event history is preserved, marked `legacy_limited`, and normalized to `unknown_offline` / `qr`; the temporary verification database is removed afterward.
- [x] Concurrent visitor/session updates keep `last_seen_at >= first_seen_at/started_at` and session expiry at or after last-seen time.
- [x] `supabase db lint --schema public` reports no application-schema errors (extension-owned pgTAP functions are intentionally out of scope).
- [x] `supabase db advisors --local --type all --level warn --fail-on error` reports no local issues.
- [x] RLS/grants/RPC execution were queried directly and match the server-only model.
- [x] Local magic link -> callback -> `/admin` works for an active database owner; inactive and non-member Auth users are denied.
- [x] Owner/admin/viewer permissions, stale-role rejection, last-owner protection and atomic ownership transfer are database/browser verified.
- [x] New-user and existing-user invitation paths, duplicate handling, failure/reconciliation state and revoke-before-accept are locally verified without claiming production SMTP delivery.
- [x] Pending invitation role changes write atomic old/new audits; failed and pending resend use one invitation ID with coherent attempt history and duplicate suppression. The application deadline is labeled separately from the shorter Auth link lifetime.
- [x] shadcn Sidebar collapse persistence, active route, keyboard shortcut, direct deep links and mobile sheet behavior are browser verified.
- [x] Referral participant/link lifecycle and Michał → later-session Dima → same-session Victor canonical acquisition are database/browser verified without double credit.
- [x] Local campaign → normalized asset/placement → SVG QR → `tracking_entry` → later UTM → outbound flow passes with ordered v2 session/event snapshots and audit rows.
- [x] Immediate ChatGPT/UTM landing → outbound preserves one session and attribution before hydration.
- [x] Analytics consent creates one protected visitor reused across a fresh later session; denial creates no visitor.
- [x] The first-party privacy control supports OFF → ON → OFF after reload; withdrawal clears the visitor cookie, and later re-enabling creates a different visitor identity.
- [x] Consent withdrawal cannot be undone by an older in-flight tracking response; later events remain unlinked.
- [x] Viewer mutation through a stale owner-rendered form is rejected server-side and creates no row.
- [x] Internal and signed test-mode traffic is classified outside default business KPIs.
- [x] Disabled database destinations are not resurrected by environment fallback.
- [x] Database-offline `/r` and `/go` navigation falls back safely within bounded deadlines (`1.248s` and `1.238s`; five parallel `/go` requests `1.375s` total in the final local run).

## Analytics scenario story
- [ ] Create a campaign.
- [ ] Create two placement-specific tracking links.
- [ ] Scan/open `/r/[code]` and confirm `tracking_entry` (do not call every request a QR scan).
- [ ] Confirm landing on clean `/` and `page_view` inherits poster/flyer as source and QR as medium.
- [ ] Add a later UTM/referrer touch and verify last-touch changes without replacing canonical session acquisition.
- [ ] Click Instagram and confirm `/go/instagram` records `outbound_click` then redirects.
- [ ] Simulate analytics/database failure and confirm redirects still work.
- [ ] Confirm no raw IP/fingerprint/precise-location columns or data are introduced.
- [ ] Confirm internal/test/bot and non-production traffic remain outside default production KPIs.
- [ ] Confirm `hub_resumed` requires outbound → hidden → meaningful resume.
- [ ] Confirm `/kontakt` emits contact view/click without claiming an email was sent.

## Dashboard
- [x] Default 30-day calendar range is correct for Europe/Warsaw.
- [x] Today / 7 / 30 / 90 ranges are correct.
- [x] Custom inclusive date range is correct.
- [x] Previous-period comparison uses an equal immediately preceding calendar range.
- [x] Outbound session rate equals sessions with >=1 outbound click / eligible sessions.
- [x] Clicks per outbound session, multi-destination rate, return-to-hub rate and contact-interest/contact-click rates use documented subset denominators.
- [ ] Consented visitor/new/returning metrics never claim unique people.
- [x] Top source/campaign/asset/placement/tracking-link acquisition is exclusive and canonical; destination/time-series click/session semantics match controlled fixtures.
- [x] All charts use `@/components/ui/chart` with a text/table alternative.

## Admin Platform V2
- [x] `admin_profiles` is the steady-state authorization source; no `ADMIN_EMAILS` path remains.
- [x] Exactly one zero-owner bootstrap path exists and all later requests require active membership.
- [x] Viewer writes, admin owner promotion/invites, role tampering and stale forms are rejected server-side and at RPC boundaries.
- [x] Owner-sensitive mutations retain at least one active owner under concurrent operations.
- [x] Invitation intent/delivery/acceptance/revocation/failure states are explicit and auditable; Auth Admin remains server-only.
- [x] `/admin/team` and `/admin/referrals` include loading, empty/error, dialog and destructive-confirmation states.
- [x] Referral leaderboard reads canonical session/visitor acquisition and production/external evidence only.
- [x] Team/Referrals narrow-screen record actions, Sidebar sheet/colors, short-viewport dialog and clipboard-denied recovery are rendered/browser checked after hardening.
- [ ] Configure and verify production SMTP delivery, hosted Auth templates and production redirect allowlists on the identified dedicated project.

## SEO / GEO
- [ ] `/` canonical is correct on production host.
- [ ] `/kontakt` canonical is correct.
- [ ] sitemap returns only durable public pages.
- [ ] robots excludes `/admin`, `/api`, `/r`, `/go`, `/auth`.
- [ ] OAI-SearchBot is allowed.
- [ ] GPTBot remains blocked unless product owner explicitly changes that separate policy.
- [ ] Organization JSON-LD validates and `sameAs` points only to real official profiles.
- [ ] Search Console and Bing Webmaster can be connected after launch.

## Vercel / security / operations
- [ ] Create a dedicated Vercel project.
- [ ] Set Node 24.x and all env vars by environment.
- [ ] Attach `social.pozanuta.pl` and verify HTTPS.
- [ ] Inspect response security headers on the deployment.
- [ ] Review runtime errors/logs after a full E2E run.
- [ ] Stage Vercel Firewall rate limits in log mode for abuse-sensitive POST/login paths, review traffic, then enforce appropriate limits.
- [ ] Consider tightening CSP only after browser/network inspection proves required origins.
- [ ] Configure Search Console after the canonical domain is resolved.
- [ ] Activate GA4 only after property/configuration, CSP and privacy review; keep Postgres authoritative.
- [ ] Do not activate Meta/TikTok/Google Ads/GTM without a separately authorized use case and marketing consent.
- [ ] Run a QR scan test from multiple phones and print sizes before mass print.

## Product inputs still genuinely unresolved
- [ ] Decide `social.pozanuta.pl` versus `socials.pozanuta.pl` before canonical production setup or permanent print.
- [ ] Final slogan/copy approved by product owner.
- [ ] Real official contact email configured.
- [ ] Real TikTok/Facebook/YouTube URLs configured only when those channels should be visible.
- [ ] Complete production privacy notice with real controller/legal information.
- [ ] Approve consent wording/legal basis and category-specific retention periods.
