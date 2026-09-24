import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ access: vi.fn(), report: vi.fn() }));
vi.mock("@/lib/admin", () => ({ getAdminAccess: mocks.access }));
vi.mock("@/lib/analytics/realtime", () => ({ getRealtimeReport: mocks.report }));

import { GET } from "./route";

beforeEach(() => { mocks.access.mockReset(); mocks.report.mockReset(); });

describe("admin Realtime polling endpoint", () => {
  it("denies unauthenticated reads before querying storage", async () => {
    mocks.access.mockResolvedValue(null);
    const response = await GET(new Request("http://localhost/admin/realtime/data?window=30"));
    expect(response.status).toBe(401);
    expect(mocks.report).not.toHaveBeenCalled();
  });

  it("permits read-only viewers and offers no write method", async () => {
    mocks.access.mockResolvedValue({ role: "viewer" });
    mocks.report.mockResolvedValue({ totalEvents: 0 });
    const response = await GET(new Request("http://localhost/admin/realtime/data?window=30"));
    expect(response.status).toBe(200);
    expect(mocks.report).toHaveBeenCalledWith(30);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
  });

  it("rejects arbitrary filters, duplicate windows and unsupported values", async () => {
    mocks.access.mockResolvedValue({ role: "viewer" });
    for (const query of ["window=1440", "window=30&window=5", "window=30&project_key=other", "window=30&filter=bot"]) {
      expect((await GET(new Request(`http://localhost/admin/realtime/data?${query}`))).status).toBe(400);
    }
    expect(mocks.report).not.toHaveBeenCalled();
  });

  it("returns an explicit unavailable state after storage failure", async () => {
    mocks.access.mockResolvedValue({ role: "owner" });
    mocks.report.mockResolvedValue(null);
    expect((await GET(new Request("http://localhost/admin/realtime/data?window=5"))).status).toBe(503);
  });
});
