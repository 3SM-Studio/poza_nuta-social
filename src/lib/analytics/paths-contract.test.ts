import { describe, expect, it } from "vitest";
import { isPathsReport, parsePathNode, share } from "./paths-contract";

describe("canonical page path nodes", () => {
  it("uses the stored path, including historical values, never a title or URL payload", () => {
    expect(parsePathNode("/privacy")).toEqual({ type: "page", path: "/privacy" });
    for (const value of ["https://example.com/kontakt", "/kontakt?secret=x", "/kontakt#top", "/x';select 1", "/" + "a".repeat(161), "Kontakt"]) {
      expect(parsePathNode(value)).toBeNull();
    }
  });

  it("rejects malformed or unbounded read payloads", () => {
    const report = { scope: "business", nodeType: "page", maxDepth: 3, rankingLimit: 10,
      pathSessions: 0, selectedSessions: 0, selectedPath: null, noNextInRange: 0, noPreviousInRange: 0,
      entries: [], shortPaths: [], next: [], previous: [] };
    expect(isPathsReport(report, "business", null)).toBe(true);
    expect(isPathsReport({ ...report, entries: Array.from({ length: 11 }, () => ({ path: "/", sessions: 1 })) }, "business", null)).toBe(false);
    expect(isPathsReport({ ...report, shortPaths: [{ paths: ["/", "/", "/", "/"], sessions: 1 }] }, "business", null)).toBe(false);
    expect(isPathsReport({ ...report, scope: "diagnostic" }, "business", null)).toBe(false);
  });

  it("has no percentage without a session denominator", () => {
    expect(share(0, 0)).toBeNull();
    expect(share(1, 2)).toBe(50);
  });
});
