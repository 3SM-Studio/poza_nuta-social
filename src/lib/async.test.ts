import { afterEach, describe, expect, it, vi } from "vitest";
import { settleWithin } from "./async";

afterEach(() => vi.useRealTimers());

describe("settleWithin", () => {
  it("returns an operation result before the deadline", async () => {
    await expect(settleWithin(Promise.resolve("stored"), 100, "fallback")).resolves.toBe("stored");
  });

  it("returns the fallback at the deadline", async () => {
    vi.useFakeTimers();
    const result = settleWithin(new Promise<string>(() => undefined), 100, "fallback");
    await vi.advanceTimersByTimeAsync(100);
    await expect(result).resolves.toBe("fallback");
  });

  it("returns the fallback when the operation rejects", async () => {
    await expect(settleWithin(Promise.reject(new Error("offline")), 100, "fallback")).resolves.toBe("fallback");
  });
});
