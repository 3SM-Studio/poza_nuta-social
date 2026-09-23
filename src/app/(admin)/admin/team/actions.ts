"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAccess, requireOwner } from "@/lib/admin";
import {
  InvitationDeliveryError,
  InvitationReconciliationRequiredError,
  type InvitationRole,
} from "@/lib/admin-invitation-workflow";
import { inviteAdminMember, revokeAdminInvitation } from "@/lib/admin-invitations";
import { transferAdminOwnership, updateAdminMember } from "@/lib/admin-team";

export async function inviteMemberAction(formData: FormData) {
  const access = await requireAdminAccess();
  const email = String(formData.get("email") || "");
  const role = String(formData.get("role") || "") as InvitationRole;
  let outcome: "sent" | "existing_user";
  try {
    outcome = (await inviteAdminMember(access, email, role)).outcome;
  } catch (error) {
    if (error instanceof InvitationDeliveryError) redirect("/admin/team?error=delivery-failed");
    if (error instanceof InvitationReconciliationRequiredError) redirect("/admin/team?error=reconciliation-required");
    redirect("/admin/team?error=invite-rejected");
  }
  revalidatePath("/admin/team");
  redirect(`/admin/team?status=${outcome}`);
}

export async function revokeInvitationAction(formData: FormData) {
  const access = await requireAdminAccess();
  const invitationId = String(formData.get("invitationId") || "");
  if (!invitationId) redirect("/admin/team?error=invalid-request");
  try {
    await revokeAdminInvitation(access, invitationId);
    revalidatePath("/admin/team");
  } catch {
    redirect("/admin/team?error=revoke-rejected");
  }
}

export async function updateMemberAction(formData: FormData) {
  const access = await requireOwner();
  const targetUserId = String(formData.get("targetUserId") || "");
  const role = String(formData.get("role") || "");
  const status = String(formData.get("status") || "");
  if (!targetUserId || !["admin", "viewer"].includes(role) || !["active", "inactive"].includes(status)) {
    redirect("/admin/team?error=invalid-request");
  }
  try {
    await updateAdminMember(
      access,
      targetUserId,
      role as "admin" | "viewer",
      status as "active" | "inactive",
    );
    revalidatePath("/admin/team");
  } catch {
    redirect("/admin/team?error=member-update-rejected");
  }
}

export async function transferOwnershipAction(formData: FormData) {
  const access = await requireOwner();
  const targetUserId = String(formData.get("targetUserId") || "");
  if (!targetUserId) redirect("/admin/team?error=invalid-request");
  try {
    await transferAdminOwnership(access, targetUserId);
  } catch {
    redirect("/admin/team?error=transfer-rejected");
  }
  revalidatePath("/admin/team");
  redirect("/admin/team?status=ownership-transferred");
}
