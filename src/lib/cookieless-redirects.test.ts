import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  mode: "cookieless" as "cookieless" | "consented",
  ingest: vi.fn(async () => { throw new Error("database-unavailable"); }),
  fullIngest: vi.fn(async () => { throw new Error("database-unavailable"); }),
  findLink: vi.fn(async () => ({ code: "ZYWVC", landing_path: "/", id: crypto.randomUUID() })),
  destinations: vi.fn(async () => [{ id: crypto.randomUUID(), slug: "instagram", url: "https://www.instagram.com/poza.nuta/" }]),
}));

vi.mock("@/lib/analytics-mode", () => ({ effectiveAnalyticsMode: async () => mocks.mode }));
vi.mock("@/lib/cookieless-analytics", () => ({ trackCookielessBestEffort: mocks.ingest }));
vi.mock("@/lib/analytics/server", () => ({ findTrackingLinkByCode: mocks.findLink, trackEventBestEffort: mocks.fullIngest }));
vi.mock("@/lib/destinations", () => ({ getPublicDestinations: mocks.destinations }));
vi.mock("@/lib/env", () => ({ getSiteUrl: () => "http://localhost:3000" }));
vi.mock("@/lib/tracking-context", () => ({ buildTrackingContext: async () => ({ context: {}, cookies: [] }), applyTrackingCookies: vi.fn() }));

import { GET as trackingEntry } from "@/app/r/[code]/route";
import { GET as outbound } from "@/app/go/[slug]/route";

afterEach(() => { vi.restoreAllMocks(); mocks.mode = "cookieless"; });

describe("cookieless redirect failure handling", () => {
  it("redirects tracking entry even when ingest throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await trackingEntry(new NextRequest("http://localhost:3000/r/ZYWVC"), { params: Promise.resolve({ code: "ZYWVC" }) });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
    expect(mocks.ingest).toHaveBeenCalledWith(expect.objectContaining({ eventName: "tracking_entry" }));
  });

  it("redirects outbound choice even when ingest throws", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await outbound(new NextRequest("http://localhost:3000/go/instagram"), { params: Promise.resolve({ slug: "instagram" }) });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("instagram.com");
    expect(mocks.ingest).toHaveBeenCalledWith(expect.objectContaining({ eventName: "outbound_click" }));
  });
});

describe("consented redirect failure handling", () => {
  it("redirects tracking entry even when full ingest throws", async () => {
    mocks.mode = "consented";
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await trackingEntry(new NextRequest("http://localhost:3000/r/ZYWVC"), { params: Promise.resolve({ code: "ZYWVC" }) });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toBe("http://localhost:3000/");
    expect(mocks.fullIngest).toHaveBeenCalledWith(expect.objectContaining({ eventName: "tracking_entry" }));
  });

  it("redirects outbound choice even when full ingest throws", async () => {
    mocks.mode = "consented";
    vi.spyOn(console, "error").mockImplementation(() => {});
    const response = await outbound(new NextRequest("http://localhost:3000/go/instagram"), { params: Promise.resolve({ slug: "instagram" }) });
    expect(response.status).toBe(302);
    expect(response.headers.get("location")).toContain("instagram.com");
    expect(mocks.fullIngest).toHaveBeenCalledWith(expect.objectContaining({ eventName: "outbound_click" }));
  });
});
