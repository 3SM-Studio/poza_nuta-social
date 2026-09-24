import { beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  rpc: vi.fn(async () => ({ data: null as unknown, error: null as unknown })),
  quality: vi.fn(async () => {}),
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({ rpc: mocks.rpc }) }));
vi.mock("@/lib/analytics/data-quality", () => ({ recordQualityException: mocks.quality }));
vi.mock("@/lib/env", () => ({ getSiteUrl: () => "http://localhost:3000" }));

import { trackEvent } from "./server";
import { trackCookielessBestEffort } from "@/lib/cookieless-analytics";
import type { TrackingContext } from "@/lib/tracking-context";

beforeEach(() => { mocks.rpc.mockReset(); mocks.quality.mockReset().mockResolvedValue(undefined); });

describe("duplicate quality instrumentation", () => {
  it("recognizes consented RPC duplicate without another primary write", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { stored: true, duplicate: true }, error: null });
    const result = await trackEvent({
      eventId: "e1000000-0000-4000-8000-000000000001", eventName: "page_view", path: "/", qualitySurface: "api_track",
      context: {
        consent: { analytics: true, marketing: false }, identity: { sessionId: "e2000000-0000-4000-8000-000000000001", visitorId: null },
        environment: "development", trafficClass: "external", observed: {}, attributionCandidate: {}, device: {},
      } as unknown as TrackingContext,
    });
    expect(result.stored).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.quality).toHaveBeenCalledWith({ surface: "api_track", mode: "consented", eventName: "page_view", outcome: "duplicate", reason: "idempotent_retry" });
  });

  it("recognizes cookieless RPC false as duplicate", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: false, error: null });
    const result = await trackCookielessBestEffort({
      eventId: "e1000000-0000-4000-8000-000000000001", eventName: "page_view", path: "/",
      request: new NextRequest("http://localhost:3000/"), qualitySurface: "api_track",
    });
    expect(result).toBe(true);
    expect(mocks.rpc).toHaveBeenCalledOnce();
    expect(mocks.quality).toHaveBeenCalledWith({ surface: "api_track", mode: "cookieless", eventName: "page_view", outcome: "duplicate", reason: "idempotent_retry" });
  });

  it("quality write failure does not reclassify a persisted event", async () => {
    mocks.rpc.mockResolvedValueOnce({ data: { stored: true, duplicate: true }, error: null });
    mocks.quality.mockRejectedValueOnce(new Error("quality unavailable"));
    // A thrown mock tests the caller's second fail-open boundary.
    const context = { consent: { analytics: true }, identity: { sessionId: "e2000000-0000-4000-8000-000000000001", visitorId: null }, environment: "development", trafficClass: "external", observed: {}, attributionCandidate: {}, device: {} } as unknown as TrackingContext;
    await expect(trackEvent({ eventId: "e1000000-0000-4000-8000-000000000001", eventName: "page_view", path: "/", qualitySurface: "api_track", context })).resolves.toMatchObject({ stored: true });
  });
});
