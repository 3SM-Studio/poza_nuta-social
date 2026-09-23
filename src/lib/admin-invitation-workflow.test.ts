import { describe, expect, it, vi } from "vitest";
import {
  deliverAdminInvitation,
  InvitationDeliveryError,
  InvitationReconciliationRequiredError,
  type InvitationWorkflowDependencies,
} from "./admin-invitation-workflow";

const actor = { id: "actor-1", email: "owner@pozanuta.test" };
const invitation = { id: "invite-1", email: "person@pozanuta.test", role: "viewer" as const, status: "pending" };

function dependencies(overrides: Partial<InvitationWorkflowDependencies> = {}): InvitationWorkflowDependencies {
  return {
    prepare: vi.fn(async () => invitation),
    beginDelivery: vi.fn(async () => undefined),
    findAuthUser: vi.fn(async () => null),
    inviteNewAuthUser: vi.fn(async () => ({ id: "new-auth-user" })),
    recordDelivery: vi.fn(async () => undefined),
    failureCode: vi.fn(() => "auth_admin_error"),
    ...overrides,
  };
}

describe("admin invitation workflow", () => {
  it("invites a new Auth user and records sent only after Auth succeeds", async () => {
    const deps = dependencies();
    await expect(deliverAdminInvitation({ actor, email: invitation.email, role: "viewer" }, deps)).resolves.toEqual({
      invitation,
      outcome: "sent",
      authUserId: "new-auth-user",
    });
    expect(deps.beginDelivery).toHaveBeenCalledWith({ actor, invitationId: invitation.id });
    expect(deps.recordDelivery).toHaveBeenCalledWith(expect.objectContaining({ outcome: "sent", authUserId: "new-auth-user" }));
  });

  it("uses normal sign-in onboarding for an existing confirmed Auth user", async () => {
    const deps = dependencies({ findAuthUser: vi.fn(async () => ({ id: "existing-user" })) });
    await expect(deliverAdminInvitation({ actor, email: invitation.email, role: "viewer" }, deps)).resolves.toMatchObject({
      outcome: "existing_user",
      authUserId: "existing-user",
    });
    expect(deps.inviteNewAuthUser).not.toHaveBeenCalled();
  });

  it("records an explicit failed delivery when Auth fails", async () => {
    const deps = dependencies({ inviteNewAuthUser: vi.fn(async () => { throw new Error("provider unavailable"); }) });
    await expect(deliverAdminInvitation({ actor, email: invitation.email, role: "viewer" }, deps)).rejects.toBeInstanceOf(InvitationDeliveryError);
    expect(deps.recordDelivery).toHaveBeenCalledWith(expect.objectContaining({ outcome: "failed", failureCode: "auth_admin_error" }));
  });

  it("surfaces reconciliation when Auth succeeds but DB recording fails", async () => {
    const deps = dependencies({ recordDelivery: vi.fn(async () => { throw new Error("database unavailable"); }) });
    const error = await deliverAdminInvitation({ actor, email: invitation.email, role: "viewer" }, deps).catch((caught) => caught);
    expect(error).toBeInstanceOf(InvitationReconciliationRequiredError);
    expect(error).toMatchObject({ invitationId: invitation.id, authUserId: "new-auth-user" });
  });
});
