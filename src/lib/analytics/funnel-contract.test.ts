import { describe, expect, it } from "vitest";
import { DEFAULT_FUNNEL, FUNNELS, isFunnelReport, parseFunnelKey } from "./funnel-contract";

describe("server-owned funnel contract", () => {
  it("accepts only stable preset keys, never labels or arbitrary event lists", () => {
    expect(DEFAULT_FUNNEL).toBe("contact_intent");
    expect(parseFunnelKey("contact_intent")).toBe("contact_intent");
    expect(parseFunnelKey(FUNNELS.contact_intent.label)).toBeNull();
    expect(parseFunnelKey("contact_view,contact_click")).toBeNull();
    expect(parseFunnelKey("__proto__")).toBeNull();
  });

  it("rejects an inconsistent RPC shape before showing metrics", () => {
    const valid = {
      funnelKey: "contact_intent", scope: "business", fromDate: "2031-01-10", toDateExclusive: "2031-01-11",
      eligibleSessions: 1, entrants: 1, completionRate: 100,
      steps: [
        { key: "contact_view", sessions: 1, previousSessions: null, conversionRate: null, dropOff: null, dropOffRate: null },
        { key: "contact_click", sessions: 1, previousSessions: 1, conversionRate: 100, dropOff: 0, dropOffRate: 0 },
      ],
    };
    expect(isFunnelReport(valid, "contact_intent", "business")).toBe(true);
    expect(isFunnelReport({ ...valid, completionRate: Number.NaN }, "contact_intent", "business")).toBe(false);
    expect(isFunnelReport({ ...valid, scope: "diagnostic" }, "contact_intent", "business")).toBe(false);
    expect(isFunnelReport({ ...valid, steps: [valid.steps[1], valid.steps[0]] }, "contact_intent", "business")).toBe(false);
  });
});
