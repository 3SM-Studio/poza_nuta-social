<!-- impeccable:product-schema 1 -->
# Poza Nutą — product truth

## Product
This repository is an independent Poza Nutą application. It is not a Stage module, not a shared dashboard module, and does not share database, authentication, deployment, or runtime dependencies with any other Poza Nutą product.

## Root-domain direction — owner decision, 2026-09-24
This codebase is the Poza Nutą marketing site prepared for the future canonical origin `https://pozanuta.pl`. `/linki` holds the compact official-links hub; the homepage introduces the brand, karaoke, and collaboration. The future role of `socials.pozanuta.pl` is undecided. The local EU privacy slice gates public analytics on versioned consent and adds `/cookies`; controller, deployment and retention facts still require confirmation before production. Domain deployment, hosting, legal sign-off and WCAG 2.2 AA remain separate work.

## Overview
The public surface is the main marketing site for Poza Nutą. It serves two equally legitimate audiences:

1. people looking for Poza Nutą karaoke, musical events, and current information;
2. venues and organizers interested in collaboration and direct contact.

The homepage explains the brand and directs visitors to useful details. `/linki` keeps official channels fast to reach, especially from bio links. Attribution and analytics run invisibly underneath both.

## Primary outcome
A visitor should understand what Poza Nutą does in Trójmiasto and find a clear path to karaoke information, collaboration, contact, or official channels.

## Product boundaries
- Public name: **Poza Nutą**. Never expose “Poza Nutą Social” as the product name to visitors.
- Geographic wording: **Trójmiasto**. Do not make Gdynia the primary public location label.
- `/linki` is not a generic Linktree clone or generic link-builder SaaS.
- No Stage CTA in the current scope.
- No “nearest karaoke” or event integration in the current scope.
- Do not invent arbitrary CTA types. `/linki` is for official Poza Nutą channels plus contact/collaboration.
- Final marketing slogan is intentionally **TBD**. Do not hard-code a temporary slogan as brand truth.

## Public information hierarchy
1. `/`: Poza Nutą identity and factual introduction to karaoke and musical events in Trójmiasto.
2. `/karaoke-trojmiasto`: information for participants and where to find current dates and places.
3. `/dla-lokali`: collaboration information for venues and organizers.
4. `/kontakt`: one first-party contact route.
5. `/linki`: compact official destinations from the existing destination model, with Instagram first and TikTok second when active.
6. `/prywatnosc`: privacy information and consent controls, with deployment-specific facts guarded before publication.
7. `/cookies`: canonical browser storage inventory and consent controls.

## Visual constraints
- Mobile-first, with an editorial desktop homepage and a deliberately narrow `/linki` layout.
- Dark-first.
- Pink is the main accent, not a full-page background.
- No theme toggle in MVP.
- No photography on the public homepage.
- No decorative gradients.
- One or two actions may receive stronger emphasis, but `/linki` must remain structurally consistent.

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
