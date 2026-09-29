# Local runtime and evidence map

This is the canonical local operations map. Run `npm run doctor` first: it is read-only, reports tool and environment **names** without values, and separates basic source readiness from local DB/E2E blockers. It does not verify Preview or Production identity. Use [VERIFY.md](VERIFY.md) for check selection and completion states; use [RELEASE.md](RELEASE.md) for release authorization.

## Bootstrap and local services

- Use Node 24 (`.nvmrc`, `package.json`) and npm 11.17.0 (`packageManager`). Install committed dependencies with `npm ci`. Copy `.env.example` to an ignored `.env.local` only when local app flows need it; obtain local values through the approved local workflow and never paste them into logs or evidence.
- Local Supabase runs through the repo's installed CLI and Docker. Check readiness with `npm run doctor`; start explicitly with `npx supabase start`. `npx supabase status` is a local status command but can display keys and connection details, so do not paste its raw output. `supabase/config.toml` sets local API port 54321, Postgres port 54322, Studio port 54323 and Mailpit web port 54324. Its `project_id` identifies the **local** stack, not a remote project.
- The local Auth email testing server is enabled in `supabase/config.toml`. Mailpit is at `http://127.0.0.1:54324` while the local stack runs; inspect captured messages there for local Auth mail flows. They are not evidence of Production delivery.

## Application and observations

- Start the app with `npm run dev`; the repo's local Auth URLs and Playwright default target are `http://localhost:3000`. Keep the command's terminal open for Next/server logs. Capture the relevant request, status and sanitized error context; a successful compile line alone does not prove the flow succeeded. Do not paste environment values or full Auth/DB connection strings.
- For browser evidence, open DevTools on the local page: inspect **Console** errors and **Network** status/redirects/request failures, then check the affected responsive and interaction states. Use the existing Playwright command for repeatable journeys: `npm run test:e2e -- tests/e2e/marketing-site.spec.ts --project=desktop-chromium` is a focused example. Its runner (`scripts/run-local-e2e.mjs`) requires an isolated local Supabase/Auth/Mailpit stack and creates or updates a local test owner; it is not a read-only check.
- For DB evidence, confirm `npm run doctor` reports the local stack running and verify the intended local ports in `supabase/config.toml` before a query. Use explicitly local checks such as `npx supabase db lint --local --schema public` and `npx supabase db advisors --local --type all --level warn --fail-on error`; follow [VERIFY.md](VERIFY.md) when DB changes require a fresh replay or pgTAP. Never substitute a linked or remote target for `--local`.

## Reset, cleanup and environment boundaries

- Stop `npm run dev` with Ctrl+C. `npx supabase stop` stops the local stack. For an intentionally fresh **local** DB, `npx supabase db reset --local` destructively replays all committed migrations and `supabase/seed.sql`; confirm the local target and preserve needed local data first. No remote reset is part of this workflow.
- **LOCAL** is this checkout plus the local services above. **PREVIEW** and **PRODUCTION** are separate hosted environments whose identities must be verified from current platform state; a hostname, client input or local `VERCEL_ENV` value alone is not authorization. `npm run doctor` marks both hosted environments UNKNOWN / NOT CHECKED. Local console, Mailpit and DB results cannot close hosted or release gates.
