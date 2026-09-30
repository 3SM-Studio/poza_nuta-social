# Agent rules for the Poza Nutą marketing site

This repository is an independent application. Never import code, database tables, auth state or runtime assumptions from another Poza Nutą application.

Use `docs/INDEX.md` to find the canonical source for each area; check current Git state for task progress.
Use `docs/RELEASE.md` for release procedure and authorization boundaries; dated checklists and Preview reports are evidence only.

## User communication language
All user-facing progress updates, explanations, questions, approval requests, warnings, blockers, tool-result summaries, sub-agent findings, and final reports must be in Polish. Keep code, identifiers, commands, file paths, API names, raw errors and logs, test and migration names, and repository terminology in their natural technical language; do not translate identifiers for consistency.

## Mandatory UI workflow
1. Read `PRODUCT.md`, `DESIGN.md`, and `docs/PRODUCT_DECISIONS.md` before changing any UI.
2. shadcn/ui is the only component system. Current base: `base-nova` + Base UI + `cn`.
3. Impeccable is mandatory. Use `/impeccable` in supported agents and run detector + audit/critique/harden/polish before release.
4. Never add MUI, Chakra, Ant Design, Mantine, Bootstrap or another competing component library.
5. Do not bypass `src/components/ui` with raw interactive form controls in application screens.
6. Do not change durable product/design decisions silently. Propose the change instead.
7. Use `docs/VERIFY.md` to select closure checks. Run `npm run verify:source` on Node 24 before merging release work; source PASS alone is not release approval.

## Public product invariants
- Public name is Poza Nutą, not “Poza Nutą Social”.
- Primary public geography is Trójmiasto.
- Final master-brand slogan is unresolved. The approved karaoke/campaign line is not a permanent master slogan.
- Public Marketing V2 allows authentic event photography/video on the homepage as evidence; no stock or generated substitute karaoke imagery or decorative gradients.
- No Stage/nearest-event CTA. Own event routes are gated on an authoritative maintained event source and lifecycle.
- Official channels + first-party contact/collaboration only; not a generic CTA builder.

## Analytics/privacy invariants
- Do not store raw IP addresses.
- Do not fingerprint users.
- Do not persist exact device model or precise geolocation.
- Session identity remains short-lived. Cross-session pseudonymous browser identity is allowed only with analytics consent as specified by ADR-001; it is never person identity or fingerprinting.
- Preserve first-touch and last-touch attribution server-side.
- `/r/[code]` records owned campaign entry when possible; tracking failure must not block redirect.
- `/go/[slug]` records the outbound choice when possible before redirecting; tracking failure must not block redirect.
- Printed QR codes encode stable `/r/[code]` URLs and are generated programmatically as SVG.

## Brand asset rule
Never recreate or approximate the Poza Nutą logo. If the real asset is not present, keep the typographic fallback.

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
