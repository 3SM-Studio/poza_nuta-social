import { describe, expect, it } from "vitest";
import { analyticsReportQuery, resolveAnalyticsReportRequest } from "./report-request";

const now = new Date("2026-03-29T22:30:00Z"); // 2026-03-30 in Europe/Warsaw

describe("Admin Analytics report requests", () => {
  it("uses the canonical Warsaw day and 30-day business default", () => {
    const request = resolveAnalyticsReportRequest({}, now);
    expect(request.status).toBe("valid");
    expect(request.scope).toBe("business");
    expect(request.range.key).toBe("30");
    expect(request.range.toInclusive).toBe("2026-03-30");
    expect(request.range.toExclusive).toBe("2026-03-31");
    expect(request.range.from).toBe("2026-03-01");
    const unknown = resolveAnalyticsReportRequest({ range: "unknown", scope: "unknown" }, now);
    expect(unknown.status).toBe("valid");
    expect(unknown.range.key).toBe("30");
    expect(unknown.scope).toBe("business");
    const repeated = resolveAnalyticsReportRequest({ range: ["custom"], scope: ["diagnostic"] }, now);
    expect(repeated.status).toBe("valid");
    expect(repeated.scope).toBe("business");
  });

  it("accepts a valid inclusive custom range through the 366-day limit", () => {
    const request = resolveAnalyticsReportRequest({ range: "custom", from: "2024-01-01", to: "2024-12-31", scope: "diagnostic" }, now);
    expect(request.status).toBe("valid");
    expect(request.range.key).toBe("custom");
    expect(request.range.toExclusive).toBe("2025-01-01");
    expect(request.scope).toBe("diagnostic");
    expect(request.custom).toEqual({ from: "2024-01-01", to: "2024-12-31", invalidFrom: false, invalidTo: false, reversed: false });
  });

  it("rejects malformed and reversed custom dates without fetching the fallback", () => {
    const malformed = resolveAnalyticsReportRequest({ range: "custom", from: "2026-02-29", to: "2026-03-30" }, now);
    expect(malformed.status).toBe("invalid");
    expect(malformed.range.key).toBe("30");
    expect(malformed.custom).toEqual({ from: "2026-02-29", to: "2026-03-30", invalidFrom: true, invalidTo: false, reversed: false });

    const reversed = resolveAnalyticsReportRequest({ range: "custom", from: "2026-03-30", to: "2026-03-29" }, now);
    expect(reversed.status).toBe("invalid");
    expect(reversed.custom.reversed).toBe(true);
    expect(resolveAnalyticsReportRequest({ range: "custom", from: ["2026-03-01"], to: "2026-03-30" }, now).custom.invalidFrom).toBe(true);
  });

  it("separates a too-long report from an invalid date, using calendar days across DST", () => {
    const request = resolveAnalyticsReportRequest({ range: "custom", from: "2024-01-01", to: "2025-01-01" }, now);
    expect(request.status).toBe("too_long");
    expect(request.range.key).toBe("custom");
    expect(resolveAnalyticsReportRequest({ range: "custom", from: "2026-03-29", to: "2026-03-30" }, now).status).toBe("valid");
  });

  it("builds addressable URLs while preserving report-specific filters", () => {
    const { range } = resolveAnalyticsReportRequest({ range: "custom", from: "2026-03-01", to: "2026-03-30" }, now);
    expect(Object.fromEntries(new URLSearchParams(analyticsReportQuery(range, "diagnostic", { extra: { funnel: "contact_intent", path: "/kontakt" } })))).toEqual({
      funnel: "contact_intent", path: "/kontakt", range: "custom", from: "2026-03-01", to: "2026-03-30", scope: "diagnostic",
    });
    expect(Object.fromEntries(new URLSearchParams(analyticsReportQuery(range, "business", { rangeKey: "7", extra: { segment: "key_events" } })))).toEqual({
      segment: "key_events", range: "7",
    });
  });
});
