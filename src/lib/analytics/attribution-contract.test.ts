import { describe, expect, it } from "vitest";
import { isAttributionReport } from "./attribution-contract";

const valid = {
  scope: "business",
  fromDate: "2034-03-10",
  toDateExclusive: "2034-03-11",
  summary: { total: 2, attributed: 1, unattributed: 1, directObserved: 0, persistedConsented: 1,
    campaignAttributed: 1, partialContext: 0, consentedSessionsWithAttributedOutcome: 1, coverage: 0.5 },
  splits: [
    { eventName: "contact_click", mode: "consented", basis: "persisted_consented", events: 1 },
    { eventName: "outbound_click", mode: "cookieless", basis: "unattributed", events: 1 },
  ],
  campaigns: [{ id: "d1000000-0000-4000-8000-000000000001", name: "Kampania", status: "archived", events: 1,
    outcomes: [{ eventName: "contact_click", basis: "persisted_consented", events: 1 }] }],
  campaignRows: 1,
  graph: [], graphRows: 0,
};

describe("Attribution server response boundary", () => {
  it("accepts a consistent bounded aggregate", () => {
    expect(isAttributionReport(valid, "business", "2034-03-10", "2034-03-11")).toBe(true);
  });
  it("rejects event loss, cookieless persisted credit, and malformed campaign breakdown", () => {
    expect(isAttributionReport({ ...valid, splits: valid.splits.slice(0, 1) }, "business", "2034-03-10", "2034-03-11")).toBe(false);
    expect(isAttributionReport({ ...valid, splits: [
      { eventName: "contact_click", mode: "cookieless", basis: "persisted_consented", events: 1 },
      valid.splits[1],
    ] }, "business", "2034-03-10", "2034-03-11")).toBe(false);
    expect(isAttributionReport({ ...valid, campaigns: [{ ...valid.campaigns[0], events: 2 }] }, "business", "2034-03-10", "2034-03-11")).toBe(false);
  });
  it("uses null coverage for a zero denominator", () => {
    expect(isAttributionReport({ ...valid,
      summary: { total: 0, attributed: 0, unattributed: 0, directObserved: 0, persistedConsented: 0,
        campaignAttributed: 0, partialContext: 0, consentedSessionsWithAttributedOutcome: 0, coverage: null },
      splits: [], campaigns: [], campaignRows: 0,
    }, "business", "2034-03-10", "2034-03-11")).toBe(true);
  });
});
