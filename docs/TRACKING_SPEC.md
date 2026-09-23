# Tracking specification (legacy compatibility)

The versioned contract is now in `docs/analytics/`. This file describes the legacy v0 model during migration. New writes use `tracking_entry`, the controlled taxonomy, observed/attributed context, and the visitor/session/event architecture. Legacy `entry` rows remain readable and are backfilled as schema version 0.

## Session
- Cookie: legacy `pn_visit`; replaced by signed session identity and optional consent-gated visitor identity.
- HttpOnly, SameSite=Lax, Secure in HTTPS.
- TTL: 30 minutes of inactivity; meaningful requests refresh it.
- Database record: `analytics_sessions.visit_id`.
- Stores first-touch and last-touch source/medium/campaign/content/tracking-link/referrer-host plus broad device/browser/OS categories.
- Does not store raw IP, precise location, fingerprint, exact device model, or a durable cross-day person ID.

## Attribution precedence for a new touch
1. owned `/r/[code]` tracking metadata;
2. UTM source/medium/campaign;
3. external referrer host;
4. existing session's last touch when the new request is direct/internal;
5. direct.

Same-site referrers are not counted as acquisition. Known ChatGPT referrers/UTM normalize to `chatgpt`.

## Event types
- `entry` — legacy `/r/[code]` event; maps to v1 `tracking_entry`.
- `page_view` — public page viewed after hydration.
- `outbound_click` — `/go/[slug]` before external redirect.
- `interaction` — reserved for meaningful future interactions; never scroll/hover noise.

## Legacy campaign dimensions
- source
- medium
- campaign
- asset
- placement

UTM content remains a textual session dimension. Owned asset and placement stay on the referenced tracking-link record instead of being collapsed into UTM content.

In v1, assets and placements are normalized where useful and their values are snapshotted on events. QR is the medium, not automatically the source.

## Stable print rule
Measured print assets use a stable `/r/[code]`, not a direct social URL. Code alphabet excludes visually confusing `I`, `O`, `0`, `1`; code length is 5–7 characters.

## Failure rule
Analytics is best-effort. A database/analytics failure must never strand a visitor or prevent the intended redirect.

## QR rule
Functional QR codes are generated programmatically as SVG. Never use an image-generation model for the QR payload.
