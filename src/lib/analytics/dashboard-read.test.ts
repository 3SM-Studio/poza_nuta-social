import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ client: vi.fn(), rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.client }));

import { getDashboardRange } from "./server";

const emptyDashboard = {
  pageViews: 0, trackingEntries: 0, sessions: 0, visitors: 0, newVisitors: 0, returningVisitors: 0, returningVisitorRate: 0,
  outboundSessions: 0, outboundSessionRate: 0, outboundClicks: 0, clicksPerOutboundSession: 0, multiDestinationSessions: 0,
  multiDestinationSessionRate: 0, returnToHubSessions: 0, returnToHubRate: 0, contactInterestSessions: 0, contactInterestRate: 0,
  contactClickRate: 0, topSources: [], topCampaigns: [], topAssets: [], topPlacements: [], topDestinations: [], topTrackingLinks: [],
  trafficBreakdown: [], timeSeries: [],
};

describe("Admin dashboard read", () => {
  beforeEach(() => {
    mocks.client.mockReset().mockReturnValue({ rpc: mocks.rpc });
    mocks.rpc.mockReset();
  });

  it("keeps successful metrics and rankings", async () => {
    mocks.rpc.mockResolvedValue({ data: { ...emptyDashboard, sessions: 5, topSources: [{ label: "QR", value: 5 }] }, error: null });
    await expect(getDashboardRange("2026-09-01", "2026-10-01")).resolves.toMatchObject({ sessions: 5, topSources: [{ label: "QR", value: 5 }] });
  });

  it("keeps a legitimate successful zero", async () => {
    mocks.rpc.mockResolvedValue({ data: emptyDashboard, error: null });
    await expect(getDashboardRange("2026-09-01", "2026-10-01")).resolves.toEqual(emptyDashboard);
  });

  it("does not turn a missing client into zero", async () => {
    mocks.client.mockReturnValue(null);
    await expect(getDashboardRange("2026-09-01", "2026-10-01")).resolves.toBeNull();
  });

  it("does not turn an RPC failure into zero", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockResolvedValue({ data: null, error: new Error("offline") });
    await expect(getDashboardRange("2026-09-01", "2026-10-01")).resolves.toBeNull();
    vi.restoreAllMocks();
  });

  it("does not turn an incomplete or malformed RPC response into zero", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockResolvedValueOnce({ data: {}, error: null });
    await expect(getDashboardRange("2026-09-01", "2026-10-01")).resolves.toBeNull();
    mocks.rpc.mockResolvedValueOnce({ data: { ...emptyDashboard, topSources: null }, error: null });
    await expect(getDashboardRange("2026-09-01", "2026-10-01")).resolves.toBeNull();
    vi.restoreAllMocks();
  });
});
