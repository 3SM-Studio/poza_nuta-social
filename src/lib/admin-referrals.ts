import "server-only";

import type { AdminAccess } from "@/lib/admin";
import { createAdminClient } from "@/lib/supabase/admin";

export type ReferralParticipant = {
  id: string;
  display_name: string;
  status: "active" | "inactive";
  linked_user_id: string | null;
};

export type ReferralLink = {
  id: string;
  code: string;
  label: string;
  active: boolean;
  referral_participant_id: string;
};

type ReferralMembership = { user_id: string; email: string | null; status: "active" | "inactive" };

export type ReferralLeaderboardRow = {
  participantId: string;
  participant: string;
  status: "active" | "inactive";
  newVisitors: number;
  acquiredSessions: number;
  outboundSessions: number;
  outboundSessionRate: number;
};

export async function listReferralAdmin(fromDate: string, toDateExclusive: string) {
  const admin = requiredAdminClient();
  const [participantsResult, linksResult, membershipsResult, leaderboardResult] = await Promise.all([
    admin.from("referral_participants").select("id,display_name,status,linked_user_id").order("created_at", { ascending: true }),
    admin.from("tracking_links").select("id,code,label,active,referral_participant_id").not("referral_participant_id", "is", null).order("created_at", { ascending: false }),
    admin.from("admin_profiles").select("user_id,email,status").order("email", { ascending: true }),
    admin.rpc("referral_leaderboard_v1", { p_from_date: fromDate, p_to_date_exclusive: toDateExclusive }),
  ]);
  if (participantsResult.error) throw new Error(participantsResult.error.message);
  if (linksResult.error) throw new Error(linksResult.error.message);
  if (membershipsResult.error) throw new Error(membershipsResult.error.message);
  if (leaderboardResult.error) throw new Error(leaderboardResult.error.message);
  if (!isParticipants(participantsResult.data) || !isLinks(linksResult.data)
    || !isMemberships(membershipsResult.data) || !isLeaderboard(leaderboardResult.data)) {
    throw new Error("Referral report unavailable");
  }
  return {
    participants: participantsResult.data,
    links: linksResult.data,
    memberships: membershipsResult.data,
    leaderboard: leaderboardResult.data,
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

const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === "object" && !Array.isArray(value);
const uuid = (value: unknown): value is string => typeof value === "string" && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
const count = (value: unknown): value is number => typeof value === "number" && Number.isSafeInteger(value) && value >= 0;
const status = (value: unknown): value is "active" | "inactive" => value === "active" || value === "inactive";
const rows = (value: unknown, item: (row: unknown) => boolean) => Array.isArray(value) && value.every(item);

function isParticipants(value: unknown): value is ReferralParticipant[] {
  return rows(value, (row) => record(row) && uuid(row.id) && typeof row.display_name === "string"
    && row.display_name.trim().length > 0 && status(row.status) && (row.linked_user_id === null || uuid(row.linked_user_id)));
}

function isLinks(value: unknown): value is ReferralLink[] {
  return rows(value, (row) => record(row) && uuid(row.id) && typeof row.code === "string"
    && /^[ABCDEFGHJKLMNPQRSTUVWXYZ23456789]{5,7}$/.test(row.code)
    && typeof row.label === "string" && typeof row.active === "boolean" && uuid(row.referral_participant_id));
}

function isMemberships(value: unknown): value is ReferralMembership[] {
  return rows(value, (row) => record(row) && uuid(row.user_id)
    && (row.email === null || typeof row.email === "string") && status(row.status));
}

function isLeaderboard(value: unknown): value is ReferralLeaderboardRow[] {
  return rows(value, (row) => record(row) && uuid(row.participantId)
    && typeof row.participant === "string" && row.participant.trim().length > 0 && status(row.status)
    && count(row.newVisitors) && count(row.acquiredSessions) && count(row.outboundSessions)
    && typeof row.outboundSessionRate === "number" && Number.isFinite(row.outboundSessionRate)
    && row.outboundSessionRate >= 0 && row.outboundSessionRate <= 100);
}

function requiredAdminClient() {
  const admin = createAdminClient();
  if (!admin) throw new Error("Supabase is not configured");
  return admin;
}
