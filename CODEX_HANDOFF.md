# Codex handoff — locally verified repository

This repository contains approved decisions 1–82, the explicit analytics refinements, and the implemented Admin Platform V2 contract under `docs/admin/`. Read both document sets before changing access, identity, consent, taxonomy, metrics, or external sinks.

## Read first
1. `PRODUCT.md`
2. `DESIGN.md`
3. `docs/PRODUCT_DECISIONS.md`
4. `docs/STACK_AUDIT.md`
5. `AGENTS.md`
6. `docs/admin/ADMIN_PLATFORM_V2.md`

## Non-negotiable constraints
- Standalone application; no Stage/shared DB/shared auth dependency.
- 100% shadcn UI. Current base: `base-nova` + Base UI + `cn`.
- 100% Impeccable process for UI changes; approve the Codex project hook after install.
- Public identity is Poza Nutą; “Poza Nutą Social” is not public naming.
- Primary geography is Trójmiasto.
- Homepage has no photography and no decorative gradients.
- Final slogan remains unresolved; do not invent one.
- No Stage/current-event CTA in current scope.
- Official channel destinations + first-party contact only; no generic CTA builder.
- QR payloads remain programmatic SVG.
- No raw IP, fingerprinting, precise geolocation or cross-day person identity. A consent-gated random browser identifier is allowed under ADR-001 and must never be called a person.
- Steady-state admin access is verified Supabase Auth plus fresh active database membership; `BOOTSTRAP_OWNER_EMAIL` is zero-owner bootstrap only.
- Last-owner safety, owner-only transfer, invitation-role integrity and audit atomicity are database invariants, not UI assumptions.
- Referral participants are separate from memberships and referral competition reads canonical production/external acquisition only.

## First machine pass
Use Node 24 LTS.

```bash
npm ci
npx shadcn@latest info
npm run impeccable:install
# Codex: open /hooks and approve the project Impeccable hook.
npm run guard
npm run impeccable:detect
npm run lint
npm test
npm run build
```

`package-lock.json` is committed as the sole lockfile and CI already uses `npm ci`.

## Impeccable verification
Run actual rendered passes, not only source detection:

```text
/impeccable audit public hub + /kontakt + admin
/impeccable critique public hub + /kontakt + admin
/impeccable harden public hub + /kontakt + admin
/impeccable polish public hub + /kontakt + admin
```

Also run URL detection at mobile and desktop viewports after a local server/deployment is available.

## Supabase
Create a new dedicated project. Apply:
1. `001_initial.sql`
2. `002_sessions_audit_dashboard.sql`
3. `003_dashboard_ranges.sql`
4. `20260919171044_harden_attribution_and_permissions.sql`
5. `20260920120000_analytics_visitor_session_event_v1.sql`
6. `20260922092419_analytics_v2_1_correctness_freeze.sql`
7. `20260922102559_admin_platform_v2.sql`
8. `seed.sql`

Use the modern publishable key in `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`; legacy anon-key fallback exists only for compatibility. Use `SUPABASE_SECRET_KEY` server-side only. `SUPABASE_SERVICE_ROLE_KEY` is a narrowly documented legacy fallback for local/older projects and must never be exposed through `NEXT_PUBLIC_*`. Normal login uses `shouldCreateUser: false`; new-user creation happens only through the server invitation service. Configure `BOOTSTRAP_OWNER_EMAIL` only for the first owner, and configure hosted invite templates/redirect allowlists to match the repository contract before production testing.

## Required browser/E2E story
Verify 360×800, 390×844 and 1440×900, keyboard-only, 200% zoom and reduced motion. Then:
1. authenticate admin via magic link;
2. create campaign;
3. create tracking link;
4. download/scan SVG QR;
5. open `/r/[code]` and land on clean `/`;
6. verify observed tracking context, immutable session acquisition and current attribution;
7. introduce a later UTM/referrer and verify last-touch updates without replacing canonical session acquisition;
8. click `/go/instagram` and verify redirect still succeeds even when analytics is intentionally made unavailable;
9. confirm `tracking_entry`, `page_view`, `outbound_click`, ordered v2 session/event and audit-log rows;
10. confirm outbound-session rate, engagement/contact metrics, top dimensions and shadcn time-series chart.
11. exercise owner/admin/viewer/inactive/non-member access, new/existing invitation acceptance and ownership transfer;
12. prove the Michał → later-session Dima → same-session Victor referral fixture without double credit.

## Completed local evidence
- Node 24 deterministic install, guards including secret scan, lint, types, 83 unit tests and production build pass.
- The dependency audit reports zero vulnerabilities; shadcn reports the expected Next 16.3.5 / `base-nova` project with Chart installed.
- Public and local integration Playwright passes at 360×800, 390×844, 720×450 zoom-equivalent and 1440×900 in Chromium plus desktop WebKit, including JS-disabled, consent lifecycle and accessibility/responsive invariants.
- Isolated PostgreSQL 17 applied all seven migrations/seed from zero; the expanded 197 pgTAP assertions, schema lint, and seven Admin plus seven Analytics concurrency cases pass. The earlier six owner failures were caused by accumulated E2E fixture state and did not recur from clean state. V2 ingest is atomic/idempotent, acquisition rankings are exclusive, rate numerators are valid subsets, membership/invitation/referral mutations are atomic with audit history, all exposed tables have RLS, active RPCs are invoker functions with explicit grants, owner transactions preserve at least one active owner, visitor/session timestamps are monotonic, and event/audit history is append-only for normal secret-key/service-role behavior.
- Seven real concurrency cases pass with 33 unique events, sequences through 20, same-ID deduplication, stable canonical acquisition, monotonic visitor/session timestamps and intact visitor/session/event relationships.
- Real local Mailpit magic-link auth and campaign → tracking link → SVG QR → first/last attribution → outbound → audit-log flow pass.
- Real local Mailpit covers new-user token-hash invitations, existing-user onboarding, revoke-before-accept, fresh role enforcement, ownership transfer and restore.
- Referral browser evidence proves immutable visitor-first Michał, later-session Dima, and no same-session acquisition credit for Victor; leaderboard eligibility is production/external only.
- The installed shadcn Sidebar is persisted/collapsible on desktop and uses the accessible mobile sheet at 390px; 360/390/720/1440 overflow coverage is automated.
- A stale owner-rendered form cannot mutate after the server-side role changes to viewer; signed test/internal classification and contact event uniqueness are browser-verified.
- Rendered Impeccable audit/critique/harden/polish and final detector pass.

## Remaining external release gates / unresolved product inputs
- `social.pozanuta.pl` versus `socials.pozanuta.pl`, actual final slogan/copy;
- final consent/legal basis, production notice, and retention periods;
- production `ANALYTICS_SIGNING_SECRET`, official contact details and optional GA4/Search Console configuration;
- production official contact/channel values and complete legal privacy facts;
- positively identify the dedicated remote Supabase project before applying migrations;
- create and verify a dedicated Vercel preview/production project, runtime logs, platform rate limits and eventual domain mapping;
- physical QR print/scan test.

Do not claim v1.0/100% verification until those relevant release gates are completed on a normal connected machine.
