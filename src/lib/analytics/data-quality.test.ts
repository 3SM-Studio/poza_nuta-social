import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  insert: vi.fn(async (row: Record<string, unknown>) => { void row; return { error: null as { message: string } | null }; }),
  rpc: vi.fn(async () => ({ data: null, error: null })),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ from: () => ({ insert: mocks.insert }), rpc: mocks.rpc }) }));

import { recordQualityException } from "./data-quality";
import { ANALYTICS_PROJECT_KEY } from "../analytics-project";

beforeEach(() => { mocks.insert.mockClear(); mocks.rpc.mockClear(); });

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
