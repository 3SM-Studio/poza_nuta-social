import { describe, expect, it } from "vitest";
import { resolveDestinationSortOrder } from "./destination-order";

describe("destination ordering", () => {
  it("uses the approved channel default when the field is blank", () => {
    expect(resolveDestinationSortOrder("instagram", "")).toBe(10);
    expect(resolveDestinationSortOrder("website", null)).toBe(50);
  });

  it("accepts an explicit bounded integer", () => {
    expect(resolveDestinationSortOrder("instagram", "0")).toBe(0);
    expect(resolveDestinationSortOrder("instagram", "42")).toBe(42);
  });
});
