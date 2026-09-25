import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  available: true,
  insert: vi.fn(async (row: Record<string, unknown>) => { void row; return { error: null as { message: string } | null }; }),
  rpc: vi.fn(async (): Promise<{ data: unknown; error: { message: string } | null }> => ({ data: null, error: null })),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => mocks.available ? { from: () => ({ insert: mocks.insert }), rpc: mocks.rpc } : null }));

import { getDataQualityReport, recordQualityException, type DataQualityReport } from "./data-quality";
import { ANALYTICS_PROJECT_KEY } from "../analytics-project";

beforeEach(() => { mocks.available = true; mocks.insert.mockClear(); mocks.rpc.mockReset(); });
afterEach(() => vi.restoreAllMocks());

describe("analytics quality privacy boundary", () => {
  it("writes only controlled columns and server-owned project context", async () => {
    await recordQualityException({ surface: "api_track", outcome: "rejected", reason: "forbidden_field" });
    expect(mocks.insert).toHaveBeenCalledOnce();
    expect(mocks.insert.mock.calls[0][0]).toEqual({
      project_key: ANALYTICS_PROJECT_KEY, surface: "api_track", mode: null,
      event_name: null, path: null, outcome: "rejected", reason: "forbidden_field",
    });
    expect(JSON.stringify(mocks.insert.mock.calls[0][0])).not.toMatch(/visitor_id|session_id|email|phone|payload|referrer|user-agent/i);
  });

  it("does not persist an unvalidated path", async () => {
    await recordQualityException({ surface: "api_track", eventName: "page_view", path: "/admin?token=secret", outcome: "rejected", reason: "invalid_path" });
    expect(mocks.insert.mock.calls[0][0]).toHaveProperty("path", null);
  });

  it("swallows quality storage failure", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.insert.mockRejectedValueOnce(new Error("database down"));
    await expect(recordQualityException({ surface: "api_track", outcome: "duplicate", reason: "idempotent_retry" })).resolves.toBeUndefined();
    vi.restoreAllMocks();
  });
});

const zeroReport: DataQualityReport = {
  persistedTotal: 0, persistedCookieless: 0, persistedConsented: 0,
  rejected: 0, duplicates: 0, filtered: 0, contractDrift: 0,
  rejectionReasons: [], eventNames: [],
};
const read = () => getDataQualityReport("2034-03-10", "2034-03-11");

describe("Data Quality RPC read boundary", () => {
  it("accepts a legitimate zero report and populated report", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: zeroReport, error: null });
    await expect(read()).resolves.toEqual(zeroReport);
    const populated = { ...zeroReport, persistedTotal: 3, persistedCookieless: 1, persistedConsented: 2,
      rejected: 1, contractDrift: 1, rejectionReasons: [{ reason: "future_reason", count: 1 }],
      eventNames: [{ eventName: "page_view", count: 2 }, { eventName: "unknown_drift_name", count: 1 }] };
    mocks.rpc.mockResolvedValueOnce({ data: populated, error: null });
    await expect(read()).resolves.toEqual(populated);
  });

  it.each([
    null,
    [],
    { ...zeroReport, persistedTotal: undefined },
    { ...zeroReport, persistedTotal: "0" },
    { ...zeroReport, rejected: -1 },
    { ...zeroReport, persistedTotal: 1 },
    { ...zeroReport, rejectionReasons: null },
    { ...zeroReport, rejectionReasons: [{ reason: "invalid_path" }] },
    { ...zeroReport, rejectionReasons: [{ reason: " ", count: 0 }] },
    { ...zeroReport, rejectionReasons: [{ reason: "invalid_path", count: 1 }] },
    { ...zeroReport, eventNames: [{ eventName: "page_view", count: "1" }] },
    { ...zeroReport, eventNames: [{ eventName: "page_view", count: 1 }] },
  ])("treats malformed successful payload %# as unavailable", async (data) => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockResolvedValueOnce({ data, error: null });
    await expect(read()).resolves.toBeNull();
  });

  it("treats RPC failure and missing admin client as unavailable", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.rpc.mockResolvedValueOnce({ data: zeroReport, error: { message: "RPC failed" } });
    await expect(read()).resolves.toBeNull();
    mocks.available = false;
    await expect(read()).resolves.toBeNull();
  });
});
