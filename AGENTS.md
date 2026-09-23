# Agent rules for `social.pozanuta.pl`

This repository is an independent application. Never import code, database tables, auth state or runtime assumptions from another Poza Nutą application.

## Mandatory UI workflow
1. Read `PRODUCT.md`, `DESIGN.md`, and `docs/PRODUCT_DECISIONS.md` before changing any UI.
2. shadcn/ui is the only component system. Current base: `base-nova` + Base UI + `cn`.
3. Impeccable is mandatory. Use `/impeccable` in supported agents and run detector + audit/critique/harden/polish before release.
4. Never add MUI, Chakra, Ant Design, Mantine, Bootstrap or another competing component library.
5. Do not bypass `src/components/ui` with raw interactive form controls in application screens.
6. Do not change durable product/design decisions silently. Propose the change instead.
7. Run `npm run verify` on a connected Node 24 machine before merging release work.

## Public product invariants
- Public name is Poza Nutą, not “Poza Nutą Social”.
- Primary public geography is Trójmiasto.
- Final slogan is unresolved: do not invent one.
- No homepage photography or decorative gradients.
- No Stage/event CTA in current scope.
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
