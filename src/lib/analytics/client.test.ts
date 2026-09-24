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
  it("sends one event with a fresh ID, without client-owned project or identity fields", () => {
    track("contact_click", { contactType: "email" });
    expect(beaconMock).toHaveBeenCalledTimes(1);
    expect(fetchMock).toHaveBeenCalledTimes(1);
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

  it("keeps the consent-only hub resume event out of unknown, rejected and pending states", () => {
    const properties = { priorDestination: "instagram", resumeSignal: "pageshow", elapsedBucket: "2-10s", bfcache: false } as const;
    for (const state of ["unknown", "rejected", "pending-accept", "withdrawn"]) {
      expect(gate.allowed, state).toBe(false);
      track("hub_resumed", properties);
    }
    expect(fetchMock).not.toHaveBeenCalled();
    gate.allowed = true;
    track("hub_resumed", properties);
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it("sends page entries once per call with current UTM and no stale referrer on navigation", () => {
    trackPageEntry("/", "utm_source=instagram", true);
    trackPageEntry("/linki", "", false);
    expect(bodies()).toHaveLength(2);
    expect(bodies()[0]).toMatchObject({ path: "/", referrer: "https://instagram.com/poza.nuta", utmSource: "instagram" });
    expect(bodies()[1]).toMatchObject({ path: "/linki", referrer: null, utmSource: null });
    expect(new Set(bodies().map((body) => body.eventId)).size).toBe(2);
  });

  it("swallows synchronous and async transport failures", () => {
    beaconMock.mockImplementation(() => { throw new Error("beacon unavailable"); });
    expect(() => track("contact_click", { contactType: "email" })).not.toThrow();
    expect(fetchMock).toHaveBeenCalledTimes(1);
    beaconMock.mockImplementation(() => false);
    fetchMock.mockRejectedValueOnce(new Error("offline"));
    expect(() => track("contact_click", { contactType: "email" })).not.toThrow();
  });
});
