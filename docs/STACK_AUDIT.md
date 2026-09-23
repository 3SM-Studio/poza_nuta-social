# Stack and implementation audit

Audit date: **2026-09-22**, post-Admin V2 hardening addendum **2026-09-23**.
Scope: repository source, approved product decisions 1–82, dependency choices, architecture, tracking/privacy, UI system, database/auth, SEO/GEO, security, tests and Vercel readiness.

## Executive result

The repository is architecturally aligned with the approved product contract and is locally runtime-verified on Node 24. The deterministic install, source guards, lint, types, unit tests, production build, Chromium/WebKit browser tests, rendered Impeccable pass and an isolated local Supabase/Auth/SQL flow are executable here. Dedicated remote Supabase and Vercel production identity remain external release gates.

The 2026-09-23 narrow hardening addendum closes the post-Admin V2 findings without changing architecture: audited pending-invitation role changes; same-ID retry/resend and distinct application/Auth link expiries; two-way consent with signed-state readback; chronological historical referral labels; a real 12,000-byte `/api/track` body bound; accurate copy/docs; and permanent local advisors plus dependency audit in CI. The technical 180-day visitor lifetime is unchanged and remains subject to final production privacy/legal retention approval. SEO/GEO hardening, remote Supabase/Vercel, SMTP, firewall, canonical domain and physical QR tests are deferred to their separate release work.

The largest issues found during the audit were fixed in the repository rather than merely documented:

- Next.js was raised to 16.3.5 and Node was pinned to Vercel's Node 24 LTS line.
- Supabase SSR packages were updated and the required Next.js 16 `proxy.ts` + `getClaims()` refresh flow was added.
- shadcn was aligned to the current `base-nova` / Base UI / `cn` direction and competing UI libraries are blocked.
- canonical session acquisition + current/last touch moved into the anonymous Postgres session instead of a second attribution cookie.
- the public product was corrected from a generic social hub to the approved Poza Nutą business card / official-links / collaboration surface.
- Stage/event CTAs and Gdynia-first wording were removed from current scope.
- custom analytics date ranges and previous-period comparison (decisions 81–82) were implemented.
- RLS, foreign-key indexes, audit logging and role semantics were strengthened.
- a privacy guard and Playwright public-surface tests were added.
- steady-state admin access moved from an environment allowlist to fresh active database membership with zero-owner bootstrap only;
- audited Team & Access, repairable new/existing-user invitations, last-owner concurrency protection and ownership transfer were added;
- the actual shadcn Sidebar and a separate referral-participant/canonical-acquisition leaderboard were added without changing public surfaces.

## Tool-by-tool audit

| Area | Status | Repository decision / finding |
| --- | --- | --- |
| Node.js | PASS (config) | `24.x`, matching Vercel's recommended/default current LTS line for new projects. `.nvmrc` included. |
| Next.js | PASS (source) | 16.3.5, App Router, server-first architecture, Next 16 `proxy.ts`. No Pages Router or obsolete middleware pattern. |
| React | PASS (source) | 19.3.0. Client JS is intentionally small; core public content is server-rendered. |
| TypeScript | PASS (compatibility choice) | 6.0.3. We intentionally do **not** use TS 7 yet: current `typescript-eslint` supports `<6.1.0`, so TS 7 would make lint tooling unsupported. |
| ESLint | PASS | 9.39.5 + flat config + `eslint-config-next`. ESLint 10 is intentionally not used because `eslint-config-next` currently brings `eslint-plugin-react` with an ESLint 9 peer/API contract. Lint remains an explicit CI gate. |
| Tailwind CSS | PASS (source) | 4.3.3, token-driven theme; no second styling framework. |
| shadcn/ui | PASS | `npx shadcn@latest info` confirms `base-nova`, Base UI, current `cn` package, Chart, CVA variants and Lucide. UI guard blocks MUI/Chakra/Ant/etc. and raw form controls outside `components/ui`. |
| Base UI | PASS (source) | 1.8.0. Used as the primitive layer for shadcn interactive controls, not as a competing design system. |
| `cn` | PASS | Current shadcn direction: `cn` package replaces local `clsx + tailwind-merge`. Legacy pair removed and guarded. |
| Lucide | PASS | 1.47.0. Used for interface icons; does not introduce another UI system. |
| Impeccable | PASS (local rendered) | Detector returned no findings. Rendered audit/critique/harden/polish covers public surfaces plus authenticated dashboard, Team & Access, referrals and shadcn Sidebar at 360×800, 390×844, 720×450 zoom-equivalent and 1440×900. |
| Supabase JS | PASS (source) | 2.116.0. The modern secret-key client stays server-only; the legacy service-role variable is supported only as a documented compatibility fallback. |
| Supabase SSR/Auth | PASS (local) | `@supabase/ssr` 0.12.7; Proxy preserves SSR response headers and verifies via `getClaims()`. Database membership is authoritative. Mailpit proves normal magic links, custom new-user invite confirmation, existing-user reconciliation and revoke-before-accept. Open public signup remains disabled. |
| PostgreSQL | PASS (clean local) | PostgreSQL 17 replayed all eight migrations and seed from zero; all 216 pgTAP assertions, public-schema lint and local advisors passed. Seven Admin and seven Analytics concurrency cases passed. The six earlier owner failures on an accumulated E2E database did not recur from clean state. New access/invitation/referral tables have RLS, browser roles have no access, active RPCs are `SECURITY INVOKER` with explicit grants, owner-sensitive operations serialize and retain an active owner, and business mutations plus audit history are atomic. |
| QR generation | PASS (local) / PHYSICAL TEST REQUIRED | `qrcode` 1.5.4, programmatic SVG only, Q error correction, quiet-zone margin 4. Authenticated E2E created and downloaded a valid SVG; final print/scanner testing remains. |
| First-party analytics | PASS (local) | Signed early 30-minute session, optional consent-gated visitor, central TrackingContext, controlled taxonomy, observed/attributed contexts, atomic idempotent RPC, ordered versioned events and immutable snapshots. No raw IP/fingerprint/precise location. Immediate-click acquisition, denial/grant, returning visitor, and disabled-destination behavior pass locally. |
| Analytics dashboard | PASS (local) | Production/external default filter; exclusive canonical session-acquisition rankings; session-based outbound rate, clicks/depth, multi-destination, prerequisite-bounded return/contact rates and consented visitor metrics; today/7/30/90/custom comparisons; shadcn Chart/Recharts with text alternative. Calendar ranges use `Europe/Warsaw`. |
| SEO | PASS (source) | SSR HTML, canonical, sitemap, robots, metadata, OG, Organization JSON-LD, `sameAs`, semantic content, tracking/admin routes excluded. |
| GEO / AI search | PASS for approved scope | Clear entity naming and Trójmiasto facts; `OAI-SearchBot` allowed. GPTBot remains a separate blocked policy because its approval was never given. No unapproved `llms.txt` was added. |
| Security headers | PASS / HARDEN AFTER LIVE TEST | nosniff, strict referrer policy, permissions policy, frame denial, HSTS, safe baseline CSP. A stricter nonce/script CSP should only be added after rendered Next.js verification so it does not break the app. |
| Redirect security | PASS | Public destinations are allowlisted to official channel slugs, and external redirect schemes are restricted to HTTP(S). No user-provided open redirect parameter exists. |
| Vitest | PASS | 5.0.1; 92 tests cover taxonomy/domain safety, environment/bootstrap handling, login policy, invitation orchestration/reconciliation, bounded analytics JSON, token integrity, traffic/sink eligibility, lifecycle state, broad device categorization, dashboard ranges and URL validation. |
| Playwright | PASS (local) | 1.63.0. Canonical public tests run at 360×800, 390×844 and 1440×900 in Chromium plus 1440×900 WebKit, including JS-disabled, overflow, focus/touch target, heading and reduced-motion checks. An opt-in local test covers real magic-link/admin/campaign/QR/destination/tracking/audit flow. |
| Vercel | READY / LIVE PASS REQUIRED | Node 24 target, Next-native deployment, no custom server. Production project/domain/env/runtime logs/firewall still need actual configuration and inspection. |
| CI | PASS (local configuration) / HOSTED EXECUTION PENDING | npm 11 and Supabase CLI are pinned, `package-lock.json` is the sole lockfile, verification includes guards/secret scan/Impeccable/lint/types/tests/build plus `npm audit --audit-level=moderate`; E2E installs Chromium/WebKit; the database job performs explicit local migration replay, lint, local advisors, pgTAP, both concurrency suites, scenario-contract checks and isolated Admin browser checks after its own reset. Hosted status belongs to the hardening PR. |

## Product-decision compliance

`docs/PRODUCT_DECISIONS.md` is the binding record for decisions **1–82 only**. Decisions 83+ are intentionally not treated as approved.

Important implementation checks now match those decisions:

- public naming is Poza Nutą, not “Poza Nutą Social”;
- primary geography is Trójmiasto;
- no public photography, photo background, theme toggle or decorative gradient;
- Instagram-first / TikTok-second order is supported by default ordering, while inactive channels can be hidden;
- no Stage or nearest-event CTA in current scope;
- one first-party `Kontakt / współpraca` path exists;
- outbound social traffic always goes through `/go/[slug]`;
- destinations are official-channel-only rather than a generic CTA builder;
- important placement QR codes use `campaign → asset → placement` metadata;
- short-code alphabet excludes `I`, `O`, `0`, `1`;
- invalid/deactivated QR routes fall back to `/`;
- analytics failure never intentionally blocks the target redirect;
- admin is `/admin`, magic-link based, with owner/admin/viewer semantics prepared and change auditing;
- active `admin_profiles` membership is the access authority; missing/inactive membership is denied and viewer is read-only;
- Team & Access exposes audited invitations, role/deactivation controls and atomic ownership transfer;
- referrals use separate participants, stable `/r` links and canonical production/external acquisition rather than raw event counts;
- dashboard decisions 76–82 are implemented, including custom periods and previous-period comparison.

## Privacy and data-minimization audit

The application deliberately does not read/store `x-forwarded-for`, `cf-connecting-ip`, `request.ip`, browser fingerprint identifiers, `navigator.geolocation`, or the retired `pn_attr` attribution cookie. `scripts/privacy-guard.mjs` turns those choices into an automated repository rule.

The technical implementation is privacy-minimized, but `src/app/privacy/page.tsx` is **not yet a complete legal privacy notice for production**. Before launch, fill in the real controller identity/contact, purposes/legal bases, retention periods, processors/subprocessors, international-transfer information where applicable, and data-subject rights. Those facts cannot be invented in code.

## Security / abuse findings still requiring platform work

The code itself does not implement an in-memory rate limiter because that is a poor fit for distributed serverless execution. Before production, configure Vercel Firewall rate-limit rules for abuse-sensitive surfaces such as the analytics POST and admin login, start in log mode, inspect real traffic, then enforce. Do not blindly rate-limit crawlers or the entire site.

A full CSP is deliberately not guessed. The current CSP blocks embedding/object abuse and unsafe base URLs without risking a broken Next.js runtime. Tighten `script-src`, `style-src`, `connect-src` etc. only after the deployed app has been browser-tested and required Supabase/Next origins are known.

## Dependency choices that are intentionally not “latest at any cost”

TypeScript is the main example. npm's `latest` tag is TS 7, but the current `typescript-eslint` support range is `>=4.8.4 <6.1.0`; therefore **TypeScript 6.0.3 is the correct current compatible choice** for this stack. Using TS 7 just to have the largest version number would make the toolchain less correct, not more correct.

## Static checks completed in this audit environment

These currently pass:

```text
node scripts/ui-guard.mjs       -> ui-guard: ok
node scripts/design-guard.mjs   -> design-guard: ok
node scripts/privacy-guard.mjs  -> privacy-guard: ok
TypeScript syntax/transpile scan over src/**/*.ts(x) -> ok
JSON parse for project configuration -> ok
```

## What cannot be certified locally

1. identity and configuration of the dedicated remote `social.pozanuta.pl` Supabase project;
2. remote migration application, real email delivery and production Auth redirect URLs;
3. a dedicated Vercel preview/production project, runtime logs, firewall rules, HTTPS and domain/DNS behavior;
4. production legal privacy-notice facts and final official contact/channel inputs;
5. physical QR print/scan reliability.

These are not hidden TODOs: they are release gates in `docs/RELEASE_CHECKLIST.md` and `CODEX_HANDOFF.md`.

## Primary external evidence used for this audit

- Next.js / Vercel Next 16 docs and releases: https://nextjs.org/docs and https://nextjs.org/blog
- shadcn current `cn` migration: https://ui.shadcn.com/docs/changelog/2026-09-cn
- Base UI: https://base-ui.com/
- Supabase SSR auth for Next.js: https://supabase.com/docs/guides/auth/server-side/creating-a-client
- Supabase `getClaims`: https://supabase.com/docs/reference/javascript/auth-getclaims
- Impeccable project install/hooks/detector: https://github.com/pbakaus/impeccable
- typescript-eslint supported dependency versions: https://typescript-eslint.io/users/dependency-versions/
- Vercel Node 24: https://vercel.com/changelog/node-js-24-lts-is-now-generally-available-for-builds-and-functions
- Vercel Firewall: https://vercel.com/docs/vercel-firewall
- Playwright: https://playwright.dev/
