import { execSync } from "node:child_process";
import { randomUUID } from "node:crypto";
import { createClient } from "@supabase/supabase-js";

const status = execSync("npx supabase status -o env", { encoding: "utf8" });
const env = Object.fromEntries(
  [...status.matchAll(/^([A-Z_]+)="([^"]*)"$/gm)].map((match) => [match[1], match[2]]),
);
const secretKey = env.SECRET_KEY || env.SERVICE_ROLE_KEY;
if (!env.API_URL || !secretKey) throw new Error("Local Supabase is not running");

const db = createClient(env.API_URL, secretKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});
const runId = randomUUID().slice(0, 8);

async function rpc(name, input) {
  const { data, error } = await db.rpc(name, input);
  if (error) throw new Error(`${name}: ${error.message}`);
  return data;
}

async function createUser(label) {
  const email = `${label}-${runId}@pozanuta.test`;
  const { data, error } = await db.auth.admin.createUser({ email, email_confirm: true });
  if (error || !data.user) throw new Error(`createUser(${label}): ${error?.message || "missing user"}`);
  return { id: data.user.id, email };
}

async function createMember(owner, member, role = "admin") {
  await rpc("admin_invitation_prepare_v1", {
    p_actor_user_id: owner.id,
    p_actor_email: owner.email,
    p_email: member.email,
    p_role: role,
  });
  await rpc("admin_invitation_accept_v1", {
    p_user_id: member.id,
    p_email: member.email,
  });
}

function assert(condition, message) {
  if (!condition) throw new Error(message);
}

const owner = await createUser("concurrency-owner");
await rpc("admin_bootstrap_owner_v1", { p_user_id: owner.id, p_email: owner.email });

// A. Concurrent duplicate invitations serialize to one durable pending row.
const duplicateEmail = `duplicate-${runId}@pozanuta.test`;
const duplicateResults = await Promise.all(
  Array.from({ length: 8 }, () =>
    rpc("admin_invitation_prepare_v1", {
      p_actor_user_id: owner.id,
      p_actor_email: owner.email,
      p_email: duplicateEmail,
      p_role: "viewer",
    }),
  ),
);
const duplicateIds = new Set(duplicateResults.map((result) => result.invitation.id));
assert(duplicateIds.size === 1, "duplicate invitation race created multiple invitation identities");
assert(duplicateResults.filter((result) => result.created).length === 1, "duplicate invitation race did not have exactly one creator");
const { data: duplicateRows, error: duplicateRowsError } = await db
  .from("admin_invitations")
  .select("id,status")
  .eq("email", duplicateEmail);
if (duplicateRowsError) throw new Error(duplicateRowsError.message);
assert(duplicateRows.length === 1 && duplicateRows[0].status === "pending", "duplicate invitation race did not persist one pending row");

// B. Revoke versus accept has one winner and never creates membership from a revoked invite.
const contestedInvitee = await createUser("concurrency-contested");
const contested = await rpc("admin_invitation_prepare_v1", {
  p_actor_user_id: owner.id,
  p_actor_email: owner.email,
  p_email: contestedInvitee.email,
  p_role: "viewer",
});
const contestedResults = await Promise.allSettled([
  rpc("admin_invitation_revoke_v1", {
    p_actor_user_id: owner.id,
    p_actor_email: owner.email,
    p_invitation_id: contested.invitation.id,
  }),
  rpc("admin_invitation_accept_v1", {
    p_user_id: contestedInvitee.id,
    p_email: contestedInvitee.email,
  }),
]);
assert(contestedResults.filter((result) => result.status === "fulfilled").length === 1, "revoke/accept race did not have exactly one winner");
const { data: contestedRow, error: contestedRowError } = await db
  .from("admin_invitations")
  .select("status")
  .eq("id", contested.invitation.id)
  .single();
if (contestedRowError) throw new Error(contestedRowError.message);
const { data: contestedProfile, error: contestedProfileError } = await db
  .from("admin_profiles")
  .select("status")
  .eq("user_id", contestedInvitee.id)
  .maybeSingle();
if (contestedProfileError) throw new Error(contestedProfileError.message);
assert(["accepted", "revoked"].includes(contestedRow.status), `invalid terminal invitation state ${contestedRow.status}`);
assert((contestedRow.status === "accepted") === (contestedProfile?.status === "active"), "revoked invitation and membership state diverged");

// C. Competing transfers from the same owner serialize and preserve exactly one active owner.
const transferTargetA = await createUser("concurrency-target-a");
const transferTargetB = await createUser("concurrency-target-b");
await createMember(owner, transferTargetA);
await createMember(owner, transferTargetB);
const transferResults = await Promise.allSettled([
  rpc("admin_transfer_ownership_v1", {
    p_actor_user_id: owner.id,
    p_actor_email: owner.email,
    p_target_user_id: transferTargetA.id,
  }),
  rpc("admin_transfer_ownership_v1", {
    p_actor_user_id: owner.id,
    p_actor_email: owner.email,
    p_target_user_id: transferTargetB.id,
  }),
]);
assert(transferResults.filter((result) => result.status === "fulfilled").length === 1, "competing ownership transfers did not have exactly one winner");
const { data: ownerRows, error: ownerRowsError } = await db
  .from("admin_profiles")
  .select("user_id,role,status")
  .in("user_id", [owner.id, transferTargetA.id, transferTargetB.id]);
if (ownerRowsError) throw new Error(ownerRowsError.message);
const activeOwners = ownerRows.filter((row) => row.role === "owner" && row.status === "active");
assert(activeOwners.length === 1, `competing transfers left ${activeOwners.length} active owners`);
let currentOwner = activeOwners[0];

// C2. Two existing owners transferring to each other serialize without a zero-owner gap.
const secondOwner = ownerRows.find((row) => row.user_id !== currentOwner.user_id && row.status === "active");
const { error: secondOwnerError } = await db
  .from("admin_profiles")
  .update({ role: "owner" })
  .eq("user_id", secondOwner.user_id);
if (secondOwnerError) throw new Error(`two-owner fixture: ${secondOwnerError.message}`);
const oppositeTransferResults = await Promise.allSettled([
  rpc("admin_transfer_ownership_v1", {
    p_actor_user_id: currentOwner.user_id,
    p_actor_email: emailFor(currentOwner.user_id),
    p_target_user_id: secondOwner.user_id,
  }),
  rpc("admin_transfer_ownership_v1", {
    p_actor_user_id: secondOwner.user_id,
    p_actor_email: emailFor(secondOwner.user_id),
    p_target_user_id: currentOwner.user_id,
  }),
]);
assert(oppositeTransferResults.every((result) => result.status === "fulfilled"), "two-owner competing transfers did not serialize cleanly");
const { data: oppositeOwnerRows, error: oppositeOwnerRowsError } = await db
  .from("admin_profiles")
  .select("user_id,role,status")
  .in("user_id", [owner.id, transferTargetA.id, transferTargetB.id]);
if (oppositeOwnerRowsError) throw new Error(oppositeOwnerRowsError.message);
const oppositeActiveOwners = oppositeOwnerRows.filter((row) => row.role === "owner" && row.status === "active");
assert(oppositeActiveOwners.length === 1, `two-owner race left ${oppositeActiveOwners.length} active owners`);
currentOwner = oppositeActiveOwners[0];

// D. A direct last-owner demotion racing a transfer cannot commit a zero-owner state.
const demotionTarget = oppositeOwnerRows.find((row) => row.user_id !== currentOwner.user_id && row.status === "active");
const demotionResults = await Promise.allSettled([
  (async () => {
    const { data, error } = await db.from("admin_profiles").update({ role: "admin" }).eq("user_id", currentOwner.user_id).select("user_id");
    if (error) throw new Error(`direct owner demotion: ${error.code} ${error.message}`);
    return data;
  })(),
  rpc("admin_transfer_ownership_v1", {
    p_actor_user_id: currentOwner.user_id,
    p_actor_email: emailFor(currentOwner.user_id),
    p_target_user_id: demotionTarget.user_id,
  }),
]);
assert(demotionResults.some((result) => result.status === "fulfilled"), `last-owner demotion race produced no completed request: ${demotionResults.map((result) => result.status === "rejected" ? result.reason.message : "committed").join("; ")}`);
const { data: ownerCountRows, error: ownerCountError } = await db
  .from("admin_profiles")
  .select("user_id")
  .eq("role", "owner")
  .eq("status", "active");
if (ownerCountError) throw new Error(ownerCountError.message);
assert(ownerCountRows.length >= 1, "last-owner demotion race committed a zero-owner state");

// E. Simultaneous referral entries give one session one immutable participant owner.
const actorId = ownerCountRows[0].user_id;
const actorEmail = [owner, transferTargetA, transferTargetB].find((user) => user.id === actorId)?.email;
assert(actorEmail, "current owner email was not resolved");
const participantA = await rpc("admin_referral_participant_create_v1", {
  p_actor_user_id: actorId,
  p_actor_email: actorEmail,
  p_display_name: `Concurrent A ${runId}`,
  p_linked_user_id: null,
});
const participantB = await rpc("admin_referral_participant_create_v1", {
  p_actor_user_id: actorId,
  p_actor_email: actorEmail,
  p_display_name: `Concurrent B ${runId}`,
  p_linked_user_id: null,
});
const linkA = await rpc("admin_referral_tracking_link_create_v1", {
  p_actor_user_id: actorId,
  p_actor_email: actorEmail,
  p_participant_id: participantA.id,
  p_code: codeFromUuid(randomUUID()),
  p_label: `Concurrent A ${runId}`,
  p_landing_path: "/",
});
const linkB = await rpc("admin_referral_tracking_link_create_v1", {
  p_actor_user_id: actorId,
  p_actor_email: actorEmail,
  p_participant_id: participantB.id,
  p_code: codeFromUuid(randomUUID()),
  p_label: `Concurrent B ${runId}`,
  p_landing_path: "/",
});
const referralSession = randomUUID();
const visitor = randomUUID();
await Promise.all([
  ingestReferral(referralSession, visitor, participantA, linkA),
  ingestReferral(referralSession, visitor, participantB, linkB),
]);
const { data: referralSessionRow, error: referralSessionError } = await db
  .from("analytics_sessions_v2")
  .select("session_acquisition,next_sequence")
  .eq("session_id", referralSession)
  .single();
if (referralSessionError) throw new Error(referralSessionError.message);
const winnerId = referralSessionRow.session_acquisition.referralParticipantId;
assert([participantA.id, participantB.id].includes(winnerId), "simultaneous referral entries produced an unknown session owner");
assert(referralSessionRow.next_sequence === 2, "simultaneous referral entries did not serialize event sequence");
const loser = winnerId === participantA.id ? { participant: participantB, link: linkB } : { participant: participantA, link: linkA };
await ingestReferral(referralSession, visitor, loser.participant, loser.link);
const { data: frozenSession, error: frozenSessionError } = await db
  .from("analytics_sessions_v2")
  .select("session_acquisition,next_sequence")
  .eq("session_id", referralSession)
  .single();
if (frozenSessionError) throw new Error(frozenSessionError.message);
assert(frozenSession.session_acquisition.referralParticipantId === winnerId, "later referral touch rewrote the concurrent session winner");
assert(frozenSession.next_sequence === 3, "later referral event sequence was not contiguous");

// F. Concurrent later touches cannot replace already-established referral acquisition.
const establishedSession = randomUUID();
const establishedVisitor = randomUUID();
await ingestReferral(establishedSession, establishedVisitor, participantA, linkA);
await Promise.all([
  ingestReferral(establishedSession, establishedVisitor, participantB, linkB),
  ingestReferral(establishedSession, establishedVisitor, participantB, linkB),
]);
const { data: establishedSessionRow, error: establishedSessionError } = await db
  .from("analytics_sessions_v2")
  .select("session_acquisition,next_sequence")
  .eq("session_id", establishedSession)
  .single();
if (establishedSessionError) throw new Error(establishedSessionError.message);
assert(establishedSessionRow.session_acquisition.referralParticipantId === participantA.id, "concurrent later touches replaced established referral acquisition");
assert(establishedSessionRow.next_sequence === 3, "concurrent later touches did not preserve contiguous sequencing");

const { data: auditRows, error: auditRowsError } = await db
  .from("audit_log")
  .select("action,entity_id")
  .in("action", ["admin.invitation.create", "admin.ownership.transfer"]);
if (auditRowsError) throw new Error(auditRowsError.message);
assert(auditRows.filter((row) => row.action === "admin.invitation.create" && row.entity_id === duplicateRows[0].id).length === 1, "duplicate invitation race produced partial or duplicate audit state");
const committedTransfers = transferResults.filter((result) => result.status === "fulfilled").length
  + oppositeTransferResults.filter((result) => result.status === "fulfilled").length
  + Number(demotionResults[1].status === "fulfilled");
const transferAudits = auditRows.filter((row) => row.action === "admin.ownership.transfer" && [owner.id, transferTargetA.id, transferTargetB.id].includes(row.entity_id));
assert(transferAudits.length === committedTransfers, `ownership races wrote ${transferAudits.length} audits for ${committedTransfers} committed transfers`);

console.log(JSON.stringify({
  cases: [
    "duplicate-invitation",
    "revoke-versus-accept",
    "competing-owner-transfers",
    "two-owner-opposite-transfers",
    "last-owner-demotion-versus-transfer",
    "simultaneous-referral-entry",
    "established-referral-versus-later-touches",
  ],
  duplicateInvitationCreators: duplicateResults.filter((result) => result.created).length,
  contestedInvitationState: contestedRow.status,
  activeOwnersAfterRaces: ownerCountRows.length,
  referralSessionOwner: winnerId,
  referralEvents: frozenSession.next_sequence,
  establishedReferralOwner: establishedSessionRow.session_acquisition.referralParticipantId,
}, null, 2));

async function ingestReferral(sessionId, visitorId, participant, link) {
  const context = {
    channelGroup: "referral",
    source: "team",
    medium: "referral",
    trackingLinkId: link.id,
    referralParticipantId: participant.id,
  };
  return rpc("analytics_ingest_event_v1", {
    p_event_id: randomUUID(),
    p_event_name: "tracking_entry",
    p_session_id: sessionId,
    p_visitor_id: visitorId,
    p_environment: "production",
    p_traffic_class: "test",
    p_analytics_consent: true,
    p_marketing_consent: false,
    p_path: `/r/${link.code}`,
    p_observed_context: context,
    p_attributed_context: context,
    p_dimension_snapshots: {
      referralParticipantLabel: participant.display_name,
      trackingLinkLabel: link.label,
    },
    p_tracking_link_id: link.id,
    p_destination_id: null,
    p_destination_slug: null,
    p_device_type: "desktop",
    p_browser_family: "chrome",
    p_os_family: "windows",
    p_metadata: { suite: "admin-platform-concurrency" },
  });
}

function codeFromUuid(value) {
  const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  const hex = value.replaceAll("-", "").slice(0, 7);
  return [...hex].map((character) => alphabet[Number.parseInt(character, 16) % alphabet.length]).join("");
}

function emailFor(userId) {
  const email = [owner, transferTargetA, transferTargetB].find((user) => user.id === userId)?.email;
  assert(email, `email not found for ${userId}`);
  return email;
}
