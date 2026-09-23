import "server-only";

import type { AdminAccess, AdminRole } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type AdminMember = {
  user_id: string;
  email: string | null;
  role: AdminRole;
  status: "active" | "inactive";
  invited_by: string | null;
  deactivated_at: string | null;
  created_at: string;
  updated_at: string;
};

export type AdminInvitation = {
  id: string;
  email: string;
  role: Exclude<AdminRole, "owner">;
  status: "pending" | "accepted" | "revoked" | "expired" | "failed";
  delivery_status: "not_attempted" | "sent" | "existing_user" | "failed";
  invited_by: string;
  attempt_count: number;
  failure_code: string | null;
  expires_at: string;
  created_at: string;
  updated_at: string;
};

export async function listTeamAccess() {
  const admin = requiredAdminClient();
  const [membersResult, invitationsResult] = await Promise.all([
    admin
      .from("admin_profiles")
      .select("user_id,email,role,status,invited_by,deactivated_at,created_at,updated_at")
      .order("created_at", { ascending: true }),
    admin
      .from("admin_invitations")
      .select("id,email,role,status,delivery_status,invited_by,attempt_count,failure_code,expires_at,created_at,updated_at")
      .in("status", ["pending", "failed"])
      .order("created_at", { ascending: false }),
  ]);
  if (membersResult.error) throw new Error(membersResult.error.message);
  if (invitationsResult.error) throw new Error(invitationsResult.error.message);
  return {
    members: (membersResult.data || []) as AdminMember[],
    invitations: (invitationsResult.data || []) as AdminInvitation[],
  };
}

export async function updateAdminMember(
  access: AdminAccess,
  targetUserId: string,
  role: Exclude<AdminRole, "owner">,
  status: "active" | "inactive",
) {
  const admin = requiredAdminClient();
  const { data, error } = await admin.rpc("admin_member_update_v1", {
    p_actor_user_id: access.user.id,
    p_actor_email: access.user.email || "",
    p_target_user_id: targetUserId,
    p_role: role,
    p_status: status,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function transferAdminOwnership(access: AdminAccess, targetUserId: string) {
  const admin = requiredAdminClient();
  const { data, error } = await admin.rpc("admin_transfer_ownership_v1", {
    p_actor_user_id: access.user.id,
    p_actor_email: access.user.email || "",
    p_target_user_id: targetUserId,
  });
  if (error) throw new Error(error.message);
  return data;
}

function requiredAdminClient() {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured");
  return admin;
}
