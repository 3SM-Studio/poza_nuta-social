import { describe, expect, it } from "vitest";
import { safeExternalUrl, safeInternalPath } from "./utils";

describe("safeExternalUrl", () => {
  it("allows only HTTP(S) destinations", () => {
    expect(safeExternalUrl("https://www.instagram.com/poza.nuta/")).toContain("instagram.com");
    expect(safeExternalUrl("javascript:alert(1)")).toBeNull();
  });
});

describe("safeInternalPath", () => {
  it("keeps same-origin paths and rejects redirect-shaped input", () => {
    expect(safeInternalPath("/kontakt?source=qr")).toBe("/kontakt");
    expect(safeInternalPath("/admin")).toBe("/");
    expect(safeInternalPath("https://attacker.example/phish")).toBe("/");
    expect(safeInternalPath("//attacker.example/phish")).toBe("/");
    expect(safeInternalPath("/\\attacker.example/phish")).toBe("/");
  });
});
