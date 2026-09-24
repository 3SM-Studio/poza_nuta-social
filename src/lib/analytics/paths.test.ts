import { describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ rpc: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }));

import { getPathsReport } from "./paths";

describe("server-owned Paths read", () => {
  it("passes a closed scope, range and path as RPC parameters", async () => {
    const report = { scope: "business", nodeType: "page", maxDepth: 3, rankingLimit: 10,
      pathSessions: 0, selectedSessions: 0, selectedPath: "/kontakt", noNextInRange: 0, noPreviousInRange: 0,
      entries: [], shortPaths: [], next: [], previous: [] };
    mocks.rpc.mockResolvedValueOnce({ data: report, error: null });
    await expect(getPathsReport("2032-04-08", "2032-04-09", "business", "/kontakt")).resolves.toBe(report);
    expect(mocks.rpc).toHaveBeenCalledWith("analytics_paths_v1", {
      p_from_date: "2032-04-08", p_to_date_exclusive: "2032-04-09", p_scope: "business", p_path: "/kontakt",
    });
  });

  it("keeps read errors distinct from zero activity", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockResolvedValueOnce({ data: null, error: new Error("offline") });
    await expect(getPathsReport("2032-04-08", "2032-04-09", "business", null)).resolves.toBeNull();
    vi.restoreAllMocks();
  });
});
