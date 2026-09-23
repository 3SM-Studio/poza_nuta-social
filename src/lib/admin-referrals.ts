import "server-only";

import type { AdminAccess } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReferralParticipant = {
  id: string;
  display_name: string;
  status: "active" | "inactive";
  linked_user_id: string | null;
  created_at: string;
  updated_at: string;
};

export type ReferralLink = {
  id: string;
  code: string;
  label: string;
  landing_path: "/" | "/kontakt";
  active: boolean;
  referral_participant_id: string;
  created_at: string;
};

export type ReferralLeaderboardRow = {
  participantId: string;
  participant: string;
  status: "active" | "inactive";
  newVisitors: number;
  acquiredSessions: number;
  outboundSessions: number;
  outboundSessionRate: number;
  outboundClicks: number;
  multiDestinationSessions: number;
  contactInterestSessions: number;
};

export async function listReferralAdmin(fromDate: string, toDateExclusive: string) {
  const admin = requiredAdminClient();
  const [participantsResult, linksResult, membershipsResult, leaderboardResult] = await Promise.all([
    admin.from("referral_participants").select("id,display_name,status,linked_user_id,created_at,updated_at").order("created_at", { ascending: true }),
    admin.from("tracking_links").select("id,code,label,landing_path,active,referral_participant_id,created_at").not("referral_participant_id", "is", null).order("created_at", { ascending: false }),
    admin.from("admin_profiles").select("user_id,email,role,status").order("email", { ascending: true }),
    admin.rpc("referral_leaderboard_v1", { p_from_date: fromDate, p_to_date_exclusive: toDateExclusive }),
  ]);
  if (participantsResult.error) throw new Error(participantsResult.error.message);
  if (linksResult.error) throw new Error(linksResult.error.message);
  if (membershipsResult.error) throw new Error(membershipsResult.error.message);
  if (leaderboardResult.error) throw new Error(leaderboardResult.error.message);
  return {
    participants: (participantsResult.data || []) as ReferralParticipant[],
    links: (linksResult.data || []) as ReferralLink[],
    memberships: membershipsResult.data || [],
    leaderboard: normalizeLeaderboard(leaderboardResult.data),
  };
}

export async function createReferralParticipant(
  access: AdminAccess,
  displayName: string,
  linkedUserId: string | null,
) {
  const admin = requiredAdminClient();
  const { data, error } = await admin.rpc("admin_referral_participant_create_v1", {
    p_actor_user_id: access.user.id,
    p_actor_email: access.user.email || "",
    p_display_name: displayName,
    p_linked_user_id: linkedUserId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function updateReferralParticipant(
  access: AdminAccess,
  participantId: string,
  displayName: string,
  status: "active" | "inactive",
  linkedUserId: string | null,
) {
  const admin = requiredAdminClient();
  const { data, error } = await admin.rpc("admin_referral_participant_update_v1", {
    p_actor_user_id: access.user.id,
    p_actor_email: access.user.email || "",
    p_participant_id: participantId,
    p_display_name: displayName,
    p_status: status,
    p_linked_user_id: linkedUserId,
  });
  if (error) throw new Error(error.message);
  return data;
}

export async function createReferralLink(
  access: AdminAccess,
  participantId: string,
  code: string,
  label: string,
  landingPath: "/" | "/kontakt",
) {
  const admin = requiredAdminClient();
  const { data, error } = await admin.rpc("admin_referral_tracking_link_create_v1", {
    p_actor_user_id: access.user.id,
    p_actor_email: access.user.email || "",
    p_participant_id: participantId,
    p_code: code,
    p_label: label,
    p_landing_path: landingPath,
  });
  if (error) throw Object.assign(new Error(error.message), { code: error.code });
  return data;
}

function normalizeLeaderboard(value: unknown): ReferralLeaderboardRow[] {
  if (!Array.isArray(value)) return [];
  return value.map((row) => {
    const item = row as Record<string, unknown>;
    return {
      participantId: String(item.participantId || ""),
      participant: String(item.participant || ""),
      status: item.status === "inactive" ? "inactive" : "active",
      newVisitors: Number(item.newVisitors || 0),
      acquiredSessions: Number(item.acquiredSessions || 0),
      outboundSessions: Number(item.outboundSessions || 0),
      outboundSessionRate: Number(item.outboundSessionRate || 0),
      outboundClicks: Number(item.outboundClicks || 0),
      multiDestinationSessions: Number(item.multiDestinationSessions || 0),
      contactInterestSessions: Number(item.contactInterestSessions || 0),
    };
  });
}

function requiredAdminClient() {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured");
  return admin;
}
