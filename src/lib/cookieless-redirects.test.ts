import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const mocks = vi.hoisted(() => ({
  ingest: vi.fn(async () => { throw new Error("database-unavailable"); }),
  findLink: vi.fn(async () => ({ code: "ZYWVC", landing_path: "/", id: crypto.randomUUID() })),
  destinations: vi.fn(async () => [{ id: crypto.randomUUID(), slug: "instagram", url: "https://www.instagram.com/poza.nuta/" }]),
}));

vi.mock("@/lib/analytics-mode", () => ({ effectiveAnalyticsMode: async () => "cookieless" }));
vi.mock("@/lib/cookieless-analytics", () => ({ trackCookielessBestEffort: mocks.ingest }));
vi.mock("@/lib/analytics", () => ({ findTrackingLinkByCode: mocks.findLink, trackEventBestEffort: vi.fn() }));
vi.mock("@/lib/destinations", () => ({ getPublicDestinations: mocks.destinations }));
vi.mock("@/lib/env", () => ({ getSiteUrl: () => "http://localhost:3000" }));

import { GET as trackingEntry } from "@/app/r/[code]/route";
import { GET as outbound } from "@/app/go/[slug]/route";

afterEach(() => vi.restoreAllMocks());

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
