import { describe, expect, it, vi } from "vitest";
import { isAdminLoginEligible, type AdminLoginLookup } from "./admin-login-policy";

function lookup(overrides: Partial<Record<keyof AdminLoginLookup, boolean>> = {}): AdminLoginLookup {
  return {
    hasActiveMembership: vi.fn(async () => overrides.hasActiveMembership ?? false),
    hasPendingInvitation: vi.fn(async () => overrides.hasPendingInvitation ?? false),
    hasActiveOwner: vi.fn(async () => overrides.hasActiveOwner ?? true),
  };
}

describe("admin login eligibility", () => {
  it("allows an active owner, admin, or viewer membership", async () => {
    expect(await isAdminLoginEligible(" MEMBER@PozaNuta.Test ", null, lookup({ hasActiveMembership: true }))).toBe(true);
  });

  it("allows a pending invitation for existing-user onboarding", async () => {
    expect(await isAdminLoginEligible("pending@pozanuta.test", null, lookup({ hasPendingInvitation: true }))).toBe(true);
  });

  it("allows bootstrap only while no active owner exists", async () => {
    expect(await isAdminLoginEligible("owner@pozanuta.test", "owner@pozanuta.test", lookup({ hasActiveOwner: false }))).toBe(true);
    expect(await isAdminLoginEligible("owner@pozanuta.test", "owner@pozanuta.test", lookup({ hasActiveOwner: true }))).toBe(false);
  });

  it("denies inactive members and authenticated non-members", async () => {
    expect(await isAdminLoginEligible("inactive@pozanuta.test", null, lookup())).toBe(false);
    expect(await isAdminLoginEligible("nonmember@pozanuta.test", null, lookup())).toBe(false);
  });

  it("rejects malformed input before any database lookup", async () => {
    const gateway = lookup();
    expect(await isAdminLoginEligible("not-an-email", null, gateway)).toBe(false);
    expect(gateway.hasActiveMembership).not.toHaveBeenCalled();
  });
});
