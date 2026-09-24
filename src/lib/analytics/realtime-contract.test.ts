import { describe, expect, it } from "vitest";
import { REALTIME_METRICS, parseRealtimeWindow, realtimeMetricValue, realtimeModeShare, type RealtimeReport } from "./realtime-contract";

const zero: RealtimeReport = {
  windowStart: "2031-01-10T12:00:00Z", windowEnd: "2031-01-10T12:30:00Z", refreshedAt: "2031-01-10T12:30:00Z",
  totalEvents: 0, cookielessEvents: 0, consentedEvents: 0, consentedSessionsWithActivity: 0,
  eventCounts: {}, topPages: [], observedSources: [], topCampaigns: [], topTrackingLinks: [], topDestinations: [], qualityExceptions: 0,
};

describe("Realtime metric contract", () => {
  it("defines the exact population and source of every primary metric", () => {
    expect(Object.values(REALTIME_METRICS).every((metric) => metric.key && metric.label && metric.population && metric.source && metric.explanation)).toBe(true);
    expect(REALTIME_METRICS.consentedSessionsWithActivity.population).toBe("Wyłącznie consented");
    expect(REALTIME_METRICS.consentedSessionsWithActivity.explanation).not.toMatch(/osoby online/i);
  });

  it("returns zero safely without a fake 0/0 percentage", () => {
    expect(realtimeModeShare(0, 0)).toBe("—");
    for (const key of Object.keys(REALTIME_METRICS) as Array<keyof typeof REALTIME_METRICS>) expect(realtimeMetricValue(zero, key)).toBe(0);
  });

  it("accepts only short rolling windows", () => {
    expect(["5", "30", "60"].map(parseRealtimeWindow)).toEqual([5, 30, 60]);
    for (const invalid of [null, "0", "1440", "30.0", "030", "custom"]) expect(parseRealtimeWindow(invalid)).toBeNull();
  });
});
