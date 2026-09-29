import { afterEach, describe, expect, it, vi } from "vitest";
import type { User } from "@supabase/supabase-js";

const mocks = vi.hoisted(() => ({ rpc: vi.fn(), membership: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: () => ({
  from: () => ({ select: () => ({ eq: () => ({ eq: () => ({ maybeSingle: mocks.membership }) }) }) }),
  rpc: mocks.rpc,
}) }));

import { reconcileAdminMembership, requireEditor, requireOwner } from "./admin";

const user = { id: "00000000-0000-4000-8000-000000000001", email: "owner@example.com" } as User;
afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("Preview Admin membership safety", () => {
  it("reads existing membership without a bootstrap or acceptance RPC", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    mocks.membership.mockResolvedValue({ data: { role: "owner" }, error: null });
    expect(await reconcileAdminMembership(user)).toMatchObject({ role: "owner" });
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("does not bootstrap or accept an invitation when Preview user has no membership", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    vi.stubEnv("BOOTSTRAP_OWNER_EMAIL", user.email!);
    mocks.membership.mockResolvedValue({ data: null, error: null });
    expect(await reconcileAdminMembership(user)).toBeNull();
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("blocks editor and owner mutation boundaries before authentication", async () => {
    vi.stubEnv("VERCEL_ENV", "preview");
    await expect(requireEditor()).rejects.toThrow("PREVIEW_READ_ONLY");
    await expect(requireOwner()).rejects.toThrow("PREVIEW_READ_ONLY");
    expect(mocks.rpc).not.toHaveBeenCalled();
  });

  it("preserves Production bootstrap behavior", async () => {
    vi.stubEnv("VERCEL_ENV", "production");
    vi.stubEnv("BOOTSTRAP_OWNER_EMAIL", user.email!);
    mocks.membership.mockResolvedValueOnce({ data: null, error: null }).mockResolvedValueOnce({ data: { role: "owner" }, error: null });
    mocks.rpc.mockResolvedValue({ error: null });
    expect(await reconcileAdminMembership(user)).toMatchObject({ role: "owner" });
    expect(mocks.rpc).toHaveBeenCalledWith("admin_bootstrap_owner_v1", expect.any(Object));
  });
});
