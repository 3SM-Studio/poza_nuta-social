import { describe, expect, it } from "vitest";
import { REALTIME_METRICS, isRealtimeReport, parseRealtimeWindow, realtimeMetricValue, realtimeModeShare, realtimeMetricPopulation, type RealtimeReport } from "./realtime-contract";
import { parseReportingScope } from "./reporting-scope";

const zero: RealtimeReport = {
  scope: "business",
  windowStart: "2031-01-10T12:00:00Z", windowEnd: "2031-01-10T12:30:00Z", refreshedAt: "2031-01-10T12:30:00Z",
  totalEvents: 0, cookielessEvents: 0, consentedEvents: 0, consentedSessionsWithActivity: 0,
  eventCounts: {}, topPages: [], observedSources: [], topCampaigns: [], topTrackingLinks: [], topDestinations: [], qualityExceptions: 0,
};
const now = new Date("2031-01-10T12:30:00Z");

describe("Realtime metric contract", () => {
  it("defines the exact population and source of every primary metric", () => {
    expect(Object.values(REALTIME_METRICS).every((metric) => metric.key && metric.label && metric.population && metric.source && metric.explanation)).toBe(true);
    expect(REALTIME_METRICS.consentedSessionsWithActivity.population).toBe("Wyłącznie consented");
    expect(REALTIME_METRICS.consentedSessionsWithActivity.explanation).not.toMatch(/osoby online/i);
    expect(realtimeMetricPopulation("events", "business")).toContain("ruch biznesowy");
    expect(realtimeMetricPopulation("events", "diagnostic")).toContain("diagnostyka");
  });

  it("returns zero safely without a fake 0/0 percentage", () => {
    expect(realtimeModeShare(0, 0)).toBe("—");
    for (const key of Object.keys(REALTIME_METRICS) as Array<keyof typeof REALTIME_METRICS>) expect(realtimeMetricValue(zero, key)).toBe(0);
  });

  it("accepts only short rolling windows", () => {
    expect(["5", "30", "60"].map(parseRealtimeWindow)).toEqual([5, 30, 60]);
    for (const invalid of [null, "0", "1440", "30.0", "030", "custom"]) expect(parseRealtimeWindow(invalid)).toBeNull();
  });

  it("accepts only the two reporting populations", () => {
    expect(parseReportingScope("business")).toBe("business");
    expect(parseReportingScope("diagnostic")).toBe("diagnostic");
    for (const invalid of [null, "", "all", "production", "test", "Business"]) expect(parseReportingScope(invalid)).toBeNull();
  });
});

describe("Realtime RPC response contract", () => {
  it("accepts a genuine empty window and a populated report", () => {
    expect(isRealtimeReport(zero, "business", 30, now)).toBe(true);
    expect(isRealtimeReport({ ...zero, windowEnd: "2031-01-10T13:30:00+01:00",
      refreshedAt: "2031-01-10T12:30:00.000+00:00" }, "business", 30, now)).toBe(true);
    expect(isRealtimeReport({ ...zero, qualityExceptions: 2 }, "business", 30, now)).toBe(true);
    expect(isRealtimeReport({ ...zero, totalEvents: 2, cookielessEvents: 1, consentedEvents: 1,
      consentedSessionsWithActivity: 1, eventCounts: { page_view: 1, outbound_click: 1 },
      topPages: [{ label: "/", count: 1 }], observedSources: [{ label: "poster", count: 1, mode: "cookieless", kind: "utm_source" }],
    }, "business", 30, now)).toBe(true);
  });

  it("rejects missing fields, mismatched scope and malformed time windows", () => {
    expect(isRealtimeReport({ scope: "business" }, "business", 30, now)).toBe(false);
    expect(isRealtimeReport(zero, "diagnostic", 30, now)).toBe(false);
    expect(isRealtimeReport(zero, "business", 5, now)).toBe(false);
    expect(isRealtimeReport(zero, "business", 30, new Date("2031-01-10T12:31:00Z"))).toBe(false);
    expect(isRealtimeReport({ ...zero, refreshedAt: "invalid" }, "business", 30, now)).toBe(false);
  });

  it("rejects false zeros, invalid event counts and malformed rankings", () => {
    expect(isRealtimeReport({ ...zero, totalEvents: 1 }, "business", 30, now)).toBe(false);
    expect(isRealtimeReport({ ...zero, eventCounts: { page_view: -1 } }, "business", 30, now)).toBe(false);
    expect(isRealtimeReport({ ...zero, topPages: null }, "business", 30, now)).toBe(false);
    expect(isRealtimeReport({ ...zero, observedSources: [{ label: "x", count: 1, mode: "unknown", kind: "utm_source" }] }, "business", 30, now)).toBe(false);
  });
});
