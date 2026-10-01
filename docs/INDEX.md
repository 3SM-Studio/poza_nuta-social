# Documentation map

Check Git first. Read only the task-relevant entries. `CANONICAL` is durable authority; `CURRENT` is live task state; `HISTORICAL` is superseded; `EVIDENCE` is dated and needs renewal.

| Role | Area | Entry |
| --- | --- | --- |
| CANONICAL | Agent rules | [`AGENTS.md`](../AGENTS.md) |
| CANONICAL | Product / UI | [`PRODUCT.md`](../PRODUCT.md) |
| CANONICAL | Design / UI | [`DESIGN.md`](../DESIGN.md) |
| CANONICAL | Latest owner decisions | [`docs/PRODUCT_DECISIONS.md`](PRODUCT_DECISIONS.md) |
| CANONICAL | Architecture | [`docs/ARCHITECTURE.md`](ARCHITECTURE.md) |
| CANONICAL | Analytics | [`docs/analytics/ANALYTICS_ARCHITECTURE.md`](analytics/ANALYTICS_ARCHITECTURE.md) |
| CANONICAL | Consent | [`docs/analytics/PRIVACY_AND_CONSENT.md`](analytics/PRIVACY_AND_CONSENT.md) |
| CANONICAL | Processing facts | [`docs/privacy/PROCESSING_FACT_MATRIX.md`](privacy/PROCESSING_FACT_MATRIX.md) |
| CANONICAL | Admin / auth | [`docs/admin/ADMIN_PLATFORM_V2.md`](admin/ADMIN_PLATFORM_V2.md) |
| CANONICAL | Verification | [`docs/VERIFY.md`](VERIFY.md) |
| CANONICAL | Local runtime | [`docs/RUNTIME.md`](RUNTIME.md) |
| CANONICAL | Release procedure | [`docs/RELEASE.md`](RELEASE.md) |
| CANONICAL | Optional work note | [`docs/current/README.md`](current/README.md) |
| CURRENT | Task delta | Git is authoritative; optional `docs/current/WORK.md` is a checked continuation aid. |
| HISTORICAL | Handoff | [`docs/history/CODEX_HANDOFF_2026-09-27.md`](history/CODEX_HANDOFF_2026-09-27.md) |
| HISTORICAL | Old release checklist | [`docs/RELEASE_CHECKLIST.md`](RELEASE_CHECKLIST.md) |
| HISTORICAL | Old SEO/GEO plan | [`docs/seo/SEO_GEO_PRODUCTION_HARDENING.md`](seo/SEO_GEO_PRODUCTION_HARDENING.md) |
| EVIDENCE | Release readiness | [`docs/PUBLIC_MARKETING_RELEASE_READINESS.md`](PUBLIC_MARKETING_RELEASE_READINESS.md) |
| EVIDENCE | Media rights | [`docs/PUBLIC_MARKETING_V2_MEDIA.md`](PUBLIC_MARKETING_V2_MEDIA.md) |
| EVIDENCE | Accessibility | [`docs/accessibility/PUBLIC_WCAG_22_AA_EVIDENCE.md`](accessibility/PUBLIC_WCAG_22_AA_EVIDENCE.md) |

For DB work, inspect affected `supabase/migrations/` and schema with VERIFY/RELEASE. Historical evidence never proves a current PASS.
