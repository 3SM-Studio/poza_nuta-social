export type InvitationRole = "admin" | "viewer";
export type InvitationDeliveryOutcome = "sent" | "existing_user" | "failed";

export type PreparedInvitation = {
  id: string;
  email: string;
  role: InvitationRole;
  status: string;
};

export type InvitationActor = {
  id: string;
  email: string;
};

export type InvitationWorkflowDependencies = {
  prepare(input: { actor: InvitationActor; email: string; role: InvitationRole }): Promise<PreparedInvitation>;
  beginDelivery(input: { actor: InvitationActor; invitationId: string }): Promise<{ started: boolean }>;
  findAuthUser(email: string): Promise<{ id: string; confirmed: boolean } | null>;
  inviteNewAuthUser(email: string): Promise<{ id: string }>;
  recordDelivery(input: {
    actor: InvitationActor;
    invitationId: string;
    outcome: InvitationDeliveryOutcome;
    authUserId: string | null;
    failureCode: string | null;
  }): Promise<void>;
  failureCode(error: unknown): string;
};

export class InvitationDeliveryError extends Error {
  constructor(public readonly failureCode: string, cause: unknown) {
    super("Invitation delivery failed", { cause });
    this.name = "InvitationDeliveryError";
  }
}

export class InvitationReconciliationRequiredError extends Error {
  constructor(
    public readonly invitationId: string,
    public readonly authUserId: string | null,
    cause: unknown,
  ) {
    super("Invitation reconciliation is required", { cause });
    this.name = "InvitationReconciliationRequiredError";
  }
}

export async function deliverAdminInvitation(
  input: { actor: InvitationActor; email: string; role: InvitationRole },
  dependencies: InvitationWorkflowDependencies,
) {
  const prepared = await dependencies.prepare(input);
  return deliverPreparedInvitation(input.actor, prepared, dependencies);
}

export async function retryAdminInvitationDelivery(
  input: { actor: InvitationActor; invitation: PreparedInvitation },
  dependencies: Omit<InvitationWorkflowDependencies, "prepare">,
) {
  return deliverPreparedInvitation(input.actor, input.invitation, dependencies);
}

async function deliverPreparedInvitation(
  actor: InvitationActor,
  prepared: PreparedInvitation,
  dependencies: Omit<InvitationWorkflowDependencies, "prepare">,
) {
  const claim = await dependencies.beginDelivery({ actor, invitationId: prepared.id });
  if (!claim.started) return { invitation: prepared, outcome: "already_pending" as const, authUserId: null };

  let authUser: { id: string };
  let outcome: Exclude<InvitationDeliveryOutcome, "failed">;
  try {
    const existing = await dependencies.findAuthUser(prepared.email);
    authUser = existing?.confirmed ? existing : await dependencies.inviteNewAuthUser(prepared.email);
    outcome = existing?.confirmed ? "existing_user" : "sent";
  } catch (error) {
    const failureCode = dependencies.failureCode(error);
    try {
      await dependencies.recordDelivery({
        actor,
        invitationId: prepared.id,
        outcome: "failed",
        authUserId: null,
        failureCode,
      });
    } catch (recordError) {
      throw new InvitationReconciliationRequiredError(prepared.id, null, recordError);
    }
    throw new InvitationDeliveryError(failureCode, error);
  }

  try {
    await dependencies.recordDelivery({
      actor,
      invitationId: prepared.id,
      outcome,
      authUserId: authUser.id,
      failureCode: null,
    });
  } catch (error) {
    // Supabase Auth has already changed. A retry finds the user and repairs application state.
    throw new InvitationReconciliationRequiredError(prepared.id, authUser.id, error);
  }
  return { invitation: prepared, outcome, authUserId: authUser.id };
}
