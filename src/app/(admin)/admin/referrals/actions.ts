"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { requireAdminAccess } from "@/lib/admin";
import {
  createReferralLink,
  createReferralParticipant,
  updateReferralParticipant,
} from "@/lib/admin-referrals";
import { createTrackingCode } from "@/lib/tracking-code";

export async function createReferralParticipantAction(formData: FormData) {
  const access = await requireAdminAccess();
  const displayName = String(formData.get("displayName") || "").trim();
  const linkedUserId = String(formData.get("linkedUserId") || "").trim() || null;
  try {
    await createReferralParticipant(access, displayName, linkedUserId);
    revalidatePath("/admin/referrals");
  } catch {
    redirect("/admin/referrals?error=participant-create-rejected");
  }
  redirect("/admin/referrals?status=participant-created");
}

export async function updateReferralParticipantAction(formData: FormData) {
  const access = await requireAdminAccess();
  const participantId = String(formData.get("participantId") || "");
  const displayName = String(formData.get("displayName") || "").trim();
  const linkedUserId = String(formData.get("linkedUserId") || "").trim() || null;
  const status = String(formData.get("status") || "");
  if (!participantId || !["active", "inactive"].includes(status)) redirect("/admin/referrals?error=invalid-request");
  try {
    await updateReferralParticipant(access, participantId, displayName, status as "active" | "inactive", linkedUserId);
    revalidatePath("/admin/referrals");
  } catch {
    redirect("/admin/referrals?error=participant-update-rejected");
  }
  redirect("/admin/referrals?status=participant-updated");
}

export async function createReferralLinkAction(formData: FormData) {
  const access = await requireAdminAccess();
  const participantId = String(formData.get("participantId") || "");
  const label = String(formData.get("label") || "").trim();
  const landingPath = String(formData.get("landingPath") || "/") === "/kontakt" ? "/kontakt" : "/";
  if (!participantId || !label) redirect("/admin/referrals?error=invalid-request");

  let created = false;
  for (let attempt = 0; attempt < 6; attempt += 1) {
    try {
      await createReferralLink(access, participantId, createTrackingCode(), label, landingPath);
      revalidatePath("/admin/referrals");
      created = true;
      break;
    } catch (error) {
      if ((error as { code?: string }).code !== "23505") redirect("/admin/referrals?error=link-create-rejected");
    }
  }
  if (created) redirect("/admin/referrals?status=link-created");
  redirect("/admin/referrals?error=link-code-exhausted");
}
