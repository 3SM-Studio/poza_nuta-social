import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  quality: vi.fn(async () => {}),
  cookieless: vi.fn(async () => true),
  consented: vi.fn(async () => ({ stored: true })),
  mode: "cookieless" as "cookieless" | "consented",
}));
vi.mock("@/lib/analytics/data-quality", () => ({ recordQualityException: mocks.quality }));
vi.mock("@/lib/cookieless-analytics", () => ({ trackCookielessBestEffort: mocks.cookieless }));
vi.mock("@/lib/analytics/server", () => ({ trackEventBestEffort: mocks.consented }));
vi.mock("@/lib/analytics-mode", () => ({ effectiveAnalyticsMode: async () => mocks.mode }));
vi.mock("@/lib/tracking-context", () => ({ buildTrackingContext: async () => ({ context: {}, cookies: [] }), applyTrackingCookies: vi.fn() }));
vi.mock("@/lib/env", () => ({ getSiteUrl: () => "http://localhost:3000" }));

import { POST } from "@/app/api/track/route";

function request(body: unknown) {
  return new NextRequest("http://localhost:3000/api/track", { method: "POST", body: JSON.stringify(body), headers: { "content-type": "application/json" } });
}
const id = "e1000000-0000-4000-8000-000000000001";

beforeEach(() => {
  mocks.quality.mockReset().mockResolvedValue(undefined);
  mocks.cookieless.mockReset().mockResolvedValue(true);
  mocks.consented.mockReset().mockResolvedValue({ stored: true });
  mocks.mode = "cookieless";
});

describe("track quality outcomes", () => {
  it("records malformed and oversized JSON by fixed reasons", async () => {
    const malformed = new NextRequest("http://localhost:3000/api/track", { method: "POST", body: "{", headers: { "content-type": "application/json" } });
    expect((await POST(malformed)).status).toBe(400);
    expect(mocks.quality).toHaveBeenLastCalledWith({ surface: "api_track", outcome: "rejected", reason: "invalid_json" });
    const oversized = new NextRequest("http://localhost:3000/api/track", { method: "POST", body: "x".repeat(12_001) });
    expect((await POST(oversized)).status).toBe(413);
    expect(mocks.quality).toHaveBeenLastCalledWith({ surface: "api_track", outcome: "rejected", reason: "payload_too_large" });
  });

  it("keeps valid cookieless event in primary ingest only", async () => {
    expect((await POST(request({ eventId: id, eventName: "page_view", path: "/" }))).status).toBe(204);
    expect(mocks.cookieless).toHaveBeenCalledOnce();
    expect(mocks.quality).not.toHaveBeenCalled();
  });

  it("keeps valid consented event in primary ingest only", async () => {
    mocks.mode = "consented";
    expect((await POST(request({ eventId: id, eventName: "page_view", path: "/" }))).status).toBe(204);
    expect(mocks.consented).toHaveBeenCalledOnce();
    expect(mocks.quality).not.toHaveBeenCalled();
  });

  it("records invalid event and payload using reason codes without raw body", async () => {
    expect((await POST(request({ eventId: id, eventName: "mystery", path: "/", email: "secret@example.com" }))).status).toBe(400);
    expect(mocks.quality).toHaveBeenCalledWith({ surface: "api_track", outcome: "rejected", reason: "forbidden_field" });
    expect((await POST(request({ eventId: id, eventName: "mystery", path: "/" }))).status).toBe(400);
    expect(mocks.quality).toHaveBeenLastCalledWith({ surface: "api_track", outcome: "rejected", reason: "invalid_event" });
    expect((await POST(request({ eventId: id, eventName: "contact_click", path: "/kontakt", properties: { contactType: "phone", session_id: "secret" } }))).status).toBe(400);
    expect(mocks.quality).toHaveBeenLastCalledWith({ surface: "api_track", eventName: "contact_click", outcome: "rejected", reason: "invalid_payload" });
    expect(JSON.stringify(mocks.quality.mock.calls)).not.toContain("secret");
  });

  it("rejects invalid path without persisting submitted URL", async () => {
    expect((await POST(request({ eventId: id, eventName: "page_view", path: "/admin?token=secret" }))).status).toBe(400);
    expect(mocks.quality).toHaveBeenCalledWith({ surface: "api_track", mode: "cookieless", eventName: "page_view", outcome: "rejected", reason: "invalid_path" });
    expect(JSON.stringify(mocks.quality.mock.calls)).not.toContain("secret");
  });

  it("preserves consented page path normalization to the canonical homepage", async () => {
    mocks.mode = "consented";
    expect((await POST(request({ eventId: id, eventName: "page_view", path: "/admin?token=secret" }))).status).toBe(204);
    expect(mocks.consented).toHaveBeenCalledWith(expect.objectContaining({ eventName: "page_view", path: "/" }));
    expect(mocks.quality).not.toHaveBeenCalled();
  });

  it("reports canonical event/path mismatch as invalid_path", async () => {
    expect((await POST(request({ eventId: id, eventName: "contact_view", path: "/" }))).status).toBe(400);
    expect(mocks.quality).toHaveBeenCalledWith({ surface: "api_track", eventName: "contact_view", outcome: "rejected", reason: "invalid_path" });
  });

  it("records the current cookieless-only filter", async () => {
    const properties = { priorDestination: "instagram", resumeSignal: "pageshow", elapsedBucket: "2-10s", bfcache: false };
    expect((await POST(request({ eventId: id, eventName: "hub_resumed", path: "/", properties }))).status).toBe(204);
    expect(mocks.cookieless).not.toHaveBeenCalled();
    expect(mocks.quality).toHaveBeenCalledWith({ surface: "api_track", mode: "cookieless", eventName: "hub_resumed", outcome: "filtered", reason: "unsupported_mode" });
  });

  it("does not let spoofed project or identity enter a quality record", async () => {
    expect((await POST(request({ eventId: id, eventName: "page_view", path: "/", project_key: "other", visitor_id: "visitor", session_id: "session" }))).status).toBe(400);
    expect(mocks.quality).toHaveBeenCalledWith({ surface: "api_track", outcome: "rejected", reason: "forbidden_field" });
    expect(JSON.stringify(mocks.quality.mock.calls)).not.toMatch(/other|visitor|session/);
  });

  it("keeps public response successful when primary ingest fails", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    mocks.cookieless.mockRejectedValueOnce(new Error("database down"));
    expect((await POST(request({ eventId: id, eventName: "page_view", path: "/" }))).status).toBe(204);
    vi.restoreAllMocks();
  });
});
