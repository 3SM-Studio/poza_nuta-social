# Agent rules for the Poza Nutą marketing site

This repository is an independent application. Never import code, database tables, auth state or runtime assumptions from another Poza Nutą application.

Check the current Git branch, HEAD, status and diff before relying on task state. Use `docs/INDEX.md` to find the canonical source for the affected area. Read only the sources relevant to the task; dated checkpoints and reports are evidence, not current instructions. If a long slice has an active `docs/current/WORK.md`, use it only for remaining work and verify its Git claims directly.

## User communication language
All user-facing progress updates, explanations, questions, approval requests, warnings, blockers, tool-result summaries, sub-agent findings, and final reports must be in Polish. Keep code, identifiers, commands, file paths, API names, raw errors and logs, test and migration names, and repository terminology in their natural technical language; do not translate identifiers for consistency.

## Contextual routing
- Public product or UI: read `PRODUCT.md`, `DESIGN.md` and the latest applicable owner decisions via `docs/INDEX.md` before editing. Use shadcn/ui (`base-nova` + Base UI + `cn`) through `src/components/ui`; no competing component system or raw interactive screen controls. Use `/impeccable` in supported agents; run the detector and rendered audit/critique/harden/polish before release. Never approximate the real logo or silently change an approved decision.
- Analytics or privacy: use the canonical architecture, consent and processing contracts linked from `docs/INDEX.md`. Never store raw IP addresses, fingerprint users, or infer person identity from analytics identifiers.
- Admin or auth: use the canonical Admin and Auth contracts linked from `docs/INDEX.md`; preserve server-verified membership and authorization boundaries.
- DB or migration: inspect the affected schema/migrations and select checks from `docs/VERIFY.md`; use `docs/RELEASE.md` for remote migration authorization.
- Release: use `docs/RELEASE.md`, the only current procedure. Dated checklists and Preview reports are evidence.

Use `docs/VERIFY.md` to select closure checks. Run `npm run verify:source` on Node 24 before merging release work; source PASS alone is not release approval. Never commit secrets, expose server-only keys, or mutate remote DB/Production without the authorization required by `docs/RELEASE.md`.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
