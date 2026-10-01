# Verification contract

Choose checks by changed behavior and risk. A green local command is evidence for its layer only. Record the tested Git HEAD, environment and any skipped gate; do not reuse a dated PASS for a new change.

## Layers

1. **FOCUSED CHECK:** Run the smallest relevant guard, Vitest file or browser spec while working. For a Vitest file, use `npx vitest run src/lib/utils.test.ts` as the command form and replace the path with the affected existing test. For browser work, use an existing spec with `npm run test:e2e -- tests/e2e/marketing-site.spec.ts --project=desktop-chromium` as the command form. The E2E runner requires an isolated local Supabase/Auth/Mailpit stack even for a selected spec.
2. **SOURCE VERIFICATION:** On Node 24, `npm run verify:source` runs `guard`, `impeccable:detect`, `lint`, `typecheck`, `npm test` (Vitest plus Node guard tests), and `next build`. `npm run verify` is the compatible alias. This layer does not run DB, browser, accessibility, scenario, concurrency or hosted checks.
3. **DOMAIN CLOSURE:** Add the checks in the matrix for each affected domain. A targeted PASS is useful feedback; the domain is closed only after all applicable local checks and required rendered/runtime evidence pass. For public UI release work, follow the Impeccable audit/critique/harden/polish process in `AGENTS.md`; source detection alone does not prove rendered quality.
4. **HOSTED INTEGRATION:** For a PR, check the actual GitHub CI run for the exact HEAD. `.github/workflows/ci.yml` defines four jobs: `verify` (which runs the source gate and `npm audit --audit-level=moderate`), `public-e2e`, `public-accessibility` and `database`. They run for PRs and pushes to `main`. Check the effective GitHub rulesets for both `main` and `production` before merging; workflow configuration alone does not prove that required checks are enforced.

5. **RELEASE CLOSURE:** Use [RELEASE.md](RELEASE.md) for the current procedure, external approvals, production authorization, deployment evidence and post-deploy checks. This is separate from local and CI PASS.

Playwright keeps two CI retries for diagnosing transient failures, but `failOnFlakyTests` makes a test that passes only on retry fail its job. The built-in GitHub reporter emits passed, failed, flaky and skipped counts when present; a green check therefore means no flaky result. Project-specific skips are expected: public specs run across four browser/viewport projects, while local Auth/Admin scenarios require their designated project and isolated stack. Inspect skipped test names before treating a changed count as a regression.

A Playwright result classified as flaky is a failure. Rerunning an unchanged SHA until its job turns green does not close the defect: identify the root cause, fix it at a new HEAD, and verify that HEAD. A rerun without a code fix is appropriate only for a clearly identified external infrastructure outage unrelated to a Playwright flaky result; record that evidence first.

## Change-class closure matrix

`Source` means `npm run verify:source` on Node 24. Add rows when a change crosses domains. CI always runs its configured jobs for a PR, regardless of the smaller local focused choice.

| Change class | Focused feedback | Source | Additional local domain gates | Browser/runtime evidence | Local closure |
| --- | --- | --- | --- | --- | --- |
| Docs only | Run `node scripts/docs-integrity-guard.mjs` for entry-map changes; check links, command names and `git diff --check`. | No full source gate unless executable verification/config changed. | None for prose-only edits. | No. | Accurate links and claims; no stale PASS or release claim. |
| TypeScript/lib | Affected Vitest file. | Yes. | Add a domain row if shared behavior changes auth, analytics or another contract. | Only if observable runtime behavior changes. | Source PASS and affected contract tests PASS. |
| UI | Affected component test and focused rendered spec. | Yes. | Relevant `test:e2e` spec across affected viewport/project; Impeccable rendered passes for release work. | Yes, inspect actual changed states and interaction. | Source, applicable browser checks and rendered review PASS. |
| Accessibility-sensitive UI | Affected component test and keyboard/focus check. | Yes. | `npm run test:a11y` plus relevant `test:e2e` spec; human review of changed criteria. | Yes, including keyboard, focus and responsive state. | Automated and human evidence for affected criteria PASS. |
| Route/API | Affected route/unit test and focused request/redirect case. | Yes. | Relevant `test:e2e` spec for public or authenticated journey; add DB row if query/RPC contract changes. | Yes for observable route behavior; API needs a real request/response check. | Source and affected journey/runtime contract PASS. |
| Auth | Affected auth tests and denial/expiry case. | Yes. | Focused local `test:e2e` auth/Admin spec; add DB gates for membership, RLS or RPC changes. | Yes, with isolated local Auth/Mailpit and role boundaries. | Positive and negative auth paths PASS locally. |
| DB migration/RLS/RPC | Relevant SQL/pgTAP assertion. | Yes. | Isolated `npx supabase start`, `npx supabase db reset --local`, DB lint/advisors and `npm run test:db`; add `npm run test:admin:concurrency`, `npm run test:analytics:concurrency`, `npm run test:scenario-matrix` and browser checks when those contracts change. | Yes when the change affects an application flow. | Fresh local replay and affected data/permission flows PASS. |
| Analytics contract | Affected Vitest contract test. | Yes. | `npm run test:scenario-matrix`; relevant `npm run test:analytics:concurrency` and local `test:e2e` journey; DB gates if SQL/RPC changed. | Yes for attribution, consent or redirect behavior. | Contract, persistence and affected journey evidence PASS. |
| Release-affecting config | Affected guard/config check. | Yes. | Applicable domain rows; `npm audit --audit-level=moderate` if dependencies changed. External gates follow release closure. | Preview/target-host evidence when configuration affects deployment. | Local checks PASS; release status still requires hosted and external closure. |

For DB work, the lint/advisor commands are `npx supabase db lint --local --schema public` and `npx supabase db advisors --local --type all --level warn --fail-on error`. The `database` CI job executes a fresh local reset, these checks, `test:db`, Admin and analytics concurrency, scenario matrix, then another reset and desktop Chromium E2E. `public-e2e` resets local Supabase and runs `npm run test:e2e`; `public-accessibility` runs `npm run test:a11y`. Locally, run only the parts needed for the changed domain, but do not call a domain closed if its required evidence is missing. `test:e2e:local` and `test:e2e` invoke the same `scripts/run-local-e2e.mjs`; the former is a CI compatibility name, not a different environment profile.

## Completion states

- **IMPLEMENTATION COMPLETE:** All required local focused, source and domain closure for this slice passed. Unrun domain checks remain explicit, never implicit PASS.
- **INTEGRATION COMPLETE:** Implementation is complete and all four hosted CI jobs above passed for the same PR HEAD. A local CI command does not establish this state.
- **RELEASE READY:** Integration is complete and every applicable external gate and owner approval is closed for the intended production target. No production action is implied.
- **RELEASED:** The production action was authorized and performed, and required post-deploy verification passed on the deployed version.

Use the highest state actually evidenced. A change with no planned release stops at its applicable implementation or integration state.
