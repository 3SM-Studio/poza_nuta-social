# Poza Nutą — `social.pozanuta.pl`

Standalone digital business card, official-links hub and first-party attribution analytics for Poza Nutą.

The application is intentionally independent: its own repository, Vercel deployment, Supabase project, authentication, database and analytics. It does not depend on Stage or any other Poza Nutą application.

## Product contract
Read these before changing product/UI behavior:
- `PRODUCT.md` — durable product truth;
- `DESIGN.md` — design-system truth;
- `docs/PRODUCT_DECISIONS.md` — approved discovery decisions 1–82;
- `docs/STACK_AUDIT.md` — current engineering/tooling audit;
- `docs/RELEASE_CHECKLIST.md` — gates before production verification;
- `docs/analytics/ANALYTICS_ARCHITECTURE.md` — visitor/session/event and TrackingContext contract;
- `docs/analytics/SCENARIO_MATRIX.md` — 74 acquisition, journey, identity, consent, failure, audit and history scenarios;
- `docs/analytics/SCENARIO_TRACEABILITY.md` — critical scenario-to-test mapping;
- `docs/analytics/CORRECTNESS_FREEZE.md` — V2.1 finding decisions and frozen reporting contracts;
- `CODEX_HANDOFF.md` — exact runtime verification handoff.

## Current stack
- Next.js 16.3.5 / React 19.3;
- Tailwind CSS 4;
- shadcn/ui `base-nova` with Base UI and the current `cn` package;
- Impeccable detector in CI plus required Impeccable design workflow;
- dedicated Supabase/Postgres + Auth;
- Vercel target deployment;
- programmatic SVG QR generation;
- Vitest unit tests + Playwright Chromium/WebKit E2E tests, including an opt-in local Supabase/Auth flow.

## Local setup
Node.js 24 LTS is the project runtime (`engines.node = 24.x`).

```bash
npm ci
cp .env.example .env.local
npm run impeccable:install
# In Codex: open /hooks and approve the project hook.
npm run dev
```

Create a fresh Supabase project dedicated to this application and apply migrations in order:

```text
supabase/migrations/001_initial.sql
supabase/migrations/002_sessions_audit_dashboard.sql
supabase/migrations/003_dashboard_ranges.sql
supabase/migrations/20260919171044_harden_attribution_and_permissions.sql
supabase/migrations/20260920120000_analytics_visitor_session_event_v1.sql
supabase/migrations/20260922092419_analytics_v2_1_correctness_freeze.sql
supabase/seed.sql
```

Configure Supabase Auth redirect URLs for local development, previews and `https://social.pozanuta.pl/auth/callback`.

## Verification

```bash
npm run guard
npm run impeccable:detect
npm run lint
npm run typecheck
npm test
npm run test:db
npm run test:analytics:concurrency
npm run test:scenario-matrix
npm run build
npm run test:e2e
# With isolated local Supabase/Auth/Mailpit running:
npm run test:e2e:local
```

`package-lock.json` is the only lockfile and CI uses `npm ci`. A local Supabase stack can be initialized with the committed `supabase/config.toml`; `npx supabase db reset --local` replays all migrations and the seed without touching a remote project.

Production additionally requires a unique 32+ character `ANALYTICS_SIGNING_SECRET`. Use `SUPABASE_SECRET_KEY` only in the controlled server runtime; `SUPABASE_SERVICE_ROLE_KEY` is a temporary legacy fallback for older/local projects. Never expose either through `NEXT_PUBLIC_*`. Analytics consent permits only a pseudonymous browser identifier; without consent, measurement remains within the short signed session and GA4 is ineligible. Postgres remains authoritative. GA4/Search Console are documented integration boundaries, not active production services in this repository.

## Important
Do not call the public product “Poza Nutą Social”. Do not add Stage/event CTA, photography, a second UI library, raw IP storage, fingerprinting, or arbitrary generic CTAs unless the product owner explicitly changes the approved decisions.
