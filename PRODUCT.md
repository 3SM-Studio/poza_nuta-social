<!-- impeccable:product-schema 1 -->
# Poza Nutą — product truth

## Product
`social.pozanuta.pl` is an independent Poza Nutą application. It is not a Stage module, not a shared dashboard module, and does not share database, authentication, deployment, or runtime dependencies with any other Poza Nutą product.

## Overview
The public surface is a digital business card and official-links hub for Poza Nutą. It serves two equally legitimate audiences:

1. people who want to find the official Poza Nutą social profiles quickly;
2. venues, companies, organizers, and other people interested in business collaboration who need to understand what Poza Nutą is and how to contact the team.

The visible experience must stay extremely simple. Attribution and analytics run invisibly underneath it.

## Primary outcome
A visitor should understand that this is the official Poza Nutą presence, then reach the correct official channel or the collaboration/contact path in seconds.

## Product boundaries
- Public name: **Poza Nutą**. Never expose “Poza Nutą Social” as the product name to visitors.
- Geographic wording: **Trójmiasto**. Do not make Gdynia the primary public location label.
- This is not a generic Linktree clone or generic link-builder SaaS.
- No Stage CTA in the current scope.
- No “nearest karaoke” or event integration in the current scope.
- Do not invent arbitrary CTA types. The public hub is for official Poza Nutą channels plus contact/collaboration.
- Final marketing slogan is intentionally **TBD**. Do not hard-code a temporary slogan as brand truth.

## Public information hierarchy
1. Poza Nutą identity/logo.
2. Short factual context: what Poza Nutą is and that it operates in Trójmiasto.
3. Official social links, with Instagram first and TikTok second; Facebook lower priority; YouTube only when active.
4. One clear **Kontakt / współpraca** route.
5. Minimal footer/privacy information.

## Visual constraints
- Mobile-first, with a deliberate desktop layout that remains focused and narrow.
- Dark-first.
- Pink is the main accent, not a full-page background.
- No theme toggle in MVP.
- No photography on the public homepage.
- No decorative gradients.
- One or two actions may receive stronger emphasis, but the hub must remain structurally consistent.

## Tracking truth
The analytics system is first-party and privacy-first:
- every outbound public destination uses `/go/[slug]`;
- important offline placements can use individual `/r/[code]` links;
- hierarchy is `campaign → asset → placement`;
- codes are short random uppercase identifiers, 5–7 characters, excluding visually confusing characters;
- anonymous session TTL is approximately 30 minutes of inactivity;
- a random pseudonymous browser visitor may link later sessions only after analytics consent; it is never described as a person;
- preserve canonical session acquisition (first eligible non-direct with direct fallback and owned-link precedence) plus current/last-touch attribution;
- use controlled `channel_group/source/medium/campaign/asset/placement`; QR is a transport medium, not automatically a source;
- do not store raw IP addresses;
- do not fingerprint users;
- store only broad device/browser/OS categories when useful, not exact device models or full persistent UA profiles;
- tracking failure must never prevent a redirect;
- deactivated/unknown QR links fall back to the main hub rather than a dead end.

## Admin truth
- Admin lives at `/admin`.
- Authentication: Supabase magic link plus a fresh active database membership; no passwords in MVP.
- `admin_profiles` is the steady-state access authority. Missing or inactive membership is denied; no implicit viewer fallback exists.
- Roles are `owner`, `admin`, and read-only `viewer`. Ownership changes only through the atomic transfer flow, and the database must retain at least one active owner.
- `BOOTSTRAP_OWNER_EMAIL` is optional first-owner bootstrap only and grants nothing after an active owner exists.
- Team invitations have explicit application and delivery states; only the trusted server may call Supabase Auth Admin.
- Referral participants are independent from admin membership and reuse stable `/r/[code]` links plus canonical session acquisition.
- Important admin changes must be auditable: actor, time, action, old value, new value.
- Business records use archive/soft-delete semantics rather than destructive deletion.
- Dashboard stays high-signal: sessions, consented pseudonymous visitors, tracking entries, outbound sessions/rate, engagement depth, contact interest, top source/campaign/destination, traffic classes and time series.
- Default analytics range is 30 days; ranges are today/7/30/90/custom with previous-period comparison.

## Source of truth
This file contains durable product truth. `DESIGN.md` contains visual-system truth. `docs/PRODUCT_DECISIONS.md` contains the detailed approved discovery record. Agents must not silently rewrite these decisions.
