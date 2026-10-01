# Release procedure

**CURRENT / CANONICAL procedure.** This document defines the release sequence, not a release approval or a record of current deployment state. Use [VERIFY.md](VERIFY.md) for change-class checks and completion states. Dated readiness reports and superseded checklists are evidence, not instructions for the next release; find them in [INDEX.md](INDEX.md).

`main` is the integration branch. Vercel tracks `production` as its Production Branch; merging into `main` does not authorize or trigger a Production deployment. A release uses a reviewed PR to integrate the selected `main` state into `production`. Reconfirm the live Vercel branch setting and active deployment before each release. Merging into `production` is a consequential Production action and requires separate explicit authorization.

## 1. Fix the source and target

- Record the exact branch, commit SHA and PR. Review the diff and require the deployed source to match the reviewed commit; resolve unexpected dirty or unreviewed files before proceeding.
- Identify **local**, **Preview** and **Production** separately. `supabase/config.toml` describes the local stack and its `project_id` is not a remote project reference. A Preview URL, database write or PASS is not Production evidence.
- `https://pozanuta.pl` is the approved **future** canonical origin for the main site in `PRODUCT.md` and the production environment guard. Verify the actual production host, hosting project, domain mapping and remote Supabase project from current platform state and owner approval. Do not infer them from a dated deployment ID or the old `socials.pozanuta.pl` checklist.

## 2. Preflight and external gates

- Complete the applicable focused, source and domain closure in [VERIFY.md](VERIFY.md). Confirm all four hosted CI jobs and the dependency audit for the exact PR HEAD. A local `npm run verify:source` PASS alone does not establish INTEGRATION COMPLETE or RELEASE READY.
- Check environment-scoped configuration against [.env.example](../.env.example), the production build guard and the intended host: canonical origin, Supabase URL/keys, server-only signing secret, approved contact/channels, `PRIVACY_*` values and Auth redirect/email delivery. Confirm values securely on the platform; never copy secrets into release evidence. A guard PASS does not prove that live services or disclosures are correct.
- Recheck material approvals for the exact release: media rights and venue/participant consent in the [media evidence register](PUBLIC_MARKETING_V2_MEDIA.md), privacy/legal facts and retention, accessibility findings and human checks in the [WCAG evidence](accessibility/PUBLIC_WCAG_22_AA_EVIDENCE.md), and production Auth mail where relevant in [Auth email delivery](admin/AUTH_EMAIL_DELIVERY.md). Dated PASS or an approved Preview does not renew these approvals.
- Establish the intended deployment mechanism, owner/operator, monitoring access and a tested application rollback or recovery path **before** claiming RELEASE READY. The repository does not currently define a canonical Production deploy or rollback command.

## 3. Database migration boundary

- If the release includes DB changes, first replay **all committed** `supabase/migrations/*.sql` on an isolated local stack and close the DB row of [VERIFY.md](VERIFY.md). Never select files from a hand-maintained list; never use a production reset or seed as a shortcut.
- Before a remote write, independently confirm the linked Supabase project reference against the approved target and runtime configuration. Compare local and remote history with `npx supabase migration list --linked`; review the complete pending set with `npx supabase db push --linked --dry-run --skip-vault`. Reconcile any history mismatch, unexpected file, data migration or incompatible app/schema order before approval. The `--skip-vault` flag avoids an unrelated Vault update; seed data are not included.
- Applying pending migrations with `npx supabase db push --linked --skip-vault` is a separate **production mutation requiring explicit authorization** for this exact target and pending set. Do not run it during documentation or Preview work. Afterwards, recheck remote migration history and affected schema, RLS, RPC and application paths with approved read-only checks. Record the outcome and any unresolved risk.
- When a pending migration must precede the application, complete and verify that authorized migration before merging the release PR into `production`. A merge into `main` does not apply the migration or release the app.

## 4. Preview evidence

- Deploy only to the identified, authorized Preview target from the reviewed commit. Confirm environment identity, protection, `noindex` headers/metadata, empty Preview sitemap and canonical URLs; inspect the intended public routes, redirects, consent, official outbound links, browser console/network and relevant responsive/accessibility states.
- Run the browser/runtime cases selected by [VERIFY.md](VERIFY.md). When Preview shares a backend with Production, first reconfirm server-derived environment classification, permitted writes, Admin mutation restrictions and Business KPI isolation. Use approved test traffic and no real campaign, user or QR fixture merely to make a test pass.
- Record the Preview deployment ID/URL, commit, results and gaps. Screenshots or machine-local paths are supporting material only; keep a durable summary or a deterministic rerun recipe tied to the deployment. Preview PASS does not close Production checks.

## 5. Production authorization and execution

Finish all safe preparation first. Ask for explicit authorization naming the reviewed `main` SHA and release PR into `production`, Production host/project, migration set (or none), operator and rollback/forward-fix plan. A merge into `main`, CI PASS, Preview PASS or prior approval does not authorize a Production deploy or DB write. Do not merge the release PR into `production` without this authorization.

After authorization, use the reviewed app/schema order, then merge the approved release PR into `production`; Vercel's Git integration creates the Production deployment from that branch. This repo has no Production deploy script or canonical rollback command. Confirm target identity again immediately before each consequential step; stop on a mismatch. Record deployment and migration identifiers as they become available.

## 6. Production verification and recovery

- On the live host, check HTTPS and intended host redirects; critical public routes, status codes, assets, canonical/OG/robots/sitemap and security headers; contact and official outbound flows. Check consent, attribution, Auth, Admin or DB behavior when the release touches them. Inspect runtime logs/errors and relevant metrics after representative traffic. Compare against the approved pre-deploy baseline; do not treat a best-effort analytics HTTP response alone as proof of persistence.
- **Stop promotion and further writes** for a wrong target, failed migration, security/privacy regression, broken critical flow or unexplained production errors. Preserve evidence and assess impact before acting.
- Roll back an app-only change only when the previous compatible deployment and the target platform's rollback mechanism have been confirmed and the rollback is authorized; then repeat production smoke. A code rollback does not reverse schema or data changes. For DB/data changes, choose a reviewed forward fix only when compatibility and data safety are demonstrated. If neither recovery path is proven, hold the release and escalate. Never improvise a reverse migration or assume a provider rollback feature exists.

## 7. Durable release evidence

For an actual release, create one sanitized record under `docs/releases/YYYY-MM-DD-<short-sha>.md` (directory created when first needed) and link it from the PR or release artifact. Record: exact commit/PR and CI run, target environment and deployment ID/URL, migration history/result or “none”, concise source/domain/Preview/Production test summary, material approvals, incidents/recovery decision, and critical visual evidence link **or** deterministic rerun recipe. Keep secrets, personal data and private consent documents in controlled storage; record only their approved status and reference. Update the record after post-deploy verification, then assign the highest evidenced state from [VERIFY.md](VERIFY.md).
