import { afterEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";
import { assertBusinessMutationAllowed, previewDeploymentOrigin, resolveServerEnvironment } from "./runtime-environment";

afterEach(() => vi.unstubAllEnvs());

describe("server-owned environment", () => {
  it.each(["production", "preview", "development"] as const)("honors VERCEL_ENV=%s over forged request data", (environment) => {
    vi.stubEnv("VERCEL_ENV", environment);
    vi.stubEnv("ANALYTICS_ENV", "staging");
    const request = new NextRequest(`https://attacker.example/?environment=${environment === "preview" ? "production" : "preview"}`, {
      headers: { "x-environment": environment === "preview" ? "production" : "preview" },
    });
    expect(resolveServerEnvironment(request)).toBe(environment);
  });

  it("rejects Preview business writes before any authentication or database operation", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    expect(assertBusinessMutationAllowed).toThrow("PREVIEW_READ_ONLY");
  });

  it("keeps authorized Production mutations available", () => {
    vi.stubEnv("VERCEL_ENV", "production");
    expect(assertBusinessMutationAllowed).not.toThrow();
  });

  it("uses only a validated Vercel deployment host for Preview auth", () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("VERCEL_URL", "poza-nuta-abc.vercel.app");
    expect(previewDeploymentOrigin()).toBe("https://poza-nuta-abc.vercel.app");
    vi.stubEnv("VERCEL_URL", "attacker.example/path");
    expect(previewDeploymentOrigin()).toBeNull();
  });
});
