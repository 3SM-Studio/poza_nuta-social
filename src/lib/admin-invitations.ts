import "server-only";

import type { User } from "@supabase/supabase-js";
import type { AdminAccess } from "@/lib/admin";
import {
  deliverAdminInvitation,
  retryAdminInvitationDelivery,
  type InvitationActor,
  type InvitationRole,
  type InvitationWorkflowDependencies,
  type PreparedInvitation,
} from "@/lib/admin-invitation-workflow";
import { getSiteUrl } from "@/lib/env";
import { createAdminClient } from "@/lib/supabase/admin";

export async function inviteAdminMember(
  access: AdminAccess,
  rawEmail: string,
  role: InvitationRole,
) {
  const admin = requiredAdminClient();
  const actor = invitationActor(access);
  const email = rawEmail.trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("invalid_invitation_email");
  if (role !== "admin" && role !== "viewer") throw new Error("invalid_invitation_role");

  return deliverAdminInvitation({ actor, email, role }, invitationDependencies(admin));
}

export async function retryAdminInvitation(access: AdminAccess, invitationId: string) {
  const admin = requiredAdminClient();
  const actor = invitationActor(access);
  const { data, error } = await admin.from("admin_invitations")
    .select("id,email,role,status")
    .eq("id", invitationId)
    .maybeSingle();
  if (error || !data) throw new Error(error?.message || "invitation_not_found");
  return retryAdminInvitationDelivery(
    { actor, invitation: data as PreparedInvitation },
    invitationDependencies(admin),
  );
}

function invitationDependencies(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
): InvitationWorkflowDependencies {
  return {
    async prepare(input) {
      const { data, error } = await admin.rpc("admin_invitation_prepare_v1", {
        p_actor_user_id: input.actor.id,
        p_actor_email: input.actor.email,
        p_email: input.email,
        p_role: input.role,
      });
      if (error) throw new Error(error.message);
      const invitation = (data as { invitation?: PreparedInvitation } | null)?.invitation;
      if (!invitation?.id) throw new Error("invalid_invitation_response");
      return invitation;
    },
    async beginDelivery(input) {
      const { data, error } = await admin.rpc("admin_invitation_begin_delivery_v1", {
        p_actor_user_id: input.actor.id,
        p_actor_email: input.actor.email,
        p_invitation_id: input.invitationId,
      });
      if (error) throw new Error(error.message);
      const started = (data as { deliveryStarted?: unknown } | null)?.deliveryStarted;
      if (typeof started !== "boolean") throw new Error("invalid_delivery_begin_response");
      return { started };
    },
    findAuthUser: (candidateEmail) => findAuthUserByEmail(admin, candidateEmail),
    async inviteNewAuthUser(candidateEmail) {
      const { data, error } = await admin.auth.admin.inviteUserByEmail(candidateEmail, {
        redirectTo: `${getSiteUrl()}/auth/confirm`,
      });
      if (error || !data.user) throw error || new Error("missing_invited_auth_user");
      return { id: data.user.id };
    },
    async recordDelivery(input) {
      const { error } = await admin.rpc("admin_invitation_record_delivery_v1", {
        p_actor_user_id: input.actor.id,
        p_actor_email: input.actor.email,
        p_invitation_id: input.invitationId,
        p_outcome: input.outcome,
        p_auth_user_id: input.authUserId,
        p_failure_code: input.failureCode,
      });
      if (error) throw new Error(error.message);
    },
    failureCode: authFailureCode,
  };
}

export async function revokeAdminInvitation(access: AdminAccess, invitationId: string) {
  const admin = requiredAdminClient();
  const actor = invitationActor(access);
  const { data, error } = await admin.rpc("admin_invitation_revoke_v1", {
    p_actor_user_id: actor.id,
    p_actor_email: actor.email,
    p_invitation_id: invitationId,
  });
  if (error) throw new Error(error.message);
  return data;
}

async function findAuthUserByEmail(
  admin: NonNullable<ReturnType<typeof createAdminClient>>,
  email: string,
) {
  const perPage = 100;
  for (let page = 1; page <= 100; page += 1) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw error;
    const match = data.users.find((user) => user.email?.trim().toLowerCase() === email);
    if (match) return { id: match.id, confirmed: Boolean(match.email_confirmed_at) };
    if (data.users.length < perPage) return null;
  }
  throw new Error("auth_user_scan_limit");
}

function invitationActor(access: AdminAccess): InvitationActor {
  const email = access.user.email?.trim().toLowerCase();
  if (!email) throw new Error("actor_email_required");
  return { id: access.user.id, email };
}

function requiredAdminClient() {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured");
  return admin;
}

function authFailureCode(error: unknown) {
  const candidate = error as { code?: unknown; status?: unknown } | null;
  if (typeof candidate?.code === "string" && candidate.code) {
    return candidate.code.toLowerCase().replace(/[^a-z0-9_-]+/g, "_").slice(0, 80);
  }
  if (typeof candidate?.status === "number") return `auth_http_${candidate.status}`;
  return "auth_admin_error";
}

export type { InvitationRole };
export type AuthUserIdentity = Pick<User, "id" | "email">;
