import { describe, expect, it } from "vitest";
import { HUB_RESUME_MAX_MS, hubResumeProperties, parseHubOutboundState } from "./hub-lifecycle";

describe("hub return lifecycle", () => {
  const now = 2_000_000;

  it("emits one bounded resume payload after an armed hidden interval", () => {
    const state = parseHubOutboundState(JSON.stringify({ destination: "instagram", at: now - 3_000, hidden: true }));
    expect(hubResumeProperties(state, now, "visible", "pageshow", true)).toEqual({
      priorDestination: "instagram",
      resumeSignal: "pageshow",
      elapsedBucket: "2-10s",
      bfcache: true,
    });
  });

  it.each([
    ["ordinary visibility change", { destination: "instagram", at: now - 3_000, hidden: false }, "visible"],
    ["too-fast return", { destination: "instagram", at: now - 500, hidden: true }, "visible"],
    ["stale return", { destination: "instagram", at: now - HUB_RESUME_MAX_MS - 1, hidden: true }, "visible"],
    ["still hidden", { destination: "instagram", at: now - 3_000, hidden: true }, "hidden"],
  ] as const)("ignores %s", (_name, state, visibility) => {
    expect(hubResumeProperties(state, now, visibility, "visibilitychange", false)).toBeNull();
  });

  it("rejects missing, malformed, and structurally invalid persisted state", () => {
    expect(parseHubOutboundState(null)).toBeNull();
    expect(parseHubOutboundState("{")) .toBeNull();
    expect(parseHubOutboundState(JSON.stringify({ destination: 4, at: "now" }))).toBeNull();
  });
});
