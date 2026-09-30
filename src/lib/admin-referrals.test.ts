import { beforeEach, describe, expect, it, vi } from "vitest";

type ReadResult = { data: unknown; error: { message: string } | null };
const state = vi.hoisted(() => ({
  available: true,
  results: {} as Record<string, ReadResult>,
}));
vi.mock("server-only", () => ({}));
vi.mock("@/lib/supabase/admin", () => ({
  createAdminClient: () => state.available ? {
    from: (table: string) => ({ select: () => ({
      order: () => state.results[table],
      not: () => ({ order: () => state.results[table] }),
    }) }),
    rpc: () => state.results.leaderboard,
  } : null,
}));

import { listReferralAdmin } from "./admin-referrals";

const participantId = "11111111-1111-4111-8111-111111111111";
const linkId = "22222222-2222-4222-8222-222222222222";
const memberId = "33333333-3333-4333-8333-333333333333";
const participant = { id: participantId, display_name: "Ala", status: "active", linked_user_id: memberId };
const link = { id: linkId, code: "ABC234", label: "Plakat", active: true, referral_participant_id: participantId };
const member = { user_id: memberId, email: "ala@example.test", status: "active" };
const ranking = {
  participantId, participant: "Ala", status: "active", newVisitors: 1, acquiredSessions: 2,
  outboundSessions: 1, outboundSessionRate: 50, outboundClicks: 3,
  multiDestinationSessions: 1, contactInterestSessions: 0,
};
const read = () => listReferralAdmin("2034-03-10", "2034-03-11");

beforeEach(() => {
  state.available = true;
  state.results = {
    referral_participants: { data: [participant], error: null },
    tracking_links: { data: [link], error: null },
    admin_profiles: { data: [member], error: null },
    leaderboard: { data: [ranking], error: null },
  };
});

describe("Referrals read boundary", () => {
  it("accepts populated catalogues and a populated leaderboard without rewriting metrics", async () => {
    await expect(read()).resolves.toEqual({ participants: [participant], links: [link], memberships: [member], leaderboard: [ranking] });
  });

  it("accepts genuine empty catalogues and leaderboard", async () => {
    for (const key of Object.keys(state.results)) state.results[key] = { data: [], error: null };
    await expect(read()).resolves.toEqual({ participants: [], links: [], memberships: [], leaderboard: [] });
  });

  it("accepts a participant with legitimate zero acquisition and no linked account", async () => {
    const unlinked = { ...participant, linked_user_id: null };
    const zeroRanking = { ...ranking, newVisitors: 0, acquiredSessions: 0, outboundSessions: 0,
      outboundSessionRate: 0, outboundClicks: 0, multiDestinationSessions: 0, contactInterestSessions: 0 };
    state.results.referral_participants = { data: [unlinked], error: null };
    state.results.admin_profiles = { data: [{ ...member, email: null }], error: null };
    state.results.leaderboard = { data: [zeroRanking], error: null };
    await expect(read()).resolves.toMatchObject({ participants: [unlinked], leaderboard: [zeroRanking] });
  });

  it.each([
    null,
    {},
    [{ ...ranking, outboundSessions: undefined }],
    [{ ...ranking, newVisitors: "0" }],
    [{ ...ranking, status: "unknown" }],
    [{ ...ranking, outboundSessionRate: Number.NaN }],
  ])("rejects malformed successful leaderboard payload %#", async (data) => {
    state.results.leaderboard = { data, error: null };
    await expect(read()).rejects.toThrow("Referral report unavailable");
  });

  it("does not require leaderboard metrics unused by the current view", async () => {
    const { outboundClicks, multiDestinationSessions, contactInterestSessions, ...visibleRanking } = ranking;
    void outboundClicks; void multiDestinationSessions; void contactInterestSessions;
    state.results.leaderboard = { data: [visibleRanking], error: null };
    await expect(read()).resolves.toMatchObject({ leaderboard: [visibleRanking] });
  });

  it.each([
    ["referral_participants", null],
    ["referral_participants", [{ ...participant, status: "pending" }]],
    ["tracking_links", null],
    ["tracking_links", [{ ...link, referral_participant_id: null }]],
    ["admin_profiles", null],
    ["admin_profiles", [{ ...member, user_id: undefined }]],
  ])("rejects malformed successful %s catalogue", async (key, data) => {
    state.results[key as string] = { data, error: null };
    await expect(read()).rejects.toThrow("Referral report unavailable");
  });

  it("keeps RPC and catalogue read errors unavailable", async () => {
    state.results.leaderboard = { data: [], error: { message: "leaderboard RPC failed" } };
    await expect(read()).rejects.toThrow("leaderboard RPC failed");
    state.results.leaderboard = { data: [], error: null };
    state.results.tracking_links = { data: [], error: { message: "links read failed" } };
    await expect(read()).rejects.toThrow("links read failed");
  });

  it("rejects a missing admin client", async () => {
    state.available = false;
    await expect(read()).rejects.toThrow("Supabase is not configured");
  });
});
