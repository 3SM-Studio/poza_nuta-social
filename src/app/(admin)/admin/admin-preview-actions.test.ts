import { afterEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ access: vi.fn(), owner: vi.fn(), client: vi.fn() }));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/admin", () => ({ requireAdminAccess: mocks.access, requireOwner: mocks.owner }));
vi.mock("@/lib/supabase/admin", () => ({ createAdminClient: mocks.client }));

import { inviteMemberAction, retryInvitationAction, revokeInvitationAction, updateMemberAction, transferOwnershipAction } from "./team/actions";
import { createReferralParticipantAction, updateReferralParticipantAction, createReferralLinkAction } from "./referrals/actions";

afterEach(() => { vi.unstubAllEnvs(); vi.clearAllMocks(); });

describe("Preview Server Actions", () => {
  it.each([
    inviteMemberAction, retryInvitationAction, revokeInvitationAction, updateMemberAction, transferOwnershipAction,
    createReferralParticipantAction, updateReferralParticipantAction, createReferralLinkAction,
  ])("rejects %s before reading membership or mutating shared DB", async (action) => {
    vi.stubEnv("VERCEL_ENV", "preview");
    await expect(action(new FormData())).rejects.toThrow("PREVIEW_READ_ONLY");
    expect(mocks.access).not.toHaveBeenCalled();
    expect(mocks.owner).not.toHaveBeenCalled();
    expect(mocks.client).not.toHaveBeenCalled();
  });
});
