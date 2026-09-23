# Referral model

Status: implementation contract, 2026-09-22. ADR: `adrs/ADR-003-REFERRAL-PARTICIPANT-SEPARATION.md`.

## Participant boundary

`referral_participants` is a controlled attribution dimension, not admin membership. A participant has a stable UUID, display name, explicit active/inactive status, optional linked Auth/admin user ID, and timestamps. A participant can have no admin access; an admin can have no participant. Names are data and are never hardcoded in business logic.

## Tracking link integration

A referral link is an existing `tracking_links` row with:

- `channel_group = 'referral'`;
- `source = 'team'`;
- `medium = 'referral'`;
- `referral_participant_id` referencing the controlled participant;
- the existing opaque 5–7 character `/r/[code]` code.

There is no second redirect engine and no person-name taxonomy in `source`. The participant must be active when a new link is created. Existing links can be deactivated through current tracking-link semantics.

## Acquisition and snapshots

`trackingAcquisition` adds stable `referralParticipantId` to the owned acquisition context. `trackEvent` adds `referralParticipantLabel` to immutable event dimension snapshots. The existing owned-link precedence and canonical session acquisition trigger then apply unchanged.

One eligible session has one referral acquisition owner because the leaderboard reads `analytics_sessions_v2.session_acquisition`, never all attributed events. Later referral touches remain journey evidence and cannot double-credit the session.

Visitor first acquisition uses the immutable `analytics_visitors.first_acquisition`. A consented browser context first acquired by participant A remains visitor-first A even if a later independent session is acquired by participant B.

Participant rename, deactivation, link rename, campaign rename, or account unlink never changes stable participant IDs or old event snapshots. Period reporting groups by stable participant ID and uses the acquisition snapshot label for historical display.

## Lifecycle

Participants are soft-deactivated, not deleted. Linking/unlinking an account changes convenience/lineage only and never changes historical attribution or admin authorization.
