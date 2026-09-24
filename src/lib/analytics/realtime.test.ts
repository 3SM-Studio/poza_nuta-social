import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }));

import { ANALYTICS_PROJECT_KEY } from "@/lib/analytics-project";
import { getRealtimeReport } from "./realtime";

describe("server-owned Realtime read", () => {
  it("passes only canonical project, closed window and exact timestamp to the RPC", async () => {
    const report = { scope: "business", totalEvents: 1 };
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
});
