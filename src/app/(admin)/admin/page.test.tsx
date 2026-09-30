import { renderToStaticMarkup } from "react-dom/server";
import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ requireAdmin: vi.fn(), dashboard: vi.fn(), activation: vi.fn() }));
vi.mock("@/lib/admin", () => ({ requireAdmin: mocks.requireAdmin }));
vi.mock("@/lib/analytics/server", () => ({ getDashboardRange: mocks.dashboard }));
vi.mock("@/lib/analytics/dashboard-activation", () => ({ getDashboardActivation: mocks.activation }));
vi.mock("@/components/admin/analytics-chart", () => ({ AnalyticsChart: () => null }));

import AdminDashboardPage from "./page";

const dashboard = {
  pageViews: 0, trackingEntries: 0, sessions: 0, visitors: 0, newVisitors: 0, returningVisitors: 0, returningVisitorRate: 0,
  outboundSessions: 0, outboundSessionRate: 0, outboundClicks: 0, clicksPerOutboundSession: 0, multiDestinationSessions: 0,
  multiDestinationSessionRate: 0, returnToHubSessions: 0, returnToHubRate: 0, contactInterestSessions: 0, contactInterestRate: 0,
  contactClickRate: 0, topSources: [], topCampaigns: [], topAssets: [], topPlacements: [], topDestinations: [], topTrackingLinks: [],
  trafficBreakdown: [], timeSeries: [],
};
const participant = { journey: "participant", scope: "business", eligibleSessions: 0, routeViewSessions: 0,
  steps: ["karaoke_cta", "karaoke_view", "current_info_cta", "channels_view"].map((key) => ({ key, sessions: 0 })),
  proofExposures: 0, venueProofExposures: 0 };
const venue = { journey: "venue", scope: "business", eligibleSessions: 0, routeViewSessions: 0,
  steps: ["venue_cta", "venue_view", "contact_cta", "contact_view", "contact_click"].map((key) => ({ key, sessions: 0 })),
  proofExposures: 0, venueProofExposures: 0 };
const acquisition = { scope: "business", consentedSessions: 0, trackingEntryEvents: 0,
  channels: [], distributionUnits: [], referralParticipants: [] };

beforeEach(() => {
  vi.clearAllMocks();
  mocks.requireAdmin.mockResolvedValue({ role: "viewer" });
  mocks.dashboard.mockResolvedValue(dashboard);
  mocks.activation.mockResolvedValue({ participant, venue, acquisition });
});

describe("Admin marketing decision UI", () => {
  it("renders honest zero states with both V3 journeys and no invented rates", async () => {
    const html = renderToStaticMarkup(await AdminDashboardPage({ searchParams: Promise.resolve({ range: "30" }) }));
    expect(html).toContain("Ścieżki marketingowe");
    expect(html).toContain("Uczestnik");
    expect(html).toContain("Lokal / organizator");
    expect(html).toContain("Ukończenie: 0 z 0 sesji · brak bazy");
    expect(html).toContain("0 z 0 sesji · brak bazy");
    expect(html).toContain("Brak sesji ze zgodą w ruchu biznesowym");
    expect(html).toContain("Brak wejść przez linki z przypisaną jednostką dystrybucji");
    expect(html).toContain("0 kliknięć w 0 sesjach z wyjściem · brak bazy");
    expect(html).toContain("Wejścia /r ze zgodą");
    expect(html).not.toContain("Dane ścieżek V3 są niedostępne");
  });

  it("shows small journey counts without a misleading completion percentage", async () => {
    mocks.activation.mockResolvedValue({ participant: { ...participant, routeViewSessions: 1,
      steps: participant.steps.map((step, index) => ({ ...step, sessions: index < 2 ? 1 : 0 })) }, venue, acquisition });
    const html = renderToStaticMarkup(await AdminDashboardPage({ searchParams: Promise.resolve({ range: "7" }) }));
    expect(html).toContain("Ukończenie: 0 z 1 sesji · bez procentu przy małej próbie");
    expect(html).toContain("Wszystkie sesje z widokiem /karaoke");
  });
});
