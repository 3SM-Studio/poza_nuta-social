import { describe, expect, it } from "vitest";
import { comparisonNote, resolveDashboardRange } from "./dashboard-range";

describe("resolveDashboardRange", () => {
  const now = new Date("2026-09-19T15:00:00Z");
  it("defaults to 30 calendar days in Warsaw", () => {
    const range = resolveDashboardRange({}, now);
    expect(range.from).toBe("2026-08-21");
    expect(range.toInclusive).toBe("2026-09-19");
    expect(range.toExclusive).toBe("2026-09-20");
    expect(range.previousFrom).toBe("2026-07-22");
    expect(range.previousToExclusive).toBe("2026-08-21");
  });

  it("supports today", () => {
    const range = resolveDashboardRange({ range: "today" }, now);
    expect(range.from).toBe("2026-09-19");
    expect(range.toExclusive).toBe("2026-09-20");
    expect(range.previousFrom).toBe("2026-09-18");
  });

  it("supports a valid custom range", () => {
    const range = resolveDashboardRange({ range: "custom", from: "2026-09-01", to: "2026-09-05" }, now);
    expect(range.key).toBe("custom");
    expect(range.previousFrom).toBe("2026-08-27");
    expect(range.previousToExclusive).toBe("2026-09-01");
  });
});

describe("comparisonNote", () => {
  it("calculates percentage change", () => expect(comparisonNote(120, 100)).toContain("+20.0%"));
  it("calculates percentage-point change", () => expect(comparisonNote(12, 10, "points")).toContain("+2.0 pp"));
});
