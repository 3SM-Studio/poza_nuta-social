# Admin information architecture

Status: implementation contract, 2026-09-22. ADR: `adrs/ADR-004-SHADCN-SIDEBAR-INFORMATION-ARCHITECTURE.md`.

## Route map

| Group | Route | Polish label | Function |
| --- | --- | --- | --- |
| Analityka | `/admin` | Dashboard | Analytics V2.1 dashboard and date ranges |
| Pozyskanie | `/admin/campaigns` | Kampanie | Campaign configuration |
| Pozyskanie | `/admin/links` | Linki i QR | General owned tracking links and SVG QR |
| Pozyskanie | `/admin/referrals` | Polecenia | Referral leaderboard, participants, and referral links |
| Ustawienia | `/admin/destinations` | Destynacje | Official channel destinations |
| Ustawienia | `/admin/team` | Zespół i dostęp | Active/inactive memberships, pending invitations, and ownership transfer |

No empty Analytics acquisition/assets/placements/journeys, Data Quality, or Settings pages are exposed. Those concepts stay inside existing functional pages until they have real standalone functionality.

## Shell

- `SidebarProvider` owns desktop and mobile state.
- Desktop uses a persistent `Sidebar` with icon collapse, `SidebarRail`, active-route state, and accessible tooltips in collapsed mode.
- Mobile uses the Sidebar primitive's off-canvas sheet and a visible `SidebarTrigger`; the old 2×2 navigation grid is removed.
- `SidebarHeader` says “Poza Nutą” and “Panel administracyjny”; it does not create a second public product name.
- `SidebarFooter` shows current email and role and exposes account/tools actions through shadcn menu buttons.
- `SidebarInset` contains a compact sticky admin toolbar and the page content.

## Route behavior

Deep links render the same shell and mark the longest matching destination active. Viewer-visible destinations remain available; write controls are additionally enforced by Server Actions and database RPCs. No authorization decision relies on navigation visibility.
