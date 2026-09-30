import { describe, expect, it } from "vitest";
import { KEY_EVENT_NAMES } from "./outcome-contract";
import { isSegmentReport, parseSegmentKey, SEGMENT_DEFINITIONS, shareOfBase } from "./segment-contract";

const report = {
  scope: "business", fromDate: "2032-01-10", toDateExclusive: "2032-01-11",
  baseSessions: 3,
  segments: [
    { key: "key_events", sessions: 2 },
    { key: "contact_click", sessions: 1 },
    { key: "outbound_click", sessions: 2 },
    { key: "tracking_entry", sessions: 1 },
  ],
  selectedKey: "contact_click",
  selected: { sessions: 1, pageViews: 1, contactClickEvents: 2, outboundClickEvents: 1, trackingEntries: 1, sessionsWithKeyEvent: 1 },
};

describe("consented segment contract", () => {
  it("uses stable closed keys, independent of display labels", () => {
    expect(SEGMENT_DEFINITIONS.map((definition) => definition.key)).toEqual(report.segments.map((segment) => segment.key));
    expect(parseSegmentKey("contact_click")).toBe("contact_click");
    expect(parseSegmentKey(SEGMENT_DEFINITIONS[1].label)).toBeNull();
    expect(parseSegmentKey("contact_click; drop table analytics_events_v2")).toBeNull();
    expect(parseSegmentKey({ filter: "event_name = 'contact_click'" })).toBeNull();
    expect(SEGMENT_DEFINITIONS.every((definition) => definition.populationUnit === "consented_session")).toBe(true);
  });

  it("uses the canonical Key Event names in the membership explanation", () => {
    for (const name of KEY_EVENT_NAMES) expect(SEGMENT_DEFINITIONS[0].membership).toContain(name);
  });

  it("allows overlap and has a nullable share when the base is empty", () => {
    expect(isSegmentReport(report, "business", "2032-01-10", "2032-01-11", "contact_click")).toBe(true);
    expect(report.segments.reduce((sum, item) => sum + item.sessions, 0)).toBeGreaterThan(report.baseSessions);
    expect(shareOfBase(1, 3)).toBeCloseTo(1 / 3);
    expect(shareOfBase(0, 0)).toBeNull();
  });

  it("rejects changed identity, impossible counts and untrusted response shapes", () => {
    expect(isSegmentReport({ ...report, selectedKey: "outbound_click" }, "business", "2032-01-10", "2032-01-11", "contact_click")).toBe(false);
    expect(isSegmentReport({ ...report, segments: [{ key: "unknown", sessions: 1 }] }, "business", "2032-01-10", "2032-01-11", "contact_click")).toBe(false);
    expect(isSegmentReport({ ...report, selected: { ...report.selected, sessions: 2 } }, "business", "2032-01-10", "2032-01-11", "contact_click")).toBe(false);
  });
});
