import { describe, expect, it } from "vitest";
import { adminRows } from "./admin-read";

describe("Admin catalog read", () => {
  it("keeps successful rows", () => {
    const rows = [{ id: "one" }];
    expect(adminRows({ data: rows, error: null })).toBe(rows);
  });

  it("keeps a legitimate empty result", () => {
    expect(adminRows({ data: [], error: null })).toEqual([]);
  });

  it("does not turn an unavailable or failed read into an empty catalog", () => {
    expect(adminRows(null)).toBeNull();
    expect(adminRows({ data: [], error: new Error("offline") })).toBeNull();
    expect(adminRows({ data: null, error: null })).toBeNull();
  });
});
