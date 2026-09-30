# Poza Nutą — marketing site

Main marketing site for Poza Nutą, with a compact official-links route at `/linki` and first-party attribution analytics. Its future canonical origin is `https://pozanuta.pl`; domain migration is a separate task.

The application is intentionally independent: its own repository, Vercel deployment, Supabase project, authentication, database and analytics. It does not depend on Stage or any other Poza Nutą application.

Start with [`docs/INDEX.md`](docs/INDEX.md) for the source-of-truth map, [`docs/ARCHITECTURE.md`](docs/ARCHITECTURE.md) for technical boundaries, [`docs/VERIFY.md`](docs/VERIFY.md) to choose verification, and [`docs/RELEASE.md`](docs/RELEASE.md) for the current release procedure. Run `npm run doctor` for a read-only local preflight; [`docs/RUNTIME.md`](docs/RUNTIME.md) maps local services, logs and cleanup.

## Product contract
Read these before changing product/UI behavior:
- `PRODUCT.md` — durable product truth;
- `DESIGN.md` — design-system truth;
- `docs/PRODUCT_DECISIONS.md` — numbered decision history and the superseding Public Marketing V2 owner decision;
- `docs/PUBLIC_MARKETING_V2.md` — approved Public Marketing V2 implementation direction and phased plan;
- `docs/STACK_AUDIT.md` — dated engineering/tooling audit; V2 product supersessions are recorded separately;
- `docs/RELEASE_CHECKLIST.md` — historical checklist for the previous link-hub release target, not a current release runbook;
- `docs/seo/SEO_GEO_PRODUCTION_HARDENING.md` — dated SEO/GEO implementation evidence from the former hub slice, not the current release plan;
- `docs/analytics/ANALYTICS_ARCHITECTURE.md` — visitor/session/event and TrackingContext contract;
- `docs/analytics/SCENARIO_MATRIX.md` — 74 acquisition, journey, identity, consent, failure, audit and history scenarios;
- `docs/analytics/SCENARIO_TRACEABILITY.md` — critical scenario-to-test mapping;
- `docs/analytics/CORRECTNESS_FREEZE.md` — V2.1 finding decisions and frozen reporting contracts;
- `CODEX_HANDOFF.md` — dated continuation checkpoint; verify current state with Git and `docs/VERIFY.md`.

## Current stack
- Next.js 16.3.5 / React 19.3;
- Tailwind CSS 4;
- shadcn/ui `base-nova` with Base UI and the current `cn` package;
- Impeccable detector in CI plus required Impeccable design workflow;
- dedicated Supabase/Postgres + Auth;
- Vercel Git integration with `main` for integration and `production` for separately authorized Production releases; the future root-domain cutover remains open;
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

Use only the dedicated Supabase project for this application; verify the remote project identity before any migration. For local development, start the local stack and use `npx supabase db reset --local`: it replays **every committed file** in `supabase/migrations/` in order, then applies `supabase/seed.sql`. Do not select migrations from a hand-maintained list. Follow [`docs/RELEASE.md`](docs/RELEASE.md) for remote migration preflight and authorization.

Configure Supabase Auth redirect URLs for local development, previews and the future root-domain host's `/auth/callback`. Do not change production Auth configuration as part of local marketing-site work.

## Verification

[`docs/VERIFY.md`](docs/VERIFY.md) is the canonical contract for focused checks, source verification, domain closure, hosted CI and release states. `npm run verify:source` (also available as the compatible `npm run verify` alias) runs guards, the Impeccable detector, lint, typecheck, unit tests and build. It does not run DB, browser, accessibility or hosted release checks.

For sharing source, `npm run secret:scan` checks every Git-tracked text file. `npm run secret:workspace` separately reports local `.env*` and tool-state surfaces before anyone manually shares a whole workspace; it may fail on a valid local setup and is not a CI gate. `npm run export:safe` requires a clean working tree, scans tracked files, and creates a SHA-named ZIP of committed `HEAD` in the parent directory using `git archive`. It refuses forbidden tracked paths and checks the archive listing; ignored and untracked workspace files are never included. Commit intended changes first; the command does not commit or upload anything.

`package-lock.json` is the only lockfile and CI uses `npm ci`. A local Supabase stack can be initialized with the committed `supabase/config.toml`; `npx supabase db reset --local` replays all migrations and the seed without touching a remote project. `npm run test:e2e` is the canonical local browser runner and requires the isolated Supabase/Auth/Mailpit stack; `test:e2e:local` is a compatibility alias to the same runner used by the CI database job. Pass a spec and project after `--` for a focused browser check. CI resets its own local stack in the public E2E and database jobs.

Production additionally requires a unique 32+ character `ANALYTICS_SIGNING_SECRET` and confirmed `PRIVACY_*` disclosure values (see `.env.example`). Use `SUPABASE_SECRET_KEY` only in the controlled server runtime; `SUPABASE_SERVICE_ROLE_KEY` is a temporary legacy fallback for older/local projects. Never expose either through `NEXT_PUBLIC_*`. Before server-confirmed analytics consent, limited identity-free public events may be ingested without visitor/session/acquisition identity; `/go` and `/r` still redirect if tracking fails. Consented identity-based analytics applies only to new events. Grant evidence is stored in `analytics_consent_evidence`. Postgres remains authoritative. GA4/Search Console are documented integration boundaries, not active production services in this repository. Retention enforcement, legal facts and privacy review remain production gates.

## Important
Do not call the public product “Poza Nutą Social”. Public Marketing V2 permits authentic event photography/video as evidence, while stock or generated substitute karaoke imagery remains excluded. Do not add Stage/nearest-event CTA, premature owned event routes, a second UI library, raw IP storage, fingerprinting, or arbitrary generic CTAs. See `docs/PUBLIC_MARKETING_V2.md` for the event-route gate and consumer-first direction.
