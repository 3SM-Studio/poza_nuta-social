import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ client: vi.fn(), rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.client }));

import { ANALYTICS_PROJECT_KEY } from "@/lib/analytics-project";
import { getRealtimeReport } from "./realtime";

const empty = {
  scope: "business", windowStart: "2031-01-10T12:00:00Z", windowEnd: "2031-01-10T12:30:00Z", refreshedAt: "2031-01-10T12:30:00Z",
  totalEvents: 0, cookielessEvents: 0, consentedEvents: 0, consentedSessionsWithActivity: 0, eventCounts: {},
  topPages: [], observedSources: [], topCampaigns: [], topTrackingLinks: [], topDestinations: [], qualityExceptions: 0,
};

beforeEach(() => {
  mocks.client.mockReset().mockReturnValue({ rpc: mocks.rpc });
  mocks.rpc.mockReset();
});

describe("server-owned Realtime read", () => {
  it("passes only canonical project, closed window and exact timestamp to the RPC", async () => {
    const report = { ...empty, totalEvents: 1, cookielessEvents: 1, eventCounts: { page_view: 1 } };
    mocks.rpc.mockResolvedValueOnce({ data: report, error: null });
    await expect(getRealtimeReport(30, "business", new Date("2031-01-10T12:30:00Z"))).resolves.toBe(report);
    expect(mocks.rpc).toHaveBeenCalledWith("analytics_realtime_v2", {
      p_project_key: ANALYTICS_PROJECT_KEY, p_minutes: 30, p_now: "2031-01-10T12:30:00.000Z", p_scope: "business",
    });
  });

  it("returns unavailable on a read failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error("offline") });
    await expect(getRealtimeReport(30)).resolves.toBeNull();
    vi.restoreAllMocks();
  });

  it("keeps a legitimate empty window and rejects an incomplete response", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: empty, error: null });
    await expect(getRealtimeReport(30, "business", new Date("2031-01-10T12:30:00Z"))).resolves.toBe(empty);
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockResolvedValueOnce({ data: { scope: "business" }, error: null });
    await expect(getRealtimeReport(30, "business", new Date("2031-01-10T12:30:00Z"))).resolves.toBeNull();
    mocks.rpc.mockResolvedValueOnce({ data: { ...empty, windowStart: "2031-01-10T11:59:00Z",
      windowEnd: "2031-01-10T12:29:00Z", refreshedAt: "2031-01-10T12:29:00Z" }, error: null });
    await expect(getRealtimeReport(30, "business", new Date("2031-01-10T12:30:00Z"))).resolves.toBeNull();
    vi.restoreAllMocks();
  });

  it("returns unavailable when the admin client is missing", async () => {
    mocks.client.mockReturnValueOnce(null);
    await expect(getRealtimeReport(30)).resolves.toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });
});
