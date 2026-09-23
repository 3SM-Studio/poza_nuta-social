import { describe, expect, it } from "vitest";
import { ga4Eligible, marketingSinkEligible } from "./external-analytics";
import type { TrackingContext } from "./tracking-context";
import { DIRECT_ACQUISITION } from "./analytics-taxonomy";

const base: TrackingContext = {
  environment: "production", trafficClass: "external", consent: { analytics: true, marketing: false },
  identity: { visitorId: "67a593f7-55d4-4dc5-b720-cf9ccdf09c9c", sessionId: "6232a92a-95f0-465f-90c6-432c3699a76d" },
  observed: DIRECT_ACQUISITION, attributionCandidate: DIRECT_ACQUISITION, device: { deviceType: "desktop", browserFamily: "other", osFamily: "other" },
};

describe("external analytics eligibility", () => {
  it("allows GA4 only for consented production external traffic", () => {
    expect(ga4Eligible(base)).toBe(true);
    for (const trafficClass of ["internal", "test", "bot"] as const) expect(ga4Eligible({ ...base, trafficClass })).toBe(false);
    for (const environment of ["preview", "staging", "development"] as const) expect(ga4Eligible({ ...base, environment })).toBe(false);
    expect(ga4Eligible({ ...base, consent: { analytics: false, marketing: false } })).toBe(false);
  });
  it("keeps future marketing sinks behind marketing consent", () => {
    expect(marketingSinkEligible(base)).toBe(false);
    expect(marketingSinkEligible({ ...base, consent: { analytics: true, marketing: true } })).toBe(true);
    expect(marketingSinkEligible({ ...base, trafficClass: "test", consent: { analytics: false, marketing: true } })).toBe(false);
    expect(marketingSinkEligible({ ...base, environment: "preview", consent: { analytics: false, marketing: true } })).toBe(false);
  });
});
