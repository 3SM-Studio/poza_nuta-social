import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const gate = vi.hoisted(() => ({ allowed: false }));
vi.mock("../consent-analytics-gate", () => ({ analyticsAllowed: () => gate.allowed }));

import { track, trackPageEntry } from "./client";

const fetchMock = vi.fn(async (input: RequestInfo | URL, init?: RequestInit) => {
  void input;
  void init;
  return { ok: true };
});
const beaconMock = vi.fn(() => false);

beforeEach(() => {
  gate.allowed = false;
  fetchMock.mockClear();
  beaconMock.mockClear();
  vi.stubGlobal("window", { location: { pathname: "/kontakt" } });
  vi.stubGlobal("document", { referrer: "https://instagram.com/poza.nuta" });
  vi.stubGlobal("navigator", { sendBeacon: beaconMock });
  vi.stubGlobal("fetch", fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

function bodies() {
  return fetchMock.mock.calls.map((call) => JSON.parse((call[1] as RequestInit).body as string) as Record<string, unknown>);
}

describe("browser analytics transport", () => {
  it("sends one event with a fresh ID, without client-owned project or identity fields", async () => {
    track("contact_click", { contactType: "email" });
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(beaconMock).not.toHaveBeenCalled();
    expect(bodies()[0]).toMatchObject({ eventName: "contact_click", path: "/kontakt", properties: { contactType: "email" } });
    expect(bodies()[0].eventId).toMatch(/^[0-9a-f-]{36}$/);
    expect(bodies()[0]).not.toHaveProperty("project_key");
    expect(bodies()[0]).not.toHaveProperty("visitorId");
    expect(bodies()[0]).not.toHaveProperty("sessionId");
  });

  it("does not send unsupported names or properties even from untyped callers", () => {
    track("unsupported" as never);
    track("page_view", { arbitrary: "x" } as never);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("keeps the consent-only hub resume event out of unknown, rejected and pending states", async () => {
    const properties = { priorDestination: "instagram", resumeSignal: "pageshow", elapsedBucket: "2-10s", bfcache: false } as const;
    for (const state of ["unknown", "rejected", "pending-accept", "withdrawn"]) {
      expect(gate.allowed, state).toBe(false);
      track("hub_resumed", properties);
    }
    expect(fetchMock).not.toHaveBeenCalled();
    gate.allowed = true;
    track("hub_resumed", properties);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
  });

  it("sends page entries once per call with current UTM and no stale referrer on navigation", async () => {
    trackPageEntry("/", "utm_source=instagram", true);
    trackPageEntry("/linki", "", false);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(bodies()).toHaveLength(2);
    expect(bodies()[0]).toMatchObject({ path: "/", referrer: "https://instagram.com/poza.nuta", utmSource: "instagram" });
    expect(bodies()[1]).toMatchObject({ path: "/linki", referrer: null, utmSource: null });
    expect(new Set(bodies().map((body) => body.eventId)).size).toBe(2);
  });

  it("keeps CTA, destination view and contact view in dispatch order without duplicate CTA", async () => {
    let finishCta: (() => void) | undefined;
    fetchMock.mockImplementationOnce(() => new Promise((resolve) => { finishCta = () => resolve({ ok: true }); }));
    gate.allowed = true;
    window.location.pathname = "/dla-lokali";
    track("cta_click", { ctaId: "venues.closing_contact" });
    window.location.pathname = "/kontakt";
    trackPageEntry("/kontakt", "", false);
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    expect(bodies()[0]).toMatchObject({ eventName: "cta_click", path: "/dla-lokali" });
    finishCta?.();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(3));
    expect(bodies().map((body) => body.eventName)).toEqual(["cta_click", "page_view", "contact_view"]);
    expect(bodies().every((body) => typeof body.eventId === "string")).toBe(true);
    expect(new Set(bodies().map((body) => body.eventId)).size).toBe(3);
    expect(fetchMock.mock.calls.every((call) => (call[1] as RequestInit).keepalive === true)).toBe(true);
    expect(beaconMock).not.toHaveBeenCalled();
  });

  it("swallows synchronous and async transport failures", async () => {
    expect(() => track("contact_click", { contactType: "email" })).not.toThrow();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(1));
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect(() => track("contact_click", { contactType: "email" })).not.toThrow();
    await vi.waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
  });
});
